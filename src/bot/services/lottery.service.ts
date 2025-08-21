import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";

export class LotteryService {
  async registerDailyLottery(ctx: MyContext) {
    const tgId = ctx.message?.from.id;

    // сьогоднішня дата
    const today = new Date().toISOString().slice(0, 10);

    // перевіряємо чи вже учасник
    const check = await pool.query(
      `SELECT * FROM tg_daily_lottery WHERE user_id = $1 AND lottery_date = $2`,
      [tgId, today]
    );

    if (check.rows.length > 0) {
      return `already_participating_dayly_lottery`;
    }

    // додаємо в таблицю
    await pool.query(
      `INSERT INTO tg_daily_lottery (user_id, lottery_date) VALUES ($1, $2)`,
      [tgId, today]
    );

    return `added_participating_dayly_lottery`;
  }
  async registerMonthlyLottery(ctx: MyContext) {
    const tgId = ctx.message?.from.id;

    // сьогоднішня дата
    const today = new Date().toISOString().slice(0, 10);

    // перевіряємо чи вже учасник
    const check = await pool.query(
      `SELECT * FROM tg_monthly_lottery WHERE user_id = $1 AND lottery_date = $2`,
      [tgId, today]
    );

    if (check.rows.length > 0) {
      return `already_participating_monthly_lottery`;
    }
    // додаємо в таблицю
    await pool.query(
      `INSERT INTO tg_monthly_lottery (user_id, lottery_date) VALUES ($1, $2)`,
      [tgId, today]
    );

    return `added_participating_monthly_lottery`;
  }
async checkParticapation(ctx: MyContext) {
  const tgId = ctx.message?.from.id;

  // сьогоднішня дата
  const today = new Date().toISOString().slice(0, 10);

  // перевіряємо чи вже учасник
  const checkMonth = await pool.query(
    `SELECT * FROM tg_monthly_lottery WHERE user_id = $1 AND lottery_date = $2`,
    [tgId, today]
  );
  const checkDay = await pool.query(
    `SELECT * FROM tg_daily_lottery WHERE user_id = $1 AND lottery_date = $2`,
    [tgId, today]
  );

  const checkMonthly = checkMonth.rows[0];
  const checkDaily = checkDay.rows[0];

  console.log(checkMonthly, "monthly");
  console.log(checkDaily, "daily");

  return {
    dayLottery: !!checkDaily,   // true якщо запис існує
    monthLottery: !!checkMonthly,
  };
}

}

export const tgLotteryService = new LotteryService();
