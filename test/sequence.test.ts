import { render } from "grok-mermaid";
import { describe, expect, it } from "vitest";
import { LONG_LABEL, numberLabels } from "../src/sequence.ts";

const long = "x".repeat(LONG_LABEL + 1);

describe("numberLabels", () => {
  it("numbers long labels from 1 and keeps short ones", () => {
    const src = `sequenceDiagram\n    A->>B: short\n    B-->>A: ${long}\n    A-xB: ${long}`;
    expect(numberLabels(src, LONG_LABEL)).toEqual({
      src: "sequenceDiagram\n    A->>B: short\n    B-->>A: 1\n    A-xB: 2",
      legend: [
        { key: 1, text: long },
        { key: 2, text: long },
      ],
    });
  });

  it("numbers notes in the same sequence as messages", () => {
    const src = `sequenceDiagram\n    A->>B: ${long}\n    Note over A,B: ${long}`;
    expect(numberLabels(src, LONG_LABEL)?.src).toBe("sequenceDiagram\n    A->>B: 1\n    Note over A,B: 2");
  });

  it("returns undefined when no label is long", () => {
    expect(numberLabels("sequenceDiagram\n    A->>B: short", LONG_LABEL)).toBeUndefined();
  });

  it("uses autonumber keys for messages and keys after the last message for notes", () => {
    const src = `sequenceDiagram\n    autonumber\n    A->>B: short\n    B->>A: ${long}\n    Note right of A: ${long}`;
    const numbered = numberLabels(src, LONG_LABEL);
    expect(numbered?.legend.map((entry) => entry.key)).toEqual([2, 3]);
    const rows = render(numbered?.src ?? "")?.plain.join("\n") ?? "";
    expect(rows).toContain("1. short");
    expect(rows).toMatch(/│\s+2\.\s+│/);
    expect(rows).toMatch(/│\s+3\s+│/);
  });

  it("returns undefined when autonumber has a start or a step", () => {
    expect(
      numberLabels(`sequenceDiagram\n    autonumber 10 5\n    A->>B: ${long}`, LONG_LABEL),
    ).toBeUndefined();
  });
});
