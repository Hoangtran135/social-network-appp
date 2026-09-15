import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel } from './models/User';

const GEMINI_MODEL = 'gemini-3.6-flash';

const BOT_SYSTEM_PROMPT =
  'Bạn là "Trợ Lý AI" — trợ lý ảo thân thiện trong một ứng dụng mạng xã hội tên SocialNet. ' +
  'Trả lời ngắn gọn, tự nhiên, bằng tiếng Việt (trừ khi người dùng chủ động dùng ngôn ngữ khác), ' +
  'giống như đang nhắn tin trò chuyện chứ không phải viết bài luận dài.';

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export const BOT_USERNAME = 'ai-assistant';

/** Idempotent — safe to call on every server start. Creates the fixed "AI Trợ Lý" bot
 * account once; later starts just find it. It can't log in (random unusable password). */
export async function ensureBotUser(): Promise<string> {
  const existing = await UserModel.findOne({ username: BOT_USERNAME });
  if (existing) return existing._id.toString();

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const bot = await UserModel.create({
    name: 'Trợ Lý AI',
    username: BOT_USERNAME,
    email: 'ai-assistant@socialnet.local',
    passwordHash,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SocialNetAI',
    bio: 'Trợ lý ảo của SocialNet — nhắn tin để hỏi bất cứ điều gì! 🤖',
    role: 'user',
    isBot: true,
    isOnline: true,
  });
  console.log('[ai] Created bot user:', bot._id.toString());
  return bot._id.toString();
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/** Returns null (instead of throwing) when the AI is unavailable — callers should skip
 * posting a reply rather than surface a broken bot message. */
export async function getBotReply(history: ChatTurn[]): Promise<string | null> {
  const ai = getClient();
  if (!ai) {
    console.warn('[ai] GEMINI_API_KEY not set — skipping bot reply.');
    return null;
  }
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      config: { systemInstruction: BOT_SYSTEM_PROMPT },
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.error('[ai] Gemini request failed:', err);
    return null;
  }
}
