import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request } from 'express';
import { join } from 'node:path';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import mysql, { Pool } from 'mysql2/promise';

const browserDistFolder = join(import.meta.dirname, '../browser');

type UserRole = 'student' | 'instructor' | 'admin';
type CourseAccess = 'free' | 'paid';
type CourseStatus = 'published' | 'draft';
type MessageRole = 'student' | 'instructor' | 'admin';

interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface StoredUser extends PublicUser {
  passwordHash: string;
}

interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  city?: string;
  country?: string;
  objective?: string;
}

interface LoginPayload {
  email?: string;
  password?: string;
}

interface Course {
  id: string;
  title: string;
  instructorId: string;
  modules: number;
  students: number;
  thumbnail: string;
  description: string;
  access: CourseAccess;
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  priceMinEur?: number;
  priceMaxEur?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  certificateOptions?: number[];
  category: string;
  status: CourseStatus;
  presentation?: string;
  warning?: string;
  objectives?: string[];
  contentItems?: Array<{
    id: string;
    text: string;
  }>;
  chapters?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  programModules?: Array<{
    id: string;
    title: string;
    chapters: string[];
  }>;
  galleryImages?: string[];
  moduleItems?: Array<{
    id: string;
    title: string;
    pdfName: string;
    pdfDataUrl: string;
    videoName?: string;
    videoDataUrl?: string;
    audioName?: string;
    audioDataUrl?: string;
  }>;
}

interface TrainingFormula {
  id: string;
  title: string;
  description: string;
  image: string;
  highlights: string[];
  instructorId: string;
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  status: CourseStatus;
}

interface PublicEnrollmentRequest {
  id: string;
  courseId: string;
  courseTitle: string;
  courseAccess: CourseAccess;
  studentId?: string;
  formulaId?: string;
  formulaTitle?: string;
  certificateCount?: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  message: string;
  status: 'pending' | 'approved';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface RevenueRow {
  month: string;
  amount: number;
}

interface StudentEnrollment {
  courseId: string;
  progress: number;
}

interface StudentCertificate {
  id: string;
  courseId: string;
  title: string;
  issuedAt: string;
  status: 'issued' | 'pending';
  signedBy: string;
}

interface StudentProfileData {
  phone: string;
  city: string;
  country: string;
  objective: string;
}

interface RoleProfileData {
  phone: string;
  city: string;
  country: string;
  bio: string;
}

interface StudentWorkspace {
  enrollments: StudentEnrollment[];
  certificates: StudentCertificate[];
  profile: StudentProfileData;
}

interface MessageRecord {
  id: string;
  studentId: string;
  studentName: string;
  senderId: string;
  senderRole: MessageRole;
  senderName: string;
  recipientId: string;
  recipientRole: MessageRole;
  recipientName: string;
  recipientDisplayName?: string;
  recipientDisplayNameFinal?: string;
  subject: string;
  content: string;
  sentAt: string;
}

interface LiveSession {
  id: string;
  title: string;
  courseId: string;
  scheduledAt: string;
  meetLink: string;
  notes: string;
  createdBy: string;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  courseId: string;
  type: 'pdf' | 'video' | 'audio' | 'link';
  url: string;
  createdBy: string;
}

interface ScheduleEntry {
  id: string;
  title: string;
  courseId: string;
  day: string;
  startTime: string;
  endTime: string;
  format: 'online' | 'onsite' | 'hybrid';
  room: string;
  notes: string;
  createdBy: string;
}

interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
}

interface ExamTemplate {
  id: string;
  title: string;
  courseId: string;
  assignedBy: string;
  dueDate: string;
  questions: ExamQuestion[];
}

interface StudentAttempt {
  examId: string;
  answers: number[];
  score: number;
  submittedAt: string;
}

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  amountEur: number;
  status: 'paid' | 'pending';
  paidAt: string;
}

interface AdminStatsSnapshot {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalAdmins: number;
  activeCourses: number;
  freeCourses: number;
  paidCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  pendingRevenue: number;
  paidPayments: number;
  pendingPayments: number;
  averageBasket: number;
  revenueData: RevenueRow[];
  topCourses: Array<{
    id: string;
    title: string;
    access: CourseAccess;
    status: CourseStatus;
    enrollments: number;
    revenue: number;
    priceEur: number;
  }>;
  recentPayments: Array<PaymentRecord & { courseTitle: string }>;
}

const app = express();
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['*'],
  trustProxyHeaders: true,
});

let dbPool: Pool | null = null;
let useMemoryStore = false;
let serverStarted = false;

const memoryUsers: StoredUser[] = [
  makeStoredUser('1', 'Admin User', 'admin@lessentielle-sante.site', 'admin', 'password123'),
  makeStoredUser('2', 'Dr. Expert', 'instructor@lessentielle-sante.site', 'instructor', 'password123'),
  makeStoredUser('3', 'Jane Doe', 'student@lessentielle-sante.site', 'student', 'password123'),
];

const courses: Course[] = [
  {
    id: '1',
    title: 'Nutrition et Pathologie courante',
    instructorId: '2',
    modules: 5,
    students: 210,
    thumbnail: 'module-nutrition-pathologie.svg',
    description: 'Comprendre les pathologies courantes comme l’hypertension et le diabète grâce à une approche nutritionnelle claire.',
    access: 'free',
    priceEur: 0,
    priceTnd: 0,
    priceUsd: 0,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    category: 'Nutrition',
    status: 'published',
    presentation: "Bienvenue dans la formation Essenti'elle Santé. Cette formation a été conçue pour permettre à chaque femme de comprendre son corps, améliorer sa santé et accompagner d'autres femmes.",
    warning: "Cette formation ne remplace pas un professionnel de santé. Elle a pour but d'éduquer et d'accompagner vers une meilleure hygiène de vie.",
    objectives: [
      'Comprendre les bases de la nutrition',
      'Identifier les déséquilibres',
      'Mettre en place une détox adaptée',
      'Proposer des programmes personnalisés',
    ],
    contentItems: [
      { id: 'content-1-1', text: 'PDF de cours et supports visuels' },
      { id: 'content-1-2', text: 'Vidéos explicatives par module' },
      { id: 'content-1-3', text: 'Examens de validation' },
      { id: 'content-1-4', text: 'QCM de contrôle des acquis' },
    ],
    chapters: [
      { id: 'chapter-1-1', title: 'Chapitre 1 : Les bases de la nutrition', content: "Les macronutriments, leur rôle, les bonnes associations alimentaires et les premières bases d'équilibre nutritionnel." },
      { id: 'chapter-1-2', title: 'Chapitre 2 : L’inflammation', content: 'Comprendre les facteurs inflammatoires, les erreurs alimentaires fréquentes et les pistes naturelles pour apaiser le terrain.' },
      { id: 'chapter-1-3', title: 'Chapitre 3 : Diabète', content: 'Identifier les mécanismes du diabète, choisir les bons aliments et adapter l’accompagnement au quotidien.' },
      { id: 'chapter-1-4', title: 'Chapitre 4 : Hypertension', content: 'Mettre en place une hygiène de vie adaptée, réduire les facteurs aggravants et soutenir l’équilibre cardiovasculaire.' },
      { id: 'chapter-1-5', title: 'Chapitre 5 : Troubles digestifs', content: 'Analyser les causes fréquentes, renforcer la digestion et proposer un protocole alimentaire plus confortable.' },
    ],
    moduleItems: [],
  },
  {
    id: '2',
    title: 'Détox & perte de poids',
    instructorId: '2',
    modules: 5,
    students: 185,
    thumbnail: 'module-detox-poids.svg',
    description: 'Un protocole professionnel pour la détox, la silhouette et l’accompagnement durable de la perte de poids.',
    access: 'paid',
    priceEur: 349,
    priceTnd: 1175,
    priceUsd: 378,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    category: 'Détox',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '3',
    title: 'Détox Émonctoires',
    instructorId: '2',
    modules: 5,
    students: 95,
    thumbnail: 'module-emonctoires.svg',
    description: 'Une formation dédiée aux reins, au foie et aux intestins pour comprendre les émonctoires et leurs déséquilibres.',
    access: 'paid',
    priceEur: 329,
    priceTnd: 1108,
    priceUsd: 357,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    category: 'Émonctoires',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '4',
    title: 'Détox peau',
    instructorId: '2',
    modules: 5,
    students: 120,
    thumbnail: 'module-detox-peau.svg',
    description: 'Une approche peau, beauté et bien-être pour construire un accompagnement féminin complet.',
    access: 'free',
    priceEur: 0,
    priceTnd: 0,
    priceUsd: 0,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    category: 'Peau',
    status: 'published',
    moduleItems: [],
  },
];

courses.push(
  {
    id: '5',
    title: 'Formation Reflexologie (oreille / pieds / mains)',
    instructorId: '2',
    modules: 8,
    students: 64,
    thumbnail: 'formation-reflexologie.svg',
    description: 'Apprenez les techniques de reflexologie auriculaire, plantaire et palmaire avec un parcours professionnalisant adaptable selon 1 a 3 certificats.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 2900,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Reflexologie',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '6',
    title: 'Formation Kinesiologie (muscles & articulations)',
    instructorId: '2',
    modules: 10,
    students: 41,
    thumbnail: 'formation-kinesiologie.svg',
    description: 'Une formation axee sur la lecture musculaire, les articulations et les protocoles de correction, avec tarification selon 1 a 3 certificats.',
    access: 'paid',
    priceEur: 1800,
    priceMinEur: 1800,
    priceMaxEur: 3860,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Kinesiologie',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '7',
    title: 'Massage visage & cou anti-age',
    instructorId: '2',
    modules: 6,
    students: 92,
    thumbnail: 'formation-massage-visage.svg',
    description: 'Maitrisez les protocoles de massage anti-age du visage et du cou pour une pratique esthetique douce et efficace.',
    access: 'paid',
    priceEur: 590,
    priceMinEur: 590,
    priceMaxEur: 1500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Massage',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '8',
    title: 'Massage anti-cellulite & drainage lymphatique',
    instructorId: '2',
    modules: 7,
    students: 76,
    thumbnail: 'formation massage anti.jpeg',
    description: 'Un parcours complet pour proposer des soins de drainage, remodelage et accompagnement anti-cellulite avec certifications au choix.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 2500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Drainage',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '9',
    title: 'Soins infirmiers (pansement, perfusion, suture)',
    instructorId: '2',
    modules: 12,
    students: 38,
    thumbnail: 'formation-soins-infirmiers.svg',
    description: 'Renforcez vos gestes techniques autour des pansements, perfusions et sutures avec un programme structure et certifiant.',
    access: 'paid',
    priceEur: 1190,
    priceMinEur: 1190,
    priceMaxEur: 4500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Soins infirmiers',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '10',
    title: 'Aide a la personne agee',
    instructorId: '2',
    modules: 9,
    students: 57,
    thumbnail: 'formation-aide-personne-agee.svg',
    description: 'Formez-vous a l accompagnement humain, pratique et securise de la personne agee a domicile ou en structure.',
    access: 'paid',
    priceEur: 1700,
    priceMinEur: 1700,
    priceMaxEur: 3000,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Service a la personne',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '11',
    title: 'Herboristerie & phytotherapie',
    instructorId: '2',
    modules: 8,
    students: 83,
    thumbnail: 'formation-herboristerie.svg',
    description: 'Developpez une pratique structuree autour des plantes, des synergies naturelles et des bases de la phytotherapie appliquee.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 3500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Phytotherapie',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '12',
    title: 'Hijama / Cupping / Ventouses',
    instructorId: '2',
    modules: 6,
    students: 69,
    thumbnail: 'formation-hijama.svg',
    description: 'Une formation pratique sur les ventouses, la hijama et les precautions essentielles pour exercer dans un cadre professionnel.',
    access: 'paid',
    priceEur: 600,
    priceMinEur: 600,
    priceMaxEur: 2000,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Ventouses',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '13',
    title: 'Formation Detox Therapeutique Complete',
    instructorId: '2',
    modules: 10,
    students: 118,
    thumbnail: 'formation%20detox/im1.jpeg',
    description: 'Purifiez votre corps, retrouvez votre energie, revelez votre eclat avec une formation detox complete incluant perte de poids, detox des 5 emonctoires et detox peau.',
    access: 'paid',
    priceEur: 790,
    priceMinEur: 790,
    priceMaxEur: 1590,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Detox',
    status: 'published',
    presentation: 'Formation detox complete incluant detox perte de poids, detox des 5 emonctoires et detox peau pour accompagner la purification du corps, l energie, la vitalite et l eclat naturel.',
    galleryImages: [
      'formation%20detox/im1.jpeg',
      'formation%20detox/im2.jpeg',
      'formation%20detox/im3.jpeg',
      'formation%20detox/im4.jpeg',
      'formation%20detox/im5.jpeg',
      'formation%20detox/im6.jpeg',
      'formation%20detox/im7.jpeg',
      'formation%20detox/im8.jpeg',
    ],
    objectives: [
      'Eliminer les toxines',
      'Retrouver votre legerete',
      'Reveler votre eclat naturel',
      'Retrouver energie et vitalite',
    ],
    contentItems: [
      { id: 'content-13-1', text: '10 modules' },
      { id: 'content-13-2', text: '5 chapitres par module' },
      { id: 'content-13-3', text: 'Detox perte de poids' },
      { id: 'content-13-4', text: 'Detox des 5 emonctoires' },
      { id: 'content-13-5', text: 'Detox peau' },
    ],
    chapters: [
      { id: 'chapter-13-1', title: 'Certification France', content: '790 EUR' },
      { id: 'chapter-13-2', title: 'Certification France + Tunisie', content: '1590 EUR' },
    ],
    programModules: [
      {
        id: 'detox-module-1',
        title: 'Module 1 / Les bases de la detox',
        chapters: [
          'Chapitre 1 : Qu est-ce que la detox ?',
          'Chapitre 2 : Pourquoi detoxifier son corps ?',
          'Chapitre 3 : Les bienfaits d une detox',
          'Chapitre 4 : Les bonnes pratiques',
          'Chapitre 5 : Plan de detox personnalise',
        ],
      },
      {
        id: 'detox-module-2',
        title: 'Module 2 / Detox perte de poids',
        chapters: [
          'Chapitre 1 : Comprendre la prise de poids',
          'Chapitre 2 : Aliments detox brule-graisses',
          'Chapitre 3 : Menus detox perte de poids',
          'Chapitre 4 : Activite physique et detox',
          'Chapitre 5 : Conseils pratiques pour mincir durablement',
        ],
      },
      {
        id: 'detox-module-3',
        title: 'Module 3 / Les 5 emonctoires',
        chapters: [
          'Chapitre 1 : Les 5 emonctoires et leurs roles',
          'Chapitre 2 : Le foie',
          'Chapitre 3 : Les reins',
          'Chapitre 4 : Les intestins',
          'Chapitre 5 : Les poumons et la peau',
        ],
      },
      {
        id: 'detox-module-4',
        title: 'Module 4 / Detox foie',
        chapters: [
          'Chapitre 1 : Role du foie',
          'Chapitre 2 : Signes d un foie surcharge',
          'Chapitre 3 : Aliments drainants pour le foie',
          'Chapitre 4 : Plantes et tisanes depuratives',
          'Chapitre 5 : Programme detox foie',
        ],
      },
      {
        id: 'detox-module-5',
        title: 'Module 5 / Detox reins',
        chapters: [
          'Chapitre 1 : Role des reins',
          'Chapitre 2 : Signes de surcharge renale',
          'Chapitre 3 : Aliments et boissons diuretiques',
          'Chapitre 4 : Plantes detoxifiantes',
          'Chapitre 5 : Programme detox reins',
        ],
      },
      {
        id: 'detox-module-6',
        title: 'Module 6 / Detox intestinale',
        chapters: [
          'Chapitre 1 : Role de l intestin',
          'Chapitre 2 : Signes d un intestin encrasse',
          'Chapitre 3 : Aliments riches en fibres',
          'Chapitre 4 : Probiotiques et prebiotiques',
          'Chapitre 5 : Programme detox intestinale',
        ],
      },
      {
        id: 'detox-module-7',
        title: 'Module 7 / Detox poumons',
        chapters: [
          'Chapitre 1 : Role des poumons',
          'Chapitre 2 : Polluants et toxines respiratoires',
          'Chapitre 3 : Aliments et plantes expectorantes',
          'Chapitre 4 : Respiration et exercices',
          'Chapitre 5 : Programme detox poumons',
        ],
      },
      {
        id: 'detox-module-8',
        title: 'Module 8 / Detox peau',
        chapters: [
          'Chapitre 1 : La peau, miroir de l interieur',
          'Chapitre 2 : Causes des problemes de peau',
          'Chapitre 3 : Aliments pour une peau saine',
          'Chapitre 4 : Soins naturels detoxifiants',
          'Chapitre 5 : Programme detox peau',
        ],
      },
      {
        id: 'detox-module-9',
        title: 'Module 9 / Alimentation detox',
        chapters: [
          'Chapitre 1 : Principes d une alimentation detox',
          'Chapitre 2 : Aliments a privilegier',
          'Chapitre 3 : Aliments a limiter ou eviter',
          'Chapitre 4 : Idees de menus detox',
          'Chapitre 5 : Organisation et batch cooking',
        ],
      },
      {
        id: 'detox-module-10',
        title: 'Module 10 / Suivi et maintien apres detox',
        chapters: [
          'Chapitre 1 : Reprise alimentaire en douceur',
          'Chapitre 2 : Habitudes saines a garder',
          'Chapitre 3 : Gerer les ecarts',
          'Chapitre 4 : Energie et vitalite au quotidien',
          'Chapitre 5 : Plan d entretien personnalise',
        ],
      },
    ],
    moduleItems: [
      {
        id: 'module-13-1',
        title: 'Formation Detox Complete - PDF integral',
        pdfName: 'FORMATION DETOX COMPLETE.pdf',
        pdfDataUrl: 'formation%20detox/FORMATION%20D%C3%89TOX%20COMPL%C3%88TE.pdf',
      },
    ],
  },
  {
    id: '14',
    title: 'Formation Nutrition & Pathologies',
    instructorId: '2',
    modules: 11,
    students: 101,
    thumbnail: 'formation nutrition.jpeg',
    description: 'Approfondissez la nutrition fonctionnelle appliquee aux pathologies, avec un parcours avance disponible selon 1 a 3 certificats.',
    access: 'paid',
    priceEur: 2590,
    priceMinEur: 2590,
    priceMaxEur: 5990,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Nutrition',
    status: 'published',
    moduleItems: [],
  },
  {
    id: '15',
    title: 'Formation professionnelle complete en Cupping Therapie (Ventouses)',
    instructorId: '2',
    modules: 10,
    students: 0,
    thumbnail: 'cupping.jpeg',
    description: 'Approche bien-etre, relaxation et accompagnement naturel pour maitriser les techniques professionnelles de ventouses et proposer des seances securisees.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 2000,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2],
    promoEnabled: false,
    category: 'Ventouses',
    status: 'published',
    presentation: 'Une formation professionnelle complete en cupping therapie orientee bien-etre, relaxation et accompagnement naturel, pour realiser des seances adaptees aux besoins des clientes en respectant les precautions essentielles.',
    objectives: [
      'Maitriser les techniques professionnelles de ventouses',
      'Comprendre les bienfaits du cupping therapie',
      'Realiser des seances bien-etre securisees',
      'Stimuler la circulation sanguine et energetique',
      'Soulager les tensions musculaires et le stress',
      'Mettre en place des protocoles adaptes aux besoins clients',
      'Respecter les precautions et contre-indications',
      'Developper une activite professionnelle dans le bien-etre',
    ],
    contentItems: [
      { id: 'content-15-1', text: 'Formation complete professionnelle' },
      { id: 'content-15-2', text: 'Supports PDF detailles' },
      { id: 'content-15-3', text: 'Videos demonstratives' },
      { id: 'content-15-4', text: 'Protocoles professionnels' },
      { id: 'content-15-5', text: 'Certification reconnue' },
      { id: 'content-15-6', text: 'Acces en ligne illimite' },
      { id: 'content-15-7', text: 'Formation a votre rythme' },
    ],
    chapters: [
      { id: 'chapter-15-1', title: 'Certification France', content: '990 EUR' },
      { id: 'chapter-15-2', title: 'Certification France + Tunisie', content: '2000 EUR' },
    ],
    programModules: [
      {
        id: 'cupping-module-1',
        title: 'Module 1 / Introduction au Cupping Therapie',
        chapters: [
          'Chapitre 1 : Histoire des ventouses',
          'Chapitre 2 : Origines et traditions',
          'Chapitre 3 : Principes du cupping',
          'Chapitre 4 : Bienfaits generaux',
          'Chapitre 5 : Indications et limites',
        ],
      },
      {
        id: 'cupping-module-2',
        title: 'Module 2 / Anatomie et physiologie',
        chapters: [
          'Chapitre 1 : Anatomie du corps humain',
          'Chapitre 2 : Systeme musculaire',
          'Chapitre 3 : Circulation sanguine',
          'Chapitre 4 : Systeme lymphatique',
          'Chapitre 5 : Zones sensibles et precautions',
        ],
      },
      {
        id: 'cupping-module-3',
        title: 'Module 3 / Materiel et hygiene professionnelle',
        chapters: [
          'Chapitre 1 : Les differents types de ventouses',
          'Chapitre 2 : Utilisation du materiel',
          'Chapitre 3 : Desinfection et hygiene',
          'Chapitre 4 : Installation de l espace de soin',
          'Chapitre 5 : Securite professionnelle',
        ],
      },
      {
        id: 'cupping-module-4',
        title: 'Module 4 / Techniques de ventouses seches',
        chapters: [
          'Chapitre 1 : Pose des ventouses',
          'Chapitre 2 : Aspiration manuelle et mecanique',
          'Chapitre 3 : Temps de pose',
          'Chapitre 4 : Techniques statiques',
          'Chapitre 5 : Protocoles de base',
        ],
      },
      {
        id: 'cupping-module-5',
        title: 'Module 5 / Ventouses mobiles et massage',
        chapters: [
          'Chapitre 1 : Massage aux ventouses',
          'Chapitre 2 : Utilisation des huiles',
          'Chapitre 3 : Techniques glissees',
          'Chapitre 4 : Relaxation musculaire',
          'Chapitre 5 : Seance complete bien-etre',
        ],
      },
      {
        id: 'cupping-module-6',
        title: 'Module 6 / Cupping et relaxation',
        chapters: [
          'Chapitre 1 : Gestion du stress',
          'Chapitre 2 : Relaxation profonde',
          'Chapitre 3 : Respiration et detente',
          'Chapitre 4 : Ambiance therapeutique',
          'Chapitre 5 : Protocoles anti-fatigue',
        ],
      },
      {
        id: 'cupping-module-7',
        title: 'Module 7 / Protocoles cibles',
        chapters: [
          'Chapitre 1 : Douleurs musculaires',
          'Chapitre 2 : Tensions dorsales',
          'Chapitre 3 : Jambes lourdes',
          'Chapitre 4 : Fatigue physique',
          'Chapitre 5 : Bien-etre global',
        ],
      },
      {
        id: 'cupping-module-8',
        title: 'Module 8 / Precautions et contre-indications',
        chapters: [
          'Chapitre 1 : Contre-indications medicales',
          'Chapitre 2 : Peaux sensibles',
          'Chapitre 3 : Femmes enceintes',
          'Chapitre 4 : Reactions cutanees',
          'Chapitre 5 : Gestion des risques',
        ],
      },
      {
        id: 'cupping-module-9',
        title: 'Module 9 / Accueil et accompagnement client',
        chapters: [
          'Chapitre 1 : Accueil client',
          'Chapitre 2 : Questionnaire bien-etre',
          'Chapitre 3 : Analyse des besoins',
          'Chapitre 4 : Conseils apres seance',
          'Chapitre 5 : Fidelisation clientele',
        ],
      },
      {
        id: 'cupping-module-10',
        title: 'Module 10 / Pratique professionnelle et etudes de cas',
        chapters: [
          'Chapitre 1 : Deroulement d une seance complete',
          'Chapitre 2 : Etudes de cas pratiques',
          'Chapitre 3 : Construction d un protocole personnalise',
          'Chapitre 4 : Organisation professionnelle',
          'Chapitre 5 : Examen final pratique et theorique',
        ],
      },
    ],
    moduleItems: [],
  },
);

const formulas: TrainingFormula[] = [
  {
    id: 'formula-1',
    title: 'Formule 1',
    description: '1 formation complète avec certificat français pour démarrer rapidement avec une reconnaissance claire.',
    image: 'module-nutrition-pathologie.svg',
    highlights: [
      '1 formation en ligne complète',
      'Certificat français',
      'Accès aux supports pédagogiques',
    ],
    instructorId: '2',
    priceEur: 550,
    priceTnd: 1854,
    priceUsd: 595,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'published',
  },
  {
    id: 'formula-2',
    title: 'Formule 2',
    description: 'La formule formation avec double certification française et tunisienne pour un parcours renforcé.',
    image: 'module-detox-poids.svg',
    highlights: [
      '1 formation en ligne complète',
      'Certificat français',
      'Certificat tunisien',
    ],
    instructorId: '2',
    priceEur: 890,
    priceTnd: 2999,
    priceUsd: 962,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'published',
  },
  {
    id: 'formula-3',
    title: 'Formule 3',
    description: 'Une formule premium avec trois certificats, ebook offert et un suivi d’un mois.',
    image: 'module-emonctoires.svg',
    highlights: [
      '3 certificats',
      'Ebook inclus',
      'Suivi personnalisé pendant 1 mois',
    ],
    instructorId: '2',
    priceEur: 2200,
    priceTnd: 7410,
    priceUsd: 2376,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'published',
  },
  {
    id: 'formula-4',
    title: 'Formule 4 VIP Voyage',
    description: 'La formule voyage VIP avec immersion, accompagnement haut de gamme et expérience complète.',
    image: 'module-detox-peau.svg',
    highlights: [
      'Expérience VIP',
      'Voyage / immersion',
      'Accompagnement premium',
    ],
    instructorId: '2',
    priceEur: 3750,
    priceTnd: 12634,
    priceUsd: 4050,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'published',
  },
];

const revenue: RevenueRow[] = [
  { month: 'Jan', amount: 4500 },
  { month: 'Feb', amount: 5200 },
  { month: 'Mar', amount: 6800 },
  { month: 'Apr', amount: 7400 },
  { month: 'May', amount: 8100 },
];

const studentWorkspaces = new Map<string, StudentWorkspace>();
const roleProfiles = new Map<string, RoleProfileData>();
const messages: MessageRecord[] = [];
const liveSessions: LiveSession[] = [];
const resources: ResourceItem[] = [];
const scheduleEntries: ScheduleEntry[] = [
  {
    id: 'schedule-1',
    title: 'Introduction et objectifs',
    courseId: '1',
    day: 'Lundi',
    startTime: '09:00',
    endTime: '10:30',
    format: 'online',
    room: 'Google Meet',
    notes: 'Presence conseillee pour bien demarrer le parcours.',
    createdBy: '2',
  },
  {
    id: 'schedule-2',
    title: 'Atelier pratique',
    courseId: '1',
    day: 'Mercredi',
    startTime: '14:00',
    endTime: '15:30',
    format: 'hybrid',
    room: 'Salle Djerba / Meet',
    notes: 'Apportez vos notes et questions de la semaine.',
    createdBy: '2',
  },
];
const exams: ExamTemplate[] = [];
const studentAttempts = new Map<string, StudentAttempt[]>();
const publicEnrollmentRequests: PublicEnrollmentRequest[] = [];
const paymentRecords: PaymentRecord[] = [
  { id: 'pay-1', studentId: '3', studentName: 'Jane Doe', courseId: '2', amountEur: 349, status: 'paid', paidAt: '2026-04-10T10:30:00.000Z' },
  { id: 'pay-2', studentId: '3', studentName: 'Jane Doe', courseId: '3', amountEur: 329, status: 'pending', paidAt: '2026-04-26T12:00:00.000Z' },
];

bootstrapRoleData();

function bootstrapRoleData(): void {
  roleProfiles.set('1', {
    phone: '+216 20 000 001',
    city: 'Djerba',
    country: 'Tunisie',
    bio: 'Directrice administrative de la plateforme Essenti’Elle Santé.',
  });
  roleProfiles.set('2', {
    phone: '+216 20 000 002',
    city: 'Djerba',
    country: 'Tunisie',
    bio: 'Formatrice spécialisée en bien-être féminin, détox et nutrition fonctionnelle.',
  });

  const studentUser = memoryUsers.find((user) => user.id === '3');
  if (studentUser) {
    studentWorkspaces.set(studentUser.id, {
      enrollments: [
        { courseId: '1', progress: 45 },
        { courseId: '4', progress: 100 },
      ],
      certificates: [
        {
          id: 'cert-3-4',
          courseId: '4',
          title: 'Certificat - Détox peau',
          issuedAt: '2026-04-12T09:00:00.000Z',
          status: 'issued',
          signedBy: 'Direction Essenti’Elle Santé',
        },
        {
          id: 'cert-3-1',
          courseId: '1',
          title: 'Certificat - Nutrition et Pathologie courante',
          issuedAt: '2026-05-22T09:00:00.000Z',
          status: 'pending',
          signedBy: 'Administration pédagogique',
        },
      ],
      profile: {
        phone: '+216 55 000 000',
        city: 'Djerba',
        country: 'Tunisie',
        objective: 'Développer une activité durable dans le bien-être féminin et obtenir mes certifications.',
      },
    });
  }

  messages.push(
    {
      id: 'msg-1',
      studentId: '3',
      studentName: 'Jane Doe',
      senderId: '3',
      senderRole: 'student',
      senderName: 'Jane Doe',
      recipientId: '2',
      recipientRole: 'instructor',
      recipientName: 'Dr. Expert',
      subject: 'Question sur le module hypertension',
      content: 'Bonjour, pouvez-vous préciser la différence entre le suivi nutritionnel et la recommandation ponctuelle dans le module hypertension ?',
      sentAt: '2026-05-01T08:30:00.000Z',
    },
    {
      id: 'msg-2',
      studentId: '3',
      studentName: 'Jane Doe',
      senderId: '2',
      senderRole: 'instructor',
      senderName: 'Dr. Expert',
      recipientId: '3',
      recipientRole: 'student',
      recipientName: 'Jane Doe',
      subject: 'Re: Question sur le module hypertension',
      content: 'Bien sûr. Le suivi nutritionnel s’inscrit dans la durée et comprend un protocole d’ajustement, alors qu’une recommandation ponctuelle reste plus générale.',
      sentAt: '2026-05-01T09:10:00.000Z',
    }
  );

  liveSessions.push({
    id: 'live-1',
    title: 'Session live - Cas pratiques Nutrition',
    courseId: '1',
    scheduledAt: '2026-05-14T18:00:00.000Z',
    meetLink: 'https://meet.google.com/ess-nutri-live',
    notes: 'Analyse de cas autour du diabète et de l’hypertension.',
    createdBy: '2',
  });

  resources.push(
    {
      id: 'res-1',
      title: 'PDF - Guide nutrition inflammatoire',
      description: 'Support PDF pour accompagner le module sur l’inflammation chronique.',
      courseId: '1',
      type: 'pdf',
      url: 'https://example.com/guide-nutrition.pdf',
      createdBy: '2',
    },
    {
      id: 'res-2',
      title: 'Audio - Drainage et émonctoires',
      description: 'Audio d’accompagnement sur les axes majeurs de drainage.',
      courseId: '3',
      type: 'audio',
      url: 'https://example.com/audio-emonctoires.mp3',
      createdBy: '2',
    }
  );

  exams.push(
    {
      id: 'exam-1',
      title: 'Quiz final - Nutrition et Pathologie courante',
      courseId: '1',
      assignedBy: 'Dr. Expert',
      dueDate: '2026-05-20T23:59:00.000Z',
      questions: [
        {
          id: 'q1',
          prompt: 'Quel appareil est pertinent pour le suivi de l’hypertension ?',
          options: ['Tensiomètre', 'Oxymètre', 'Nébuliseur'],
          correctIndex: 0,
          points: 8,
        },
        {
          id: 'q2',
          prompt: 'La prise en charge du diabète repose en partie sur :',
          options: ['Le sommeil uniquement', 'L’équilibre nutritionnel', 'Le jeûne sans suivi'],
          correctIndex: 1,
          points: 12,
        },
      ],
    },
    {
      id: 'exam-2',
      title: 'Étude de cas - Détox peau',
      courseId: '4',
      assignedBy: 'Dr. Expert',
      dueDate: '2026-05-28T23:59:00.000Z',
      questions: [
        {
          id: 'q3',
          prompt: 'Quel organe est fréquemment associé aux déséquilibres de peau dans une logique de détox ?',
          options: ['Le foie', 'Le cœur', 'La rate uniquement'],
          correctIndex: 0,
          points: 10,
        },
        {
          id: 'q4',
          prompt: 'Un accompagnement peau doit aussi considérer :',
          options: ['L’hydratation et l’alimentation', 'Uniquement les cosmétiques', 'Uniquement le maquillage'],
          correctIndex: 0,
          points: 10,
        },
      ],
    }
  );

  studentAttempts.set('3', [
    {
      examId: 'exam-1',
      answers: [0, 1],
      score: 20,
      submittedAt: '2026-05-02T13:00:00.000Z',
    },
  ]);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function getTokenSecret(): string {
  return process.env['TOKEN_SECRET'] ?? process.env['JWT_SECRET'] ?? 'dev-insecure-secret';
}

function getDbHost(): string | undefined {
  return process.env['DB_HOST'] ?? process.env['MYSQL_HOST'];
}

function getDbPort(): number {
  const rawPort = process.env['DB_PORT'] ?? process.env['MYSQL_PORT'];
  return rawPort ? Number(rawPort) : 3306;
}

function getDbUser(): string | undefined {
  return process.env['DB_USER'] ?? process.env['MYSQL_USER'];
}

function getDbPassword(): string {
  return process.env['DB_PASSWORD'] ?? process.env['MYSQL_PASSWORD'] ?? '';
}

function getDbName(): string | undefined {
  return process.env['DB_NAME'] ?? process.env['MYSQL_DATABASE'];
}

function isDbSslEnabled(): boolean {
  return (process.env['DB_SSL'] ?? '').toLowerCase() === 'true';
}

function createToken(user: PublicUser): string {
  const payload = Buffer.from(JSON.stringify(user), 'utf-8').toString('base64url');
  const signature = createTokenSignature(payload);
  return `${payload}.${signature}`;
}

function createTokenSignature(payloadBase64Url: string): string {
  const secret = getTokenSecret();
  const hmac = createHmac('sha256', secret).update(payloadBase64Url).digest('base64url');
  return hmac;
}

function decodeToken(token: string): PublicUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64Url, signature] = parts;
    const expectedSignature = createTokenSignature(payloadBase64Url);

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

    const parsed = JSON.parse(Buffer.from(payloadBase64Url, 'base64url').toString('utf-8')) as PublicUser;
    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function makeStoredUser(id: string, name: string, email: string, role: UserRole, password: string): StoredUser {
  return {
    id,
    name,
    email: normalizeEmail(email),
    role,
    passwordHash: hashPassword(password),
  };
}

function parseTextList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => String(item ?? '').trim())
    .filter((item) => item.length > 0);
}

function parseContentItems(items: unknown): Array<{ id: string; text: string }> {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any, index: number) => ({
      id: typeof item?.id === 'string' && item.id ? item.id : `content-${Date.now()}-${index}`,
      text: typeof item?.text === 'string' ? item.text.trim() : '',
    }))
    .filter((item) => item.text.length > 0);
}

function parseChapterItems(items: unknown): Array<{ id: string; title: string; content: string }> {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any, index: number) => ({
      id: typeof item?.id === 'string' && item.id ? item.id : `chapter-${Date.now()}-${index}`,
      title: typeof item?.title === 'string' ? item.title.trim() : '',
      content: typeof item?.content === 'string' ? item.content.trim() : '',
    }))
    .filter((item) => item.title.length > 0 || item.content.length > 0);
}

function hasDatabaseConfig(): boolean {
  return Boolean(getDbHost() && getDbUser() && getDbName());
}

async function getDbPool(): Promise<Pool | null> {
  if (useMemoryStore) return null;
  if (dbPool) return dbPool;

  if (!hasDatabaseConfig()) {
    useMemoryStore = true;
    console.warn('[DB] Missing DB env vars. Using in-memory auth store.');
    return null;
  }

  try {
    dbPool = mysql.createPool({
      host: getDbHost(),
      port: getDbPort(),
      user: getDbUser(),
      password: getDbPassword(),
      database: getDbName(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: isDbSslEnabled() ? { rejectUnauthorized: false } : undefined,
    });
    await dbPool.query('SELECT 1');
    await ensureSchemaAndSeed(dbPool);
    console.log('[DB] MySQL connection ready.');
    return dbPool;
  } catch (error) {
    useMemoryStore = true;
    dbPool = null;
    console.warn('[DB] MySQL unavailable. Falling back to in-memory store.', error);
    return null;
  }
}

async function ensureSchemaAndSeed(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      role ENUM('student','instructor','admin') NOT NULL DEFAULT 'student',
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(60) NULL,
      city VARCHAR(120) NULL,
      country VARCHAR(120) NULL,
      objective TEXT NULL,
      bio TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(60) NULL');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(120) NULL');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS objective TEXT NULL');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL');

  await insertSeedUser(pool, 'Admin User', 'admin@lessentielle-sante.site', 'admin', 'password123');
  await insertSeedUser(pool, 'Dr. Expert', 'instructor@lessentielle-sante.site', 'instructor', 'password123');
  await insertSeedUser(pool, 'Jane Doe', 'student@lessentielle-sante.site', 'student', 'password123');
}

async function insertSeedUser(pool: Pool, name: string, email: string, role: UserRole, password: string): Promise<void> {
  const passwordHash = hashPassword(password);
  await pool.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
    [name, normalizeEmail(email), role, passwordHash]
  );
}

async function findStoredUserByEmail(email: string): Promise<StoredUser | null> {
  const normalized = normalizeEmail(email);
  const pool = await getDbPool();

  if (!pool) {
    return memoryUsers.find((user) => user.email === normalized) ?? null;
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
    [normalized]
  );
  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: String(row['id']),
    name: String(row['name']),
    email: String(row['email']),
    role: row['role'] as UserRole,
    passwordHash: String(row['password_hash']),
  };
}

async function createStoredUser(
  name: string,
  email: string,
  password: string,
  profile: { phone: string; city: string; country: string; objective: string }
): Promise<StoredUser> {
  const normalized = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const pool = await getDbPool();

  if (!pool) {
    const duplicate = memoryUsers.find((user) => user.email === normalized);
    if (duplicate) throw new Error('EMAIL_EXISTS');
    const newUser: StoredUser = {
      id: String(memoryUsers.length + 1),
      name,
      email: normalized,
      role: 'student',
      passwordHash,
    };
    memoryUsers.push(newUser);
    studentWorkspaces.set(newUser.id, {
      enrollments: [],
      certificates: [],
      profile: {
        phone: profile.phone,
        city: profile.city,
        country: profile.country,
        objective: profile.objective,
      },
    });
    return newUser;
  }

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO users (name, email, role, password_hash, phone, city, country, objective) VALUES (?, ?, \'student\', ?, ?, ?, ?, ?)',
      [name, normalized, passwordHash, profile.phone, profile.city, profile.country, profile.objective]
    );
    return {
      id: String(result.insertId),
      name,
      email: normalized,
      role: 'student',
      passwordHash,
    };
  } catch (error: unknown) {
    const dbError = error as { code?: string };
    if (dbError?.code === 'ER_DUP_ENTRY') throw new Error('EMAIL_EXISTS');
    throw error;
  }
}

async function hydrateUserData(user: PublicUser): Promise<void> {
  const pool = await getDbPool();
  if (!pool) {
    if (user.role === 'student') {
      ensureStudentWorkspace(user);
    } else {
      ensureRoleProfile(user);
    }
    return;
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT phone, city, country, objective, bio FROM users WHERE id = ? LIMIT 1',
    [Number(user.id)]
  );
  const row = rows[0];
  if (!row) {
    if (user.role === 'student') {
      ensureStudentWorkspace(user);
    } else {
      ensureRoleProfile(user);
    }
    return;
  }

  if (user.role === 'student') {
    studentWorkspaces.set(user.id, {
      enrollments: ensureStudentWorkspace(user).enrollments,
      certificates: ensureStudentWorkspace(user).certificates,
      profile: {
        phone: String(row['phone'] ?? ''),
        city: String(row['city'] ?? ''),
        country: String(row['country'] ?? ''),
        objective: String(row['objective'] ?? ''),
      },
    });
  } else {
    roleProfiles.set(user.id, {
      phone: String(row['phone'] ?? ''),
      city: String(row['city'] ?? ''),
      country: String(row['country'] ?? ''),
      bio: String(row['bio'] ?? ''),
    });
  }
}

async function persistUserProfile(
  userId: string,
  payload: { name?: string; phone?: string; city?: string; country?: string; objective?: string; bio?: string }
): Promise<void> {
  const pool = await getDbPool();
  if (!pool) return;
  await pool.query(
    `UPDATE users
     SET name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         city = COALESCE(?, city),
         country = COALESCE(?, country),
         objective = COALESCE(?, objective),
         bio = COALESCE(?, bio)
     WHERE id = ?`,
    [
      payload.name ?? null,
      payload.phone ?? null,
      payload.city ?? null,
      payload.country ?? null,
      payload.objective ?? null,
      payload.bio ?? null,
      Number(userId),
    ]
  );
}

async function countUsers(): Promise<number> {
  const pool = await getDbPool();
  if (!pool) return memoryUsers.length;
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
  return Number(rows[0]?.['total'] ?? 0);
}

function getCurrentUser(req: Request, allowedRoles?: UserRole[]): PublicUser | null {
  const authHeader = req.header('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = token ? decodeToken(token) : null;
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return user;
}

function ensureStudentWorkspace(user: PublicUser): StudentWorkspace {
  const existing = studentWorkspaces.get(user.id);
  if (existing) return existing;
  const created: StudentWorkspace = {
    enrollments: [],
    certificates: [],
    profile: {
      phone: '',
      city: '',
      country: '',
      objective: '',
    },
  };
  studentWorkspaces.set(user.id, created);
  return created;
}

function ensureRoleProfile(user: PublicUser): RoleProfileData {
  const existing = roleProfiles.get(user.id);
  if (existing) return existing;
  const created: RoleProfileData = {
    phone: '',
    city: '',
    country: '',
    bio: '',
  };
  roleProfiles.set(user.id, created);
  return created;
}

function getStudentIdsForCourse(courseId: string): string[] {
  const ids: string[] = [];
  for (const [studentId, workspace] of studentWorkspaces.entries()) {
    if (workspace.enrollments.some((item) => item.courseId === courseId)) {
      ids.push(studentId);
    }
  }
  return ids;
}

function getCourseTitle(courseId: string): string {
  return courses.find((course) => course.id === courseId)?.title ?? 'Formation';
}

function estimateEnrollmentAmount(course: Course, request?: PublicEnrollmentRequest): number {
  if (request?.formulaId) {
    const formula = formulas.find((item) => item.id === request.formulaId);
    if (formula) {
      return formula.priceEur;
    }
  }

  if (request?.certificateCount && course.priceMinEur && course.priceMaxEur) {
    if (request.certificateCount <= 1) return course.priceMinEur;
    if (request.certificateCount >= 3) return course.priceMaxEur;
    return Math.round((course.priceMinEur + course.priceMaxEur) / 2);
  }

  return course.priceEur;
}

function getInstructorOwnerIds(user: PublicUser): string[] {
  if (user.role !== 'instructor') return [user.id];

  const ownerIds = new Set<string>([user.id]);
  const normalizedEmail = normalizeEmail(user.email);
  const isLegacySeedInstructor =
    normalizedEmail === 'instructor@lessentielle-sante.site' ||
    user.name.trim().toLowerCase() === 'dr. expert';

  if (isLegacySeedInstructor) {
    ownerIds.add('2');
  }

  return Array.from(ownerIds);
}

function instructorOwnsCourse(user: PublicUser, course: Course): boolean {
  return getInstructorOwnerIds(user).includes(course.instructorId);
}

function instructorOwnsFormula(user: PublicUser, formula: TrainingFormula): boolean {
  return getInstructorOwnerIds(user).includes(formula.instructorId);
}

function getFormulaPrice(formula: TrainingFormula, currency: 'EUR' | 'TND' | 'USD'): number {
  if (formula.promoEnabled) {
    if (currency === 'TND' && formula.promoPriceTnd && formula.promoPriceTnd > 0) return formula.promoPriceTnd;
    if (currency === 'USD' && formula.promoPriceUsd && formula.promoPriceUsd > 0) return formula.promoPriceUsd;
    if (formula.promoPriceEur && formula.promoPriceEur > 0) return formula.promoPriceEur;
  }

  if (currency === 'TND' && formula.priceTnd && formula.priceTnd > 0) return formula.priceTnd;
  if (currency === 'USD' && formula.priceUsd && formula.priceUsd > 0) return formula.priceUsd;
  return formula.priceEur;
}

function getAttempt(studentId: string, examId: string): StudentAttempt | null {
  return studentAttempts.get(studentId)?.find((item) => item.examId === examId) ?? null;
}

function getExamAverage(examId: string): number {
  const scores: number[] = [];
  for (const attempts of studentAttempts.values()) {
    const attempt = attempts.find((item) => item.examId === examId);
    if (attempt) scores.push(attempt.score);
  }
  if (!scores.length) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
}

function toStudentExamView(user: PublicUser) {
  const workspace = ensureStudentWorkspace(user);
  const enrolledIds = workspace.enrollments.map((item) => item.courseId);
  return exams
    .filter((exam) => enrolledIds.includes(exam.courseId))
    .map((exam) => {
      const attempt = getAttempt(user.id, exam.id);
      return {
        id: exam.id,
        title: exam.title,
        courseTitle: getCourseTitle(exam.courseId),
        assignedBy: exam.assignedBy,
        status: attempt ? 'graded' : 'available',
        score: attempt?.score ?? null,
        average: getExamAverage(exam.id),
        dueDate: exam.dueDate,
        questions: attempt
          ? undefined
          : exam.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              options: question.options,
              points: question.points,
            })),
      };
    });
}

function getStudentAverage(studentId: string): number {
  const attempts = studentAttempts.get(studentId) ?? [];
  if (!attempts.length) return 0;
  return Number((attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length).toFixed(1));
}

function serializeCatalog(user: PublicUser) {
  const workspace = ensureStudentWorkspace(user);
  return courses
    .filter((course) => course.status === 'published')
    .map((course) => {
    const enrollment = workspace.enrollments.find((item) => item.courseId === course.id);
    return {
      ...course,
      enrolled: Boolean(enrollment),
      progress: enrollment?.progress ?? 0,
    };
    });
}

function serializePublicCatalog() {
  return {
    courses: courses
      .filter((course) => course.status === 'published')
      .map((course) => ({
        ...course,
        modules: Math.max(course.moduleItems?.length ?? 0, course.modules),
      })),
    formulas: formulas
      .filter((formula) => formula.status === 'published')
      .map((formula) => ({
        ...formula,
        activePriceEur: getFormulaPrice(formula, 'EUR'),
        activePriceTnd: getFormulaPrice(formula, 'TND'),
        activePriceUsd: getFormulaPrice(formula, 'USD'),
      })),
  };
}

async function getAllUsers(): Promise<PublicUser[]> {
  const pool = await getDbPool();
  if (!pool) return memoryUsers.map(toPublicUser);

  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT id, name, email, role FROM users');
  return rows.map((row) => ({
    id: String(row['id']),
    name: String(row['name']),
    email: String(row['email']),
    role: row['role'] as UserRole,
  }));
}

function buildRevenueTimeline(): RevenueRow[] {
  const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const now = new Date();
  const timeline: RevenueRow[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const current = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const amount = paymentRecords
      .filter((payment) => {
        if (payment.status !== 'paid') return false;
        const paidAt = new Date(payment.paidAt);
        return paidAt.getFullYear() === current.getFullYear() && paidAt.getMonth() === current.getMonth();
      })
      .reduce((sum, payment) => sum + payment.amountEur, 0);

    const label = formatter.format(current).replace('.', '');
    timeline.push({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      amount,
    });
  }

  return timeline;
}

async function buildAdminStatsSnapshot(): Promise<AdminStatsSnapshot> {
  const allUsers = await getAllUsers();
  const totalStudents = allUsers.filter((item) => item.role === 'student').length;
  const totalInstructors = allUsers.filter((item) => item.role === 'instructor').length;
  const totalAdmins = allUsers.filter((item) => item.role === 'admin').length;
  const activeCourses = courses.filter((course) => course.status === 'published').length;
  const freeCourses = courses.filter((course) => course.access === 'free').length;
  const paidCourses = courses.filter((course) => course.access === 'paid').length;
  const totalEnrollments = courses.reduce((sum, course) => sum + course.students, 0);
  const paidPayments = paymentRecords.filter((payment) => payment.status === 'paid');
  const pendingPayments = paymentRecords.filter((payment) => payment.status === 'pending');
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amountEur, 0);
  const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + payment.amountEur, 0);

  return {
    totalUsers: allUsers.length,
    totalStudents,
    totalInstructors,
    totalAdmins,
    activeCourses,
    freeCourses,
    paidCourses,
    totalEnrollments,
    totalRevenue,
    pendingRevenue,
    paidPayments: paidPayments.length,
    pendingPayments: pendingPayments.length,
    averageBasket: paidPayments.length ? Number((totalRevenue / paidPayments.length).toFixed(1)) : 0,
    revenueData: buildRevenueTimeline(),
    topCourses: [...courses]
      .sort((left, right) => right.students - left.students)
      .map((course) => ({
        id: course.id,
        title: course.title,
        access: course.access,
        status: course.status,
        enrollments: course.students,
        revenue: paymentRecords
          .filter((payment) => payment.courseId === course.id && payment.status === 'paid')
          .reduce((sum, payment) => sum + payment.amountEur, 0),
        priceEur: course.priceEur,
      })),
    recentPayments: [...paymentRecords]
      .sort((left, right) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime())
      .slice(0, 6)
      .map((payment) => ({
        ...payment,
        courseTitle: getCourseTitle(payment.courseId),
      })),
  };
}

function updateMemoryUserRole(userId: string, role: UserRole): void {
  const user = memoryUsers.find((item) => item.id === userId);
  if (user) user.role = role;
}

function getMessageContactsForUser(userId: string): Array<{ id: string; name: string; email: string; role: UserRole }> {
  return memoryUsers
    .filter((item) => item.id !== userId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
    }));
}

function getMessagesForUser(userId: string): MessageRecord[] {
  return messages.filter((message) => message.senderId === userId || message.recipientId === userId);
}

app.post('/api/register', async (req, res) => {
  const body = req.body as RegisterPayload;
  const name = body.name?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';
  const phone = body.phone?.trim() ?? '';
  const city = body.city?.trim() ?? '';
  const country = body.country?.trim() ?? '';
  const objective = body.objective?.trim() ?? '';

  if (name.length < 2 || !email || password.length < 8) {
    res.status(400).json({ error: 'Nom, email ou mot de passe invalide (8 caractères minimum).' });
    return;
  }

  try {
    const created = await createStoredUser(name, email, password, { phone, city, country, objective });
    const user = toPublicUser(created);
    await hydrateUserData(user);
    const token = createToken(user);
    res.status(201).json({ token, user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Cet email est déjà utilisé.' });
      return;
    }
    console.error('[API] Register failed', error);
    res.status(500).json({ error: 'Erreur serveur pendant l’inscription.' });
  }
});

app.post('/api/login', async (req, res) => {
  const body = req.body as LoginPayload;
  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis.' });
    return;
  }

  try {
    const user = await findStoredUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }
    const publicUser = toPublicUser(user);
    await hydrateUserData(publicUser);
    const token = createToken(publicUser);
    res.json({ token, user: publicUser });
  } catch (error) {
    console.error('[API] Login failed', error);
    res.status(500).json({ error: 'Erreur serveur pendant la connexion.' });
  }
});

app.get('/api/courses', (_req, res) => {
  res.json(courses);
});

app.get('/api/stats', async (_req, res) => {
  res.json({
    totalUsers: await countUsers(),
    activeCourses: courses.length,
    totalRevenue: revenue.reduce((sum, item) => sum + item.amount, 0),
    revenueData: revenue,
  });
});

app.get('/api/student/overview', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const workspace = ensureStudentWorkspace(user);
  const catalog = serializeCatalog(user).filter((course) => course.enrolled);
  const featured = catalog[0] ?? serializeCatalog(user)[0];
  res.json({
    featuredCourseId: featured?.id ?? '1',
    featuredCourseTitle: featured?.title ?? 'Nutrition et Pathologie courante',
    featuredProgress: featured?.progress ?? 0,
    enrolledCount: catalog.length,
    completedCount: workspace.enrollments.filter((item) => item.progress >= 100).length,
    certificateCount: workspace.certificates.filter((item) => item.status === 'issued').length,
    averageScore: getStudentAverage(user.id),
    courses: catalog,
  });
});

app.get('/api/public/formations', (_req, res): any => {
  res.json(serializePublicCatalog());
});

app.post('/api/public/enrollment-requests', (req, res): any => {
  const courseId = String(req.body?.courseId ?? '').trim();
  const course = courses.find((item) => item.id === courseId && item.status === 'published');
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });
  const studentUser = getCurrentUser(req, ['student']);

  const name = studentUser?.name ?? (typeof req.body?.name === 'string' ? req.body.name.trim() : '');
  if (name.length < 2) return res.status(400).json({ error: 'Le nom est obligatoire.' });

  const email = studentUser?.email ?? (typeof req.body?.email === 'string' ? req.body.email.trim() : '');
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email invalide.' });

  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  if (phone.length < 6) return res.status(400).json({ error: 'Téléphone invalide.' });

  const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
  const country = typeof req.body?.country === 'string' ? req.body.country.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const formulaId = typeof req.body?.formulaId === 'string' ? req.body.formulaId.trim() : '';
  const rawCertificateCount = Number(req.body?.certificateCount ?? 0);
  const certificateCount = Number.isInteger(rawCertificateCount) ? rawCertificateCount : 0;
  const formula = formulaId ? formulas.find((item) => item.id === formulaId && item.status === 'published') : null;
  const acceptsCertificateSelection = Array.isArray(course.certificateOptions) && course.certificateOptions.length > 0;

  if (acceptsCertificateSelection && !course.certificateOptions?.includes(certificateCount)) {
    return res.status(400).json({ error: 'Veuillez choisir entre 1 et 3 certificats pour cette formation.' });
  }

  if (course.access === 'paid' && !acceptsCertificateSelection && !formula) {
    return res.status(400).json({ error: 'Veuillez choisir une formule pour cette formation payante.' });
  }

  if (course.access === 'paid' && !studentUser) {
    return res.status(401).json({
      error: 'Connectez-vous ou creez votre compte etudiante avec ce meme email avant d envoyer une demande pour une formation payante.',
    });
  }

  const request: PublicEnrollmentRequest = {
    id: `enroll-${Date.now()}`,
    courseId: course.id,
    courseTitle: course.title,
    courseAccess: course.access,
    studentId: studentUser?.id,
    formulaId: formula?.id,
    formulaTitle: formula?.title,
    certificateCount: acceptsCertificateSelection ? certificateCount : undefined,
    name,
    email,
    phone,
    city,
    country,
    message,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  publicEnrollmentRequests.unshift(request);
  res.status(201).json({
    message: course.access === 'free'
      ? 'Votre demande d’inscription a bien été envoyée.'
      : 'Votre demande a bien été envoyée. Notre équipe vous contactera pour finaliser la formule choisie.',
    request,
  });
});

app.get('/api/student/catalog', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(serializeCatalog(user));
});

app.post('/api/student/catalog/:courseId/enroll', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const course = courses.find((item) => item.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });
  if (course.access !== 'free') return res.status(403).json({ error: 'Cette formation nécessite un paiement.' });

  const workspace = ensureStudentWorkspace(user);
  if (!workspace.enrollments.some((item) => item.courseId === course.id)) {
    workspace.enrollments.push({ courseId: course.id, progress: 0 });
    course.students += 1;
  }
  res.json(serializeCatalog(user).find((item) => item.id === course.id));
});

app.get('/api/student/certificates', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(ensureStudentWorkspace(user).certificates);
});

app.get('/api/student/messages', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessagesForUser(user.id));
});

app.get('/api/student/message-contacts', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessageContactsForUser(user.id));
});

app.post('/api/student/messages', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const recipientId = typeof req.body?.recipientId === 'string' ? req.body.recipientId.trim() : '';
  const recipient = memoryUsers.find((item) => item.id === recipientId && item.id !== user.id);
  const recipientRole = recipient?.role as MessageRole | undefined;
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

  if (!recipient || subject.length < 3 || content.length < 3) {
    return res.status(400).json({ error: 'Message invalide.' });
  }

  const message: MessageRecord = {
    id: `msg-${Date.now()}`,
    studentId: user.id,
    studentName: user.name,
    senderId: user.id,
    senderRole: 'student',
    senderName: user.name,
    recipientId: recipient.id,
    recipientRole: recipient.role,
    recipientDisplayName: recipient.name,
    recipientName: recipientRole === 'admin' ? 'Direction Essenti’Elle' : 'Dr. Expert',
    recipientDisplayNameFinal: recipient.name,
    subject,
    content,
    sentAt: new Date().toISOString(),
  };
  message.recipientName = recipient.name;
  messages.unshift(message);
  res.status(201).json(message);
});

app.get('/api/student/profile', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const profile = ensureStudentWorkspace(user).profile;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    ...profile,
  });
});

app.put('/api/student/profile', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2) return res.status(400).json({ error: 'Nom invalide.' });

  const workspace = ensureStudentWorkspace(user);
  workspace.profile = {
    phone: typeof req.body?.phone === 'string' ? req.body.phone.trim() : '',
    city: typeof req.body?.city === 'string' ? req.body.city.trim() : '',
    country: typeof req.body?.country === 'string' ? req.body.country.trim() : '',
    objective: typeof req.body?.objective === 'string' ? req.body.objective.trim() : '',
  };

  const memoryUser = memoryUsers.find((item) => item.id === user.id);
  if (memoryUser) memoryUser.name = name;
  void persistUserProfile(user.id, {
    name,
    phone: workspace.profile.phone,
    city: workspace.profile.city,
    country: workspace.profile.country,
    objective: workspace.profile.objective,
  });

  res.json({
    id: user.id,
    name,
    email: user.email,
    ...workspace.profile,
  });
});

app.get('/api/student/schedule', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const workspace = ensureStudentWorkspace(user);
  const enrolledCourseIds = new Set(workspace.enrollments.map((item) => item.courseId));
  res.json(
    scheduleEntries
      .filter((entry) => enrolledCourseIds.has(entry.courseId))
      .map((entry) => ({
        ...entry,
        courseTitle: getCourseTitle(entry.courseId),
      }))
  );
});

app.get('/api/student/exams', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(toStudentExamView(user));
});

app.post('/api/student/exams/:examId/submit', (req, res): any => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const exam = exams.find((item) => item.id === req.params.examId);
  if (!exam) return res.status(404).json({ error: 'Examen introuvable.' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers.map((value: unknown) => Number(value)) : [];
  if (answers.length !== exam.questions.length) return res.status(400).json({ error: 'Réponses incomplètes.' });

  const workspace = ensureStudentWorkspace(user);
  if (!workspace.enrollments.some((item) => item.courseId === exam.courseId)) {
    return res.status(403).json({ error: 'Examen non accessible.' });
  }

  const score = exam.questions.reduce((sum, question, index) => {
    return sum + (answers[index] === question.correctIndex ? question.points : 0);
  }, 0);

  const attempts = studentAttempts.get(user.id) ?? [];
  const existing = attempts.find((attempt) => attempt.examId === exam.id);
  if (existing) {
    existing.answers = answers;
    existing.score = score;
    existing.submittedAt = new Date().toISOString();
  } else {
    attempts.push({
      examId: exam.id,
      answers,
      score,
      submittedAt: new Date().toISOString(),
    });
  }
  studentAttempts.set(user.id, attempts);
  res.json(toStudentExamView(user));
});

app.get('/api/instructor/overview', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const ownCourses = courses.filter((course) => instructorOwnsCourse(user, course));
  const studentIds = Array.from(new Set(ownCourses.flatMap((course) => getStudentIdsForCourse(course.id))));
  res.json({
    totalStudents: studentIds.length,
    activeCourses: ownCourses.length,
    averageRating: 4.8,
    courses: ownCourses,
    latestMessages: messages.filter((message) => message.recipientRole === 'instructor' || message.senderRole === 'instructor').slice(0, 4),
  });
});

app.get('/api/instructor/courses', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(courses.filter((course) => instructorOwnsCourse(user, course)));
});

app.get('/api/instructor/formulas', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(formulas.filter((formula) => instructorOwnsFormula(user, formula)));
});

app.post('/api/instructor/courses', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['instructor']);
    if (!user) return res.status(401).json({ error: 'Authentification requise. Vérifiez votre token.' });

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'Le titre est obligatoire.' });
    if (title.length < 3) return res.status(400).json({ error: 'Le titre doit contenir au moins 3 caractères.' });

    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    if (!description) return res.status(400).json({ error: 'La description est obligatoire.' });
    if (description.length < 5) return res.status(400).json({ error: 'La description doit contenir au moins 5 caractères.' });

    const moduleItems = Array.isArray(req.body?.moduleItems)
      ? req.body.moduleItems
          .map((item: any, index: number) => ({
            id: typeof item?.id === 'string' && item.id ? item.id : `module-${Date.now()}-${index}`,
            title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `Module ${index + 1}`,
            pdfName: typeof item?.pdfName === 'string' ? item.pdfName : `module-${index + 1}.pdf`,
            pdfDataUrl: typeof item?.pdfDataUrl === 'string' ? item.pdfDataUrl : '',
            videoName: typeof item?.videoName === 'string' ? item.videoName : '',
            videoDataUrl: typeof item?.videoDataUrl === 'string' ? item.videoDataUrl : '',
            audioName: typeof item?.audioName === 'string' ? item.audioName : '',
            audioDataUrl: typeof item?.audioDataUrl === 'string' ? item.audioDataUrl : '',
          }))
          .filter((item: any) => item.pdfDataUrl && item.title.trim())
      : [];
    const objectives = parseTextList(req.body?.objectives);
    const contentItems = parseContentItems(req.body?.contentItems);
    const chapters = parseChapterItems(req.body?.chapters);
    const presentation = typeof req.body?.presentation === 'string' ? req.body.presentation.trim() : '';
    const warning = typeof req.body?.warning === 'string' ? req.body.warning.trim() : '';

    const status = req.body?.status === 'draft' ? 'draft' : 'published';
    
    if (status === 'published' && moduleItems.length === 0) {
      return res.status(400).json({ error: 'Vous devez ajouter au moins un module PDF pour publier la formation.' });
    }

    const course: Course = {
      id: `course-${Date.now()}`,
      title,
      description,
      instructorId: user.id,
      modules: moduleItems.length || Number(req.body?.modules ?? 1),
      students: 0,
      thumbnail: typeof req.body?.thumbnail === 'string' && req.body.thumbnail.trim() ? req.body.thumbnail.trim() : 'module-nutrition-pathologie.svg',
      access: req.body?.access === 'paid' ? 'paid' : 'free',
      priceEur: Math.max(0, Number(req.body?.priceEur ?? 0)),
      priceTnd: Math.max(0, Number(req.body?.priceTnd ?? 0)),
      priceUsd: Math.max(0, Number(req.body?.priceUsd ?? 0)),
      pricingCurrency: ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : 'EUR',
      promoEnabled: Boolean(req.body?.promoEnabled),
      promoPriceEur: Math.max(0, Number(req.body?.promoPriceEur ?? 0)),
      promoPriceTnd: Math.max(0, Number(req.body?.promoPriceTnd ?? 0)),
      promoPriceUsd: Math.max(0, Number(req.body?.promoPriceUsd ?? 0)),
      category: typeof req.body?.category === 'string' ? req.body.category.trim() : 'Formation',
      status,
      presentation,
      warning,
      objectives,
      contentItems,
      chapters,
      moduleItems,
    };
    courses.unshift(course);
    console.log(`✅ Formation créée: ${course.id} par ${user.name}`);
    res.status(201).json(course);
  } catch (error) {
    console.error('❌ Erreur lors de la création de formation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la formation.' });
  }
});

app.put('/api/instructor/courses/:courseId', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['instructor']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const course = courses.find((item) => item.id === req.params.courseId && instructorOwnsCourse(user, item));
    if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

    // Valider et mettre à jour le titre
    if (req.body?.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (title && title.length >= 3) {
        course.title = title;
      }
    }

    // Valider et mettre à jour la description
    if (req.body?.description !== undefined) {
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      if (description && description.length >= 5) {
        course.description = description;
      }
    }

    course.thumbnail = typeof req.body?.thumbnail === 'string' && req.body.thumbnail.trim() ? req.body.thumbnail.trim() : course.thumbnail;
    
    if (Array.isArray(req.body?.moduleItems)) {
      course.moduleItems = req.body.moduleItems
        .map((item: any, index: number) => ({
          id: typeof item?.id === 'string' && item.id ? item.id : `module-${Date.now()}-${index}`,
          title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `Module ${index + 1}`,
          pdfName: typeof item?.pdfName === 'string' ? item.pdfName : `module-${index + 1}.pdf`,
          pdfDataUrl: typeof item?.pdfDataUrl === 'string' ? item.pdfDataUrl : '',
          videoName: typeof item?.videoName === 'string' ? item.videoName : '',
          videoDataUrl: typeof item?.videoDataUrl === 'string' ? item.videoDataUrl : '',
          audioName: typeof item?.audioName === 'string' ? item.audioName : '',
          audioDataUrl: typeof item?.audioDataUrl === 'string' ? item.audioDataUrl : '',
        }))
        .filter((item: any) => item.pdfDataUrl && item.title.trim());
    }
    if (req.body?.presentation !== undefined) {
      course.presentation = typeof req.body.presentation === 'string' ? req.body.presentation.trim() : '';
    }
    if (req.body?.warning !== undefined) {
      course.warning = typeof req.body.warning === 'string' ? req.body.warning.trim() : '';
    }
    if (Array.isArray(req.body?.objectives)) {
      course.objectives = parseTextList(req.body.objectives);
    }
    if (Array.isArray(req.body?.contentItems)) {
      course.contentItems = parseContentItems(req.body.contentItems);
    }
    if (Array.isArray(req.body?.chapters)) {
      course.chapters = parseChapterItems(req.body.chapters);
    }
    
    course.modules = course.moduleItems?.length || Number(req.body?.modules ?? course.modules);
    course.priceEur = Math.max(0, Number(req.body?.priceEur ?? course.priceEur));
    course.priceTnd = Math.max(0, Number(req.body?.priceTnd ?? course.priceTnd ?? 0));
    course.priceUsd = Math.max(0, Number(req.body?.priceUsd ?? course.priceUsd ?? 0));
    course.pricingCurrency = ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : course.pricingCurrency ?? 'EUR';
    course.promoEnabled = typeof req.body?.promoEnabled === 'boolean' ? req.body.promoEnabled : course.promoEnabled ?? false;
    course.promoPriceEur = Math.max(0, Number(req.body?.promoPriceEur ?? course.promoPriceEur ?? 0));
    course.promoPriceTnd = Math.max(0, Number(req.body?.promoPriceTnd ?? course.promoPriceTnd ?? 0));
    course.promoPriceUsd = Math.max(0, Number(req.body?.promoPriceUsd ?? course.promoPriceUsd ?? 0));
    course.category = typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim() : course.category;
    course.access = req.body?.access === 'paid' ? 'paid' : 'free';
    course.status = req.body?.status === 'draft' ? 'draft' : 'published';
    
    console.log(`✅ Formation mise à jour: ${course.id}`);
    res.json(course);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la formation.' });
  }
});

app.delete('/api/instructor/courses/:courseId', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const index = courses.findIndex((item) => item.id === req.params.courseId && instructorOwnsCourse(user, item));
  if (index === -1) return res.status(404).json({ error: 'Formation introuvable.' });
  courses.splice(index, 1);
  res.status(204).send();
});

app.post('/api/instructor/formulas', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['instructor']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (title.length < 3) return res.status(400).json({ error: 'Le titre de la formule doit contenir au moins 3 caractères.' });

    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    if (description.length < 5) return res.status(400).json({ error: 'La description de la formule doit contenir au moins 5 caractères.' });

    const formula: TrainingFormula = {
      id: `formula-${Date.now()}`,
      title,
      description,
      image: typeof req.body?.image === 'string' && req.body.image.trim() ? req.body.image.trim() : 'module-nutrition-pathologie.svg',
      highlights: Array.isArray(req.body?.highlights) ? req.body.highlights.map((item: unknown) => String(item).trim()).filter(Boolean) : [],
      instructorId: user.id,
      priceEur: Math.max(0, Number(req.body?.priceEur ?? 0)),
      priceTnd: Math.max(0, Number(req.body?.priceTnd ?? 0)),
      priceUsd: Math.max(0, Number(req.body?.priceUsd ?? 0)),
      pricingCurrency: ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : 'EUR',
      promoEnabled: Boolean(req.body?.promoEnabled),
      promoPriceEur: Math.max(0, Number(req.body?.promoPriceEur ?? 0)),
      promoPriceTnd: Math.max(0, Number(req.body?.promoPriceTnd ?? 0)),
      promoPriceUsd: Math.max(0, Number(req.body?.promoPriceUsd ?? 0)),
      status: req.body?.status === 'draft' ? 'draft' : 'published',
    };

    if (formula.priceEur <= 0 && (formula.priceTnd ?? 0) <= 0 && (formula.priceUsd ?? 0) <= 0) {
      return res.status(400).json({ error: 'Ajoutez au moins un prix valide pour la formule.' });
    }

    formulas.unshift(formula);
    res.status(201).json(formula);
  } catch (error) {
    console.error('❌ Erreur lors de la création de formule:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la formule.' });
  }
});

app.put('/api/instructor/formulas/:formulaId', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['instructor']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const formula = formulas.find((item) => item.id === req.params.formulaId && instructorOwnsFormula(user, item));
    if (!formula) return res.status(404).json({ error: 'Formule introuvable.' });

    if (req.body?.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (title.length < 3) return res.status(400).json({ error: 'Le titre de la formule doit contenir au moins 3 caractères.' });
      formula.title = title;
    }

    if (req.body?.description !== undefined) {
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      if (description.length < 5) return res.status(400).json({ error: 'La description de la formule doit contenir au moins 5 caractères.' });
      formula.description = description;
    }

    if (Array.isArray(req.body?.highlights)) {
      formula.highlights = req.body.highlights.map((item: unknown) => String(item).trim()).filter(Boolean);
    }

    formula.image = typeof req.body?.image === 'string' && req.body.image.trim() ? req.body.image.trim() : formula.image;
    formula.priceEur = Math.max(0, Number(req.body?.priceEur ?? formula.priceEur));
    formula.priceTnd = Math.max(0, Number(req.body?.priceTnd ?? formula.priceTnd ?? 0));
    formula.priceUsd = Math.max(0, Number(req.body?.priceUsd ?? formula.priceUsd ?? 0));
    formula.pricingCurrency = ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : formula.pricingCurrency ?? 'EUR';
    formula.promoEnabled = typeof req.body?.promoEnabled === 'boolean' ? req.body.promoEnabled : formula.promoEnabled ?? false;
    formula.promoPriceEur = Math.max(0, Number(req.body?.promoPriceEur ?? formula.promoPriceEur ?? 0));
    formula.promoPriceTnd = Math.max(0, Number(req.body?.promoPriceTnd ?? formula.promoPriceTnd ?? 0));
    formula.promoPriceUsd = Math.max(0, Number(req.body?.promoPriceUsd ?? formula.promoPriceUsd ?? 0));
    formula.status = req.body?.status === 'draft' ? 'draft' : 'published';

    if (formula.priceEur <= 0 && (formula.priceTnd ?? 0) <= 0 && (formula.priceUsd ?? 0) <= 0) {
      return res.status(400).json({ error: 'Ajoutez au moins un prix valide pour la formule.' });
    }

    res.json(formula);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de formule:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la formule.' });
  }
});

app.delete('/api/instructor/formulas/:formulaId', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const index = formulas.findIndex((item) => item.id === req.params.formulaId && instructorOwnsFormula(user, item));
  if (index === -1) return res.status(404).json({ error: 'Formule introuvable.' });

  formulas.splice(index, 1);
  res.status(204).send();
});

app.get('/api/instructor/resources', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  res.json({
    sessions: liveSessions
      .filter((session) => session.createdBy === user.id)
      .map((session) => ({ ...session, courseTitle: getCourseTitle(session.courseId) })),
    resources: resources
      .filter((resource) => resource.createdBy === user.id)
      .map((resource) => ({ ...resource, courseTitle: getCourseTitle(resource.courseId) })),
  });
});

app.get('/api/instructor/schedule', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  res.json(
    scheduleEntries
      .filter((entry) => entry.createdBy === user.id)
      .map((entry) => ({
        ...entry,
        courseTitle: getCourseTitle(entry.courseId),
      }))
  );
});

app.post('/api/instructor/schedule', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId.trim() : '';
  const day = typeof req.body?.day === 'string' ? req.body.day.trim() : '';
  const startTime = typeof req.body?.startTime === 'string' ? req.body.startTime.trim() : '';
  const endTime = typeof req.body?.endTime === 'string' ? req.body.endTime.trim() : '';

  if (title.length < 3 || !courseId || !day || !startTime || !endTime) {
    return res.status(400).json({ error: 'Donnees emploi du temps invalides.' });
  }

  const course = courses.find((item) => item.id === courseId && instructorOwnsCourse(user, item));
  if (!course) {
    return res.status(404).json({ error: 'Formation introuvable pour cette formatrice.' });
  }

  const entry: ScheduleEntry = {
    id: `schedule-${Date.now()}`,
    title,
    courseId,
    day,
    startTime,
    endTime,
    format: ['online', 'onsite', 'hybrid'].includes(req.body?.format) ? req.body.format : 'online',
    room: typeof req.body?.room === 'string' ? req.body.room.trim() : '',
    notes: typeof req.body?.notes === 'string' ? req.body.notes.trim() : '',
    createdBy: user.id,
  };

  scheduleEntries.unshift(entry);
  res.status(201).json({
    ...entry,
    courseTitle: getCourseTitle(entry.courseId),
  });
});

app.delete('/api/instructor/schedule/:entryId', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const index = scheduleEntries.findIndex((entry) => entry.id === req.params.entryId && entry.createdBy === user.id);
  if (index === -1) return res.status(404).json({ error: 'Creneau introuvable.' });

  scheduleEntries.splice(index, 1);
  res.status(204).send();
});

app.post('/api/instructor/live-sessions', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const session: LiveSession = {
    id: `live-${Date.now()}`,
    title: typeof req.body?.title === 'string' ? req.body.title.trim() : 'Session live',
    courseId: String(req.body?.courseId ?? ''),
    scheduledAt: typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : new Date().toISOString(),
    meetLink: typeof req.body?.meetLink === 'string' ? req.body.meetLink.trim() : '',
    notes: typeof req.body?.notes === 'string' ? req.body.notes.trim() : '',
    createdBy: user.id,
  };
  liveSessions.unshift(session);

  for (const studentId of getStudentIdsForCourse(session.courseId)) {
    const student = memoryUsers.find((item) => item.id === studentId);
    if (!student) continue;
    messages.unshift({
      id: `msg-live-${studentId}-${Date.now()}`,
      studentId,
      studentName: student.name,
      senderId: user.id,
      senderRole: 'instructor',
      senderName: user.name,
      recipientId: student.id,
      recipientRole: 'student',
      recipientName: student.name,
      subject: `Session live - ${session.title}`,
      content: `Une session Google Meet est planifiée pour ${getCourseTitle(session.courseId)}. Lien : ${session.meetLink}`,
      sentAt: new Date().toISOString(),
    });
  }

  res.status(201).json({ ...session, courseTitle: getCourseTitle(session.courseId) });
});

app.post('/api/instructor/resources', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const resource: ResourceItem = {
    id: `res-${Date.now()}`,
    title: typeof req.body?.title === 'string' ? req.body.title.trim() : 'Ressource',
    description: typeof req.body?.description === 'string' ? req.body.description.trim() : '',
    courseId: String(req.body?.courseId ?? ''),
    type: ['pdf', 'video', 'audio', 'link'].includes(req.body?.type) ? req.body.type : 'link',
    url: typeof req.body?.url === 'string' ? req.body.url.trim() : '',
    createdBy: user.id,
  };
  resources.unshift(resource);
  res.status(201).json({ ...resource, courseTitle: getCourseTitle(resource.courseId) });
});

app.get('/api/instructor/students', (_req, res): any => {
  const students = memoryUsers
    .filter((user) => user.role === 'student')
    .map((user) => {
      const workspace = ensureStudentWorkspace(user);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: workspace.profile.phone,
        city: workspace.profile.city,
        country: workspace.profile.country,
        enrolledCourses: workspace.enrollments.map((item) => getCourseTitle(item.courseId)),
        averageScore: getStudentAverage(user.id),
      };
    });
  res.json(students);
});

app.get('/api/instructor/messages', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessagesForUser(user.id));
});

app.get('/api/instructor/message-contacts', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessageContactsForUser(user.id));
});

app.post('/api/instructor/messages', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const recipientId = typeof req.body?.recipientId === 'string' ? req.body.recipientId.trim() : '';
  const recipient = memoryUsers.find((item) => item.id === recipientId && item.id !== user.id);
  const studentId = recipient?.id ?? '';
  const student = recipient;
  if (!student) return res.status(404).json({ error: 'Étudiante introuvable.' });

  const message: MessageRecord = {
    id: `msg-${Date.now()}`,
    studentId,
    studentName: student.name,
    senderId: user.id,
    senderRole: 'instructor',
    senderName: user.name,
    recipientId: recipient.id,
    recipientRole: recipient.role,
    recipientName: recipient.name,
    subject: typeof req.body?.subject === 'string' ? req.body.subject.trim() : 'Réponse formatrice',
    content: typeof req.body?.content === 'string' ? req.body.content.trim() : '',
    sentAt: new Date().toISOString(),
  };
  messages.unshift(message);
  res.status(201).json(message);
});

app.get('/api/admin/messages', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessagesForUser(user.id));
});

app.get('/api/admin/message-contacts', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(getMessageContactsForUser(user.id));
});

app.post('/api/admin/messages', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const recipientId = typeof req.body?.recipientId === 'string' ? req.body.recipientId.trim() : '';
  const recipient = memoryUsers.find((item) => item.id === recipientId && item.id !== user.id);
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

  if (!recipient || subject.length < 3 || content.length < 3) {
    return res.status(400).json({ error: 'Message invalide.' });
  }

  const message: MessageRecord = {
    id: `msg-${Date.now()}`,
    studentId: recipient.role === 'student' ? recipient.id : user.id,
    studentName: recipient.role === 'student' ? recipient.name : '',
    senderId: user.id,
    senderRole: 'admin',
    senderName: user.name,
    recipientId: recipient.id,
    recipientRole: recipient.role,
    recipientName: recipient.name,
    subject,
    content,
    sentAt: new Date().toISOString(),
  };
  messages.unshift(message);
  res.status(201).json(message);
});

app.get('/api/instructor/exams', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  res.json(
    exams
      .filter((exam) => {
        const course = courses.find((item) => item.id === exam.courseId);
        return course ? instructorOwnsCourse(user, course) : false;
      })
      .map((exam) => ({
        id: exam.id,
        title: exam.title,
        courseId: exam.courseId,
        courseTitle: getCourseTitle(exam.courseId),
        dueDate: exam.dueDate,
        assignedBy: exam.assignedBy,
        averageScore: getExamAverage(exam.id),
        submissions: Array.from(studentAttempts.values()).filter((attempts) => attempts.some((item) => item.examId === exam.id)).length,
        questions: exam.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          points: question.points,
        })),
      }))
  );
});

app.post('/api/instructor/exams', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const courseId = String(req.body?.courseId ?? '');
  const dueDate = typeof req.body?.dueDate === 'string' ? req.body.dueDate : new Date().toISOString();
  const incomingQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];
  if (title.length < 3 || !courseId || !incomingQuestions.length) {
    return res.status(400).json({ error: 'Examen invalide.' });
  }

  const exam: ExamTemplate = {
    id: `exam-${Date.now()}`,
    title,
    courseId,
    assignedBy: user.name,
    dueDate,
    questions: incomingQuestions.map((question: any, index: number) => ({
      id: `question-${Date.now()}-${index}`,
      prompt: String(question.prompt ?? '').trim(),
      options: Array.isArray(question.options) ? question.options.map((option: unknown) => String(option)) : [],
      correctIndex: Number(question.correctIndex ?? 0),
      points: Number(question.points ?? 0),
    })),
  };
  exams.unshift(exam);

  res.status(201).json({
    id: exam.id,
    title: exam.title,
    courseId: exam.courseId,
    courseTitle: getCourseTitle(exam.courseId),
    dueDate: exam.dueDate,
    assignedBy: exam.assignedBy,
    averageScore: 0,
    submissions: 0,
    questions: exam.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      points: question.points,
    })),
  });
});

app.get('/api/instructor/profile', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const profile = ensureRoleProfile(user);
  res.json({ id: user.id, name: user.name, email: user.email, ...profile });
});

app.put('/api/instructor/profile', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const profile = ensureRoleProfile(user);
  profile.phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : profile.phone;
  profile.city = typeof req.body?.city === 'string' ? req.body.city.trim() : profile.city;
  profile.country = typeof req.body?.country === 'string' ? req.body.country.trim() : profile.country;
  profile.bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : profile.bio;
  const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : user.name;
  const memoryUser = memoryUsers.find((item) => item.id === user.id);
  if (memoryUser) memoryUser.name = name;
  void persistUserProfile(user.id, { name, phone: profile.phone, city: profile.city, country: profile.country, bio: profile.bio });
  res.json({ id: user.id, name, email: user.email, ...profile });
});

app.get('/api/admin/overview', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json({
    totalUsers: await countUsers(),
    activeCourses: courses.length,
    totalRevenue: paymentRecords.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amountEur, 0),
    revenueData: revenue,
    pendingApprovals: publicEnrollmentRequests
      .filter((request) => request.status === 'pending')
      .map((request) => ({
        id: request.id,
        name: request.name,
        type: request.courseTitle,
      })),
  });
});

app.get('/api/admin/users', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const allUsers = await getAllUsers();
  res.json(
    allUsers.map((current) => {
      const workspace = current.role === 'student' ? ensureStudentWorkspace(current) : null;
      const profile = current.role !== 'student' ? ensureRoleProfile(current) : null;
      return {
        id: current.id,
        name: current.name,
        email: current.email,
        role: current.role,
        city: workspace?.profile.city ?? profile?.city ?? '',
        country: workspace?.profile.country ?? profile?.country ?? '',
        courses: current.role === 'student' ? workspace?.enrollments.length ?? 0 : courses.filter((course) => course.instructorId === current.id).length,
      };
    })
  );
});

app.put('/api/admin/users/:userId', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const role = req.body?.role as UserRole;
  if (!['student', 'instructor', 'admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide.' });

  updateMemoryUserRole(req.params.userId, role);
  const allUsers = await getAllUsers();
  const target = allUsers.find((item) => item.id === req.params.userId);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  target.role = role;

  res.json({
    id: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    city: '',
    country: '',
    courses: role === 'student' ? ensureStudentWorkspace(target).enrollments.length : courses.filter((course) => course.instructorId === target.id).length,
  });
});

app.get('/api/admin/courses', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(courses);
});

app.post('/api/admin/courses', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['admin']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'Le titre est obligatoire.' });
    if (title.length < 3) return res.status(400).json({ error: 'Le titre doit contenir au moins 3 caractères.' });

    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    if (!description) return res.status(400).json({ error: 'La description est obligatoire.' });
    if (description.length < 5) return res.status(400).json({ error: 'La description doit contenir au moins 5 caractères.' });

    const moduleItems = Array.isArray(req.body?.moduleItems)
      ? req.body.moduleItems
          .map((item: any, index: number) => ({
            id: typeof item?.id === 'string' && item.id ? item.id : `module-${Date.now()}-${index}`,
            title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `Module ${index + 1}`,
            pdfName: typeof item?.pdfName === 'string' ? item.pdfName : `module-${index + 1}.pdf`,
            pdfDataUrl: typeof item?.pdfDataUrl === 'string' ? item.pdfDataUrl : '',
            videoName: typeof item?.videoName === 'string' ? item.videoName : '',
            videoDataUrl: typeof item?.videoDataUrl === 'string' ? item.videoDataUrl : '',
            audioName: typeof item?.audioName === 'string' ? item.audioName : '',
            audioDataUrl: typeof item?.audioDataUrl === 'string' ? item.audioDataUrl : '',
          }))
          .filter((item: any) => item.pdfDataUrl && item.title.trim())
      : [];
    const objectives = parseTextList(req.body?.objectives);
    const contentItems = parseContentItems(req.body?.contentItems);
    const chapters = parseChapterItems(req.body?.chapters);
    const presentation = typeof req.body?.presentation === 'string' ? req.body.presentation.trim() : '';
    const warning = typeof req.body?.warning === 'string' ? req.body.warning.trim() : '';

    const status = req.body?.status === 'draft' ? 'draft' : 'published';
    
    if (status === 'published' && moduleItems.length === 0) {
      return res.status(400).json({ error: 'Vous devez ajouter au moins un module PDF pour publier la formation.' });
    }

    // Admin crée une formation sans instructeur spécifique - elle est associée à l'admin
    const course: Course = {
      id: `course-${Date.now()}`,
      title,
      description,
      instructorId: user.id,
      modules: moduleItems.length || Number(req.body?.modules ?? 1),
      students: 0,
      thumbnail: typeof req.body?.thumbnail === 'string' && req.body.thumbnail.trim() ? req.body.thumbnail.trim() : 'module-nutrition-pathologie.svg',
      access: req.body?.access === 'paid' ? 'paid' : 'free',
      priceEur: Math.max(0, Number(req.body?.priceEur ?? 0)),
      priceTnd: Math.max(0, Number(req.body?.priceTnd ?? 0)),
      priceUsd: Math.max(0, Number(req.body?.priceUsd ?? 0)),
      pricingCurrency: ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : 'EUR',
      promoEnabled: Boolean(req.body?.promoEnabled),
      promoPriceEur: Math.max(0, Number(req.body?.promoPriceEur ?? 0)),
      promoPriceTnd: Math.max(0, Number(req.body?.promoPriceTnd ?? 0)),
      promoPriceUsd: Math.max(0, Number(req.body?.promoPriceUsd ?? 0)),
      category: typeof req.body?.category === 'string' ? req.body.category.trim() : 'Formation',
      status,
      presentation,
      warning,
      objectives,
      contentItems,
      chapters,
      moduleItems,
    };
    courses.unshift(course);
    console.log(`✅ Formation créée par admin: ${course.id} par ${user.name}`);
    res.status(201).json(course);
  } catch (error) {
    console.error('❌ Erreur lors de la création de formation (admin):', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la formation.' });
  }
});

app.put('/api/admin/courses/:courseId', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['admin']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const course = courses.find((item) => item.id === req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

    // Valider et mettre à jour le titre
    if (req.body?.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (title && title.length >= 3) {
        course.title = title;
      }
    }

    // Valider et mettre à jour la description
    if (req.body?.description !== undefined) {
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      if (description && description.length >= 5) {
        course.description = description;
      }
    }

    course.thumbnail = typeof req.body?.thumbnail === 'string' && req.body.thumbnail.trim() ? req.body.thumbnail.trim() : course.thumbnail;
    
    if (Array.isArray(req.body?.moduleItems)) {
      course.moduleItems = req.body.moduleItems
        .map((item: any, index: number) => ({
          id: typeof item?.id === 'string' && item.id ? item.id : `module-${Date.now()}-${index}`,
          title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `Module ${index + 1}`,
          pdfName: typeof item?.pdfName === 'string' ? item.pdfName : `module-${index + 1}.pdf`,
          pdfDataUrl: typeof item?.pdfDataUrl === 'string' ? item.pdfDataUrl : '',
          videoName: typeof item?.videoName === 'string' ? item.videoName : '',
          videoDataUrl: typeof item?.videoDataUrl === 'string' ? item.videoDataUrl : '',
          audioName: typeof item?.audioName === 'string' ? item.audioName : '',
          audioDataUrl: typeof item?.audioDataUrl === 'string' ? item.audioDataUrl : '',
        }))
        .filter((item: any) => item.pdfDataUrl && item.title.trim());
    }
    if (req.body?.presentation !== undefined) {
      course.presentation = typeof req.body.presentation === 'string' ? req.body.presentation.trim() : '';
    }
    if (req.body?.warning !== undefined) {
      course.warning = typeof req.body.warning === 'string' ? req.body.warning.trim() : '';
    }
    if (Array.isArray(req.body?.objectives)) {
      course.objectives = parseTextList(req.body.objectives);
    }
    if (Array.isArray(req.body?.contentItems)) {
      course.contentItems = parseContentItems(req.body.contentItems);
    }
    if (Array.isArray(req.body?.chapters)) {
      course.chapters = parseChapterItems(req.body.chapters);
    }
    
    course.modules = course.moduleItems?.length || Number(req.body?.modules ?? course.modules);
    course.priceEur = Math.max(0, Number(req.body?.priceEur ?? course.priceEur));
    course.priceTnd = Math.max(0, Number(req.body?.priceTnd ?? course.priceTnd ?? 0));
    course.priceUsd = Math.max(0, Number(req.body?.priceUsd ?? course.priceUsd ?? 0));
    course.pricingCurrency = ['EUR', 'TND', 'USD'].includes(req.body?.pricingCurrency) ? req.body.pricingCurrency : course.pricingCurrency ?? 'EUR';
    course.promoEnabled = typeof req.body?.promoEnabled === 'boolean' ? req.body.promoEnabled : course.promoEnabled ?? false;
    course.promoPriceEur = Math.max(0, Number(req.body?.promoPriceEur ?? course.promoPriceEur ?? 0));
    course.promoPriceTnd = Math.max(0, Number(req.body?.promoPriceTnd ?? course.promoPriceTnd ?? 0));
    course.promoPriceUsd = Math.max(0, Number(req.body?.promoPriceUsd ?? course.promoPriceUsd ?? 0));
    course.category = typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim() : course.category;
    course.access = req.body?.access === 'paid' ? 'paid' : 'free';
    course.status = req.body?.status === 'draft' ? 'draft' : 'published';
    
    console.log(`✅ Formation mise à jour par admin: ${course.id}`);
    res.json(course);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour (admin):', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la formation.' });
  }
});

app.delete('/api/admin/courses/:courseId', (req, res): any => {
  try {
    const user = getCurrentUser(req, ['admin']);
    if (!user) return res.status(401).json({ error: 'Authentification requise.' });

    const index = courses.findIndex((item) => item.id === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: 'Formation introuvable.' });
    
    const deleted = courses.splice(index, 1)[0];
    console.log(`✅ Formation supprimée par admin: ${deleted.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la formation.' });
  }
});

app.get('/api/admin/payments', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(paymentRecords.map((payment) => ({ ...payment, courseTitle: getCourseTitle(payment.courseId) })));
});

app.get('/api/admin/enrollment-requests', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const users = await getAllUsers();
  res.json(
    publicEnrollmentRequests.map((request) => {
      const matchedStudent = users.find((item) =>
        item.role === 'student' && (
          item.id === request.studentId ||
          normalizeEmail(item.email) === normalizeEmail(request.email)
        )
      );

      return {
        ...request,
        matchedStudentId: matchedStudent?.id,
        matchedStudentName: matchedStudent?.name ?? null,
      };
    })
  );
});

app.post('/api/admin/enrollment-requests/:requestId/approve', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const request = publicEnrollmentRequests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' });
  if (request.status === 'approved') return res.json(request);

  const course = courses.find((item) => item.id === request.courseId);
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

  const users = await getAllUsers();
  const student = users.find((item) =>
    item.role === 'student' && (
      item.id === request.studentId ||
      normalizeEmail(item.email) === normalizeEmail(request.email)
    )
  );

  if (!student) {
    return res.status(400).json({ error: 'Aucun compte etudiante ne correspond a cette demande. Connectez-vous avec le meme email ou creez ce compte etudiante avant validation.' });
  }

  const workspace = ensureStudentWorkspace(student);
  if (!workspace.enrollments.some((item) => item.courseId === course.id)) {
    workspace.enrollments.push({ courseId: course.id, progress: 0 });
    course.students += 1;
  }

  request.studentId = student.id;
  request.status = 'approved';
  request.approvedAt = new Date().toISOString();
  request.approvedBy = user.name;

  if (course.access === 'paid') {
    const existingPayment = paymentRecords.find((payment) =>
      payment.studentId === student.id &&
      payment.courseId === course.id
    );

    if (existingPayment) {
      existingPayment.status = 'paid';
      existingPayment.paidAt = new Date().toISOString();
      existingPayment.amountEur = estimateEnrollmentAmount(course, request);
    } else {
      paymentRecords.unshift({
        id: `pay-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        courseId: course.id,
        amountEur: estimateEnrollmentAmount(course, request),
        status: 'paid',
        paidAt: new Date().toISOString(),
      });
    }
  }

  messages.unshift({
    id: `msg-enroll-${Date.now()}`,
    studentId: student.id,
    studentName: student.name,
    senderId: user.id,
    senderRole: 'admin',
    senderName: user.name,
    recipientId: student.id,
    recipientRole: 'student',
    recipientName: student.name,
    subject: `Acces valide - ${course.title}`,
    content: `Votre demande pour la formation ${course.title} a ete acceptee. La formation est maintenant accessible dans votre espace etudiante.`,
    sentAt: new Date().toISOString(),
  });

  res.json(request);
});

app.get('/api/admin/stats', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  res.json(await buildAdminStatsSnapshot());
});

app.get('/api/admin/profile', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const profile = ensureRoleProfile(user);
  res.json({ id: user.id, name: user.name, email: user.email, ...profile });
});

app.put('/api/admin/profile', (req, res): any => {
  const user = getCurrentUser(req, ['admin']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const profile = ensureRoleProfile(user);
  profile.phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : profile.phone;
  profile.city = typeof req.body?.city === 'string' ? req.body.city.trim() : profile.city;
  profile.country = typeof req.body?.country === 'string' ? req.body.country.trim() : profile.country;
  profile.bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : profile.bio;
  const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : user.name;
  const memoryUser = memoryUsers.find((item) => item.id === user.id);
  if (memoryUser) memoryUser.name = name;
  void persistUserProfile(user.id, { name, phone: profile.phone, city: profile.city, country: profile.country, bio: profile.bio });
  res.json({ id: user.id, name, email: user.email, ...profile });
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found' });
    return;
  }
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

export async function startServer(): Promise<void> {
  if (serverStarted) return;
  serverStarted = true;

  const port = Number(process.env['PORT'] || 4000);
  void getDbPool();

  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  void startServer();
}

export const reqHandler = createNodeRequestHandler(app);
