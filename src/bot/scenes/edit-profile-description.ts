import { Scenes } from "telegraf";
import { MyContext } from "../types/bot-context";
import { BotScenes } from "./types";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { tgProfileService } from "../services/profile.service";
import { redis } from "../../utils/redis";

const setEditProfileDescription = new Scenes.WizardScene<MyContext>(
  BotScenes.EDIT_PROFILE_DESCRIPTION,

  // Крок 1: попросити юзера ввести новий опис
  async (ctx) => {
    const oldDescription = await tgProfileService.getProfileByUserId(
      ctx.message?.from.id!
    );

    await ctx.reply("✍️ Введіть новий опис для своєї анкети:", {
      reply_markup: {
        keyboard: [[{ text: t(ctx.lang, "back_to_menu") }]],
        resize_keyboard: true,
      },
    });

    await ctx.reply(`\`\`\`\n${oldDescription.description}\n\`\`\``, {
      parse_mode: "MarkdownV2",
    });
    return ctx.wizard.next();
  },

  // Крок 2: обробка введеного опису
  async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text.trim();

      // Якщо користувач натиснув "Назад у меню"
      if (text === t(ctx.lang, "back_to_menu")) {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        return ctx.scene.leave();
      }

      // Перевірка довжини опису
      if (text.length < 10) {
        await ctx.reply("Опис занадто короткий! Мінімум 10 символів.");
        return;
      }
      if (text.length > 500) {
        await ctx.reply("Опис занадто довгий! Максимум 500 символів.");
        return;
      }

      // Оновлюємо опис у БД
      const updated = await tgProfileService.updateDescription(userId, text);

      if (updated) {
        // Чистимо кеш у Redis
        const cacheKey = `profile:${userId}`;
        await redis.del(cacheKey);

        await ctx.reply("✅ Ваш опис анкети оновлено!", {
          reply_markup: getMainKeyboard(ctx),
        });
      } else {
        await ctx.reply("⚠️ Сталася помилка при збереженні опису.");
      }

      return ctx.scene.leave();
    }
  }
);

// Middleware: вихід зі сцени при команді
setEditProfileDescription.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (
      text.startsWith("/profile") ||
      text.startsWith("/help") ||
      text.startsWith("/start")
    ) {
      await ctx.reply(t(ctx.lang, "main_menu"), {
        reply_markup: getMainKeyboard(ctx),
      });
      await ctx.scene.leave();
      return;
    }
  }
  return next();
});

export default setEditProfileDescription;
