# Pi Markdown Rendering

A Pi extension that changes how model answers look in the terminal. It shows h3–h6 headings without their `#` marks, and it draws Mermaid diagrams that Pi could not fit.

## Language

**Pending block**:
A ` ```mermaid ` block that Pi's own transformer left undrawn because the diagram is wider than the available width.
_Avoid_: raw block, failed diagram

**Variant**:
A rewritten Mermaid source made from a pending block, for example with a different flowchart direction.
_Avoid_: layout, attempt

**Fit**:
Choosing the first variant whose drawn width is less than or equal to the available width.
_Avoid_: resize, reflow

**Framed source**:
The Mermaid source inside a box, followed by a muted `(diagram needs W columns)` line. W is the smallest width among all drawn attempts.
_Avoid_: fallback, source box
