export const INSTRUCTOR_MENU_ITEMS = [
  { label: 'Tableau de bord', icon: 'dashboard', path: '/instructor' },
  { label: 'Mes Formations', icon: 'video_library', path: '/instructor/courses' },
  { label: 'Formules', icon: 'sell', path: '/instructor/formulas' },
  { label: 'Emploi du temps', icon: 'event_note', path: '/instructor/schedule' },
  { label: 'Sessions & Ressources', icon: 'perm_media', path: '/instructor/resources' },
  { label: 'Étudiantes', icon: 'groups', path: '/instructor/students' },
  { label: 'Messages / Q&A', icon: 'forum', path: '/instructor/messages' },
  { label: 'Examens', icon: 'fact_check', path: '/instructor/exams' },
  { label: 'Profil', icon: 'person', path: '/instructor/settings' },
] as const;
