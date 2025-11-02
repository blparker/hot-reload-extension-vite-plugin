"use strict";

// src/utils/index.ts
var isDev = process.env.NODE_ENV === "development";
var HOT_RELOAD_EXTENSION_VITE_PORT = process.env.HOT_RELOAD_EXTENSION_VITE_PORT ? parseInt(process.env.HOT_RELOAD_EXTENSION_VITE_PORT) : 5173;

// src/scripts/sidepanel-reload.ts
var PORT = 5173;
var PATH = "/__hre_ws";
var startWebSocket = () => {
  const socket = new WebSocket(`ws://127.0.0.1:${PORT}${PATH}`);
  console.log("startWebSocket", socket);
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
