import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService, User } from './auth.service';

export interface StudentOverview {
  featuredCourseId: string;
  featuredCourseTitle: string;
  featuredProgress: number;
  enrolledCount: number;
  completedCount: number;
  certificateCount: number;
  averageScore: number;
  courses: StudentCourse[];
}

export interface StudentCourse {
  id: string;
  title: string;
  description: string;
  modules: number;
  students: number;
  thumbnail: string;
  access: 'free' | 'paid';
  priceEur: number;
  category: string;
  enrolled: boolean;
  progress: number;
  enrollmentRequestStatus?: 'pending' | 'approved' | null;
  enrollmentRequestId?: string | null;
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
  quizTitle?: string | null;
  quizQuestions?: Array<{ id: string; prompt: string; options: string[] }> | null;
  quizAttemptsRemaining?: number;
  quizResult?: {
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    answers: Record<string, number>;
    attemptCount: number;
  } | null;
}

export interface StudentCertificate {
  id: string;
  title: string;
  issuedAt: string;
  status: 'issued' | 'pending';
  signedBy: string;
  pdfUrl?: string;
}

export interface StudentMessage {
  id: string;
  senderId?: string;
  senderRole: 'student' | 'admin' | 'instructor';
  senderName: string;
  recipientId?: string;
  recipientRole: 'student' | 'admin' | 'instructor';
  recipientName: string;
  subject: string;
  content: string;
  sentAt: string;
}

export interface MessageContact {
  id: string;
  name: string;
  role: 'student' | 'admin' | 'instructor';
  email: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  objective: string;
}


export interface StudentScheduleEntry {
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

@Injectable({
  providedIn: 'root'
})
export class StudentPortalService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private authHeaders(): { headers: HttpHeaders } {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  getOverview(): Observable<StudentOverview> {
    return this.http.get<StudentOverview>('/api/student/overview', this.authHeaders());
  }

  getCatalog(): Observable<StudentCourse[]> {
    return this.http.get<StudentCourse[]>('/api/student/catalog', this.authHeaders());
  }

  enrollInCourse(courseId: string): Observable<StudentCourse> {
    return this.http.post<StudentCourse>(`/api/student/catalog/${courseId}/enroll`, {}, this.authHeaders());
  }

  getCertificates(): Observable<StudentCertificate[]> {
    return this.http.get<StudentCertificate[]>('/api/student/certificates', this.authHeaders());
  }

  getMessages(): Observable<StudentMessage[]> {
    return this.http.get<StudentMessage[]>('/api/student/messages', this.authHeaders());
  }

  getMessageContacts(): Observable<MessageContact[]> {
    return this.http.get<MessageContact[]>('/api/student/message-contacts', this.authHeaders());
  }

  sendMessage(payload: { recipientId: string; subject: string; content: string }): Observable<StudentMessage> {
    return this.http.post<StudentMessage>('/api/student/messages', payload, this.authHeaders());
  }

  getProfile(): Observable<StudentProfile> {
    return this.http.get<StudentProfile>('/api/student/profile', this.authHeaders());
  }

  updateProfile(payload: Pick<StudentProfile, 'name' | 'phone' | 'city' | 'country' | 'objective'>): Observable<StudentProfile> {
    return this.http.put<StudentProfile>('/api/student/profile', payload, this.authHeaders());
  }


  getSchedule(): Observable<StudentScheduleEntry[]> {
    return this.http.get<StudentScheduleEntry[]>('/api/student/schedule', this.authHeaders());
  }

  submitCourseQuiz(courseId: string, answers: Record<string, number>): Observable<StudentCourse[]> {
    return this.http.post<StudentCourse[]>(`/api/student/courses/${courseId}/quiz/submit`, { answers }, this.authHeaders());
  }

  currentUser(): User | null {
    return this.auth.currentUser();
  }
}
