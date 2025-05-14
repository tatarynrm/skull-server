import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import jwt, { JwtPayload } from "jsonwebtoken";
import { pool } from "../db/pool";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  loginWithTelegram = async (req: Request, res: Response) => {
    const { user } = req.body;


    const token = this.authService.generateToken(user);

    // Оновлення фото
    await pool.query("UPDATE tg_users SET photo_url = $1 WHERE tg_id = $2", [
      user?.photo_url,
      user?.id,
    ]);

    // Встановлення токена в cookie
    res.cookie("token", token, {
      httpOnly: true, // захист від XSS
      secure: true, // HTTPS only in prod
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
    });

    res.status(200).json({ user, token: token });
  };

  getMe = async (req: Request, res: Response) => {
    const token = req.cookies?.token || req.body.uts;

    if (!token) {
      res.status(401).json({ user: null });
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload & {
        id: number;
      };

      const userCheck = await pool.query(
        "SELECT * FROM tg_users WHERE tg_id = $1",
        [decoded.id]
      );

      const existUser = userCheck.rows[0];
      if (!existUser) {
        res.status(404).json({ message: "User not found" });
      }

      res.json(existUser);
    } catch (error) {
      console.error("JWT error:", error);
      res.status(401).json({ message: "Invalid token" });
    }
  };
  getProfile = async (req: Request, res: Response) => {
   const {user_id} = req.body



    try {


      const userCheck = await pool.query(
        "SELECT * FROM users_profiles WHERE user_id = $1",
     [user_id]
      );


      const existUser = userCheck.rows[0];
      if (!existUser) {
        res.status(404).json({ message: "User not found" });
      }

      res.json(existUser);
    } catch (error) {
  
      res.status(401).json({ message: "Invalid token" });
    }
  };

  logout = (req: Request, res: Response) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    res.status(200).json({ message: "Logged out" });
  };
}
