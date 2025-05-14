// src/bot/tgUser.ts
import { pool } from "../db/pool";
import { Context } from "telegraf";


export const handleStart = async (ctx: Context) => {
  const tgUser = ctx.message?.from;  // використовуючи optional chaining

  if (!tgUser) {
    // Якщо не можемо отримати користувача з повідомлення
    await ctx.reply('⚠️ Немає даних про користувача.');
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tg_users (tg_id, first_name, username, language_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tg_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         username = EXCLUDED.username,
         language_code = EXCLUDED.language_code
       RETURNING *`,
      [tgUser.id, tgUser.first_name, tgUser.username, tgUser.language_code]
    );

    const user = rows[0];
    console.log('User inserted or updated:', user);

    await ctx.reply(`Привіт, ${user.first_name}!`);
  } catch (err) {
    console.error('DB error on start:', err);
    await ctx.reply('⚠️ Помилка при роботі з базою даних.');
  }
};
