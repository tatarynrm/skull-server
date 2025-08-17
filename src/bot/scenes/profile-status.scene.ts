import { Scenes } from "telegraf";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { BotScenes } from "./types";
import { profileService } from "../../services/profile.service";
import { tgProfileService } from "../services/profile.service";
import { redis } from "../../utils/redis";

// Готові статуси
const STATUSES = [
  "👅 Horny",
  "😃 Happy",
  "😢 Sad",
  "🥱 Bored",
  "🤔 Thoughtful",
  "🔥 In the mood",
  "Delete status from profile",
];
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
const setProfileStatusScene = new Scenes.WizardScene<MyContext>(
  BotScenes.PROFILE_STATUS_SAVE,

  // Крок 1: показати користувачу список статусів
  async (ctx) => {
    await ctx.reply("Оберіть свій статус:", {
      reply_markup: {
        keyboard: [
          ...chunk(
            STATUSES.map((s) => ({ text: s })),
            2
          ), // по 2 в ряд
          [{ text: t(ctx.lang, "back_to_menu") }],
        ],
        resize_keyboard: true,
      },
    });
    ctx.wizard.next();
  },

  // Крок 2: обробка вибору користувача
  async (ctx) => {
    const userId = ctx.message?.from.id;
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;

      console.log(text, "TESTTTTTTTTTTTTTT");

      // Якщо користувач натиснув "Назад у меню"
      if (text === t(ctx.lang, "back_to_menu")) {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        return ctx.scene.leave();
      }

      // Якщо користувач вибрав статус зі списку
      if (STATUSES.includes(text) && text !== "Delete status from profile") {
        // зберегти статус у БД
        const updated = await tgProfileService.updateStatus(
          ctx.message.from.id,
          text
        );

        if (updated) {
          await ctx.reply(`✅ Ваш статус оновлено на: ${text}`, {
            reply_markup: getMainKeyboard(ctx),
          });
          const cacheKey = `profile:${userId}`;

          // // 1️⃣ Перевіряємо Redis
          const cached = await redis.del(cacheKey);

          ctx.scene.leave();
        } else {
          await ctx.reply(t(ctx.lang, "system_something_went_wrong"));
          ctx.scene.leave();
        }

        return ctx.scene.leave();
      } else if (text === "Delete status from profile") {
        const updated = await tgProfileService.updateStatus(
          ctx.message.from.id,
          ""
        );
        if (updated) {
          await ctx.reply(`⛔ Ви вимкнули статус`, {
            reply_markup: getMainKeyboard(ctx),
          });
          const cacheKey = `profile:${userId}`;

          // // 1️⃣ Перевіряємо Redis
          const cached = await redis.del(cacheKey);
          ctx.scene.leave();
        }
      } else {
        // якщо введено щось інше
        await ctx.reply("Будь ласка, оберіть статус з клавіатури!");
      }
    }
  }
);

export default setProfileStatusScene;
