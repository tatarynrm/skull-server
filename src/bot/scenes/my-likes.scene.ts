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
    caption:
      index === 0
        ? `👤 ${profile.name || ctx.from?.first_name} (${profile.age || "Age"})\n📍 ${profile.city || "Не вказано"}\n📝 ${profile.description || "Без опису"}\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`
        : undefined,
  }));

  await ctx.replyWithMediaGroup(mediaGroup);
}

export async function sendProfileCardToAnotherUser(
  chatId: number,
  profile: any
) {
  const validPhotos = profile.photos?.filter((p: any) => p.url?.trim()) || [];

  // якщо немає фото → простий текст
  if (!validPhotos.length) {
    await bot.telegram.sendMessage(
      chatId,
      `👤 ${profile.name || "Без імені"} (${profile.age || "Age"})\n📍 ${
        profile.city || "Не вказано"
      }\n📝 ${profile.description || "Без опису"}\n__________________\nLooking age: ${
        profile.min_age
      } - ${profile.max_age}\nLooking for: ${
        profile.looking_for === 1
          ? "👦"
          : profile.looking_for === 2
            ? "👧"
            : profile.looking_for === 3
              ? "👦👧"
              : "❓"
      }\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`,
      Markup.keyboard([["❤️ Лайк", "❌ Дизлайк"]]).resize()
    );
    return;
  }

  // якщо є фото → відправляємо медіа-групу
  const mediaGroup = validPhotos.map((photo: any, index: number) => ({
    type: "photo" as const,
    media: photo.url,
    caption:
      index === 0
        ? `👤 ${profile.name || "Без імені"} (${profile.age || "Age"})\n📍 ${
            profile.city || "Не вказано"
          }\n📝 ${profile.description || "Без опису"}\n${
            profile.status ? `Status: ${profile.status}` : "⛔Status is not set"
          }`
        : undefined,
  }));

  await bot.telegram.sendMediaGroup(chatId, mediaGroup);
}
const myLikesScene = new Scenes.WizardScene<MyContext>(
  BotScenes.MY_LIKES_SCENE,

  // Крок 1: Завантаження непереглянутих лайків
  async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return ctx.scene.leave();

    const { rows: likes } = await pool.query(
      `SELECT 
    l.from_user_id,
    l.to_user_id,
    l.is_mutual,
    p.name,
    p.age,
    p.city,
    p.description,
    p.looking_for,
    p.min_age,
    p.max_age,
    p.status,
    e.username,
    COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object('url', pp.url)) 
        FILTER (WHERE pp.url IS NOT NULL), '[]'::jsonb
    ) AS photos
FROM tg_profile_likes l
JOIN tg_user_profile p 
    ON p.user_id = l.from_user_id
LEFT JOIN tg_profile_photos pp 
    ON p.user_id = pp.user_id
LEFT JOIN tg_user e 
    ON p.user_id = e.tg_id
WHERE l.to_user_id = $1
  AND l.is_mutual = false
GROUP BY 
    l.from_user_id, l.to_user_id, l.is_mutual,
    p.name, p.age, p.city, p.description, 
    p.looking_for, p.min_age, p.max_age, p.status,
    e.username;
`,
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

    const likedUserId = currentProfile.from_user_id;
    if (text === "❤️ Лайк") {
      const { rows } = await pool.query(
        `UPDATE tg_profile_likes 
     SET is_mutual = true 
     WHERE from_user_id = $1 AND to_user_id = $2 
     RETURNING *`,
        [likedUserId, userId]
      );

      if (rows[0]) {
        const mutual = rows[0]; // { from_user_id, to_user_id, is_mutual: true }

        // беремо анкету того, хто щойно лайкнув (to_user_id = current user)
        const { rows: fromProfileRows } = await pool.query(
          `SELECT 
      p.*, 
      u.username,
      COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object('url', pp.url)) 
        FILTER (WHERE pp.url IS NOT NULL), '[]'::jsonb
      ) AS photos
   FROM tg_user_profile p
   LEFT JOIN tg_profile_photos pp 
      ON p.user_id = pp.user_id
   LEFT JOIN tg_user u
      ON p.user_id = u.tg_id
   WHERE p.user_id = $1
   GROUP BY p.user_id, u.username`,
          [mutual.to_user_id]
        );
        const profile = fromProfileRows[0];

        // ------------------------
        // Для того, хто лайкнув першим (from_user_id)
        // ------------------------
        // await bot.telegram.sendMessage(
        //   mutual.from_user_id,
        //   "💌 У вас взаємний лайк з користувачем! Ось його анкета:"
        // );

        // чекаємо доки картка відправиться
        await sendProfileCardToAnotherUser(mutual.from_user_id, profile);

        // і тільки після цього додаємо кнопку для початку чату
        await bot.telegram.sendMessage(
          mutual.from_user_id,
          `💌 У вас взаємний лайк  ${ctx.from.username || ""}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "💬 Почати чат",
                    url: `https://t.me/${ctx.from?.username}`,
                  },
                ],
              ],
            },
          }
        );

        // ------------------------
        // Для того, хто щойно поставив лайк (to_user_id)
        // ------------------------

        const oponentUserid = await pool.query(
          `select p.username,c.name
          
          from tg_user p  
          left join tg_user_profile c on p.tg_id = c.user_id    
          
          
          where p.tg_id = $1`,
          [mutual.from_user_id]
        );

        if (oponentUserid.rows[0]) {
          const username = await oponentUserid.rows[0].username;
          const name = await oponentUserid.rows[0].name;
          await bot.telegram.sendMessage(
            mutual.to_user_id,
            `💌 У вас взаємний лайк з користувачем ${name}.`,
            {
              reply_markup: username
                ? {
                    inline_keyboard: [
                      [
                        {
                          text: "💬 Почати чат",
                          url: `https://t.me/${username}`,
                        },
                      ],
                    ],
                  }
                : undefined, // кнопки немає
            }
          );
        }
      }
    }

    if (text === "❌ Дизлайк") {
      await pool.query(
        `delete from tg_profile_likes where from_user_id = $1 and to_user_id = $2`,
        [likedUserId, userId]
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
      } else {
        await ctx.reply(t(ctx.lang, "main_menu"), {
          reply_markup: getBeforeRegisterKeyboard(ctx),
        });
      }
      return ctx.scene.leave();
    }
  }
  return next();
});

export default myLikesScene;
