import { Scenes } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard, getMainKeyboardWhenIsHidden } from "../keyboards";
import { BotScenes } from "./types";
import { sendProgressMessage } from "../helpers/progress-indicator";
import { profileService } from "../../services/profile.service";

// Сцена для активації профілю
const activateProfileScene = new Scenes.WizardScene<MyContext>(
  BotScenes.ACTIVATE_PROFILE, // Ваш унікальний ідентифікатор сцени

  // Крок 1: Початкова відповідь та індикатор завантаження
  async (ctx) => {
    await ctx.reply(
      t(ctx.lang, "profile_is_disabled"),
      {
        reply_markup: getMainKeyboardWhenIsHidden(ctx),
      }
    );

    if (ctx.message && "text" in ctx.message) {
      if (ctx.message.text === t(ctx.lang, "turn_on_profile")) {
        const msg = await ctx.reply("...", {
          reply_markup: {
            remove_keyboard: true, // Вимикаємо клавіатуру
          },
        });

        ctx.deleteMessage(msg.message_id);
        // Відправляємо повідомлення про прогрес активації
        await sendProgressMessage(
          ctx,
          "system_indicator_start_activate_profile",
          "system_indicator_end_activate_profile"
        );
        // Зберігаємо в базі даних, активуємо профіль
        const activate = await profileService.activateProfile(
          ctx.message?.from.id!
        );
        // Повідомляємо про результат
        if (activate) {
          await ctx.reply(t(ctx.lang, "profile_is_active"), {
            reply_markup: getMainKeyboard(ctx),
          });
        } else {
          await ctx.reply(t(ctx.lang, "system_something_went_wrong"));
        }
        // Повертаємося до головного меню
        await ctx.scene.leave(); // Після завершення ви залишаєте сцену
      }
    }
  }
);

activateProfileScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (
      // text.startsWith("/profile") ||
      text.includes(t(ctx.lang, "back_to_menu"))
    ) {
      await ctx.reply(t(ctx.lang, "main_menu"), {
        reply_markup: getMainKeyboard(ctx),
      });
      await ctx.scene.leave(); // Виходимо зі сцени
      return; // Не виконуємо подальші кроки сцени
    }
  }
  return next(); // Продовжуємо звичайну обробку сцени
});

export default activateProfileScene;
