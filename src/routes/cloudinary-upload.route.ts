import express, { Request, Response } from "express";
import multer from "multer";
import cloudinary from "../utils/cloudinary";
import { pool } from "../db/pool";
// шлях до твого pool (db.ts)
import cors from "cors";
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
// CORS для цього маршруту
router.use(cors({
  origin: 'https://skulldate.site', // дозволяємо доступ тільки з цього домену
  methods: ['GET', 'POST', 'OPTIONS','PUT','DELETE','PATCH'],
  credentials: true,
}));
router.post(
  "/upload",
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    console.log(req.body);
    
    try {
      const files = req.files as Express.Multer.File[];
      const userId = req.body.user_id;
      const privateFlag = req.body.private === 'true'; // Get the private flag from request
 console.log(userId);
 console.log(files,'files');
      if (!userId) {
        res.status(400).json({ error: "Missing user_id" });
        return;
      }

      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const urls: string[] = [];

      for (const file of files) {
        const base64 = file.buffer.toString("base64");
        const dataURI = `data:${file.mimetype};base64,${base64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "skulldate",
           allowed_origin: 'https://api.skulldate.site'
        });

        const imageUrl = result.secure_url;
        const publicId = result.public_id;
        urls.push(imageUrl);

        // Save image info in the database, including the private flag
        await pool.query(
          "INSERT INTO images (user_id, url, public_id, private) VALUES ($1, $2, $3, $4)",
          [userId, imageUrl, publicId, privateFlag]
        );
      }

      if (urls.length === 1) {
        res.json({ url: urls[0] });
      } else {
        res.json({ urls });
      }
    } catch (err) {
      console.error("Upload failed", err);
      res.status(500).json({ error: "Upload failed", details: err });
    }
  }
);


router.delete(
  "/delete/:id",
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;


    try {
      // Отримати public_id із бази
      const result = await pool.query(
        "SELECT public_id FROM images WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      const publicId = result.rows[0].public_id;

      // Видалити з Cloudinary
      await cloudinary.uploader.destroy(publicId);

      // Видалити з бази
      await pool.query("DELETE FROM images WHERE id = $1", [id]);

      res.json({ success: true });
      return;
    } catch (err) {
      console.error("Delete failed", err);
      res.status(500).json({ error: "Delete failed", details: err });
      return;
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
      // Отримуємо всі public_id для видалених фото
      const result = await pool.query(
        "SELECT public_id FROM images WHERE id = ANY($1)",
        [ids]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "No images found" });
        return;
      }

      const publicIds = result.rows.map((row) => row.public_id);

      // Видаляємо фото з Cloudinary
      await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));

      // Видаляємо фото з бази
      await pool.query("DELETE FROM images WHERE id = ANY($1)", [ids]);

      res.json({ success: true });
      return;
    } catch (err) {
      console.error("Delete multiple failed", err);
      res.status(500).json({ error: "Delete failed", details: err });
      return;
    }
  }
);

router.post("/get-photos", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  try {
    const result = await pool.query(
      `select a.url,a.public_id,a.id,a.private from images a where user_id = $1`,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.log(error);
  }
});

router.patch('/toggle-private', async (req:Request, res:Response) => {
  const { ids, makePrivate } = req.body // ids: number[], makePrivate: boolean
console.log(ids);

  if (!Array.isArray(ids) || typeof makePrivate !== 'boolean') {
     res.status(400).json({ success: false, message: 'Невірні дані' })
     return
  }

  try {
    const query = `
      UPDATE images
      SET private = $1
      WHERE id = ANY($2::int[])
    `
    await pool.query(query, [makePrivate, ids])

    res.json({ success: true })
  } catch (error) {
    console.error('Помилка оновлення приватності фото:', error)
    res.status(500).json({ success: false, message: 'Помилка сервера' })
  }
})



export default router;
