// CREATE TABLE tg_user_likes_history (
//     id SERIAL PRIMARY KEY,
//     liker_user_id BIGINT NOT NULL,          -- хто поставив лайк
//     liked_user_id BIGINT NOT NULL,          -- кому поставили лайк
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),  -- коли лайк
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),  -- для оновлень
//     UNIQUE (liker_user_id, liked_user_id)   -- якщо повторний лайк — оновлюємо дату
// );

import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";

export class LikeService {
  /**
   * Додає лайк в історію або оновлює дату, якщо лайк вже існує
   * @param likerUserId - хто ставить лайк
   * @param likedUserId - кому ставлять лайк
   */
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

  async updateUserStats(likerUserId: number, likedUserId: number) {
    const client = await pool.connect();

    try {
      // 1️⃣ Дістаємо вік і стать користувача, що став лайк
      const { rows } = await client.query(
        `SELECT age, sex FROM tg_user_profile WHERE user_id = $1`,
        [likerUserId]
      );
      console.log(rows, "ROWS");

      if (!rows[0]) return;

      const { age, sex } = rows[0];

      // 2️⃣ Визначаємо вікову категорію
      let ageRange: string;
      if (age >= 14 && age <= 17) ageRange = "14-17";
      else if (age >= 18 && age <= 24) ageRange = "18-24";
      else if (age >= 25 && age <= 34) ageRange = "25-34";
      else if (age >= 35 && age <= 44) ageRange = "35-44";
      else if (age >= 45 && age <= 54) ageRange = "45-54";
      else if (age >= 55 && age <= 64) ageRange = "55-64";
      else ageRange = "65-80";

      // 3️⃣ Формуємо поле для статі
      const likesByWomenIncrement = sex === 2 ? 1 : 0;
      const likesByMenIncrement = sex === 1 ? 1 : 0;

      // 4️⃣ Вставляємо або оновлюємо рядок
      const query = `
  INSERT INTO tg_user_age_stats 
    (user_id, age_range, total_likes, likes_by_women, likes_by_men, updated_at)
  VALUES ($1, $2, 1, $3, $4, NOW())
  ON CONFLICT (user_id, age_range)
  DO UPDATE SET
    total_likes = tg_user_age_stats.total_likes + 1,
    likes_by_women = tg_user_age_stats.likes_by_women + $3,
    likes_by_men = tg_user_age_stats.likes_by_men + $4,
    updated_at = NOW()
`;

      await client.query(query, [
        likedUserId,
        ageRange,
        likesByWomenIncrement,
        likesByMenIncrement,
      ]);
    } catch (err) {
      console.error("Error updating user age stats:", err);
    } finally {
      client.release();
    }
  }
}

export const tgLikeService = new LikeService();
