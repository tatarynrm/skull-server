
import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";

export class ReferalService {

 
  async addLikeHistoryRecord(likerUserId: number, likedUserId: number) {
    const client = await pool.connect();

    try {
      const query = `
        INSERT INTO tg_user_likes_history (liker_user_id, liked_user_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (liker_user_id, liked_user_id)
        DO UPDATE SET updated_at = NOW()
      `;

      await client.query(query, [likerUserId, likedUserId]);

      // Опційно: можна зберегти кеш у Redis, наприклад кількість лайків
      const cacheKey = `user:${likedUserId}:totalLikes`;
      await redis.incr(cacheKey);

      console.log(`Like from ${likerUserId} to ${likedUserId} saved ✅`);
    } catch (err) {
      console.error("Error adding like history:", err);
    } finally {
      client.release();
    }
  }


}

export const tgReferalService = new ReferalService();
