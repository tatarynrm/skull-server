import { Scenes } from "telegraf";
import { MyContext } from "../types/bot-context";
import { BotScenes } from "./types";
import { t } from "../lib/i18n";
import { getMainKeyboard } from "../keyboards";
import { tgProfileService } from "../services/profile.service";

import { redis } from "../../utils/redis";
import { getFileLink } from "./register-profile.scene";
import { cleanupFolder, uploadPhotoToS3 } from "../lib/amazon-s3";

const changePhotoScene = new Scenes.WizardScene<MyContext>(
  BotScenes.CHANGE_PHOTO_SCENE,

  // === КРОК 1: Запросити фото ===
  async (ctx) => {
    ctx.scene.session.registrationData = { photos: [] };

    await ctx.reply(t(ctx.lang, "send_photos_request"), {
      reply_markup: {
        keyboard: [
          [{ text: "✅ Підтвердити" }],
          [{ text: t(ctx.lang, "back_to_menu") }],
        ],
        resize_keyboard: true,
      },
    });

    return ctx.wizard.next();
  },

  // === КРОК 2: Прийом фото ===
  async (ctx) => {
    const sessionData = ctx.scene.session.registrationData.photos || [];

    // === 1️⃣ Користувач надіслав фото ===
    if (ctx.message && "photo" in ctx.message) {
      const photo = ctx.message.photo.pop();
      if (!photo) return ctx.reply(t(ctx.lang, "only_photo_supported"));

      const fileId = photo.file_id;
      const fileLink = await getFileLink(ctx, fileId);
      if (!fileLink) return ctx.reply(t(ctx.lang, "error_getting_photo"));

      const url = await uploadPhotoToS3(fileLink, ctx.from!.id);
      if (!url) return ctx.reply(t(ctx.lang, "error_saving_photo"));

      sessionData!.push({ url });

      const count = sessionData!.length;
      const morePhotosAllowed = count < 4;

      await ctx.reply(
        morePhotosAllowed
          ? t(ctx.lang, "photo_saved")
          : t(ctx.lang, "photo_limit_reached"),
        {
          reply_markup: {
            keyboard: morePhotosAllowed
              ? [
                  [
                    { text: t(ctx.lang, "confirm_photos") },
                    { text: t(ctx.lang, "add_more_photos") },
                  ],
                  [{ text: t(ctx.lang, "back_to_menu") }],
                ]
              : [
                  [{ text: t(ctx.lang, "confirm_photos") }],
                  [{ text: t(ctx.lang, "back_to_menu") }],
                ],
            resize_keyboard: true,
          },
        }
      );
      return;
    }

    // === 2️⃣ Користувач натиснув кнопку текстом ===
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;

      // Вийти у випадку "Повернутись в меню"
      if (text === t(ctx.lang, "back_to_menu")) {
        await ctx.reply(t(ctx.lang, "cancel_photo_update"), {
          reply_markup: getMainKeyboard(ctx),
        });
        return ctx.scene.leave();
      }

      // Підтвердження фото
      if (text === t(ctx.lang, "confirm_photos")) {
        if (!sessionData!.length) {
          return ctx.reply(t(ctx.lang, "no_photos_uploaded"));
        }

        const oldPhotos = await tgProfileService.getProfilePhotos(ctx.from!.id);
        console.log(oldPhotos, "OLD PHOTOS");

        const newUrls = sessionData!.slice(0, 4).map((p) => p.url);

        // --- Спершу оновлюємо нові фото в базі ---
        const updated = await tgProfileService.updateUserPhotos(
          ctx.from!.id,
          newUrls
        );
        if (!updated) {
          await ctx.reply(t(ctx.lang, "error_updating_photos"), {
            reply_markup: getMainKeyboard(ctx),
          });
          return ctx.scene.leave();
        }

        // Відправляємо користувачу повідомлення
        // Чистимо кеш
        await redis.del(`profile:${ctx.from!.id}`);
        await tgProfileService.getProfileByUserId(ctx.from!.id);
        await ctx.reply(t(ctx.lang, "photos_updated_success"), {
          reply_markup: getMainKeyboard(ctx),
        });

        const profilePhotos = await tgProfileService.getProfilePhotos(
          ctx.message.from.id
        );
        const keys = profilePhotos!.map((p) => {
          const urlObj = new URL(p.url);
          return urlObj.pathname.slice(1); // прибираємо початковий "/"
        });
        // Використання:
        await cleanupFolder(
          process.env.BUCKET_NAME!,
          `user-uploads/${ctx.message.from.id}/`, // папка (prefix)
          keys
        );
      } else {
        await ctx.reply(t(ctx.lang, "error_updating_photos"), {
          reply_markup: getMainKeyboard(ctx),
        });
      }

      return ctx.scene.leave();
    }

    return ctx.reply(t(ctx.lang, "send_or_confirm_photo"));
  }
);

// === 3️⃣ Обробка глобальних команд ===
changePhotoScene.use(async (ctx: MyContext, next) => {
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

export default changePhotoScene;
