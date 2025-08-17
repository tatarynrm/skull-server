import PQueue from "p-queue";
import { pool } from "../../db/pool";
import bot from "../bot";
export const queue = new PQueue({ concurrency: 5, interval: 1000, intervalCap: 20 });
export const likeQueue = new PQueue({
  concurrency: 5,      // скільки одночасних повідомлень
  interval: 1000,      // 1 секунда
  intervalCap: 20      // максимум 20 повідомлень на інтервал
});

async function sendLikesToUser(userId: number, likesCount: number) {
  queue.add(async () => {
    await bot.telegram.sendMessage(userId, `У вас ${likesCount} нових лайків!`);
  });
}



export async function sendToAllUsers(message: string) {
  const totalRes = await pool.query(`SELECT COUNT(*) FROM tg_user`);
  const totalUsers = parseInt(totalRes.rows[0].count, 10);

  const batchSize = 10000;

  for (let offset = 0; offset < totalUsers; offset += batchSize) {
    const usersRes = await pool.query(
      `SELECT tg_id FROM tg_user ORDER BY tg_id LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    console.log(`Обробляємо користувачів ${offset} - ${offset + usersRes.rows.length}`);

    // Створюємо нову чергу для поточного batch-а
    const queue = new PQueue({
      concurrency: 5,
      interval: 1000,
      intervalCap: 20,
    });

    for (const user of usersRes.rows) {
      queue.add(async () => {
        try {
          await bot.telegram.sendMessage(user.tg_id, message, {
            parse_mode: "HTML",
          });
        } catch (err: any) {
          console.error(`Error sending to ${user.tg_id}:`, err.message);
        }
      });
    }

    // Чекаємо поки всі задачі batch-а завершені
    await queue.onIdle();
  }

  console.log("Розсилка завершена для всіх користувачів!");
}


// Приклад виклику
// const message = `<b>Привіт, користувачу!</b>\nЦе <i>тестове повідомлення</i> з <a href="https://example.com">посиланням</a>.`;
// sendToAllUsers(message);
