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
  quizAttemptsRemaining?: number;
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
  makeStoredUser('1', 'Admin User', 'admin@lessentielle-bienetre.site', 'admin', 'password123'),
  makeStoredUser('2', 'Dr. Expert', 'instructor@lessentielle-bienetre.site', 'instructor', 'password123'),
  makeStoredUser('3', 'Jane Doe', 'student@lessentielle-bienetre.site', 'student', 'password123'),
];

const courses: Course[] = [
  {
    id: '1',
    title: 'Formation Nutrition & Pathologies Courantes',
    instructorId: '2',
    modules: 7,
    students: 210,
    thumbnail: '/formation%20nutrition%20pathologies%20courantes/cover%20nutrition%20origine.jpeg',
    description: "Formation complète en Nutrition & Pathologies Courantes : macronutriments, digestion, glycémie, hypertension, troubles digestifs, coaching nutritionnel et études de cas cliniques.",
    access: 'paid',
    priceEur: 2590,
    priceMinEur: 2590,
    priceMaxEur: 5990,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
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
      { id: 'content-1-1', text: 'Bases de la nutrition' },
      { id: 'content-1-2', text: 'Troubles digestifs' },
      { id: 'content-1-3', text: 'Déséquilibres métaboliques' },
      { id: 'content-1-4', text: 'Rééquilibrage alimentaire' },
      { id: 'content-1-5', text: 'Protocoles nutritionnels' },
      { id: 'content-1-6', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/formation%20nutrition%20pathologies%20courantes/im9.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im10.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im12.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im1.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im2.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im3.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im4.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im5.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im6.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im7.jpeg',
      '/formation%20nutrition%20pathologies%20courantes/im8.jpeg',
    ],
    chapters: [
      { id: 'ch-1-1', title: 'Module 1 : Bases de la Nutrition', content: "Introduction à l'alimentation, macronutriments (glucides, protéines, lipides), micronutriments, métabolisme, hydratation et équilibre nutritionnel." },
      { id: 'ch-1-2', title: 'Module 2 : Digestion & Microbiote', content: "Fonctionnement du système digestif, équilibre intestinal, microbiote, ballonnements, inflammation et alimentation anti-inflammatoire." },
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
          "Introduction — Rôle de l'alimentation dans le bien-être",
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
          "Introduction — Digestion et bien-être global",
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
    quizTitle: "Examen Final — Formation Pathologies & Alimentation",
    quizQuestions: [
      {
        id: "nfinal-q1",
        prompt: "Les glucides ont principalement pour rôle :",
        options: ["Construire les os", "Fournir de l'énergie", "Hydrater le corps", "Réparer les muscles"],
        correctIndex: 1,
      },
      {
        id: "nfinal-q2",
        prompt: "Quel aliment possède généralement un index glycémique élevé ?",
        options: ["Lentilles", "Pain blanc", "Brocoli", "Amandes"],
        correctIndex: 1,
      },
      {
        id: "nfinal-q3",
        prompt: "Pourquoi les fibres sont-elles importantes ?",
        options: [
          "Elles augmentent uniquement le sucre sanguin",
          "Elles favorisent le transit et la satiété",
          "Elles remplacent l'eau",
          "Elles empêchent la digestion",
        ],
        correctIndex: 1,
      },
      {
        id: "nfinal-q4",
        prompt: "Quel élément favorise le transit intestinal ?",
        options: ["Produits ultra-transformés", "Fibres alimentaires", "Excès de sucre", "Sédentarité"],
        correctIndex: 1,
      },
      {
        id: "nfinal-q5",
        prompt: "Où commence la digestion ?",
        options: ["Dans l'estomac", "Dans le foie", "Dans la bouche", "Dans l'intestin"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q6",
        prompt: "Pourquoi faut-il bien mastiquer ?",
        options: [
          "Pour manger plus vite",
          "Pour améliorer la digestion",
          "Pour supprimer l'appétit",
          "Pour éviter l'hydratation",
        ],
        correctIndex: 1,
      },
      {
        id: "nfinal-q7",
        prompt: "Quel est le rôle principal de l'intestin grêle ?",
        options: [
          "Produire du sucre",
          "Stocker les graisses",
          "Absorber les nutriments",
          "Produire des hormones uniquement",
        ],
        correctIndex: 2,
      },
      {
        id: "nfinal-q8",
        prompt: "Qu'est-ce que le microbiote ?",
        options: [
          "Un organe digestif",
          "L'ensemble des bactéries intestinales",
          "Une hormone",
          "Un médicament",
        ],
        correctIndex: 1,
      },
      {
        id: "nfinal-q9",
        prompt: "Quel facteur perturbe fortement la digestion ?",
        options: ["Relaxation", "Bonne mastication", "Stress chronique", "Hydratation adaptée"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q10",
        prompt: "Quels aliments favorisent souvent l'inflammation ?",
        options: ["Fruits frais", "Légumes verts", "Produits ultra-transformés", "Légumineuses"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q11",
        prompt: "Quel aliment est favorable au microbiote ?",
        options: ["Soda", "Yaourt nature", "Chips", "Bonbons"],
        correctIndex: 1,
      },
      {
        id: "nfinal-q12",
        prompt: "La glycémie correspond :",
        options: [
          "Au taux de sucre dans le sang",
          "Au taux d'eau dans le corps",
          "Au taux de graisse dans le sang",
          "Au taux de protéines",
        ],
        correctIndex: 0,
      },
      {
        id: "nfinal-q13",
        prompt: "Une consommation excessive de sucre peut favoriser :",
        options: [
          "L'hydratation",
          "Le sommeil profond",
          "L'inflammation",
          "La récupération musculaire uniquement",
        ],
        correctIndex: 2,
      },
      {
        id: "nfinal-q14",
        prompt: "Quelle habitude aide à réguler la glycémie ?",
        options: ["Sédentarité", "Activité physique régulière", "Excès de sucre", "Manque de sommeil"],
        correctIndex: 1,
      },
      {
        id: "nfinal-q15",
        prompt: "L'hypertension correspond :",
        options: [
          "À une mauvaise digestion",
          "À une pression trop élevée dans les artères",
          "À une baisse du métabolisme",
          "À un manque de sucre",
        ],
        correctIndex: 1,
      },
      {
        id: "nfinal-q16",
        prompt: "Quel aliment contient souvent du sel caché ?",
        options: ["Pomme", "Lentilles", "Plat industriel", "Concombre"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q17",
        prompt: "Pourquoi faut-il limiter le sel ?",
        options: [
          "Pour éviter les fibres",
          "Pour soutenir la bien-être cardiovasculaire",
          "Pour réduire l'hydratation",
          "Pour empêcher la digestion",
        ],
        correctIndex: 1,
      },
      {
        id: "nfinal-q18",
        prompt: "Quel aliment est recommandé pour la bien-être cardiovasculaire ?",
        options: ["Chips", "Soda", "Légumes verts", "Viennoiseries industrielles"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q19",
        prompt: "Le reflux gastrique correspond :",
        options: [
          "À une remontée acide de l'estomac",
          "À une inflammation articulaire",
          "À une déshydratation",
          "À une infection intestinale",
        ],
        correctIndex: 0,
      },
      {
        id: "nfinal-q20",
        prompt: "Quelle habitude favorise le rééquilibrage intestinal ?",
        options: ["Stress chronique", "Produits ultra-transformés", "Bonne mastication", "Excès alimentaires"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q21",
        prompt: "Quelle carence peut favoriser une grande fatigue ?",
        options: ["Fer", "Eau uniquement", "Fibres uniquement", "Calcium uniquement"],
        correctIndex: 0,
      },
      {
        id: "nfinal-q22",
        prompt: "Le magnésium participe principalement :",
        options: [
          "À l'équilibre nerveux",
          "À la cuisson des aliments",
          "À la digestion du lactose",
          "À la coloration des aliments",
        ],
        correctIndex: 0,
      },
      {
        id: "nfinal-q23",
        prompt: "Quel aliment est riche en antioxydants ?",
        options: ["Soda", "Chips", "Fruits rouges", "Bonbons"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q24",
        prompt: "Quel facteur peut perturber le sommeil ?",
        options: ["Relaxation", "Horaires réguliers", "Excès d'écrans le soir", "Repas léger"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q25",
        prompt: "Quel facteur influence fortement l'équilibre hormonal ?",
        options: ["Hydratation", "Respiration calme", "Stress chronique", "Sommeil régulier"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q26",
        prompt: "La ménopause correspond :",
        options: [
          "À une infection hormonale",
          "À une maladie digestive",
          "À une diminution progressive des hormones féminines",
          "À une augmentation permanente du sommeil",
        ],
        correctIndex: 2,
      },
      {
        id: "nfinal-q27",
        prompt: "Le rééquilibrage alimentaire repose principalement sur :",
        options: [
          "Les régimes extrêmes",
          "Le jeûne prolongé",
          "L'équilibre et la variété",
          "La suppression totale des glucides",
        ],
        correctIndex: 2,
      },
      {
        id: "nfinal-q28",
        prompt: "Pourquoi les protéines sont-elles importantes ?",
        options: [
          "Elles favorisent la satiété",
          "Elles remplacent l'eau",
          "Elles empêchent le sommeil",
          "Elles augmentent uniquement le sucre sanguin",
        ],
        correctIndex: 0,
      },
      {
        id: "nfinal-q29",
        prompt: "Quelle qualité est essentielle pour un coach nutritionnel ?",
        options: ["Jugement", "Autorité excessive", "Écoute active", "Pression constante"],
        correctIndex: 2,
      },
      {
        id: "nfinal-q30",
        prompt: "Quelle attitude favorise la motivation du client ?",
        options: ["Critique constante", "Stress", "Bienveillance", "Objectifs impossibles"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: '2',
    title: "Formation Détox Thérapeutique Complète",
    instructorId: '2',
    modules: 10,
    students: 185,
    thumbnail: '/formation%20detox/cover%20detox%20origin.jpeg',
    description: "Une formation complète en 10 modules pour maîtriser la détox thérapeutique : émonctoires, foie, reins, intestins, poumons, peau, alimentation détox et suivi personnalisé.",
    access: 'paid',
    priceEur: 790,
    priceMinEur: 790,
    priceMaxEur: 1590,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Détox',
    status: 'published',
    galleryImages: [
      '/formation%20detox/im12.jpeg',
      '/formation%20detox/im10.jpeg',
      '/formation%20detox/im9.jpeg',
      '/formation%20detox/im11.jpeg',
      '/formation%20detox/im1.jpeg',
      '/formation%20detox/im2.jpeg',
      '/formation%20detox/im3.jpeg',
      '/formation%20detox/im4.jpeg',
      '/formation%20detox/im5.jpeg',
      '/formation%20detox/im6.jpeg',
      '/formation%20detox/im7.jpeg',
      '/formation%20detox/im8.jpeg',
    ],
    moduleItems: [
      {
        id: 'module-2-pdf',
        title: 'Formation Détox Thérapeutique Complète',
        pdfName: 'formation-detox-complete.pdf',
        pdfDataUrl: '/uploads/formation-detox-complete.pdf',
      },
    ],
    chapters: [
      {
        id: 'ch-2-1',
        title: 'Certification France',
        content: '790 EUR',
      },
      {
        id: 'ch-2-2',
        title: 'Certification France + Tunisie',
        content: '',
      },
    ],
    contentItems: [
      { id: 'content-2-1', text: 'Détox perte de poids' },
      { id: 'content-2-2', text: 'Détox des émonctoires' },
      { id: 'content-2-3', text: 'Détox de la peau' },
      { id: 'content-2-4', text: 'Hygiène de vie' },
      { id: 'content-2-5', text: 'Protocoles personnalisés' },
      { id: 'content-2-6', text: 'Certificat professionnel de fin de formation' },
    ],
    quizTitle: "Examen Final — Détox Thérapeutique Complète (Modules 1 à 10)",
    quizQuestions: [
      // MODULE 1 — LES BASES DE LA DÉTOX
      {
        id: "detox-q1",
        prompt: "Quel est l'objectif principal d'une détox ?",
        options: [
          "Fatiguer l'organisme",
          "Soutenir les mécanismes naturels d'élimination",
          "Supprimer tous les aliments gras",
          "Manger uniquement des fruits",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q2",
        prompt: "Quel organe participe à la détoxification naturelle du corps ?",
        options: ["Les cheveux", "Le foie", "Les ongles", "Les dents"],
        correctIndex: 1,
      },
      {
        id: "detox-q3",
        prompt: "Quelle habitude soutient une détox ?",
        options: ["Dormir peu", "Boire suffisamment d'eau", "Consommer plus de sodas", "Manger rapidement"],
        correctIndex: 1,
      },
      {
        id: "detox-q4",
        prompt: "Quel peut être un bienfait d'une détox ?",
        options: ["Fatigue permanente", "Manque d'énergie", "Sensation de légèreté", "Déshydratation"],
        correctIndex: 2,
      },
      {
        id: "detox-q5",
        prompt: "Pourquoi personnaliser un plan détox ?",
        options: [
          "Chaque organisme possède des besoins différents",
          "Pour supprimer tous les repas",
          "Pour manger moins définitivement",
          "Pour éviter l'hydratation",
        ],
        correctIndex: 0,
      },
      // MODULE 2 — DÉTOX PERTE DE POIDS
      {
        id: "detox-q6",
        prompt: "Quel facteur peut favoriser la prise de poids ?",
        options: ["Activité physique régulière", "Stress chronique", "Bonne hydratation", "Sommeil réparateur"],
        correctIndex: 1,
      },
      {
        id: "detox-q7",
        prompt: "Quel aliment peut soutenir une alimentation détox minceur ?",
        options: ["Soda", "Produits industriels", "Légumes verts", "Bonbons"],
        correctIndex: 2,
      },
      {
        id: "detox-q8",
        prompt: "Pourquoi l'activité physique est-elle importante ?",
        options: [
          "Elle favorise la sédentarité",
          "Elle soutient l'énergie et le métabolisme",
          "Elle réduit l'hydratation",
          "Elle fatigue les reins",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q9",
        prompt: "Quel repas favorise une meilleure satiété ?",
        options: ["Produits ultra-transformés", "Repas équilibré riche en fibres", "Soda uniquement", "Sucreries"],
        correctIndex: 1,
      },
      {
        id: "detox-q10",
        prompt: "Quelle habitude aide à maintenir une perte de poids durable ?",
        options: ["Régularité des bonnes habitudes", "Régimes extrêmes", "Restriction permanente", "Sauter les repas"],
        correctIndex: 0,
      },
      // MODULE 3 — LES 5 ÉMONCTOIRES
      {
        id: "detox-q11",
        prompt: "Que sont les émonctoires ?",
        options: ["Des muscles", "Des organes d'élimination", "Des vitamines", "Des hormones"],
        correctIndex: 1,
      },
      {
        id: "detox-q12",
        prompt: "Quel organe est considéré comme le principal filtre du corps ?",
        options: ["Les cheveux", "Le foie", "Les dents", "Les os"],
        correctIndex: 1,
      },
      {
        id: "detox-q13",
        prompt: "Quel émonctoire participe à l'élimination via les urines ?",
        options: ["Les reins", "Les yeux", "Les muscles", "Les oreilles"],
        correctIndex: 0,
      },
      {
        id: "detox-q14",
        prompt: "Quel rôle jouent les intestins ?",
        options: [
          "Produire des os",
          "Digérer et éliminer les déchets",
          "Réguler uniquement le sommeil",
          "Remplacer le foie",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q15",
        prompt: "Quel émonctoire participe à l'élimination par la transpiration ?",
        options: ["Les poumons", "La peau", "Les cheveux", "Les dents"],
        correctIndex: 1,
      },
      // MODULE 4 — DÉTOX FOIE
      {
        id: "detox-q16",
        prompt: "Quel est le rôle principal du foie ?",
        options: [
          "Produire des cheveux",
          "Participer à la détoxification",
          "Réguler uniquement la respiration",
          "Produire des os",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q17",
        prompt: "Quel signe peut indiquer un foie surchargé ?",
        options: ["Sensation de légèreté permanente", "Fatigue", "Excès d'énergie", "Hydratation excessive"],
        correctIndex: 1,
      },
      {
        id: "detox-q18",
        prompt: "Quel aliment soutient le foie ?",
        options: ["Artichaut", "Soda", "Bonbons", "Produits ultra-transformés"],
        correctIndex: 0,
      },
      {
        id: "detox-q19",
        prompt: "Quelle plante est souvent utilisée pour le foie ?",
        options: ["Chardon-Marie", "Menthe industrielle", "Café sucré", "Soda"],
        correctIndex: 0,
      },
      {
        id: "detox-q20",
        prompt: "Quelle habitude soutient le foie ?",
        options: ["Excès d'alcool", "Mauvaise hydratation", "Alimentation équilibrée", "Sédentarité"],
        correctIndex: 2,
      },
      // MODULE 5 — DÉTOX REINS
      {
        id: "detox-q21",
        prompt: "Quel est le rôle principal des reins ?",
        options: [
          "Produire des hormones uniquement",
          "Filtrer le sang et éliminer les déchets",
          "Digérer les aliments",
          "Réguler uniquement la respiration",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q22",
        prompt: "Quel signe peut indiquer une surcharge rénale ?",
        options: ["Rétention d'eau", "Énergie excessive", "Respiration profonde", "Digestion rapide"],
        correctIndex: 0,
      },
      {
        id: "detox-q23",
        prompt: "Quel aliment est riche en eau ?",
        options: ["Concombre", "Bonbons", "Viennoiseries", "Soda"],
        correctIndex: 0,
      },
      {
        id: "detox-q24",
        prompt: "Quelle plante est souvent utilisée dans les approches drainantes ?",
        options: ["Ortie", "Chocolat", "Café sucré", "Soda"],
        correctIndex: 0,
      },
      {
        id: "detox-q25",
        prompt: "Quelle habitude soutient les reins ?",
        options: ["Limiter fortement l'eau", "Boire régulièrement", "Excès de sel", "Sédentarité"],
        correctIndex: 1,
      },
      // MODULE 6 — DÉTOX INTESTINALE
      {
        id: "detox-q26",
        prompt: "Quel est le rôle principal des intestins ?",
        options: [
          "Produire des os",
          "Digérer et éliminer les déchets",
          "Filtrer le sang",
          "Réguler uniquement le sommeil",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q27",
        prompt: "Quel signe peut indiquer un intestin déséquilibré ?",
        options: ["Ballonnements", "Excès d'énergie", "Respiration profonde", "Vision améliorée"],
        correctIndex: 0,
      },
      {
        id: "detox-q28",
        prompt: "Quel aliment est riche en fibres ?",
        options: ["Brocoli", "Soda", "Bonbons", "Produits industriels"],
        correctIndex: 0,
      },
      {
        id: "detox-q29",
        prompt: "Que sont les probiotiques ?",
        options: [
          "Des sucres raffinés",
          "Des mauvaises bactéries",
          "Des micro-organismes favorisant l'équilibre intestinal",
          "Des colorants alimentaires",
        ],
        correctIndex: 2,
      },
      {
        id: "detox-q30",
        prompt: "Quelle habitude favorise le confort digestif ?",
        options: [
          "Bien mâcher les aliments",
          "Manger rapidement",
          "Réduire fortement l'eau",
          "Augmenter les produits industriels",
        ],
        correctIndex: 0,
      },
      // MODULE 7 — DÉTOX POUMONS
      {
        id: "detox-q31",
        prompt: "Quel est le rôle principal des poumons ?",
        options: [
          "Digérer les aliments",
          "Assurer les échanges respiratoires",
          "Filtrer le sang",
          "Produire des hormones",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q32",
        prompt: "Quel facteur peut perturber les poumons ?",
        options: ["Air pur", "Activité physique modérée", "Pollution atmosphérique", "Hydratation suffisante"],
        correctIndex: 2,
      },
      {
        id: "detox-q33",
        prompt: "Quelle plante est souvent utilisée pour le confort respiratoire ?",
        options: ["Thym", "Chocolat", "Café", "Persil"],
        correctIndex: 0,
      },
      {
        id: "detox-q34",
        prompt: "Quel exercice favorise la détente respiratoire ?",
        options: ["Respiration profonde", "Sédentarité", "Manque de sommeil", "Excès de sucre"],
        correctIndex: 0,
      },
      {
        id: "detox-q35",
        prompt: "Quelle habitude soutient les poumons ?",
        options: [
          "Fumer régulièrement",
          "Bouger quotidiennement",
          "Éviter les espaces aérés",
          "Réduire l'hydratation",
        ],
        correctIndex: 1,
      },
      // MODULE 8 — DÉTOX PEAU
      {
        id: "detox-q36",
        prompt: "Quel est le rôle principal de la peau ?",
        options: [
          "Produire des os",
          "Protéger l'organisme",
          "Digérer les aliments",
          "Réguler uniquement le sommeil",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q37",
        prompt: "Quel facteur peut perturber l'équilibre de la peau ?",
        options: ["Bonne hydratation", "Sommeil réparateur", "Stress chronique", "Activité physique régulière"],
        correctIndex: 2,
      },
      {
        id: "detox-q38",
        prompt: "Quel aliment soutient une peau saine ?",
        options: ["Soda", "Produits industriels", "Fruits rouges", "Bonbons"],
        correctIndex: 2,
      },
      {
        id: "detox-q39",
        prompt: "Quelle pratique stimule la circulation cutanée ?",
        options: ["Brossage à sec", "Sédentarité", "Manque d'eau", "Manger rapidement"],
        correctIndex: 0,
      },
      {
        id: "detox-q40",
        prompt: "Quelle habitude favorise l'équilibre de la peau ?",
        options: [
          "Dormir suffisamment",
          "Limiter l'eau",
          "Augmenter les produits industriels",
          "Réduire les légumes",
        ],
        correctIndex: 0,
      },
      // MODULE 9 — ALIMENTATION DÉTOX
      {
        id: "detox-q41",
        prompt: "Quel est l'objectif principal d'une alimentation détox ?",
        options: [
          "Se priver totalement",
          "Soutenir l'équilibre du corps",
          "Supprimer tous les repas",
          "Manger uniquement des fruits",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q42",
        prompt: "Quel aliment est à privilégier ?",
        options: ["Soda", "Produits ultra-transformés", "Brocoli", "Bonbons"],
        correctIndex: 2,
      },
      {
        id: "detox-q43",
        prompt: "Pourquoi l'hydratation est-elle importante ?",
        options: [
          "Pour fatiguer l'organisme",
          "Pour soutenir les mécanismes d'élimination",
          "Pour remplacer les repas",
          "Pour réduire les fibres",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q44",
        prompt: "Quel aliment est préférable de limiter ?",
        options: ["Fruits frais", "Eau", "Produits industriels", "Légumes verts"],
        correctIndex: 2,
      },
      {
        id: "detox-q45",
        prompt: "Quel est l'avantage du batch cooking ?",
        options: [
          "Augmenter le stress",
          "Gagner du temps et mieux organiser les repas",
          "Réduire les légumes",
          "Supprimer les collations",
        ],
        correctIndex: 1,
      },
      // MODULE 10 — SUIVI & MAINTIEN APRÈS DÉTOX
      {
        id: "detox-q46",
        prompt: "Pourquoi la reprise alimentaire doit-elle être progressive ?",
        options: [
          "Pour fatiguer l'organisme",
          "Pour éviter les déséquilibres digestifs",
          "Pour supprimer l'hydratation",
          "Pour éviter les légumes",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q47",
        prompt: "Quelle habitude est importante après une détox ?",
        options: [
          "Réduire fortement l'eau",
          "Maintenir une bonne hydratation",
          "Dormir moins",
          "Supprimer l'activité physique",
        ],
        correctIndex: 1,
      },
      {
        id: "detox-q48",
        prompt: "Comment gérer un écart alimentaire ?",
        options: [
          "Avec culpabilité",
          "En arrêtant toutes les bonnes habitudes",
          "En revenant progressivement à l'équilibre",
          "En sautant plusieurs repas",
        ],
        correctIndex: 2,
      },
      {
        id: "detox-q49",
        prompt: "Quel élément soutient l'énergie au quotidien ?",
        options: ["Sédentarité", "Sommeil réparateur", "Stress chronique permanent", "Excès de sucre"],
        correctIndex: 1,
      },
      {
        id: "detox-q50",
        prompt: "Quel est l'objectif d'un plan d'entretien personnalisé ?",
        options: [
          "Imposer une routine identique à tous",
          "Supprimer tous les plaisirs alimentaires",
          "Créer des habitudes adaptées et durables",
          "Réduire l'activité physique",
        ],
        correctIndex: 2,
      },
    ],
  },
];

courses.push(
  {
    id: '5',
    title: 'Formation Réflexologie (oreille / pieds / mains)',
    instructorId: '2',
    modules: 8,
    students: 64,
    thumbnail: '/formation%20refexologie/cover%20img.jpeg',
    description: 'Apprenez les techniques de réflexologie auriculaire, plantaire et palmaire avec un parcours professionnalisant adaptable selon 1 à 3 certificats.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 2900,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Réflexologie',
    status: 'published',
    contentItems: [
      { id: 'content-5-1', text: 'Réflexologie plantaire' },
      { id: 'content-5-2', text: 'Réflexologie palmaire' },
      { id: 'content-5-3', text: 'Réflexologie auriculaire' },
      { id: 'content-5-4', text: 'Protocoles pratiques' },
      { id: 'content-5-5', text: 'Études de cas' },
      { id: 'content-5-6', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/uploads/reflexologie-im2.jpeg',
      '/uploads/reflexologie-im-2pos.jpeg',
      '/uploads/reflexologie-im3.jpeg',
      '/uploads/reflexologie-im4.jpeg',
      '/uploads/reflexologie-im1.jpeg',
      '/uploads/reflexologie-im6.jpeg',
    ],
    moduleItems: [
      {
        id: 'module-5-pdf',
        title: 'Formation Réflexologie Professionnelle — Oreilles, Pieds & Mains',
        pdfName: 'formation-reflexologie-complete.pdf',
        pdfDataUrl: '/uploads/formation-reflexologie-complete.pdf',
      },
    ],
    quizTitle: "Examen Final — Formation Réflexologie Professionnelle",
    quizAttemptsRemaining: 2,
    quizQuestions: [
      { id: 'ref-q1',  prompt: "La réflexologie est principalement :", options: ["Une médecine curative", "Une technique de bien-être", "Une chirurgie douce", "Une analyse sanguine"], correctIndex: 1 },
      { id: 'ref-q2',  prompt: "Les zones réflexes se situent :", options: ["Uniquement sur le dos", "Sur les pieds, mains et oreilles", "Uniquement sur les muscles", "Dans les os"], correctIndex: 1 },
      { id: 'ref-q3',  prompt: "Le principal objectif de la réflexologie est :", options: ["Diagnostiquer une maladie", "Remplacer un médecin", "Favoriser la détente et l'équilibre", "Prescrire un traitement"], correctIndex: 2 },
      { id: 'ref-q4',  prompt: "Le pied contient environ :", options: ["10 os", "26 os", "40 os", "5 os"], correctIndex: 1 },
      { id: 'ref-q5',  prompt: "La main correspond en réflexologie :", options: ["À un organe unique", "À un système nerveux uniquement", "À une cartographie du corps", "À la peau seulement"], correctIndex: 2 },
      { id: 'ref-q6',  prompt: "L'oreille en auriculothérapie représente :", options: ["Un cercle énergétique", "Un fœtus inversé", "Un muscle", "Un organe isolé"], correctIndex: 1 },
      { id: 'ref-q7',  prompt: "Le système nerveux est lié principalement à :", options: ["La digestion", "Le stress et la relaxation", "Les os", "La peau"], correctIndex: 1 },
      { id: 'ref-q8',  prompt: "La réflexologie palmaire est :", options: ["Plus douloureuse que plantaire", "Impossible à pratiquer", "Une alternative douce", "Une chirurgie des mains"], correctIndex: 2 },
      { id: 'ref-q9',  prompt: "Le stress agit principalement sur :", options: ["Les dents", "Le système nerveux", "Les cheveux", "Les ongles"], correctIndex: 1 },
      { id: 'ref-q10', prompt: "La réflexologie peut :", options: ["Guérir toutes les maladies", "Remplacer les médicaments", "Accompagner le bien-être", "Diagnostiquer un cancer"], correctIndex: 2 },
      { id: 'ref-q11', prompt: "Le foie est principalement relié au pied :", options: ["Gauche uniquement", "Droit uniquement", "Les deux pieds", "Aucun pied"], correctIndex: 1 },
      { id: 'ref-q12', prompt: "La pression en réflexologie doit être :", options: ["Toujours très forte", "Adaptée au client", "Toujours douloureuse", "Rapide et brusque"], correctIndex: 1 },
      { id: 'ref-q13', prompt: "Le lissage sert à :", options: ["Casser les os", "Détendre les tissus", "Stimuler la douleur", "Bloquer la circulation"], correctIndex: 1 },
      { id: 'ref-q14', prompt: "La cartographie réflexe permet :", options: ["De peindre le corps", "De localiser les zones réflexes", "De faire un diagnostic médical", "De remplacer une IRM"], correctIndex: 1 },
      { id: 'ref-q15', prompt: "L'anamnèse est :", options: ["Un massage", "Un entretien client", "Une maladie", "Une zone réflexe"], correctIndex: 1 },
      { id: 'ref-q16', prompt: "La zone digestive est située principalement :", options: ["Sur les orteils", "Au centre du pied", "Sur le talon uniquement", "Dans la main uniquement"], correctIndex: 1 },
      { id: 'ref-q17', prompt: "La colonne vertébrale est représentée :", options: ["Sur le bord interne du pied", "Sur les doigts uniquement", "Dans l'oreille seulement", "Nulle part"], correctIndex: 0 },
      { id: 'ref-q18', prompt: "Le protocole en réflexologie est :", options: ["Aléatoire", "Structuré", "Inutile", "Interdit"], correctIndex: 1 },
      { id: 'ref-q19', prompt: "La fidélisation client consiste à :", options: ["Changer de clients", "Créer une relation durable", "Ignorer les clients", "Augmenter la douleur"], correctIndex: 1 },
      { id: 'ref-q20', prompt: "La réflexologie auriculaire agit sur :", options: ["Le système nerveux", "Les muscles uniquement", "Les os", "La peau uniquement"], correctIndex: 0 },
      { id: 'ref-q21', prompt: "Quelle définition correspond à la réflexologie ?", options: ["Technique chirurgicale des pieds", "Technique de bien-être stimulant des zones réflexes pour l'équilibre du corps", "Méthode de diagnostic médical", "Pratique de nutrition thérapeutique"], correctIndex: 1 },
      { id: 'ref-q22', prompt: "Parmi les zones réflexes principales, lesquelles sont correctes ?", options: ["Dos, ventre, nuque", "Pieds, mains, oreilles", "Yeux, dents, coude", "Genou, épaule, cheville"], correctIndex: 1 },
      { id: 'ref-q23', prompt: "Quel est le rôle de l'anamnèse en réflexologie ?", options: ["Effectuer un massage profond", "Recueillir les informations du client pour adapter la séance", "Prescrire un traitement médicamenteux", "Réaliser un bilan sanguin"], correctIndex: 1 },
      { id: 'ref-q24', prompt: "Parmi les techniques suivantes, lesquelles sont utilisées en réflexologie plantaire ?", options: ["Incisions et sutures", "Lissage et pression circulaire", "Injections et prises de sang", "Acupuncture et moxibustion"], correctIndex: 1 },
      { id: 'ref-q25', prompt: "Quelle est la différence entre réflexologie plantaire et palmaire ?", options: ["La plantaire est toujours plus efficace", "La plantaire agit sur les pieds, la palmaire sur les mains", "Il n'y a aucune différence entre les deux", "La palmaire agit uniquement sur les pieds"], correctIndex: 1 },
      { id: 'ref-q26', prompt: "À quoi correspond le pouce en réflexologie palmaire ?", options: ["Au cœur et aux poumons", "À la tête et au cerveau", "Au foie et aux reins", "À l'estomac et à la rate"], correctIndex: 1 },
      { id: 'ref-q27', prompt: "Parmi ces éléments, lesquels sont des objectifs d'un protocole de relaxation ?", options: ["Diagnostiquer une maladie et prescrire un traitement", "Réduire le stress et favoriser la détente", "Augmenter la douleur et stimuler les tensions", "Remplacer intégralement les soins médicaux"], correctIndex: 1 },
      { id: 'ref-q28', prompt: "Pourquoi la réflexologie ne remplace-t-elle pas un traitement médical ?", options: ["Parce qu'elle est trop douloureuse", "Parce que c'est une pratique de bien-être sans diagnostic ni traitement", "Parce qu'elle est considérée trop efficace", "Parce qu'elle utilise des médicaments naturels"], correctIndex: 1 },
      { id: 'ref-q29', prompt: "Parmi les clients spécifiques étudiés dans la formation, lesquels sont cités ?", options: ["Enfants et nourrissons uniquement", "Sportifs et seniors", "Chirurgiens et médecins uniquement", "Animaux de compagnie"], correctIndex: 1 },
      { id: 'ref-q30', prompt: "Quel est le rôle d'un réflexologue professionnel ?", options: ["Prescrire des médicaments adaptés aux pathologies", "Accompagner le bien-être du client via des techniques réflexes personnalisées", "Réaliser des interventions chirurgicales", "Remplacer entièrement le médecin traitant"], correctIndex: 1 },
    ],
  },
  {
    id: '6',
    title: 'Formation professionnelle complète en Kinésiologie',
    instructorId: '2',
    modules: 10,
    students: 41,
    thumbnail: '/formation%20kin%C3%A9silogie/photo%20de%20cover.jpeg',
    description: "Formation complète en 10 modules pour maîtriser les bases de la kinésiologie, le test musculaire, l'anatomie fonctionnelle, les méridiens, les émotions, les réflexes archaïques et les protocoles professionnels.",
    presentation: "Cette formation professionnelle complète en kinésiologie vous guide pas à pas dans l'écoute du corps, l'identification des déséquilibres et la mise en place de corrections adaptées. Le parcours couvre 10 modules, environ 50 chapitres, 300 à 500 heures de formation, avec une approche globale du corps, du mental, de l'énergie, des émotions et du mouvement.",
    warning: "Cette formation est à visée éducative, bien-être et professionnelle. Elle ne remplace pas un diagnostic médical, un suivi thérapeutique réglementé ni un traitement prescrit. Le praticien accompagne la personne dans un cadre éthique, non médical et respectueux de ses limites professionnelles.",
    access: 'paid',
    priceEur: 2800,
    priceMinEur: 2800,
    priceMaxEur: 3900,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3],
    promoEnabled: false,
    category: 'Kinésiologie',
    status: 'published',
    objectives: [
      "Comprendre l'histoire, les principes fondamentaux et le cadre éthique de la kinésiologie",
      "Réaliser un test musculaire fiable, doux et sans douleur",
      "Identifier les déséquilibres structurels, émotionnels, énergétiques et fonctionnels",
      "Mobiliser les bases d'anatomie fonctionnelle, de biomécanique et de chaînes musculaires",
      "Utiliser les points réflexes neuro-vasculaires, neuro-lymphatiques et énergétiques",
      "Accompagner la gestion du stress, des émotions et des blocages corporels",
      "Intégrer Brain Gym, réflexes archaïques et protocoles d'intégration",
      "Construire une consultation professionnelle avec anamnèse, bilan, suivi et conseils personnalisés",
      "Mettre en place des protocoles de correction et de rééquilibrage adaptés à chaque personne",
      "Préparer une pratique professionnelle éthique avec étude de cas, stage supervisé et certification",
    ],
    contentItems: [
      { id: 'content-6-1', text: '10 modules complets' },
      { id: 'content-6-2', text: '50 chapitres détaillés' },
      { id: 'content-6-3', text: '300 à 500 heures de formation' },
      { id: 'content-6-4', text: 'Test musculaire et bilan kinésiologique' },
      { id: 'content-6-5', text: 'Protocoles professionnels, stage et étude de cas' },
      { id: 'content-6-6', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/formation%20kin%C3%A9silogie/im1.jpeg',
      '/formation%20kin%C3%A9silogie/im2.jpeg',
      '/formation%20kin%C3%A9silogie/im3.jpeg',
      '/formation%20kin%C3%A9silogie/im4.jpeg',
      '/formation%20kin%C3%A9silogie/im5.jpeg',
      '/formation%20kin%C3%A9silogie/im6.jpeg',
      '/formation%20kin%C3%A9silogie/im7.jpeg',
      '/formation%20kin%C3%A9silogie/im8.jpeg',
      '/formation%20kin%C3%A9silogie/im9.jpeg',
      '/formation%20kin%C3%A9silogie/im10.jpeg',
      '/formation%20kin%C3%A9silogie/im11.jpeg',
      '/formation%20kin%C3%A9silogie/im12.jpeg',
      '/formation%20kin%C3%A9silogie/im13.jpeg',
      '/formation%20kin%C3%A9silogie/im14.jpeg',
    ],
    programModules: [
      { id: 'kinesio-module-1', title: 'Introduction à la kinésiologie', chapters: ['Histoire et origines', 'Principes fondamentaux', 'Les 5 éléments', 'Le praticien en kinésiologie'] },
      { id: 'kinesio-module-2', title: 'Anatomie fonctionnelle et biomécanique', chapters: ['Système squelettique', 'Système musculaire', 'Articulations', 'Chaînes musculaires'] },
      { id: 'kinesio-module-3', title: 'Test musculaire et bilan', chapters: ['Principes du test musculaire', 'Méthodologie du bilan', 'Échelles musculaires', 'Interprétation des résultats'] },
      { id: 'kinesio-module-4', title: 'Méridiens énergétiques et équilibrage', chapters: ['Système des méridiens', 'Points énergétiques', 'Équilibrage énergétique', 'Cycles et éléments'] },
      { id: 'kinesio-module-5', title: 'Émotions et gestion émotionnelle', chapters: ['Émotions et stress', 'Libération émotionnelle', 'Équilibrage émotionnel', 'Transgénérationnel'] },
      { id: 'kinesio-module-6', title: 'Brain Gym et intégration cérébrale', chapters: ['Mouvements Brain Gym', 'Intégration hémisphérique', 'Apprentissage et performance', 'Équilibrage neurologique'] },
      { id: 'kinesio-module-7', title: 'Réflexes archaïques et intégration', chapters: ['Réflexes primaires', 'Réflexes posturaux', "Impact sur l'apprentissage", "Protocoles d'intégration"] },
      { id: 'kinesio-module-8', title: 'Protocoles avancés et approfondis', chapters: ['Protocoles structurels', 'Protocoles énergétiques', 'Protocoles émotionnels', 'Personnalisation des séances'] },
      { id: 'kinesio-module-9', title: 'Consultation professionnelle', chapters: ["Déroulement d'une séance", "Relation d'accompagnement", 'Suivi et prise en charge', 'Outils et supports'] },
      { id: 'kinesio-module-10', title: 'Pratique professionnelle et certification', chapters: ['Installation professionnelle', 'Études de cas et stage', 'Examen final', 'Certification internationale'] },
    ],
    chapters: [
      { id: 'kinesio-info-1', title: 'Tarifs internationaux', content: 'France : 2 800 €. France et Tunisie : 3 900 €. La formation comprend 10 modules et une certification incluse.' },
      { id: 'kinesio-info-2', title: 'Pour qui ?', content: 'Professionnels de santé, thérapeutes, coaches, praticiens du bien-être et personnes en reconversion professionnelle.' },
      { id: 'kinesio-info-3', title: 'Certifications', content: 'Niveau 1 : praticien en kinésiologie fondamentale. Niveau 2 : praticien en kinésiologie énergétique et émotionnelle. Niveau 3 : maître praticien en protocoles avancés et gestion d’activité.' },
      { id: 'kinesio-info-4', title: 'Voyage en excursion à Djerba', content: 'Possibilité de séjour avec vols directs Paris-Djerba, hôtels 4 et 5 étoiles, excursions et transferts inclus selon offre stagiaire.' },
    ],
    moduleItems: [],
    quizTitle: 'Examen Final — Formation professionnelle en Kinésiologie',
    quizAttemptsRemaining: 2,
    quizQuestions: [
      { id: 'kinesio-q1', prompt: "Quel est l'outil principal de la kinésiologie ?", options: ['Le test musculaire', 'La prise de tension', 'La prescription médicale', 'La radiographie'], correctIndex: 0 },
      { id: 'kinesio-q2', prompt: 'Que cherche principalement à rétablir la kinésiologie ?', options: ["L'équilibre du corps, du mental et des émotions", 'Un diagnostic médical', 'Une chirurgie correctrice', 'Un traitement pharmacologique'], correctIndex: 0 },
      { id: 'kinesio-q3', prompt: 'Un muscle faible lors du test peut indiquer :', options: ['Un déséquilibre ou un blocage', 'Une force parfaite', 'Une absence totale de stress', 'Une urgence chirurgicale automatique'], correctIndex: 0 },
      { id: 'kinesio-q4', prompt: 'Quel module aborde le système squelettique, musculaire et les articulations ?', options: ['Anatomie fonctionnelle et biomécanique', 'Brain Gym uniquement', 'Installation professionnelle', 'Voyage à Djerba'], correctIndex: 0 },
      { id: 'kinesio-q5', prompt: 'Les méridiens énergétiques sont étudiés pour :', options: ["Comprendre et équilibrer la circulation de l'énergie", 'Calculer une posologie', 'Remplacer un bilan médical', 'Mesurer uniquement la tension artérielle'], correctIndex: 0 },
      { id: 'kinesio-q6', prompt: "Dans une consultation professionnelle, l'anamnèse sert à :", options: ['Mieux connaître la personne et adapter la séance', 'Vendre obligatoirement un produit', 'Éviter toute écoute du client', 'Établir une ordonnance'], correctIndex: 0 },
      { id: 'kinesio-q7', prompt: 'Brain Gym concerne principalement :', options: ["Le mouvement au service du cerveau et de l'apprentissage", 'La comptabilité du cabinet', 'La chirurgie articulaire', 'La fabrication de compléments'], correctIndex: 0 },
      { id: 'kinesio-q8', prompt: 'Les réflexes archaïques peuvent influencer :', options: ["L'apprentissage, la posture et l'intégration corporelle", 'Uniquement la couleur des yeux', 'Le prix de la formation', 'Le numéro de certificat'], correctIndex: 0 },
      { id: 'kinesio-q9', prompt: 'Quel élément fait partie de la pratique professionnelle ?', options: ['Études de cas, stage et examen final', 'Suppression de toute éthique', 'Promesse de guérison immédiate', 'Diagnostic médical obligatoire'], correctIndex: 0 },
      { id: 'kinesio-q10', prompt: "Quel cadre doit respecter le praticien en kinésiologie ?", options: ['Un cadre éthique, bien-être et non médical', 'Un cadre de prescription médicale', 'Un cadre chirurgical', 'Un cadre sans confidentialité'], correctIndex: 0 },
      { id: 'kinesio-q11', prompt: 'Les points neuro-vasculaires et neuro-lymphatiques sont utilisés pour :', options: ["Soutenir l'équilibrage du système nerveux, lymphatique et énergétique", 'Réaliser une injection', 'Remplacer une analyse sanguine', 'Bloquer toute respiration'], correctIndex: 0 },
      { id: 'kinesio-q12', prompt: "La relation d'accompagnement implique principalement :", options: ['Écoute, respect, suivi et conseils personnalisés', 'Jugement du client', 'Absence de bilan', 'Secret non respecté'], correctIndex: 0 },
    ],
  },
  {
    id: '7',
    title: 'Massage visage & cou anti-âge',
    instructorId: '2',
    modules: 6,
    students: 92,
    thumbnail: '/uploads/covers/massage-visage-cover.jpeg',
    description: 'Maîtrisez les protocoles de massage anti-âge du visage et du cou pour une pratique esthétique douce et efficace.',
    access: 'paid',
    priceEur: 590,
    priceMinEur: 590,
    priceMaxEur: 1500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Massage',
    status: 'published',
    contentItems: [
      { id: 'content-7-1', text: 'Massage anti-rides' },
      { id: 'content-7-2', text: 'Relaxation musculaire' },
      { id: 'content-7-3', text: 'Stimulation circulatoire' },
      { id: 'content-7-4', text: 'Techniques liftantes' },
      { id: 'content-7-5', text: 'Protocoles professionnels' },
      { id: 'content-7-6', text: 'Certificat professionnel de fin de formation' },
    ],
    moduleItems: [],
  },
  {
    id: '8',
    title: 'Massage anti-cellulite & drainage lymphatique',
    instructorId: '2',
    modules: 10,
    students: 76,
    thumbnail: '/uploads/covers/drainage-lymphatique-cover.jpeg',
    description: 'Un parcours complet pour proposer des soins de drainage, remodelage et accompagnement anti-cellulite avec certifications au choix.',
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 2500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Drainage',
    status: 'published',
    objectives: [
      "Maîtriser l'anatomie du corps humain et le fonctionnement du système lymphatique",
      "Appliquer les techniques de drainage lymphatique manuel selon la méthode Vodder",
      "Réaliser des séances complètes de drainage corps et visage (60-90 min)",
      "Identifier et traiter les différents types de cellulite avec les protocoles adaptés",
      "Prendre en charge les clientes en post-opératoire (liposuccion, BBL, abdominoplastie)",
      "Prévenir et traiter les fibroses et œdèmes post-chirurgicaux",
      "Élaborer des cures remodelantes personnalisées de 6 à 15 séances",
      "Accompagner la cliente avec un bilan esthétique et un suivi personnalisé",
      "Réaliser des protocoles de massage anti-cellulite adaptés à chaque profil",
      "Développer une pratique professionnelle autonome avec études de cas réels",
    ],
    contentItems: [
      { id: 'content-8-1', text: 'Drainage lymphatique' },
      { id: 'content-8-2', text: 'Massage remodelant' },
      { id: 'content-8-3', text: 'Techniques anti-cellulite' },
      { id: 'content-8-4', text: 'Accompagnement post-opératoire' },
      { id: 'content-8-5', text: 'Protocoles professionnels' },
      { id: 'content-8-6', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/uploads/massage-anti-cover.jpeg',
    ],
    moduleItems: [
      {
        id: 'module-8-pdf',
        title: 'Formation Complète Massage Anti-Cellulite & Drainage Lymphatique',
        pdfName: 'formation-massage-anti-complete.pdf',
        pdfDataUrl: '/uploads/formation-massage-anti-complete.pdf',
      },
    ],
    programModules: [
      {
        id: 'pm-8-1',
        title: 'Module 1 : Anatomie & Système Lymphatique',
        chapters: [
          "Anatomie du corps humain — régions corporelles, systèmes musculaire, osseux et circulatoire",
          "Le système lymphatique — structure, organes lymphoïdes, rôle immunologique et de drainage",
          "Circulation sanguine & lymphatique — échanges tissulaires, capillaires, vaisseaux collecteurs",
          "Fonction des ganglions lymphatiques — filtration de la lymphe, production de lymphocytes",
          "Indications & contre-indications — thrombose, cancer actif, infections aiguës, précautions pratiques",
        ],
      },
      {
        id: 'pm-8-2',
        title: 'Module 2 : Bases du Drainage Lymphatique',
        chapters: [
          "Origines du drainage lymphatique — Emil Vodder, années 1930, historique et développement",
          "Principes fondamentaux — douceur, rythme, direction, pression adaptée sans douleur",
          "Gestes et pressions adaptées — mouvements circulaires, pompages, glissements stationnaires",
          "Sens de circulation lymphatique — chevilles→genoux→aines ; mains→coudes→épaules→aisselles",
          "Bienfaits physiologiques — réduction œdèmes, boost immunitaire, détoxification tissulaire",
        ],
      },
      {
        id: 'pm-8-3',
        title: 'Module 3 : Techniques de Drainage Lymphatique Corps',
        chapters: [
          "Drainage des jambes — pompages chevilles, glissements mollets, cuisse jusqu'aux ganglions inguinaux",
          "Drainage du ventre — mouvements circulaires en sens horaire, ganglions abdominaux, protocole complet",
          "Drainage des bras — des mains aux poignets, coudes, épaules et ganglions axillaires",
          "Drainage du dos — techniques adaptées, colonnes vertébrales et drainage des flancs",
          "Séance complète corps — protocole 60-90 min, enchaînement des zones, conseils post-séance",
        ],
      },
      {
        id: 'pm-8-4',
        title: 'Module 4 : Drainage Lymphatique Visage',
        chapters: [
          "Anatomie du visage — structures lymphatiques, ganglions cervicaux, sous-mandibulaires et parotidiens",
          "Décongestion faciale — mouvements d'appel des ganglions, cercles autour des yeux et joues",
          "Drainage anti-poches & cernes — techniques spécifiques contour des yeux, pommettes, tempes",
          "Effet éclat & oxygénation — activation microcirculation, sérum drainant, résultats visibles",
          "Protocole complet visage — durée 30-60 min, enchaînement précis, techniques mains nues",
        ],
      },
      {
        id: 'pm-8-5',
        title: 'Module 5 : Massage Anti-Cellulite',
        chapters: [
          "Comprendre la cellulite — mécanismes physiopathologiques, facteurs hormonaux et alimentaires",
          "Types de cellulite — aqueuse, adipeuse, fibreuse et mixte : diagnostic et différenciation",
          "Techniques de palper-rouler — saisir le pli, progresser par roulements, zones cibles",
          "Massage remodelant manuel — effleurage, pétrissage, friction profonde, pression rythmée",
          "Protocoles anti-capitons — combinaison drainage + palper-rouler + modelage, fréquence recommandée",
        ],
      },
      {
        id: 'pm-8-6',
        title: 'Module 6 : Remodelage & Raffermissement Corporel',
        chapters: [
          "Remodelage de la silhouette — objectifs, zones prioritaires, outils manuels complémentaires",
          "Raffermissement des tissus — techniques de pétrissage profond, stimulation du collagène",
          "Techniques ventre plat — abdomen, flancs, taille, enchaînement drainant-remodelant",
          "Travail cuisses & fessiers — palper-rouler intensif, massages profonds, modelage des capitons",
          "Cure remodelante complète — programme 6-15 séances, suivi, résultats attendus, conseils associés",
        ],
      },
      {
        id: 'pm-8-7',
        title: 'Module 7 : Prise en Charge Post-Opératoire',
        chapters: [
          "Suites opératoires esthétiques — liposuccion, BBL, abdominoplastie : anatomie des actes chirurgicaux",
          "Gestion des œdèmes — mécanismes post-chirurgicaux, manœuvres douces de résorption lymphatique",
          "Fibroses & adhérences — identification, prévention, traitement manuel spécifique",
          "Drainage post-liposuccion — protocole démarrage J3-J7, manœuvres adaptées, contre-indications",
          "Accompagnement post-BBL & abdominoplastie — précautions, positions, étapes de la récupération",
        ],
      },
      {
        id: 'pm-8-8',
        title: 'Module 8 : Protocoles Post-Chirurgie Esthétique',
        chapters: [
          "Hygiène & sécurité — port de gants, stérilisation du matériel, protocole de protection individuelle",
          "Fréquence des séances — phase aiguë (3-5/semaine), consolidation, phase de maintenance",
          "Techniques adaptées selon chirurgie — liposuccion vs BBL vs abdominoplastie : nuances protocolaires",
          "Cicatrisation & récupération — phases inflammatoire, réparation et maturation : actions adaptées",
          "Suivi personnalisé cliente — fiche de suivi, observations visuelles, réorientation médicale si besoin",
        ],
      },
      {
        id: 'pm-8-9',
        title: 'Module 9 : Bien-Être & Accompagnement Cliente',
        chapters: [
          "Accueil cliente — posture professionnelle, mise en confiance, préparation de l'espace de soin",
          "Bilan esthétique — questionnaire préalable, objectifs, antécédents, état cutané, carte de soin",
          "Conseils alimentation & hydratation — alimentation anti-inflammatoire, hydratation, compléments",
          "Motivation & suivi — feuille de route personnalisée, photographies de suivi, encouragements",
          "Fidélisation clientèle — programme cures, suivi entre séances, recommandations et partenariats",
        ],
      },
      {
        id: 'pm-8-10',
        title: 'Module 10 : Pratique Professionnelle & Études de Cas',
        chapters: [
          "Étude de cas cellulite — analyse clinique, sélection du protocole, résultats attendus",
          "Étude de cas rétention d'eau — évaluation, drainage ciblé, conseils complémentaires",
          "Cas post-opératoire — gestion d'un cas réel, adaptation du protocole, suivi semaine par semaine",
          "Élaboration d'une cure complète — construction d'un plan de 8 à 15 séances personnalisées",
          "Examen pratique final — évaluation des compétences techniques et relationnelles en conditions réelles",
        ],
      },
    ],
    quizTitle: "Examen Final — Formation Massage Anti-Cellulite & Drainage Lymphatique",
    quizAttemptsRemaining: 2,
    quizQuestions: [
      { id: 'q8-1',  prompt: "Quel est le rôle principal du système lymphatique ?", options: ["Produire du sucre", "Éliminer certains déchets et liquides", "Renforcer les os", "Produire des hormones"], correctIndex: 1 },
      { id: 'q8-2',  prompt: "Les ganglions lymphatiques servent principalement à :", options: ["Digérer les aliments", "Filtrer la lymphe", "Produire du calcium", "Stocker le sucre"], correctIndex: 1 },
      { id: 'q8-3',  prompt: "Le drainage lymphatique manuel vise principalement à :", options: ["Contracter les muscles", "Stimuler la circulation lymphatique", "Brûler les calories", "Augmenter la tension artérielle"], correctIndex: 1 },
      { id: 'q8-4',  prompt: "Le drainage lymphatique doit être réalisé avec des gestes :", options: ["Violents", "Rapides et forts", "Doux et lents", "Irréguliers"], correctIndex: 2 },
      { id: 'q8-5',  prompt: "La cellulite correspond principalement à :", options: ["Une fracture musculaire", "Une accumulation graisseuse et liquidienne", "Une infection osseuse", "Une maladie cardiaque"], correctIndex: 1 },
      { id: 'q8-6',  prompt: "Quelle zone est fréquemment touchée par la cellulite ?", options: ["Les oreilles", "Les coudes", "Les cuisses", "Les poignets"], correctIndex: 2 },
      { id: 'q8-7',  prompt: "Le palper-rouler est utilisé pour :", options: ["Stimuler les capitons", "Nettoyer la peau", "Contracter les muscles", "Mesurer la circulation"], correctIndex: 0 },
      { id: 'q8-8',  prompt: "La cellulite aqueuse est souvent liée à :", options: ["Une fracture", "Une rétention d'eau", "Une infection", "Une brûlure"], correctIndex: 1 },
      { id: 'q8-9',  prompt: "Le remodelage corporel aide à :", options: ["Stimuler les tissus", "Casser les os", "Modifier les organes", "Supprimer les muscles"], correctIndex: 0 },
      { id: 'q8-10', prompt: "Le raffermissement corporel vise à :", options: ["Fragiliser la peau", "Tonifier les tissus", "Diminuer les muscles", "Réduire les os"], correctIndex: 1 },
      { id: 'q8-11', prompt: "Le ventre peut être concerné par :", options: ["Les ballonnements", "La rétention d'eau", "Le relâchement cutané", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-12', prompt: "Le drainage des jambes aide à :", options: ["Alourdir les tissus", "Favoriser la circulation", "Bloquer la circulation", "Fatiguer les muscles"], correctIndex: 1 },
      { id: 'q8-13', prompt: "Les mouvements du drainage lymphatique doivent suivre :", options: ["Le sens de circulation lymphatique", "Le hasard", "Les muscles uniquement", "Le rythme cardiaque"], correctIndex: 0 },
      { id: 'q8-14', prompt: "La fibrose correspond à :", options: ["Une détente musculaire", "Un durcissement des tissus", "Une brûlure", "Une allergie"], correctIndex: 1 },
      { id: 'q8-15', prompt: "Après une liposuccion, le drainage aide à :", options: ["Augmenter les œdèmes", "Réduire les gonflements", "Bloquer la circulation", "Créer des douleurs"], correctIndex: 1 },
      { id: 'q8-16', prompt: "Le BBL signifie :", options: ["Massage musculaire", "Brazilian Butt Lift", "Blocage lymphatique", "Bien-être local"], correctIndex: 1 },
      { id: 'q8-17', prompt: "L'abdominoplastie concerne principalement :", options: ["Les bras", "Le ventre", "Le visage", "Les jambes"], correctIndex: 1 },
      { id: 'q8-18', prompt: "En post-opératoire, les gestes doivent être :", options: ["Agressifs", "Violents", "Progressifs et doux", "Rapides"], correctIndex: 2 },
      { id: 'q8-19', prompt: "Une bonne hygiène professionnelle nécessite :", options: ["Un espace propre", "Du matériel désinfecté", "Une bonne hygiène des mains", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-20', prompt: "La cicatrisation comporte :", options: ["Une phase inflammatoire", "Une phase de réparation", "Une phase de maturation", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-21', prompt: "L'accueil cliente doit être :", options: ["Stressant", "Froid", "Chaleureux et professionnel", "Rapide et distant"], correctIndex: 2 },
      { id: 'q8-22', prompt: "Le bilan esthétique permet :", options: ["D'identifier les besoins", "De vendre un produit", "De remplacer un médecin", "De diagnostiquer une maladie"], correctIndex: 0 },
      { id: 'q8-23', prompt: "Une bonne hydratation aide à :", options: ["Favoriser la circulation", "Soutenir le drainage", "Améliorer la qualité de peau", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-24', prompt: "Le praticien doit respecter :", options: ["Les recommandations médicales", "Les contre-indications", "Le confort cliente", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-25', prompt: "La fidélisation clientèle repose principalement sur :", options: ["Le professionnalisme", "La qualité des soins", "L'écoute", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-26', prompt: "Les œdèmes correspondent à :", options: ["Une accumulation de liquides", "Une fracture", "Une brûlure", "Une infection osseuse"], correctIndex: 0 },
      { id: 'q8-27', prompt: "Le drainage post-opératoire doit être :", options: ["Brutal", "Très douloureux", "Doux et progressif", "Rapide et agressif"], correctIndex: 2 },
      { id: 'q8-28', prompt: "Le praticien doit éviter :", options: ["Les pressions excessives", "Les gestes agressifs", "Les zones inflammatoires", "Toutes les réponses"], correctIndex: 3 },
      { id: 'q8-29', prompt: "Le remodelage manuel agit principalement sur :", options: ["Les tissus", "Les cheveux", "Les os", "Les dents"], correctIndex: 0 },
      { id: 'q8-30', prompt: "Le drainage visage peut aider à :", options: ["Décongestionner le visage", "Réduire les poches", "Stimuler l'éclat de la peau", "Toutes les réponses"], correctIndex: 3 },
    ],
  },
  {
    id: '9',
    title: 'Soins infirmiers (pansement, perfusion, suture)',
    instructorId: '2',
    modules: 12,
    students: 38,
    thumbnail: '/Formation%20soins%20infirmiers/cover%20.jpeg',
    description: 'Renforcez vos gestes techniques autour des pansements, perfusions et sutures avec un programme structuré et certifiant.',
    presentation: 'Devenez expert des soins infirmiers techniques et pratiques : pansement, perfusion, suture, hygiène, surveillance et gestion des complications.',
    warning: 'Formation technique et professionnelle. Elle ne remplace pas une formation infirmière diplômante réglementée ni un suivi médical.',
    objectives: [
      'Maîtriser les techniques de pansement simple et complexe',
      'Installer et surveiller une perfusion en respectant l\'asepsie',
      'Réussir les sutures et les soins post-opératoires sécurisés',
      'Connaître les principes d\'hygiène, asepsie et prévention des infections',
      'Assurer la surveillance clinique et la gestion de la douleur',
      'Identifier les complications et intervenir rapidement',
      'Organiser une documentation de soins claire et professionnelle',
      'Adopter une posture d\'accompagnement patient respectueuse et efficace',
    ],
    access: 'paid',
    priceEur: 1190,
    priceMinEur: 1190,
    priceMaxEur: 4500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Soins infirmiers',
    status: 'published',
    galleryImages: [
      '/Formation%20soins%20infirmiers/im1.jpeg',
      '/Formation%20soins%20infirmiers/im2.jpeg',
      '/Formation%20soins%20infirmiers/im3.jpeg',
      '/Formation%20soins%20infirmiers/im4.jpeg',
      '/Formation%20soins%20infirmiers/im5.jpeg',
      '/Formation%20soins%20infirmiers/im6.jpeg',
      '/Formation%20soins%20infirmiers/im7.jpeg',
      '/Formation%20soins%20infirmiers/im8.jpeg',
      '/Formation%20soins%20infirmiers/im9.jpeg',
      '/Formation%20soins%20infirmiers/im10.jpeg',
      '/Formation%20soins%20infirmiers/im11.jpeg',
      '/Formation%20soins%20infirmiers/im12.jpeg',
      '/Formation%20soins%20infirmiers/im13.jpeg',
      '/Formation%20soins%20infirmiers/im14.jpeg',
      '/Formation%20soins%20infirmiers/im15.jpeg',
      '/Formation%20soins%20infirmiers/im16.jpeg',
    ],
    contentItems: [
      { id: 'content-9-1', text: 'Pansements simples et complexes' },
      { id: 'content-9-2', text: 'Techniques de suture' },
      { id: 'content-9-3', text: 'Perfusions et dispositifs intraveineux' },
      { id: 'content-9-4', text: 'Hygiène, asepsie et prévention des infections' },
      { id: 'content-9-5', text: 'Surveillance clinique et gestion de la douleur' },
      { id: 'content-9-6', text: 'Certificat professionnel de fin de formation' },
    ],
    programModules: [
      {
        id: 'si-module-1',
        title: 'Introduction aux soins infirmiers techniques',
        chapters: ['Cadre professionnel', 'Rôle et responsabilités', 'Éthique du soignant', 'Présentation du programme'],
      },
      {
        id: 'si-module-2',
        title: 'Hygiène, asepsie et sécurité',
        chapters: ['Principes d\'asepsie', 'Protection individuelle', 'Désinfection et stérilisation', 'Prévention des infections'],
      },
      {
        id: 'si-module-3',
        title: 'Pansements simples et complexes',
        chapters: ['Pansements plaies superficielles', 'Pansements exsudatifs', 'Pansements compressifs', 'Pansements difficiles'],
      },
      {
        id: 'si-module-4',
        title: 'Perfusions et matériel intraveineux',
        chapters: ['Installation de perfusion', 'Choix et pose du cathéter', 'Contrôle de débit', 'Retrait et élimination'],
      },
      {
        id: 'si-module-5',
        title: 'Sutures et soins post-opératoires',
        chapters: ['Types de sutures', 'Soins des points', 'Surveillance des plaies', 'Retrait et évaluation'],
      },
      {
        id: 'si-module-6',
        title: 'Gestion des plaies et cicatrisation',
        chapters: ['Types de plaies', 'Étapes de cicatrisation', 'Complications courantes', 'Stratégies de soin'],
      },
      {
        id: 'si-module-7',
        title: 'Surveillance et évaluation du patient',
        chapters: ['Signes vitaux', 'Observation clinique', 'Bilan infirmier', 'Communication avec l\'équipe'],
      },
      {
        id: 'si-module-8',
        title: 'Gestion de la douleur et confort',
        chapters: ['Évaluation de la douleur', 'Techniques de soulagement', 'Positionnement du patient', 'Accompagnement psychologique'],
      },
      {
        id: 'si-module-9',
        title: 'Urgences et complications',
        chapters: ['Réaction allergique', 'Infection sévère', 'Complication de perfusion', 'Réponses rapides'],
      },
      {
        id: 'si-module-10',
        title: 'Relation soignant et patient',
        chapters: ['Communication empathique', 'Consentement et respect', 'Confidentialité', 'Education thérapeutique'],
      },
      {
        id: 'si-module-11',
        title: 'Protocoles et documentation',
        chapters: ['Fiches de soins', 'Transmissions', 'Traçabilité', 'Rapports de fin de journée'],
      },
      {
        id: 'si-module-12',
        title: 'Pratique professionnelle et certification',
        chapters: ['Évaluation des compétences', 'Études de cas', 'Préparation à l\'examen', 'Certification finale'],
      },
    ],
    chapters: [
      {
        id: 'chapter-9-1',
        title: 'Pansements et soins de plaies',
        content: 'Apprenez à réaliser des pansements adaptés, prévenir les complications et maintenir un environnement de soin propre.',
      },
      {
        id: 'chapter-9-2',
        title: 'Perfusions sécurisées',
        content: 'Maîtrisez les étapes de pose, de surveillance et de retrait d\'une perfusion en respectant les règles d\'hygiène.',
      },
      {
        id: 'chapter-9-3',
        title: 'Sutures et suivi post-opératoire',
        content: 'Comprenez les techniques de suture, les soins associés et la surveillance des plaies chirurgicales.',
      },
      {
        id: 'chapter-9-4',
        title: 'Surveillance clinique',
        content: 'Développez vos compétences pour observer les signes vitaux, détecter les anomalies et transmettre les informations.',
      },
      {
        id: 'chapter-9-5',
        title: 'Accompagnement et relation patient',
        content: 'Apprenez à communiquer avec le patient, assurer son confort et respecter ses besoins tout au long du soin.',
      },
    ],
    moduleItems: [],
  },
  {
    id: '10',
    title: 'Aide à la personne âgée',
    instructorId: '2',
    modules: 9,
    students: 57,
    thumbnail: '/aide%20a%20la%20personne%20ag%C3%A9/cover%20photo.jpeg',
    description: 'Formez-vous à l\'accompagnement humain, pratique et sécurisé de la personne âgée à domicile ou en structure.',
    presentation: "Parcours complet pour accompagner la personne âgée avec respect, bienveillance et sécurité dans son environnement quotidien.",
    warning: "Programme à visée bien-être et accompagnement non médical. Il ne remplace pas un suivi infirmier ou médical spécialisé.",
    objectives: [
      "Maîtriser l'accompagnement quotidien de la personne âgée",
      "Appliquer les bonnes pratiques d'hygiène, de confort et de mobilité",
      "Prévenir les risques de chute et de déshydratation",
      "Adapter la communication aux besoins cognitifs et émotionnels",
      "Organiser un environnement sécurisé et apaisant",
      "Accompagner la personne avec dignité et attention personnalisée",
    ],
    access: 'paid',
    priceEur: 1700,
    priceMinEur: 1700,
    priceMaxEur: 3000,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Service à la personne',
    status: 'published',
    galleryImages: [
      '/aide%20a%20la%20personne%20ag%C3%A9/im1.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im2.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im3.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im4.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im5.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im6.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im7.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im8.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im9.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im10.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im11.jpeg',
      '/aide%20a%20la%20personne%20ag%C3%A9/im12.jpeg',
    ],
    contentItems: [
      { id: 'content-10-1', text: 'Assistance quotidienne aux gestes de la vie' },
      { id: 'content-10-2', text: 'Hygiène, confort et prévention de l\'inconfort' },
      { id: 'content-10-3', text: 'Prévention des chutes et des risques' },
      { id: 'content-10-4', text: 'Communication adaptée et écoute bienveillante' },
      { id: 'content-10-5', text: 'Accompagnement relationnel centré sur la personne' },
      { id: 'content-10-6', text: 'Certificat professionnel de fin de formation' },
    ],
    programModules: [
      {
        id: 'ap-module-1',
        title: 'Cadre et rôle de l\'accompagnant',
        chapters: ['Ethique et dignité', 'Déontologie', 'Sens du métier', 'Cadre légal et pratique'],
      },
      {
        id: 'ap-module-2',
        title: 'Prévention et sécurité',
        chapters: ['Risques de chute', 'Sécurisation du domicile', 'Déshydratation et alimentation', 'Gestion des urgences légères'],
      },
      {
        id: 'ap-module-3',
        title: 'Hygiène et confort',
        chapters: ['Soins de confort', 'Mobilité et positions', 'Toilette et habillage', 'Prévention des escarres'],
      },
      {
        id: 'ap-module-4',
        title: 'Communication adaptée',
        chapters: ['Écoute active', 'Soutien émotionnel', 'Communication difficile', 'Travail en équipe'],
      },
      {
        id: 'ap-module-5',
        title: 'Accompagnement nutritionnel',
        chapters: ['Alimentation de la personne âgée', 'Hydratation', 'Repas équilibrés', 'Texturation et appétence'],
      },
      {
        id: 'ap-module-6',
        title: 'Activités et stimulation',
        chapters: ['Mobilité douce', 'Stimulations cognitives', 'Gym douce', 'Loisirs adaptés'],
      },
      {
        id: 'ap-module-7',
        title: 'Accompagnement au quotidien',
        chapters: ['Routines de vie', 'Aide aux déplacements', 'Communication avec la famille', 'Organisation du planning'],
      },
      {
        id: 'ap-module-8',
        title: 'Accompagnement en structure et à domicile',
        chapters: ['Environnement sécurisé', 'Relation aux aidants', 'Coordination des soins', 'Accompagnement de fin de vie'],
      },
      {
        id: 'ap-module-9',
        title: 'Pratique professionnelle et bilan',
        chapters: ['Fiches de suivi', 'Entretien professionnel', 'Évaluation des compétences', 'Certification finale'],
      },
    ],
    chapters: [
      {
        id: 'chapter-10-1',
        title: 'Assistance quotidienne',
        content: 'Aide aux gestes de la vie courante, déplacements, alimentation et toilette pour un accompagnement personnalisé.',
      },
      {
        id: 'chapter-10-2',
        title: 'Gestion du confort',
        content: 'Confort postural, adaptation de l\'environnement et prévention de la fatigue ou des douleurs chroniques.',
      },
      {
        id: 'chapter-10-3',
        title: 'Prévention et sécurité',
        content: 'Réduire les risques de chute, surveiller l\'état général et aménager les espaces pour favoriser l\'autonomie.',
      },
      {
        id: 'chapter-10-4',
        title: 'Communication et relation',
        content: 'Adapter les échanges, préserver l\'estime de soi et maintenir le lien social pour un accompagnement humain.',
      },
      {
        id: 'chapter-10-5',
        title: 'Synthèse professionnelle',
        content: 'Formaliser des supports, établir des bilans et préparer la validation de la formation avec un certificat.',
      },
    ],
    moduleItems: [],
  },
  {
    id: '11',
    title: 'Herboristerie & phytothérapie',
    instructorId: '2',
    modules: 8,
    students: 83,
    thumbnail: '/formation%20herboristerie%20phytoth%C3%A9rapie/cover%20.jpeg',
    description: 'Développez une pratique structurée autour des plantes médicinales, des synergies naturelles et des bases de la phytothérapie appliquée.',
    presentation: "Bienvenue dans la formation Herboristerie & phytotherapie. Ce parcours vous guide pas à pas dans l'univers des plantes medicinales, des preparations naturelles et de l'accompagnement bien-etre. Vous decouvrirez les fondamentaux de la botanique, les usages traditionnels des plantes, les formes galeniques et les bonnes pratiques pour proposer un conseil professionnel et securise.",
    warning: "Cette formation est a visee educative et professionnelle. Elle ne remplace pas un avis medical, un diagnostic ni un traitement prescrit. Les plantes medicinales doivent etre utilisees avec discernement, en respectant les contre-indications, les interactions possibles et le cadre reglementaire en vigueur.",
    objectives: [
      "Comprendre les bases de l'herboristerie et de la phytotherapie",
      "Identifier les grandes familles de plantes medicinales",
      "Connaître les formes de preparation : tisane, infusion, decoction, maceration et poudre",
      "Utiliser les plantes dans une logique de bien-etre et d'accompagnement",
      "Repérer les precautions, contre-indications et interactions courantes",
      "Construire un conseil naturel professionnel et responsable",
    ],
    access: 'paid',
    priceEur: 990,
    priceMinEur: 990,
    priceMaxEur: 3500,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Phytotherapie',
    status: 'published',
    contentItems: [
      { id: 'content-11-1', text: "Fondamentaux de l'herboristerie" },
      { id: 'content-11-2', text: 'Botanique appliquee et reconnaissance des plantes' },
      { id: 'content-11-3', text: 'Plantes medicinales et usages traditionnels' },
      { id: 'content-11-4', text: 'Preparations naturelles et formes galeniques' },
      { id: 'content-11-5', text: 'Tisanes, infusions, decoctions et macerations' },
      { id: 'content-11-6', text: "Conseil bien-etre, securite et precautions d'usage" },
      { id: 'content-11-7', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/uploads/covers/herboristerie-cover.jpeg',
      '/uploads/covers/herboristerie-im1.jpeg',
      '/uploads/covers/herboristerie-im2.jpeg',
      '/uploads/covers/herboristerie-im3.jpeg',
      '/uploads/covers/herboristerie-im4.jpeg',
      '/uploads/covers/herboristerie-im5.jpeg',
      '/uploads/covers/herboristerie-im6.jpeg',
      '/uploads/covers/herboristerie-im7.jpeg',
      '/uploads/covers/herboristerie-im8.jpeg',
    ],
    moduleItems: [
      {
        id: 'module-11-pdf',
        title: 'Formation Herboristerie & phytothérapie',
        pdfName: 'Herboristerie ^0 phytothérapie.pdf',
        pdfDataUrl: '/uploads/herboristerie-complete.pdf',
      },
    ],
    chapters: [
      {
        id: 'chapter-11-1',
        title: "Introduction a l'herboristerie",
        content: "Comprendre le role de l'herboristerie dans l'accompagnement naturel, son histoire et ses principes de base.",
      },
      {
        id: 'chapter-11-2',
        title: 'Reconnaissance des plantes',
        content: 'Identifier les plantes medicinales courantes, leurs familles et leurs usages traditionnels les plus connus.',
      },
      {
        id: 'chapter-11-3',
        title: 'Preparations et dosages',
        content: "Apprendre les principales formes de preparation comme l'infusion, la decoction, la maceration et la poudre.",
      },
      {
        id: 'chapter-11-4',
        title: 'Tisanes et synergies',
        content: 'Composer des melanges coherents selon un objectif bien-etre precis, avec une logique de synergie naturelle.',
      },
      {
        id: 'chapter-11-5',
        title: 'Precautions et securite',
        content: 'Reperer les contre-indications, interactions possibles et limites du conseil non medical.',
      },
      {
        id: 'chapter-11-6',
        title: 'Conseil professionnel',
        content: 'Structurer un accompagnement clair, pedagogique et responsable pour le client ou la patiente.',
      },
      {
        id: 'chapter-11-7',
        title: "Organisation d'une pratique",
        content: 'Mettre en place une methodologie de travail, un suivi simple et une hygiene de conseil rigoureuse.',
      },
      {
        id: 'chapter-11-8',
        title: 'Synthese et certification',
        content: 'Reviser les acquis et valider la maitrise des bases pour obtenir le certificat de fin de formation.',
      },
    ],
    quizTitle: "Examen Final — Formation Professionnelle en Herboristerie & Phytothérapie",
    quizAttemptsRemaining: 2,
    quizQuestions: [
      { id: 'herb-q1',  prompt: "Quelle est la définition principale de la phytothérapie ?", options: ["Utilisation des huiles essentielles uniquement", "Utilisation des plantes médicinales pour la santé", "Utilisation des minéraux thérapeutiques", "Utilisation des médicaments chimiques"], correctIndex: 1 },
      { id: 'herb-q2',  prompt: "Une infusion est principalement utilisée pour :", options: ["Racines et écorces", "Plantes dures", "Fleurs et feuilles", "Plantes toxiques"], correctIndex: 2 },
      { id: 'herb-q3',  prompt: "Quelle partie de la plante contient souvent le plus de principes actifs concentrés ?", options: ["Racines", "Tiges", "Eau", "Air"], correctIndex: 0 },
      { id: 'herb-q4',  prompt: "Le séchage des plantes doit se faire :", options: ["Au soleil direct", "Dans un endroit humide", "À l'ombre ventilée", "Dans l'eau"], correctIndex: 2 },
      { id: 'herb-q5',  prompt: "Quelle est une plante digestive ?", options: ["Thym", "Menthe poivrée", "Lavande", "Cyprès"], correctIndex: 1 },
      { id: 'herb-q6',  prompt: "Les flavonoïdes sont principalement :", options: ["Toxiques", "Antioxydants", "Antibiotiques chimiques", "Hormones"], correctIndex: 1 },
      { id: 'herb-q7',  prompt: "Les alcaloïdes peuvent être :", options: ["Toujours sans danger", "Doux uniquement", "Puissants et parfois toxiques", "Sans effet"], correctIndex: 2 },
      { id: 'herb-q8',  prompt: "Les mucilages ont un effet :", options: ["Irritant", "Protecteur et apaisant", "Stimulant nerveux", "Diurétique puissant"], correctIndex: 1 },
      { id: 'herb-q9',  prompt: "Les huiles essentielles sont :", options: ["Peu concentrées", "Très concentrées", "Toujours alimentaires", "Sans précaution"], correctIndex: 1 },
      { id: 'herb-q10', prompt: "La synergie en phytothérapie signifie :", options: ["Opposition des plantes", "Effet neutre", "Effet combiné renforcé", "Effet toxique"], correctIndex: 2 },
      { id: 'herb-q11', prompt: "Le foie sert principalement à :", options: ["Digérer les muscles", "Filtrer et détoxifier", "Produire du sang uniquement", "Stocker les os"], correctIndex: 1 },
      { id: 'herb-q12', prompt: "Une plante carminative agit sur :", options: ["Les os", "Les gaz intestinaux", "Les yeux", "Les nerfs moteurs"], correctIndex: 1 },
      { id: 'herb-q13', prompt: "Quelle plante est digestive ?", options: ["Fenouil", "Cyprès", "Ortie", "Bouleau"], correctIndex: 0 },
      { id: 'herb-q14', prompt: "Le pissenlit agit principalement sur :", options: ["Le foie", "Le cerveau", "Les poumons", "La peau uniquement"], correctIndex: 0 },
      { id: 'herb-q15', prompt: "La rétention d'eau est liée à :", options: ["Trop de soleil", "Mauvaise élimination des liquides", "Trop de sport", "Trop de sommeil"], correctIndex: 1 },
      { id: 'herb-q16', prompt: "Le système immunitaire sert à :", options: ["Digérer les aliments", "Défendre l'organisme", "Produire des os", "Créer de l'énergie mentale"], correctIndex: 1 },
      { id: 'herb-q17', prompt: "L'échinacée est utilisée pour :", options: ["Le sommeil", "L'immunité", "La digestion", "La circulation"], correctIndex: 1 },
      { id: 'herb-q18', prompt: "Le thym est surtout :", options: ["Digestif uniquement", "Antiseptique respiratoire", "Calmante nerveuse", "Hormonal"], correctIndex: 1 },
      { id: 'herb-q19', prompt: "Le sureau est utilisé contre :", options: ["La vue", "Les infections virales", "Les fractures", "Les douleurs musculaires uniquement"], correctIndex: 1 },
      { id: 'herb-q20', prompt: "Une bonne immunité dépend aussi de :", options: ["L'alimentation", "Le hasard", "Le soleil uniquement", "Le sommeil inutile"], correctIndex: 0 },
      { id: 'herb-q21', prompt: "La valériane agit principalement sur :", options: ["La digestion", "Le système nerveux", "Le foie", "Les os"], correctIndex: 1 },
      { id: 'herb-q22', prompt: "La passiflore est utilisée pour :", options: ["Anxiété", "Circulation", "Foie", "Immunité"], correctIndex: 0 },
      { id: 'herb-q23', prompt: "Une plante adaptogène aide à :", options: ["Augmenter le stress", "Adapter le corps au stress", "Casser les os", "Réduire la digestion"], correctIndex: 1 },
      { id: 'herb-q24', prompt: "Le stress chronique provoque :", options: ["Amélioration du sommeil", "Fatigue et déséquilibre", "Croissance osseuse", "Immunité renforcée toujours"], correctIndex: 1 },
      { id: 'herb-q25', prompt: "La vigne rouge agit sur :", options: ["La digestion", "La circulation veineuse", "Le sommeil", "Les hormones"], correctIndex: 1 },
      { id: 'herb-q26', prompt: "Le marron d'Inde est utilisé pour :", options: ["Jambes lourdes", "Immunité", "Stress", "Digestion"], correctIndex: 0 },
      { id: 'herb-q27', prompt: "La bardane est utilisée pour :", options: ["Peau et acné", "Circulation", "Sommeil", "Muscles"], correctIndex: 0 },
      { id: 'herb-q28', prompt: "Le calendula est :", options: ["Cicatrisant", "Toxique", "Stimulant nerveux", "Diurétique puissant"], correctIndex: 0 },
      { id: 'herb-q29', prompt: "Une anamnèse est :", options: ["Une infusion", "Un entretien client", "Une plante", "Un médicament"], correctIndex: 1 },
      { id: 'herb-q30', prompt: "Une synergie signifie :", options: ["Opposition des plantes", "Mélange sans effet", "Association renforçant l'effet", "Danger systématique"], correctIndex: 2 },
    ],
  },
  {
    id: '12',
    title: 'Hijama / Cupping / Ventouses',
    instructorId: '2',
    modules: 10,
    students: 69,
    thumbnail: '/formation%20hijama%20complete/im1.jpeg',
    description: "Une formation professionnelle complète en 10 modules sur les techniques de ventouses sèches, mobiles et le cupping bien-être. De l'anatomie aux protocoles ciblés, avec un accent fort sur la sécurité, l'hygiène et l'accompagnement client.",
    presentation: "Bienvenue dans la Formation Complète Hijama / Cupping / Ventouses — Essenti' Elle Formation et Bien Être. Cette formation de 10 modules vous transmet une maîtrise complète et professionnelle des techniques de ventouses. De l'histoire du cupping aux protocoles ciblés, vous apprendrez à accompagner vos clients vers la relaxation, la récupération musculaire et le bien-être global, dans un cadre sécurisé et éthique.",
    warning: "Cette formation est à visée bien-être et professionnelle. Les techniques enseignées se pratiquent dans un cadre de bien-être uniquement. Elles ne remplacent pas un suivi médical et ne constituent pas un acte médical. La pratique du Hijama sanguin (ventouses humides) nécessite un cadre réglementé spécifique non couvert par cette formation.",
    objectives: [
      "Comprendre l'histoire, les origines et les principes fondamentaux du cupping et de la hijama",
      "Maîtriser l'anatomie et la physiologie appliquées aux techniques de ventouses",
      "Utiliser le matériel professionnel avec rigueur et en respectant les règles d'hygiène",
      "Réaliser les techniques de ventouses sèches statiques avec précision et sécurité",
      "Pratiquer les techniques de ventouses mobiles et le massage aux ventouses",
      "Mettre en place des protocoles ciblés : tensions dorsales, jambes lourdes, fatigue physique",
      "Identifier et gérer les contre-indications et les réactions cutanées",
      "Accueillir, analyser les besoins et accompagner les clients de manière professionnelle",
      "Construire des protocoles personnalisés et organiser une activité professionnelle",
      "Réaliser une séance complète et adapter les techniques à chaque profil client",
    ],
    contentItems: [
      { id: 'content-12-1', text: 'Histoire et principes' },
      { id: 'content-12-2', text: 'Types de ventouses' },
      { id: 'content-12-3', text: 'Protocoles de pratique' },
      { id: 'content-12-4', text: 'Hygiène et sécurité' },
      { id: 'content-12-5', text: 'Mise en situation' },
      { id: 'content-12-6', text: 'Certificat professionnel de fin de formation' },
    ],
    galleryImages: [
      '/uploads/covers/hijama-cover.jpeg',
      '/uploads/hijama-im2.jpeg',
      '/uploads/hijama-im3.jpeg',
      '/uploads/hijama-im4.jpeg',
      '/uploads/hijama-im5.jpeg',
    ],
    moduleItems: [
      {
        id: 'module-12-pdf',
        title: 'Formation Complète Hijama / Cupping / Ventouses',
        pdfName: 'formation-hijama-complete.pdf',
        pdfDataUrl: '/uploads/formation-hijama-complete.pdf',
      },
    ],
    chapters: [
      {
        id: 'ch-12-1',
        title: 'Certification France',
        content: '600 EUR — Formation complète Hijama / Cupping / Ventouses avec certification professionnelle.',
      },
      {
        id: 'ch-12-2',
        title: 'Certification France + Tunisie',
        content: '',
      },
    ],
    programModules: [
      {
        id: 'pm-12-1',
        title: 'Module 1 : Introduction au Hijama & Cupping',
        chapters: [
          "Histoire des ventouses — origines (Égypte antique, Chine, monde arabo-musulman, Europe)",
          "Origines et traditions — étymologie \"Hajm\", traditions orientales et occidentales",
          "Principes du cupping — effets physiologiques, types de ventouses (sèches, mobiles, humides)",
          "Bienfaits généraux — relaxation musculaire, gestion du stress, récupération physique",
          "Indications & limites — zones de travail, contre-indications, posture professionnelle",
        ],
      },
      {
        id: 'pm-12-2',
        title: 'Module 2 : Anatomie & Physiologie',
        chapters: [
          "Anatomie du corps humain — régions corporelles, systèmes (musculaire, osseux, circulatoire)",
          "Système musculaire — trapèzes, dorsaux, lombaires, épaules, jambes, causes des tensions",
          "Circulation sanguine — rôle du sang, composants vasculaires, stimulation locale par cupping",
          "Système lymphatique — fonctions, organes, drainage, techniques de ventouses mobiles",
          "Zones sensibles & précautions — zones à éviter, réactions attendues, adaptations professionnelles",
        ],
      },
      {
        id: 'pm-12-3',
        title: 'Module 3 : Matériel & Hygiène Professionnelle',
        chapters: [
          "Les différents types de ventouses — verre, plastique, silicone, bambou : avantages et usages",
          "Utilisation du matériel — placement, aspiration, retrait, entretien des ventouses",
          "Désinfection & hygiène — protocoles de nettoyage, protection individuelle, hygiène de l'espace",
          "Installation de l'espace de soin — aménagement professionnel, table, ambiance thérapeutique",
          "Sécurité professionnelle — questionnaire pré-séance, limites professionnelles, confidentialité",
        ],
      },
      {
        id: 'pm-12-4',
        title: 'Module 4 : Techniques de Ventouses Sèches',
        chapters: [
          "Pose des ventouses — préparation, choix de taille (grande/moyenne/petite), positionnement",
          "Aspiration manuelle & mécanique — pompes manuelles, automatiques, contrôle de pression",
          "Temps de pose — durée adaptée (jusqu'à 15 min), surveillance cutanée, facteurs de sensibilité",
          "Techniques statiques — ventouses fixes sur zone précise, dispositions : ligne, parallèle, ciblé",
          "Protocoles de base — dos & épaules, jambes lourdes, conseils post-séance",
        ],
      },
      {
        id: 'pm-12-5',
        title: 'Module 5 : Ventouses Mobiles & Massage',
        chapters: [
          "Massage aux ventouses — combinaison suction + massage, techniques dynamiques sur dos/jambes",
          "Utilisation des huiles — amande douce, coco, jojoba ; huiles essentielles (lavande, menthe)",
          "Techniques glissées — mouvements linéaires, circulaires, en zigzag ; direction musculaire",
          "Relaxation musculaire — causes des tensions, respiration associée, zones cibles, ambiance",
          "Séance complète bien-être — accueil, installation, protocole, fin de séance, conseils",
        ],
      },
      {
        id: 'pm-12-6',
        title: 'Module 6 : Cupping & Relaxation',
        chapters: [
          "Gestion du stress — effets du stress chronique, action du cupping sur trapèzes et cervicales",
          "Relaxation profonde — mécanismes, zones clés (dos, épaules, nuque, jambes), techniques",
          "Respiration & détente — rôle de la respiration, techniques respiratoires, synchronisation",
          "Ambiance thérapeutique — lumière, musique, température, posture du praticien",
          "Protocoles anti-fatigue — zones, techniques mobiles + statiques, conseils post-séance",
        ],
      },
      {
        id: 'pm-12-7',
        title: 'Module 7 : Protocoles Ciblés',
        chapters: [
          "Douleurs musculaires — causes, zones ciblées, techniques adaptées, précautions",
          "Tensions dorsales — dos haut/milieu/lombaires, organisation de séance, progression",
          "Jambes lourdes — causes, zones (mollets, cuisses), mouvements drainants, contre-indications",
          "Fatigue physique — profils clients, zones de travail, ventouses mobiles + statiques",
          "Bien-être global — approche holistique : relaxation physique, équilibre émotionnel, récupération",
        ],
      },
      {
        id: 'pm-12-8',
        title: 'Module 8 : Précautions & Contre-indications',
        chapters: [
          "Contre-indications médicales — totales, temporaires, relatives ; pathologies nécessitant avis médical",
          "Peaux sensibles — caractéristiques, adaptations (aspiration réduite, silicone, surveillance)",
          "Femmes enceintes — zones à éviter, techniques déconseillées, renvoi médical si doute",
          "Réactions cutanées — réactions normales vs préoccupantes, conduite à tenir post-séance",
          "Gestion des risques — prévention pré-séance, surveillance pendant séance, gestion malaise",
        ],
      },
      {
        id: 'pm-12-9',
        title: 'Module 9 : Accueil & Accompagnement Client',
        chapters: [
          "Accueil client — première impression, présentation professionnelle, communication rassurante",
          "Questionnaire bien-être — objectifs, informations générales, vérification des contre-indications",
          "Analyse des besoins — écoute active, personnalisation, limites professionnelles",
          "Conseils après séance — hydratation, repos, protection cutanée, réactions normales",
          "Fidélisation clientèle — qualité de service, relation de confiance, suivi personnalisé",
        ],
      },
      {
        id: 'pm-12-10',
        title: 'Module 10 : Pratique Professionnelle & Études de Cas',
        chapters: [
          "Déroulement d'une séance complète — 5 étapes : accueil, vérification, préparation, protocole, fin",
          "Études de cas pratiques — Cas 1 : tensions dorsales / Cas 2 : jambes lourdes / Cas 3 : fatigue physique",
          "Construction d'un protocole personnalisé — évaluation, choix technique, adaptation, suivi",
          "Organisation professionnelle — gestion agenda, matériel, dossiers clients, image professionnelle",
          "Examen final pratique & théorique — QCM, études de cas, évaluation pratique, certification",
        ],
      },
    ],
    quizTitle: "Examen Final — Formation Hijama & Cupping Thérapie",
    quizQuestions: [
      {
        id: "hijama-q1",
        prompt: "Le Hijama est une pratique utilisant principalement :",
        options: ["Des aiguilles", "Des ventouses", "Des pierres chaudes", "Des huiles essentielles"],
        correctIndex: 1,
      },
      {
        id: "hijama-q2",
        prompt: "Les premières traces historiques des ventouses remontent :",
        options: ["Au Moyen Âge uniquement", "À l'Antiquité", "Au XIXe siècle", "Aux années 2000"],
        correctIndex: 1,
      },
      {
        id: "hijama-q3",
        prompt: "Le mot \"Hijama\" provient :",
        options: ["Du latin", "Du grec", "De l'arabe", "Du chinois"],
        correctIndex: 2,
      },
      {
        id: "hijama-q4",
        prompt: "Dans la médecine chinoise, les ventouses sont associées :",
        options: ["Aux méridiens énergétiques", "Aux os uniquement", "À la chirurgie", "Aux vaccins"],
        correctIndex: 0,
      },
      {
        id: "hijama-q5",
        prompt: "Le principe principal du cupping est :",
        options: ["La compression", "L'aspiration", "Le chauffage musculaire", "L'électrostimulation"],
        correctIndex: 1,
      },
      {
        id: "hijama-q6",
        prompt: "Les ventouses mobiles nécessitent généralement :",
        options: ["Du talc", "Une huile de massage", "De l'eau froide", "Des bandages"],
        correctIndex: 1,
      },
      {
        id: "hijama-q7",
        prompt: "Le cupping bien-être vise principalement à :",
        options: [
          "Poser un diagnostic médical",
          "Réaliser une opération médicale",
          "Favoriser la relaxation et le confort",
          "Prescrire des médicaments",
        ],
        correctIndex: 2,
      },
      {
        id: "hijama-q8",
        prompt: "Parmi ces zones, laquelle est fréquemment travaillée en cupping ?",
        options: ["Les yeux", "Le dos", "Les dents", "Les ongles"],
        correctIndex: 1,
      },
      {
        id: "hijama-q9",
        prompt: "Quel matériel moderne est souvent utilisé aujourd'hui ?",
        options: ["Ventouses à pompe", "Marteaux médicaux", "Scalpel chirurgical", "Pinces métalliques"],
        correctIndex: 0,
      },
      {
        id: "hijama-q10",
        prompt: "Avant une séance, le praticien doit :",
        options: [
          "Ignorer les antécédents",
          "Vérifier les contre-indications",
          "Commencer immédiatement",
          "Faire un diagnostic médical",
        ],
        correctIndex: 1,
      },
      {
        id: "hijama-q11",
        prompt: "Une bonne hygiène comprend :",
        options: [
          "Le nettoyage du matériel",
          "L'utilisation de matériel sale",
          "L'absence de désinfection",
          "Le partage des huiles contaminées",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q12",
        prompt: "La désinfection permet principalement :",
        options: [
          "De décorer le matériel",
          "De réduire les risques d'infection",
          "D'augmenter la chaleur",
          "D'améliorer la couleur des ventouses",
        ],
        correctIndex: 1,
      },
      {
        id: "hijama-q13",
        prompt: "Les ventouses statiques restent :",
        options: [
          "En mouvement constant",
          "Posées sur une zone fixe",
          "Suspendues au plafond",
          "Dans l'eau chaude",
        ],
        correctIndex: 1,
      },
      {
        id: "hijama-q14",
        prompt: "Le temps de pose doit être :",
        options: [
          "Adapté au client",
          "Toujours identique",
          "Le plus long possible",
          "Supérieur à une heure",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q15",
        prompt: "Le massage aux ventouses permet :",
        options: ["La détente musculaire", "La chirurgie esthétique", "La fracture osseuse", "L'anesthésie"],
        correctIndex: 0,
      },
      {
        id: "hijama-q16",
        prompt: "Les huiles utilisées doivent être :",
        options: [
          "Propres et adaptées",
          "Périmées",
          "Mélangées à des produits chimiques",
          "Irritantes",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q17",
        prompt: "Les techniques glissées consistent à :",
        options: [
          "Déplacer les ventouses sur la peau",
          "Couper la peau",
          "Chauffer les muscles",
          "Utiliser des aiguilles",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q18",
        prompt: "La respiration profonde favorise :",
        options: ["Le stress", "La détente", "La fatigue musculaire", "L'irritation cutanée"],
        correctIndex: 1,
      },
      {
        id: "hijama-q19",
        prompt: "Une ambiance thérapeutique professionnelle doit être :",
        options: ["Stressante", "Bruyante", "Calme et propre", "Désorganisée"],
        correctIndex: 2,
      },
      {
        id: "hijama-q20",
        prompt: "Les protocoles anti-fatigue visent principalement :",
        options: [
          "La relaxation et la récupération",
          "L'épuisement physique",
          "Les interventions chirurgicales",
          "L'hospitalisation",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q21",
        prompt: "Les jambes lourdes peuvent être soulagées par :",
        options: ["Les ventouses mobiles", "Les brûlures", "Les produits agressifs", "Les objets tranchants"],
        correctIndex: 0,
      },
      {
        id: "hijama-q22",
        prompt: "Le praticien bien-être ne doit jamais :",
        options: [
          "Respecter l'hygiène",
          "Poser un diagnostic médical",
          "Informer le client",
          "Nettoyer son matériel",
        ],
        correctIndex: 1,
      },
      {
        id: "hijama-q23",
        prompt: "Le cupping est contre-indiqué en cas de :",
        options: ["Plaies ouvertes", "Bonne récupération", "Détente musculaire", "Fatigue légère"],
        correctIndex: 0,
      },
      {
        id: "hijama-q24",
        prompt: "Chez les femmes enceintes, le praticien doit :",
        options: [
          "Utiliser des techniques agressives",
          "Être particulièrement prudent",
          "Travailler l'abdomen fortement",
          "Ignorer les précautions",
        ],
        correctIndex: 1,
      },
      {
        id: "hijama-q25",
        prompt: "Les marques après une séance sont souvent :",
        options: [
          "Normales et temporaires",
          "Définitives",
          "Dangereuses dans tous les cas",
          "Obligatoirement douloureuses",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q26",
        prompt: "Le questionnaire bien-être sert à :",
        options: [
          "Mieux connaître les besoins du client",
          "Prescrire des médicaments",
          "Établir un diagnostic médical",
          "Éviter la communication",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q27",
        prompt: "Après une séance, il est conseillé :",
        options: [
          "De boire de l'eau",
          "De faire un effort intense immédiatement",
          "D'exposer la peau au soleil",
          "D'ignorer les réactions cutanées",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q28",
        prompt: "La fidélisation clientèle repose notamment sur :",
        options: ["Le professionnalisme", "Le désordre", "Le manque d'écoute", "Le matériel sale"],
        correctIndex: 0,
      },
      {
        id: "hijama-q29",
        prompt: "Un protocole personnalisé doit être adapté :",
        options: [
          "Aux besoins du client",
          "Au hasard",
          "À tous les clients identiquement",
          "Aux préférences du praticien uniquement",
        ],
        correctIndex: 0,
      },
      {
        id: "hijama-q30",
        prompt: "L'examen final pratique évalue :",
        options: [
          "La maîtrise des techniques et l'hygiène",
          "La capacité chirurgicale",
          "La prescription médicale",
          "Les traitements hospitaliers",
        ],
        correctIndex: 0,
      },
    ],
    access: 'paid',
    priceEur: 600,
    priceMinEur: 600,
    priceMaxEur: 2000,
    pricingCurrency: 'EUR',
    certificateOptions: [1, 2, 3, 4, 5],
    promoEnabled: false,
    category: 'Ventouses',
    status: 'published',
  },
);

const formulas: TrainingFormula[] = [
  {
    id: 'formula-1',
    title: 'Formule 1 - Formation en ligne France',
    description: "Formation en ligne avec certification française, accessible à distance depuis n'importe quel pays.",
    image: 'module-nutrition-pathologie.svg',
    highlights: [
      'Accès complet à la formation en ligne',
      'Supports pédagogiques inclus',
      'Certificat de formation délivré par notre centre en France',
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
    title: 'Formule 2 - Formation + Djerba',
    description: 'Formation en ligne avec immersion internationale a Djerba, voyage compris, stages en entreprise et doubles certificats.',
    image: 'module-detox-poids.svg',
    highlights: [
      'Formation en ligne complète',
      'Certificat français et certificat tunisien',
      'Voyage, hébergement et stages en entreprise a Djerba',
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
    title: 'Option Voyage & Immersion Professionnelle',
    description: 'Accessible aux apprenants inscrits à une formation et aux personnes externes. Comprend 5 demi-journées de pratique, les activités du séjour et un certificat remis en main propre pour l\'option seule.',
    image: 'module-emonctoires.svg',
    highlights: [
      '5 demi-journées de pratique',
      'Accessible avec ou sans formation',
      'Certificat remis en main propre pour les participants externes',
    ],
    instructorId: '2',
    priceEur: 1190,
    priceTnd: 3990,
    priceUsd: 1290,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'published',
  },
  {
    id: 'formula-4',
    title: 'Ancienne formule',
    description: 'Formule retirée du catalogue public.',
    image: 'module-detox-peau.svg',
    highlights: [
      'Brouillon',
    ],
    instructorId: '2',
    priceEur: 3750,
    priceTnd: 12634,
    priceUsd: 4050,
    pricingCurrency: 'EUR',
    promoEnabled: false,
    status: 'draft',
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
      courseQuizData?: Record<string, { quizTitle?: string; quizQuestions?: Array<{id: string; prompt: string; options: string[]; correctIndex: number}> }>;
      courseChapters?: Record<string, Array<{id: string; title: string; content: string}>>;
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
    // Restore persisted course quiz data (only apply if non-empty, so seed wins when not customized)
    for (const [courseId, data] of Object.entries(saved.courseQuizData ?? {})) {
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        if (data.quizTitle) course.quizTitle = data.quizTitle;
        if (data.quizQuestions && data.quizQuestions.length > 0) course.quizQuestions = data.quizQuestions;
      }
    }
    // Restore persisted course chapters
    for (const [courseId, chapters] of Object.entries(saved.courseChapters ?? {})) {
      const course = courses.find((c) => c.id === courseId);
      if (course && chapters.length > 0) course.chapters = chapters;
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
      const courseQuizData: Record<string, { quizTitle?: string; quizQuestions?: any[] }> = {};
      const courseChapters: Record<string, any[]> = {};
      for (const course of courses) {
        if ((course.quizQuestions && course.quizQuestions.length > 0) || course.quizTitle) {
          courseQuizData[course.id] = { quizTitle: course.quizTitle, quizQuestions: course.quizQuestions };
        }
        if (course.chapters && course.chapters.length > 0) {
          courseChapters[course.id] = course.chapters;
        }
      }
      writeFileSync(STORE_FILE, JSON.stringify({
        savedAt: new Date().toISOString(),
        users: memoryUsers,
        workspaces: Object.fromEntries(studentWorkspaces),
        attempts: Object.fromEntries(studentAttempts),
        requests: publicEnrollmentRequests,
        dynamicExams: exams.filter((e) => !SEED_EXAM_IDS.has(e.id)),
        deletedExamIds: Array.from(deletedExamIds),
        courseQuizData,
        courseChapters,
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

// ── Quiz Seed Backup — snapshot captured BEFORE any runtime modifications ─────
// This guarantees quiz questions survive instructor saves that send empty arrays.
const QUIZ_SEED_BACKUP: Map<string, { quizTitle: string; quizQuestions: NonNullable<Course['quizQuestions']> }> = new Map(
  courses
    .filter((c) => c.quizQuestions && c.quizQuestions.length > 0)
    .map((c) => [c.id, { quizTitle: c.quizTitle ?? '', quizQuestions: c.quizQuestions! }])
);

function restoreQuizFromSeed(): void {
  let restored = 0;
  for (const course of courses) {
    if (!course.quizQuestions?.length) {
      const backup = QUIZ_SEED_BACKUP.get(course.id);
      if (backup) {
        course.quizTitle = course.quizTitle || backup.quizTitle;
        course.quizQuestions = backup.quizQuestions;
        restored++;
      }
    }
  }
  if (restored > 0) console.log(`[SEED] Restored quiz questions for ${restored} course(s) from seed backup`);
}

bootstrapRoleData();
loadPersistedData();
restoreQuizFromSeed(); // Always restore from seed if in-memory questions are missing

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
  const from = process.env['SMTP_FROM']?.trim() || `Essenti'Elle Formation & Bien-Être <${user}>`;
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

function createMailerTransport(config: MailerConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function buildMailHeaders(): Record<string, string> {
  return {
    'X-Mailer': "Essenti'Elle Formation & Bien-Être",
    'X-Priority': '3',
    Importance: 'Normal',
    'X-Entity-Ref-ID': `essentielle-${Date.now()}`,
  };
}

function buildMailSignature(): string {
  return "L'équipe Essenti'Elle Formation & Bien-Être";
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
  const transporter = createMailerTransport(config);
  const signature = buildMailSignature();

  await transporter.sendMail({
    from: config.from,
    to: user.email,
    replyTo: config.replyTo,
    headers: buildMailHeaders(),
    subject: "Inscription reussie - Essenti' Elle Formation et Bien Être",
    text: [
      `Bonjour ${user.name},`,
      '',
      "Votre inscription sur Essenti' Elle Formation et Bien Être a bien ete enregistree.",
      `Votre e-mail de connexion : ${user.email}`,
      `Votre identifiant : ${user.username}`,
      `Acces a la connexion : ${loginUrl}`,
      '',
      signature,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526;max-width:640px;margin:0 auto">
        <p>Bonjour ${user.name},</p>
        <p>Votre inscription sur <strong>Essenti' Elle Formation et Bien Être</strong> a bien ete enregistree.</p>
        <p><strong>E-mail de connexion :</strong> ${user.email}<br>
        <strong>Identifiant :</strong> ${user.username}</p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:12px 18px;background:#1F2A24;color:#fff;text-decoration:none;border-radius:12px;">Se connecter</a></p>
        <p>${signature}</p>
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

  const transporter = createMailerTransport(config);
  const signature = buildMailSignature();

  const formulaLine = request.formulaTitle ? `Formule choisie : ${request.formulaTitle}` : '';
  const certificateLine = request.certificateCount ? `Nombre de certificats : ${request.certificateCount}` : '';
  const detailsBlock = [formulaLine, certificateLine].filter(Boolean).join('\n');
  const htmlDetails = [formulaLine, certificateLine].filter(Boolean).map((line) => `<li>${line}</li>`).join('');

  await transporter.sendMail({
    from: config.from,
    to: student.email,
    replyTo: config.replyTo,
    headers: buildMailHeaders(),
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
      signature,
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526;max-width:640px;margin:0 auto">
        <p>Bonjour ${student.name},</p>
        <p>Votre demande d'inscription a ete validee pour la formation <strong>${course.title}</strong>.</p>
        <p>Votre acces personnel a cette formation est maintenant ouvert dans votre espace etudiante sur la plateforme Essenti' Elle Formation et Bien Être.</p>
        <p>Une fois activee, la formation reste disponible pour votre suivi pedagogique, y compris apres vos evaluations.</p>
        ${htmlDetails ? `<ul>${htmlDetails}</ul>` : ''}
        <p>Connectez-vous avec votre adresse e-mail pour acceder a votre formation.</p>
        <p>Bien cordialement,<br>${signature}</p>
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
  const transporter = createMailerTransport(config);
  const signature = buildMailSignature();

  const info = await transporter.sendMail({
    from: config.from,
    to: user.email,
    replyTo: config.replyTo,
    headers: buildMailHeaders(),
    subject: 'Reinitialisation de votre mot de passe',
    text: [
      `Bonjour ${user.name},`,
      '',
      'Vous avez demande la reinitialisation de votre mot de passe.',
      `Cliquez sur ce lien pour definir un nouveau mot de passe : ${resetUrl}`,
      '',
      'Ce lien est valable pendant 1 heure.',
      '',
      signature,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173526;max-width:640px;margin:0 auto">
        <p>Bonjour ${user.name},</p>
        <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#1F2A24;color:#fff;text-decoration:none;border-radius:12px;">Definir un nouveau mot de passe</a></p>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>${signature}</p>
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

  await insertSeedUser(pool, 'Admin User', 'admin@lessentielle-bienetre.site', 'admin', 'password123');
  await insertSeedUser(pool, 'Dr. Expert', 'instructor@lessentielle-bienetre.site', 'instructor', 'password123');
  await insertSeedUser(pool, 'Jane Doe', 'student@lessentielle-bienetre.site', 'student', 'password123');

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

  // course_quiz_config — persists quiz questions per course in MySQL
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_quiz_config (
      course_id VARCHAR(64) NOT NULL PRIMARY KEY,
      quiz_title VARCHAR(200),
      questions_json MEDIUMTEXT NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // student_enrollments — persists student course enrollments + progress in MySQL
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_enrollments (
      student_id VARCHAR(36) NOT NULL,
      course_id  VARCHAR(20) NOT NULL,
      progress   DECIMAL(5,2) NOT NULL DEFAULT 0,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // courses — persists all course metadata + content so edits/deletions survive deployments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id                    VARCHAR(20)  NOT NULL PRIMARY KEY,
      title                 VARCHAR(255) NOT NULL,
      instructor_id         VARCHAR(36)  NOT NULL,
      modules_count         INT          NOT NULL DEFAULT 0,
      students              INT          NOT NULL DEFAULT 0,
      thumbnail             VARCHAR(500),
      description           TEXT,
      access                VARCHAR(20)  NOT NULL DEFAULT 'paid',
      price_eur             DECIMAL(10,2) NOT NULL DEFAULT 0,
      price_tnd             DECIMAL(10,2),
      price_usd             DECIMAL(10,2),
      price_min_eur         DECIMAL(10,2),
      price_max_eur         DECIMAL(10,2),
      pricing_currency      VARCHAR(10)  DEFAULT 'EUR',
      promo_enabled         TINYINT(1)   NOT NULL DEFAULT 0,
      promo_price_eur       DECIMAL(10,2),
      promo_price_tnd       DECIMAL(10,2),
      promo_price_usd       DECIMAL(10,2),
      certificate_options   MEDIUMTEXT,
      category              VARCHAR(100),
      status                VARCHAR(20)  NOT NULL DEFAULT 'published',
      presentation          TEXT,
      warning               TEXT,
      objectives            MEDIUMTEXT,
      content_items         MEDIUMTEXT,
      chapters              MEDIUMTEXT,
      program_modules       MEDIUMTEXT,
      gallery_images        MEDIUMTEXT,
      module_items          MEDIUMTEXT,
      quiz_title            VARCHAR(255),
      quiz_attempts_remaining INT DEFAULT 2,
      deleted               TINYINT(1)   NOT NULL DEFAULT 0,
      updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Sync all MySQL users into memoryUsers so getStoredUserById works for any registered user
  await loadUsersFromDb(pool);
  // Load enrollments from MySQL (fills gaps when JSON backup is missing or stale)
  await loadEnrollmentsFromDb(pool);
  // Push all in-memory enrollments (from JSON backup) to MySQL for forward persistence
  await syncEnrollmentsToDb(pool);
  const seedCoursesToRestore = ['1', '2', '6', '9', '10'];
  const seedCoursesBackup = new Map<string, Pick<Course, 'thumbnail' | 'galleryImages'>>();
  for (const courseId of seedCoursesToRestore) {
    const seedCourse = courses.find((c) => c.id === courseId);
    if (seedCourse) {
      seedCoursesBackup.set(courseId, {
        thumbnail: seedCourse.thumbnail,
        galleryImages: seedCourse.galleryImages,
      });
    }
  }

  // Apply any course edits/deletions stored in DB on top of the seed courses array
  await loadCoursesFromDb(pool);
  for (const [courseId, seedImageData] of seedCoursesBackup.entries()) {
    const existing = courses.find((c) => c.id === courseId);
    if (existing) {
      existing.thumbnail = seedImageData.thumbnail ?? existing.thumbnail;
      existing.galleryImages = seedImageData.galleryImages ?? existing.galleryImages;
      await saveCourseToDb(pool, existing);
    }
  }
  // Backup everything to JSON so next boot works even without MySQL
  savePersistedData();

  // Load exam + attempt data from DB into in-memory maps
  await loadExamsFromDb(pool);
  await loadAttemptsFromDb(pool);
  await loadCourseQuizAttemptsFromDb(pool);

  // Fix exam-detox-final: correct course_id (13→2) and exam_type (final→quiz)
  await pool.query(
    `UPDATE exams SET course_id = '2', exam_type = 'quiz'
     WHERE id = 'exam-detox-final' AND (course_id != '2' OR exam_type != 'quiz')`
  ).catch(() => {});

  // If course_quiz_config for course '2' is empty, migrate from exam_questions table
  try {
    const [cfgRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT questions_json FROM course_quiz_config WHERE course_id = '2' LIMIT 1"
    );
    const existingQs = cfgRows.length ? JSON.parse(String(cfgRows[0]['questions_json'] ?? '[]')) : [];
    if (!existingQs.length) {
      const [qRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id, prompt, option_a, option_b, option_c, option_d, correct_index
         FROM exam_questions WHERE exam_id = 'exam-detox-final' ORDER BY sort_index`
      );
      if (qRows.length > 0) {
        const migrated = qRows.map((q) => ({
          id: String(q['id']),
          prompt: String(q['prompt']),
          options: [q['option_a'], q['option_b'], q['option_c'], q['option_d']].filter(Boolean).map(String),
          correctIndex: Number(q['correct_index']),
        }));
        await pool.query(
          `INSERT INTO course_quiz_config (course_id, quiz_title, questions_json)
           VALUES ('2', 'Examen Final — Détox Thérapeutique Complète (Modules 1 à 10)', ?)
           ON DUPLICATE KEY UPDATE quiz_title = VALUES(quiz_title), questions_json = VALUES(questions_json)`,
          [JSON.stringify(migrated)]
        );
        console.log(`[DB] Migrated ${migrated.length} detox questions from exam_questions → course_quiz_config`);
      }
    }
  } catch (err) {
    console.warn('[DB] Could not migrate exam_questions to course_quiz_config:', err);
  }

  // Load persisted course quiz questions from MySQL (overrides seed if DB has data)
  await loadCourseQuizConfigFromDb(pool);

  // Always restore from seed backup if course has no questions after DB load
  restoreQuizFromSeed();

  // Seed any course with quizQuestions into MySQL for persistence
  await saveCourseQuizConfigToDb(pool);

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

// Load all enrollments from MySQL into studentWorkspaces (fills gaps not covered by JSON backup)
async function loadEnrollmentsFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT student_id, course_id, progress FROM student_enrollments'
    );
    let loaded = 0;
    for (const row of rows) {
      const sid = String(row['student_id']);
      const cid = String(row['course_id']);
      const prog = Number(row['progress']) || 0;
      const ws = studentWorkspaces.get(sid) ?? { enrollments: [], certificates: [], profile: { phone: '', city: '', country: '', objective: '' } };
      const existing = ws.enrollments.find((e) => e.courseId === cid);
      if (existing) {
        // Keep the higher progress value between JSON and DB
        existing.progress = Math.max(existing.progress, prog);
      } else {
        ws.enrollments.push({ courseId: cid, progress: prog });
        loaded++;
      }
      studentWorkspaces.set(sid, ws);
    }
    console.log(`[DB] Loaded ${loaded} new enrollment(s) from MySQL (total rows: ${rows.length})`);
  } catch (err) {
    console.warn('[DB] Could not load enrollments from MySQL:', err);
  }
}

// Push all in-memory enrollments to MySQL (run once at startup to migrate JSON → DB)
async function syncEnrollmentsToDb(pool: Pool): Promise<void> {
  try {
    let synced = 0;
    for (const [studentId, ws] of studentWorkspaces) {
      for (const enrollment of ws.enrollments) {
        await pool.execute(
          `INSERT INTO student_enrollments (student_id, course_id, progress)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE progress = GREATEST(progress, VALUES(progress)), updated_at = CURRENT_TIMESTAMP`,
          [studentId, enrollment.courseId, enrollment.progress]
        );
        synced++;
      }
    }
    console.log(`[DB] Synced ${synced} enrollment(s) to MySQL`);
  } catch (err) {
    console.warn('[DB] Could not sync enrollments to MySQL:', err);
  }
}

// Persist a single enrollment/progress update to MySQL (fire-and-forget)
function saveEnrollmentToDb(studentId: string, courseId: string, progress: number): void {
  if (!dbPool) return;
  dbPool.execute(
    `INSERT INTO student_enrollments (student_id, course_id, progress)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE progress = GREATEST(progress, VALUES(progress)), updated_at = CURRENT_TIMESTAMP`,
    [studentId, courseId, progress]
  ).catch((err) => console.error('[DB] Failed to save enrollment:', err));
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

async function loadCourseQuizConfigFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT course_id, quiz_title, questions_json FROM course_quiz_config'
    );
    let loaded = 0;
    for (const row of rows) {
      const course = courses.find((c) => c.id === String(row['course_id']));
      if (!course) continue;
      let questions: any[] = [];
      try { questions = JSON.parse(String(row['questions_json'] ?? '[]')); } catch { questions = []; }
      if (questions.length > 0) {
        course.quizQuestions = questions;
        if (row['quiz_title']) course.quizTitle = String(row['quiz_title']);
        loaded++;
      }
    }
    console.log(`[DB] Loaded course quiz config for ${loaded} course(s) from MySQL`);
  } catch (err) {
    console.warn('[DB] Could not load course_quiz_config from MySQL:', err);
  }
}

async function saveCourseQuizConfigToDb(pool: Pool): Promise<void> {
  for (const course of courses) {
    try {
      if (!course.quizQuestions?.length) {
        await pool.query('DELETE FROM course_quiz_config WHERE course_id = ?', [course.id]);
        continue;
      }
      await pool.query(
        `INSERT INTO course_quiz_config (course_id, quiz_title, questions_json)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           quiz_title = VALUES(quiz_title),
           questions_json = VALUES(questions_json)`,
        [course.id, course.quizTitle ?? null, JSON.stringify(course.quizQuestions)]
      );
    } catch (err) {
      console.warn(`[DB] Could not save quiz config for course ${course.id}:`, err);
    }
  }
  console.log('[DB] Course quiz config saved to MySQL');
}

// ─── Course persistence helpers ───────────────────────────────────────────────

function safeJsonParse<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === 'object') return val as T;
  try { return JSON.parse(String(val)) as T; } catch { return fallback; }
}

async function saveCourseToDb(pool: Pool, course: Course): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO courses (
         id, title, instructor_id, modules_count, students, thumbnail, description,
         access, price_eur, price_tnd, price_usd, price_min_eur, price_max_eur,
         pricing_currency, promo_enabled, promo_price_eur, promo_price_tnd, promo_price_usd,
         certificate_options, category, status, presentation, warning,
         objectives, content_items, chapters, program_modules, gallery_images,
         module_items, quiz_title, quiz_attempts_remaining, deleted
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), instructor_id=VALUES(instructor_id),
         modules_count=VALUES(modules_count), students=VALUES(students),
         thumbnail=VALUES(thumbnail), description=VALUES(description),
         access=VALUES(access), price_eur=VALUES(price_eur),
         price_tnd=VALUES(price_tnd), price_usd=VALUES(price_usd),
         price_min_eur=VALUES(price_min_eur), price_max_eur=VALUES(price_max_eur),
         pricing_currency=VALUES(pricing_currency), promo_enabled=VALUES(promo_enabled),
         promo_price_eur=VALUES(promo_price_eur), promo_price_tnd=VALUES(promo_price_tnd),
         promo_price_usd=VALUES(promo_price_usd), certificate_options=VALUES(certificate_options),
         category=VALUES(category), status=VALUES(status),
         presentation=VALUES(presentation), warning=VALUES(warning),
         objectives=VALUES(objectives), content_items=VALUES(content_items),
         chapters=VALUES(chapters), program_modules=VALUES(program_modules),
         gallery_images=VALUES(gallery_images), module_items=VALUES(module_items),
         quiz_title=VALUES(quiz_title), quiz_attempts_remaining=VALUES(quiz_attempts_remaining),
         deleted=0`,
      [
        course.id, course.title, course.instructorId, course.modules, course.students,
        course.thumbnail ?? null, course.description ?? null, course.access,
        course.priceEur, course.priceTnd ?? null, course.priceUsd ?? null,
        course.priceMinEur ?? null, course.priceMaxEur ?? null,
        course.pricingCurrency ?? 'EUR',
        course.promoEnabled ? 1 : 0,
        course.promoPriceEur ?? null, course.promoPriceTnd ?? null, course.promoPriceUsd ?? null,
        JSON.stringify(course.certificateOptions ?? []),
        course.category ?? null, course.status,
        course.presentation ?? null, course.warning ?? null,
        JSON.stringify(course.objectives ?? []),
        JSON.stringify(course.contentItems ?? []),
        JSON.stringify(course.chapters ?? []),
        JSON.stringify(course.programModules ?? []),
        JSON.stringify(course.galleryImages ?? []),
        JSON.stringify(course.moduleItems ?? []),
        course.quizTitle ?? null,
        course.quizAttemptsRemaining ?? 2,
      ]
    );
  } catch (err) {
    console.error(`[DB] Failed to save course ${course.id}:`, err);
  }
}

function saveCourseToDbAsync(course: Course): void {
  if (!dbPool) return;
  saveCourseToDb(dbPool, course).catch((e) => console.error('[DB] saveCourseToDbAsync error:', e));
}

function deleteCourseFromDb(courseId: string): void {
  if (!dbPool) return;
  dbPool.execute('UPDATE courses SET deleted = 1 WHERE id = ?', [courseId])
    .catch((e) => console.error('[DB] Failed to mark course deleted:', courseId, e));
}

async function loadCoursesFromDb(pool: Pool): Promise<void> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM courses ORDER BY created_at ASC'
    );
    let updated = 0;
    let added = 0;
    let removed = 0;
    for (const row of rows) {
      const cid = String(row['id']);
      if (row['deleted']) {
        const idx = courses.findIndex((c) => c.id === cid);
        if (idx !== -1) { courses.splice(idx, 1); removed++; }
        continue;
      }
      const fromDb: Course = {
        id:             cid,
        title:          String(row['title']          ?? ''),
        instructorId:   String(row['instructor_id']   ?? ''),
        modules:        Number(row['modules_count']   ?? 0),
        students:       Number(row['students']        ?? 0),
        thumbnail:      String(row['thumbnail']       ?? ''),
        description:    String(row['description']     ?? ''),
        access:         (row['access'] as CourseAccess) ?? 'paid',
        priceEur:       Number(row['price_eur']       ?? 0),
        priceTnd:       row['price_tnd']    != null ? Number(row['price_tnd'])    : undefined,
        priceUsd:       row['price_usd']    != null ? Number(row['price_usd'])    : undefined,
        priceMinEur:    row['price_min_eur'] != null ? Number(row['price_min_eur']) : undefined,
        priceMaxEur:    row['price_max_eur'] != null ? Number(row['price_max_eur']) : undefined,
        pricingCurrency: (row['pricing_currency'] as 'EUR' | 'TND' | 'USD') ?? 'EUR',
        promoEnabled:   Boolean(row['promo_enabled']),
        promoPriceEur:  row['promo_price_eur']  != null ? Number(row['promo_price_eur'])  : undefined,
        promoPriceTnd:  row['promo_price_tnd']  != null ? Number(row['promo_price_tnd'])  : undefined,
        promoPriceUsd:  row['promo_price_usd']  != null ? Number(row['promo_price_usd'])  : undefined,
        certificateOptions: safeJsonParse<number[]>(row['certificate_options'], []),
        category:       String(row['category']   ?? ''),
        status:         (row['status'] as CourseStatus) ?? 'published',
        presentation:   row['presentation'] != null ? String(row['presentation']) : undefined,
        warning:        row['warning']      != null ? String(row['warning'])      : undefined,
        objectives:     safeJsonParse<string[]>(row['objectives'], []) || undefined,
        contentItems:   safeJsonParse<Course['contentItems']>(row['content_items'], []) || undefined,
        chapters:       safeJsonParse<Course['chapters']>(row['chapters'], []) || undefined,
        programModules: safeJsonParse<Course['programModules']>(row['program_modules'], []) || undefined,
        galleryImages:  safeJsonParse<string[]>(row['gallery_images'], []) || undefined,
        moduleItems:    safeJsonParse<Course['moduleItems']>(row['module_items'], []) ?? [],
        quizTitle:      row['quiz_title'] != null ? String(row['quiz_title']) : undefined,
        quizAttemptsRemaining: Number(row['quiz_attempts_remaining'] ?? 2),
      };
      const existing = courses.find((c) => c.id === cid);
      if (existing) {
        Object.assign(existing, fromDb);
        updated++;
      } else {
        courses.unshift(fromDb);
        added++;
      }
    }
    console.log(`[DB] Courses: ${updated} updated, ${added} added, ${removed} removed`);
  } catch (err) {
    console.warn('[DB] Could not load courses from MySQL:', err);
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
          saveEnrollmentToDb(user.id, course.id, 0);
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
  // Persist new workspace free-course enrollments to MySQL
  for (const e of freeCourseEnrollments) {
    saveEnrollmentToDb(user.id, e.courseId, 0);
  }
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
    normalizedEmail === 'instructor@lessentielle-bienetre.site' ||
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
    saveEnrollmentToDb(user.id, course.id, 0);
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
    const quizQuestions = parseQuizQuestions(req.body?.quizQuestions);
    const quizTitle = typeof req.body?.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) : '';
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
      quizTitle: typeof req.body?.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) || undefined : undefined,
      quizQuestions,
    };
    courses.unshift(course);
    savePersistedData();
    saveCourseToDbAsync(course);
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

    savePersistedData();
    saveCourseToDbAsync(course);
    getDbPool().then((pool) => { if (pool) saveCourseQuizConfigToDb(pool).catch(() => {}); });
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
  const removedCourse = courses.splice(index, 1)[0];
  deleteCourseFromDb(removedCourse.id);
  savePersistedData();
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
    const quizQuestions = parseQuizQuestions(req.body?.quizQuestions);
    const quizTitle = typeof req.body?.quizTitle === 'string' ? req.body.quizTitle.trim().slice(0, 200) : '';
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
      quizTitle: quizTitle || undefined,
      quizQuestions,
    };
    courses.unshift(course);
    savePersistedData();
    saveCourseToDbAsync(course);
    getDbPool().then((pool) => { if (pool) saveCourseQuizConfigToDb(pool).catch(() => {}); });
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

    savePersistedData();
    saveCourseToDbAsync(course);
    getDbPool().then((pool) => { if (pool) saveCourseQuizConfigToDb(pool).catch(() => {}); });
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
    deleteCourseFromDb(deleted.id);
    savePersistedData();
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
    saveEnrollmentToDb(student.id, course.id, 0);
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
