import { Scenes } from "telegraf";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { tgProfileService } from "../services/profile.service";
import { BotScenes } from "./types";
import { redis } from "../../utils/redis";

const editAgeRangeScene = new Scenes.WizardScene<MyContext>(
  BotScenes.EDIT_AGE_RANGE_SCENE,

  // Крок 1: Показуємо поточний вік партнера та запитуємо мінімальний вік
  async (ctx) => {
    const profile = await tgProfileService.getProfileByUserId(ctx.from!.id);
    if (!profile) {
      await ctx.reply(t(ctx.lang,'profile_not_found'), { reply_markup: getMainKeyboard(ctx) });
      return ctx.scene.leave();
    }
console.log(profile,'profile');

    ctx.scene.session.registrationData = {
      minAge: profile.min_age,
      maxAge: profile.max_age,
    };

    await ctx.reply(
      t(ctx.lang, "current_min_age", { minAge: profile.min_age }) +
      `\n${t(ctx.lang, "enter_new_min_age")}`,
      { reply_markup: { remove_keyboard: true } }
    );

    return ctx.wizard.next();
  },

  // Крок 2: Отримуємо новий мінімальний вік
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const minAge = parseInt(ctx.message.text);
      if (isNaN(minAge)) {
        await ctx.reply(t(ctx.lang, "incorrect_min_age_expression"));
        return;
      }

      const userAge = (await tgProfileService.getProfileByUserId(ctx.from!.id))?.age;
      if (userAge && userAge >= 18 && minAge < 16) {
        await ctx.reply(
          t(ctx.lang, "age_mismatch_expression", { your_age: userAge })
        );
        return;
      }

      ctx.scene.session.registrationData.minAge = minAge;
      await ctx.reply(
        t(ctx.lang, "current_max_age", { maxAge: ctx.scene.session.registrationData.maxAge! }) +
        `\n${t(ctx.lang, "enter_new_max_age")}`,
        { reply_markup: { remove_keyboard: true } }
      );
      return ctx.wizard.next();
    }
  },

  // Крок 3: Отримуємо новий максимальний вік
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const maxAge = parseInt(ctx.message.text);
      if (isNaN(maxAge)) {
        await ctx.reply(t(ctx.lang, "incorrect_max_age_expression"));
        return;
      }

      if (ctx.scene.session.registrationData.minAge! >= maxAge) {
        await ctx.reply(
          t(ctx.lang, "age_mismatch_max_lower_min_expression", { your_age: (await tgProfileService.getProfileByUserId(ctx.from!.id))?.age })
        );
        return;
      }

      ctx.scene.session.registrationData.maxAge = maxAge;

      // Зберігаємо зміни в базу
      const updated = await tgProfileService.updateUserAgeRange(
        ctx.from!.id,
        ctx.scene.session.registrationData.minAge!,
        ctx.scene.session.registrationData.maxAge!
      );

      if (!updated) {
        await ctx.reply(t(ctx.lang,'update_age_range_error'), { reply_markup: getMainKeyboard(ctx) });
        return ctx.scene.leave();
      }

      // Чистимо кеш
      await redis.del(`profile:${ctx.from!.id}`);

      await ctx.reply(
        t(ctx.lang, "age_range_updated_success", {
          minAge: ctx.scene.session.registrationData.minAge!,
          maxAge: ctx.scene.session.registrationData.maxAge!,
        }),
        { reply_markup: getMainKeyboard(ctx) }
      );

      return ctx.scene.leave();
    }
  }
);

editAgeRangeScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (text.startsWith("/profile") || text.startsWith("/help") || text.startsWith("/start")) {
      await ctx.reply(t(ctx.lang, "main_menu"), { reply_markup: getMainKeyboard(ctx) });
      await ctx.scene.leave();
      return;
    }
  }
  return next();
});

export default editAgeRangeScene;
