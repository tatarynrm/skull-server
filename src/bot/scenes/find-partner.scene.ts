import { Scenes, Markup } from "telegraf";
import { pool } from "../../db/pool";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { BotScenes } from "./types";
import { profileService } from "../../services/profile.service";
import { tgProfileService } from "../services/profile.service";

interface PartnerRow {
  user_id: number;
  description: string;
  latitude: number;
  longitude: number;
  distance: number;
  name?: string;
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
    const user = await tgProfileService.getProfileByUserId(userId);

    if (!user || user.daily_likes <= 0) {
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
    let latitude: number;
    let longitude: number;

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
      const user = await tgProfileService.getProfileByUserId(userId);

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

    // Тут робиш запит до БД з latitude/longitude
    const res = await pool.query<PartnerRow>(
      `
      SELECT user_id, name, description, latitude, longitude,
      (6371000 * acos(
        LEAST(1, GREATEST(-1, cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))))))
      AS distance
      FROM tg_user_profile
      WHERE user_id != $3
      ORDER BY distance ASC
      LIMIT 20
  `,
      [latitude, longitude, userId]
    );

    if (!res.rows.length) {
      await ctx.reply(t(ctx.lang, "no_partners_nearby"), {
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

  await ctx.reply(
    `👤 ${partner.name || "Без імені"}\n📍 ${Math.round(partner.distance / 1000)} км\n📝 ${
      partner.description || t(ctx.lang, "no_description")
    }`,
    {
      reply_markup: {
        keyboard: [
          [{ text: "💘" }, { text: "✉️" }, { text: "⛔️" }, { text: "👤" }],
        ],
        resize_keyboard: true,
      },
    }
  );
}

// Обробка натискання кнопок
findPartnerScene.hears("💘", async (ctx) => handleLikeDislike(ctx, "like"));
findPartnerScene.hears("✉️", async (ctx) => handleMessage(ctx));
findPartnerScene.hears("⛔️", async (ctx) => handleLikeDislike(ctx, "dislike"));
findPartnerScene.hears("👤", async (ctx) => {
  await ctx.reply(t(ctx.lang, "main_menu"), {
    reply_markup: getMainKeyboard(ctx),
  });
  await ctx.scene.leave();
});

// Лайк / Дизлайк
// Обробка лайку / дизлайку з оновленням лічильника
async function handleLikeDislike(ctx: MyContext, type: "like" | "dislike") {
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
      const user = await profileService.getUserBiId(userId!);
      if (!user || user.daily_likes <= 0) {
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
        `UPDATE tg_user
         SET daily_likes = daily_likes - 1
         WHERE tg_id = $1`,
        [userId]
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
  const state = ctx.wizard.state as FindPartnerState & { messageTarget?: number };
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
    await ctx.reply(t(ctx.lang, "main_menu"), { reply_markup: getMainKeyboard(ctx) });
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
        `UPDATE tg_user SET daily_likes = daily_likes - 1 WHERE tg_id = $1`,
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
