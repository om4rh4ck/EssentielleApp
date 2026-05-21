import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { CourseQuizResults, StudentQuizResult, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .cisco-sidebar { background: #1a3a2a; }
    .cisco-row:hover { background: #f6fbf8; }
    .metric-card { transition: transform .15s; }
    .metric-card:hover { transform: translateY(-2px); }
    .bar-track { background: #e5e7eb; border-radius: 9999px; overflow: hidden; height: 6px; }
    .bar-fill { height: 100%; border-radius: 9999px; transition: width .4s; }
    .mono { font-family: 'Courier New', Courier, monospace; }
  `],
  template: `
    <app-dashboard-layout title="Résultats QCM" [menuItems]="menuItems">
      <div class="flex h-full min-h-[calc(100vh-80px)] gap-0 rounded-[20px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.10)]">

        <!-- ── SIDEBAR ─────────────────────────────────────────────────────── -->
        <aside class="cisco-sidebar w-64 shrink-0 flex flex-col">
          <div class="px-5 py-5 border-b border-white/10">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#7ecfa0] !h-5 !w-5 !text-[20px]">quiz</mat-icon>
              <span class="text-white font-bold text-sm uppercase tracking-widest">QCM Results</span>
            </div>
            <p class="mt-1 text-white/40 text-[10px] uppercase tracking-wider">Cisco-style gradebook</p>
          </div>

          @if (loading()) {
            <div class="flex-1 flex items-center justify-center">
              <mat-icon class="animate-spin text-[#7ecfa0] !h-8 !w-8 !text-[32px]">sync</mat-icon>
            </div>
          } @else {
            <nav class="flex-1 overflow-y-auto py-3">
              @for (r of results(); track r.courseId) {
                <button (click)="selectCourse(r.courseId)"
                        class="w-full text-left px-5 py-3.5 flex items-start gap-3 transition"
                        [class.bg-white/10]="selectedId() === r.courseId"
                        [class.border-l-4]="selectedId() === r.courseId"
                        [class.border-l-[#7ecfa0]]="selectedId() === r.courseId"
                        [class.border-l-transparent]="selectedId() !== r.courseId">
                  <mat-icon class="!h-4 !w-4 !text-[16px] mt-0.5 shrink-0"
                            [class.text-[#7ecfa0]]="selectedId() === r.courseId"
                            [class.text-white/40]="selectedId() !== r.courseId">school</mat-icon>
                  <div class="min-w-0">
                    <div class="text-xs font-semibold leading-snug"
                         [class.text-white]="selectedId() === r.courseId"
                         [class.text-white/60]="selectedId() !== r.courseId">
                      {{ r.courseTitle }}
                    </div>
                    <div class="mt-0.5 text-[10px] text-white/35">
                      {{ r.totalStudents }} étudiante(s) · {{ r.questions }} Q
                    </div>
                  </div>
                  <span class="ml-auto shrink-0 inline-flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full text-[10px] font-bold"
                        [class.bg-[#7ecfa0]]="selectedId() === r.courseId"
                        [class.text-[#1a3a2a]]="selectedId() === r.courseId"
                        [class.bg-white/15]="selectedId() !== r.courseId"
                        [class.text-white/60]="selectedId() !== r.courseId">
                    {{ r.passedCount }}
                  </span>
                </button>
              }

              @if (!results().length) {
                <div class="px-5 py-8 text-center text-white/30 text-xs">
                  Aucun quiz disponible.
                </div>
              }
            </nav>

            <!-- Sidebar footer stats -->
            <div class="px-5 py-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <div class="text-lg font-black text-white mono">{{ totalStudents() }}</div>
                <div class="text-[9px] uppercase tracking-wider text-white/35">Total</div>
              </div>
              <div>
                <div class="text-lg font-black text-[#7ecfa0] mono">{{ totalPassed() }}</div>
                <div class="text-[9px] uppercase tracking-wider text-white/35">Validées</div>
              </div>
              <div>
                <div class="text-lg font-black text-amber-400 mono">{{ globalAvg() }}%</div>
                <div class="text-[9px] uppercase tracking-wider text-white/35">Moy.</div>
              </div>
            </div>
          }
        </aside>

        <!-- ── MAIN CONTENT ────────────────────────────────────────────────── -->
        <main class="flex-1 bg-[#f4f7f5] overflow-y-auto">

          @if (!results().length && !loading()) {
            <!-- Empty state -->
            <div class="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div class="inline-flex h-24 w-24 items-center justify-center rounded-full bg-[#1a3a2a]/8 mb-6">
                <mat-icon class="!h-12 !w-12 !text-[48px] text-[#1a3a2a]/25">assignment_turned_in</mat-icon>
              </div>
              <h3 class="font-serif text-2xl text-[#1a3a2a]">Aucun résultat disponible</h3>
              <p class="mt-2 max-w-sm text-sm text-[#1a3a2a]/50">
                Ajoutez un QCM à vos formations et attendez que des étudiantes le passent.
              </p>
            </div>
          }

          @if (selected(); as course) {
            <!-- ── Header metrics bar ──────────────────────────────────────── -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
              <div class="metric-card rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
                <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#1a3a2a]/8">
                  <mat-icon class="text-[#1a3a2a] !h-5 !w-5 !text-[20px]">group</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-[#1a3a2a] mono">{{ course.totalStudents }}</div>
                  <div class="text-[9px] font-bold uppercase tracking-widest text-[#1a3a2a]/40">Participantes</div>
                </div>
              </div>
              <div class="metric-card rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
                <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-50">
                  <mat-icon class="text-emerald-600 !h-5 !w-5 !text-[20px]">verified</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-emerald-700 mono">{{ course.passedCount }}</div>
                  <div class="text-[9px] font-bold uppercase tracking-widest text-emerald-600/60">Validées</div>
                </div>
              </div>
              <div class="metric-card rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
                <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-red-50">
                  <mat-icon class="text-red-400 !h-5 !w-5 !text-[20px]">cancel</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-red-600 mono">{{ course.totalStudents - course.passedCount }}</div>
                  <div class="text-[9px] font-bold uppercase tracking-widest text-red-500/60">Échouées</div>
                </div>
              </div>
              <div class="metric-card rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
                <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-50">
                  <mat-icon class="text-blue-500 !h-5 !w-5 !text-[20px]">bar_chart</mat-icon>
                </div>
                <div>
                  <div class="text-xl font-black text-blue-700 mono">{{ course.avgScore }}%</div>
                  <div class="text-[9px] font-bold uppercase tracking-widest text-blue-600/60">Moy. score</div>
                </div>
              </div>
            </div>

            <!-- Quiz meta bar -->
            <div class="mx-5 mb-4 rounded-[14px] bg-[#1a3a2a] px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div class="flex items-center gap-2 text-[#7ecfa0] font-semibold">
                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">quiz</mat-icon>
                {{ course.quizTitle }}
              </div>
              <div class="flex items-center gap-1.5 text-white/50">
                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">help_outline</mat-icon>
                {{ course.questions }} questions
              </div>
              <div class="flex items-center gap-1.5 text-white/50">
                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">timer</mat-icon>
                30 min · 2 essais max
              </div>
              <div class="flex items-center gap-1.5 text-white/50">
                <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">score</mat-icon>
                Seuil : 50 %
              </div>
            </div>

            <!-- Table or empty-students state -->
            @if (!course.students.length) {
              <div class="mx-5 rounded-[16px] bg-white p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                <mat-icon class="!h-12 !w-12 !text-[48px] text-[#1a3a2a]/15">person_search</mat-icon>
                <p class="mt-3 text-sm text-[#1a3a2a]/45">Aucune étudiante n'a encore passé ce quiz.</p>
              </div>
            } @else {
              <div class="mx-5 mb-6 rounded-[16px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="border-b-2 border-[#1a3a2a]/8 bg-[#1a3a2a]/3">
                      <th class="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45">Étudiante</th>
                      <th class="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45">Note / Max</th>
                      <th class="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45 hidden sm:table-cell">Score</th>
                      <th class="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45 hidden md:table-cell">Meilleur</th>
                      <th class="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45">Statut</th>
                      <th class="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45 hidden md:table-cell">Essais</th>
                      <th class="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-[0.18em] text-[#1a3a2a]/45">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (student of course.students; track student.studentId) {
                      <tr class="cisco-row border-b border-gray-50 cursor-pointer"
                          (click)="openDetail(student, course)">
                        <!-- Avatar + name -->
                        <td class="px-4 py-3.5">
                          <div class="flex items-center gap-3">
                            <div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-sm text-white"
                                 [class.bg-emerald-500]="student.passed"
                                 [class.bg-red-400]="!student.passed">
                              {{ student.studentName.charAt(0).toUpperCase() }}
                            </div>
                            <div>
                              <div class="font-semibold text-sm text-[#1a3a2a]">{{ student.studentName }}</div>
                              <div class="text-[11px] text-[#1a3a2a]/40">{{ student.studentEmail }}</div>
                            </div>
                          </div>
                        </td>
                        <!-- Fraction note -->
                        <td class="px-4 py-3.5 text-center">
                          <span class="mono font-black text-base"
                                [class.text-emerald-700]="student.passed"
                                [class.text-red-600]="!student.passed">
                            {{ student.score }}/{{ student.total }}
                          </span>
                        </td>
                        <!-- Percentage bar -->
                        <td class="px-4 py-3.5 hidden sm:table-cell min-w-[120px]">
                          <div class="flex items-center gap-2">
                            <div class="bar-track flex-1">
                              <div class="bar-fill"
                                   [class.bg-emerald-500]="student.passed"
                                   [class.bg-red-400]="!student.passed"
                                   [style.width]="student.percentage + '%'"></div>
                            </div>
                            <span class="mono text-xs font-bold w-10 text-right shrink-0"
                                  [class.text-emerald-700]="student.passed"
                                  [class.text-red-600]="!student.passed">
                              {{ student.percentage }}%
                            </span>
                          </div>
                        </td>
                        <!-- Best score -->
                        <td class="px-4 py-3.5 text-center hidden md:table-cell">
                          @if ((student.bestPercentage ?? student.percentage) !== student.percentage) {
                            <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 mono">
                              <mat-icon class="!h-3 !w-3 !text-[12px]">star</mat-icon>
                              {{ student.bestPercentage ?? student.percentage }}%
                            </span>
                          } @else {
                            <span class="text-[11px] text-[#1a3a2a]/35 mono">—</span>
                          }
                        </td>
                        <!-- Status chip -->
                        <td class="px-4 py-3.5 text-center">
                          <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest"
                                [class.bg-emerald-100]="student.passed"
                                [class.text-emerald-800]="student.passed"
                                [class.bg-red-100]="!student.passed"
                                [class.text-red-700]="!student.passed">
                            <span class="inline-block h-1.5 w-1.5 rounded-full"
                                  [class.bg-emerald-500]="student.passed"
                                  [class.bg-red-400]="!student.passed"></span>
                            {{ student.passed ? 'RÉUSSI' : 'ÉCHOUÉ' }}
                          </span>
                        </td>
                        <!-- Attempt count -->
                        <td class="px-4 py-3.5 text-center hidden md:table-cell">
                          <span class="mono text-xs text-[#1a3a2a]/45">{{ student.attemptCount }}/2</span>
                        </td>
                        <!-- Actions column -->
                        <td class="px-4 py-3.5 text-right" (click)="$event.stopPropagation()">
                          <div class="inline-flex items-center gap-2 justify-end flex-wrap">

                            <!-- Reset button (circular icon) -->
                            <button (click)="resetAttempt(course.courseId, student)"
                                    [disabled]="resetLoading()[student.studentId]"
                                    title="Réinitialiser la tentative"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:bg-red-50 hover:text-red-500 hover:border-red-200 disabled:opacity-40">
                              <mat-icon class="!h-4 !w-4 !text-[16px]">
                                {{ resetLoading()[student.studentId] ? 'sync' : 'restart_alt' }}
                              </mat-icon>
                            </button>

                            <!-- Certificate area -->
                            @if (student.passed) {
                              @if (student.certificateIssued) {
                                <!-- Already issued badge -->
                                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700">
                                  <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">check_circle</mat-icon>
                                  Certif. émis
                                </span>
                              } @else {
                                <!-- Cert delivery: file input + send -->
                                <div class="inline-flex flex-col items-end gap-1" (click)="$event.stopPropagation()">
                                  @if (!pendingCertFile()[student.studentId]) {
                                    <label class="inline-flex items-center gap-1.5 cursor-pointer rounded-full bg-[var(--color-brand-gold-500,#c89a2e)] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#1a3a2a] transition">
                                      <mat-icon class="!h-3.5 !w-3.5 !text-[14px]">workspace_premium</mat-icon>
                                      Délivrer certif.
                                      <input type="file" accept="application/pdf" class="sr-only"
                                             (change)="onCertFileSelected($event, student.studentId)">
                                    </label>
                                  } @else {
                                    <div class="inline-flex items-center gap-1 text-[10px] text-[#1a3a2a]/60 max-w-[120px]">
                                      <mat-icon class="!h-3.5 !w-3.5 !text-[14px] text-emerald-500 shrink-0">picture_as_pdf</mat-icon>
                                      <span class="truncate">{{ pendingCertFile()[student.studentId]?.name }}</span>
                                    </div>
                                    <div class="inline-flex gap-1">
                                      <button (click)="issueCertificate(course.courseId, student)"
                                              [disabled]="certLoading()[student.studentId]"
                                              class="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                                        <mat-icon class="!h-3 !w-3 !text-[12px]">{{ certLoading()[student.studentId] ? 'sync' : 'send' }}</mat-icon>
                                        Envoyer
                                      </button>
                                      <button (click)="clearCertFile(student.studentId)"
                                              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400">
                                        <mat-icon class="!h-3 !w-3 !text-[12px]">close</mat-icon>
                                      </button>
                                    </div>
                                  }
                                </div>
                              }
                            } @else {
                              <span class="text-[11px] text-[#1a3a2a]/25">—</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        </main>
      </div>

      <!-- ── Toast ──────────────────────────────────────────────────────────── -->
      @if (toast()) {
        <div class="fixed bottom-6 right-6 z-50 rounded-[16px] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.18)] text-white text-sm font-semibold flex items-center gap-3"
             [class.bg-emerald-600]="toastType() === 'success'"
             [class.bg-red-500]="toastType() === 'error'">
          <mat-icon class="!h-5 !w-5 !text-[20px]">{{ toastType() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
          {{ toast() }}
        </div>
      }
    </app-dashboard-layout>
  `,
})
export class InstructorExamsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems  = [...INSTRUCTOR_MENU_ITEMS];
  loading    = signal(true);
  results    = signal<CourseQuizResults[]>([]);
  selectedId = signal<string | null>(null);
  selected   = computed(() => this.results().find(r => r.courseId === this.selectedId()) ?? null);

  totalStudents = computed(() => this.results().reduce((s, r) => s + r.totalStudents, 0));
  totalPassed   = computed(() => this.results().reduce((s, r) => s + r.passedCount, 0));
  globalAvg     = computed(() => {
    const all = this.results();
    if (!all.length) return 0;
    return Math.round(all.reduce((s, r) => s + r.avgScore, 0) / all.length);
  });

  certLoading  = signal<Record<string, boolean>>({});
  resetLoading = signal<Record<string, boolean>>({});
  toast        = signal('');
  toastType    = signal<'success' | 'error'>('success');

  /** Pending cert PDF files keyed by studentId */
  pendingCertFile = signal<Record<string, File | null>>({});

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

  onCertFileSelected(event: Event, studentId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingCertFile.update(m => ({ ...m, [studentId]: file }));
    input.value = '';
  }

  clearCertFile(studentId: string): void {
    this.pendingCertFile.update(m => ({ ...m, [studentId]: null }));
  }

  issueCertificate(courseId: string, student: StudentQuizResult): void {
    const file = this.pendingCertFile()[student.studentId] ?? undefined;
    this.certLoading.update(l => ({ ...l, [student.studentId]: true }));
    this.staff.issueQuizCertificate(courseId, student.studentId, file).subscribe({
      next: (r) => {
        this.certLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.clearCertFile(student.studentId);
        this.showToast(`Certificat délivré à ${r.studentName} !`, 'success');
        this.load();
      },
      error: (err) => {
        this.certLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.showToast(err?.error?.error ?? 'Erreur lors de l\'émission.', 'error');
      },
    });
  }

  resetAttempt(courseId: string, student: StudentQuizResult): void {
    if (!confirm(`Réinitialiser la tentative de ${student.studentName} ?`)) return;
    this.resetLoading.update(l => ({ ...l, [student.studentId]: true }));
    this.staff.resetStudentQuizAttempt(courseId, student.studentId).subscribe({
      next: () => {
        this.resetLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.showToast(`Tentative de ${student.studentName} réinitialisée.`, 'success');
        this.load();
      },
      error: (err) => {
        this.resetLoading.update(l => ({ ...l, [student.studentId]: false }));
        this.showToast(err?.error?.error ?? 'Erreur lors de la réinitialisation.', 'error');
      },
    });
  }

  openDetail(student: StudentQuizResult, _course: CourseQuizResults): void {
    // detail modal removed in Cisco redesign — row click is a no-op
    void student;
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 3500);
  }
}
