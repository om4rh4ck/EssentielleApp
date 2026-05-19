import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

/**
 * Guard fonctionnel : exige un utilisateur authentifié.
 * Sinon redirige vers /login avec ?redirectTo=<url demandée>.
 */
export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });
};

/**
 * Factory de guard fonctionnel : exige un utilisateur authentifié ET
 * dont le rôle est dans la liste autorisée.
 *
 * Exemple d'usage dans app.routes.ts :
 *   { path: 'admin', canActivate: [roleGuard(['admin'])], ... }
 */
export function roleGuard(allowedRoles: User['role'][]): CanActivateFn {
  return (_route, state): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const user = auth.currentUser();
    if (!user) {
      return router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      // Authentifié mais mauvais rôle : on renvoie l'utilisateur vers
      // son propre dashboard plutôt que vers une page d'erreur générique.
      return router.createUrlTree([auth.getDashboardRoute(user)]);
    }

    return true;
  };
}
