import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../middleware/auth';
import { AppDataSource } from '../config/data-source';
import { ChatThread } from '../entities/chat-thread.entity';

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.headers.authorization?.toString().replace('Bearer ', '');
    if (!token) {
      next(new Error('Auth required'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on('chat:join', async (threadId: string) => {
      const thread = await AppDataSource.getRepository(ChatThread).findOne({
        where: [{ id: threadId, ownerId: userId }, { id: threadId, tenantId: userId }],
      });
      if (!thread) {
        socket.emit('chat:error', { code: 'FORBIDDEN_THREAD', threadId });
        return;
      }
      socket.join(`thread:${threadId}`);
    });

    socket.on('chat:leave', (threadId: string) => {
      socket.leave(`thread:${threadId}`);
    });
  });

  return io;
}

export function getSocketIO(): Server | null {
  return io;
}

export function emitChatMessage(
  threadId: string,
  message: Record<string, unknown>,
) {
  io?.to(`thread:${threadId}`).emit('chat:message', message);
}

export function emitDealUpdate(
  threadId: string,
  payload: Record<string, unknown>,
) {
  io?.to(`thread:${threadId}`).emit('deal:updated', payload);
}
