import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
            Retrouvez ici votre examen final, votre note automatique, la moyenne de la promotion et la correction complete question par question.
          </p>
        </div>

        @if (activeExam(); as exam) {
          <section class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ exam.courseTitle }}</div>
                <h3 class="mt-2 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
                <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/75">
                  {{ exam.examType === 'final' ? 'Examen final certifiant' : 'Quiz numerique' }}
                  · {{ exam.durationMinutes }} min
                  · Seuil de reussite {{ exam.passThreshold }}/{{ exam.gradingScaleMax }}
                </p>
              </div>
              <button type="button" (click)="closeExam()" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">Fermer</button>
            </div>

            @if (exam.score !== null) {
              <div class="mt-8 grid gap-4 md:grid-cols-4">
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Votre note</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ exam.score }}/{{ exam.gradingScaleMax }}</div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne examen</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ exam.average }}/{{ exam.gradingScaleMax }}</div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Resultat</div>
                  <div class="mt-2 text-2xl font-bold" [class.text-emerald-700]="exam.passed" [class.text-red-600]="exam.passed === false">
                    {{ exam.passed ? 'Reussi' : 'Non valide' }}
                  </div>
                </div>
                <div class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Essais</div>
                  <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ exam.attemptsUsed }}/{{ exam.maxAttempts }}</div>
                </div>
              </div>

              @if (exam.passed && exam.examType === 'final') {
                <div class="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
                  Note superieure a 70%. Votre certificat peut maintenant etre vu dans la section certificats.
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
                        {{ review.selectedOption || 'Aucune reponse' }}
                      </div>
                      <div class="rounded-2xl bg-white px-4 py-3 text-[var(--color-brand-green-900)]">
                        <span class="font-semibold">Bonne reponse :</span>
                        {{ review.correctOption }}
                      </div>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <form class="mt-8 space-y-6" (ngSubmit)="submitExam()">
                @for (question of exam.questions ?? []; track question.id; let i = $index) {
                  <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                    <div class="flex items-start justify-between gap-4">
                      <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ question.prompt }}</h4>
                      <span class="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ question.points }} pt{{ question.points > 1 ? 's' : '' }}</span>
                    </div>
                    <div class="mt-4 grid gap-3">
                      @for (option of question.options; track option; let optionIndex = $index) {
                        <label class="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[var(--color-brand-green-900)]">
                          <input type="radio" [value]="optionIndex" [formControl]="answerControls.at(i)" />
                          <span>{{ option }}</span>
                        </label>
                      }
                    </div>
                  </article>
                }

                @if (submitError()) {
                  <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ submitError() }}</div>
                }

                <button type="submit" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                  Valider l'examen
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
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.average }}/{{ exam.gradingScaleMax }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Seuil</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.passThreshold }}/{{ exam.gradingScaleMax }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Essais</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.attemptsRemaining }}/{{ exam.maxAttempts }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Votre note</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.score === null ? '-' : (exam.score + '/' + exam.gradingScaleMax) }}</div>
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
export class StudentExamsComponent implements OnInit {
  private portal = inject(StudentPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...STUDENT_MENU_ITEMS];
  exams = signal<StudentExam[]>([]);
  activeExam = signal<StudentExam | null>(null);
  submitError = signal('');
  answerControls = this.fb.array<FormControl<number | null>>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.portal.getExams().subscribe((data) => this.exams.set(data));
  }

  openExam(exam: StudentExam, reviewOnly: boolean): void {
    this.submitError.set('');
    this.answerControls.clear();
    if (!reviewOnly) {
      for (let i = 0; i < (exam.questions?.length ?? 0); i += 1) {
        this.answerControls.push(new FormControl<number | null>(null));
      }
    }
    this.activeExam.set(reviewOnly ? { ...exam, questions: undefined } : exam);
  }

  openExamForRetry(exam: StudentExam): void {
    this.activeExam.set({ ...exam, score: null, passed: null, reviewQuestions: undefined });
    this.submitError.set('');
    this.answerControls.clear();
    for (let i = 0; i < (exam.questions?.length ?? 0); i += 1) {
      this.answerControls.push(new FormControl<number | null>(null));
    }
  }

  closeExam(): void {
    this.activeExam.set(null);
    this.submitError.set('');
    this.answerControls.clear();
  }

  submitExam(): void {
    const exam = this.activeExam();
    if (!exam) return;
    const answers = this.answerControls.controls.map((control) => Number(control.value));
    if (answers.some((value) => Number.isNaN(value))) return;
    this.portal.submitExam(exam.id, answers).subscribe({
      next: (data) => {
        this.exams.set(data);
        const refreshedExam = data.find((item) => item.id === exam.id) ?? null;
        this.activeExam.set(refreshedExam);
        this.answerControls.clear();
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(error.error?.error ?? 'Impossible d envoyer les reponses pour le moment.');
      },
    });
  }
}
