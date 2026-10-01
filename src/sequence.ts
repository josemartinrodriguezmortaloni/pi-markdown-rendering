/** Full text of a sequence label that the diagram shows only as its key. */
export interface LegendEntry {
  key: number;
  text: string;
}

export interface Numbered {
  src: string;
  legend: LegendEntry[];
}

// Same width grok-mermaid cuts participant names to.
export const LONG_LABEL = 24;

const MESSAGE = /^(\s*[^:\n]*?-(?:>>|>|x|\))[+-]?[^:\n]*?:)(.*)$/;
const NOTE = /^(\s*note\s+(?:left of|right of|over)\s+[^:\n]+:)(.*)$/i;
const PLAIN_AUTONUMBER = /^\s*autonumber\s*$/im;
const ANY_AUTONUMBER = /^\s*autonumber\b/im;

type Kind = "message" | "note";
interface Label {
  kind: Kind;
  head: string;
  text: string;
}

// Both patterns have two required groups, so a match always defines them.
function labelFrom(kind: Kind, match: RegExpExecArray | null): Label | undefined {
  if (!match) return undefined;
  return { kind, head: String(match[1]), text: String(match[2]).trim() };
}

const labelOf = (line: string): Label | undefined =>
  labelFrom("note", NOTE.exec(line)) ?? labelFrom("message", MESSAGE.exec(line));

// Without `autonumber`, only long labels take keys, so keys run 1, 2, 3. With `autonumber`,
// grok-mermaid prints every message's own number, so an empty label shows just that number; long
// notes take keys after the last message so every key stays unique.
interface Numbering {
  key(kind: Kind, long: boolean): number;
  label(kind: Kind, key: number): string;
}

function ownNumbering(): Numbering {
  let next = 0;
  return { key: (_kind, long) => (long ? ++next : 0), label: (_kind, key) => ` ${key}` };
}

function autoNumbering(messages: number): Numbering {
  const counters: Record<Kind, number> = { message: 0, note: messages };
  const counts = (kind: Kind, long: boolean): boolean => kind === "message" || long;
  return {
    key: (kind, long) => (counts(kind, long) ? ++counters[kind] : 0),
    label: (kind, key) => (kind === "message" ? "" : ` ${key}`),
  };
}

const isLong = (label: Label, minLength: number): boolean => [...label.text].length > minLength;

function numberLines(lines: string[], numbering: Numbering, minLength: number): Numbered {
  const legend: LegendEntry[] = [];
  const src = lines.map((line) => {
    const label = labelOf(line);
    if (!label) return line;
    const long = isLong(label, minLength);
    const key = numbering.key(label.kind, long);
    if (!long) return line;
    legend.push({ key, text: label.text });
    return `${label.head}${numbering.label(label.kind, key)}`;
  });
  return { src: src.join("\n"), legend };
}

function numberingFor(src: string, lines: string[]): Numbering | undefined {
  if (!ANY_AUTONUMBER.test(src)) return ownNumbering();
  if (!PLAIN_AUTONUMBER.test(src)) return undefined;
  return autoNumbering(lines.filter((line) => labelOf(line)?.kind === "message").length);
}

/**
 * Replaces every message and note label longer than `minLength` with a numeric key and returns the
 * full texts as a legend. Returns undefined when no label is that long, or when `autonumber` has a
 * start or step this module cannot predict.
 */
export function numberLabels(src: string, minLength: number): Numbered | undefined {
  const lines = src.split("\n");
  const numbering = numberingFor(src, lines);
  if (!numbering) return undefined;
  const numbered = numberLines(lines, numbering, minLength);
  return numbered.legend.length > 0 ? numbered : undefined;
}
