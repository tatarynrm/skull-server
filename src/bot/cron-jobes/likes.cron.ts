import cron from "node-cron";
import { pool } from "../../db/pool";

export function scheduleDeleteOldLikes() {
    // Кожній 10 секунд 
    // "*/10 * * * * *"


    // Кожного дня о 00:05 ночі
    //   "5 0 * * *"



  // Запуск кожні 10 секунд (для тесту)

  cron.schedule("5 0 * * *", async () => {
    console.log("Starting batch deletion of old likes...");

    const batchSize = 1000;
    let totalDeleted = 0;

    while (true) {
      try {
        const res = await pool.query(
          `
          WITH to_delete AS (
            SELECT *
            FROM tg_user_likes
            WHERE DATE(created_at) < CURRENT_DATE
            LIMIT $1
          )
          DELETE FROM tg_user_likes
          USING to_delete
          WHERE tg_user_likes.from_user_id = to_delete.from_user_id
            AND tg_user_likes.to_user_id = to_delete.to_user_id
            AND tg_user_likes.created_at = to_delete.created_at
          RETURNING tg_user_likes.*;
          `,
          [batchSize]
        );

        const deletedCount: number = res.rowCount ?? 0;
        totalDeleted += deletedCount;
        console.log(`Deleted ${deletedCount} rows in this batch.`);

        if (deletedCount < batchSize) {
          // Менше, ніж batchSize → більше старих записів нема
          break;
        }
      } catch (err) {
        console.error("Error deleting old likes in batch:", err);
        break;
      }
    }

    console.log(`Total old likes deleted: ${totalDeleted}`);
  });

  console.log(
    "Cron job for deleting old likes scheduled every 10 seconds (test mode)"
  );
}
