import { pool } from "../../db/pool";
import bot from "../bot";
import { t } from "../lib/i18n";
import { Lang } from "../types/bot-context";

interface LikeRow {
  id: number;
  to_user_id: number;
  lang: Lang;
}

export class LikesNotifier {
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async notifyUsersAboutNewLikesBatch() {
    // 1. Беремо максимум 1000 непрочитаних лайків та мову користувача
    const { rows } = await pool.query(
      `SELECT l.id, l.to_user_id, u.lang
       FROM tg_profile_likes l
       JOIN tg_user u ON u.tg_id = l.to_user_id
       WHERE l.is_sent = false
       ORDER BY l.id
       LIMIT 1000`
    );

    const likes = rows as LikeRow[];

    if (!likes.length) return;

    // 2. Групуємо по користувачу, зберігаючи мову
    const grouped = likes.reduce<Record<number, { ids: number[]; lang: Lang }>>(
      (acc, like) => {
        if (!acc[like.to_user_id]) acc[like.to_user_id] = { ids: [], lang: like.lang };
        acc[like.to_user_id].ids.push(like.id);
        return acc;
      },
      {}
    );

    // 3. Розсилка
    let counter = 0;
    for (const [userId, { ids: likeIds, lang }] of Object.entries(grouped)) {
      try {
        const count = likeIds.length;

        // Використовуємо локалізацію
        await bot.telegram.sendMessage(
          Number(userId),
          t(lang || 'uk', "you_have_new_likes", { likes: count })
        );

        // Оновлюємо статус
        await pool.query(
          `UPDATE tg_profile_likes
           SET is_sent = true
           WHERE id = ANY($1::int[])`,
          [likeIds]
        );
      } catch (err) {
        console.error(`❌ Не вдалося відправити користувачу ${userId}:`, err);
      }

      // Дотримуємося rate limit
      counter++;
      if (counter % 30 === 0) {
        await this.delay(1000);
      } else {
        await this.delay(50);
      }
    }
  }
}
