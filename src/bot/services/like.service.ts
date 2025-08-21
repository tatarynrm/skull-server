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
import bot from "../bot";
import { getSeeMyLikesKeyboard } from "../keyboards";
import { t } from "../lib/i18n";
import { Lang } from "../types/bot-context";

export class LikeService {
  /**
   * Додає лайк в історію або оновлює дату, якщо лайк вже існує
   * @param likerUserId - хто ставить лайк
   * @param likedUserId - кому ставлять лайк
   */

  private interval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
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

  private async getUnnotifiedLikes(batchSize: number = 500) {
    const result = await pool.query(
      `SELECT a.from_user_id, a.to_user_id,b.lang
     FROM tg_user_likes  a
     LEFT JOIN tg_user b on a.to_user_id = b.tg_id
     WHERE a.status = 'like' AND notified = false
     LIMIT $1`,
      [batchSize]
    );
    return result.rows;
  }

  // Позначаємо записи як notified
  private async markLikesAsNotified(
    likes: { from_user_id: number; to_user_id: number }[]
  ) {
    if (likes.length === 0) return;

    const queries = likes.map((like) =>
      pool.query(
        `UPDATE tg_user_likes 
       SET notified = true 
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'like'`,
        [like.from_user_id, like.to_user_id]
      )
    );

    // Виконуємо батч запитів одночасно, але тільки для цієї порції
    await Promise.all(queries);
  }
  private async sendLikesNotification(
    userId: number,
    likesCount: number,
    lang?: Lang
  ) {
    await bot.telegram.sendMessage(
      userId,
      t(lang || "en", "you_have_likes", { number_of_likes: likesCount }),
      {
        reply_markup: getSeeMyLikesKeyboard(lang || "en"),
      }
    );
  }
  public async processLikesBatch(batchSize: number = 500) {
    let likes = await this.getUnnotifiedLikes(batchSize);
    console.log(likes, "likes");

    if (likes.length === 0) {
      console.log("No new likes to send");
      return;
    }

    while (likes.length > 0) {
      // групуємо по користувачу

      type LikeRow = {
        from_user_id: number;
        to_user_id: number;
        lang?: string;
      };

      const grouped: Record<number, LikeRow[]> = {};
      for (const row of likes as LikeRow[]) {
        if (!grouped[row.to_user_id]) grouped[row.to_user_id] = [];
        grouped[row.to_user_id].push(row);
      }

      // надсилаємо кожному користувачу в поточній порції
      for (const [userId, userLikes] of Object.entries(grouped)) {
        try {
          const lang = (userLikes[0]?.lang as Lang) || "uk"; // беремо мову з першого лайка в групі
          await this.sendLikesNotification(
            Number(userId),
            userLikes.length,
            lang
          );
          await this.markLikesAsNotified(userLikes);
          console.log(
            `✅ Sent ${userLikes.length} likes notification to user ${userId}`
          );
        } catch (err) {
          console.error(`❌ Failed to send likes to user ${userId}`, err);
        }
      }

      // Беремо наступну порцію
      likes = await this.getUnnotifiedLikes(batchSize);
    }
  }





private async checkMutualLike(fromUserId: number, toUserId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM tg_user_likes
     WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'like'`,
    [toUserId, fromUserId] // перевіряємо, чи вже лайкнув навпаки
  );
  return rows.length > 0;
}

private async sendMutualLikeNotification(userA: number, userB: number) {
  const message = `💖 Ви поставили взаємний лайк з користувачем ${userB}!`;
  await bot.telegram.sendMessage(userA, message);

  const message2 = `💖 Ви поставили взаємний лайк з користувачем ${userA}!`;
  await bot.telegram.sendMessage(userB, message2);
}

  public start(intervalMs: number = 40000, batchSize: number = 500) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("Likes queue started...");

    this.interval = setInterval(async () => {
      await this.processLikesBatch(batchSize);
    }, intervalMs);
  }
}

export const tgLikeService = new LikeService();
