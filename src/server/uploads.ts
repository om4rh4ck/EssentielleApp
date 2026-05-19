import type { Application, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import { mkdirSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from './auth';

/** Dossier racine où les médias sont stockés (créé si absent). */
export const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

/** Préfixe HTTP sous lequel les médias sont servis. */
export const UPLOAD_URL_PREFIX = '/uploads';

const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024; // 250 Mo (vidéos de cours)

const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'image/',
  'video/',
  'audio/',
];

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname || '').toLowerCase().slice(0, 12);
    const id = randomBytes(12).toString('hex');
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    if (!ok) {
      cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Monte les routes d'upload de médias.
 *
 * - `POST /api/uploads` : nécessite un token valide (instructor ou admin),
 *   accepte un seul fichier sous le champ `file`. Retourne `{ url, filename, size, mimetype }`.
 * - `GET /uploads/*` : sert statiquement les fichiers depuis `public/uploads/`.
 *
 * À utiliser depuis le frontend pour remplacer progressivement les
 * `pdfDataUrl` / `videoDataUrl` / `audioDataUrl` par des URLs propres.
 */
export function registerUploadRoutes(app: Application): void {
  // Serving statique
  app.use(
    UPLOAD_URL_PREFIX,
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      index: false,
      redirect: false,
    }),
  );

  app.post('/api/uploads', (req: Request, res: Response) => {
    const user = getCurrentUser(req, ['instructor', 'admin']);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }

    const single = upload.single('file');
    single(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === 'UNSUPPORTED_MEDIA_TYPE') {
          res.status(415).json({ error: 'Type de fichier non supporté.' });
          return;
        }
        if (message.includes('File too large')) {
          res.status(413).json({ error: 'Fichier trop volumineux (max 250 Mo).' });
          return;
        }
        console.error('[UPLOAD] failed', err);
        res.status(500).json({ error: 'Échec de l upload.' });
        return;
      }

      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: 'Aucun fichier reçu (champ attendu: file).' });
        return;
      }

      res.json({
        url: `${UPLOAD_URL_PREFIX}/${file.filename}`,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    });
  });
}
