export const ADMIN_MENU_ITEMS = [
  { label: 'Tableau de bord', icon: 'dashboard', path: '/admin' },
  { label: 'Utilisatrices & Accès', icon: 'group', path: '/admin/users' },
  { label: 'Messages', icon: 'mail', path: '/admin/messages' },
  { label: 'Catalogue Formations', icon: 'school', path: '/admin/courses' },
  { label: 'Paiements & Abos', icon: 'payments', path: '/admin/payments' },
  { label: 'Statistiques Globales', icon: 'insights', path: '/admin/stats' },
  { label: 'Paramètres', icon: 'settings', path: '/admin/settings' },
] as const;
