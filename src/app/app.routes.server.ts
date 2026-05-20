import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dashboards protégés : rendu client uniquement (localStorage disponible, auth OK)
  { path: 'student', renderMode: RenderMode.Client },
  { path: 'student/**', renderMode: RenderMode.Client },
  { path: 'instructor', renderMode: RenderMode.Client },
  { path: 'instructor/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // Pages publiques : SSR pour le SEO
  { path: '**', renderMode: RenderMode.Server },
];
