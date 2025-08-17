import { Scenes, Markup } from "telegraf";
import { pool } from "../../db/pool";
import { Lang, MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getBeforeRegisterKeyboard, getMainKeyboard } from "../keyboards";
import { getLanguageKeyboard } from "../helpers/language";
import { profileService } from "../../services/profile.service";
import { BotScenes } from "./types";
import { tgProfileService } from "../services/profile.service";

// Сцена зміни мови
const changeLanguageScene = new Scenes.WizardScene<MyContext>(
  BotScenes.CHANGE_LANGUAGE,
  // Крок 1: показуємо користувачу вибір мов
  async (ctx) => {
    await ctx.reply(
      t(ctx.lang, "change_language_from_keyboard"),
      getLanguageKeyboard()
    );
    return ctx.wizard.next();
  },
  // Крок 2: обробляємо вибір мови
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;

    const text = ctx.message.text;

    // Вихід зі сцени при /start або /help
    if (text.startsWith("/start") || text.startsWith("/help")) {
      await ctx.reply("Оберіть наступні дії", {
        reply_markup: getBeforeRegisterKeyboard(ctx),
      });
      await ctx.scene.leave();
      return;
    }

    // Встановлюємо мову
    let lang: Lang | null = null;
    if (text.includes("Українська 🇺🇦")) lang = "uk";
    if (text.includes("Polski 🇵🇱")) lang = "pl";
    if (text.includes("Deutsch 🇩🇪")) lang = "de";
    if (text.includes("English 🇬🇧")) lang = "en";
    if (text.includes("Español 🇪🇸")) lang = "es";
    if (text.includes("Français 🇫🇷")) lang = "fr";
    if (text.includes("Italiano 🇮🇹")) lang = "it";

    if (!lang) {
      await ctx.reply(t(ctx.lang, "change_language_from_keyboard"));
      return;
    }

    // Зберігаємо мову в БД
    await pool.query(`UPDATE tg_user SET lang = $1 WHERE tg_id = $2`, [
      lang,
      ctx.message.from.id,
    ]);

    // Оновлюємо контекст
    ctx.lang = lang;

    // Повідомляємо користувача і показуємо головне меню

    const profile = await tgProfileService.getProfileByUserId(
      ctx.message.from.id
    );

    if (!profile) {
      await ctx.reply(
        t(ctx.lang, "language_updated", { lng: ctx.lang.toUpperCase() }),
        {
          reply_markup: getBeforeRegisterKeyboard(ctx),
        }
      );
    } else {
      await ctx.reply(
        t(ctx.lang, "language_updated", { lng: ctx.lang.toUpperCase() }),
        {
          reply_markup: getMainKeyboard(ctx),
        }
      );
    }

    await ctx.scene.leave();
  }
);
changeLanguageScene.use(async (ctx: MyContext, next) => {
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
      if (profile) {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        await ctx.scene.leave(); // виходимо зі сцени
        return; // не виконуємо подальші кроки сцени
      } else {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getBeforeRegisterKeyboard(ctx),
        });
        await ctx.scene.leave(); // виходимо зі сцени
      }
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});
export default changeLanguageScene;
