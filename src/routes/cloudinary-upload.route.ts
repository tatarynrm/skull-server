import express, { Request, Response } from "express";
import multer from "multer";
import cloudinary from "../utils/cloudinary";
import { pool } from "../db/pool";
// шлях до твого pool (db.ts)
import cors from "cors";
import { redis } from "../utils/redis";
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
// CORS для цього маршруту
router.use(
  cors({
    origin: ["https://skulldate.site", "http://localhost:80",'http://localhost:3000'], // дозволяємо доступ тільки з цього домену
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
router.post("/upload", upload.any(), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = req.body.user_id;

    if (!userId) {
      res.status(400).json({ error: "Missing user_id" });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const urls: string[] = [];

    // Очистка кешу для цього користувача
    const cacheKey = `user_photos:${userId}`;
    await redis.del(cacheKey); // redisClient - це ваш інстанс Redis

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Прибираємо флаг приватності
      const base64 = file.buffer.toString("base64");
      const dataURI = `data:${file.mimetype};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "skulldate",
        allowed_origin: "https://api.skulldate.site",
      });

      const imageUrl = result.secure_url;
      const publicId = result.public_id;
      urls.push(imageUrl);

      // Зберігаємо фото без приватності
      await pool.query(
        "INSERT INTO images (user_id, url, public_id) VALUES ($1, $2, $3)",
        [userId, imageUrl, publicId]
      );
    }

    res.json(urls.length === 1 ? { url: urls[0] } : { urls });
  } catch (err) {
    console.error("Upload failed", err);
    res.status(500).json({ error: "Upload failed", details: err });
  }
});

router.delete(
  "/delete/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;

    try {
      // Отримати public_id та user_id із бази
      const result = await pool.query(
        "SELECT public_id, user_id FROM images WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      const { public_id, user_id } = result.rows[0];

      // Видалити з Cloudinary
      await cloudinary.uploader.destroy(public_id);

      // Видалити з бази
      await pool.query("DELETE FROM images WHERE id = $1", [id]);

      // Очистити Redis кеш
      const cacheKey = `user_photos:${user_id}`;
      await redis.del(cacheKey);

      res.json({ success: true });
    } catch (err) {
      console.error("Delete failed", err);
      res.status(500).json({ error: "Delete failed", details: err });
    }
  }
);

router.delete(
  "/delete-multiple",
  async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "No photo IDs provided" });
      return;
    }

    try {
      // Отримати public_id і user_id для кожного фото
      const result = await pool.query(
        "SELECT public_id, user_id FROM images WHERE id = ANY($1)",
        [ids]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "No images found" });
        return;
      }

      const publicIds = result.rows.map((row) => row.public_id);
      const userIds = [...new Set(result.rows.map((row) => row.user_id))]; // унікальні user_id

      // Видалити з Cloudinary
      await Promise.all(
        publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
      );

      // Видалити з бази
      await pool.query("DELETE FROM images WHERE id = ANY($1)", [ids]);

      // Видалити кеші по кожному користувачу
      await Promise.all(
        userIds.map((userId) => redis.del(`user_photos:${userId}`))
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Delete multiple failed", err);
      res.status(500).json({ error: "Delete failed", details: err });
    }
  }
);

router.post("/get-photos", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  const cacheKey = `user_photos:${user_id}`;

  try {
    // 1. Перевіряємо Redis кеш
    const cachedPhotos = await redis.get(cacheKey);

    if (cachedPhotos) {
      console.log("🔄 Фото з Redis кешу");
      res.json(JSON.parse(cachedPhotos));
      return;
    }

    // 2. Якщо нема в кеші — беремо з БД
    const result = await pool.query(
      `SELECT a.url, a.public_id, a.id, a.private FROM images a WHERE user_id = $1`,
      [user_id]
    );

    const photos = result.rows;

    // 3. Кешуємо в Redis на 10 хвилин (600 секунд)
    await redis.set(cacheKey, JSON.stringify(photos), "EX", 60 * 10);

    res.json(photos);
  } catch (error) {
    console.error("❌ Помилка при отриманні фото:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/toggle-private", async (req: Request, res: Response) => {
  const { ids, makePrivate } = req.body; // ids: number[], makePrivate: boolean

  if (!Array.isArray(ids) || typeof makePrivate !== "boolean") {
    res.status(400).json({ success: false, message: "Невірні дані" });
    return;
  }

  try {
    // Оновлюємо статус приватності фотографій
    const query = `
      UPDATE images
      SET private = $1
      WHERE id = ANY($2::int[])
    `;
    await pool.query(query, [makePrivate, ids]);

    // Очистка кешу для цього користувача
    // Важливо! Потрібно знати, як зберігається user_id для кожного фото, щоб створити правильний cacheKey
    const queryForUserIds = `
      SELECT DISTINCT user_id FROM images WHERE id = ANY($1::int[])
    `;
    const result = await pool.query(queryForUserIds, [ids]);

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id; // Враховуємо лише одного користувача, якщо ви знаєте, що зображення належать лише одному користувачеві
      const cacheKey = `user_photos:${userId}`;

      // Очистка кешу для цього користувача
      await redis.del(cacheKey); // redisClient - це ваш інстанс Redis
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Помилка оновлення приватності фото:", error);
    res.status(500).json({ success: false, message: "Помилка сервера" });
  }
});

export default router;
