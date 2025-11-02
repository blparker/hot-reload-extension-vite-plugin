import { Message } from '../utils';
/**
 * If development, this code will be appended to sidepanel script file.
 */

const PORT = 5173; // or inject from plugin if you change it
const PATH = '/__hre_ws';

/** Initializes or re-initializes a WebSocket connection to the Hot-Reload-Extension Server */
const startWebSocket = () => {
  //   const socket = new WebSocket(`ws://localhost:${HOT_RELOAD_EXTENSION_VITE_PORT}`);
  const socket = new WebSocket(`ws://127.0.0.1:${PORT}${PATH}`);
  console.log('startWebSocket', socket);

  socket.addEventListener('open', () => {});

  socket.addEventListener('message', (event) => {
    if (event.data === Message.FILE_CHANGE) {
      window.location.reload();
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(startWebSocket, 1000);
  });
};

startWebSocket();
