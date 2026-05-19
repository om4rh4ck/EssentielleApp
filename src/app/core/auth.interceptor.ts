import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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
        !isPublicAuthEndpoint(req.url) &&
        !auth.getToken()
      ) {
        auth.logout();
        void router.navigate(['/login'], {
          queryParams: { redirectTo: router.url },
        });
      }

      return throwError(() => error);
    }),
  );
};
