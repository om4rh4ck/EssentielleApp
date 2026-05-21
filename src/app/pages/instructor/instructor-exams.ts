import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { CourseQuizResults, StudentQuizResult, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Résultats Examens" [menuItems]="menuItems">
      <div class="space-y-6">

        <!-- Page header + global stats -->
        <div class="rounded-[24px] bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Résultats des QCM</h2>
              <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/55">
                Consultez les résultats de chaque étudiante et délivrez les certificats.
              </p>
            </div>
            <div class="flex flex-wrap gap-4">
              <div class="rounded-[18px] bg-[var(--color-brand-cream)] px-5 py-3 text-center min-w-[100px]">
                <div class="text-2xl font-black text-[var(--color-brand-green-900)]">{{ totalStudents() }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50 mt-0.5">Participantes</div>
              </div>
              <div class="rounded-[18px] bg-emerald-50 px-5 py-3 text-center min-w-[100px]">
                <div class="text-2xl font-black text-emerald-700">{{ totalPassed() }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-0.5">Validées</div>
              </div>
              <div class="rounded-[18px] bg-amber-50 px-5 py-3 text-center min-w-[100px]">
                <div class="text-2xl font-black text-amber-700">{{ globalAvg() }}%</div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 mt-0.5">Moy. générale</div>
              </div>
            </div>
          </div>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-16">
            <mat-icon class="animate-spin text-[var(--color-brand-gold-500)] !h-10 !w-10 !text-[40px]">sync</mat-icon>
          </div>
        } @else if (!results().length) {
          <div class="rounded-[24px] bg-white p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <mat-icon class="!h-16 !w-16 !text-[64px] text-[var(--color-brand-green-800)]/15">quiz</mat-icon>
            <p class="mt-4 font-serif text-xl text-[var(--color-brand-green-900)]">Aucun résultat disponible</p>
            <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/50">
              Ajoutez un QCM à vos formations et attendez que des étudiantes le passent.
            </p>
          </div>
        } @else {

          <!-- Course tabs -->
          <div class="flex flex-wrap gap-2">
            @for (r of results(); track r.courseId) {
              <button (click)="selectCourse(r.courseId)"
                      class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
                      [class.bg-[var(--color-brand-green-900)]]="selectedId() === r.courseId"
                      [class.text-white]="selectedId() === r.courseId"
                      [class.shadow-lg]="selectedId() === r.courseId"
                      [class.bg-white]="selectedId() !== r.courseId"
                      [class.text-[var(--color-brand-green-900)]]="selectedId() !== r.courseId"
                      [class.border]="selectedId() !== r.courseId"
                      [class.border-gray-200]="selectedId() !== r.courseId">
                <mat-icon class="!h-4 !w-4 !text-[16px]">school</mat-icon>
                {{ r.courseTitle }}
                <span class="inline-flex h-5 px-1.5 items-center justify-center rounded-full text-[10px] font-bold"
                      [class.bg-white/20]="selectedId() === r.courseId"
                      [class.bg-[var(--color-brand-cream)]]="selectedId() !== r.courseId">
                  {{ r.totalStudents }}
                </span>
              </button>
            }
          </div>

          @if (selected(); as course) {
            <!-- Course summary cards -->
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div class="rounded-[20px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-brand-cream)]">
                  <mat-icon class="text-[var(--color-brand-gold-600)]">group</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-[var(--color-brand-green-900)]">{{ course.totalStudents }}</div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-green-800)]/50">Participantes</div>
                </div>
              </div>
              <div class="rounded-[20px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50">
                  <mat-icon class="text-emerald-600">verified</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-emerald-700">{{ course.passedCount }}</div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">Validées</div>
                </div>
              </div>
              <div class="rounded-[20px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-red-50">
                  <mat-icon class="text-red-400">cancel</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-red-600">{{ course.totalStudents - course.passedCount }}</div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-red-500/70">Non validées</div>
                </div>
              </div>
              <div class="rounded-[20px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50">
                  <mat-icon class="text-blue-500">bar_chart</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-blue-700">{{ course.avgScore }}%</div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">Moy. score</div>
                </div>
              </div>
            </div>

            <!-- Quiz info bar -->
            <div class="rounded-[20px] bg-[var(--color-brand-cream)] border border-[var(--color-brand-gold-300)]/30 px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
              <div class="flex items-center gap-2 text-[var(--color-brand-green-900)]">
                <mat-icon class="!h-4 !w-4 !text-[16px] text-[var(--color-brand-gold-600)]">quiz</mat-icon>
                <span class="font-semibold">{{ course.quizTitle }}</span>
              </div>
              <div class="flex items-center gap-2 text-[var(--color-brand-green-800)]/60">
                <mat-icon class="!h-4 !w-4 !text-[16px]">help_outline</mat-icon>
                {{ course.questions }} question(s)
              </div>
              <div class="flex items-center gap-2 text-[var(--color-brand-green-800)]/60">
                <mat-icon class="!h-4 !w-4 !text-[16px]">timer</mat-icon>
                30 min · 2 essais max
              </div>
              <div class="flex items-center gap-2 text-[var(--color-brand-green-800)]/60">
                <mat-icon class="!h-4 !w-4 !text-[16px]">score</mat-icon>
                Seuil de validation : 50%
              </div>
            </div>

            <!-- Students table -->
            @if (!course.students.length) {
              <div class="rounded-[24px] bg-white p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <mat-icon class="!h-12 !w-12 !text-[48px] text-[var(--color-brand-green-800)]/15">person_search</mat-icon>
                <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/50">Aucune étudiante n'a encore passé ce quiz.</p>
              </div>
            } @else {
              <div class="rounded-[24px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-100">
                      <th class="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50">Étudiante</th>
                      <th class="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50">Note</th>
                      <th class="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50 hidden sm:table-cell">Score</th>
                      <th class="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50">Statut</th>
                      <th class="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50 hidden md:table-cell">Essais</th>
                      <th class="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50 hidden lg:table-cell">Date</th>
                      <th class="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (student of course.students; track student.studentId) {
                      <tr class="border-b border-gray-50 hover:bg-[var(--color-brand-cream)]/40 transition cursor-pointer"
                          (click)="openDetail(student, course)">
                        <td class="px-5 py-4">
                          <div class="flex items-center gap-3">
                            <div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white"
                                 [class.bg-emerald-500]="student.passed"
                                 [class.bg-red-400]="!student.passed">
                              {{ student.studentName.charAt(0).toUpperCase() }}
                            </div>
                            <div>
                              <div class="font-semibold text-sm text-[var(--color-brand-green-900)]">{{ student.studentName }}</div>
                              <div class="text-xs text-[var(--color-brand-green-800)]/50">{{ student.studentEmail }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span class="text-lg font-black"
                                [class.text-emerald-700]="student.passed"
                                [class.text-red-600]="!student.passed">
                            {{ student.score }}/{{ student.total }}
                          </span>
                        </td>
                        <td class="px-5 py-4 hidden sm:table-cell">
                          <div class="flex items-center gap-2">
                            <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div class="h-full rounded-full transition-all"
                                   [class.bg-emerald-500]="student.passed"
                                   [class.bg-red-400]="!student.passed"
                                   [style.width]="student.percentage + '%'"></div>
                            </div>
                            <span class="text-xs font-bold w-10 text-right"
                                  [class.text-emerald-700]="student.passed"
                                  [class.text-red-600]="!student.passed">
                              {{ student.percentage }}%
                            </span>
                          </div>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                [class.bg-emerald-100]="student.passed"
                                [class.text-emerald-800]="student.passed"
                                [class.bg-red-100]="!student.passed"
                                [class.text-red-700]="!student.passed">
                            <mat-icon class="!h-3 !w-3 !text-[12px]">{{ student.passed ? 'check' : 'close' }}</mat-icon>
                            {{ student.passed ? 'Validé' : 'Échoué' }}
                          </span>
                        </td>
                        <td class="px-5 py-4 text-center hidden md:table-cell">
                          <span class="text-sm text-[var(--color-brand-green-800)]/60">{{ student.attemptCount }}/2</span>
                        </td>
                        <td class="px-5 py-4 text-center hidden lg:table-cell">
                          <span class="text-xs text-[var(--color-brand-green-800)]/50">{{ formatDate(student.submittedAt) }}</span>
                        </td>
                        <td class="px-5 py-4 text-right" (click)="$event.stopPropagation()">
                          @if (student.passed) {
                            @if (student.certificateIssued) {
                              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">workspace_premium</mat-icon>
                                Certif. émis
                              </span>
                            } @else {
                              <button (click)="issueCertificate(course.courseId, student)"
                                      [disabled]="certLoading()[student.studentId]"
                                      class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-gold-500)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--color-brand-green-900)] disabled:opacity-50">
                                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">
                                  {{ certLoading()[student.studentId] ? 'sync' : 'workspace_premium' }}
                                </mat-icon>
                                Délivrer certif.
                              </button>
                            }
                          } @else {
                            <span class="text-xs text-[var(--color-brand-green-800)]/35">—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }

        <!-- Student detail modal -->
        @if (detailStudent(); as s) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
               (click)="closeDetail()">
            <div class="w-full max-w-lg rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] overflow-hidden"
                 (click)="$event.stopPropagation()">

              <!-- Modal header -->
              <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div class="flex items-center gap-3">
                  <div class="inline-flex h-11 w-11 items-center justify-center rounded-full text-white text-lg font-black"
                       [class.bg-emerald-500]="s.passed"
                       [class.bg-red-400]="!s.passed">
                    {{ s.studentName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-[var(--color-brand-green-900)]">{{ s.studentName }}</div>
                    <div class="text-xs text-[var(--color-brand-green-800)]/55">{{ s.studentEmail }}</div>
                  </div>
                </div>
                <button (click)="closeDetail()"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                  <mat-icon class="!h-5 !w-5 !text-[20px]">close</mat-icon>
                </button>
              </div>

              <!-- Score section -->
              <div class="px-6 py-6 text-center"
                   [class.bg-emerald-50]="s.passed"
                   [class.bg-red-50]="!s.passed">
                <div class="text-[10px] font-bold uppercase tracking-[0.25em]"
                     [class.text-emerald-600]="s.passed"
                     [class.text-red-500]="!s.passed">
                  {{ s.passed ? 'Quiz validé' : 'Quiz non validé' }}
                </div>
                <div class="mt-1 text-6xl font-black tabular-nums leading-none"
                     [class.text-emerald-700]="s.passed"
                     [class.text-red-600]="!s.passed">
                  {{ s.score }}/{{ s.total }}
                </div>
                <div class="mt-2 text-sm opacity-70"
                     [class.text-emerald-600]="s.passed"
                     [class.text-red-500]="!s.passed">
                  {{ s.percentage }}% — Essai {{ s.attemptCount }}/2 — {{ formatDate(s.submittedAt) }}
                </div>
              </div>

              <!-- Details -->
              <div class="px-6 py-4 space-y-3">
                <div class="flex items-center justify-between rounded-[14px] bg-gray-50 px-4 py-3">
                  <div class="flex items-center gap-2 text-sm text-[var(--color-brand-green-800)]/70">
                    <mat-icon class="!h-4 !w-4 !text-[16px]">school</mat-icon>
                    {{ detailCourse()?.courseTitle }}
                  </div>
                  <span class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ detailCourse()?.quizTitle }}</span>
                </div>
                <div class="flex items-center justify-between rounded-[14px] bg-gray-50 px-4 py-3">
                  <div class="flex items-center gap-2 text-sm text-[var(--color-brand-green-800)]/70">
                    <mat-icon class="!h-4 !w-4 !text-[16px]">workspace_premium</mat-icon>
                    Certificat
                  </div>
                  <span class="text-sm font-semibold"
                        [class.text-emerald-700]="s.certificateIssued"
                        [class.text-gray-400]="!s.certificateIssued">
                    {{ s.certificateIssued ? 'Émis' : (s.passed ? 'Non émis' : 'Non applicable') }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="px-6 pb-6 flex gap-3">
                @if (s.passed && !s.certificateIssued && detailCourse()) {
                  <button (click)="issueCertificate(detailCourse()!.courseId, s); closeDetail()"
                          class="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] py-3 text-sm font-bold text-white hover:bg-[var(--color-brand-green-900)] transition">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">workspace_premium</mat-icon>
                    Délivrer le certificat
                  </button>
                }
                <button (click)="closeDetail()"
                        class="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-[var(--color-brand-green-900)] hover:bg-gray-50 transition">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Toast notification -->
        @if (toast()) {
          <div class="fixed bottom-6 right-6 z-50 rounded-[18px] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.18)] text-white text-sm font-semibold flex items-center gap-3 animate-pulse"
               [class.bg-emerald-600]="toastType() === 'success'"
               [class.bg-red-500]="toastType() === 'error'">
            <mat-icon class="!h-5 !w-5 !text-[20px]">{{ toastType() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
            {{ toast() }}
          </div>
        }

      </div>
    </app-dashboard-layout>
  `,
})
export class InstructorExamsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  loading   = signal(true);
  results   = signal<CourseQuizResults[]>([]);
  selectedId = signal<string | null>(null);
  selected  = computed(() => this.results().find(r => r.courseId === this.selectedId()) ?? null);

  totalStudents = computed(() => this.results().reduce((s, r) => s + r.totalStudents, 0));
  totalPassed   = computed(() => this.results().reduce((s, r) => s + r.passedCount, 0));
  globalAvg     = computed(() => {
    const all = this.results();
    if (!all.length) return 0;
    return Math.round(all.reduce((s, r) => s + r.avgScore, 0) / all.length);
  });

  certLoading  = signal<Record<string, boolean>>({});
  detailStudent = signal<StudentQuizResult | null>(null);
  detailCourse  = signal<CourseQuizResults | null>(null);
  toast        = signal('');
  toastType    = signal<'success' | 'error'>('success');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.staff.getInstructorQuizResults().subscribe({
      next: (data) => {
        this.results.set(data);
        if (data.length && !this.selectedId()) this.selectedId.set(data[0].courseId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectCourse(id: string): void { this.selectedId.set(id); }

  openDetail(student: StudentQuizResult, course: CourseQuizResults): void {
    this.detailStudent.set(student);
    this.detailCourse.set(course);
  }

  closeDetail(): void { this.detailStudent.set(null); this.detailCourse.set(null); }

  issueCertificate(courseId: string, student: StudentQuizResult): void {
    this.certLoading.update(l => ({ ...l, [student.studentId]: true }));
    this.staff.issueQuizCertificate(courseId, student.studentId).subscribe({
      next: (r) => {
        this.certLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.showToast(`Certificat délivré à ${r.studentName} !`, 'success');
        this.load();
      },
      error: (err) => {
        this.certLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.showToast(err?.error?.error ?? 'Erreur lors de l\'émission.', 'error');
      },
    });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 3500);
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }
}
