// profile.service.ts

import { InputMediaPhoto } from "telegraf/typings/core/types/typegram";
import { pool } from "../../db/pool";
import { redis } from "../../utils/redis";
import { deletePhotoFromCloudinary } from "../lib/cloudinary";
import { MyContext } from "../types/bot-context";
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
        (user_id, name, age, sex, city, latitude, longitude, looking_for, min_age, max_age, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        description = EXCLUDED.description
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
          await deletePhotoFromCloudinary(row.url);
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

async  sendProfilePhotos  (ctx: MyContext, profile: IUserProfile) {
  if (!profile.photos || profile.photos.length === 0) return;

  const mediaGroup: InputMediaPhoto[] = profile.photos.map((photo, index) => ({
    type: "photo",
    media: photo.url,
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
          }`
        : undefined,
  }));

  await ctx.replyWithMediaGroup(mediaGroup);
};

}

export const tgProfileService = new ProfileService();
