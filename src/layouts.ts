import { diagramKind } from "grok-mermaid";
import { type LegendEntry, LONG_LABEL, numberLabels } from "./sequence.ts";

/** A rewritten source, plus the full texts of the labels it replaced with keys. */
export interface Variant {
  src: string;
  legend: LegendEntry[];
}

// Only the header direction changes; a subgraph keeps its own `direction`.
const HORIZONTAL_FLOWCHART = /^(\s*(?:flowchart|graph)[ \t]+)(LR|RL)\b/m;
const HORIZONTAL_CLASS = /^(\s*direction[ \t]+)(LR|RL)\b/m;
const VERTICAL_FLOWCHART: Record<string, string> = { LR: "TD", RL: "BT" };
const VERTICAL_CLASS: Record<string, string> = { LR: "TB", RL: "BT" };

function vertical(src: string, header: RegExp, directions: Record<string, string>): Variant | undefined {
  if (!header.test(src)) return undefined;
  const rewritten = src.replace(header, (_all, head: string, dir: string) => `${head}${directions[dir]}`);
  return { src: rewritten, legend: [] };
}

const VARIANTS: Record<string, (src: string) => (Variant | undefined)[]> = {
  flowchart: (src) => [vertical(src, HORIZONTAL_FLOWCHART, VERTICAL_FLOWCHART)],
  class: (src) => [vertical(src, HORIZONTAL_CLASS, VERTICAL_CLASS)],
  // Long labels first, so short ones stay readable inside the diagram; every label only if needed.
  sequence: (src) => [numberLabels(src, LONG_LABEL), numberLabels(src, 0)],
};

/** Returns the rewritten sources to try, in order, when a diagram is wider than the terminal. */
export function variants(src: string): Variant[] {
  const build = VARIANTS[String(diagramKind(src))] ?? (() => []);
  return build(src).filter((variant) => variant !== undefined);
}
