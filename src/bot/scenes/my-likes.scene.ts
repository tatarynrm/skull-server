import { Scenes, Markup } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getBeforeRegisterKeyboard, getMainKeyboard } from "../keyboards";
import { BotScenes } from "./types";
import { tgProfileService } from "../services/profile.service";
import bot from "../bot";
import { tgUserService } from "../services/user.serivice";

// Відправка картки користувача
async function sendProfileCard(ctx: MyContext, profile: any) {
  const validPhotos = profile.photos?.filter((p: any) => p.url?.trim()) || [];

  if (!validPhotos.length) {
    await ctx.reply(
      `👤 ${profile.name || ctx.from?.first_name} (${profile.age || "Age"})\n📍 ${profile.city || "Не вказано"}\n📝 ${profile.description || "Без опису"}\n__________________\nLooking age: ${profile.min_age} - ${profile.max_age}\nLooking for: ${profile.looking_for === 1 ? "👦" : profile.looking_for === 2 ? "👧" : profile.looking_for === 3 ? "👦👧" : "❓"}\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`,
      Markup.keyboard([["❤️ Лайк", "❌ Дизлайк"]]).resize()
    );
    return;
  }

  const mediaGroup = validPhotos.map((photo: any, index: number) => ({
    type: "photo",
    media: photo.url,
    caption: index === 0
      ? `👤 ${profile.name || ctx.from?.first_name} (${profile.age || "Age"})\n📍 ${profile.city || "Не вказано"}\n📝 ${profile.description || "Без опису"}\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`
      : undefined,
  }));

  await ctx.replyWithMediaGroup(mediaGroup);
}

const myLikesScene = new Scenes.WizardScene<MyContext>(
  BotScenes.MY_LIKES_SCENE,

  // Крок 1: Завантаження непереглянутих лайків
  async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return ctx.scene.leave();

    const { rows: likes } = await pool.query(
      `SELECT 
        p.user_id, p.name, p.age, p.city, p.description, p.looking_for, p.min_age, p.max_age, p.status,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('url', pp.url)) FILTER (WHERE pp.url IS NOT NULL), '[]'::jsonb) AS photos
      FROM tg_user_likes l
      JOIN tg_user_profile p ON p.user_id = l.from_user_id
      LEFT JOIN tg_profile_photos pp ON p.user_id = pp.user_id
      WHERE l.to_user_id=$1 AND l.status='like' AND l.is_seen=false
      GROUP BY p.user_id, p.name, p.age, p.city, p.description, p.looking_for, p.min_age, p.max_age, p.status`,
      [tgId]
    );

    if (!likes.length) {
      await ctx.reply(t(ctx.lang, "no_new_likes"), {
        reply_markup: getMainKeyboard(ctx),
      });
      return ctx.scene.leave();
    }

    ctx.scene.session.likesQueue = likes;
    ctx.scene.session.currentIndex = 0;

    await ctx.reply(
      "Ваші нові лайки:",
      Markup.keyboard([["❤️ Лайк", "❌ Дизлайк"]]).resize()
    );
    await sendProfileCard(ctx, likes[0]);
    return ctx.wizard.next();
  },

  // Крок 2: Обробка лайків / дизлайків
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) return;

    const text = ctx.message.text;
    const queue = ctx.scene.session.likesQueue || [];
    const index = ctx.scene.session.currentIndex || 0;
    const currentProfile = queue[index];
    const userId = ctx.from?.id;
    if (!currentProfile || !userId) return ctx.scene.leave();
    const likedUserId = currentProfile.user_id;

    if (text === "❤️ Лайк") {
      // Вставка або оновлення лайку користувача
      await pool.query(
        `INSERT INTO tg_user_likes (from_user_id, to_user_id, status, is_seen, mutual_notified)
         VALUES ($1, $2, 'like', true, false)
         ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET status='like', is_seen=true`,
        [userId, likedUserId]
      );

      // Перевірка взаємного лайку, який ще не був notified
      const { rows: mutual } = await pool.query(
        `SELECT * FROM tg_user_likes
         WHERE from_user_id=$1 AND to_user_id=$2 AND status='like' AND mutual_notified=false`,
        [likedUserId, userId]
      );

      if (mutual.length) {
        // Позначаємо, що повідомлення про взаємний лайк вже надіслане
        await pool.query(
          `UPDATE tg_user_likes SET mutual_notified=true WHERE from_user_id=$1 AND to_user_id=$2`,
          [likedUserId, userId]
        );

        // Відправка повідомлень обом
        const randomTexts = [
          "Привіт! 😍 Як твій день?",
          "Хай! 👋 Давай познайомимось!",
          "Салют! 😉 Готовий до цікавого чату?",
          "Ей! 😎 Радію, що ми лайкнули один одного!",
          "💌 Нарешті зустрілися в SkullDate!",
        ];
        const randomMessage = randomTexts[Math.floor(Math.random() * randomTexts.length)] + "\n\n— я з SkullDateBot";

        const liker = await tgUserService.getTelegramUser(userId);
        const liked = await tgUserService.getTelegramUser(likedUserId);

        const sendMsg = async (toId: number, username?: string) => {
          if (!username) return bot.telegram.sendMessage(toId, randomMessage);
          await bot.telegram.sendMessage(toId, randomMessage, {
            reply_markup: {
              inline_keyboard: [[{ text: "💬 Написати", url: `https://t.me/${username}` }]],
            },
          });
        };

        await sendMsg(userId, liked?.username);
        await sendMsg(likedUserId, liker?.username);
      }

    } else if (text === "❌ Дизлайк") {
      await pool.query(
        `INSERT INTO tg_user_likes (from_user_id, to_user_id, status, is_seen, mutual_notified)
         VALUES ($1, $2, 'dislike', true, true)
         ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET status='dislike', is_seen=true, mutual_notified=true`,
        [userId, likedUserId]
      );
    }

    // Наступний профіль
    ctx.scene.session.currentIndex++;
    const nextProfile = queue[ctx.scene.session.currentIndex];
    if (nextProfile) {
      await sendProfileCard(ctx, nextProfile);
    } else {
      await ctx.reply(t(ctx.lang, "all_likes_processed"), {
        reply_markup: getMainKeyboard(ctx),
      });
      return ctx.scene.leave();
    }
  }
);

// Обробка /profile, /help, "back to menu"
myLikesScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    const profile = await tgProfileService.getProfileByUserId(ctx.message.from.id);

    if (
      text.startsWith("/profile") ||
      text.startsWith("/help") ||
      text.includes(t(ctx.lang, "back_to_menu"))
    ) {
      if (profile.user_id) {
        await ctx.reply(t(ctx.lang, "main_menu"), { reply_markup: getMainKeyboard(ctx) });
      } else {
        await ctx.reply(t(ctx.lang, "main_menu"), { reply_markup: getBeforeRegisterKeyboard(ctx) });
      }
      return ctx.scene.leave();
    }
  }
  return next();
});

export default myLikesScene;
