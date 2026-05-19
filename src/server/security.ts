import type { Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Applique les middlewares de sécurité HTTP de base à l'application.
 *
 * - `helmet()` pose les headers de sécurité standards (X-Content-Type-Options,
 *   Referrer-Policy, Strict-Transport-Security, etc.). On désactive la CSP
 *   par défaut car elle casserait les data: URLs encore utilisées par
 *   l'application (images, médias inline) — à réactiver finement quand la
 *   migration des médias vers le filesystem sera terminée côté frontend.
 * - Cross-Origin-Resource-Policy: 'cross-origin' pour pouvoir servir les
 *   assets `/uploads` et `/public` depuis d'autres origines si besoin.
 */
export function applyBaseSecurity(app: Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}

/**
 * Rate-limiter strict pour les routes d'authentification sensibles
 * (login, register, forgot-password). 10 requêtes max par IP par 15 min.
 *
 * `skipSuccessfulRequests: true` sur le login pour ne pénaliser que les
 * tentatives échouées (bruteforce), pas les utilisateurs légitimes qui
 * se reconnectent.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, veuillez réessayer dans quelques minutes.' },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans quelques minutes.' },
});

/**
 * Rate-limiter global beaucoup plus permissif pour toutes les autres routes
 * `/api/*`. Évite le DoS basique tout en restant invisible pour un usage normal.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez ralentir.' },
});
