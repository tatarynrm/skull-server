// profile.service.ts

import { InputMediaPhoto } from "telegraf/typings/core/types/typegram";
import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";
import { deletePhotoFromCloudinary } from "../lib/cloudinary";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import { deletePhotoFromS3 } from "../lib/amazon-s3";

export interface UserProfileData {
  user_id: number;
  name: string;
  age: number;
  sex: number;
  city: string;
  latitude: number;
  longitude: number;
  lookingFor: number;
  minAge: number;
  maxAge: number;
  photos: string[];
  description: string;
  referal_code?: string;
  pre_photos?: string[];
}
export interface ProfilePhoto {
  url: string;
}

export interface IUserProfile {
  user_id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  age: number;
  date_block: Date | null;
  block_reason: string | null;
  is_premium: boolean | null;
  sex: number;
  looking_for: number;
  is_hidden: boolean;
  min_age: number;
  max_age: number;
  description: string;
  photos: ProfilePhoto[];
  status?: string;
  referal_code: string;
}
export class ProfileService {
  // private readonly CACHE_TTL = 60 * 1; // 5 хвилин

  async getProfileByUserId(userId: number) {
    const cacheKey = `profile:${userId}`;

    // // 1️⃣ Перевіряємо Redis
    const cached = await redis.get(cacheKey);
    console.log(cached, "КЕШОВАНИЙ");

    if (cached) {
      return JSON.parse(cached);
    }

    // 2️⃣ Якщо нема — беремо з PG
    const query = `
    SELECT 
      up.*, 
      jsonb_agg(
        jsonb_build_object('url', pp.url)
      ) AS photos
    FROM 
      tg_user_profile up
    LEFT JOIN 
      tg_profile_photos pp ON up.user_id = pp.user_id
    WHERE 
      up.user_id = $1
    GROUP BY 
      up.user_id
  `;

    const result = await pool.query(query, [userId]);
    // Якщо використовуєш jsonb_agg для photos

    if (!result.rows[0]) return null;

    // Кешуємо результат
    await redis.set(
      cacheKey,
      JSON.stringify(result.rows[0]),
      "EX", // ключове слово
      60 * 1 // час у секундах
    );
    const profile: IUserProfile = result.rows[0];
    return profile;
  }

  async saveUserProfile(data: UserProfileData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1️⃣ Зберігаємо/оновлюємо анкету
      const profileResult = await client.query(
        `
      INSERT INTO tg_user_profile 
        (user_id, name, age, sex, city, latitude, longitude, looking_for, min_age, max_age, description,referal_code)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        city = EXCLUDED.city,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        looking_for = EXCLUDED.looking_for,
        min_age = EXCLUDED.min_age,
        max_age = EXCLUDED.max_age,
        description = EXCLUDED.description,
        referal_code = EXCLUDED.referal_code
      RETURNING *;
      `,
        [
          data.user_id,
          data.name,
          data.age,
          data.sex,
          data.city,
          data.latitude,
          data.longitude,
          data.lookingFor,
          data.minAge,
          data.maxAge,
          data.description,
          data.referal_code,
        ]
      );

      const profile = profileResult.rows[0];

      // 2️⃣ Видаляємо старі фото з profile_photos і Cloudinary
      const oldPhotos = await client.query(
        `SELECT url FROM tg_profile_photos WHERE user_id = $1`,
        [data.user_id]
      );

      for (const row of oldPhotos.rows) {
        try {
          // await deletePhotoFromCloudinary(row.url);
          await deletePhotoFromS3(row.url);
        } catch (err) {
          console.error("Error deleting photo from Cloudinary:", err);
        }
      }

      await client.query(`DELETE FROM tg_profile_photos WHERE user_id = $1`, [
        data.user_id,
      ]);

      // 3️⃣ Додаємо нові фото
      if (data.photos && data.photos.length > 0) {
        const photoInsertQuery = `
        INSERT INTO tg_profile_photos (user_id, url, created_at)
        VALUES ${data.photos.map((_, i) => `($1, $${i + 2}, NOW())`).join(",")}
        RETURNING *;
      `;
        await client.query(photoInsertQuery, [data.user_id, ...data.photos]);
      }

      await client.query("COMMIT");
      return profile;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async sendProfilePhotos(ctx: MyContext, profile: IUserProfile) {
    // Фільтруємо тільки валідні URL
    const validPhotos =
      profile.photos?.filter((p) => p.url && p.url.trim() !== "") || [];

    if (validPhotos.length === 0) {
      // Немає фото → тільки текст
      await ctx.reply(
        `👤 ${profile.name || ctx.from?.first_name} (${profile.age || "Age"})\n📍 ${
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
        }\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`
      );
      return;
    }

    // Є валідні фото → відправляємо mediaGroup
    const mediaGroup: InputMediaPhoto[] = validPhotos.map((photo, index) => ({
      type: "photo",
      media: photo.url!,
      caption:
        index === 0
          ? `👤 ${profile.name || ctx.from?.first_name} (${profile.age || "Age"})\n📍 ${
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
            }\n${profile.status ? `Status: ${profile.status}` : "⛔Status is not set"}`
          : undefined,
    }));

    await ctx.replyWithMediaGroup(mediaGroup);
  }

  async updateStatus(userId: number, status: string) {
    try {
      const query = `
        UPDATE tg_user_profile
        SET status = $1
        WHERE user_id = $2
        RETURNING *;
      `;
      const values = [status, userId];
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null; // якщо не знайдено профіль
      }

      return result.rows[0]; // повертаємо оновлений профіль
    } catch (error) {
      console.error("Error updating status:", error);
      throw new Error("Не вдалося оновити статус");
    }
  }

  async activateProfile(userId: number) {
    const result = await pool.query(
      `UPDATE tg_user_profile SET is_hidden = false WHERE user_id = $1`,
      [userId]
    );

    const cacheKey = `profile:${userId}`;

    // // 1️⃣ Перевіряємо Redis
    const cached = await redis.del(cacheKey);

    return true;
  }

  async sendProfilePhotosPreRegisterShow(ctx: MyContext) {
    const data = ctx.scene.session.registrationData;

    if (!data) {
      await ctx.reply("Registration data is missing. Please start again.");
      await ctx.reply(t(ctx.lang, "whats_your_name"), {
        reply_markup: { remove_keyboard: true },
      });
      return ctx.scene.reenter();
    }

    const profileText = `👤 ${data.name || ctx.from?.first_name || "No Name"} (${data.age || "Age"})\n📍 ${
      data.city || "Not specified"
    }\n📝 ${data.description || "No description"}\n__________________\nLooking age: ${
      data.minAge || 0
    } - ${data.maxAge || 0}\nLooking for: ${
      data.lookingFor === 1
        ? "👦"
        : data.lookingFor === 2
          ? "👧"
          : data.lookingFor === 3
            ? "👦👧"
            : "❓"
    }`;

    const validPhotos = Array.isArray(data.photos)
      ? data.photos.filter((p) => p.url && p.url.trim() !== "")
      : [];

    if (validPhotos.length === 0) {
      await ctx.reply(profileText);
      return;
    }

    const mediaGroup: InputMediaPhoto[] = validPhotos.map((p, index) => ({
      type: "photo",
      media: p.url,
      caption: index === 0 ? profileText : undefined,
    }));

    await ctx.replyWithMediaGroup(mediaGroup);
  }

  async updateDescription(userId: number, description: string) {
    try {
      const result = await pool.query(
        `UPDATE tg_user_profile 
         SET description = $1
         WHERE user_id = $2 RETURNING *`,
        [description, userId]
      );
      if (result.rowCount) {
        return result.rowCount > 0;
      } else {
        return false;
      }
    } catch (err) {
      console.error("updateDescription error:", err);
      return false;
    }
  }

  async getProfilePhotos(userId: number): Promise<{ url: string }[]> {
    try {
      const result = await pool.query(
        `SELECT url FROM tg_profile_photos WHERE user_id = $1`,
        [userId]
      );
      if (!result.rowCount) {
        return [];
      }
      if (result.rowCount > 0) {
        // Повертаємо масив об’єктів { url: string }
        return result.rows.map((row) => ({ url: row.url }));
      } else {
        return [];
      }
    } catch (err) {
      console.error("getProfilePhotos error:", err);
      return [];
    }
  }

  async updateUserPhotos(userId: number, photos: string[]) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Видаляємо старі фото
      await client.query("DELETE FROM tg_profile_photos WHERE user_id = $1", [
        userId,
      ]);

      // Вставляємо нові фото
      const insertPromises = photos.map((url) =>
        client.query(
          "INSERT INTO tg_profile_photos (user_id, url) VALUES ($1, $2)",
          [userId, url]
        )
      );
      await Promise.all(insertPromises);

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("updateUserPhotos error:", err);
      return false;
    } finally {
      client.release();
    }
  }
  async updateUserAgeRange(
    userId: number,
    minAge: number,
    maxAge: number
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE tg_user_profile
        SET min_age = $1,
            max_age = $2
        WHERE user_id = $3
      `;
      const result = await pool.query(query, [minAge, maxAge, userId]);
      if (result.rowCount) {
        return result.rowCount > 0; // повертає true, якщо щось оновлено
      } else {
        return false;
      }
    } catch (err) {
      console.error("Error updating user age range:", err);
      return false;
    }
  }
}

export const tgProfileService = new ProfileService();
