import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { StudentExam, StudentPortalService } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Examen & Moyenne" [menuItems]="menuItems">
      <div class="space-y-6">
        <div class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-8 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Examens, devoirs et moyennes</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-brand-green-800)]/70">
            Retrouvez ici votre examen final structure, votre resultat reel sur 100%, la moyenne generale du QCM et la correction detaillee question par question.
          </p>
        </div>

        @if (activeExam(); as exam) {
          <section id="active-exam-panel" class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ exam.courseTitle }}</div>
                <h3 class="mt-2 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
                <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/75">
                  {{ exam.examType === 'final' ? 'Examen final structure' : 'Quiz structure' }}
                  · Duree officielle {{ exam.durationMinutes }} min
                  · Seuil de reussite {{ formatThreshold(exam) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                @if (exam.score === null) {
                  <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/35 bg-[var(--color-brand-cream)] px-4 py-3 text-center">
                    <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/55">Temps restant</div>
                    <div class="mt-1 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ formatTime(timeRemainingSeconds()) }}</div>
                  </div>
                }
                <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/35 bg-[var(--color-brand-cream)] px-4 py-3 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/55">Essais</div>
                  <div class="mt-1 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ exam.attemptsUsed }}/{{ exam.maxAttempts }}</div>
                </div>
                <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/35 bg-[var(--color-brand-cream)] px-4 py-3 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/55">Questions</div>
                  <div class="mt-1 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ exam.questions?.length ?? exam.reviewQuestions?.length ?? 0 }}</div>
                </div>
                <button type="button" (click)="closeExam()" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  Fermer
                </button>
              </div>
            </div>

            @if (exam.score !== null) {
              <div class="mt-8 grid gap-4 md:grid-cols-4">
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Score brut</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ formatRawScore(exam.rawScore, exam.rawMaxScore) }}</div>
                  <div class="mt-2 text-sm text-[var(--color-brand-green-800)]/65">0,5 point par bonne reponse</div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Note finale</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ formatScore(exam.score, exam.gradingScaleMax) }}</div>
                  <div class="mt-2 text-sm text-[var(--color-brand-green-800)]/65">Resultat reel ramene sur 10</div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Resultat</div>
                  <div class="mt-2 text-2xl font-bold" [class.text-emerald-700]="exam.passed" [class.text-red-600]="exam.passed === false">
                    {{ exam.passed ? 'Reussi' : 'Non valide' }}
                  </div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne examen</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ formatScore(exam.average, exam.gradingScaleMax) }}</div>
                  <div class="mt-2 text-sm text-[var(--color-brand-green-800)]/65">Moyenne reelle sur 10</div>
                </div>
              </div>

              @if (exam.passed && exam.examType === 'final') {
                <div class="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
                  Resultat valide. Votre certificat est disponible dans la section certificats.
                </div>
              }

              <div class="mt-8 space-y-4">
                <h4 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Correction detaillee</h4>
                @for (review of exam.reviewQuestions ?? []; track review.id; let i = $index) {
                  <article class="rounded-[24px] border p-5" [class.border-emerald-200]="review.isCorrect" [class.bg-emerald-50]="review.isCorrect" [class.border-red-200]="!review.isCorrect" [class.bg-red-50]="!review.isCorrect">
                    <div class="flex items-start justify-between gap-4">
                      <h5 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ review.prompt }}</h5>
                      <span class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]" [class.bg-emerald-100]="review.isCorrect" [class.text-emerald-800]="review.isCorrect" [class.bg-red-100]="!review.isCorrect" [class.text-red-700]="!review.isCorrect">
                        {{ review.isCorrect ? 'Bonne reponse' : 'Erreur' }}
                      </span>
                    </div>
                    <div class="mt-4 grid gap-3 text-sm">
                      <div class="rounded-2xl bg-white px-4 py-3 text-[var(--color-brand-green-900)]">
                        <span class="font-semibold">Votre reponse :</span>
                        {{ review.selectedIndex >= 0 ? (optionLetter(review.selectedIndex) + ' - ' + review.selectedOption) : 'Aucune reponse' }}
                      </div>
                      <div class="rounded-2xl bg-white px-4 py-3 text-[var(--color-brand-green-900)]">
                        <span class="font-semibold">Bonne reponse :</span>
                        {{ optionLetter(review.correctIndex) }} - {{ review.correctOption }}
                      </div>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="mt-8 rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[#fffaf2] px-5 py-4 text-sm leading-7 text-[var(--color-brand-green-800)]/78">
                Repondez a chaque question en selectionnant une proposition A, B, C ou D. Chaque bonne reponse vaut 0,5 point. Le score brut est ensuite ramene sur 10 pour afficher la note finale.
              </div>

              <form class="mt-8 space-y-6" (ngSubmit)="submitExam()">
                @for (question of exam.questions ?? []; track question.id; let i = $index) {
                  <article class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[var(--color-brand-cream)] p-5">
                    <div class="flex items-start justify-between gap-4">
                      <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ question.prompt }}</h4>
                      <span class="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ question.points }} pt{{ question.points > 1 ? 's' : '' }}</span>
                    </div>
                    <div class="mt-4 grid gap-3">
                      @for (option of question.options; track option; let optionIndex = $index) {
                        <label class="flex items-center gap-3 rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-[var(--color-brand-green-900)] transition hover:border-[var(--color-brand-gold-300)]">
                          <input type="radio" [name]="'question-' + i" [value]="optionIndex" [formControl]="answerControls.at(i)" />
                          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-green-900)] text-xs font-bold text-white">{{ optionLetter(optionIndex) }}</span>
                          <span>{{ option }}</span>
                        </label>
                      }
                    </div>
                  </article>
                }

                @if (submitError()) {
                  <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ submitError() }}</div>
                }

                <button type="submit" [disabled]="submitInProgress()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-60">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                  {{ submitInProgress() ? 'Validation en cours...' : 'Valider l examen' }}
                </button>
              </form>
            }
          </section>
        }

        <div class="grid gap-6">
          @for (exam of exams(); track exam.id) {
            <article class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
              <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div class="max-w-2xl">
                  <div class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">
                    {{ exam.courseTitle }}
                  </div>
                  <h3 class="mt-3 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
                  <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/75">
                    Affecte par {{ exam.assignedBy }} · echeance {{ exam.dueDate | date:'dd/MM/yyyy' }}
                  </p>
                </div>

                <div class="grid min-w-[340px] grid-cols-2 gap-3">
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Type</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.examType === 'final' ? 'Examen final' : 'Quiz' }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Duree</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.durationMinutes }} min</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatScore(exam.average, exam.gradingScaleMax) }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Seuil</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatThreshold(exam) }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Essais restants</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.attemptsRemaining }}/{{ exam.maxAttempts }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Votre note</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatScore(exam.score, exam.gradingScaleMax) }}</div>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex flex-wrap gap-3">
                @if (exam.score === null && exam.questions?.length) {
                  <button type="button" (click)="openExam(exam, false)" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">play_circle</mat-icon>
                    Passer l'examen
                  </button>
                }

                @if (exam.score !== null) {
                  <button type="button" (click)="openExam(exam, true)" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">grading</mat-icon>
                    Voir correction
                  </button>
                }

                @if (exam.score !== null && exam.attemptsRemaining > 0 && exam.questions?.length) {
                  <button type="button" (click)="openExamForRetry(exam)" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">replay</mat-icon>
                    Repasser l'examen
                  </button>
                }
              </div>
            </article>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `,
})
export class StudentExamsComponent implements OnInit, OnDestroy {
  private portal = inject(StudentPortalService);
  private fb = inject(FormBuilder);
  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  menuItems = [...STUDENT_MENU_ITEMS];
  exams = signal<StudentExam[]>([]);
  activeExam = signal<StudentExam | null>(null);
  submitError = signal('');
  submitInProgress = signal(false);
  timeRemainingSeconds = signal(0);
  answerControls = this.fb.array<FormControl<number | null>>([]);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  load(): void {
    this.portal.getExams().subscribe((data) => this.exams.set(data));
  }

  scrollToActiveExam(): void {
    setTimeout(() => {
      document.getElementById('active-exam-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  openExam(exam: StudentExam, reviewOnly: boolean): void {
    this.submitError.set('');
    this.stopTimer();
    this.answerControls.clear();
    this.submitInProgress.set(false);

    if (!reviewOnly) {
      for (let i = 0; i < (exam.questions?.length ?? 0); i += 1) {
        this.answerControls.push(new FormControl<number | null>(null));
      }
      this.startTimer(exam.durationMinutes);
    }

    this.activeExam.set(reviewOnly ? { ...exam, questions: undefined } : exam);
    this.scrollToActiveExam();
  }

  openExamForRetry(exam: StudentExam): void {
    this.stopTimer();
    this.activeExam.set({ ...exam, score: null, passed: null, reviewQuestions: undefined });
    this.submitError.set('');
    this.submitInProgress.set(false);
    this.answerControls.clear();

    for (let i = 0; i < (exam.questions?.length ?? 0); i += 1) {
      this.answerControls.push(new FormControl<number | null>(null));
    }

    this.startTimer(exam.durationMinutes);
    this.scrollToActiveExam();
  }

  closeExam(): void {
    this.stopTimer();
    this.activeExam.set(null);
    this.submitError.set('');
    this.submitInProgress.set(false);
    this.timeRemainingSeconds.set(0);
    this.answerControls.clear();
  }

  startTimer(durationMinutes: number): void {
    const initialSeconds = Math.max(60, durationMinutes * 60);
    this.timeRemainingSeconds.set(initialSeconds);
    this.countdownHandle = setInterval(() => {
      const nextValue = this.timeRemainingSeconds() - 1;
      this.timeRemainingSeconds.set(nextValue);
      if (nextValue <= 0) {
        this.stopTimer();
        this.submitExam(true);
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.countdownHandle) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }

  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
    const seconds = Math.max(totalSeconds, 0) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  formatScore(score: number | null, scaleMax: number): string {
    if (score === null) return '-';
    return `${score}/${scaleMax}`;
  }

  formatRawScore(score: number | null, scaleMax: number): string {
    if (score === null) return '-';
    return `${score}/${scaleMax}`;
  }

  formatThreshold(exam: StudentExam): string {
    return `${exam.passThreshold}/${exam.gradingScaleMax}`;
  }

  submitExam(autoSubmit = false): void {
    const exam = this.activeExam();
    if (!exam || this.submitInProgress()) return;

    this.submitInProgress.set(true);
    if (autoSubmit) {
      this.submitError.set('Temps ecoule. L examen a ete valide automatiquement.');
    }

    const answers = this.answerControls.controls.map((control) =>
      control.value === null || Number.isNaN(Number(control.value)) ? -1 : Number(control.value)
    );

    this.portal.submitExam(exam.id, answers).subscribe({
      next: (data) => {
        this.stopTimer();
        this.exams.set(data);
        const refreshedExam = data.find((item) => item.id === exam.id) ?? null;
        this.activeExam.set(refreshedExam);
        this.answerControls.clear();
        this.submitInProgress.set(false);
        this.scrollToActiveExam();
      },
      error: (error: HttpErrorResponse) => {
        this.submitInProgress.set(false);
        this.submitError.set(error.error?.error ?? 'Impossible d envoyer les reponses pour le moment.');
      },
    });
  }
}
