import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { STUDENT_MENU_ITEMS } from '../student/student-menu';
import { StudentCourse, StudentPortalService } from '../../services/student-portal.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.html',
  styles: [`
    .quiz-option { transition: border-color 0.15s, background-color 0.15s; }
    .quiz-option:hover { border-color: var(--color-brand-gold-300); background-color: rgba(254,249,237,0.6); }
    .prog-card summary::-webkit-details-marker { display: none; }
    .pdf-row { transition: background-color 0.2s, border-color 0.2s; }
  `]
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly portal = inject(StudentPortalService);
  private courseId        = '';
  private timer: ReturnType<typeof setInterval> | null = null;

  menuItems          = [...STUDENT_MENU_ITEMS];
  course             = signal<StudentCourse | null>(null);
  objectives         = computed(() => this.course()?.objectives ?? []);
  contentItems       = computed(() => this.course()?.contentItems ?? []);
  chapters           = computed(() => this.course()?.chapters ?? []);
  programModules     = computed(() => this.course()?.programModules ?? []);
  galleryImages      = computed(() => this.course()?.galleryImages ?? []);
  moduleItems        = computed(() => this.course()?.moduleItems ?? []);
  quizTitle          = computed(() => this.course()?.quizTitle || 'Quiz de la formation');
  quizQuestions      = computed(() => this.course()?.quizQuestions ?? []);
  quizResult         = computed(() => this.course()?.quizResult ?? null);
  attemptsRemaining  = computed(() => this.course()?.quizAttemptsRemaining ?? 2);
  totalChapters      = computed(() => this.programModules().reduce((sum, m) => sum + m.chapters.length, 0));

  quizOpen        = signal(false);
  quizAnswers     = signal<Record<string, number>>({});
  submitting      = signal(false);
  submitError     = signal('');
  timeRemaining   = signal(30 * 60); // 30 minutes in seconds
  showResultPopup = signal(false);
  lastResult      = signal<StudentCourse['quizResult']>(null);

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') ?? '';
    this.portal.getCatalog().subscribe((courses) => {
      this.course.set(courses.find((c) => c.id === this.courseId && c.enrolled) ?? null);
    });
  }

  ngOnDestroy(): void { this.stopTimer(); }

  openQuiz(): void {
    this.stopTimer();
    this.quizAnswers.set({});
    this.submitError.set('');
    this.timeRemaining.set(30 * 60);
    this.quizOpen.set(true);
    this.startTimer();
  }

  closeQuiz(): void {
    this.stopTimer();
    this.quizOpen.set(false);
  }

  closePopup(): void { this.showResultPopup.set(false); }

  setAnswer(questionId: string, optionIndex: number): void {
    this.quizAnswers.update(a => ({ ...a, [questionId]: optionIndex }));
  }

  submitQuiz(): void {
    if (this.submitting()) return;
    this.stopTimer();
    this.submitting.set(true);
    this.submitError.set('');
    this.portal.submitCourseQuiz(this.courseId, this.quizAnswers()).subscribe({
      next: (courses) => {
        const updated = courses.find((c) => c.id === this.courseId) ?? null;
        this.course.set(updated);
        this.quizOpen.set(false);
        this.submitting.set(false);
        this.lastResult.set(updated?.quizResult ?? null);
        this.showResultPopup.set(true);
      },
      error: (err: any) => {
        const msg = err?.error?.error ?? 'Erreur lors de la soumission. Réessayez.';
        this.submitError.set(msg);
        this.submitting.set(false);
      }
    });
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      const next = this.timeRemaining() - 1;
      this.timeRemaining.set(next);
      if (next <= 0) { this.stopTimer(); this.submitQuiz(); }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  formatTime(seconds: number): string {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  letter(i: number): string { return String.fromCharCode(65 + i); }
}
