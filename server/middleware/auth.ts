import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production — refusing to start with insecure default secrets.'
  );
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyRefreshToken(token: string): string {
  const payload = jwt.verify(token, REFRESH_SECRET) as { sub: string };
  return payload.sub;
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

// Short-lived access token, sent as a normal Bearer header — this is what every
// protected route checks. It intentionally expires quickly (15m) so that if it
// ever leaks (XSS, logs) the exposure window is small.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Chưa đăng nhập.' });
    return;
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

// Shared admin gate — call after requireAuth. Centralizes the role check so every
// admin-only route enforces it identically instead of re-implementing it inline.
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const me = await UserModel.findById(req.userId);
  if (!me || me.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền này.' });
    return;
  }
  next();
}
