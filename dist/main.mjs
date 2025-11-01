// node_modules/.pnpm/tsup@8.5.0_postcss@8.5.6_typescript@5.9.3_yaml@2.8.1/node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();

// src/main.ts
import { normalizePath } from "vite";
import fs from "fs";
import path2 from "path";
var VIRT_BG = "virtual:hre:bg-reload";
var VIRT_SP = "virtual:hre:sidepanel-reload";
var RES_VIRT_BG = "\0" + VIRT_BG;
var RES_VIRT_SP = "\0" + VIRT_SP;
var stripQueryHash = (id) => id.split("?")[0].split("#")[0];
function hotReloadExtension(options) {
  const { log, backgroundPath, sidepanelPath } = options;
  let root = process.cwd();
  let ws = null;
  const bgReloadCode = fs.readFileSync(path2.resolve(__dirname, "scripts/background-reload.js"), "utf8");
  const spReloadCode = fs.readFileSync(path2.resolve(__dirname, "scripts/sidepanel-reload.js"), "utf8");
  let absBg;
  let absSp;
  const matchFile = (id, target) => {
    if (!target) return false;
    const cleaned = normalizePath(stripQueryHash(id));
    return cleaned === target;
  };
  return {
    name: "hot-reload-extension",
    apply: "serve",
    // dev only
    enforce: "post",
    // run after React/TS transforms to avoid JSX parse errors
    configResolved(cfg) {
      root = cfg.root;
      if (backgroundPath) absBg = normalizePath(path2.resolve(root, backgroundPath));
      if (sidepanelPath) absSp = normalizePath(path2.resolve(root, sidepanelPath));
    },
    // Expose virtual modules that contain the reload logic
    resolveId(id) {
      if (id === VIRT_BG) return RES_VIRT_BG;
      if (id === VIRT_SP) return RES_VIRT_SP;
    },
    load(id) {
      if (id === RES_VIRT_BG) return bgReloadCode;
      if (id === RES_VIRT_SP) return spReloadCode;
    },
    // If sidepanelPath points to an HTML entry, inject a <script type="module"> the right way
    transformIndexHtml(html, ctx) {
      if (!sidepanelPath || !absSp || !ctx?.path) return;
      const current = normalizePath(path2.resolve(root, ctx.path));
      if (current !== absSp) return;
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: { type: "module" },
            children: spReloadCode,
            injectTo: "body"
            // places before </body>
          }
        ]
      };
    },
    // For JS/TS/TSX entries, append a plain ESM import after compile
    transform(code, id) {
      const cleaned = normalizePath(stripQueryHash(id));
      if (absBg && matchFile(cleaned, absBg)) {
        return { code: `${code}
import '${VIRT_BG}';
` };
      }
      const isHtmlSidepanel = sidepanelPath?.endsWith(".html");
      if (absSp && !isHtmlSidepanel && matchFile(cleaned, absSp)) {
        return { code: `${code}
import '${VIRT_SP}';
` };
      }
    },
    // Your existing “poke the socket to trigger extension reload” logic
    closeBundle() {
      if (!ws) {
        return;
      }
      setTimeout(() => {
        ws?.send("FILE_CHANGE");
        if (log) console.log("[hot-reload-extension] Extension Reloaded\u2026");
      }, 1e3);
    },
    // If you previously created the websocket server elsewhere, keep that.
    // If not, expose a small hook to inject from your dev server entry:
    configureServer(server) {
      server.ws.on("connection", (socket) => {
        ws = socket;
        if (log) console.log("[hot-reload-extension] Client connected. Ready to reload.");
      });
    }
  };
}
export {
  hotReloadExtension as default
};
