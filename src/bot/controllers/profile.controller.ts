import { pool } from "../../db/pool";


export class ProfileController {
  static async upsertProfile(data: {
    user_id: number | string;
    name: string;
    age: number;
    sex: string;
    city: string;
    latitude: number;
    longitude: number;
    lookingFor: string;
    photoUrl: string | null;
  }) {
    try {
      const result = await pool.query(
        `
        INSERT INTO users_profiles (user_id, name, age, sex, city, latitude, longitude, looking_for, photos)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          age = EXCLUDED.age,
          sex = EXCLUDED.sex,
          city = EXCLUDED.city,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          looking_for = EXCLUDED.looking_for,
          photos = EXCLUDED.photos
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
          data.photoUrl,
        ]
      );

      return result.rows[0]; // повертає збережену анкету
    } catch (error) {
      console.error("Помилка при збереженні профілю:", error);
      throw new Error("Не вдалося зберегти профіль.");
    }
  }

  static async getProfileByUserId(userId: number) {
    try {
      const result = await pool.query(
        `SELECT * FROM users_profiles WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Помилка при отриманні профілю:", error);
      throw new Error("Не вдалося отримати профіль.");
    }
  }
}
