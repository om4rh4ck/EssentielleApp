import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
            Répondez aux questions et validez pour voir votre résultat immédiatement.
          </p>
        </div>

        <!-- Exam cards -->
        @for (exam of exams(); track exam.id) {
          <div [attr.id]="'exam-' + exam.id"
               class="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.04)]"
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
                  {{ exam.courseTitle }} · Seuil {{ threshold(exam) }}
                  @if (exam.score !== null) { · Moyenne classe {{ pct(exam.average) }} }
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
                    @if (exam.questions?.length) {
                      <button type="button" (click)="openExam(exam)"
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
                        &mdash; {{ correctCount(ax) }}/{{ totalQ(ax) }} bonne(s) réponse(s)
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
                    } @else {
                      <div class="mt-4 flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4">
                        <mat-icon class="mt-0.5 shrink-0 !text-amber-600">replay</mat-icon>
                        <div>
                          <p class="font-bold text-amber-800">Seuil non atteint — vous pouvez repasser l'examen</p>
                          <p class="mt-0.5 text-sm text-amber-700">Révisez la correction ci-dessous puis repassez.</p>
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
                    <form class="mt-4 space-y-4" (ngSubmit)="submit()">
                      @for (q of ax.questions ?? []; track q.id; let qi = $index) {
                        <article class="rounded-[20px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ qi + 1 }}. {{ q.prompt }}</p>
                            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[var(--color-brand-gold-700)]">{{ q.points }} pt</span>
                          </div>
                          <div class="mt-3 grid gap-1.5">
                            @for (opt of q.options; track opt; let oi = $index) {
                              <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm transition hover:shadow-sm">
                                <input type="radio" [name]="'q' + qi" [value]="oi"
                                       [formControl]="controls.at(qi)"
                                       class="sr-only" />
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

                      <button type="submit" [disabled]="submitting()"
                              class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-60">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                        {{ submitting() ? 'Validation en cours...' : "Valider l'examen" }}
                      </button>
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

        <!-- ── Score popup ── -->
        @if (resultPopup(); as popup) {
          <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
               (click)="closeResultPopup()">
            <div class="w-full max-w-md overflow-hidden rounded-t-[32px] bg-white shadow-[0_-8px_80px_rgba(0,0,0,0.3)] sm:rounded-[32px]"
                 (click)="$event.stopPropagation()">

              <!-- Colored header -->
              <div class="relative px-6 py-10 text-center"
                   [class.bg-emerald-500]="popup.passed"
                   [class.bg-red-500]="!popup.passed">
                <button type="button" (click)="closeResultPopup()"
                        class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30">
                  <mat-icon class="!h-5 !w-5 !text-[20px]">close</mat-icon>
                </button>
                <mat-icon class="!h-14 !w-14 !text-[56px] text-white">
                  {{ popup.passed ? 'verified' : 'cancel' }}
                </mat-icon>
                <h2 class="mt-3 font-serif text-3xl font-bold text-white">
                  {{ popup.passed ? 'Félicitations !' : 'Résultat enregistré' }}
                </h2>
                <p class="mt-1 text-sm text-white/80">{{ popup.title }}</p>
              </div>

              <!-- Score -->
              <div class="px-6 py-6 text-center">
                <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-brand-green-800)]/50">Votre note finale</p>
                <div class="mt-1 text-8xl font-black leading-none tabular-nums"
                     [class.text-emerald-600]="popup.passed"
                     [class.text-red-500]="!popup.passed">
                  {{ popup.scoreLabel }}
                </div>
                <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/65">
                  <span class="font-semibold text-[var(--color-brand-green-900)]">{{ popup.correctAnswers }}</span>
                  bonne(s) réponse(s) sur
                  <span class="font-semibold text-[var(--color-brand-green-900)]">{{ popup.totalQuestions }}</span>
                </p>
              </div>

              <!-- Formula -->
              <div class="mx-5 mb-5 rounded-[18px] bg-[var(--color-brand-cream)] px-4 py-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/50">Calcul du barème</p>
                <p class="mt-2 text-sm text-[var(--color-brand-green-900)]">
                  ({{ popup.rawScore }} pts ÷ {{ popup.rawMaxScore }} pts) × {{ popup.gradingScaleMax }}
                  = <span class="font-bold">{{ popup.scoreLabel }}</span>
                </p>
                <p class="mt-1 text-xs"
                   [class.text-emerald-700]="popup.passed"
                   [class.text-red-500]="!popup.passed">
                  {{ popup.passed ? 'Seuil de validation atteint !' : 'Seuil de validation non atteint.' }}
                </p>
              </div>

              <div class="flex justify-center px-5 pb-8">
                <button type="button" (click)="closeResultPopup()"
                        class="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white transition"
                        [class.bg-emerald-600]="popup.passed"
                        [class.bg-red-500]="!popup.passed">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">grading</mat-icon>
                  Voir la correction détaillée
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </app-dashboard-layout>
  `,
})
export class StudentExamsComponent implements OnInit {
  private portal  = inject(StudentPortalService);
  private fb      = inject(FormBuilder);

  menuItems  = [...STUDENT_MENU_ITEMS];
  exams      = signal<StudentExam[]>([]);
  openId     = signal<string | null>(null);
  activeExam = signal<StudentExam | null>(null);
  submitting = signal(false);
  submitError = signal('');
  controls   = this.fb.array<FormControl<number | null>>([]);

  resultPopup = signal<{
    title: string;
    passed: boolean;
    scoreLabel: string;
    rawScore: number;
    rawMaxScore: number;
    gradingScaleMax: number;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);

  ngOnInit(): void { this.portal.getExams().subscribe(d => this.exams.set(d)); }

  openExam(exam: StudentExam): void {
    this.buildControls(exam.questions?.length ?? 0);
    this.openId.set(exam.id);
    this.activeExam.set({ ...exam, score: null, passed: null, percentage: null, rawScore: null, reviewQuestions: undefined });
    this.submitError.set('');
    this.scrollTo(exam.id);
  }

  openResult(exam: StudentExam): void {
    this.controls.clear();
    this.openId.set(exam.id);
    this.activeExam.set(exam);
    this.submitError.set('');
    this.scrollTo(exam.id);
  }

  close(): void {
    this.openId.set(null);
    this.activeExam.set(null);
    this.submitError.set('');
    this.controls.clear();
  }

  closeResultPopup(): void { this.resultPopup.set(null); }

  buildControls(count: number): void {
    this.controls.clear();
    for (let i = 0; i < count; i++) this.controls.push(new FormControl<number | null>(null));
    this.submitting.set(false);
  }

  scrollTo(examId: string): void {
    setTimeout(() => document.getElementById(`exam-${examId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  submit(): void {
    const exam = this.activeExam();
    if (!exam || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set('');

    const answers: Record<string, number> = {};
    (exam.questions ?? []).forEach((q, qi) => {
      const c = this.controls.at(qi);
      answers[q.id] = (c && c.value !== null && !Number.isNaN(Number(c.value))) ? Number(c.value) : -1;
    });

    this.portal.submitExam(exam.id, answers).subscribe({
      next: (data) => {
        this.controls.clear();
        this.submitting.set(false);
        this.exams.set(data);
        const refreshed = data.find(e => e.id === exam.id) ?? null;
        if (refreshed?.score !== null && refreshed?.score !== undefined) {
          this.activeExam.set(refreshed);
          this.openResultPopup(refreshed);
        } else {
          this.portal.getExams().subscribe({
            next: (fresh) => {
              this.exams.set(fresh);
              const freshExam = fresh.find(e => e.id === exam.id) ?? null;
              this.activeExam.set(freshExam);
              if (freshExam?.score !== null && freshExam?.score !== undefined) {
                this.openResultPopup(freshExam!);
              } else {
                this.submitError.set('Résultat non disponible — actualisez la page.');
              }
            },
            error: () => this.submitError.set('Résultat non disponible — actualisez la page.'),
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const msg = typeof err.error === 'object' && err.error?.error
          ? String(err.error.error)
          : err.status === 0   ? 'Erreur réseau — vérifiez votre connexion.'
          : err.status === 401 ? 'Session expirée — reconnectez-vous.'
          : err.status === 403 ? 'Examen non accessible. Contactez votre formatrice.'
          : "Erreur lors de l'envoi des réponses.";
        this.submitError.set(msg);
      },
    });
  }

  /* Formatters */
  letter(i: number): string { return String.fromCharCode(65 + i); }
  pct(v: number | null): string { return v === null ? '-' : `${v}%`; }
  rawScore(v: number | null, max: number): string { return v === null ? '-' : `${v}/${max}`; }
  threshold(e: StudentExam): string {
    return e.gradingScaleMax === 100 ? `${e.passThreshold}%` : `${e.passThreshold}/${e.gradingScaleMax}`;
  }
  correctCount(e: StudentExam): number {
    return e.reviewQuestions?.filter(q => q.isCorrect).length ?? 0;
  }
  totalQ(e: StudentExam): number {
    return e.reviewQuestions?.length ?? e.questions?.length ?? 0;
  }
  formatScore(e: StudentExam): string {
    return e.score === null ? '-' : `${e.score}/${e.gradingScaleMax}`;
  }

  openResultPopup(e: StudentExam): void {
    if (e.score === null || e.rawScore === null) return;
    this.resultPopup.set({
      title:          e.title,
      passed:         !!e.passed,
      scoreLabel:     this.formatScore(e),
      rawScore:       e.rawScore,
      rawMaxScore:    e.rawMaxScore,
      gradingScaleMax: e.gradingScaleMax,
      correctAnswers: this.correctCount(e),
      totalQuestions: this.totalQ(e),
    });
  }
}
