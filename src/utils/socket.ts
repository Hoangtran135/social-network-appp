import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

/** Lazily creates (or returns) a single socket.io connection authenticated with the current access token. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({
    auth: { token: getAccessToken() },
    autoConnect: true,
  });
  return socket;
}

/** Call after a token refresh so the next reconnect authenticates with the new token. */
export function refreshSocketAuth() {
  if (!socket) return;
  socket.auth = { token: getAccessToken() };
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
