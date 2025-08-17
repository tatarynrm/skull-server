import dotenv from 'dotenv'
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ITelegramUser } from '../types/user.type';
import { pool } from '../db/pool';
dotenv.config();


export class UserService {

public  async saveUserIfNotExist(user: ITelegramUser) {
  const result = await pool.query(
    `INSERT INTO tg_user (tg_id, first_name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (tg_id) DO NOTHING
     RETURNING *`,
    [user.tg_id, user.first_name, user.username]
  );
  return result.rows[0] || null
}
}


export const userService = new UserService()