import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Intercepteur HTTP fonctionnel.
 *
 * - Ajoute automatiquement l'en-tête `Authorization: Bearer <token>` à
 *   toutes les requêtes sortantes si un token est présent. Plus besoin
 *   d'appeler manuellement `authHeaders()` dans chaque service.
 *
 * - Sur réponse 401 (token absent, invalide, ou EXPIRÉ — voir la nouvelle
 *   logique d'expiration côté serveur), purge le token local et redirige
 *   l'utilisateur vers /login en conservant l'URL d'origine pour la
 *   redirection post-login.
 *
 * - On exclut explicitement les endpoints publics d'authentification
 *   (`/api/login`, `/api/register`, `/api/forgot-password`,
 *   `/api/reset-password`) du traitement 401 — un échec de login ne doit
 *   pas déclencher de logout/redirect.
 */
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/login',
  '/api/register',
  '/api/forgot-password',
  '/api/reset-password',
];

function isPublicAuthEndpoint(url: string): boolean {
  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuthEndpoint(req.url)
      ) {
        // Token expiré ou invalide : on purge et on renvoie vers /login.
        auth.logout();
        void router.navigate(['/login'], {
          queryParams: { redirectTo: router.url },
        });
      }
      return throwError(() => error);
    }),
  );
};
