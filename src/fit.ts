import { type MermaidArt, render, sourceBox } from "grok-mermaid";
import { variants } from "./layouts.ts";
import type { LegendEntry } from "./sequence.ts";

/** A drawn diagram with its legend, or framed source with the smallest width any attempt needed. */
export type Fitted =
  | { kind: "diagram"; art: MermaidArt; legend: LegendEntry[] }
  | { kind: "framed"; art: MermaidArt; needs: number };

interface Attempt {
  art: MermaidArt;
  legend: LegendEntry[];
}

const isClean = (art: MermaidArt | null): art is MermaidArt => art !== null && art.warnings.length === 0;

function attempt(src: string, legend: LegendEntry[]): Attempt | undefined {
  const art = render(src);
  return isClean(art) ? { art, legend } : undefined;
}

function frame(src: string, attempts: Attempt[], width: number): Fitted | undefined {
  const box = sourceBox(src, width);
  if (box.width > width) return undefined;
  return { kind: "framed", art: box, needs: Math.min(...attempts.map((tried) => tried.art.width)) };
}

/**
 * Fits a pending block into `width` columns. Returns undefined when the block must stay as it is:
 * grok-mermaid cannot draw it, it has warnings (Pi shows them), or even the framed source is too wide.
 */
export function fitDiagram(src: string, width: number): Fitted | undefined {
  const original = attempt(src, []);
  if (!original) return undefined;
  const rewritten = variants(src).map((variant) => attempt(variant.src, variant.legend));
  const attempts = [original, ...rewritten.filter((tried) => tried !== undefined)];
  const drawn = attempts.find((tried) => tried.art.width <= width);
  return drawn ? { kind: "diagram", ...drawn } : frame(src, attempts, width);
}
