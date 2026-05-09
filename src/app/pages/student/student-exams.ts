import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormControl } from '@angular/forms';
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
            Retrouvez ici les examens disponibles, passez-les directement dans la plateforme et consultez votre note automatique.
          </p>
        </div>

        @if (activeExam(); as exam) {
          <section class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ exam.courseTitle }}</div>
                <h3 class="mt-2 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
              </div>
              <button type="button" (click)="closeExam()" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">Fermer</button>
            </div>

            <form class="mt-8 space-y-6" (ngSubmit)="submitExam()">
              @for (question of exam.questions ?? []; track question.id; let i = $index) {
                <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                  <div class="flex items-start justify-between gap-4">
                    <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ i + 1 }}. {{ question.prompt }}</h4>
                    <span class="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ question.points }} pts</span>
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

              <button type="submit" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task_alt</mat-icon>
                Valider l’examen
              </button>
            </form>
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
                    Affecté par {{ exam.assignedBy }} · échéance {{ exam.dueDate | date:'dd/MM/yyyy' }}
                  </p>
                </div>

                <div class="grid min-w-[280px] grid-cols-2 gap-3">
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Statut</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.status === 'graded' ? 'Corrigé' : 'Disponible' }}</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.average }}/20</div>
                  </div>
                  <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center col-span-2">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Votre note</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ exam.score === null ? 'À passer' : (exam.score + '/20') }}</div>
                  </div>
                </div>
              </div>

              @if (exam.status === 'available' && exam.questions?.length) {
                <button type="button" (click)="openExam(exam)" class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">play_circle</mat-icon>
                  Passer l’examen
                </button>
              }
            </article>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class StudentExamsComponent implements OnInit {
  private portal = inject(StudentPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...STUDENT_MENU_ITEMS];
  exams = signal<StudentExam[]>([]);
  activeExam = signal<StudentExam | null>(null);
  answerControls = this.fb.array<FormControl<number | null>>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.portal.getExams().subscribe((data) => this.exams.set(data));
  }

  openExam(exam: StudentExam): void {
    this.activeExam.set(exam);
    this.answerControls.clear();
    for (let i = 0; i < (exam.questions?.length ?? 0); i += 1) {
      this.answerControls.push(new FormControl<number | null>(null));
    }
  }

  closeExam(): void {
    this.activeExam.set(null);
    this.answerControls.clear();
  }

  submitExam(): void {
    const exam = this.activeExam();
    if (!exam) return;
    const answers = this.answerControls.controls.map((control) => Number(control.value));
    if (answers.some((value) => Number.isNaN(value))) return;
    this.portal.submitExam(exam.id, answers).subscribe((data) => {
      this.exams.set(data);
      this.closeExam();
    });
  }
}
