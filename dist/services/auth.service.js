"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const BOT_TOKEN = process.env.BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;
class AuthService {
    verifyTelegramSignature(data) {
        const { hash, ...rest } = data;
        const secret = crypto_1.default.createHash('sha256').update(BOT_TOKEN).digest();
        const sorted = Object.keys(rest)
            .sort()
            .map(key => `${key}=${rest[key]}`)
            .join('\n');
        const hmac = crypto_1.default.createHmac('sha256', secret).update(sorted).digest('hex');
        return hmac === hash;
    }
    generateToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id
        }, JWT_SECRET, { expiresIn: '7d' });
    }
}
exports.AuthService = AuthService;
