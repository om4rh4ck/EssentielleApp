import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
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
  templateUrl: './course-detail.html'
})
export class CourseDetailComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly portal   = inject(StudentPortalService);
  private courseId          = '';

  menuItems      = [...STUDENT_MENU_ITEMS];
  course         = signal<StudentCourse | null>(null);
  objectives     = computed(() => this.course()?.objectives ?? []);
  contentItems   = computed(() => this.course()?.contentItems ?? []);
  chapters       = computed(() => this.course()?.chapters ?? []);
  programModules = computed(() => this.course()?.programModules ?? []);
  galleryImages  = computed(() => this.course()?.galleryImages ?? []);
  moduleItems    = computed(() => this.course()?.moduleItems ?? []);
  quizQuestions  = computed(() => this.course()?.quizQuestions ?? []);
  quizResult     = computed(() => this.course()?.quizResult ?? null);

  quizOpen       = signal(false);
  quizAnswers    = signal<Record<string, number>>({});
  submitting     = signal(false);
  submitError    = signal('');

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') ?? '';
    this.portal.getCatalog().subscribe((courses) => {
      this.course.set(courses.find((c) => c.id === this.courseId && c.enrolled) ?? null);
    });
  }

  openQuiz(): void   { this.quizOpen.set(true); this.quizAnswers.set({}); this.submitError.set(''); }
  closeQuiz(): void  { this.quizOpen.set(false); }

  setAnswer(questionId: string, optionIndex: number): void {
    this.quizAnswers.update(a => ({ ...a, [questionId]: optionIndex }));
  }

  submitQuiz(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set('');
    this.portal.submitCourseQuiz(this.courseId, this.quizAnswers()).subscribe({
      next: (courses) => {
        const updated = courses.find((c) => c.id === this.courseId) ?? null;
        this.course.set(updated);
        this.quizOpen.set(false);
        this.submitting.set(false);
      },
      error: () => {
        this.submitError.set('Erreur lors de la soumission. Réessayez.');
        this.submitting.set(false);
      }
    });
  }

  letter(i: number): string { return String.fromCharCode(65 + i); }
}
