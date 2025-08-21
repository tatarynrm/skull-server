import { Scenes, Markup } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { BotScenes } from "./types";
import { tgProfileService } from "../services/profile.service";
import { InputMediaPhoto } from "telegraf/typings/core/types/typegram";
import { redis } from "../../utils/redis";
import { tgLikeService } from "../services/like.service";
import { getRandomGif, sendRandomGif } from "../lib/giphy(random-gif)/giphy";

export interface PartnerRow {
  user_id: number;
  name?: string;
  city?: string;
  latitude: number;
  longitude: number;
  age?: number;
  date_block?: string | null;
  block_reason?: string | null;
  is_premium?: boolean | null;
  sex?: number; // 1 = male, 2 = female, інші варіанти за потреби
  looking_for?: number; // 1 = male, 2 = female, 3 = anyone
  is_hidden?: boolean;
  min_age?: number;
  max_age?: number;
  description?: string;
  status?: string;
  distance: number;
  photos?: string[];
  distance_km?: number;
}

export interface FindPartnerState {
  partners: PartnerRow[];
  index: number;
  processing?: boolean;
  messageTarget?: number;
}

const findPartnerScene = new Scenes.WizardScene<MyContext>(
  BotScenes.FIND_PARTNER,

  // Крок 1: вибір локації
  async (ctx) => {
    const userId = ctx.message?.from.id!;
    const cacheKey = `profile:${userId}`;
    await redis.del(cacheKey);
    const profile = await tgProfileService.getProfileByUserId(userId);

    if (!profile || profile.daily_likes <= 0) {
      await ctx.reply(
        "У вас закінчились лайки. Купіть преміум аккаунт для безлімітних лайків!",
        { reply_markup: getMainKeyboard(ctx) }
      );
      return ctx.scene.leave();
    }

    await ctx.reply(t(ctx.lang, "send_your_location_or_use_profile"), {
      reply_markup: {
        keyboard: [
          [{ text: t(ctx.lang, "use_profile_location") }],
          [
            {
              text: t(ctx.lang, "send_location_button"),
              request_location: true,
            },
          ],

          [{ text: t(ctx.lang, "back_to_menu") }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });

    ctx.wizard.next();
  },

  // Крок 2: Отримати локацію або взяти з профілю
  async (ctx) => {
    const userId = ctx.message?.from.id!;
    const user = await tgProfileService.getProfileByUserId(userId);
    let latitude: number;
    let longitude: number;
    await ctx.reply("👀 Starting search your love...", {
      reply_markup: {
        keyboard: [
          [{ text: "😍" }, { text: "✉️" }, { text: "👎" }, { text: "👤" }],
        ],
        resize_keyboard: true,
      },
    });

    // Якщо користувач надіслав локацію
    if (ctx.message && "location" in ctx.message) {
      latitude = ctx.message.location.latitude;
      longitude = ctx.message.location.longitude;
    }
    // Якщо натиснув "використати локацію з профілю"
    else if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text === t(ctx.lang, "use_profile_location")
    ) {
      if (!user || !user.latitude || !user.longitude) {
        await ctx.reply(t(ctx.lang, "no_profile_location"), {
          reply_markup: getMainKeyboard(ctx),
        });
        return ctx.scene.leave();
      }
      latitude = user.latitude;
      longitude = user.longitude;
    }
    // Якщо нічого не обрали
    else {
      // await ctx.reply(t(ctx.lang, "please_share_location"));
      await ctx.reply(t(ctx.lang, "unknown_answer"));
      return;
    }

console.log(user,'USER');

    const res = await pool.query(
      `
  SELECT 
      p.*,
      (6371 * acos(
          LEAST(1, GREATEST(-1, cos(radians($1)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(p.latitude))))
      )) AS distance_km,
      COALESCE(
          (SELECT json_agg(url)
           FROM tg_profile_photos ph
           WHERE ph.user_id = p.user_id), '[]'
      ) AS photos
  FROM tg_user_profile p
  WHERE p.user_id != $3
    AND p.age BETWEEN $5 AND $6
    AND NOT EXISTS (
        SELECT 1
        FROM tg_user_likes l
        WHERE l.from_user_id = $3
          AND l.to_user_id = p.user_id
    )
    AND (6371 * acos(
          LEAST(1, GREATEST(-1, cos(radians($1)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(p.latitude))))
    )) <= $4
  ORDER BY distance_km ASC
  LIMIT 20;
`,
      [
        latitude,
        longitude,
        userId,
        user.max_distance_search = user?.max_distance_search || 100,
        user.min_age,
        user.max_age,
      ]
    );

 

    if (!res.rows.length) {
      await sendRandomGif(ctx, ctx.message.from.id, "sad");
      await ctx.reply(t(ctx.lang, "no_partners_neary"), {
        reply_markup: getMainKeyboard(ctx),
      });
      return ctx.scene.leave();
    }

    const state = ctx.wizard.state as FindPartnerState;
    state.partners = res.rows;
    state.index = 0;
    state.processing = false;
    await sendPartner(ctx);
  }
);

// Відправка партнера з Reply Keyboard
async function sendPartner(ctx: MyContext) {
  const state = ctx.wizard.state as FindPartnerState;
  if (!state || state.index >= state.partners.length) {
    await ctx.reply(t(ctx.lang, "search_completed"), {
      reply_markup: getMainKeyboard(ctx),
    });
    return ctx.scene.leave();
  }

  const partner = state.partners[state.index];

  if (partner.photos && partner.photos.length > 0) {
    const mediaGroup: InputMediaPhoto[] = partner.photos.map(
      (photoUrl, index) => ({
        type: "photo",
        media: photoUrl,
        caption:
          index === 0
            ? `👤 ${partner.name || "Без імені"}\n📍 ${Math.round(partner.distance_km!)} км\n📝 ${
                partner.description || t(ctx.lang, "no_description")
              }\n__________________\nLooking age: ${partner.min_age || "?"} - ${
                partner.max_age || "?"
              }\nLooking for: ${
                partner.looking_for === 1
                  ? "👦"
                  : partner.looking_for === 2
                    ? "👧"
                    : partner.looking_for === 3
                      ? "👦👧"
                      : "❓"
              }\n${partner.status ? "Status: " + partner.status : ""}`
            : undefined,
      })
    );

    await ctx.replyWithMediaGroup(mediaGroup);
  } else {
    // Якщо фото немає, просто текст
    await ctx.reply(
      `👤 ${partner.name || "Без імені"}\n📍 ${Math.round(partner.distance_km!)} км\n📝 ${
        partner.description || t(ctx.lang, "no_description")
      }`
    );
  }
}

// Обробка натискання кнопок
findPartnerScene.hears("😍", async (ctx) => handleLikeDislike(ctx, "like"));
findPartnerScene.hears("✉️", async (ctx) => handleMessage(ctx));
findPartnerScene.hears("👎", async (ctx) => handleLikeDislike(ctx, "dislike"));
findPartnerScene.hears("👤", async (ctx) => {
  await ctx.reply(t(ctx.lang, "main_menu"), {
    reply_markup: getMainKeyboard(ctx),
  });
  await ctx.scene.leave();
});

// Лайк / Дизлайк
// Обробка лайку / дизлайку з оновленням лічильника
async function handleLikeDislike(ctx: MyContext, type: "like" | "dislike") {
  const cacheKey = `profile:${ctx.message?.from.id}`;

  // // 1️⃣ Перевіряємо Redis
  const cached = await redis.del(cacheKey);
  const profile = await tgProfileService.getProfileByUserId(
    ctx.message?.from.id!
  );
  const state = ctx.wizard.state as FindPartnerState;
  if (!state || state.processing) return;
  state.processing = true;

  const partner = state.partners[state.index];
  if (!partner) {
    await ctx.reply(t(ctx.lang, "search_completed"), {
      reply_markup: getMainKeyboard(ctx),
    });
    state.processing = false;
    return ctx.scene.leave();
  }

  const userId = ctx.message?.from.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (type === "like") {
      if (!profile || profile.daily_likes <= 0) {
        await ctx.reply(
          "У вас закінчились лайки на сьогодні. Купіть преміум для безлімітних лайків!",
          { reply_markup: getMainKeyboard(ctx) }
        );
        state.processing = false;
        await client.query("ROLLBACK");
        return ctx.scene.leave();
      }

      await client.query(
        `INSERT INTO tg_user_likes (from_user_id, to_user_id, status)
         VALUES ($1, $2, 'like')
         ON CONFLICT (from_user_id, to_user_id)
         DO UPDATE SET status = 'like'`,
        [userId, partner.user_id]
      );

      await client.query(
        `UPDATE tg_user_profile
         SET daily_likes = daily_likes - 1
         WHERE user_id = $1`,
        [userId]
      );
      await tgLikeService.addLikeHistoryRecord(
        ctx.message?.from.id!,
        partner.user_id
      );
      await tgLikeService.updateUserStats(
        ctx.message?.from.id!,
        partner.user_id
      );
    } else {
      await client.query(
        `INSERT INTO tg_user_likes (from_user_id, to_user_id, status)
         VALUES ($1, $2, 'dislike')
         ON CONFLICT (from_user_id, to_user_id)
         DO UPDATE SET status = 'dislike'`,
        [userId, partner.user_id]
      );
    }

    await client.query("COMMIT");

    state.index++;
    await sendPartner(ctx);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("handleLikeDislike error:", err);
    await ctx.reply("❌ Сталася помилка, спробуйте ще раз.");
  } finally {
    client.release();
    state.processing = false;
  }
}

// Блокування

// Надіслати повідомлення
async function handleMessage(ctx: MyContext) {
  const state = ctx.wizard.state as FindPartnerState;
  if (!state) return;

  const partner = state.partners[state.index];
  if (!partner) return;

  state.messageTarget = partner.user_id;
  await ctx.reply("Введіть текст повідомлення користувачу:", {
    reply_markup: {
      keyboard: [[{ text: t(ctx.lang, "back_to_scene") }]],
      resize_keyboard: true,
    },
  });
}

// Перехоплення тексту для повідомлень
findPartnerScene.on("text", async (ctx, next) => {
  const state = ctx.wizard.state as FindPartnerState & {
    messageTarget?: number;
  };
  const text = ctx.message?.text;
  if (!text) return;

  const userId = ctx.from?.id;

  // 1️⃣ Перевірка команд / назад
  if (
    text.startsWith("/profile") ||
    text.startsWith("/start") ||
    text.startsWith("/help") ||
    text === t(ctx.lang, "back_to_scene") ||
    text === t(ctx.lang, "back_to_menu")
  ) {
    delete state.messageTarget;
    await ctx.reply(t(ctx.lang, "main_menu"), {
      reply_markup: getMainKeyboard(ctx),
    });
    return ctx.scene.leave();
  }

  // 2️⃣ Обробка тексту для повідомлення
  if (state.messageTarget && userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Вставка повідомлення
      await client.query(
        `INSERT INTO tg_user_messages (from_user_id, to_user_id, text) VALUES ($1, $2, $3)`,
        [userId, state.messageTarget, text]
      );

      // Зменшення лічильника лайків
      await client.query(
        `UPDATE tg_user_profile SET daily_likes = daily_likes - 1 WHERE user_id = $1`,
        [userId]
      );

      await client.query("COMMIT");

      await ctx.reply("✅ Повідомлення надіслано!");
      delete state.messageTarget;

      state.index++;
      await sendPartner(ctx);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error sending message:", err);
      await ctx.reply("❌ Сталася помилка, спробуйте ще раз.");
    } finally {
      client.release();
    }
    return;
  }

  return next();
});

findPartnerScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;

    if (text === t(ctx.lang, "back_to_scene")) {
      ctx.scene.reenter();
      return;
    }
    if (
      text.startsWith("/profile") ||
      text.startsWith("/help") ||
      text.startsWith("/start") ||
      text === t(ctx.lang, "back_to_menu")
    ) {
      const msgToDelete = await ctx.reply(t(ctx.lang, "system_next_steps"), {
        reply_markup: getMainKeyboard(ctx),
      });

      await ctx.scene.leave(); // виходимо зі сцени
      return; // не виконуємо подальші кроки сцени
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});

export default findPartnerScene;
