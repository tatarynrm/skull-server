"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pool_1 = require("../db/pool");
class AuthController {
    constructor() {
        this.loginWithTelegram = async (req, res) => {
            const { user } = req.body;
            const token = this.authService.generateToken(user);
            // Оновлення фото
            await pool_1.pool.query("UPDATE tg_users SET photo_url = $1 WHERE tg_id = $2", [
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
        this.getMe = async (req, res) => {
            const token = req.cookies?.token || req.body.uts;
            if (!token) {
                res.status(401).json({ user: null });
                return;
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const userCheck = await pool_1.pool.query("SELECT * FROM tg_users WHERE tg_id = $1", [decoded.id]);
                const existUser = userCheck.rows[0];
                if (!existUser) {
                    res.status(404).json({ message: "User not found" });
                }
                res.json(existUser);
            }
            catch (error) {
                console.error("JWT error:", error);
                res.status(401).json({ message: "Invalid token" });
            }
        };
        this.getProfile = async (req, res) => {
            const { user_id } = req.body;
            try {
                const userCheck = await pool_1.pool.query("SELECT * FROM users_profiles WHERE user_id = $1", [user_id]);
                const existUser = userCheck.rows[0];
                if (!existUser) {
                    res.status(404).json({ message: "User not found" });
                }
                res.json(existUser);
            }
            catch (error) {
                res.status(401).json({ message: "Invalid token" });
            }
        };
        this.logout = (req, res) => {
            res.clearCookie("token", {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
            });
            res.status(200).json({ message: "Logged out" });
        };
        this.authService = new auth_service_1.AuthService();
    }
}
exports.AuthController = AuthController;
