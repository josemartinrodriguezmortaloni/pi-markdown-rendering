import type { MarkdownTransformContext } from "@earendil-works/pi-coding-agent";
import { render, sourceBox } from "grok-mermaid";
import { describe, expect, it } from "vitest";
// Pi's own Mermaid transformer, not exported by the package; it runs before every extension transformer.
import { createMermaidMarkdownTransformer } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/mermaid.js";
import { createTransformer, type MermaidMode, type Painter } from "../src/transformer.ts";
import {
  CLASS_LR,
  FLOWCHART_LR,
  fenced,
  SEQUENCE_COMPLETE,
  SEQUENCE_EIGHT_PARTICIPANTS,
  SEQUENCE_LONG_MESSAGES,
  SMALL_FLOWCHART,
} from "./diagrams.ts";

const context = (overrides: Partial<MarkdownTransformContext> = {}): MarkdownTransformContext => ({
  messageType: "assistant",
  isStreaming: false,
  availableWidth: 78,
  ...overrides,
});

const transform = (mode: MermaidMode = "streaming", theme?: Painter) =>
  createTransformer({ mermaidMode: () => mode, theme: () => theme });

// Same pipeline order as interactive-mode.js:1634: Pi first, then the extension.
const throughPi = (markdown: string, ctx: MarkdownTransformContext): string =>
  transform()(createMermaidMarkdownTransformer({ getMode: () => "streaming" })(markdown, ctx), ctx);

// Strips the code-span fences Pi and the plugin put around each diagram row.
const rowsOf = (output: string): string[] =>
  output
    .trimEnd()
    .split("  \n")
    .map((row) => (/^(`+)(.*)\1$/s.exec(row)?.[2] ?? row).replace(/^\u00a0$/, ""));

const widthOf = (row: string): number => [...row].length;

describe("headings", () => {
  it("shows ### Modelo de dominio as a level 2 heading", () => {
    expect(transform()("### Modelo de dominio\n\nTexto.\n", context())).toBe(
      "## Modelo de dominio\n\nTexto.\n",
    );
  });

  it.each(["####", "#####", "######"])("lifts %s headings", (marks) => {
    expect(transform()(`${marks} Título\n`, context())).toBe("## Título\n");
  });

  it("keeps h1 and h2", () => {
    expect(transform()("# Uno\n\n## Dos\n", context())).toBe("# Uno\n\n## Dos\n");
  });

  it("keeps ### inside a code block and a code span", () => {
    const markdown = "```md\n### Modelo de dominio\n```\n\nUsá `### Título` para h3.\n";
    expect(transform()(markdown, context())).toBe(markdown);
  });

  it.each([
    ["user", false],
    ["assistant-thinking", false],
    ["assistant", true],
  ] as const)("lifts headings in %s messages (streaming: %s)", (messageType, isStreaming) => {
    expect(transform()("### Endpoints (25)\n", context({ messageType, isStreaming }))).toBe(
      "## Endpoints (25)\n",
    );
  });
});

describe("unchanged markdown", () => {
  it("returns markdown without Mermaid or h3-h6 headings byte for byte", () => {
    const markdown =
      "# Title\r\n\r\nText with **bold**,\ttabs and a [link](https://x.y).\r\n\r\n- a\r\n- b\r\n";
    expect(transform()(markdown, context())).toBe(markdown);
  });

  it("keeps a diagram Pi already drew", () => {
    const ctx = context();
    const drawnByPi = createMermaidMarkdownTransformer({ getMode: () => "streaming" })(
      fenced(SMALL_FLOWCHART),
      ctx,
    );
    expect(drawnByPi).not.toContain("```mermaid");
    expect(transform()(drawnByPi, ctx)).toBe(drawnByPi);
  });
});

describe("flowchart variants", () => {
  it("draws a 5-node flowchart LR that does not fit 80 columns vertically", () => {
    expect(render(FLOWCHART_LR)?.width).toBeGreaterThan(78);
    const output = throughPi(fenced(FLOWCHART_LR), context());
    const vertical = render(FLOWCHART_LR.replace("flowchart LR", "flowchart TD"));
    expect(rowsOf(output)).toEqual(vertical?.plain);
    expect(vertical?.width).toBeLessThanOrEqual(78);
  });
});

describe("class variants", () => {
  it("draws a classDiagram with direction LR top to bottom when that fits", () => {
    const output = throughPi(fenced(CLASS_LR), context({ availableWidth: 130 }));
    expect(rowsOf(output)).toEqual(render(CLASS_LR.replace("direction LR", "direction TB"))?.plain);
  });
});

describe("sequence legend", () => {
  // The drawn rows end at the first blank line; the legend list follows it.
  const split = (output: string): [string, string] => {
    const [diagram = "", ...rest] = output.split("\n\n");
    return [diagram, rest.join("\n\n")];
  };

  it("draws a sequenceDiagram with long messages in 100 columns with numbered labels", () => {
    expect(render(SEQUENCE_LONG_MESSAGES)?.width).toBeGreaterThan(100);
    const [diagram, legend] = split(
      throughPi(fenced(SEQUENCE_LONG_MESSAGES), context({ availableWidth: 100 })),
    );
    for (const row of rowsOf(diagram)) expect(widthOf(row)).toBeLessThanOrEqual(100);
    expect(rowsOf(diagram).join("\n")).toMatch(/│\s+1\s+│/);
    expect(legend).toBe(
      [
        "1. POST /subscriptions/renew with the stored payment method",
        "2. charge(customerId, planId, idempotencyKey)",
        "3. 200 OK with the renewed subscription and the next invoice date",
        "",
      ].join("\n"),
    );
  });

  it("draws sequence-complete at 100 columns, numbering only long labels and the note", () => {
    const [diagram, legend] = split(throughPi(fenced(SEQUENCE_COMPLETE), context({ availableWidth: 100 })));
    expect(rowsOf(diagram).join("\n")).toContain("POST /:id/complete");
    expect(legend.split("\n").at(-2)).toBe("6. si falla el desvío, rollback");
  });

  it("escapes Markdown punctuation in the legend", () => {
    const src = "sequenceDiagram\n    A->>B: set PENDING_PAYMENT on the order with *care* and `ticks`";
    const [, legend] = split(transform()(fenced(src), context({ availableWidth: 30 })));
    expect(legend).toBe("1. set PENDING\\_PAYMENT on the order with \\*care\\* and \\`ticks\\`\n");
  });
});

describe("framed source", () => {
  it("frames 8 participants in 60 columns without passing the available width", () => {
    const output = throughPi(fenced(SEQUENCE_EIGHT_PARTICIPANTS), context({ availableWidth: 60 }));
    expect(output).not.toContain("```mermaid");
    for (const row of rowsOf(output)) expect(widthOf(row)).toBeLessThanOrEqual(60);
  });

  it.each([
    ["class-lr", CLASS_LR, 127],
    ["sequence-complete", SEQUENCE_COMPLETE, 96],
  ])("frames the %s fixture at 80 columns", (_name, src, needs) => {
    const output = throughPi(fenced(src), context());
    expect(rowsOf(output)).toEqual([...sourceBox(src, 78).plain, `(diagram needs ${needs} columns)`]);
  });

  it("reports the smallest width among all attempts", () => {
    const output = throughPi(fenced(FLOWCHART_LR), context({ availableWidth: 25 }));
    expect(rowsOf(output).at(-1)).toBe("(diagram needs 26 columns)");
  });

  it("leaves the block as it is when even the framed source does not fit", () => {
    const markdown = fenced(SEQUENCE_COMPLETE);
    expect(transform()(markdown, context({ availableWidth: 12 }))).toBe(markdown);
  });
});

describe("blocks left to Pi", () => {
  const markdown = `### Secuencia\n\n${fenced(SEQUENCE_COMPLETE)}`;
  const headingOnly = `## Secuencia\n\n${fenced(SEQUENCE_COMPLETE)}`;

  it("does not touch Mermaid blocks when markdown.mermaid is off", () => {
    expect(transform("off")(markdown, context())).toBe(headingOnly);
  });

  it.each([{ messageType: "assistant-thinking" as const }, { isStreaming: true }])(
    "does not touch Mermaid blocks for %o",
    (overrides) => {
      expect(transform()(markdown, context(overrides))).toBe(headingOnly);
    },
  );

  it("does not touch a diagram with warnings", () => {
    const withWarnings = "flowchart LR\n    A --> B\n    C[unclosed label";
    expect(render(withWarnings)?.warnings.length).toBeGreaterThan(0);
    expect(transform()(fenced(withWarnings), context({ availableWidth: 4 }))).toBe(fenced(withWarnings));
  });

  it("does not touch a block grok-mermaid cannot draw", () => {
    const pie = 'pie\n    "A" : 1';
    expect(render(pie)).toBeNull();
    expect(transform()(fenced(pie), context())).toBe(fenced(pie));
  });
});

describe("theme", () => {
  const painter: Painter = {
    fg: (color, text) => `<${color}>${text}</${color}>`,
    bold: (text) => `<b>${text}</b>`,
  };

  it("colors rows like Pi and dims the width note", () => {
    const output = transform("streaming", painter)(fenced(SEQUENCE_COMPLETE), context());
    expect(output).toContain("<borderMuted>");
    expect(output).toContain("<dim>(diagram needs 96 columns)</dim>");
  });
});
