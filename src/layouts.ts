// Only the header direction changes; a subgraph keeps its own `direction`.
const HORIZONTAL_FLOWCHART = /^(\s*(?:flowchart|graph)[ \t]+)(LR|RL)\b/m;
const VERTICAL: Record<string, string> = { LR: "TD", RL: "BT" };

function verticalFlowchart(src: string): string | undefined {
  const match = HORIZONTAL_FLOWCHART.exec(src);
  if (!match) return undefined;
  return src.replace(HORIZONTAL_FLOWCHART, (_all, head: string, dir: string) => `${head}${VERTICAL[dir]}`);
}

/** Returns the rewritten sources to try, in order, when a diagram is wider than the terminal. */
export function variants(src: string): string[] {
  return [verticalFlowchart(src)].filter((variant) => variant !== undefined);
}
