import type { Request } from 'express';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---- Types partagés ----

export type UserRole = 'student' | 'instructor' | 'admin';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface StoredUser extends PublicUser {
  passwordHash: string;
}

// ---- Durée de vie des tokens ----

/** TTL d'un token d'authentification (7 jours). */
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** TTL d'un token de réinitialisation de mot de passe (1 heure). */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const DEFAULT_INSECURE_SECRET = 'dev-insecure-secret';

/**
 * Retourne le secret HMAC.
 *
 * En production (`NODE_ENV === 'production'`), la variable
 * `TOKEN_SECRET` ou `JWT_SECRET` DOIT être définie ET différente
 * de la valeur de développement, sinon le serveur lève une erreur
 * fatale au premier appel (donc au démarrage si on appelle
 * `assertTokenSecretConfigured` au boot).
 *
 * En dev, on accepte la valeur par défaut avec un warning.
 */
export function getTokenSecret(): string {
  const raw = process.env['TOKEN_SECRET'] ?? process.env['JWT_SECRET'] ?? '';
  const secret = raw.trim();
  const isProd = process.env['NODE_ENV'] === 'production';

  if (isProd) {
    if (!secret || secret === DEFAULT_INSECURE_SECRET || secret.length < 32) {
      throw new Error(
        '[SECURITY] TOKEN_SECRET (or JWT_SECRET) must be set in production ' +
          'to a random value of at least 32 characters. ' +
          'Refusing to start to avoid token forgery.',
      );
    }
    return secret;
  }

  if (!secret) {
    if (!warnedAboutInsecureSecret) {
      console.warn(
        '[SECURITY] TOKEN_SECRET is not set. Using an insecure default — ' +
          'dev only. Set TOKEN_SECRET before going to production.',
      );
      warnedAboutInsecureSecret = true;
    }
    return DEFAULT_INSECURE_SECRET;
  }

  return secret;
}

let warnedAboutInsecureSecret = false;

/**
 * À appeler une fois au démarrage pour valider la configuration
 * et fail-fast si TOKEN_SECRET manque en prod.
 */
export function assertTokenSecretConfigured(): void {
  getTokenSecret();
}

// ---- Hash / vérification de mot de passe ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}

// ---- Helpers email / username ----

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUsernameFromEmail(email: string): string {
  return normalizeEmail(email).split('@')[0] ?? '';
}

export function makeStoredUser(
  id: string,
  name: string,
  email: string,
  role: UserRole,
  password: string,
): StoredUser {
  return {
    id,
    name,
    email: normalizeEmail(email),
    username: getUsernameFromEmail(email),
    role,
    passwordHash: hashPassword(password),
  };
}

// ---- Tokens d'authentification (HMAC + exp) ----

interface AuthTokenPayload extends PublicUser {
  exp: number; // timestamp ms d'expiration
  iat: number; // timestamp ms d'émission
}

function createTokenSignature(payloadBase64Url: string): string {
  const secret = getTokenSecret();
  return createHmac('sha256', secret).update(payloadBase64Url).digest('base64url');
}

export function createToken(user: PublicUser, ttlMs: number = TOKEN_TTL_MS): string {
  const now = Date.now();
  const payload: AuthTokenPayload = {
    ...user,
    iat: now,
    exp: now + ttlMs,
  };
  const payloadBase64Url = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = createTokenSignature(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

/**
 * Décode et vérifie un token. Retourne `null` si :
 * - la signature HMAC est invalide
 * - le payload n'est pas un objet utilisateur valide
 * - le token est expiré
 */
export function decodeToken(token: string): PublicUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64Url, signature] = parts;
    const expectedSignature = createTokenSignature(payloadBase64Url);

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    const parsed = JSON.parse(
      Buffer.from(payloadBase64Url, 'base64url').toString('utf-8'),
    ) as Partial<AuthTokenPayload>;

    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;

    // Vérification d'expiration
    if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name ?? '',
      email: parsed.email,
      username: parsed.username ?? '',
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

// ---- Tokens de réinitialisation de mot de passe ----

export function createPasswordResetToken(email: string): string {
  const expiresAt = Date.now() + PASSWORD_RESET_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      expiresAt,
      type: 'password-reset',
    }),
    'utf-8',
  ).toString('base64url');
  const signature = createTokenSignature(payload);
  return `${payload}.${signature}`;
}

export function verifyPasswordResetToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64Url, signature] = parts;
    const expectedSignature = createTokenSignature(payloadBase64Url);

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    const parsed = JSON.parse(
      Buffer.from(payloadBase64Url, 'base64url').toString('utf-8'),
    ) as {
      email?: string;
      expiresAt?: number;
      type?: string;
    };

    if (parsed.type !== 'password-reset' || !parsed.email || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.email;
  } catch {
    return null;
  }
}

// ---- Extraction de l'utilisateur courant à partir d'une requête HTTP ----

export function getCurrentUser(
  req: Request,
  allowedRoles?: UserRole[],
): PublicUser | null {
  const authHeader = req.header('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = token ? decodeToken(token) : null;
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return user;
}
