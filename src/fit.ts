import { type MermaidArt, render, sourceBox } from "grok-mermaid";
import { variants } from "./layouts.ts";

/** A drawn diagram, or framed source with the smallest width any attempt needed. */
export type Fitted =
  | { kind: "diagram"; art: MermaidArt }
  | { kind: "framed"; art: MermaidArt; needs: number };

const isClean = (art: MermaidArt | null): art is MermaidArt => art !== null && art.warnings.length === 0;

function frame(src: string, attempts: MermaidArt[], width: number): Fitted | undefined {
  const box = sourceBox(src, width);
  if (box.width > width) return undefined;
  return { kind: "framed", art: box, needs: Math.min(...attempts.map((art) => art.width)) };
}

/**
 * Fits a pending block into `width` columns. Returns undefined when the block must stay as it is:
 * grok-mermaid cannot draw it, it has warnings (Pi shows them), or even the framed source is too wide.
 */
export function fitDiagram(src: string, width: number): Fitted | undefined {
  const original = render(src);
  if (!isClean(original)) return undefined;
  const attempts = [original, ...variants(src).map(render).filter(isClean)];
  const drawn = attempts.find((art) => art.width <= width);
  return drawn ? { kind: "diagram", art: drawn } : frame(src, attempts, width);
}
