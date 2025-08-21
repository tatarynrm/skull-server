import { Scenes } from "telegraf";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import {
  getBonusKeyboard,
  getBonusKeyboardGoBack,
  getBonusKeyboardGoBackWithoutAnything,
  getBonusKeyboardGoBackWithoutDaily,
  getBonusKeyboardGoBackWithoutMonthly,
} from "../keyboards/bonus.keyboard";
import { getMainKeyboard } from "../keyboards";
import { tgLotteryService } from "../services/lottery.service";

const bonusScene = new Scenes.BaseScene<MyContext>("bonus-add-scene");

bonusScene.enter(async (ctx) => {
const { dayLottery, monthLottery } =
  await tgLotteryService.checkParticapation(ctx);

if (dayLottery && monthLottery) {
  await ctx.reply(t(ctx.lang, "get_bonus_welcome"), {
    reply_markup: getBonusKeyboard(ctx),
  });
  await ctx.reply(t(ctx.lang, "choose_bonus"), {
    reply_markup: getBonusKeyboardGoBackWithoutAnything(ctx),
  });
  await ctx.reply("Ти вже взяв участь в усіх лотереях. Очікуй результатів");
  return;
}

if (dayLottery) {
  await ctx.reply(t(ctx.lang, "get_bonus_welcome"), {
    reply_markup: getBonusKeyboard(ctx),
  });
  await ctx.reply(t(ctx.lang, "choose_bonus"), {
    reply_markup: getBonusKeyboardGoBackWithoutDaily(ctx),
  });
  return;
}

if (monthLottery) {
  await ctx.reply(t(ctx.lang, "get_bonus_welcome"), {
    reply_markup: getBonusKeyboard(ctx),
  });
  await ctx.reply(t(ctx.lang, "choose_bonus"), {
    reply_markup: getBonusKeyboardGoBackWithoutMonthly(ctx),
  });
  return;
}

// якщо нічого не взято
await ctx.reply(t(ctx.lang, "get_bonus_welcome"), {
  reply_markup: getBonusKeyboard(ctx),
});
await ctx.reply(t(ctx.lang, "choose_bonus"), {
  reply_markup: getBonusKeyboardGoBack(ctx),
});
});

bonusScene.on("callback_query", async (ctx) => {
  if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
    switch (ctx.callbackQuery.data) {
      case "premium_for_ref":
        await ctx.answerCbQuery(); // закриваємо спіннер на кнопці
        await ctx.reply(
          t(ctx.lang, "premium_for_ref_text", {
            referal_link: `${process.env.BOT_MAIN_URL_WITH_REF_PREFIX!}${ctx.from.id}`,
          })
        );
        break;

      case "premium_for_video":
        await ctx.answerCbQuery();
        await ctx.reply(t(ctx.lang, "premium_for_video_text"));
        break;

      case "premium_for_daily_lottery":
        await ctx.answerCbQuery();
        await ctx.reply(t(ctx.lang, "premium_for_daily_lottery_text"));
        break;

      case "premium_for_month":
        await ctx.answerCbQuery();
        await ctx.reply(t(ctx.lang, "premium_for_month_text"));
        break;

      case "premium_for_month":
        await ctx.answerCbQuery();
        await ctx.reply(t(ctx.lang, "premium_for_month_text"));
        break;

      default:
        await ctx.answerCbQuery("Unknown action");
        break;
    }
  }
});
bonusScene.on("text", async (ctx) => {
  if (ctx.message && "text" in ctx.message) {
    switch (ctx.message.text) {
      case t(ctx.lang, "daily_lotery_start"):
        const resDaily = await tgLotteryService.registerDailyLottery(ctx);

        await ctx.reply(t(ctx.lang, resDaily));
        break;
      case t(ctx.lang, "montly_lotery_start"):
        const resMonthly = await tgLotteryService.registerMonthlyLottery(ctx);

        await ctx.reply(t(ctx.lang, resMonthly));
        break;
      case t(ctx.lang, "back_to_menu"):
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        await ctx.scene.leave(); // Виходимо зі сцени
        break;
      case "/profile":
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getMainKeyboard(ctx),
        });
        await ctx.scene.leave(); // Виходимо зі сцени

        break;

      default:
        await ctx.reply("unknown_action");
        break;
    }
  }
});
bonusScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (
      text.startsWith("/profile") ||
      text.includes(t(ctx.lang, "back_to_menu"))
    ) {
      await ctx.reply(t(ctx.lang, "main_menu"), {
        reply_markup: getMainKeyboard(ctx),
      });
      await ctx.scene.leave(); // Виходимо зі сцени
      return;
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});
export default bonusScene;
