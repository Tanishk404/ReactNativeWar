import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import deviceAuth from '../middleware/deviceAuth.js';

const router = Router();
const uploadDir = path.resolve('private-uploads');

await fs.mkdir(uploadDir, { recursive: true });

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp'
]);

const mimeToExt = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/3gpp': '.3gp'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = mimeToExt[file.mimetype] || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported photo/video type'));
    }
    cb(null, true);
  }
});

router.post(
  '/upload',
  deviceAuth,
  (req, res, next) => {
    upload.single('file')(req, res, error => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Upload failed'
        });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    res.json({ message: 'File backed up successfully' });
  }
);

export default router;