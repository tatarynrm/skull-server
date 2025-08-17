// notify.ts
import cron from "node-cron";
import { pool } from "../../../db/pool";
import bot from "../../bot";
import PQueue from "p-queue";
import { getSeeMyLikes } from "../../keyboards/see-likes.keyboard";
import { t } from "../i18n";
import { getLikesMessage } from "./helpers/translate-messages";

// Черга з обмеженням одночасних відправок і швидкості
const likeQueue = new PQueue({ 
  concurrency: 10, // одночасно 10 повідомлень
  interval: 1000, // інтервал 1 секунда
  intervalCap: 20, // максимум 20 повідомлень на секунду
});

// Крон: кожні 5 секунд (для тесту можна поставити */5 * * * * *)
// Для реальної розсилки 5 хвилин -> '*/5 * * * *'
cron.schedule("*/5 * * * *", async () => {
  console.log("Перевірка нових лайків...");

  // 1️⃣ Отримуємо загальну кількість користувачів з новими лайками
  const totalRes = await pool.query(
    `SELECT COUNT(DISTINCT l.to_user_id) AS total
     FROM tg_user_likes l
     WHERE l.notified = false`
  );

  const totalUsers = parseInt(totalRes.rows[0].total, 10);
  const batchSize = 10000; // обробляємо по 10 000 користувачів за раз

  if (totalUsers === 0) {
    console.log("Нових лайків немає.");
    return;
  }

  console.log(`Знайдено ${totalUsers} користувачів з новими лайками.`);

  // 2️⃣ Обробка batch
  for (let offset = 0; offset < totalUsers; offset += batchSize) {
    const res = await pool.query(
      `SELECT 
         l.to_user_id, 
         u.lang, 
         COUNT(*) AS new_likes
       FROM tg_user_likes l
       JOIN tg_user u ON u.tg_id = l.to_user_id
       WHERE l.notified = false
       GROUP BY l.to_user_id, u.lang
       ORDER BY l.to_user_id
       LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    console.log(
      `Обробляємо користувачів ${offset + 1} - ${offset + res.rows.length}`
    );

    for (const row of res.rows) {
      const tgId = row.to_user_id;
      const count = row.new_likes;
      const lang = row.lang || "uk"; // fallback якщо мова не вказана
      console.log(lang, "----lang");

      // Додаємо відправку в чергу
      likeQueue.add(async () => {
        try {
          const message = getLikesMessage(lang, count);

          await bot.telegram.sendMessage(tgId, message);

          // Позначаємо лайки як надіслані після успішної відправки
          await pool.query( 
            `UPDATE tg_user_likes
             SET notified = true
             WHERE to_user_id = $1 AND notified = false`,
            [tgId]
          );
        } catch (err: any) {
          console.error(`Error sending to ${tgId}:`, err.message);
        }
      });
    }

    // Чекаємо, поки всі задачі поточної порції виконані
    await likeQueue.onIdle();
  }

  console.log("Розсилка нових лайків завершена!");
});
