import dotenv from "dotenv";
dotenv.config();
import { Scenes, Telegraf } from "telegraf";
import { MyContext } from "./types/bot-context"; // Your custom context type
import registerScene from "./scenes/register-profile.scene";

import {
  getBeforeRegisterKeyboard,
  getMainKeyboard,
  getProfileKeyboard,
  getSettingsKeyboard,
} from "./keyboards";
import { Redis } from "@telegraf/session/redis";
import { t } from "./lib/i18n";

import changeLanguageScene from "./scenes/change-language.scene";
import { BotScenes } from "./scenes/types";
import { getHelpKeyboard } from "./keyboards/help.keyboard";
import helpScene from "./scenes/help.scene";
import { getPremiumKeyboardBottom } from "./keyboards/premium.keyboard";
import { getLoteryKeyboard } from "./keyboards/lotery.keyboard";
import hideProfileScene from "./scenes/hide-profile.scene";
import activateProfileScene from "./scenes/activate-profile.scene.";
import findPartnerScene from "./scenes/find-partner.scene";
import sendMessageScene from "./scenes/send-message.scene";
import { tgProfileService } from "./services/profile.service";
import { tgUserService } from "./services/user.serivice";
import setProfileStatusScene from "./scenes/profile-status.scene";
import { startAllCronJobs } from "./cron-jobes";
import { createPaymentWithNowpaymentsIo } from "./payments/nowpayments.io";

import RedisSession from "telegraf-session-redis";
import bonusScene from "./scenes/bonus.scene";
import { LikesSchedule } from "./cron-jobes/likes.cron";
import myLikesScene from "./scenes/my-likes.scene";
import setEditProfileDescription from "./scenes/edit-profile-description";
import changePhotoScene from "./scenes/change-photo.scene";
import editAgeRangeScene from "./scenes/age-change.scene";
import { getRandomGif } from "./lib/giphy(random-gif)/giphy";


// Create the bot instance with MyContext as the generic type
const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN!);
const store = Redis({
  url: "redis://127.0.0.1:6379",
});

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || "127.0.0.1",
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
  },
});
// Initialize the session middleware with the correct type
bot.use(session);

// Initialize the scene stage
const stage = new Scenes.Stage<MyContext>([
  registerScene,
  changeLanguageScene,
  helpScene,
  hideProfileScene,
  activateProfileScene,
  findPartnerScene,
  sendMessageScene,
  setProfileStatusScene,
  bonusScene,
  myLikesScene,
  setEditProfileDescription,
  changePhotoScene,
  editAgeRangeScene
]);
bot.use(async (ctx, next) => {
  const userId = ctx.message?.from.id!;

  const user = await tgUserService.getTelegramUser(userId);

  ctx.lang = user?.lang ? user?.lang : "uk";

  return next();
});
// Use the scene middleware
bot.use(stage.middleware());
bot.start(async (ctx) => {
  const payload = ctx.payload; // "ref_5248905716"
  let referredBy: number | null = null;

  if (payload && payload.startsWith("ref_")) {
    const rawId = payload.replace("ref_", ""); // "5248905716"

    // перевірка чи це число
    if (/^\d+$/.test(rawId)) {
      referredBy = Number(rawId);
      console.log(referredBy, "REF BY");
    }
  }

  const tgId = ctx.message.from.id;
  const { lang, isNew } = await tgUserService.getOrCreateUser(
    tgId,
    ctx,
    referredBy
  );
  ctx.lang = lang;

  if (isNew) {
    await ctx.reply(t(ctx.lang, "first_time_start_welcome_text"));
    await ctx.reply(t(ctx.lang, "first_time_start_welcome_text_building"));
    return await ctx.scene.enter(BotScenes.CHANGE_LANGUAGE);
  }

  const profile = await tgProfileService.getProfileByUserId(tgId);
  if (!profile) {
    await ctx.reply(t(ctx.lang, "main_menu"), {
      reply_markup: getBeforeRegisterKeyboard(ctx),
    });
    return;
  }

  if (profile.is_hidden) {
    return await ctx.scene.enter(BotScenes.ACTIVATE_PROFILE);
  }

  await tgProfileService.sendProfilePhotos(ctx, profile);

  await ctx.reply(
    t(ctx.lang, "main_menu", {
      name: profile.name || ctx.message.from.first_name,
    }),
    { reply_markup: getMainKeyboard(ctx) }
  );
});

bot.command("profile", async (ctx) => {

  const tgId = ctx.message.from.id;
  const { lang } = await tgUserService.getOrCreateUser(tgId, ctx);
  ctx.lang = lang;

  const profile = await tgProfileService.getProfileByUserId(tgId);
  if (!profile) {
    await ctx.reply(t(ctx.lang, "main_menu"), {
      reply_markup: getBeforeRegisterKeyboard(ctx),
    });
    return;
  }

  if (profile.is_hidden) {
 
    await ctx.scene.enter(BotScenes.ACTIVATE_PROFILE);
    return;
  }

  await tgProfileService.sendProfilePhotos(ctx, profile);

  await ctx.reply(
    t(ctx.lang, "main_menu", {
      name: profile.name || ctx.message.from.first_name,
    }),
    { reply_markup: getMainKeyboard(ctx) }
  );
});
bot.command("help", async (ctx) => {
  await ctx.reply(t(ctx.lang, "help_text"), {
    reply_markup: getHelpKeyboard(ctx),
  });
});
bot.hears("/web", async (ctx) => {
  console.log(ctx.message.from.id);

  // const url = `${process.env.SERVER_URL}/${ctx.message.from.id}`;
  const url = `https://skulldate.site/${ctx.message.from.id}`;
  return ctx.reply("Відкрити додаток", {
    reply_markup: {
      inline_keyboard: [[{ text: "Веб-додаток", web_app: { url } }]],
    },
  });
});



bot.command("pay", async (ctx) => {
  const payment = await createPaymentWithNowpaymentsIo(
    2,
    "USD",
    ctx.message.from.id
  );
  if (!payment) return ctx.reply("Помилка створення платежу.");
  console.log(payment, "PAMENT");

  await ctx.replyWithHTML(
    `💰 Оплатіть преміум:<a href="${payment.invoice_url}">Оплатити</a>`,
    { parse_mode: "HTML" }
  );
});
bot.on("text", async (ctx) => {
  if (!("text" in ctx.message)) return; // перевіряємо, що це текстове повідомлення
  const text = ctx.message.text;
  console.log(text, "TEXT");
  if (text === t(ctx.lang, "settings")) {
    await ctx.reply(t(ctx.lang, "settings_menu"), {
      reply_markup: getSettingsKeyboard(ctx),
    });
  }
  if (text === t(ctx.lang, "bonus")) {
    await ctx.scene.enter(BotScenes.BONUS_SCENE);
  }
  if (text === t(ctx.lang, "my_likes")) {
    await ctx.scene.enter(BotScenes.MY_LIKES_SCENE);
  }
  if (text === t(ctx.lang, "create_profile")) {
    await ctx.scene.enter(BotScenes.REGISTER_SCENE);
  }
  if (text === t(ctx.lang, "keyboard_edit_profile_age")) {
    await ctx.scene.enter(BotScenes.EDIT_AGE_RANGE_SCENE);
  }
  if (text === t(ctx.lang, "keyboard_edit_profile_description")) {
    await ctx.scene.enter(BotScenes.EDIT_PROFILE_DESCRIPTION);
  }
  if (text === t(ctx.lang, "keyboard_edit_profile_picture")) {
    await ctx.scene.enter(BotScenes.CHANGE_PHOTO_SCENE);
  }

  if (text === t(ctx.lang, "set_profile_status")) {
    await ctx.scene.enter(BotScenes.PROFILE_STATUS_SAVE);
  }
  if (text === t(ctx.lang, "reedit_profile")) {
    await ctx.scene.enter(BotScenes.REGISTER_SCENE);
  }
  if (text === t(ctx.lang, "find_partner")) {
    await ctx.scene.enter(BotScenes.FIND_PARTNER);
  }
  if (text === t(ctx.lang, "edit_profile")) {
    await ctx.scene.enter(BotScenes.REGISTER_SCENE);
  }

  if (text === t(ctx.lang, "profile")) {
    await ctx.reply(t(ctx.lang, "profile"), {
      reply_markup: getProfileKeyboard(ctx),
    });
  }
  if (text === t(ctx.lang, "hide_my_profile")) {
    await ctx.scene.enter(BotScenes.HIDE_PROFILE);
  }

  if (text === t(ctx.lang, "next_steps")) {
    await ctx.reply(t(ctx.lang, "next_steps"), {
      reply_markup: getBeforeRegisterKeyboard(ctx),
    });
  }
  if (text === t(ctx.lang, "back_to_menu")) {
    await ctx.reply(t(ctx.lang, "main_menu"), {
      reply_markup: getMainKeyboard(ctx),
    });
  }

  if (text === t(ctx.lang, "change_language")) {
    await ctx.scene.enter(BotScenes.CHANGE_LANGUAGE);
  }
  if (text === t(ctx.lang, "help_contact")) {
    await ctx.scene.enter(BotScenes.HELP_SCENE);
  }
  if (text === t(ctx.lang, "our_rules")) {
    await ctx.reply(t(ctx.lang, "our_rules_text"), {
      parse_mode: "MarkdownV2",
    });
  }
  if (text === t(ctx.lang, "premium")) {
    await ctx.reply(t(ctx.lang, "premium_description_text"));
    await ctx.reply(t(ctx.lang, t(ctx.lang, "tarif_plans")), {
      reply_markup: getPremiumKeyboardBottom(ctx),
    });
  }
  if (text === t(ctx.lang, "turn_on_profile")) {
    await ctx.scene.enter(BotScenes.ACTIVATE_PROFILE);
  }
});

// bot.telegram.sendMessage()
// Робочий варіант, просто закоментував!
// bot.on("callback_query", async (ctx) => {
//   // Якщо є data в callback_query, продовжуємо обробку
//   if (ctx.update.callback_query && "data" in ctx.update.callback_query) {
//     const data = ctx.update.callback_query.data;
//     const chatId = ctx.update.callback_query.message?.chat.id;
//     const messageId = ctx.update.callback_query.message?.message_id;

//     // Переконаємось, що у нас є chatId та messageId
//     if (!chatId || !messageId) return;

//     switch (data) {
//       case "subscribe_premium":
//         await ctx.answerCbQuery("Ви підписалися на Premium!");
//         await ctx.telegram.editMessageText(chatId, messageId , undefined,
//           "Дякуємо за підписку на Premium!", { parse_mode: "HTML" });
//         break;

//       case "my_benefits":
//         await ctx.answerCbQuery("Переглядаєте ваші переваги...");
//         await ctx.telegram.editMessageText(chatId, messageId, undefined,
//           "Ось ваші переваги Premium користувача: ...", { parse_mode: "HTML" });
//         break;

//       case "premium_payment":
//         await ctx.answerCbQuery("Інформація по оплаті...");
//         await ctx.telegram.editMessageText(chatId, messageId, undefined,
//           "Ось інформація про платіж для Premium: ...", { parse_mode: "HTML" });
//         break;

//       case "premium_help":
//         await ctx.answerCbQuery("Допомога по Premium...");
//         await ctx.telegram.editMessageText(chatId, messageId, undefined,
//           "Ось як працює Premium: ...", { parse_mode: "HTML" });
//         break;

//       case "hide_my_profile":
//         await ctx.telegram.editMessageText(chatId, messageId, undefined,
//           "Профіль приховано ✅", { parse_mode: "HTML" });
//         break;

//       default:
//         await ctx.answerCbQuery("Це невідома кнопка.");
//         break;
//     }
//   }
// });

// Use the scene middleware

// const message = `<b>Привіт, користувачу!</b>\nЦе <i>тестове повідомлення</i> з <a href="https://example.com">посиланням</a>.`;
// sendToAllUsers(message);
// startAllCronJobs();

LikesSchedule()
export default bot;
