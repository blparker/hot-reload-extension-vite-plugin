"use strict";

// src/utils/index.ts
var isDev = process.env.NODE_ENV === "development";
var HOT_RELOAD_EXTENSION_VITE_PORT = process.env.HOT_RELOAD_EXTENSION_VITE_PORT ? parseInt(process.env.HOT_RELOAD_EXTENSION_VITE_PORT) : 5173;

// src/scripts/background-reload.ts
var PORT = 5173;
var PATH = "/__hre_ws";
var socket = new WebSocket(`ws://127.0.0.1:${PORT}${PATH}`);
var keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 2e4);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.tabs.reload();
  }
});
socket.addEventListener("message", (event) => {
  if (event.data === "file-change" /* FILE_CHANGE */) {
    chrome.runtime.reload();
  }
});
