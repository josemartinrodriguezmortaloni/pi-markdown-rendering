// pi-tui prints a literal "### " before h3-h6 and styles h2 the same way without it, so h3-h6 become h2.
const DEEP_ATX_MARKS = /^( {0,3})#{3,6}(?=[ \t\n]|$)/;

/** Rewrites the raw text of an ATX heading of level 3 to 6 as a level 2 heading. */
export function liftHeading(raw: string): string {
  return raw.replace(DEEP_ATX_MARKS, "$1##");
}
