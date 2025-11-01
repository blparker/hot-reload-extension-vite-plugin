"use strict";

// src/utils/index.ts
var isDev = process.env.NODE_ENV === "development";
var HOT_RELOAD_EXTENSION_VITE_PORT = process.env.HOT_RELOAD_EXTENSION_VITE_PORT ? parseInt(process.env.HOT_RELOAD_EXTENSION_VITE_PORT) : 8080;

// src/scripts/sidepanel-reload.ts
var startWebSocket = () => {
  const socket = new WebSocket(`ws://localhost:${HOT_RELOAD_EXTENSION_VITE_PORT}`);
  socket.addEventListener("open", () => {
  });
  socket.addEventListener("message", (event) => {
    if (event.data === "file-change" /* FILE_CHANGE */) {
      window.location.reload();
    }
  });
  socket.addEventListener("close", () => {
    setTimeout(startWebSocket, 1e3);
  });
};
startWebSocket();
