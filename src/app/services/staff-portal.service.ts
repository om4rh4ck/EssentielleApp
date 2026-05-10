import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ManagedCourse {
  id: string;
  title: string;
  description: string;
  modules: number;
  students: number;
  thumbnail: string;
  access: 'free' | 'paid';
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  category: string;
  status: 'published' | 'draft';
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

export interface ManagedFormula {
  id: string;
  title: string;
  description: string;
  image: string;
  highlights?: string[];
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  status: 'published' | 'draft';
}

export interface InstructorOverview {
  totalStudents: number;
  activeCourses: number;
  averageRating: number;
  courses: ManagedCourse[];
  latestMessages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  senderId?: string;
  studentId: string;
  studentName: string;
  senderRole: 'student' | 'instructor' | 'admin';
  senderName: string;
  recipientId?: string;
  recipientRole: 'student' | 'instructor' | 'admin';
  recipientName: string;
  subject: string;
  content: string;
  sentAt: string;
}

export interface MessageContact {
  id: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  email: string;
}

export interface InstructorStudent {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  enrolledCourses: string[];
  averageScore: number;
}

export interface LiveSession {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  scheduledAt: string;
  meetLink: string;
  notes: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  type: 'pdf' | 'video' | 'audio' | 'link';
  url: string;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  day: string;
  startTime: string;
  endTime: string;
  format: 'online' | 'onsite' | 'hybrid';
  room: string;
  notes: string;
}

export interface ExamQuestionPayload {
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
}

export interface ManagedExam {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  assignedBy: string;
  averageScore: number;
  submissions: number;
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    points: number;
  }>;
}

export interface AdminOverview {
  totalUsers: number;
  activeCourses: number;
  totalRevenue: number;
  revenueData: Array<{ month: string; amount: number }>;
  pendingApprovals: Array<{ id: string; name: string; type: string }>;
}

export interface AdminStatsData {
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
  revenueData: Array<{ month: string; amount: number }>;
  topCourses: Array<{
    id: string;
    title: string;
    access: 'free' | 'paid';
    status: 'published' | 'draft';
    enrollments: number;
    revenue: number;
    priceEur: number;
  }>;
  recentPayments: Array<PaymentRecord & { courseTitle: string }>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  city: string;
  country: string;
  courses: number;
}

export interface PaymentRecord {
  id: string;
  studentName: string;
  courseTitle?: string;
  amountEur: number;
  status: 'paid' | 'pending';
  paidAt: string;
}

export interface RoleProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  bio: string;
}

@Injectable({
  providedIn: 'root'
})
export class StaffPortalService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private authHeaders(): { headers: HttpHeaders } {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  getInstructorOverview(): Observable<InstructorOverview> {
    return this.http.get<InstructorOverview>('/api/instructor/overview', this.authHeaders());
  }

  getInstructorCourses(): Observable<ManagedCourse[]> {
    return this.http.get<ManagedCourse[]>('/api/instructor/courses', this.authHeaders());
  }

  getInstructorFormulas(): Observable<ManagedFormula[]> {
    return this.http.get<ManagedFormula[]>('/api/instructor/formulas', this.authHeaders());
  }

  createInstructorCourse(payload: Partial<ManagedCourse>): Observable<ManagedCourse> {
    return this.http.post<ManagedCourse>('/api/instructor/courses', payload, this.authHeaders());
  }

  createInstructorFormula(payload: Partial<ManagedFormula>): Observable<ManagedFormula> {
    return this.http.post<ManagedFormula>('/api/instructor/formulas', payload, this.authHeaders());
  }

  updateInstructorCourse(courseId: string, payload: Partial<ManagedCourse>): Observable<ManagedCourse> {
    return this.http.put<ManagedCourse>(`/api/instructor/courses/${courseId}`, payload, this.authHeaders());
  }

  updateInstructorFormula(formulaId: string, payload: Partial<ManagedFormula>): Observable<ManagedFormula> {
    return this.http.put<ManagedFormula>(`/api/instructor/formulas/${formulaId}`, payload, this.authHeaders());
  }

  deleteInstructorCourse(courseId: string): Observable<void> {
    return this.http.delete<void>(`/api/instructor/courses/${courseId}`, this.authHeaders());
  }

  deleteInstructorFormula(formulaId: string): Observable<void> {
    return this.http.delete<void>(`/api/instructor/formulas/${formulaId}`, this.authHeaders());
  }

  getInstructorResources(): Observable<{ sessions: LiveSession[]; resources: ResourceItem[] }> {
    return this.http.get<{ sessions: LiveSession[]; resources: ResourceItem[] }>('/api/instructor/resources', this.authHeaders());
  }

  createLiveSession(payload: { title: string; courseId: string; scheduledAt: string; meetLink: string; notes: string }): Observable<LiveSession> {
    return this.http.post<LiveSession>('/api/instructor/live-sessions', payload, this.authHeaders());
  }

  createResource(payload: { title: string; description: string; courseId: string; type: 'pdf' | 'video' | 'audio' | 'link'; url: string }): Observable<ResourceItem> {
    return this.http.post<ResourceItem>('/api/instructor/resources', payload, this.authHeaders());
  }

  getInstructorSchedule(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>('/api/instructor/schedule', this.authHeaders());
  }

  createInstructorScheduleEntry(payload: Omit<ScheduleEntry, 'id' | 'courseTitle'>): Observable<ScheduleEntry> {
    return this.http.post<ScheduleEntry>('/api/instructor/schedule', payload, this.authHeaders());
  }

  deleteInstructorScheduleEntry(entryId: string): Observable<void> {
    return this.http.delete<void>(`/api/instructor/schedule/${entryId}`, this.authHeaders());
  }

  getInstructorStudents(): Observable<InstructorStudent[]> {
    return this.http.get<InstructorStudent[]>('/api/instructor/students', this.authHeaders());
  }

  getInstructorMessages(): Observable<ConversationMessage[]> {
    return this.http.get<ConversationMessage[]>('/api/instructor/messages', this.authHeaders());
  }

  getInstructorMessageContacts(): Observable<MessageContact[]> {
    return this.http.get<MessageContact[]>('/api/instructor/message-contacts', this.authHeaders());
  }

  replyInstructorMessage(payload: { recipientId: string; subject: string; content: string }): Observable<ConversationMessage> {
    return this.http.post<ConversationMessage>('/api/instructor/messages', payload, this.authHeaders());
  }

  getAdminMessages(): Observable<ConversationMessage[]> {
    return this.http.get<ConversationMessage[]>('/api/admin/messages', this.authHeaders());
  }

  getAdminMessageContacts(): Observable<MessageContact[]> {
    return this.http.get<MessageContact[]>('/api/admin/message-contacts', this.authHeaders());
  }

  sendAdminMessage(payload: { recipientId: string; subject: string; content: string }): Observable<ConversationMessage> {
    return this.http.post<ConversationMessage>('/api/admin/messages', payload, this.authHeaders());
  }

  getInstructorExams(): Observable<ManagedExam[]> {
    return this.http.get<ManagedExam[]>('/api/instructor/exams', this.authHeaders());
  }

  createInstructorExam(payload: { title: string; courseId: string; dueDate: string; questions: ExamQuestionPayload[] }): Observable<ManagedExam> {
    return this.http.post<ManagedExam>('/api/instructor/exams', payload, this.authHeaders());
  }

  getInstructorProfile(): Observable<RoleProfile> {
    return this.http.get<RoleProfile>('/api/instructor/profile', this.authHeaders());
  }

  updateInstructorProfile(payload: Partial<RoleProfile>): Observable<RoleProfile> {
    return this.http.put<RoleProfile>('/api/instructor/profile', payload, this.authHeaders());
  }

  getAdminOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>('/api/admin/overview', this.authHeaders());
  }

  getAdminUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users', this.authHeaders());
  }

  updateAdminUserRole(userId: string, role: 'student' | 'instructor' | 'admin'): Observable<AdminUser> {
    return this.http.put<AdminUser>(`/api/admin/users/${userId}`, { role }, this.authHeaders());
  }

  getAdminCourses(): Observable<ManagedCourse[]> {
    return this.http.get<ManagedCourse[]>('/api/admin/courses', this.authHeaders());
  }

  createAdminCourse(payload: Partial<ManagedCourse>): Observable<ManagedCourse> {
    return this.http.post<ManagedCourse>('/api/admin/courses', payload, this.authHeaders());
  }

  updateAdminCourse(courseId: string, payload: Partial<ManagedCourse>): Observable<ManagedCourse> {
    return this.http.put<ManagedCourse>(`/api/admin/courses/${courseId}`, payload, this.authHeaders());
  }

  deleteAdminCourse(courseId: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/courses/${courseId}`, this.authHeaders());
  }

  getAdminPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>('/api/admin/payments', this.authHeaders());
  }

  getAdminStats(): Observable<AdminStatsData> {
    return this.http.get<AdminStatsData>('/api/admin/stats', this.authHeaders());
  }

  getAdminProfile(): Observable<RoleProfile> {
    return this.http.get<RoleProfile>('/api/admin/profile', this.authHeaders());
  }

  updateAdminProfile(payload: Partial<RoleProfile>): Observable<RoleProfile> {
    return this.http.put<RoleProfile>('/api/admin/profile', payload, this.authHeaders());
  }
}
