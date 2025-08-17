import multer from 'multer';
import path from 'path';
import fs from 'fs';

export function createUploader() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // company_id з headers
      const companyId = req.headers['company_id'] as string | undefined;
      // type з body (multipart/form-data поля)
      const type = req.headers['type'] as string | undefined;

      if (!companyId || !type) {
        return cb(new Error('Missing company_id or type'), '');
      }

      let folder = '';

      if (type === 'avatar') {
        folder = `uploads/${companyId}/avatar`;
      } else if (type === 'truckPhoto') {
        folder = `uploads/${companyId}/truck-photos`;
      } else if (type === 'truckDoc') {
        folder = `uploads/${companyId}/truck-documents`;
      } else {
        return cb(new Error('Invalid upload type'), '');
      }

      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      const unique = `${base}-${Date.now()}${ext}`;
      cb(null, unique);
    }
  });

  return multer({ storage });
}
