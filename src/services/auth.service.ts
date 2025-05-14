import dotenv from 'dotenv'
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET!;

export class AuthService {
  verifyTelegramSignature(data: Record<string, string>): boolean {
    const { hash, ...rest } = data;
    const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();

    const sorted = Object.keys(rest)
      .sort()
      .map(key => `${key}=${rest[key]}`)
      .join('\n');

    const hmac = crypto.createHmac('sha256', secret).update(sorted).digest('hex');
    return hmac === hash;
  }

  generateToken(user: any): string {
    return jwt.sign(
      {
        id: user.id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}
