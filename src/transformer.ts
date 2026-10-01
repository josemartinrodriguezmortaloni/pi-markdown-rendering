import type {
  ExtensionAPI,
  MarkdownTransformContext,
  MarkdownTransformer,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { Marked, type Token } from "@earendil-works/pi-tui";
import type { MermaidArt, Span } from "grok-mermaid";
import { type Fitted, fitDiagram } from "./fit.ts";
import { liftHeading } from "./headings.ts";

type Settings = ReturnType<ExtensionAPI["getSettings"]>;
export type MermaidMode = NonNullable<NonNullable<Settings["markdown"]>["mermaid"]>;
export type Painter = Pick<Theme, "fg" | "bold">;

export interface TransformerDeps {
  mermaidMode(): MermaidMode;
  theme(): Painter | undefined;
}

const parser = new Marked();

// Same detection and row format as Pi's own transformer (pi-coding-agent mermaid.js), so a fitted
// diagram looks like one Pi drew.
const fenceLanguage = (lang: string | undefined): string | undefined =>
  (lang ?? "").trim().split(/\s+/, 1)[0]?.toLowerCase();

const isMermaid = (token: Token): token is Token & { text: string } =>
  token.type === "code" && fenceLanguage(token.lang) === "mermaid";

const backtickPadding = (content: string): string =>
  content.startsWith("`") || content.endsWith("`") ? " " : "";

function codeSpan(line: string): string {
  const content = line || "\u00a0";
  const longestBacktickRun = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longestBacktickRun + 1);
  const padding = backtickPadding(content);
  return `${fence}${padding}${content}${padding}${fence}`;
}

const SPAN_STYLE: Record<Span["cls"], (text: string, theme: Painter) => string> = {
  border: (text, theme) => theme.fg("borderMuted", text),
  text: (text, theme) => theme.fg("text", text),
  edge: (text, theme) => theme.fg("accent", text),
  edgeLabel: (text, theme) => theme.fg("muted", text),
  title: (text, theme) => theme.fg("accent", theme.bold(text)),
  none: (text) => text,
};

function rows(art: MermaidArt, theme: Painter | undefined): string[] {
  if (!theme) return art.plain;
  return art.styled.map((row) => row.map((span) => SPAN_STYLE[span.cls](span.text, theme)).join(""));
}

function needsNote(fitted: Fitted, theme: Painter | undefined): string[] {
  if (fitted.kind === "diagram") return [];
  const note = `(diagram needs ${fitted.needs} columns)`;
  return [theme ? theme.fg("dim", note) : note];
}

function drawBlock(token: Token & { text: string }, width: number, theme: Painter | undefined): string {
  const fitted = fitDiagram(token.text, width);
  if (!fitted) return token.raw;
  return `${[...rows(fitted.art, theme), ...needsNote(fitted, theme)].map(codeSpan).join("  \n")}\n`;
}

// Pi skips thinking blocks and, outside "streaming" mode, partial messages; v1 also leaves every
// partial message to Pi.
const drawsDiagrams = (mode: MermaidMode, context: MarkdownTransformContext): boolean =>
  mode !== "off" && context.messageType !== "assistant-thinking" && !context.isStreaming;

function rewriter(deps: TransformerDeps, context: MarkdownTransformContext): (token: Token) => string {
  const draw = drawsDiagrams(deps.mermaidMode(), context);
  const block = (token: Token): string =>
    draw && isMermaid(token) ? drawBlock(token, context.availableWidth, deps.theme()) : token.raw;
  return (token) => (token.type === "heading" ? liftHeading(token.raw) : block(token));
}

/** Shows h3-h6 without their # marks and fits the Mermaid blocks Pi left undrawn. */
export function createTransformer(deps: TransformerDeps): MarkdownTransformer {
  return (markdown, context) => {
    const tokens = parser.lexer(markdown);
    const parts = tokens.map(rewriter(deps, context));
    // The lexer normalizes line endings, so untouched input is returned as given.
    const unchanged = parts.every((part, index) => part === tokens[index]?.raw);
    return unchanged ? markdown : parts.join("");
  };
}
