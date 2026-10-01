import type { ExtensionAPI, ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { createTransformer } from "./transformer.ts";

// Pi's documented default for `markdown.mermaid`.
const DEFAULT_MERMAID_MODE = "streaming";

export default function (pi: ExtensionAPI) {
  // The transformer gets no theme; the UI context gives the current one at render time.
  let ui: ExtensionUIContext | undefined;
  pi.on("session_start", (_event, ctx) => {
    ui = ctx.ui;
  });
  pi.registerMarkdownTransformer(
    createTransformer({
      mermaidMode: () => pi.getSettings().markdown?.mermaid ?? DEFAULT_MERMAID_MODE,
      theme: () => ui?.theme,
    }),
  );
}
