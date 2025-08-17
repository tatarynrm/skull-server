import dotenv from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
dotenv.config();

class ProfileService {
  async getUserProfileByTgId(tgid: number) {

    const { rows } = await pool.query(
      "select * from tg_user_profile where user_id = $1",
      [tgid]
    );

    const profile = rows[0];

    if (!profile) {
      return false;
    }

    return profile;
  }
  async getUserBiId(userId: number) {
    const { rows } = await pool.query(
      "select * from tg_user where tg_id = $1",
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return false;
    }

    return user;
  }

}

export const profileService = new ProfileService();
