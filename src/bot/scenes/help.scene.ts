import { Scenes } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getBeforeRegisterKeyboard, getMainKeyboard } from "../keyboards";
import { BotScenes } from "./types";
import { profileService } from "../../services/profile.service";
import { tgProfileService } from "../services/profile.service";

// Сцена для звернення до адміністратора
const helpScene = new Scenes.WizardScene<MyContext>(
  BotScenes.HELP_SCENE,

  // Крок 1: Користувач може звернутися до адміністратора
  async (ctx) => {
    await ctx.reply(t(ctx.lang, "write_to_admin_prompt"), {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    return ctx.wizard.next();
  },

  // Крок 2: Користувач вводить текст запиту для адміністратора
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;

    const userQuery = ctx.message.text;

    // Зберігаємо запит в базі даних
    await pool.query(
      `INSERT INTO tg_user_help (tg_id, user_text) VALUES ($1, $2)`,
      [ctx.message.from.id, userQuery]
    );

    // Підтвердження, що запит надіслано
    await ctx.reply(t(ctx.lang, "query_sent_to_admin"), {
      reply_markup: getMainKeyboard(ctx),
    });

    // Повертаємо користувача до головного меню
    await ctx.scene.leave();
  }
);
helpScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;

    const profile = await tgProfileService.getProfileByUserId(
      ctx.message.from.id
    );

    if (
      text.startsWith("/profile") ||
      text.startsWith("/help") ||
      text.includes(t(ctx.lang, "back_to_menu"))
    ) {
      if (profile.user_id) {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        return await ctx.scene.leave(); // виходимо зі сцени
        // не виконуємо подальші кроки сцени
      } else {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getBeforeRegisterKeyboard(ctx),
        });
        return await ctx.scene.leave(); // виходимо зі сцени
      }
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});
export default helpScene;
