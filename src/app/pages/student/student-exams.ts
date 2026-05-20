import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
            Retrouvez ici votre examen final structure, votre note reelle en pourcentage, la moyenne generale du QCM et la correction detaillee question par question.
          </p>
        </div>

        @if (latestResultExam(); as resultExam) {
          <section class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">Resultat du QCM</div>
                <h3 class="mt-2 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ resultExam.title }}</h3>
                <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/75">
                  Formule : earnedScore / totalPoints &times; 100 = pourcentage.
                  {{ correctAnswersCount(resultExam) }}/{{ totalQuestions(resultExam) }} bonnes reponses
                  &rarr; {{ resultExam.rawScore }}/{{ resultExam.rawMaxScore }} pts
                  &rarr; {{ formatPct(resultExam.percentage) }}.
                </p>
              </div>

              <div class="grid min-w-[340px] grid-cols-2 gap-3">
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Bonnes reponses</div>
                  <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ correctAnswersCount(resultExam) }}/{{ totalQuestions(resultExam) }}</div>
                </div>
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Score brut</div>
                  <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatRawScore(resultExam.rawScore, resultExam.rawMaxScore) }}</div>
                </div>
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Pourcentage</div>
                  <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatPct(resultExam.percentage) }}</div>
                </div>
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne classe</div>
                  <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatPct(resultExam.average) }}</div>
                </div>
              </div>
            </div>
          </section>
        }

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
              <!-- Bloc score central style Cisco NetAcad -->
              <div class="mt-8 flex flex-col items-center gap-2 rounded-[28px] py-8" [class.bg-emerald-50]="exam.passed" [class.bg-red-50]="exam.passed === false">
                <div class="text-[11px] font-bold uppercase tracking-[0.2em]" [class.text-emerald-700]="exam.passed" [class.text-red-500]="exam.passed === false">
                  {{ exam.passed ? 'EXAMEN REUSSI' : 'EXAMEN NON VALIDE' }}
                </div>
                <div class="text-7xl font-black leading-none" [class.text-emerald-700]="exam.passed" [class.text-red-600]="exam.passed === false">
                  {{ formatPct(exam.percentage) }}
                </div>
                <div class="text-sm opacity-75" [class.text-emerald-600]="exam.passed" [class.text-red-500]="exam.passed === false">
                  {{ formatRawScore(exam.rawScore, exam.rawMaxScore) }} pts
                  &mdash; Seuil : {{ formatThreshold(exam) }}
                </div>
              </div>

              <!-- Stats -->
              <div class="mt-6 grid gap-3 sm:grid-cols-4">
                <div class="rounded-[20px] bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Bonnes reponses</div>
                  <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ correctAnswersCount(exam) }}/{{ totalQuestions(exam) }}</div>
                </div>
                <div class="rounded-[20px] bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Score brut</div>
                  <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ formatRawScore(exam.rawScore, exam.rawMaxScore) }}</div>
                  <div class="text-xs text-[var(--color-brand-green-800)]/50">pts gagnes</div>
                </div>
                <div class="rounded-[20px] bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Essais utilises</div>
                  <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ exam.attemptsUsed }}/{{ exam.maxAttempts }}</div>
                </div>
                <div class="rounded-[20px] bg-[var(--color-brand-cream)] p-4 text-center">
                  <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne classe</div>
                  <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ formatPct(exam.average) }}</div>
                </div>
              </div>

              <!-- Bannieres resultat -->
              @if (exam.passed) {
                <div class="mt-6 rounded-[24px] border border-emerald-300 bg-emerald-50 px-6 py-5">
                  <div class="flex items-start gap-4">
                    <mat-icon class="mt-0.5 !text-emerald-600">verified</mat-icon>
                    <div>
                      <p class="text-base font-bold text-emerald-800">Felicitations ! Vous avez reussi l'examen.</p>
                      <p class="mt-1 text-sm text-emerald-700">
                        Votre note de {{ formatScore(exam.score, exam.gradingScaleMax) }} depasse le seuil de {{ formatThreshold(exam) }}.
                        @if (exam.examType === 'final') { Votre certificat est disponible dans la section Certificats. }
                      </p>
                    </div>
                  </div>
                </div>
              } @else if (exam.attemptsRemaining > 0) {
                <div class="mt-6 rounded-[24px] border border-amber-300 bg-amber-50 px-6 py-5">
                  <div class="flex items-start gap-4">
                    <mat-icon class="mt-0.5 !text-amber-600">replay</mat-icon>
                    <div>
                      <p class="text-base font-bold text-amber-800">Vous n'avez pas encore atteint le seuil de {{ formatThreshold(exam) }}.</p>
                      <p class="mt-1 text-sm text-amber-700">
                        Il vous reste <strong>{{ exam.attemptsRemaining }} essai(s)</strong>. Revisez les erreurs ci-dessous puis repassez l'examen.
                      </p>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-6 py-5">
                  <div class="flex items-start gap-4">
                    <mat-icon class="mt-0.5 !text-red-500">cancel</mat-icon>
                    <div>
                      <p class="text-base font-bold text-red-800">Vous avez epuise vos {{ exam.maxAttempts }} essais.</p>
                      <p class="mt-1 text-sm text-red-700">Contactez votre formateur pour plus d'informations.</p>
                    </div>
                  </div>
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
              <!-- Instructions -->
              <div class="mt-6 rounded-[20px] border border-[var(--color-brand-gold-300)]/24 bg-[#fffaf2] px-5 py-4 text-sm leading-7 text-[var(--color-brand-green-800)]/78">
                Selectionnez une reponse par question (A, B, C ou D). Chaque bonne reponse vaut 0,5 pt.
                {{ exam.gradingScaleMax === 100 ? 'La note finale est convertie en pourcentage sur 100 %.' : 'Le total est ramene sur ' + exam.gradingScaleMax + '.' }}
              </div>

              <!-- Navigateur de questions -->
              <div class="mt-6 rounded-[20px] border border-[var(--color-brand-gold-300)]/24 bg-white p-4">
                <div class="mb-3 flex items-center gap-3">
                  <span class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ answeredCount() }}/{{ (exam.questions ?? []).length }} repondues</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-brand-cream)]">
                    <div class="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                         [style.width.%]="(exam.questions ?? []).length > 0 ? (answeredCount() / (exam.questions ?? []).length) * 100 : 0">
                    </div>
                  </div>
                  <span class="text-xs text-[var(--color-brand-green-800)]/55">{{ (exam.questions ?? []).length - answeredCount() }} restantes</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  @for (q of exam.questions ?? []; track q.id; let i = $index) {
                    <button type="button" (click)="scrollToQuestion(i)"
                            [class]="questionDotClass(i)"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition">
                      {{ i + 1 }}
                    </button>
                  }
                </div>
              </div>

              <form class="mt-6 space-y-5" (ngSubmit)="submitExam()">
                @for (question of exam.questions ?? []; track question.id; let i = $index) {
                  <article [id]="'question-' + i" class="scroll-mt-4 rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[var(--color-brand-cream)] p-5">
                    <div class="flex items-start justify-between gap-4">
                      <h4 class="text-base font-bold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ question.prompt }}</h4>
                      <span class="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ question.points }} pt</span>
                    </div>
                    <div class="mt-4 grid gap-2">
                      @for (option of question.options; track option; let optionIndex = $index) {
                        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-[var(--color-brand-green-900)] transition hover:border-[var(--color-brand-gold-300)]">
                          <input type="radio" [name]="'question-' + i" [value]="optionIndex" [formControl]="answerControls.at(i)" (change)="onAnswerChange(i)" class="sr-only" />
                          <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                [class.bg-emerald-500]="answerControls.at(i).value === optionIndex"
                                [class.text-white]="answerControls.at(i).value === optionIndex"
                                [class.bg-[var(--color-brand-green-900)]]="answerControls.at(i).value !== optionIndex"
                                [class.text-white]="answerControls.at(i).value !== optionIndex">
                            {{ optionLetter(optionIndex) }}
                          </span>
                          <span>{{ option }}</span>
                        </label>
                      }
                    </div>
                  </article>
                }

                @if (submitError()) {
                  <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ submitError() }}</div>
                }

                <div class="flex items-center gap-4 pt-2">
                  <button type="submit" [disabled]="submitInProgress()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-60">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                    {{ submitInProgress() ? 'Validation en cours...' : "Valider l'examen" }}
                  </button>
                  @if (answeredCount() < (exam.questions ?? []).length) {
                    <span class="text-sm text-amber-600">{{ (exam.questions ?? []).length - answeredCount() }} question(s) sans reponse</span>
                  }
                </div>
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
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatPct(exam.average) }}</div>
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
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ formatPct(exam.percentage) }}</div>
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

    @if (showResultModal()) {
      @if (modalExam(); as mExam) {
        <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" (click)="closeModal()" style="backdrop-filter:blur(4px)">
          <div class="w-full max-w-md rounded-[32px] bg-white shadow-2xl" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

              <div class="rounded-t-[32px] px-8 pt-10 pb-6 text-center"
                   [class.bg-emerald-50]="mExam.passed"
                   [class.bg-red-50]="mExam.passed === false">
                <div class="text-[11px] font-bold uppercase tracking-[0.25em]"
                     [class.text-emerald-700]="mExam.passed"
                     [class.text-red-500]="mExam.passed === false">
                  {{ mExam.passed ? 'EXAMEN REUSSI' : 'EXAMEN NON VALIDE' }}
                </div>
                <!-- percentage = (earnedScore / totalPoints) × 100 -->
                <div class="mt-3 text-7xl font-black leading-none"
                     [class.text-emerald-700]="mExam.passed"
                     [class.text-red-600]="mExam.passed === false">
                  {{ formatPct(mExam.percentage) }}
                </div>
                <div class="mt-2 text-xs opacity-70"
                     [class.text-emerald-700]="mExam.passed"
                     [class.text-red-500]="mExam.passed === false">
                  {{ formatRawScore(mExam.rawScore, mExam.rawMaxScore) }} pts &mdash; Seuil : {{ formatThreshold(mExam) }}
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 px-8 py-5">
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-3 text-center">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand-green-800)]/50">Bonnes rep.</div>
                  <div class="mt-1.5 text-lg font-bold text-[var(--color-brand-green-900)]">{{ correctAnswersCount(mExam) }}/{{ totalQuestions(mExam) }}</div>
                </div>
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-3 text-center">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand-green-800)]/50">Pts gagnes</div>
                  <div class="mt-1.5 text-lg font-bold text-[var(--color-brand-green-900)]">{{ formatRawScore(mExam.rawScore, mExam.rawMaxScore) }}</div>
                </div>
                <div class="rounded-2xl bg-[var(--color-brand-cream)] p-3 text-center">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand-green-800)]/50">Essais</div>
                  <div class="mt-1.5 text-lg font-bold text-[var(--color-brand-green-900)]">{{ mExam.attemptsUsed }}/{{ mExam.maxAttempts }}</div>
                </div>
              </div>

              <div class="px-8 pb-5">
                @if (mExam.passed) {
                  <div class="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <div class="flex items-start gap-3">
                      <mat-icon class="mt-0.5 !text-emerald-600">verified</mat-icon>
                      <div>
                        <p class="font-bold text-emerald-800">Felicitations ! Vous avez valide l'examen.</p>
                        <p class="mt-1 text-sm text-emerald-700">
                          {{ formatPct(mExam.percentage) }} &mdash; depasse le seuil de {{ formatThreshold(mExam) }}.
                          @if (mExam.examType === 'final') { Votre certificat est disponible dans la section Certificats. }
                        </p>
                      </div>
                    </div>
                  </div>
                } @else if (mExam.attemptsRemaining > 0) {
                  <div class="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4">
                    <div class="flex items-start gap-3">
                      <mat-icon class="mt-0.5 !text-amber-600">replay</mat-icon>
                      <div>
                        <p class="font-bold text-amber-800">Seuil non atteint — ne vous decouragez pas !</p>
                        <p class="mt-1 text-sm text-amber-700">
                          {{ formatPct(mExam.percentage) }} obtenus &mdash; seuil requis {{ formatThreshold(mExam) }}.
                          Il vous reste <strong>{{ mExam.attemptsRemaining }} essai(s)</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="rounded-[20px] border border-red-200 bg-red-50 px-5 py-4">
                    <div class="flex items-start gap-3">
                      <mat-icon class="mt-0.5 !text-red-500">cancel</mat-icon>
                      <div>
                        <p class="font-bold text-red-800">Essais epuises.</p>
                        <p class="mt-1 text-sm text-red-700">Vous avez utilise vos {{ mExam.maxAttempts }} essais. Contactez votre formateur.</p>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="flex flex-wrap justify-center gap-3 rounded-b-[32px] bg-[var(--color-brand-cream)] px-8 py-6">
                <button type="button" (click)="closeModal()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">grading</mat-icon>
                  Voir la correction
                </button>
                @if (mExam.attemptsRemaining > 0 && mExam.questions?.length) {
                  <button type="button" (click)="retryFromModal(mExam)" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">replay</mat-icon>
                    Repasser l'examen
                  </button>
                }
              </div>

          </div>
        </div>
      }
    }
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
  answeredMask = signal<boolean[]>([]);
  answeredCount = computed(() => this.answeredMask().filter(Boolean).length);
  showResultModal = signal(false);
  modalExam = signal<StudentExam | null>(null);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  load(): void {
    this.portal.getExams().subscribe((data) => this.exams.set(data));
  }

  latestResultExam(): StudentExam | null {
    return this.exams().find((exam) => exam.score !== null) ?? null;
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
    this.answeredMask.set([]);
    this.submitInProgress.set(false);

    if (!reviewOnly) {
      const count = exam.questions?.length ?? 0;
      for (let i = 0; i < count; i += 1) {
        this.answerControls.push(new FormControl<number | null>(null));
      }
      this.answeredMask.set(new Array(count).fill(false));
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
    const count = exam.questions?.length ?? 0;
    for (let i = 0; i < count; i += 1) {
      this.answerControls.push(new FormControl<number | null>(null));
    }
    this.answeredMask.set(new Array(count).fill(false));
    this.startTimer(exam.durationMinutes);
    this.scrollToActiveExam();
  }

  onAnswerChange(questionIndex: number): void {
    this.answeredMask.update((mask) => {
      const next = [...mask];
      next[questionIndex] = true;
      return next;
    });
  }

  scrollToQuestion(index: number): void {
    document.getElementById(`question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  questionDotClass(index: number): string {
    return this.answeredMask()[index]
      ? 'bg-emerald-500 text-white'
      : 'bg-[var(--color-brand-cream)] text-[var(--color-brand-green-800)]/60';
  }

  closeExam(): void {
    this.stopTimer();
    this.activeExam.set(null);
    this.submitError.set('');
    this.submitInProgress.set(false);
    this.timeRemainingSeconds.set(0);
    this.answerControls.clear();
    this.answeredMask.set([]);
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

  formatPct(value: number | null): string {
    if (value === null) return '-';
    return `${value}%`;
  }

  formatScore(score: number | null, scaleMax: number): string {
    if (score === null) return '-';
    if (scaleMax === 100) return `${score}%`;
    return `${score}/${scaleMax}`;
  }

  formatRawScore(score: number | null, scaleMax: number): string {
    if (score === null) return '-';
    return `${score}/${scaleMax}`;
  }

  formatThreshold(exam: StudentExam): string {
    if (exam.gradingScaleMax === 100) return `${exam.passThreshold}%`;
    return `${exam.passThreshold}/${exam.gradingScaleMax}`;
  }

  correctAnswersCount(exam: StudentExam): number {
    return exam.rawScore !== null ? Math.round(exam.rawScore / 0.5) : 0;
  }

  totalQuestions(exam: StudentExam): number {
    return Math.round(exam.rawMaxScore / 0.5);
  }

  closeModal(): void {
    this.showResultModal.set(false);
    this.modalExam.set(null);
    this.scrollToActiveExam();
  }

  retryFromModal(exam: StudentExam): void {
    this.showResultModal.set(false);
    this.modalExam.set(null);
    this.openExamForRetry(exam);
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
        if (refreshedExam) {
          this.modalExam.set(refreshedExam);
          this.showResultModal.set(true);
        } else {
          this.scrollToActiveExam();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.submitInProgress.set(false);
        this.submitError.set(error.error?.error ?? 'Impossible d envoyer les reponses pour le moment.');
      },
    });
  }
}
