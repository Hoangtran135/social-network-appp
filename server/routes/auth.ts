import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  requireAuth,
  AuthedRequest,
  REFRESH_COOKIE_NAME,
} from '../middleware/auth';
import { serializeMe } from '../serialize';
import { sendPasswordResetEmail } from '../mailer';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas';

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password]
 *             properties:
 *               name: { type: string }
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Account created — sets refreshToken httpOnly cookie, returns accessToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Missing fields }
 *       409: { description: Email or username already taken }
 */
authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    res.status(400).json({ error: 'Thiếu thông tin đăng ký.' });
    return;
  }
  const existing = await UserModel.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (existing) {
    res.status(409).json({ error: 'Email hoặc username đã được sử dụng.' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    name,
    username,
    email: email.toLowerCase(),
    passwordHash,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    bio: 'Thành viên mới của mạng xã hội 👋',
    role: 'user',
    isOnline: true,
  });
  const userId = user._id.toString();
  setRefreshCookie(res, signRefreshToken(userId));
  res.json({ accessToken: signAccessToken(userId), user: serializeMe(user) });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Logged in — sets refreshToken httpOnly cookie, returns accessToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Wrong email or password }
 *       403: { description: Account is banned }
 */
authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email: (email || '').toLowerCase() });
  if (!user) {
    res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    return;
  }
  const match = await bcrypt.compare(password || '', user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: 'banned' });
    return;
  }
  user.isOnline = true;
  user.lastActive = undefined;
  await user.save();
  const userId = user._id.toString();
  setRefreshCookie(res, signRefreshToken(userId));
  res.json({ accessToken: signAccessToken(userId), user: serializeMe(user) });
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange the refreshToken cookie for a new short-lived accessToken
 *     description: >
 *       Called silently by the client (on page load, or after a 401 from an
 *       expired accessToken) — no body required, the refreshToken travels as
 *       an httpOnly cookie so it is never exposed to client-side JS.
 *     responses:
 *       200:
 *         description: New accessToken issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Missing or invalid refresh token — user must log in again }
 */
authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Không có phiên đăng nhập.' });
    return;
  }
  try {
    const userId = verifyRefreshToken(token);
    const user = await UserModel.findById(userId);
    if (!user || user.isBanned) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Phiên đăng nhập không còn hợp lệ.' });
      return;
    }
    res.json({ accessToken: signAccessToken(userId), user: serializeMe(user) });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' });
  }
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password-reset link by email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Always returns ok, regardless of whether the email exists (avoids account enumeration) }
 */
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email: (email || '').toLowerCase() });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }
  }
  // Same response whether or not the account exists — don't leak which emails are registered.
  res.json({ ok: true });
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a token from the forgot-password email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token, password]
 *             properties:
 *               email: { type: string }
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password updated }
 *       400: { description: Invalid or expired token }
 */
authRouter.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    res.status(400).json({ error: 'Thiếu thông tin.' });
    return;
  }
  const user = await UserModel.findOne({ email: (email || '').toLowerCase() });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (
    !user ||
    !user.resetTokenHash ||
    user.resetTokenHash !== tokenHash ||
    !user.resetTokenExpires ||
    user.resetTokenExpires.getTime() < Date.now()
  ) {
    res.status(400).json({ error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    return;
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ ok: true });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out — clears the refreshToken cookie and marks the user offline
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
authRouter.post('/logout', requireAuth, async (req: AuthedRequest, res) => {
  await UserModel.findByIdAndUpdate(req.userId, { isOnline: false, lastActive: new Date() });
  clearRefreshCookie(res);
  res.json({ ok: true });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return;
  }
  res.json({ user: serializeMe(user) });
});
