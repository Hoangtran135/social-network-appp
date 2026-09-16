import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';

interface AuthedSocket extends Socket {
  userId?: string;
}

// A user may have the app open in multiple tabs/devices — track every socket per user.
const userSockets = new Map<string, Set<string>>();

function addSocket(userId: string, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socketId);
}

function removeSocket(userId: string, socketId: string) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}

let ioInstance: Server | null = null;

// Push an event straight to every open tab/device a user has connected — used to push
// new messages and notifications live instead of requiring a manual refresh.
export function emitToUser(userId: string, event: string, payload: unknown) {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

// Push to several users at once (e.g. every friend who can see a "friends"-only post/story,
// or every member of a group). Skips duplicate work by joining the per-user rooms Socket.io
// already tracks rather than looking up individual sockets.
export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!ioInstance || userIds.length === 0) return;
  const rooms = userIds.map((id) => `user:${id}`);
  ioInstance.to(rooms).emit(event, payload);
}

// Push to every currently-connected client — used for genuinely public content (public
// posts/stories, new public groups) where there's no fixed recipient list to compute.
export function broadcastToAll(event: string, payload: unknown, excludeUserId?: string) {
  if (!ioInstance) return;
  if (excludeUserId) {
    ioInstance.except(`user:${excludeUserId}`).emit(event, payload);
  } else {
    ioInstance.emit(event, payload);
  }
}

// Forcibly drops every open tab/device a user has connected — used when they're banned so
// they're kicked out live instead of keeping full access until their access token happens
// to expire (up to 15 minutes later).
export function disconnectUser(userId: string) {
  ioInstance?.in(`user:${userId}`).disconnectSockets(true);
}

export function setupRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });
  ioInstance = io;

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Chưa đăng nhập.'));
    try {
      const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string };
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Phiên đăng nhập không hợp lệ.'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const userId = socket.userId!;
    addSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    // --- 1-1 call signaling: relayed verbatim to every socket the target user has open ---
    socket.on('call:invite', (data: { toUserId: string; callType: 'audio' | 'video'; conversationId: string }) => {
      io.to(`user:${data.toUserId}`).emit('call:incoming', {
        fromUserId: userId,
        callType: data.callType,
        conversationId: data.conversationId,
      });
    });

    socket.on('call:answer-offer', (data: { toUserId: string; offer: unknown }) => {
      io.to(`user:${data.toUserId}`).emit('call:offer', { fromUserId: userId, offer: data.offer });
    });

    socket.on('call:answer', (data: { toUserId: string; answer: unknown }) => {
      io.to(`user:${data.toUserId}`).emit('call:answer', { fromUserId: userId, answer: data.answer });
    });

    socket.on('call:ice-candidate', (data: { toUserId: string; candidate: unknown }) => {
      io.to(`user:${data.toUserId}`).emit('call:ice-candidate', { fromUserId: userId, candidate: data.candidate });
    });

    socket.on('call:reject', (data: { toUserId: string }) => {
      io.to(`user:${data.toUserId}`).emit('call:rejected', { fromUserId: userId });
    });

    socket.on('call:end', (data: { toUserId: string }) => {
      io.to(`user:${data.toUserId}`).emit('call:ended', { fromUserId: userId });
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);
    });
  });

  return io;
}
