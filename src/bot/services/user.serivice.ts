import dotenv from "dotenv";
import { ITelegramUser } from "../../types/user.type";
import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";
import { MyContext } from "../types/bot-context";

dotenv.config();

export class TelegramUserService {
  public async saveTelegramUserIfNotExist(user: ITelegramUser) {
    const result = await pool.query(
      `INSERT INTO tg_user (tg_id, first_name, username,lang)
     VALUES ($1, $2, $3,$4)
     ON CONFLICT (tg_id) DO NOTHING
     RETURNING *`,
      [user.tg_id, user.first_name, user.username]
    );
    return result.rows[0] || null;
  }
  public async getTelegramUser(userId: number) {
    const cacheKey = `tg_user:${userId}`;

    // // 1️⃣ Перевіряємо Redis
    // const cached = await redis.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    // 2️⃣ Якщо нема в кеші — беремо з PostgreSQL
    const result = await pool.query(`SELECT * FROM tg_user WHERE tg_id = $1`, [
      userId,
    ]);
    const user = result.rows[0] || null;

    // 3️⃣ Зберігаємо в кеш Redis на 1 хвилину
    // if (user) {
    //   await redis.set(cacheKey, JSON.stringify(user), "EX", 60 * 1);
    // }

    return user;
  }

  async getOrCreateUser(tgId: number, ctx: MyContext) {
    const userResult = await pool.query(
      `SELECT * FROM tg_user WHERE tg_id = $1`,
      [tgId]
    );
    let user = userResult.rows[0];

    if (!user) {
      const defaultLang = "uk";
      await pool.query(
        `INSERT INTO tg_user (tg_id, first_name, username, lang) VALUES ($1, $2, $3, $4)`,
        [
          tgId,
          ctx.message?.from.first_name || "",
          ctx.message?.from.username || "",
          defaultLang,
        ]
      );
      return { lang: defaultLang, isNew: true };
    }

    return { lang: user.lang || "uk", isNew: false };
  }
}

export const telegramUserService = new TelegramUserService();
