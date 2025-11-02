// import type { Plugin } from 'vite';
// import { resolve } from 'path';
// import WebSocket from 'ws';
// import fs from 'fs';
// import { initAndListenConnection } from './utils/websocket';
// import { Message, PLUGIN_NAME, chalkLogger, isDev } from './utils';

// export type hotReloadExtensionOptions = {
//   backgroundPath: string;
//   sidepanelPath?: string;
//   log?: boolean;
// };

// const hotReloadExtension = (options: hotReloadExtensionOptions): Plugin => {
//   const { log, backgroundPath, sidepanelPath } = options;
//   let ws: WebSocket | null = null;

//   if (isDev) {
//     initAndListenConnection((websocket) => {
//       ws = websocket;
//       if (log) {
//         chalkLogger.green('Client connected! Ready to reload...');
//       }
//     });
//   }

//   return {
//     name: PLUGIN_NAME,
//     async transform(code: string, id: string) {
//       if (!isDev) {
//         return;
//       }

//       if (!backgroundPath && !sidepanelPath) {
//         chalkLogger.red(
//           'Target file missing! Please, specify either `backgroundPath` or `sidepanelPath` in the plugin options'
//         );
//       }

//       if (backgroundPath && id.includes(backgroundPath)) {
//         const buffer = fs.readFileSync(resolve(__dirname, 'scripts/background-reload.js'));
//         return {
//           code: code + buffer.toString()
//         };
//       }

//       if (sidepanelPath && id.includes(sidepanelPath)) {
//         const buffer = fs.readFileSync(resolve(__dirname, 'scripts/sidepanel-reload.js'));
//         return {
//           code: code + buffer.toString()
//         };
//       }
//     },
//     async closeBundle() {
//       if (!isDev) {
//         return;
//       }

//       if (!ws) {
//         chalkLogger.red('Load extension to browser...');
//         return;
//       }
//       setTimeout(() => {
//         ws?.send(Message.FILE_CHANGE);
//         if (log) chalkLogger.green('Extension Reloaded...');
//       }, 1000);
//     }
//   };
// };

// export default hotReloadExtension;

import type { Plugin } from 'vite';
import { normalizePath } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
// import { Message, PLUGIN_NAME, chalkLogger, isDev } from './utils';
import { PLUGIN_NAME } from './utils';
import { WebSocketServer } from 'ws';

type HotReloadOptions = {
  log?: boolean;
  backgroundPath?: string; // e.g. "core/background/index.ts"
  sidepanelPath?: string; // e.g. "ui/sidepanel/index.html" or "ui/sidepanel/main.tsx"
};

const VIRT_BG = 'virtual:hre:bg-reload';
const VIRT_SP = 'virtual:hre:sidepanel-reload';
const RES_VIRT_BG = '\0' + VIRT_BG;
const RES_VIRT_SP = '\0' + VIRT_SP;
const HRE_WS_PATH = '/__hre_ws';

const stripQueryHash = (id: string) => id.split('?')[0].split('#')[0];

export default function hotReloadExtension(options: HotReloadOptions): Plugin {
  const { backgroundPath, sidepanelPath } = options;

  let root = process.cwd();
  //   let ws: WebSocket | null = null;
  let wss: WebSocketServer | undefined;

  // Load once
  const bgReloadCode = fs.readFileSync(path.resolve(__dirname, 'scripts/background-reload.js'), 'utf8');
  const spReloadCode = fs.readFileSync(path.resolve(__dirname, 'scripts/sidepanel-reload.js'), 'utf8');

  // Pre-resolve absolute target paths (if provided)
  let absBg: string | undefined;
  let absSp: string | undefined;

  const matchFile = (id: string, target?: string) => {
    if (!target) return false;
    const cleaned = normalizePath(stripQueryHash(id));
    return cleaned === target;
  };

  return {
    name: PLUGIN_NAME,
    // apply: 'serve', // dev only
    enforce: 'post', // run after React/TS transforms to avoid JSX parse errors

    configResolved(cfg) {
      root = cfg.root;
      if (backgroundPath) absBg = normalizePath(path.resolve(root, backgroundPath));
      if (sidepanelPath) absSp = normalizePath(path.resolve(root, sidepanelPath));
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
      // ctx.path is the filesystem path of the HTML being processed
      const current = normalizePath(path.resolve(root, ctx.path));
      if (current !== absSp) return;

      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: spReloadCode,
            injectTo: 'body' // places before </body>
          }
        ]
      };
    },

    // For JS/TS/TSX entries, append a plain ESM import after compile
    transform(code, id) {
      const cleaned = normalizePath(stripQueryHash(id));

      if (absBg && matchFile(cleaned, absBg)) {
        return { code: `${code}\nimport '${VIRT_BG}';\n` };
      }

      // Only inject here if sidepanelPath is NOT an HTML file
      const isHtmlSidepanel = sidepanelPath?.endsWith('.html');
      if (absSp && !isHtmlSidepanel && matchFile(cleaned, absSp)) {
        return { code: `${code}\nimport '${VIRT_SP}';\n` };
      }
    },

    // Your existing “poke the socket to trigger extension reload” logic
    closeBundle() {
      //   if (!ws) {
      //     // Optional: console.warn('Load extension to browser...');
      //     return;
      //   }
      //   setTimeout(() => {
      //     ws?.send('FILE_CHANGE'); // or Message.FILE_CHANGE if you export it
      //     // if (log) console.log('[hot-reload-extension] Extension Reloaded…');
      //     if (log) chalkLogger.green('Extension Reloaded...');
      //   }, 1000);
      if (!wss) return;
      setTimeout(() => {
        for (const c of wss!.clients) if (c.readyState === 1) c.send('FILE_CHANGE');
      }, 1000);
    },

    // If you previously created the websocket server elsewhere, keep that.
    // If not, expose a small hook to inject from your dev server entry:
    configureServer(server) {
      // Minimal WS that echoes FILE_CHANGE messages to clients
      //   server.ws.on('connection', (socket) => {
      //     ws = socket as unknown as WebSocket;
      //     // if (log) console.log('[hot-reload-extension] Client connected. Ready to reload.');
      //     if (log) chalkLogger.green('Client connected. Ready to reload.');
      //   });
      wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith(HRE_WS_PATH)) {
          wss!.handleUpgrade(req, socket, head, (ws) => {
            wss!.emit('connection', ws, req);
          });
        }
      });

      console.log(`[hre] WS on ws://127.0.0.1:${server.config.server.port ?? 5173}${HRE_WS_PATH}`);
    }
  };
}
