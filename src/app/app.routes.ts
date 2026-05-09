import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/public-layout/public-layout').then(m => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/landing/landing').then(m => m.LandingComponent)
      },
      {
        path: 'formations',
        loadComponent: () => import('./pages/formations/formations').then(m => m.FormationsComponent)
      },
      {
        path: 'formation',
        loadComponent: () => import('./pages/formations/formations').then(m => m.FormationsComponent)
      },
      {
        path: 'formations/:id/inscription',
        loadComponent: () => import('./pages/formations/formation-enrollment').then(m => m.FormationEnrollmentComponent)
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent)
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'student',
    loadComponent: () => import('./pages/student/student-dashboard').then(m => m.StudentDashboardComponent)
  },
  {
    path: 'student/catalog',
    loadComponent: () => import('./pages/student/student-catalog').then(m => m.StudentCatalogComponent)
  },
  {
    path: 'student/schedule',
    loadComponent: () => import('./pages/student/student-schedule').then(m => m.StudentScheduleComponent)
  },
  {
    path: 'student/certificates',
    loadComponent: () => import('./pages/student/student-certificates').then(m => m.StudentCertificatesComponent)
  },
  {
    path: 'student/messages',
    loadComponent: () => import('./pages/student/student-messages').then(m => m.StudentMessagesComponent)
  },
  {
    path: 'student/exams',
    loadComponent: () => import('./pages/student/student-exams').then(m => m.StudentExamsComponent)
  },
  {
    path: 'student/profile',
    loadComponent: () => import('./pages/student/student-profile').then(m => m.StudentProfileComponent)
  },
  {
    path: 'student/course/:id',
    loadComponent: () => import('./pages/course-detail/course-detail').then(m => m.CourseDetailComponent)
  },
  {
    path: 'instructor',
    loadComponent: () => import('./pages/instructor/instructor-dashboard').then(m => m.InstructorDashboardComponent)
  },
  {
    path: 'instructor/courses',
    loadComponent: () => import('./pages/instructor/instructor-courses').then(m => m.InstructorCoursesComponent)
  },
  {
    path: 'instructor/formulas',
    loadComponent: () => import('./pages/instructor/instructor-formulas').then(m => m.InstructorFormulasComponent)
  },
  {
    path: 'instructor/resources',
    loadComponent: () => import('./pages/instructor/instructor-resources').then(m => m.InstructorResourcesComponent)
  },
  {
    path: 'instructor/schedule',
    loadComponent: () => import('./pages/instructor/instructor-schedule').then(m => m.InstructorScheduleComponent)
  },
  {
    path: 'instructor/students',
    loadComponent: () => import('./pages/instructor/instructor-students').then(m => m.InstructorStudentsComponent)
  },
  {
    path: 'instructor/messages',
    loadComponent: () => import('./pages/instructor/instructor-messages').then(m => m.InstructorMessagesComponent)
  },
  {
    path: 'instructor/exams',
    loadComponent: () => import('./pages/instructor/instructor-exams').then(m => m.InstructorExamsComponent)
  },
  {
    path: 'instructor/settings',
    loadComponent: () => import('./pages/instructor/instructor-profile').then(m => m.InstructorProfileComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-dashboard').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/admin-users').then(m => m.AdminUsersComponent)
  },
  {
    path: 'admin/messages',
    loadComponent: () => import('./pages/admin/admin-messages').then(m => m.AdminMessagesComponent)
  },
  {
    path: 'admin/courses',
    loadComponent: () => import('./pages/admin/admin-courses').then(m => m.AdminCoursesComponent)
  },
  {
    path: 'admin/payments',
    loadComponent: () => import('./pages/admin/admin-payments').then(m => m.AdminPaymentsComponent)
  },
  {
    path: 'admin/stats',
    loadComponent: () => import('./pages/admin/admin-stats').then(m => m.AdminStatsComponent)
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./pages/admin/admin-settings').then(m => m.AdminSettingsComponent)
  }
];
