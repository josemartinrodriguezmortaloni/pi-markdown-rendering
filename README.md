# pi-markdown-rendering

A Pi extension that makes model answers render cleanly in the terminal. The model needs no instructions about how to write Markdown.

- **Headings h3–h6** show without their `#` marks, in the style Pi uses for h2.
- **Mermaid diagrams** that Pi left undrawn because they are too wide are fitted to the terminal:
  1. A `flowchart` or `graph` with direction `LR` is redrawn as `TD`; `RL` is redrawn as `BT`.
  2. When no variant fits, the source shows in a frame, followed by `(diagram needs W columns)`.

See [GLOSSARY.md](GLOSSARY.md) for the terms.

## Use

```sh
bun install
pi -e ./src/index.ts
```

To load it always, add the repo path to `packages` in `~/.pi/agent/settings.json`. Pi also loads it by itself when you start Pi inside this repo, through `pi.extensions` in `package.json`.

## Behavior

| Input | Output |
| --- | --- |
| `### Title` to `###### Title`, in any message, also while streaming | `## Title` |
| `###` inside a code block or code span | unchanged |
| Mermaid block that Pi drew | unchanged |
| Mermaid block too wide, with a variant that fits | the variant, drawn with Pi's theme colors |
| Mermaid block too wide, no variant fits | framed source + muted `(diagram needs W columns)` |

The extension does not touch a Mermaid block in these cases:

- `markdown.mermaid` is `"off"` in Pi settings.
- The message is a thinking block.
- The message is still streaming.
- `grok-mermaid` returns warnings for the diagram. Pi already shows them.
- `grok-mermaid` cannot draw the diagram (`render` returns `null`).
- The framed source is wider than the terminal. This happens below about 30 columns, because `sourceBox` does not cut its title.

All other Markdown is returned byte for byte.

## Limits

- **No label splitting in sequence diagrams.** `grok-mermaid` 0.2.3 keeps `<br>` as literal text in messages and notes, and turns it into a space in participant aliases. A sequence diagram that is too wide always shows as framed source.
- **No variants for class, state, or ER diagrams.** For example, `classDiagram` with `direction TB` is still 127 columns wide in the test fixture.
- **Top-level blocks only.** A heading or Mermaid block inside a list or a blockquote is not changed. Pi's own Mermaid transformer works the same way.
- **Theme.** The transformer gets the theme from `ctx.ui` on `session_start`. Until that event, the rows have no color.
- **Pi version.** Built and tested against Pi 0.99.2 and `grok-mermaid` 0.2.3. The tests import Pi's own Mermaid transformer from a `dist/` path that the package does not export.

## Checks

```sh
bun run typecheck
bun run lint
bun run complexity   # V(G) < 4 for every function
bun run test
```
