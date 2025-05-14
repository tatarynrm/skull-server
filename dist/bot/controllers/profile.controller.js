"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const pool_1 = require("../../db/pool");
class ProfileController {
    static async upsertProfile(data) {
        try {
            const result = await pool_1.pool.query(`
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
        `, [
                data.user_id,
                data.name,
                data.age,
                data.sex,
                data.city,
                data.latitude,
                data.longitude,
                data.lookingFor,
                data.photoUrl,
            ]);
            return result.rows[0]; // повертає збережену анкету
        }
        catch (error) {
            console.error("Помилка при збереженні профілю:", error);
            throw new Error("Не вдалося зберегти профіль.");
        }
    }
    static async getProfileByUserId(userId) {
        try {
            const result = await pool_1.pool.query(`SELECT * FROM users_profiles WHERE user_id = $1`, [userId]);
            if (result.rows.length) {
                return result.rows[0];
            }
            else {
                return null;
            }
        }
        catch (error) {
            console.error("Помилка при отриманні профілю:", error);
            throw new Error("Не вдалося отримати профіль.");
        }
    }
}
exports.ProfileController = ProfileController;
