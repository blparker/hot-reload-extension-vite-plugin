"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => hotReloadExtension
});
module.exports = __toCommonJS(main_exports);
var import_vite = require("vite");
var import_node_fs = __toESM(require("fs"));
var import_node_path = __toESM(require("path"));
var VIRT_BG = "virtual:hre:bg-reload";
var VIRT_SP = "virtual:hre:sidepanel-reload";
var RES_VIRT_BG = "\0" + VIRT_BG;
var RES_VIRT_SP = "\0" + VIRT_SP;
var stripQueryHash = (id) => id.split("?")[0].split("#")[0];
function hotReloadExtension(options) {
  const { log, backgroundPath, sidepanelPath } = options;
  let root = process.cwd();
  let ws = null;
  const bgReloadCode = import_node_fs.default.readFileSync(import_node_path.default.resolve(__dirname, "scripts/background-reload.js"), "utf8");
  const spReloadCode = import_node_fs.default.readFileSync(import_node_path.default.resolve(__dirname, "scripts/sidepanel-reload.js"), "utf8");
  let absBg;
  let absSp;
  const matchFile = (id, target) => {
    if (!target) return false;
    const cleaned = (0, import_vite.normalizePath)(stripQueryHash(id));
    return cleaned === target;
  };
  return {
    name: "hot-reload-extension",
    apply: "serve",
    // dev only
    enforce: "post",
    // run after React/TS transforms to avoid JSX parse errors
    configResolved(cfg) {
      process.stdout.write("configResolved");
      process.stderr.write("configResolved");
      root = cfg.root;
      if (backgroundPath) absBg = (0, import_vite.normalizePath)(import_node_path.default.resolve(root, backgroundPath));
      if (sidepanelPath) absSp = (0, import_vite.normalizePath)(import_node_path.default.resolve(root, sidepanelPath));
    },
    // Expose virtual modules that contain the reload logic
    resolveId(id) {
      process.stdout.write("resolveId:" + id);
      process.stderr.write("resolveId:" + id);
      if (id === VIRT_BG) return RES_VIRT_BG;
      if (id === VIRT_SP) return RES_VIRT_SP;
    },
    load(id) {
      process.stdout.write("load:" + id);
      process.stderr.write("load:" + id);
      if (id === RES_VIRT_BG) return bgReloadCode;
      if (id === RES_VIRT_SP) return spReloadCode;
    },
    // If sidepanelPath points to an HTML entry, inject a <script type="module"> the right way
    transformIndexHtml(html, ctx) {
      process.stdout.write("transformIndexHtml:" + html);
      process.stderr.write("transformIndexHtml:" + html);
      if (!sidepanelPath || !absSp || !ctx?.path) return;
      const current = (0, import_vite.normalizePath)(import_node_path.default.resolve(root, ctx.path));
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
      process.stdout.write("transform:" + id);
      process.stderr.write("transform:" + id);
      const cleaned = (0, import_vite.normalizePath)(stripQueryHash(id));
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
      process.stdout.write("closeBundle");
      process.stderr.write("closeBundle");
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
      process.stdout.write("configureServer");
      process.stderr.write("configureServer");
      server.ws.on("connection", (socket) => {
        ws = socket;
        if (log) console.log("[hot-reload-extension] Client connected. Ready to reload.");
      });
    }
  };
}
