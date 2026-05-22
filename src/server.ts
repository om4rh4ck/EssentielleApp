import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request } from 'express';
import multer from 'multer';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import mysql, { Pool } from 'mysql2/promise';
import nodemailer from 'nodemailer';
import {
  assertTokenSecretConfigured,
  createPasswordResetToken,
  createToken,
  getCurrentUser,
  getUsernameFromEmail,
  hashPassword,
  makeStoredUser,
  normalizeEmail,
  verifyPassword,
  verifyPasswordResetToken,
  type PublicUser,
  type StoredUser,
  type UserRole,
} from './server/auth';
import { apiLimiter, applyBaseSecurity, authLimiter, loginLimiter } from './server/security';
import { registerUploadRoutes } from './server/uploads';

const browserDistFolder = join(import.meta.dirname, '../browser');

type CourseAccess = 'free' | 'paid';
type CourseStatus = 'published' | 'draft';
type MessageRole = 'student' | 'instructor' | 'admin';

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
  identifier?: string;
  password?: string;
}

interface ForgotPasswordPayload {
  email?: string;
  identifier?: string;
}

interface ResetPasswordPayload {
  token?: string;
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
  quizTitle?: string;
  quizQuestions?: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
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

interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
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
  pdfUrl?: string;
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
  examType?: 'quiz' | 'final';
  durationMinutes?: number;
  maxAttempts?: number;
  gradingScaleMax?: number;
  passThreshold?: number;
  questions: ExamQuestion[];
}

interface StudentAttempt {
  examId: string;
  answers: Record<string, number>; // {questionId: selectedOptionIndex}
  score: number;        // scaled to gradingScaleMax (e.g. 84 for 84/100 or 17 for 17/20)
  rawScore: number;     // earnedScore: sum of points for correct answers
  totalPoints: number;  // max possible earnedScore
  percentage: number;   // (rawScore / totalPoints) * 100
  submittedAt: string;
  attemptCount: number;
}

interface GradeResult {
  earnedScore: number;
  totalPoints: number;
  percentage: number;
  scaledScore: number;
  passed: boolean;
  perQuestion: Array<{ questionId: string; correct: boolean; earned: number; points: number }>;
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

// Sécurité HTTP de base (helmet)
applyBaseSecurity(app);

// Trust proxy headers (Hostinger / reverse proxy) — nécessaire pour que
// express-rate-limit voie la vraie IP du client.
app.set('trust proxy', 1);

// Rate-limit global pour /api/* (très permissif, protège du DoS basique)
app.use('/api', apiLimiter);

// Limite de payload réduite à 25 Mo pour la majorité des routes JSON.
// La route /api/uploads gère elle-même multer en streaming, donc cette
// limite ne s'applique pas aux gros fichiers.
// NOTE: les anciens endpoints qui acceptaient des dataUrl base64 jusqu'à
// 250 Mo restent fonctionnels tant que le frontend n'a pas migré, mais on
// ne devrait plus envoyer de média en JSON — utiliser POST /api/uploads.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Routes d'upload de médias (multer + serving /uploads)
registerUploadRoutes(app);

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
    modules: 7,
    students: 210,
    thumbnail: '/uploads/nutrition-cover.jpeg',
    description: "Formation complète en Nutrition & Pathologies Courantes : macronutriments, digestion, glycémie, hypertension, troubles digestifs, coaching nutritionnel et études de cas cliniques.",
    access: 'free',
    priceEur: 0,
    priceTnd: 0,
    priceUsd: 0,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    category: 'Nutrition',
    status: 'published',
    presentation: "Bienvenue dans la Formation Nutrition & Pathologies Courantes — Essenti' Elle Formation et Bien Être. Cette formation complète de 7 modules vous apporte une maîtrise solide de la nutrition humaine et des pathologies courantes. À travers des contenus structurés, des études de cas réels et des conseils pratiques, vous serez capable d'accompagner des clients vers un rééquilibrage alimentaire adapté à leur profil et leurs pathologies.",
    warning: "Cette formation est à visée éducative et professionnelle. Elle ne remplace pas un diagnostic ou un suivi médical. Elle a pour but de former des accompagnants nutritionnels dans un cadre bienveillant et professionnel.",
    objectives: [
      "Maîtriser les fondamentaux de la nutrition humaine (macronutriments, micronutriments, métabolisme)",
      "Comprendre le fonctionnement digestif et le rôle du microbiote intestinal",
      "Adapter l'alimentation à la glycémie, au diabète et à l'index glycémique",
      "Gérer l'hypertension artérielle par une approche nutritionnelle ciblée",
      "Identifier et prendre en charge les troubles digestifs courants (reflux, intolérances, ballonnements)",
      "Assurer un accompagnement nutritionnel professionnel (bilan, objectifs, suivi, motivation)",
      "Analyser des études de cas cliniques et proposer des programmes personnalisés",
    ],
    contentItems: [
      { id: 'content-1-1', text: '7 modules complets avec cours structurés' },
      { id: 'content-1-2', text: 'PDF de formation complet téléchargeable (70 pages)' },
      { id: 'content-1-3', text: 'Galerie illustrée — 8 visuels pédagogiques' },
      { id: 'content-1-4', text: 'Quiz de contrôle des acquis noté sur 10' },
      { id: 'content-1-5', text: 'Études de cas cliniques réels (5 cas)' },
      { id: 'content-1-6', text: 'Certificat de validation à la fin de la formation' },
    ],
    galleryImages: [
      '/uploads/nutrition-im1.jpeg',
      '/uploads/nutrition-im2.jpeg',
      '/uploads/nutrition-im3.jpeg',
      '/uploads/nutrition-im4.jpeg',
      '/uploads/nutrition-im5.jpeg',
      '/uploads/nutrition-im6.jpeg',
      '/uploads/nutrition-im7.jpeg',
      '/uploads/nutrition-im8.jpeg',
    ],
    chapters: [
      { id: 'ch-1-1', title: 'Module 1 : Bases de la Nutrition', content: "Introduction à l'alimentation, macronutriments (glucides, protéines, lipides), micronutriments, métabolisme, hydratation et équilibre nutritionnel." },
      { id: 'ch-1-2', title: 'Module 2 : Digestion & Microbiote', content: "Fonctionnement du système digestif, santé intestinale, microbiote, ballonnements, inflammation et alimentation anti-inflammatoire." },
      { id: 'ch-1-3', title: 'Module 3 : Glycémie & Diabète', content: "Comprendre la glycémie, index glycémique, impact du sucre sur l'inflammation, construction de menus adaptés et hygiène de vie." },
      { id: 'ch-1-4', title: 'Module 4 : Hypertension & Alimentation', content: "Mécanismes de l'hypertension, impact du sel, alimentation protectrice cardiovasculaire, menus adaptés et conseils pratiques." },
      { id: 'ch-1-5', title: 'Module 5 : Troubles Digestifs', content: "Constipation, reflux gastrique, intolérances alimentaires (lactose, gluten), aliments irritants et protocoles de rééquilibrage intestinal." },
      { id: 'ch-1-6', title: 'Module 6 : Accompagnement Nutritionnel', content: "Bilan nutritionnel initial, définition d'objectifs réalistes, techniques de suivi personnalisé, gestion de la motivation et posture professionnelle du coach." },
      { id: 'ch-1-7', title: 'Module 7 : Études de Cas Cliniques', content: "Analyse de 5 cas réels : glycémie et fatigue post-repas, fatigue chronique, surpoids, troubles digestifs et rééquilibrage alimentaire global." },
    ],
    programModules: [
      {
        id: 'pm-1-1',
        title: 'Module 1 : Bases de la Nutrition',
        chapters: [
          "Introduction — Rôle de l'alimentation dans la santé",
          "Les macronutriments : glucides, protéines, lipides",
          "Les micronutriments : vitamines, minéraux, oligo-éléments",
          "Le métabolisme et la dépense énergétique",
          "L'hydratation : besoins et conseils pratiques",
          "Principes d'une alimentation équilibrée",
        ],
      },
      {
        id: 'pm-1-2',
        title: 'Module 2 : Digestion & Microbiote',
        chapters: [
          "Introduction — Digestion et santé globale",
          "Fonctionnement du système digestif",
          "Intestin et immunité",
          "Le microbiote intestinal : rôle et facteurs d'équilibre",
          "Les ballonnements : causes et solutions",
          "Inflammation et alimentation anti-inflammatoire",
        ],
      },
      {
        id: 'pm-1-3',
        title: 'Module 3 : Glycémie & Diabète',
        chapters: [
          "Introduction — Glycémie et alimentation",
          "Comprendre la glycémie et ses déséquilibres",
          "L'index glycémique des aliments",
          "Sucre, inflammation et conséquences",
          "Construire des menus adaptés au diabète",
          "Conseils pratiques et hygiène de vie globale",
        ],
      },
      {
        id: 'pm-1-4',
        title: 'Module 4 : Hypertension & Alimentation',
        chapters: [
          "Introduction — L'hypertension artérielle",
          "Comprendre les mécanismes de l'hypertension",
          "Impact du sel sur l'organisme",
          "Sucre, inflammation et tension artérielle",
          "Menus adaptés à l'hypertension",
          "Conseils pratiques et mode de vie cardiovasculaire",
        ],
      },
      {
        id: 'pm-1-5',
        title: 'Module 5 : Troubles Digestifs',
        chapters: [
          "Introduction — Troubles digestifs et alimentation",
          "La constipation : causes et protocole",
          "Le reflux gastrique",
          "Les intolérances alimentaires (lactose, gluten)",
          "Les aliments irritants",
          "Rééquilibrage intestinal",
        ],
      },
      {
        id: 'pm-1-6',
        title: 'Module 6 : Accompagnement Nutritionnel',
        chapters: [
          "Introduction au coaching nutritionnel",
          "Le bilan nutritionnel et les habitudes de vie",
          "Définir des objectifs réalistes et progressifs",
          "Techniques de suivi personnalisé",
          "Maintien de la motivation et bienveillance",
        ],
      },
      {
        id: 'pm-1-7',
        title: 'Module 7 : Études de Cas Cliniques',
        chapters: [
          "Cas 1 — Fatigue post-repas et déséquilibre glycémique",
          "Cas 2 — Fatigue chronique et carences nutritionnelles",
          "Cas 3 — Surpoids et rééquilibrage alimentaire",
          "Cas 4 — Troubles digestifs (ballonnements, reflux)",
          "Cas 5 — Programme de rééquilibrage alimentaire global",
        ],
      },
    ],
    moduleItems: [
      {
        id: 'module-1-pdf',
        title: 'Formation Nutrition & Pathologies Courantes — Cours complet',
        pdfName: 'formation-nutrition-pathologies.pdf',
        pdfDataUrl: '/uploads/formation-nutrition-pathologies.pdf',
      },
    ],
    quizQuestions: [
      {
        id: 'nutrition-q1',
        prompt: 'Quel nutriment est la principale source d\'énergie du corps humain ?',
        options: ['Les lipides', 'Les glucides', 'Les protéines', 'Les vitamines'],
        correctIndex: 1,
      },
      {
        id: 'nutrition-q2',
        prompt: 'Quel aliment est recommandé pour réduire l\'inflammation chronique ?',
        options: ['Sucre raffiné', 'Huile de palme', 'Poisson gras (oméga-3)', 'Charcuterie'],
        correctIndex: 2,
      },
      {
        id: 'nutrition-q3',
        prompt: 'Quel est le facteur alimentaire principal dans la gestion du diabète de type 2 ?',
        options: [
          'Augmenter la consommation de graisses saturées',
          'Réduire les sucres rapides et équilibrer les glucides',
          'Supprimer toutes les protéines',
          'Manger uniquement des fruits',
        ],
        correctIndex: 1,
      },
      {
        id: 'nutrition-q4',
        prompt: 'Quel minéral joue un rôle clé dans la régulation de la pression artérielle ?',
        options: ['Le fer', 'Le zinc', 'Le potassium', 'Le cuivre'],
        correctIndex: 2,
      },
      {
        id: 'nutrition-q5',
        prompt: 'Quelle habitude alimentaire favorise une bonne digestion ?',
        options: [
          'Manger rapidement sans mâcher',
          'Boire beaucoup d\'eau froide pendant les repas',
          'Consommer des fibres et bien mastiquer',
          'Sauter le petit-déjeuner',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: '2',
    title: 'Détox & perte de poids',
    instructorId: '2',
    modules: 5,
    students: 185,
    thumbnail: 'module-detox-poids.svg',
    description: "Un protocole professionnel pour la détox, la silhouette et l'accompagnement durable de la perte de poids.",
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
    description: "Une formule premium avec trois certificats, ebook offert et un suivi d'un mois.",
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
const courseQuizAttempts = new Map<string, Map<string, {
  answers: Record<string, number>;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  attemptCount: number;
  bestScore?: number;
  bestPercentage?: number;
}>>();
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

// ─── Persistent JSON store ─────────────────────────────────────────────────
// Survives server restarts / deployments without a database.
const STORE_FILE = join(process.cwd(), 'essentielle-data.json');
const SEED_EXAM_IDS = new Set(['exam-1', 'exam-2', 'exam-detox-final']);
const deletedExamIds = new Set<string>();

function loadPersistedData(): void {
  try {
    if (!existsSync(STORE_FILE)) return;
    const saved = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as {
      users?: StoredUser[];
      workspaces?: Record<string, StudentWorkspace>;
      attempts?: Record<string, StudentAttempt[]>;
      requests?: PublicEnrollmentRequest[];
      dynamicExams?: ExamTemplate[];
      deletedExamIds?: string[];
    };
    for (const u of saved.users ?? []) {
      const idx = memoryUsers.findIndex((m) => m.id === u.id);
      if (idx >= 0) memoryUsers[idx] = u;
      else memoryUsers.push(u);
    }
    for (const [id, ws] of Object.entries(saved.workspaces ?? {})) {
      studentWorkspaces.set(id, ws);
    }
    for (const [id, attempts] of Object.entries(saved.attempts ?? {})) {
      studentAttempts.set(id, attempts);
    }
    for (const req of saved.requests ?? []) {
      if (!publicEnrollmentRequests.some((r) => r.id === req.id)) {
        publicEnrollmentRequests.push(req);
      }
    }
    for (const exam of saved.dynamicExams ?? []) {
      if (!exams.some((e) => e.id === exam.id)) exams.push(exam);
    }
    for (const id of saved.deletedExamIds ?? []) {
      deletedExamIds.add(id);
      const idx = exams.findIndex((e) => e.id === id);
      if (idx >= 0) exams.splice(idx, 1);
    }
    console.log('[STORE] Data loaded from', STORE_FILE);
  } catch (err) {
    console.warn('[STORE] Could not load persisted data:', err);
  }
}

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function savePersistedData(): void {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    try {
      writeFileSync(STORE_FILE, JSON.stringify({
        savedAt: new Date().toISOString(),
        users: memoryUsers,
        workspaces: Object.fromEntries(studentWorkspaces),
        attempts: Object.fromEntries(studentAttempts),
        requests: publicEnrollmentRequests,
        dynamicExams: exams.filter((e) => !SEED_EXAM_IDS.has(e.id)),
        deletedExamIds: Array.from(deletedExamIds),
      }, null, 2), 'utf8');
    } catch (err) {
      console.warn('[STORE] Could not save data:', err);
    }
  }, 600);
}
const paymentRecords: PaymentRecord[] = [
  { id: 'pay-1', studentId: '3', studentName: 'Jane Doe', courseId: '2', amountEur: 349, status: 'paid', paidAt: '2026-04-10T10:30:00.000Z' },
  { id: 'pay-2', studentId: '3', studentName: 'Jane Doe', courseId: '3', amountEur: 329, status: 'pending', paidAt: '2026-04-26T12:00:00.000Z' },
];

bootstrapRoleData();
loadPersistedData();

// ── DATA MIGRATION: re-grade all stored attempts with the real engine ────────
// Repairs attempts saved by old code that wrote score=0 / percentage=0 even
// when the student answered correctly (type mismatch or missing grading logic).
// Safe to run every boot: it overwrites only the computed fields, not answers.
(function regradeAllAttempts() {
  let migratedCount = 0;
  for (const [, attempts] of studentAttempts) {
    for (const attempt of attempts) {
      const exam = exams.find((e) => e.id === attempt.examId);
      if (!exam || !attempt.answers || Object.keys(attempt.answers).length === 0) continue;
      const grade = gradeExamSubmission(exam, attempt.answers);
      attempt.score       = grade.scaledScore;
      attempt.rawScore    = grade.earnedScore;
      attempt.totalPoints = grade.totalPoints;
      attempt.percentage  = grade.percentage;
      migratedCount++;
    }
  }
  if (migratedCount > 0) {
    savePersistedData();
    console.log(`[MIGRATE] Re-graded ${migratedCount} stored attempt(s) with real grading engine.`);
  }
})();

// Ensure the seed student always has access to the detox exam even if
// the persisted workspace predates the course-13 enrollment being added.
(function ensureSeedEnrollments() {
  const required = [
    { courseId: '1', progress: 45 },
    { courseId: '4', progress: 100 },
    { courseId: '13', progress: 100 },
  ];
  const ws = studentWorkspaces.get('3');
  if (!ws) return;
  for (const req of required) {
    if (!ws.enrollments.some((e) => e.courseId === req.courseId)) {
      ws.enrollments.push(req);
    }
  }
})();

function bootstrapRoleData(): void {
  roleProfiles.set('1', {
    phone: '+216 20 000 001',
    city: 'Djerba',
    country: 'Tunisie',
    bio: "Directrice administrative de la plateforme Essenti' Elle Formation et Bien Être.",
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
        { courseId: '13', progress: 100 },
      ],
      certificates: [
        {
          id: 'cert-3-4',
          courseId: '4',
          title: 'Certificat - Détox peau',
          issuedAt: '2026-04-12T09:00:00.000Z',
          status: 'issued',
          signedBy: "Direction Essenti' Elle Formation et Bien Être",
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
      content: "Bien sûr. Le suivi nutritionnel s'inscrit dans la durée et comprend un protocole d'ajustement, alors qu'une recommandation ponctuelle reste plus générale.",
      sentAt: '2026-05-01T09:10:00.000Z',
    }
  );

  liveSessions.push({
    id: 'live-1',
    title: 'Session live - Cas pratiques Nutrition',
    courseId: '1',
    scheduledAt: '2026-05-14T18:00:00.000Z',
    meetLink: 'https://meet.google.com/ess-nutri-live',
    notes: "Analyse de cas autour du diabète et de l'hypertension.",
    createdBy: '2',
  });

  resources.push(
    {
      id: 'res-1',
      title: 'PDF - Guide nutrition inflammatoire',
      description: "Support PDF pour accompagner le module sur l'inflammation chronique.",
      courseId: '1',
      type: 'pdf',
      url: 'https://example.com/guide-nutrition.pdf',
      createdBy: '2',
    },
    {
      id: 'res-2',
      title: 'Audio - Drainage et émonctoires',
      description: "Audio d'accompagnement sur les axes majeurs de drainage.",
      courseId: '3',
      type: 'audio',
      url: 'https://example.com/audio-emonctoires.mp3',
      createdBy: '2',
    }
  );

}

// hashPassword, verifyPassword, normalizeEmail, getUsernameFromEmail
// sont désormais importés depuis ./server/auth

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: getUsernameFromEmail(user.email),
    role: user.role,
  };
}

// getTokenSecret est désormais importé depuis ./server/auth
// (avec enforcement strict en production).

function getAppUrl(req?: Request): string {
  const configured = process.env['APP_URL']?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (!req) {
    return 'http://localhost:3000';
  }

  return `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
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

function getSmtpConfig(): MailerConfig | null {
  const host = process.env['SMTP_HOST']?.trim() ?? '';
  const port = Number(process.env['SMTP_PORT'] ?? '587');
  const user = process.env['SMTP_USER']?.trim() ?? '';
  const pass = process.env['SMTP_PASS']?.trim() ?? '';
  const from = process.env['SMTP_FROM']?.trim() ?? user;
  const replyTo = process.env['SMTP_REPLY_TO']?.trim() ?? '';
  const secure = (process.env['SMTP_SECURE'] ?? '').toLowerCase() === 'true';

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    replyTo: replyTo || undefined,
  };
}

function isMailerConfigured(): boolean {
  return !!getSmtpConfig();
}

async function sendRegistrationSuccessEmail(user: PublicUser, req: Request): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn('[MAIL] SMTP not configured. Registration email skipped.');
    return false;
  }

  const loginUrl = `${getAppUrl(req)}/login`;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: user.email,
    replyTo: config.replyTo,
    subject: "Inscription reussie - Essenti' Elle Formation et Bien Être",
    text: [
      `Bonjour ${user.name},`,
      '',
      "Votre inscription sur Essenti' Elle Formation et Bien Être a bien ete enregistree.",
      `Votre e-mail de connexion : ${user.email}`,
      `Votre identifiant : ${user.username}`,
      `Acces a la connexion : ${loginUrl}`,
      '',
      "L'equipe Essenti' Elle Formation et Bien Être",
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526">
        <p>Bonjour ${user.name},</p>
        <p>Votre inscription sur <strong>Essenti' Elle Formation et Bien Être</strong> a bien ete enregistree.</p>
        <p><strong>E-mail de connexion :</strong> ${user.email}<br>
        <strong>Identifiant :</strong> ${user.username}</p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:12px 18px;background:#1F2A24;color:#fff;text-decoration:none;border-radius:12px;">Se connecter</a></p>
        <p>L'equipe Essenti' Elle Formation et Bien Être</p>
      </div>
    `,
  });

  return true;
}

async function sendPaidEnrollmentApprovalEmail(student: PublicUser, course: Course, request: PublicEnrollmentRequest): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn('[MAIL] SMTP not configured. Approval email skipped.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const formulaLine = request.formulaTitle ? `Formule choisie : ${request.formulaTitle}` : '';
  const certificateLine = request.certificateCount ? `Nombre de certificats : ${request.certificateCount}` : '';
  const detailsBlock = [formulaLine, certificateLine].filter(Boolean).join('\n');
  const htmlDetails = [formulaLine, certificateLine].filter(Boolean).map((line) => `<li>${line}</li>`).join('');

  await transporter.sendMail({
    from: config.from,
    to: student.email,
    replyTo: config.replyTo,
    subject: `Acceptation de votre inscription - ${course.title}`,
    text: [
      `Bonjour ${student.name},`,
      '',
      `Votre demande d'inscription a ete validee pour la formation "${course.title}".`,
      'Votre acces personnel a cette formation est maintenant ouvert dans votre espace etudiante sur la plateforme Essenti\' Elle Formation et Bien Etre.',
      'Une fois active, la formation reste disponible pour votre suivi pedagogique, y compris apres vos evaluations.',
      detailsBlock,
      '',
      'Connectez-vous avec votre adresse e-mail pour acceder a votre formation.',
      '',
      'Bien cordialement,',
      "L'equipe Essenti' Elle Formation et Bien Être",
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526">
        <p>Bonjour ${student.name},</p>
        <p>Votre demande d'inscription a ete validee pour la formation <strong>${course.title}</strong>.</p>
        <p>Votre acces personnel a cette formation est maintenant ouvert dans votre espace etudiante sur la plateforme Essenti' Elle Formation et Bien Être.</p>
        <p>Une fois activee, la formation reste disponible pour votre suivi pedagogique, y compris apres vos evaluations.</p>
        ${htmlDetails ? `<ul>${htmlDetails}</ul>` : ''}
        <p>Connectez-vous avec votre adresse e-mail pour acceder a votre formation.</p>
        <p>Bien cordialement,<br>L'equipe Essenti' Elle Formation et Bien Être</p>
      </div>
    `,
  });

  return true;
}

// createPasswordResetToken et verifyPasswordResetToken sont importés depuis ./server/auth.

async function sendPasswordResetEmail(user: PublicUser, token: string, req: Request): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const resetUrl = `${getAppUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: user.email,
    replyTo: config.replyTo,
    subject: 'Reinitialisation de votre mot de passe',
    text: [
      `Bonjour ${user.name},`,
      '',
      'Vous avez demande la reinitialisation de votre mot de passe.',
      `Cliquez sur ce lien pour definir un nouveau mot de passe : ${resetUrl}`,
      '',
      'Ce lien est valable pendant 1 heure.',
      '',
      "L'equipe Essenti' Elle Formation et Bien Être",
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526">
        <p>Bonjour ${user.name},</p>
        <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#1F2A24;color:#fff;text-decoration:none;border-radius:12px;">Definir un nouveau mot de passe</a></p>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>L'equipe Essenti' Elle Formation et Bien Être</p>
      </div>
    `,
  });

  const accepted = Array.isArray(info.accepted) ? info.accepted.map((item: unknown) => String(item).toLowerCase()) : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected.map((item: unknown) => String(item).toLowerCase()) : [];
  const normalizedRecipient = user.email.toLowerCase();

  if (rejected.includes(normalizedRecipient) || !accepted.includes(normalizedRecipient)) {
    throw new Error('MAIL_NOT_ACCEPTED');
  }
}

// createToken, decodeToken, makeStoredUser sont importés depuis ./server/auth
// (avec expiration des tokens à 7 jours et vérification stricte de la signature).

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

function parseQuizQuestions(items: unknown): Array<{ id: string; prompt: string; options: string[]; correctIndex: number }> {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any, index: number) => {
      const options: string[] = Array.isArray(item?.options)
        ? item.options.map((o: unknown) => typeof o === 'string' ? o.trim() : '').filter((o: string) => o.length > 0)
        : [];
      return {
        id: typeof item?.id === 'string' && item.id ? item.id : `quiz-${Date.now()}-${index}`,
        prompt: typeof item?.prompt === 'string' ? item.prompt.trim() : '',
        options,
        correctIndex: Number.isInteger(Number(item?.correctIndex)) ? Math.max(0, Number(item.correctIndex)) : 0,
      };
    })
    .filter((item) => item.prompt.length > 0 && item.options.length >= 2);
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

// ── MySQL helpers for column/table migration ──────────────────────────────────

async function dbAddCol(pool: Pool, table: string, col: string, def: string): Promise<void> {
  try {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME') console.warn(`[DB] addCol ${table}.${col}:`, err.message);
  }
}

async function dbDropFk(pool: Pool, table: string, fkName: string): Promise<void> {
  try {
    await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
  } catch { /* FK might not exist — that's fine */ }
}

// ── MySQL-backed exam persistence ─────────────────────────────────────────────

async function loadExamsFromDb(pool: Pool): Promise<void> {
  try {
    const [examRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, title, course_id, assigned_by, due_date, exam_type,
              duration_minutes, max_attempts, grading_scale_max, pass_threshold
       FROM exams`
    );
    const [qRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, exam_id, prompt, option_a, option_b, option_c, option_d,
              correct_index, points, sort_index
       FROM exam_questions ORDER BY exam_id, sort_index`
    );
    let loaded = 0;
    for (const row of examRows) {
      const eid = String(row['id']);
      if (SEED_EXAM_IDS.has(eid) || exams.some((e) => e.id === eid)) continue;
      const questions = qRows
        .filter((q) => String(q['exam_id']) === eid)
        .map((q) => ({
          id: String(q['id']),
          prompt: String(q['prompt']),
          options: [q['option_a'], q['option_b'], q['option_c'], q['option_d']]
            .filter(Boolean).map(String),
          correctIndex: Number(q['correct_index']),
          points: Number(q['points']),
        }));
      exams.push({
        id: eid,
        title: String(row['title']),
        courseId: String(row['course_id']),
        assignedBy: String(row['assigned_by']),
        dueDate: String(row['due_date']),
        examType: String(row['exam_type'] ?? 'quiz') as 'quiz' | 'final',
        durationMinutes: Number(row['duration_minutes'] ?? 20),
        maxAttempts: Number(row['max_attempts'] ?? 1),
        gradingScaleMax: Number(row['grading_scale_max'] ?? 20),
        passThreshold: Number(row['pass_threshold'] ?? 10),
        questions,
      });
      loaded++;
    }
    console.log(`[DB] Loaded ${loaded} custom exam(s) from MySQL`);
  } catch (err) {
    console.warn('[DB] Could not load exams from MySQL:', err);
  }
}

async function upsertExamToDb(pool: Pool, exam: ExamTemplate): Promise<void> {
  if (SEED_EXAM_IDS.has(exam.id)) return;
  try {
    await pool.query(
      `INSERT INTO exams
         (id, title, course_id, assigned_by, due_date, exam_type, duration_minutes,
          max_attempts, grading_scale_max, pass_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), course_id = VALUES(course_id),
         assigned_by = VALUES(assigned_by), due_date = VALUES(due_date),
         exam_type = VALUES(exam_type), duration_minutes = VALUES(duration_minutes),
         max_attempts = VALUES(max_attempts), grading_scale_max = VALUES(grading_scale_max),
         pass_threshold = VALUES(pass_threshold)`,
      [exam.id, exam.title, exam.courseId, exam.assignedBy, toMysqlDatetime(exam.dueDate),
       exam.examType ?? 'quiz', exam.durationMinutes ?? 20, exam.maxAttempts ?? 1,
       exam.gradingScaleMax ?? 20, exam.passThreshold ?? 10]
    );
    await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [exam.id]);
    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      await pool.query(
        `INSERT INTO exam_questions
           (id, exam_id, prompt, option_a, option_b, option_c, option_d,
            correct_index, points, sort_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.id, exam.id, q.prompt,
         q.options[0] ?? '', q.options[1] ?? '', q.options[2] ?? '', q.options[3] ?? null,
         q.correctIndex, q.points, i]
      );
    }
  } catch (err) {
    console.warn('[DB] Could not upsert exam:', err);
  }
}

async function deleteExamFromDb(pool: Pool, examId: string): Promise<void> {
  if (SEED_EXAM_IDS.has(examId)) return;
  try {
    await pool.query('DELETE FROM exams WHERE id = ?', [examId]);
  } catch (err) {
    console.warn('[DB] Could not delete exam:', err);
  }
}

// ── MySQL-backed attempt persistence ─────────────────────────────────────────

async function loadAttemptsFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT student_id, exam_id, answers_json, score, raw_score, total_points,
              percentage, attempt_count, submitted_at
       FROM student_exam_attempts`
    );
    let loaded = 0;
    for (const row of rows) {
      const sid = String(row['student_id']);
      const arr = studentAttempts.get(sid) ?? [];
      if (!arr.some((a) => a.examId === String(row['exam_id']))) {
        let answers: Record<string, number> = {};
        try {
          const parsed = JSON.parse(String(row['answers_json'] ?? '{}'));
          if (Array.isArray(parsed)) {
            // Migrate legacy positional array → question-id keyed object
            const examForRow = exams.find((e) => e.id === String(row['exam_id']));
            if (examForRow) {
              parsed.forEach((val: number, i: number) => {
                if (examForRow.questions[i]) answers[examForRow.questions[i].id] = Number(val);
              });
            }
          } else if (parsed && typeof parsed === 'object') {
            answers = parsed as Record<string, number>;
          }
        } catch { answers = {}; }
        arr.push({
          examId:       String(row['exam_id']),
          answers,
          score:        Number(row['score'] ?? 0),
          rawScore:     Number(row['raw_score'] ?? 0),
          totalPoints:  Number(row['total_points'] ?? 0),
          percentage:   Number(row['percentage'] ?? 0),
          attemptCount: Number(row['attempt_count'] ?? 1),
          submittedAt:  String(row['submitted_at'] ?? new Date().toISOString()),
        });
        studentAttempts.set(sid, arr);
        loaded++;
      }
    }
    console.log(`[DB] Loaded ${loaded} student attempt(s) from MySQL`);
  } catch (err) {
    console.warn('[DB] Could not load attempts from MySQL:', err);
  }
}

function toMysqlDatetime(iso: string): string {
  // Convert ISO 8601 "2026-05-21T10:30:45.123Z" → MySQL "2026-05-21 10:30:45"
  try { return new Date(iso).toISOString().slice(0, 19).replace('T', ' '); }
  catch { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
}

async function upsertAttemptToDb(pool: Pool, studentId: string, attempt: StudentAttempt): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO student_exam_attempts
         (student_id, exam_id, answers_json, score, raw_score, total_points,
          percentage, attempt_count, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         answers_json  = VALUES(answers_json),
         score         = VALUES(score),
         raw_score     = VALUES(raw_score),
         total_points  = VALUES(total_points),
         percentage    = VALUES(percentage),
         attempt_count = VALUES(attempt_count),
         submitted_at  = VALUES(submitted_at)`,
      [studentId, attempt.examId, JSON.stringify(attempt.answers),
       attempt.score, attempt.rawScore ?? 0, attempt.totalPoints ?? 0,
       attempt.percentage ?? 0, attempt.attemptCount,
       toMysqlDatetime(attempt.submittedAt)]
    );
    console.log(`[DB] Attempt saved ✓ student=${studentId} exam=${attempt.examId} score=${attempt.score}/${attempt.totalPoints} (${attempt.percentage}%)`);
  } catch (err) {
    console.error('[DB] upsertAttemptToDb FAILED — student:', studentId, 'exam:', attempt.examId, 'error:', err);
  }
}

// ── Schema creation + migration ───────────────────────────────────────────────

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

  // ── Exam tables ────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      course_id VARCHAR(64) NOT NULL,
      assigned_by VARCHAR(255) NOT NULL,
      due_date DATETIME NOT NULL,
      exam_type VARCHAR(10) NOT NULL DEFAULT 'quiz',
      duration_minutes INT NOT NULL DEFAULT 20,
      max_attempts INT NOT NULL DEFAULT 1,
      grading_scale_max INT NOT NULL DEFAULT 20,
      pass_threshold DECIMAL(5,2) NOT NULL DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await dbAddCol(pool, 'exams', 'exam_type',        "VARCHAR(10) NOT NULL DEFAULT 'quiz'");
  await dbAddCol(pool, 'exams', 'duration_minutes',  'INT NOT NULL DEFAULT 20');
  await dbAddCol(pool, 'exams', 'max_attempts',      'INT NOT NULL DEFAULT 1');
  await dbAddCol(pool, 'exams', 'grading_scale_max', 'INT NOT NULL DEFAULT 20');
  await dbAddCol(pool, 'exams', 'pass_threshold',    'DECIMAL(5,2) NOT NULL DEFAULT 10');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_questions (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      exam_id VARCHAR(64) NOT NULL,
      prompt TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL DEFAULT '',
      option_d TEXT NULL,
      correct_index INT NOT NULL DEFAULT 0,
      points DECIMAL(4,1) NOT NULL DEFAULT 1,
      sort_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_eq_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await dbAddCol(pool, 'exam_questions', 'option_d', 'TEXT NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_exam_attempts (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL,
      exam_id VARCHAR(64) NOT NULL,
      answers_json MEDIUMTEXT NOT NULL,
      score DECIMAL(6,2) NOT NULL DEFAULT 0,
      raw_score DECIMAL(6,2) NOT NULL DEFAULT 0,
      total_points DECIMAL(6,2) NOT NULL DEFAULT 0,
      percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      attempt_count INT NOT NULL DEFAULT 1,
      submitted_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_exam (student_id, exam_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // Drop old FK on exam_id (if it exists) so seed exams can have attempts
  await dbDropFk(pool, 'student_exam_attempts', 'fk_attempts_exam');
  await dbAddCol(pool, 'student_exam_attempts', 'raw_score',    'DECIMAL(6,2) NOT NULL DEFAULT 0');
  await dbAddCol(pool, 'student_exam_attempts', 'total_points', 'DECIMAL(6,2) NOT NULL DEFAULT 0');
  await dbAddCol(pool, 'student_exam_attempts', 'percentage',   'DECIMAL(5,2) NOT NULL DEFAULT 0');
  await dbAddCol(pool, 'student_exam_attempts', 'attempt_count','INT NOT NULL DEFAULT 1');
  try {
    await pool.query('ALTER TABLE student_exam_attempts MODIFY COLUMN score DECIMAL(6,2) NOT NULL DEFAULT 0');
  } catch { /* ignore — already correct type */ }

  await insertSeedUser(pool, 'Admin User', 'admin@lessentielle-sante.site', 'admin', 'password123');
  await insertSeedUser(pool, 'Dr. Expert', 'instructor@lessentielle-sante.site', 'instructor', 'password123');
  await insertSeedUser(pool, 'Jane Doe', 'student@lessentielle-sante.site', 'student', 'password123');

  // course_quiz_attempts — persists student quiz results per course
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_quiz_attempts (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      course_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      answers_json MEDIUMTEXT NOT NULL DEFAULT '{}',
      score DECIMAL(6,2) NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 10,
      percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      passed TINYINT(1) NOT NULL DEFAULT 0,
      attempt_count INT NOT NULL DEFAULT 1,
      submitted_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_course_student (course_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Add best_score / best_percentage columns to course_quiz_attempts (migration-safe)
  await dbAddCol(pool, 'course_quiz_attempts', 'best_score',      'DECIMAL(6,2) NOT NULL DEFAULT 0');
  await dbAddCol(pool, 'course_quiz_attempts', 'best_percentage', 'DECIMAL(5,2) NOT NULL DEFAULT 0');

  // Sync all MySQL users into memoryUsers so getStoredUserById works for any registered user
  await loadUsersFromDb(pool);
  // Immediately backup MySQL users to JSON so next boot works even without MySQL
  savePersistedData();

  // Load exam + attempt data from DB into in-memory maps
  await loadExamsFromDb(pool);
  await loadAttemptsFromDb(pool);
  await loadCourseQuizAttemptsFromDb(pool);

  // Persist seed exams to MySQL so phpMyAdmin shows them and attempts FK works
  await seedExamsToDb(pool);
}

async function loadUsersFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT id, name, email, role, password_hash FROM users'
    );
    let loaded = 0;
    for (const row of rows) {
      const sid = String(row['id']);
      if (!memoryUsers.find((u) => u.id === sid)) {
        memoryUsers.push({
          id:           sid,
          name:         String(row['name']          ?? ''),
          email:        String(row['email']         ?? ''),
          username:     getUsernameFromEmail(String(row['email'] ?? '')),
          role:         (row['role'] as UserRole)   ?? 'student',
          passwordHash: String(row['password_hash'] ?? ''),
        });
        loaded++;
      }
    }
    console.log(`[DB] Synced ${loaded} MySQL user(s) into memoryUsers (total: ${memoryUsers.length})`);
  } catch (err) {
    console.warn('[DB] Could not load users from MySQL:', err);
  }
}

async function loadCourseQuizAttemptsFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT course_id, student_id, answers_json, score, total, percentage,
              passed, attempt_count, submitted_at, best_score, best_percentage
       FROM course_quiz_attempts`
    );
    let loaded = 0;
    for (const row of rows) {
      const cid = String(row['course_id']);
      const sid = String(row['student_id']);
      if (!courseQuizAttempts.has(cid)) courseQuizAttempts.set(cid, new Map());
      if (!courseQuizAttempts.get(cid)!.has(sid)) {
        let answers: Record<string, number> = {};
        try { answers = JSON.parse(String(row['answers_json'] ?? '{}')); } catch { answers = {}; }
        const latestScore = Number(row['score'] ?? 0);
        const latestPct   = Number(row['percentage'] ?? 0);
        const bestScore   = Number(row['best_score'] ?? latestScore);
        const bestPct     = Number(row['best_percentage'] ?? latestPct);
        courseQuizAttempts.get(cid)!.set(sid, {
          answers,
          score:           latestScore,
          total:           Number(row['total']         ?? 10),
          percentage:      latestPct,
          passed:          bestPct >= 50,
          attemptCount:    Number(row['attempt_count'] ?? 1),
          submittedAt:     String(row['submitted_at']  ?? new Date().toISOString()),
          bestScore,
          bestPercentage:  bestPct,
        });
        loaded++;
      }
    }
    console.log(`[DB] Loaded ${loaded} course quiz attempt(s) from MySQL`);
  } catch (err) {
    console.warn('[DB] Could not load course quiz attempts from MySQL:', err);
  }
}

async function upsertCourseQuizAttemptToDb(
  pool: Pool,
  courseId: string,
  studentId: string,
  attempt: { answers: Record<string, number>; score: number; total: number; percentage: number; passed: boolean; attemptCount: number; submittedAt: string; bestScore: number; bestPercentage: number }
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO course_quiz_attempts
         (course_id, student_id, answers_json, score, total, percentage, passed, attempt_count, submitted_at, best_score, best_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         answers_json     = VALUES(answers_json),
         score            = VALUES(score),
         total            = VALUES(total),
         percentage       = VALUES(percentage),
         passed           = VALUES(passed),
         attempt_count    = VALUES(attempt_count),
         submitted_at     = VALUES(submitted_at),
         best_score       = VALUES(best_score),
         best_percentage  = VALUES(best_percentage)`,
      [courseId, studentId, JSON.stringify(attempt.answers),
       attempt.score, attempt.total, attempt.percentage,
       attempt.passed ? 1 : 0, attempt.attemptCount,
       toMysqlDatetime(attempt.submittedAt),
       attempt.bestScore, attempt.bestPercentage]
    );
    console.log(`[DB] Quiz attempt saved ✓ course=${courseId} student=${studentId} score=${attempt.score}/${attempt.total} (${attempt.percentage}%) best=${attempt.bestScore} (${attempt.bestPercentage}%)`);
  } catch (err) {
    console.error('[DB] upsertCourseQuizAttemptToDb FAILED — course:', courseId, 'student:', studentId, 'error:', err);
  }
}

async function seedExamsToDb(pool: Pool): Promise<void> {
  const seedExams = exams.filter((e) => SEED_EXAM_IDS.has(e.id));
  for (const exam of seedExams) {
    try {
      await pool.query(
        `INSERT INTO exams
           (id, title, course_id, assigned_by, due_date, exam_type, duration_minutes,
            max_attempts, grading_scale_max, pass_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title), due_date = VALUES(due_date),
           exam_type = VALUES(exam_type), duration_minutes = VALUES(duration_minutes),
           max_attempts = VALUES(max_attempts), grading_scale_max = VALUES(grading_scale_max),
           pass_threshold = VALUES(pass_threshold)`,
        [exam.id, exam.title, exam.courseId, exam.assignedBy, toMysqlDatetime(exam.dueDate),
         exam.examType ?? 'quiz', exam.durationMinutes ?? 20, exam.maxAttempts ?? 1,
         exam.gradingScaleMax ?? 20, exam.passThreshold ?? 10]
      );
      // Upsert questions (delete + re-insert to keep them in sync)
      await pool.query('DELETE FROM exam_questions WHERE exam_id = ?', [exam.id]);
      for (let i = 0; i < exam.questions.length; i++) {
        const q = exam.questions[i];
        await pool.query(
          `INSERT INTO exam_questions
             (id, exam_id, prompt, option_a, option_b, option_c, option_d,
              correct_index, points, sort_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, exam.id, q.prompt,
           q.options[0] ?? '', q.options[1] ?? '', q.options[2] ?? '', q.options[3] ?? null,
           q.correctIndex, q.points, i]
        );
      }
      console.log(`[DB] Seed exam "${exam.title}" (${exam.questions.length} questions) persisted to MySQL.`);
    } catch (err) {
      console.warn(`[DB] Could not seed exam ${exam.id}:`, err);
    }
  }
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
    username: getUsernameFromEmail(String(row['email'])),
    role: row['role'] as UserRole,
    passwordHash: String(row['password_hash']),
  };
}

async function findStoredUserByIdentifier(identifier: string): Promise<StoredUser | null> {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return null;

  const byEmail = await findStoredUserByEmail(normalized);
  if (byEmail) return byEmail;

  const pool = await getDbPool();
  if (!pool) {
    return memoryUsers.find((user) => getUsernameFromEmail(user.email) === normalized) ?? null;
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, name, email, role, password_hash FROM users WHERE LOWER(SUBSTRING_INDEX(email, \'@\', 1)) = ? LIMIT 1',
    [normalized]
  );
  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: String(row['id']),
    name: String(row['name']),
    email: String(row['email']),
    username: getUsernameFromEmail(String(row['email'])),
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
      username: getUsernameFromEmail(normalized),
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
    savePersistedData();
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
      username: getUsernameFromEmail(normalized),
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

async function updateStoredUserPassword(email: string, password: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const pool = await getDbPool();

  if (!pool) {
    const user = memoryUsers.find((item) => item.email === normalized);
    if (!user) throw new Error('USER_NOT_FOUND');
    user.passwordHash = passwordHash;
    return;
  }

  await pool.query(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [passwordHash, normalized]
  );
}

async function countUsers(): Promise<number> {
  const pool = await getDbPool();
  if (!pool) return memoryUsers.length;
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
  return Number(rows[0]?.['total'] ?? 0);
}

// getCurrentUser est importé depuis ./server/auth

function ensureStudentWorkspace(user: PublicUser): StudentWorkspace {
  const existing = studentWorkspaces.get(user.id);
  if (existing) {
    // Ensure free-course enrollments are always present for any student
    for (const course of courses) {
      if (course.access === 'free' && course.status === 'published') {
        if (!existing.enrollments.some((e) => e.courseId === course.id)) {
          existing.enrollments.push({ courseId: course.id, progress: 0 });
        }
      }
    }
    return existing;
  }
  const freeCourseEnrollments: StudentEnrollment[] = courses
    .filter((c) => c.access === 'free' && c.status === 'published')
    .map((c) => ({ courseId: c.id, progress: 0 }));
  const created: StudentWorkspace = {
    enrollments: freeCourseEnrollments,
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
  const pcts: number[] = [];
  for (const attempts of studentAttempts.values()) {
    const attempt = attempts.find((item) => item.examId === examId);
    if (attempt) {
      // Use percentage field; fall back to computing from score/scaleMax for legacy data
      const exam = exams.find((e) => e.id === examId);
      const pct = attempt.percentage != null
        ? attempt.percentage
        : (exam ? Number(((attempt.score / getExamScaleMax(exam)) * 100).toFixed(1)) : 0);
      pcts.push(pct);
    }
  }
  if (!pcts.length) return 0;
  return Number((pcts.reduce((sum, p) => sum + p, 0) / pcts.length).toFixed(1));
}

function normalizeScoreToTwenty(examId: string, score: number): number {
  const exam = exams.find((item) => item.id === examId);
  if (!exam) return score;
  return Number(((score / getExamScaleMax(exam)) * 20).toFixed(1));
}

function getExamMaxAttempts(exam: ExamTemplate): number {
  return Math.max(1, exam.maxAttempts ?? 1);
}

function getExamDurationMinutes(exam: ExamTemplate): number {
  return Math.max(1, exam.durationMinutes ?? 20);
}

function getExamScaleMax(exam: ExamTemplate): number {
  return Math.max(1, exam.gradingScaleMax ?? 20);
}

function getExamPassThreshold(exam: ExamTemplate): number {
  const scaleMax = getExamScaleMax(exam);
  return Math.min(scaleMax, Math.max(0, exam.passThreshold ?? scaleMax / 2));
}

/**
 * REAL GRADING ENGINE
 *
 * For each question:
 *   if student answer === correctIndex → earnedScore += question.points
 *
 * Formula:
 *   earnedScore  = sum of points for correct answers
 *   totalPoints  = sum of all question points
 *   percentage   = (earnedScore / totalPoints) * 100
 *   scaledScore  = (earnedScore / totalPoints) * gradingScaleMax
 *   passed       = scaledScore >= passThreshold
 */
function gradeExamSubmission(exam: ExamTemplate, answers: Record<string, number>): GradeResult {
  let earnedScore = 0;
  let totalPoints = 0;
  const perQuestion: GradeResult['perQuestion'] = [];

  for (const question of exam.questions) {
    // Look up by question ID; -1 means unanswered
    const studentAnswer  = Number(answers[question.id] ?? -1);
    const correctAnswer  = Number(question.correctIndex);
    const isCorrect = !Number.isNaN(studentAnswer) && !Number.isNaN(correctAnswer)
                      && studentAnswer !== -1
                      && studentAnswer === correctAnswer;
    if (isCorrect) earnedScore += question.points;
    totalPoints += question.points;
    perQuestion.push({
      questionId: question.id,
      correct: isCorrect,
      earned: isCorrect ? question.points : 0,
      points: question.points,
    });
  }

  // Round to 2 decimal places to avoid float precision drift
  earnedScore = Number(earnedScore.toFixed(2));
  totalPoints = Number(totalPoints.toFixed(2));

  const percentage = totalPoints > 0 ? Number(((earnedScore / totalPoints) * 100).toFixed(1)) : 0;
  const scaledScore = totalPoints > 0
    ? Number(((earnedScore / totalPoints) * getExamScaleMax(exam)).toFixed(1))
    : 0;
  const passed = scaledScore >= getExamPassThreshold(exam);

  return { earnedScore, totalPoints, percentage, scaledScore, passed, perQuestion };
}

// Legacy aliases used by older code paths
function getExamRawMax(exam: ExamTemplate): number {
  return Number(exam.questions.reduce((sum, q) => sum + q.points, 0).toFixed(2));
}
function getExamRawScore(exam: ExamTemplate, answers: Record<string, number>): number {
  return gradeExamSubmission(exam, answers).earnedScore;
}

function getStoredUserById(userId: string): StoredUser | null {
  return memoryUsers.find((item) => item.id === userId) ?? null;
}

function ensureExamCertificate(student: PublicUser, exam: ExamTemplate, score: number): void {
  if (exam.examType !== 'final' || score < getExamPassThreshold(exam)) return;
  const workspace = ensureStudentWorkspace(student);
  const existing = workspace.certificates.find((item) => item.courseId === exam.courseId);
  if (existing) {
    existing.status = 'issued';
    existing.issuedAt = new Date().toISOString();
    existing.signedBy = exam.assignedBy;
    return;
  }

  workspace.certificates.unshift({
    id: `cert-exam-${exam.id}-${student.id}`,
    courseId: exam.courseId,
    title: `Certificat - ${getCourseTitle(exam.courseId)}`,
    issuedAt: new Date().toISOString(),
    status: 'issued',
    signedBy: exam.assignedBy,
  });
}

function buildStudentExamReview(exam: ExamTemplate, attempt: StudentAttempt) {
  return exam.questions.map((question) => {
    const selectedIndex = attempt.answers[question.id] ?? -1;
    return {
      id: question.id,
      prompt: question.prompt,
      selectedIndex,
      selectedOption: selectedIndex >= 0 ? question.options[selectedIndex] ?? '' : '',
      correctIndex: question.correctIndex,
      correctOption: question.options[question.correctIndex] ?? '',
      isCorrect: selectedIndex === question.correctIndex,
      points: question.points,
    };
  });
}

function getSuccessfulStudentsForExam(exam: ExamTemplate) {
  const successful: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    submittedAt: string;
    certificateIssued: boolean;
  }> = [];

  for (const [studentId, attempts] of studentAttempts.entries()) {
    const attempt = attempts.find((item) => item.examId === exam.id);
    if (!attempt || attempt.score < getExamPassThreshold(exam)) continue;
    const student = getStoredUserById(studentId);
    if (!student) continue;
    const workspace = ensureStudentWorkspace(toPublicUser(student));
    successful.push({
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      score: attempt.score,
      submittedAt: attempt.submittedAt,
      certificateIssued: workspace.certificates.some((item) => item.courseId === exam.courseId && item.status === 'issued'),
    });
  }

  return successful.sort((a, b) => b.score - a.score);
}

function getAllStudentsForExam(exam: ExamTemplate) {
  const rawMaxScore = getExamRawMax(exam);
  const result: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    rawScore: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    submittedAt: string;
    attemptCount: number;
    certificateIssued: boolean;
  }> = [];
  // ── DEBUG: trace what's in memory for this exam ────────────────────────────
  console.log(`[EXAM-INSTRUCTOR] exam="${exam.id}" — scanning ${studentAttempts.size} student(s) in memory`);
  for (const [studentId, attempts] of studentAttempts.entries()) {
    const attempt = attempts.find((item) => item.examId === exam.id);
    if (!attempt) continue;
    const student = getStoredUserById(studentId);
    console.log(`[EXAM-INSTRUCTOR] found attempt for student ${studentId} → user lookup: ${student ? student.email : 'NOT FOUND in memoryUsers'}`);
    if (!student) continue;
    const workspace = ensureStudentWorkspace(toPublicUser(student));
    const earned = attempt.rawScore ?? gradeExamSubmission(exam, attempt.answers).earnedScore;
    const pct    = attempt.percentage ?? (rawMaxScore > 0 ? Number(((earned / rawMaxScore) * 100).toFixed(1)) : 0);
    result.push({
      studentId,
      studentName:  student.name,
      studentEmail: student.email,
      score:        attempt.score,
      rawScore:     earned,
      totalPoints:  attempt.totalPoints ?? rawMaxScore,
      percentage:   pct,
      passed:       attempt.score >= getExamPassThreshold(exam),
      submittedAt:  attempt.submittedAt,
      attemptCount: attempt.attemptCount,
      certificateIssued: workspace.certificates.some((c) => c.courseId === exam.courseId && c.status === 'issued'),
    });
  }
  return result.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Instructor aggregate stats — equivalent to:
 * SELECT COUNT(*) participants,
 *        AVG(percentage) average_percentage,
 *        SUM(CASE WHEN passed THEN 1 ELSE 0 END) passed_students
 * FROM exam_attempts WHERE exam_id = $1
 */
function getExamAggregateStats(examId: string, exam: ExamTemplate) {
  const rows = getAllStudentsForExam(exam);
  const participants = rows.length;
  const passedStudents = rows.filter((r) => r.passed).length;
  const avgPercentage = participants > 0
    ? Number((rows.reduce((sum, r) => sum + r.percentage, 0) / participants).toFixed(1))
    : 0;
  return { participants, passedStudents, avgPercentage };
}

function toStudentExamView(user: PublicUser) {
  const workspace = ensureStudentWorkspace(user);
  const enrolledIds = workspace.enrollments.map((item) => item.courseId);
  return exams
    .filter((exam) => enrolledIds.includes(exam.courseId))
    .map((exam) => {
      const attempt = getAttempt(user.id, exam.id);
      const maxAttempts = getExamMaxAttempts(exam);
      const attemptsUsed = attempt?.attemptCount ?? 0;
      const attemptsRemaining = Math.max(maxAttempts - attemptsUsed, 0);

      // Re-compute grading fields if they were saved before the new engine
      const rawMaxScore = getExamRawMax(exam);
      const earnedScore = attempt
        ? (attempt.rawScore ?? gradeExamSubmission(exam, attempt.answers).earnedScore)
        : null;
      const percentage = attempt
        ? (attempt.percentage ?? (earnedScore !== null && rawMaxScore > 0
            ? Number(((earnedScore / rawMaxScore) * 100).toFixed(1))
            : 0))
        : null;
      const scaledScore = attempt?.score ?? null;
      const passed = attempt ? (scaledScore ?? 0) >= getExamPassThreshold(exam) : null;

      return {
        id:              exam.id,
        title:           exam.title,
        courseTitle:     getCourseTitle(exam.courseId),
        assignedBy:      exam.assignedBy,
        examType:        exam.examType ?? 'quiz',
        durationMinutes: getExamDurationMinutes(exam),
        gradingScaleMax: getExamScaleMax(exam),
        passThreshold:   getExamPassThreshold(exam),
        rawMaxScore,
        maxAttempts,
        attemptsUsed,
        attemptsRemaining,
        status:     attempt ? 'graded' : 'available',
        score:      scaledScore,
        rawScore:   earnedScore,
        percentage,
        passed,
        average:    getExamAverage(exam.id),
        dueDate:    exam.dueDate,
        reviewQuestions: attempt ? buildStudentExamReview(exam, attempt) : undefined,
        // Questions always available — no attempt limit
        questions: exam.questions.map((q) => ({
              id:      q.id,
              prompt:  q.prompt,
              options: q.options,
              points:  q.points,
            })),
      };
    });
}

function getStudentAverage(studentId: string): number {
  const attempts = studentAttempts.get(studentId) ?? [];
  if (!attempts.length) return 0;
  return Number((attempts.reduce((sum, attempt) => sum + normalizeScoreToTwenty(attempt.examId, attempt.score), 0) / attempts.length).toFixed(1));
}

function serializeCatalog(user: PublicUser) {
  const workspace = ensureStudentWorkspace(user);
  return courses
    .filter((course) => course.status === 'published')
    .map((course) => {
      const enrollment = workspace.enrollments.find((item) => item.courseId === course.id);
      const pendingRequest = publicEnrollmentRequests.find((request) =>
        request.courseId === course.id &&
        request.status === 'pending' &&
        (
          request.studentId === user.id ||
          normalizeEmail(request.email) === normalizeEmail(user.email)
        )
      );

      const isEnrolled = Boolean(enrollment);
      // Only expose quiz questions (without correctIndex) to enrolled students
      const quizQuestions = isEnrolled && course.quizQuestions?.length
        ? course.quizQuestions.map(({ id, prompt, options }) => ({ id, prompt, options }))
        : undefined;

      // Look up quiz result for this student + course
      const quizAttempt = isEnrolled ? (courseQuizAttempts.get(course.id)?.get(user.id) ?? null) : null;
      const quizResult = quizAttempt ? {
        ...quizAttempt,
        bestScore:      quizAttempt.bestScore      ?? quizAttempt.score,
        bestPercentage: quizAttempt.bestPercentage ?? quizAttempt.percentage,
      } : null;
      const quizAttemptsRemaining = Math.max(0, 2 - (quizAttempt?.attemptCount ?? 0));

      return {
        ...course,
        quizTitle: course.quizTitle ?? null,
        quizQuestions: quizQuestions ?? null,
        quizResult,
        quizAttemptsRemaining,
        enrolled: isEnrolled,
        progress: enrollment?.progress ?? 0,
        enrollmentRequestStatus: pendingRequest?.status ?? null,
        enrollmentRequestId: pendingRequest?.id ?? null,
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
    username: getUsernameFromEmail(String(row['email'])),
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

app.post('/api/register', authLimiter, async (req, res) => {
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
    try {
      await sendRegistrationSuccessEmail(user, req);
    } catch (mailError) {
      console.error('[MAIL] Registration success email failed', mailError);
    }
    const token = createToken(user);
    savePersistedData(); // Persist new user to JSON backup immediately
    res.status(201).json({ token, user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Cet email est déjà utilisé.' });
      return;
    }
    console.error('[API] Register failed', error);
    res.status(500).json({ error: "Erreur serveur pendant l'inscription." });
  }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const body = req.body as LoginPayload;
  const identifier = body.identifier?.trim() ?? body.email?.trim() ?? '';
  const password = body.password ?? '';

  if (!identifier || !password) {
    res.status(400).json({ error: 'Email ou nom d utilisateur et mot de passe requis.' });
    return;
  }

  try {
    const user = await findStoredUserByIdentifier(identifier);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Email, nom d utilisateur ou mot de passe incorrect.' });
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

app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const body = req.body as ForgotPasswordPayload;
  const identifier = body.identifier?.trim() ?? body.email?.trim() ?? '';

  if (!identifier) {
    res.status(400).json({ error: 'Email ou nom d utilisateur requis.' });
    return;
  }

  try {
    const user = await findStoredUserByIdentifier(identifier);
    if (!user) {
      res.status(404).json({ error: 'Aucun compte ne correspond a cet email ou a ce nom d utilisateur.' });
      return;
    }

    const token = createPasswordResetToken(user.email);
    await sendPasswordResetEmail(toPublicUser(user), token, req);

    res.json({
      message: 'Le lien de reinitialisation a bien ete envoye sur votre adresse e-mail.',
    });
  } catch (error) {
    console.error('[API] Forgot password failed', error);
    if (error instanceof Error && error.message === 'SMTP_NOT_CONFIGURED') {
      res.status(500).json({ error: 'Le service e-mail n est pas configure. Verifiez les variables SMTP sur le serveur.' });
      return;
    }
    if (error instanceof Error && error.message === 'MAIL_NOT_ACCEPTED') {
      res.status(502).json({ error: 'Le serveur e-mail a refuse l envoi du lien de reinitialisation.' });
      return;
    }
    const smtpError = error as { code?: string; response?: string; command?: string; message?: string };
    if (smtpError?.code === 'EAUTH') {
      res.status(502).json({ error: 'Authentification SMTP refusee. Verifiez SMTP_USER et SMTP_PASS sur Hostinger.' });
      return;
    }
    if (smtpError?.code === 'ESOCKET' || smtpError?.code === 'ECONNECTION') {
      res.status(502).json({ error: 'Connexion au serveur e-mail impossible. Verifiez SMTP_HOST, SMTP_PORT et SMTP_SECURE.' });
      return;
    }
    if (smtpError?.response) {
      res.status(502).json({ error: `Erreur du serveur e-mail: ${smtpError.response}` });
      return;
    }
    res.status(500).json({ error: 'Erreur serveur pendant la demande de reinitialisation.' });
  }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
  const body = req.body as ResetPasswordPayload;
  const token = body.token?.trim() ?? '';
  const password = body.password ?? '';

  if (!token || password.length < 8) {
    res.status(400).json({ error: 'Token invalide ou mot de passe trop court (8 caracteres minimum).' });
    return;
  }

  try {
    const email = verifyPasswordResetToken(token);
    if (!email) {
      res.status(400).json({ error: 'Lien de reinitialisation invalide ou expire.' });
      return;
    }

    await updateStoredUserPassword(email, password);
    res.json({ message: 'Votre mot de passe a ete mis a jour. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('[API] Reset password failed', error);
    res.status(500).json({ error: 'Erreur serveur pendant la mise a jour du mot de passe.' });
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
  const successMessage = course.access === 'free'
    ? 'Votre inscription a bien ete enregistree. La formation est maintenant disponible dans votre espace etudiante.'
    : 'Votre demande d inscription a bien ete enregistree. Apres validation administrative, vous recevrez une confirmation et votre acces personnel sera ouvert dans votre espace etudiante.';
  res.status(201).json({
    message: successMessage,
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
    savePersistedData();
  }
  res.json(serializeCatalog(user).find((item) => item.id === course.id));
});

app.post('/api/student/courses/:courseId/quiz/submit', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const course = courses.find((item) => item.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

  const workspace = ensureStudentWorkspace(user);
  const isEnrolled = workspace.enrollments.some((item) => item.courseId === course.id);
  if (!isEnrolled) return res.status(403).json({ error: 'Vous n\'etes pas inscrite a cette formation.' });

  if (!course.quizQuestions || course.quizQuestions.length === 0) {
    return res.status(400).json({ error: 'Cette formation n\'a pas de quiz.' });
  }

  // Check attempt limit (max 2)
  const existingAttempt = courseQuizAttempts.get(course.id)?.get(user.id);
  if (existingAttempt && existingAttempt.attemptCount >= 2) {
    return res.status(400).json({ error: 'Nombre maximum d\'essais atteint (2/2). Quiz verrouillé.' });
  }

  const answers: Record<string, number> = {};
  if (req.body?.answers && typeof req.body.answers === 'object') {
    for (const [qId, val] of Object.entries(req.body.answers)) {
      if (Number.isInteger(Number(val))) answers[qId] = Number(val);
    }
  }

  const total = course.quizQuestions.length;
  let correctCount = 0;
  for (const question of course.quizQuestions) {
    if (answers[question.id] === question.correctIndex) correctCount++;
  }
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const scaledScore = total > 0 ? Math.round((correctCount / total) * 10) : 0;

  // Best score tracking: keep highest percentage across attempts
  const prevBestPct   = existingAttempt?.bestPercentage ?? existingAttempt?.percentage ?? -1;
  const bestScore     = percentage > prevBestPct ? scaledScore : (existingAttempt?.bestScore ?? scaledScore);
  const bestPercentage = percentage > prevBestPct ? percentage  : (existingAttempt?.bestPercentage ?? percentage);
  const passed = bestPercentage >= 50;

  const attempt = {
    answers,
    score: scaledScore,
    total: 10,
    percentage,
    passed,
    submittedAt: new Date().toISOString(),
    attemptCount: (existingAttempt?.attemptCount ?? 0) + 1,
    bestScore,
    bestPercentage,
  };

  if (!courseQuizAttempts.has(course.id)) {
    courseQuizAttempts.set(course.id, new Map());
  }
  courseQuizAttempts.get(course.id)!.set(user.id, attempt);

  // Persist to JSON backup
  savePersistedData();
  // Persist to MySQL (awaited — errors visible in logs)
  try {
    const pool = await getDbPool();
    if (pool) await upsertCourseQuizAttemptToDb(pool, course.id, user.id, attempt);
  } catch (dbErr) {
    console.error('[DB] Quiz submit persistence error:', dbErr);
  }

  res.json(serializeCatalog(user));
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
    recipientName: recipientRole === 'admin' ? "Direction Essenti' Elle" : 'Dr. Expert',
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

app.post('/api/student/exams/:examId/submit', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['student']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });
  const exam = exams.find((item) => item.id === req.params.examId);
  if (!exam) return res.status(404).json({ error: 'Examen introuvable.' });

  // ── DEBUG STEP 4: log received payload ───────────────────────────────────
  console.log('[EXAM-DEBUG] POST /submit — examId:', req.params.examId);
  console.log('[EXAM-DEBUG] user:', user.id, user.email);
  console.log('[EXAM-DEBUG] req.body:', JSON.stringify(req.body));
  console.log('[EXAM-DEBUG] req.body.answers:', JSON.stringify(req.body?.answers));
  console.log('[EXAM-DEBUG] answers is array?', Array.isArray(req.body?.answers));
  // ─────────────────────────────────────────────────────────────────────────

  // Accept answers as {questionId: optionIndex} object OR legacy positional array
  const answers: Record<string, number> = {};
  const body = req.body?.answers;
  let receivedAnswersCount = 0;
  if (body && !Array.isArray(body) && typeof body === 'object') {
    // New format: {questionId: optionIndex}
    receivedAnswersCount = Object.keys(body as Record<string, unknown>).length;
    for (const q of exam.questions) {
      const val = Number((body as Record<string, unknown>)[q.id]);
      answers[q.id] = Number.isNaN(val) ? -1 : val;
    }
  } else {
    // Legacy array format — map by position
    const raw = Array.isArray(body) ? (body as unknown[]).map((v) => Number(v)) : [];
    receivedAnswersCount = raw.length;
    exam.questions.forEach((q, i) => {
      answers[q.id] = i < raw.length && !Number.isNaN(raw[i]) ? raw[i] : -1;
    });
  }

  // ── DEBUG STEP 5: log normalized answers ─────────────────────────────────
  console.log('[EXAM-DEBUG] received answers count:', receivedAnswersCount, '| exam questions count:', exam.questions.length);
  console.log('[EXAM-DEBUG] normalized answers:', JSON.stringify(answers));
  // ─────────────────────────────────────────────────────────────────────────

  const workspace = ensureStudentWorkspace(user);
  // Auto-enroll in the course if accessible (free course or already enrolled)
  const examCourse = courses.find((c) => c.id === exam.courseId);
  if (examCourse?.access === 'free' && !workspace.enrollments.some((item) => item.courseId === exam.courseId)) {
    workspace.enrollments.push({ courseId: exam.courseId, progress: 0 });
  }
  if (!workspace.enrollments.some((item) => item.courseId === exam.courseId)) {
    console.log('[EXAM-DEBUG] BLOCKED — not enrolled in course:', exam.courseId, '| enrollments:', JSON.stringify(workspace.enrollments.map(e => e.courseId)));
    return res.status(403).json({ error: 'Examen non accessible. Demandez votre inscription a la formation.' });
  }

  const attempts = studentAttempts.get(user.id) ?? [];
  const existing = attempts.find((attempt) => attempt.examId === exam.id);
  const maxAttempts = getExamMaxAttempts(exam);

  // ── DEBUG STEP 6: log attempt state ──────────────────────────────────────
  console.log('[EXAM-DEBUG] existing attempt:', existing ? `attemptCount=${existing.attemptCount}` : 'none');
  console.log('[EXAM-DEBUG] maxAttempts:', maxAttempts);
  // ─────────────────────────────────────────────────────────────────────────

  // No attempt limit — students can retake as many times as needed

  // ── REAL GRADING ENGINE ────────────────────────────────────────────────────
  // For each question: compare answer with correctIndex, accumulate earned pts.
  // percentage = (earnedScore / totalPoints) × 100
  // scaledScore = (earnedScore / totalPoints) × gradingScaleMax
  // passed = scaledScore >= passThreshold
  const grade = gradeExamSubmission(exam, answers);

  // ── DEBUG STEP 7: log grading result ─────────────────────────────────────
  console.log('[EXAM-DEBUG] grade.earnedScore:', grade.earnedScore);
  console.log('[EXAM-DEBUG] grade.totalPoints:', grade.totalPoints);
  console.log('[EXAM-DEBUG] grade.percentage:', grade.percentage);
  console.log('[EXAM-DEBUG] grade.scaledScore:', grade.scaledScore);
  console.log('[EXAM-DEBUG] grade.passed:', grade.passed);
  // ─────────────────────────────────────────────────────────────────────────

  if (existing) {
    existing.answers      = answers;
    existing.score        = grade.scaledScore;
    existing.rawScore     = grade.earnedScore;
    existing.totalPoints  = grade.totalPoints;
    existing.percentage   = grade.percentage;
    existing.submittedAt  = new Date().toISOString();
    existing.attemptCount += 1;
  } else {
    attempts.push({
      examId:       exam.id,
      answers,
      score:        grade.scaledScore,
      rawScore:     grade.earnedScore,
      totalPoints:  grade.totalPoints,
      percentage:   grade.percentage,
      submittedAt:  new Date().toISOString(),
      attemptCount: 1,
    });
  }
  studentAttempts.set(user.id, attempts);
  ensureExamCertificate(user, exam, grade.scaledScore);
  savePersistedData();
  // Persist attempt to MySQL — awaited so errors are visible in logs
  const savedAttemptForDb = studentAttempts.get(user.id)?.find((a) => a.examId === exam.id);
  if (savedAttemptForDb) {
    try {
      const pool = await getDbPool();
      if (pool) await upsertAttemptToDb(pool, user.id, savedAttemptForDb);
    } catch (dbErr) {
      console.error('[DB] submit: attempt persistence error:', dbErr);
    }
  }

  // ── DEBUG STEP 8: log saved attempt ──────────────────────────────────────
  const saved = studentAttempts.get(user.id)?.find((a) => a.examId === exam.id);
  console.log('[EXAM-DEBUG] saved attempt:', JSON.stringify(saved));
  console.log(`[EXAM-DEBUG] studentAttempts now has ${studentAttempts.size} student(s) — user ${user.id} has ${studentAttempts.get(user.id)?.length ?? 0} attempt(s)`);
  // ─────────────────────────────────────────────────────────────────────────

  // Return the full updated exam list so the client updates immediately
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
    const quizQuestions = parseQuizQuestions(req.body?.quizQuestions);

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
      quizTitle: typeof req.body?.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) || undefined : undefined,
      quizQuestions,
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
    if (Array.isArray(req.body?.quizQuestions)) {
      course.quizQuestions = parseQuizQuestions(req.body.quizQuestions);
    }
    if (req.body?.quizTitle !== undefined) {
      course.quizTitle = typeof req.body.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) || undefined : undefined;
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

// ── Instructor quiz results ────────────────────────────────────────────────
app.get('/api/instructor/quiz-results', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const ownCourses = courses.filter((c) => instructorOwnsCourse(user, c) && c.quizQuestions?.length);
  const results = ownCourses.map((course) => {
    const courseAttempts = courseQuizAttempts.get(course.id);
    const students: object[] = [];
    if (courseAttempts) {
      for (const [studentId, attempt] of courseAttempts.entries()) {
        const student = getStoredUserById(studentId);
        if (!student) continue;
        const ws = ensureStudentWorkspace(toPublicUser(student));
        const certIssued = ws.certificates.some((c) => c.courseId === course.id && c.status === 'issued');
        students.push({
          studentId,
          studentName:     student.name,
          studentEmail:    student.email,
          score:           attempt.score,
          total:           attempt.total,
          percentage:      attempt.percentage,
          passed:          attempt.passed,
          attemptCount:    attempt.attemptCount,
          submittedAt:     attempt.submittedAt,
          certificateIssued: certIssued,
          bestScore:       attempt.bestScore      ?? attempt.score,
          bestPercentage:  attempt.bestPercentage ?? attempt.percentage,
        });
      }
    }
    const passed   = (students as any[]).filter((s) => s.passed).length;
    const avgScore = students.length
      ? Math.round((students as any[]).reduce((s, r) => s + r.percentage, 0) / students.length)
      : 0;
    return {
      courseId:     course.id,
      courseTitle:  course.title,
      quizTitle:    course.quizTitle ?? 'Quiz',
      questions:    course.quizQuestions?.length ?? 0,
      totalStudents: students.length,
      passedCount:  passed,
      avgScore,
      students,
    };
  });
  res.json(results);
});

// Issue quiz certificate for a student (supports optional PDF upload via multipart/form-data)
const certUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
app.post('/api/instructor/courses/:courseId/quiz-certificate/:studentId', (req, res, next): void => {
  certUpload.single('certificate')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: 'Erreur lecture fichier: ' + String(err instanceof Error ? err.message : err) });
      return;
    }
    next();
  });
}, (req: Request, res: any): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const courseId  = String(req.params['courseId']);
  const studentId = String(req.params['studentId']);

  const course = courses.find((c) => c.id === courseId && instructorOwnsCourse(user, c));
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

  const student = getStoredUserById(studentId);
  if (!student) return res.status(404).json({ error: 'Étudiant introuvable.' });

  const attempt = courseQuizAttempts.get(course.id)?.get(studentId);
  if (!attempt?.passed) return res.status(400).json({ error: 'L\'étudiante n\'a pas validé le quiz.' });

  // Save PDF if provided
  let pdfUrl: string | undefined;
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (file) {
    const certDir = join(process.cwd(), 'public', 'uploads', 'certificates');
    if (!existsSync(certDir)) mkdirSync(certDir, { recursive: true });
    const filename = `cert-${course.id}-${student.id}.pdf`;
    writeFileSync(join(certDir, filename), file.buffer);
    pdfUrl = `/uploads/certificates/${filename}`;
  }

  const ws = ensureStudentWorkspace(toPublicUser(student));
  const existing = ws.certificates.find((c) => c.courseId === course.id);
  if (existing) {
    existing.status   = 'issued';
    existing.issuedAt = new Date().toISOString();
    existing.signedBy = user.name;
    if (pdfUrl) existing.pdfUrl = pdfUrl;
  } else {
    ws.certificates.unshift({
      id:       `cert-quiz-${course.id}-${student.id}-${Date.now()}`,
      courseId: course.id,
      title:    `Certificat — ${course.quizTitle ?? 'Quiz'} — ${course.title}`,
      issuedAt: new Date().toISOString(),
      status:   'issued',
      signedBy: user.name,
      pdfUrl,
    });
  }
  savePersistedData();
  res.json({ ok: true, studentName: student.name, courseTitle: course.title, pdfUrl });
});

// Reset (delete) a student's quiz attempt for a course
app.delete('/api/instructor/courses/:courseId/quiz-attempts/:studentId', async (req, res): Promise<any> => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const course = courses.find((c) => c.id === req.params.courseId && instructorOwnsCourse(user, c));
  if (!course) return res.status(404).json({ error: 'Formation introuvable.' });

  const studentId = req.params.studentId;
  // Remove from in-memory map
  courseQuizAttempts.get(course.id)?.delete(studentId);

  // Remove from DB
  try {
    const pool = await getDbPool();
    if (pool) {
      await pool.query(
        'DELETE FROM course_quiz_attempts WHERE course_id = ? AND student_id = ?',
        [course.id, studentId]
      );
    }
  } catch (dbErr) {
    console.error('[DB] Quiz attempt reset error:', dbErr);
  }

  savePersistedData();
  res.json({ ok: true });
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
      .map((exam) => {
        const allStudents = getAllStudentsForExam(exam);
        // Compute aggregate stats from the already-fetched rows (avoid double scan)
        const participants   = allStudents.length;
        const passedStudents = allStudents.filter((s) => s.passed).length;
        const avgPercentage  = participants > 0
          ? Number((allStudents.reduce((sum, s) => sum + s.percentage, 0) / participants).toFixed(1))
          : 0;
        return {
        id: exam.id,
        title: exam.title,
        courseId: exam.courseId,
        courseTitle: getCourseTitle(exam.courseId),
        dueDate: exam.dueDate,
        assignedBy: exam.assignedBy,
        examType: exam.examType ?? 'quiz',
        gradingScaleMax: getExamScaleMax(exam),
        passThreshold: getExamPassThreshold(exam),
        averageScore:      avgPercentage,   // average % across all submissions
        submissions:       participants,    // COUNT(*)
        passedCount:       passedStudents,  // SUM(CASE WHEN passed THEN 1 ELSE 0 END)
        durationMinutes: getExamDurationMinutes(exam),
        maxAttempts: getExamMaxAttempts(exam),
        successfulStudents: allStudents.filter((s) => s.passed),
        allStudents,
        questions: exam.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          points: question.points,
        })),
        };
      })
  );
});

app.post('/api/instructor/exams', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const courseId = String(req.body?.courseId ?? '');
  const dueDate = typeof req.body?.dueDate === 'string' ? req.body.dueDate : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const examType: 'quiz' | 'final' = req.body?.examType === 'final' ? 'final' : 'quiz';
  const durationMinutes = Math.max(5, Math.min(180, Number(req.body?.durationMinutes ?? 20)));
  const maxAttempts = Math.max(1, Math.min(5, Number(req.body?.maxAttempts ?? 1)));
  const gradingScaleMax = [10, 20, 100].includes(Number(req.body?.gradingScaleMax)) ? Number(req.body?.gradingScaleMax) : 20;
  const passThreshold = Math.max(0, Math.min(gradingScaleMax, Number(req.body?.passThreshold ?? gradingScaleMax / 2)));
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
    examType,
    durationMinutes,
    maxAttempts,
    gradingScaleMax,
    passThreshold,
    questions: incomingQuestions.map((question: any, index: number) => ({
      id: `question-${Date.now()}-${index}`,
      prompt: String(question.prompt ?? '').trim(),
      options: Array.isArray(question.options)
        ? question.options.filter((o: unknown) => typeof o === 'string' && (o as string).trim()).map((o: unknown) => String(o).trim())
        : [],
      correctIndex: Number(question.correctIndex ?? 0),
      points: Number(question.points ?? 1),
    })),
  };
  exams.unshift(exam);
  savePersistedData();
  void getDbPool().then((pool) => { if (pool) void upsertExamToDb(pool, exam); });

  res.status(201).json({
    id: exam.id,
    title: exam.title,
    courseId: exam.courseId,
    courseTitle: getCourseTitle(exam.courseId),
    dueDate: exam.dueDate,
    assignedBy: exam.assignedBy,
    examType: exam.examType,
    gradingScaleMax: getExamScaleMax(exam),
    passThreshold: getExamPassThreshold(exam),
    durationMinutes: getExamDurationMinutes(exam),
    maxAttempts: getExamMaxAttempts(exam),
    averageScore: 0,
    submissions: 0,
    successfulStudents: [],
    allStudents: [],
    questions: exam.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      points: question.points,
    })),
  });
});

app.put('/api/instructor/exams/:examId', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const exam = exams.find((e) => {
    if (e.id !== req.params.examId) return false;
    const course = courses.find((c) => c.id === e.courseId);
    return course ? instructorOwnsCourse(user, course) : false;
  });
  if (!exam) return res.status(404).json({ error: 'Examen introuvable.' });

  if (typeof req.body?.title === 'string' && req.body.title.trim().length >= 3)
    exam.title = req.body.title.trim();
  if (typeof req.body?.dueDate === 'string')
    exam.dueDate = req.body.dueDate;
  if (req.body?.durationMinutes !== undefined)
    exam.durationMinutes = Math.max(5, Math.min(180, Number(req.body.durationMinutes)));
  if (req.body?.maxAttempts !== undefined)
    exam.maxAttempts = Math.max(1, Math.min(5, Number(req.body.maxAttempts)));
  if (req.body?.gradingScaleMax !== undefined && [10, 20, 100].includes(Number(req.body.gradingScaleMax)))
    exam.gradingScaleMax = Number(req.body.gradingScaleMax);
  if (req.body?.passThreshold !== undefined)
    exam.passThreshold = Math.max(0, Math.min(getExamScaleMax(exam), Number(req.body.passThreshold)));

  savePersistedData();
  void getDbPool().then((pool) => { if (pool) void upsertExamToDb(pool, exam); });
  res.json({
    id: exam.id, title: exam.title, courseId: exam.courseId,
    courseTitle: getCourseTitle(exam.courseId), dueDate: exam.dueDate,
    assignedBy: exam.assignedBy, examType: exam.examType ?? 'quiz',
    gradingScaleMax: getExamScaleMax(exam), passThreshold: getExamPassThreshold(exam),
    durationMinutes: getExamDurationMinutes(exam), maxAttempts: getExamMaxAttempts(exam),
    averageScore: getExamAverage(exam.id),
    submissions: Array.from(studentAttempts.values()).filter((a) => a.some((item) => item.examId === exam.id)).length,
    successfulStudents: getSuccessfulStudentsForExam(exam),
    allStudents: getAllStudentsForExam(exam),
    questions: exam.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, points: q.points })),
  });
});

app.delete('/api/instructor/exams/:examId', (req, res): any => {
  const user = getCurrentUser(req, ['instructor']);
  if (!user) return res.status(401).json({ error: 'Authentification requise.' });

  const idx = exams.findIndex((e) => {
    if (e.id !== req.params.examId) return false;
    const course = courses.find((c) => c.id === e.courseId);
    return course ? instructorOwnsCourse(user, course) : false;
  });
  if (idx === -1) return res.status(404).json({ error: 'Examen introuvable.' });

  const deletedId = exams[idx].id;
  exams.splice(idx, 1);
  deletedExamIds.add(deletedId);
  savePersistedData();
  void getDbPool().then((pool) => { if (pool) void deleteExamFromDb(pool, deletedId); });
  res.status(204).end();
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
    if (Array.isArray(req.body?.quizQuestions)) {
      course.quizQuestions = parseQuizQuestions(req.body.quizQuestions);
    }
    if (req.body?.quizTitle !== undefined) {
      course.quizTitle = typeof req.body.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) || undefined : undefined;
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
    subject: `Acces a la formation valide - ${course.title}`,
    content: `Votre inscription a la formation ${course.title} a ete validee. Votre acces personnel est maintenant ouvert de facon definitive dans votre espace etudiante.`,
    sentAt: new Date().toISOString(),
  });

  let approvalEmailSent = false;
  try {
    approvalEmailSent = await sendPaidEnrollmentApprovalEmail(student, course, request);
  } catch (error) {
    console.error('[MAIL] Failed to send approval email', error);
  }

  res.json({
    ...request,
    feedbackMessage: approvalEmailSent
      ? 'La demande a ete validee, l acces definitif a ete ouvert pour cette etudiante et l email de confirmation a ete envoye automatiquement.'
      : (isMailerConfigured()
        ? 'La demande a ete validee et l acces definitif a ete ouvert pour cette etudiante, mais l email automatique n a pas pu etre envoye.'
        : 'La demande a ete validee et l acces definitif a ete ouvert pour cette etudiante. Configurez le SMTP pour activer l email automatique depuis votre adresse professionnelle.'),
    approvalEmailSent,
  });
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

  // Fail-fast si TOKEN_SECRET est absent ou trop faible en production.
  assertTokenSecretConfigured();

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
