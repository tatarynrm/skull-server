import { Scenes } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { BotScenes } from "./types";
import { FindPartnerState } from "./find-partner.scene";

const sendMessageScene = new Scenes.WizardScene<MyContext>(
  BotScenes.SEND_MESSAGE,
  async (ctx) => {
    await ctx.reply("Введіть текст повідомлення:");
    ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.wizard.state as FindPartnerState & {
      messageTarget?: number;
    };
    const targetUserId = state.messageTarget;

    if (!targetUserId) {
      await ctx.reply("Не вдалося визначити користувача для повідомлення.");
      return ctx.scene.leave();
    }
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Будь ласка, введіть текст повідомлення.");
      return;
    }

    const text = ctx.message.text;

    // TODO: Зберегти або надіслати повідомлення
    await pool.query(
      `INSERT INTO tg_user_messages (from_user_id, to_user_id, text)
       VALUES ($1, $2, $3)`,
      [ctx.message.from.id, targetUserId, text]
    );

    await ctx.reply("✅ Повідомлення надіслано!");
    return ctx.scene.leave(); // Повертаємось до основної сцени
  }
);
export default sendMessageScene;
