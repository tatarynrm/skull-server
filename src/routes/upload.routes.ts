import express from 'express';
import { createUploader } from '../middleware/multer/uploadFiles';
import { pool } from '../db/pool';

const upload = createUploader();
const router = express.Router();

// Завантаження аватара (один файл)
router.post('/avatar', upload.single('file'), (req, res) => {
  res.json({ path: req.file?.path });
});


// Завантаження документів вантажівки (кілька файлів)
router.post('/truck-documents', upload.array('files',10), (req, res) => {
  const paths = (req.files as Express.Multer.File[]).map(f => f.path);
  res.json({ paths });
});

// Завантаження фото вантажівки (кілька файлів)
router.post('/truck-photos', upload.array('files',10), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  const truckId = req.headers['truck_id'] as string || '321313'

  if (!truckId) {
   res.status(400).json({ error: 'Missing truck_id in headers' }); return 
  }

  if (!files || files.length === 0) {
     res.status(400).json({ error: 'No files uploaded' });return
  }

  try {
    // Записуємо шляхи у таблицю truck_photos
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const insertPromises = files.map(file => {
        return client.query(
          `INSERT INTO truck_photos (truck_id, path, uploaded_at) VALUES ($1, $2, NOW())`,
          [truckId, file.path]
        );
      });

      await Promise.all(insertPromises);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Відповідаємо клієнту
    res.json({ paths: files.map(f => f.path) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;