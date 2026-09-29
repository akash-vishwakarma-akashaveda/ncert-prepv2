import { io, Socket } from 'socket.io-client';

import { API_URL } from './api/client';

let socket: Socket | null = null;

/** One shared connection per signed-in session — the server authenticates it off the same
 * session cookie as the REST API (see backend/src/index.ts) and joins the caller's own room. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
