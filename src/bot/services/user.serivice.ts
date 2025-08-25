import dotenv from "dotenv";
import { ITelegramUser } from "../../types/user.type";
import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";
import { MyContext } from "../types/bot-context";

dotenv.config();

export class UserService {
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
    // const cacheKey = `tg_user:${userId}`;

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


    return user;
  }

  // async getOrCreateUser(tgId: number, ctx: MyContext, refrerred_by?: number | null) {
  
    
  //   const userResult = await pool.query(
  //     `SELECT * FROM tg_user WHERE tg_id = $1`,
  //     [tgId]
  //   );
  //   let user = userResult.rows[0];

  //   if (!user) {
  //     const defaultLang = "uk";
  //     await pool.query(
  //       `INSERT INTO tg_user (tg_id, first_name, username, lang,refrerred_by) VALUES ($1, $2, $3, $4,$5)`,
  //       [
  //         tgId,
  //         ctx.message?.from.first_name || "",
  //         ctx.message?.from.username || "",
  //         defaultLang,
  //         refrerred_by ?? null,
  //       ]
  //     );
  //     return { lang: defaultLang, isNew: true };
  //   }

  //   return { lang: user.lang || "uk", isNew: false };
  // }


  async getOrCreateUser(tgId: number, ctx: MyContext, referred_by?: number | null) {
  const defaultLang = "uk";
  const firstName = ctx.message?.from.first_name || "";
  const username = ctx.message?.from.username || "";

  const { rows } = await pool.query(
    `INSERT INTO tg_user (tg_id, first_name, username, lang, referred_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tg_id) DO UPDATE 
       SET first_name = EXCLUDED.first_name,
           username = EXCLUDED.username,
           lang = tg_user.lang, -- залишаємо існуючу мову
           referred_by = COALESCE(tg_user.referred_by, EXCLUDED.referred_by)
     RETURNING *`,
    [tgId, firstName, username, defaultLang, referred_by ?? null]
  );

  const user = rows[0];
  return { lang: user.lang || defaultLang, isNew: user.created_at === user.updated_at };
}
  async saveReferedByIdIfExist(tgId: number, refered_by?: number) {
    const userResult = await pool.query(
      `SELECT * FROM tg_user WHERE tg_id = $1`,
      [tgId]
    );
    let user = userResult.rows[0];

    console.log(user, "USER");
  }
}

export const tgUserService = new UserService();
