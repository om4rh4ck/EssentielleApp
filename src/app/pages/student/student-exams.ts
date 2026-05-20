import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { StudentExam, StudentPortalService } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Examens & QCM" [menuItems]="menuItems">
      <div class="space-y-4">

        <!-- Header -->
        <div class="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Vos examens</h2>
          <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/60">
            Chaque QCM est chronométré et noté automatiquement.
            Le résultat s'affiche immédiatement après validation.
          </p>
        </div>

        <!-- Exam cards -->
        @for (exam of exams(); track exam.id) {
          <div class="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.04)]"
               [class.ring-2]="openId() === exam.id"
               [class.ring-[var(--color-brand-gold-400)]]="openId() === exam.id">

            <!-- Card header -->
            <div class="flex flex-wrap items-start justify-between gap-4 p-5">
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                        [class.bg-emerald-100]="exam.examType === 'final'"
                        [class.text-emerald-800]="exam.examType === 'final'"
                        [class.bg-amber-100]="exam.examType !== 'final'"
                        [class.text-amber-800]="exam.examType !== 'final'">
                    {{ exam.examType === 'final' ? 'Examen final' : 'Quiz' }}
                  </span>

                  @if (exam.score !== null) {
                    <span class="rounded-full px-3 py-0.5 text-sm font-bold"
                          [class.bg-emerald-100]="exam.passed"
                          [class.text-emerald-800]="exam.passed"
                          [class.bg-red-100]="!exam.passed"
                          [class.text-red-700]="!exam.passed">
                      {{ pct(exam.percentage) }}
                    </span>
                  } @else {
                    <span class="rounded-full bg-[var(--color-brand-cream)] px-3 py-0.5 text-xs font-semibold text-[var(--color-brand-green-800)]/55">
                      Non passé
                    </span>
                  }
                </div>

                <h3 class="mt-2 font-serif text-xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
                <p class="mt-1 text-xs text-[var(--color-brand-green-800)]/50">
                  {{ exam.courseTitle }} · {{ exam.durationMinutes }} min
                  · Seuil {{ threshold(exam) }}
                  @if (exam.score !== null) {
                    · {{ exam.attemptsRemaining }} essai(s) restant(s)
                    · Moyenne classe {{ pct(exam.average) }}
                  }
                </p>
              </div>

              <!-- Buttons -->
              <div class="flex shrink-0 flex-wrap gap-2">
                @if (openId() === exam.id) {
                  <button type="button" (click)="close()"
                          class="inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-gold-300)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-cream)]">
                    <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">close</mat-icon>
                    Fermer
                  </button>
                } @else {
                  @if (exam.score !== null) {
                    <button type="button" (click)="openResult(exam)"
                            class="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                      <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">grading</mat-icon>
                      Résultat
                    </button>
                    @if (exam.attemptsRemaining > 0 && exam.questions?.length) {
                      <button type="button" (click)="openRetry(exam)"
                              class="inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-gold-300)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-cream)]">
                        <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">replay</mat-icon>
                        Repasser
                      </button>
                    }
                  } @else if (exam.questions?.length) {
                    <button type="button" (click)="openExam(exam)"
                            class="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-gold-500)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">play_circle</mat-icon>
                      Passer l'examen
                    </button>
                  }
                }
              </div>
            </div>

            <!-- Expanded area -->
            @if (openId() === exam.id) {
              @if (activeExam(); as ax) {

                <!-- ── RESULT VIEW ── -->
                @if (ax.score !== null) {
                  <div class="border-t border-[var(--color-brand-gold-300)]/20 px-5 pb-6">

                    <!-- Score banner -->
                    <div class="mt-4 rounded-[20px] py-8 text-center"
                         [class.bg-emerald-50]="ax.passed"
                         [class.bg-red-50]="ax.passed === false">
                      <div class="text-[11px] font-bold uppercase tracking-[0.25em]"
                           [class.text-emerald-700]="ax.passed"
                           [class.text-red-500]="ax.passed === false">
                        {{ ax.passed ? 'EXAMEN RÉUSSI' : 'EXAMEN NON VALIDÉ' }}
                      </div>
                      <div class="mt-2 text-7xl font-black leading-none"
                           [class.text-emerald-700]="ax.passed"
                           [class.text-red-600]="ax.passed === false">
                        {{ pct(ax.percentage) }}
                      </div>
                      <div class="mt-2 text-sm opacity-70"
                           [class.text-emerald-600]="ax.passed"
                           [class.text-red-500]="ax.passed === false">
                        {{ rawScore(ax.rawScore, ax.rawMaxScore) }} pts
                        &mdash; Seuil {{ threshold(ax) }}
                        &mdash; Moyenne classe {{ pct(ax.average) }}
                      </div>
                    </div>

                    <!-- Stats row -->
                    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div class="rounded-[16px] bg-[var(--color-brand-cream)] p-3 text-center">
                        <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/45">Bonnes rép.</div>
                        <div class="mt-1 font-bold text-[var(--color-brand-green-900)]">{{ correctCount(ax) }}/{{ totalQ(ax) }}</div>
                      </div>
                      <div class="rounded-[16px] bg-[var(--color-brand-cream)] p-3 text-center">
                        <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/45">Score brut</div>
                        <div class="mt-1 font-bold text-[var(--color-brand-green-900)]">{{ rawScore(ax.rawScore, ax.rawMaxScore) }}</div>
                      </div>
                      <div class="rounded-[16px] bg-[var(--color-brand-cream)] p-3 text-center">
                        <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/45">Essais</div>
                        <div class="mt-1 font-bold text-[var(--color-brand-green-900)]">{{ ax.attemptsUsed }}/{{ ax.maxAttempts }}</div>
                      </div>
                      <div class="rounded-[16px] bg-[var(--color-brand-cream)] p-3 text-center">
                        <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/45">Moy. classe</div>
                        <div class="mt-1 font-bold text-[var(--color-brand-green-900)]">{{ pct(ax.average) }}</div>
                      </div>
                    </div>

                    <!-- Result message -->
                    @if (ax.passed) {
                      <div class="mt-4 flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                        <mat-icon class="mt-0.5 shrink-0 !text-emerald-600">verified</mat-icon>
                        <div>
                          <p class="font-bold text-emerald-800">Félicitations — examen validé !</p>
                          <p class="mt-0.5 text-sm text-emerald-700">
                            Votre note {{ pct(ax.percentage) }} dépasse le seuil {{ threshold(ax) }}.
                            @if (ax.examType === 'final') { Votre certificat est disponible dans la section Certificats. }
                          </p>
                        </div>
                      </div>
                    } @else if (ax.attemptsRemaining > 0) {
                      <div class="mt-4 flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4">
                        <mat-icon class="mt-0.5 shrink-0 !text-amber-600">replay</mat-icon>
                        <div>
                          <p class="font-bold text-amber-800">Seuil non atteint — {{ ax.attemptsRemaining }} essai(s) restant(s)</p>
                          <p class="mt-0.5 text-sm text-amber-700">Révisez la correction ci-dessous puis repassez l'examen.</p>
                        </div>
                      </div>
                    } @else {
                      <div class="mt-4 flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-4">
                        <mat-icon class="mt-0.5 shrink-0 !text-red-500">cancel</mat-icon>
                        <div>
                          <p class="font-bold text-red-800">Essais épuisés</p>
                          <p class="mt-0.5 text-sm text-red-700">Contactez votre formateur pour plus d'informations.</p>
                        </div>
                      </div>
                    }

                    <!-- Correction detail -->
                    @if ((ax.reviewQuestions ?? []).length) {
                      <div class="mt-6 space-y-3">
                        <h4 class="font-serif text-lg text-[var(--color-brand-green-900)]">Correction détaillée</h4>
                        @for (r of ax.reviewQuestions!; track r.id; let i = $index) {
                          <div class="rounded-[18px] border p-4"
                               [class.border-emerald-200]="r.isCorrect"
                               [class.bg-emerald-50]="r.isCorrect"
                               [class.border-red-200]="!r.isCorrect"
                               [class.bg-red-50]="!r.isCorrect">
                            <div class="flex items-start justify-between gap-3">
                              <p class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ r.prompt }}</p>
                              <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                                    [class.bg-emerald-100]="r.isCorrect"
                                    [class.text-emerald-800]="r.isCorrect"
                                    [class.bg-red-100]="!r.isCorrect"
                                    [class.text-red-700]="!r.isCorrect">
                                {{ r.isCorrect ? 'Correct' : 'Erreur' }}
                              </span>
                            </div>
                            <div class="mt-2 grid gap-1.5 text-xs">
                              <div class="rounded-xl bg-white px-3 py-2 text-[var(--color-brand-green-900)]">
                                <span class="font-semibold">Votre réponse : </span>
                                {{ r.selectedIndex >= 0 ? (letter(r.selectedIndex) + ' — ' + r.selectedOption) : 'Aucune réponse' }}
                              </div>
                              @if (!r.isCorrect) {
                                <div class="rounded-xl bg-white px-3 py-2 text-emerald-700">
                                  <span class="font-semibold">Bonne réponse : </span>
                                  {{ letter(r.correctIndex) }} — {{ r.correctOption }}
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                } @else {
                  <!-- ── QUESTIONS FORM ── -->
                  <div class="border-t border-[var(--color-brand-gold-300)]/20 px-5 pb-6">

                    <!-- Timer + progress bar -->
                    <div class="mt-4 flex items-center justify-between gap-4 rounded-[18px] bg-[var(--color-brand-cream)] px-4 py-3">
                      <div class="flex items-center gap-3">
                        <mat-icon class="!text-[var(--color-brand-gold-600)]">timer</mat-icon>
                        <span class="text-xl font-bold text-[var(--color-brand-green-900)]">{{ formatTime(timeRemainingSeconds()) }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm text-[var(--color-brand-green-800)]/60">
                        <span class="font-semibold text-[var(--color-brand-green-900)]">{{ answeredCount() }}</span>
                        / {{ (ax.questions ?? []).length }} répondues
                      </div>
                    </div>

                    <!-- Question navigator -->
                    <div class="mt-3 flex flex-wrap gap-1.5">
                      @for (q of ax.questions ?? []; track q.id; let qi = $index) {
                        <button type="button" (click)="scrollToQ(qi)"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition"
                                [class.bg-emerald-500]="answeredMask()[qi]"
                                [class.text-white]="answeredMask()[qi]"
                                [class.bg-[var(--color-brand-cream)]]="!answeredMask()[qi]"
                                [class.text-[var(--color-brand-green-800)]]="!answeredMask()[qi]">
                          {{ qi + 1 }}
                        </button>
                      }
                    </div>

                    <!-- Questions -->
                    <form class="mt-4 space-y-4" (ngSubmit)="submit()">
                      @for (q of ax.questions ?? []; track q.id; let qi = $index) {
                        <article [id]="'q-' + qi" class="scroll-mt-4 rounded-[20px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ qi + 1 }}. {{ q.prompt }}</p>
                            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[var(--color-brand-gold-700)]">{{ q.points }} pt</span>
                          </div>
                          <div class="mt-3 grid gap-1.5">
                            @for (opt of q.options; track opt; let oi = $index) {
                              <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm transition hover:shadow-sm">
                                <input type="radio" [name]="'q' + qi" [value]="oi"
                                       [formControl]="controls.at(qi)"
                                       (change)="onAnswer(qi)" class="sr-only" />
                                <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition"
                                      [class.bg-emerald-500]="controls.at(qi).value === oi"
                                      [class.bg-gray-700]="controls.at(qi).value !== oi">
                                  {{ letter(oi) }}
                                </span>
                                <span class="text-[var(--color-brand-green-900)]">{{ opt }}</span>
                              </label>
                            }
                          </div>
                        </article>
                      }

                      @if (submitError()) {
                        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ submitError() }}</div>
                      }

                      <div class="flex flex-wrap items-center gap-3 pt-1">
                        <button type="submit" [disabled]="submitting()"
                                class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-60">
                          <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                          {{ submitting() ? 'Validation...' : "Valider l'examen" }}
                        </button>
                        @if (answeredCount() < (ax.questions ?? []).length) {
                          <span class="text-xs text-amber-600">
                            {{ (ax.questions ?? []).length - answeredCount() }} question(s) sans réponse
                          </span>
                        }
                      </div>
                    </form>
                  </div>
                }

              }
            }
          </div>
        }

        @if (!exams().length) {
          <div class="rounded-[24px] bg-white p-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
            <mat-icon class="!h-12 !w-12 !text-[48px] text-[var(--color-brand-green-800)]/20">quiz</mat-icon>
            <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/50">Aucun examen disponible pour le moment.</p>
          </div>
        }

      </div>
    </app-dashboard-layout>
  `,
})
export class StudentExamsComponent implements OnInit, OnDestroy {
  private portal = inject(StudentPortalService);
  private fb     = inject(FormBuilder);
  private timer: ReturnType<typeof setInterval> | null = null;

  menuItems = [...STUDENT_MENU_ITEMS];

  exams              = signal<StudentExam[]>([]);
  openId             = signal<string | null>(null);
  activeExam         = signal<StudentExam | null>(null);
  submitting         = signal(false);
  submitError        = signal('');
  timeRemainingSeconds = signal(0);
  controls           = this.fb.array<FormControl<number | null>>([]);
  answeredMask       = signal<boolean[]>([]);
  answeredCount      = computed(() => this.answeredMask().filter(Boolean).length);

  ngOnInit(): void { this.portal.getExams().subscribe(d => this.exams.set(d)); }
  ngOnDestroy(): void { this.stopTimer(); }

  openExam(exam: StudentExam): void {
    this.stopTimer();
    this.buildControls(exam.questions?.length ?? 0);
    this.openId.set(exam.id);
    this.activeExam.set(exam);
    this.submitError.set('');
    this.startTimer(exam.durationMinutes);
    this.scrollTo(exam.id);
  }

  openResult(exam: StudentExam): void {
    this.stopTimer();
    this.controls.clear();
    this.openId.set(exam.id);
    this.activeExam.set(exam);
    this.submitError.set('');
    this.scrollTo(exam.id);
  }

  openRetry(exam: StudentExam): void {
    this.stopTimer();
    this.buildControls(exam.questions?.length ?? 0);
    this.openId.set(exam.id);
    this.activeExam.set({ ...exam, score: null, passed: null, percentage: null, rawScore: null, reviewQuestions: undefined });
    this.submitError.set('');
    this.startTimer(exam.durationMinutes);
    this.scrollTo(exam.id);
  }

  close(): void {
    this.stopTimer();
    this.openId.set(null);
    this.activeExam.set(null);
    this.submitError.set('');
    this.controls.clear();
    this.answeredMask.set([]);
  }

  onAnswer(i: number): void {
    this.answeredMask.update(m => { const n = [...m]; n[i] = true; return n; });
  }

  scrollToQ(i: number): void {
    document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollTo(examId: string): void {
    setTimeout(() => document.getElementById(`exam-${examId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  buildControls(count: number): void {
    this.controls.clear();
    this.answeredMask.set(new Array(count).fill(false));
    for (let i = 0; i < count; i++) this.controls.push(new FormControl<number | null>(null));
    this.submitting.set(false);
  }

  startTimer(minutes: number): void {
    this.timeRemainingSeconds.set(Math.max(60, minutes * 60));
    this.timer = setInterval(() => {
      const next = this.timeRemainingSeconds() - 1;
      this.timeRemainingSeconds.set(next);
      if (next <= 0) { this.stopTimer(); this.submit(true); }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  submit(auto = false): void {
    const exam = this.activeExam();
    if (!exam || this.submitting()) return;
    this.submitting.set(true);
    if (auto) this.submitError.set('Temps écoulé — examen soumis automatiquement.');

    const answers = this.controls.controls.map(c =>
      c.value === null || Number.isNaN(Number(c.value)) ? -1 : Number(c.value)
    );

    console.log('[EXAM] submit', exam.id, answers);

    this.portal.submitExam(exam.id, answers).subscribe({
      next: (data) => {
        this.stopTimer();
        this.controls.clear();
        this.submitting.set(false);
        this.exams.set(data);
        const refreshed = data.find(e => e.id === exam.id) ?? null;
        console.log('[EXAM] POST result — score=', refreshed?.score, 'pct=', refreshed?.percentage, 'passed=', refreshed?.passed);
        if (refreshed?.score !== null && refreshed?.score !== undefined) {
          this.activeExam.set(refreshed);
        } else {
          // POST response didn't include a graded result → fetch fresh from GET
          console.warn('[EXAM] score null in POST response, falling back to GET /exams');
          this.portal.getExams().subscribe({
            next: (fresh) => {
              this.exams.set(fresh);
              const freshExam = fresh.find(e => e.id === exam.id) ?? null;
              console.log('[EXAM] GET fallback — score=', freshExam?.score);
              this.activeExam.set(freshExam);
              if (!freshExam || freshExam.score === null) {
                this.submitError.set('Résultat non disponible — actualisez la page.');
              }
            },
            error: () => this.submitError.set('Résultat non disponible — actualisez la page.'),
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.stopTimer();
        this.submitting.set(false);
        console.error('[EXAM] submit error', err.status, err.error);
        const msg = typeof err.error === 'object' && err.error?.error
          ? String(err.error.error)
          : err.status === 0
            ? 'Erreur réseau — vérifiez votre connexion.'
            : err.status === 401
              ? 'Session expirée — reconnectez-vous.'
              : err.status === 403
                ? 'Examen non accessible. Contactez votre formatrice.'
                : err.status === 400
                  ? "Nombre d'essais épuisé pour cet examen."
                  : "Erreur lors de l'envoi des réponses.";
        this.submitError.set(msg);
      },
    });
  }

  /* ── Formatters ── */
  letter(i: number): string { return String.fromCharCode(65 + i); }
  pct(v: number | null): string { return v === null ? '-' : `${v}%`; }
  rawScore(v: number | null, max: number): string { return v === null ? '-' : `${v}/${max}`; }
  threshold(e: StudentExam): string { return e.gradingScaleMax === 100 ? `${e.passThreshold}%` : `${e.passThreshold}/${e.gradingScaleMax}`; }
  formatTime(s: number): string {
    const m = Math.floor(Math.max(s, 0) / 60);
    return `${String(m).padStart(2,'0')}:${String(Math.max(s,0)%60).padStart(2,'0')}`;
  }
  correctCount(e: StudentExam): number {
    return e.reviewQuestions?.filter(q => q.isCorrect).length ?? 0;
  }
  totalQ(e: StudentExam): number {
    return e.reviewQuestions?.length ?? e.questions?.length ?? 0;
  }
}
