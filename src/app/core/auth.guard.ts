import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  // SSR n'a pas accès à localStorage : on laisse le client gérer l'auth
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};

export function roleGuard(allowedRoles: User['role'][]): CanActivateFn {
  return (_route, state): boolean | UrlTree => {
    if (isPlatformServer(inject(PLATFORM_ID))) return true;

    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();

    if (!user) {
      return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
    }

    if (!allowedRoles.includes(user.role)) {
      return router.createUrlTree([auth.getDashboardRoute(user)]);
    }

    return true;
  };
}
