import { Scenes } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard, getMainKeyboardWhenIsHidden } from "../keyboards";
import { BotScenes } from "./types";
import { getHideMyProfileFromSearch } from "../keyboards/hide-profile.keyboard";
import { sendProgressMessage } from "../helpers/progress-indicator";
import { redis } from "../../utils/redis";
import { tgProfileService } from "../services/profile.service";

// Сцена для звернення до адміністратора
const hideProfileScene = new Scenes.WizardScene<MyContext>(
  BotScenes.HIDE_PROFILE,

  // Крок 1: Користувач може звернутися до адміністратора
  async (ctx) => {
    await ctx.reply(t(ctx.lang, "hide_my_profile_text"), {
      reply_markup: getHideMyProfileFromSearch(ctx),
    });
    return ctx.wizard.next();
  },

  // Крок 2: Користувач вводить текст запиту для адміністратора
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;
    if (ctx.message.text !== t(ctx.lang, "hide_my_profile_from_search")) {
      await ctx.reply(t(ctx.lang, "unknown_answer"));
      return;
    }

    // Зберігаємо запит в базі даних
    await pool.query(
      `UPDATE tg_user_profile SET is_hidden = true WHERE user_id = $1`,
      [ctx.message.from.id]
    );
    await sendProgressMessage(
      ctx,
      "system_indicator_start_deactivate_profile",
      "system_indicator_end_deactivate_profile"
    );
    const cacheKey = `profile:${ctx.message?.from.id!}`;

    // // 1️⃣ Перевіряємо Redis
    const cached = await redis.del(cacheKey);
    // Підтвердження, що запит надіслано
    await ctx.reply(t(ctx.lang, "main_menu"), {
      reply_markup: getMainKeyboardWhenIsHidden(ctx),
    });

    // Повертаємо користувача до головного меню
    await ctx.scene.leave();
  }
);

hideProfileScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (
      text.startsWith("/profile") ||
      text.includes(t(ctx.lang, "back_to_menu"))
    ) {
      const cacheKey = `profile:${ctx.message?.from.id!}`;

      // // 1️⃣ Перевіряємо Redis
      const cached = await redis.del(cacheKey);
      const profile = await tgProfileService.getProfileByUserId(
        ctx.message.from.id
      );

      if (profile.is_hidden) {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboardWhenIsHidden(ctx),
        });

        return;
      } else {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        await ctx.scene.leave(); // Виходимо зі сцени
        return;
      }
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});

export default hideProfileScene;
