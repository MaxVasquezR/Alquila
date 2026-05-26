import { io, Socket } from 'socket.io-client';
import { getToken } from './api';
import { getApiBaseUrl } from './config';

const SOCKET_URL = getApiBaseUrl() || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getToken();
  if (!token) {
    socket?.disconnect();
    socket = null;
    return null;
  }

  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
