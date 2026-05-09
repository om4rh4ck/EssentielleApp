export const STUDENT_MENU_ITEMS = [
  { label: 'Mon Espace', icon: 'dashboard', path: '/student' },
  { label: 'Catalogue', icon: 'library_books', path: '/student/catalog' },
  { label: 'Emploi', icon: 'calendar_month', path: '/student/schedule' },
  { label: 'Certificats', icon: 'workspace_premium', path: '/student/certificates' },
  { label: 'Messages', icon: 'mail', path: '/student/messages' },
  { label: 'Examen & Moyenne', icon: 'fact_check', path: '/student/exams' },
  { label: 'Mon Profil', icon: 'person', path: '/student/profile' },
] as const;
