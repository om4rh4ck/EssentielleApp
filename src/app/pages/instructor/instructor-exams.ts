import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, ManagedExam, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Examens & QCM" [menuItems]="menuItems">
      <div class="space-y-8">

        <!-- Header stats -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
            <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Total examens</div>
            <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ exams().length }}</div>
          </div>
          <div class="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
            <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Total soumissions</div>
            <div class="mt-2 text-3xl font-bold text-[var(--color-brand-green-900)]">{{ totalSubmissions() }}</div>
          </div>
          <div class="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
            <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Taux de reussite global</div>
            <div class="mt-2 text-3xl font-bold text-emerald-600">{{ globalPassRate() }}%</div>
          </div>
        </div>

        <div class="grid gap-8 xl:grid-cols-[1.1fr_1fr]">

          <!-- Panel gauche : liste des examens -->
          <div class="space-y-4">
            <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Examens publies</h2>
            @for (exam of exams(); track exam.id) {
              <article class="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                <!-- En-tete examen -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                          [class.bg-emerald-100]="exam.examType === 'final'"
                          [class.text-emerald-800]="exam.examType === 'final'"
                          [class.bg-amber-100]="exam.examType === 'quiz'"
                          [class.text-amber-800]="exam.examType === 'quiz'">
                      {{ exam.examType === 'final' ? 'Examen final' : 'Quiz' }}
                    </span>
                    <h3 class="mt-1 font-serif text-xl text-[var(--color-brand-green-900)] leading-snug">{{ exam.title }}</h3>
                    <p class="mt-1 text-xs text-[var(--color-brand-green-800)]/55">{{ exam.courseTitle }} · Echeance {{ exam.dueDate | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <div class="shrink-0 text-right">
                    <div class="text-2xl font-black" [class.text-emerald-600]="passRate(exam) >= 70" [class.text-amber-600]="passRate(exam) < 70 && passRate(exam) > 0" [class.text-[var(--color-brand-green-800)]/35]="passRate(exam) === 0">
                      {{ passRate(exam) }}%
                    </div>
                    <div class="text-xs text-[var(--color-brand-green-800)]/45">taux reussite</div>
                  </div>
                </div>

                <!-- Stats rapides -->
                <div class="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div class="rounded-xl bg-[var(--color-brand-cream)] p-2">
                    <div class="text-[10px] uppercase tracking-wide text-[var(--color-brand-green-800)]/45">Soumis</div>
                    <div class="mt-1 text-lg font-bold text-[var(--color-brand-green-900)]">{{ exam.submissions }}</div>
                  </div>
                  <div class="rounded-xl bg-[var(--color-brand-cream)] p-2">
                    <div class="text-[10px] uppercase tracking-wide text-[var(--color-brand-green-800)]/45">Reussi</div>
                    <div class="mt-1 text-lg font-bold text-emerald-600">{{ exam.allStudents.filter(s => s.passed).length }}</div>
                  </div>
                  <div class="rounded-xl bg-[var(--color-brand-cream)] p-2">
                    <div class="text-[10px] uppercase tracking-wide text-[var(--color-brand-green-800)]/45">Moyenne</div>
                    <div class="mt-1 text-lg font-bold text-[var(--color-brand-green-900)]">{{ formatAvg(exam) }}</div>
                  </div>
                  <div class="rounded-xl bg-[var(--color-brand-cream)] p-2">
                    <div class="text-[10px] uppercase tracking-wide text-[var(--color-brand-green-800)]/45">Seuil</div>
                    <div class="mt-1 text-lg font-bold text-[var(--color-brand-green-900)]">{{ formatThreshold(exam) }}</div>
                  </div>
                </div>

                <!-- Tableau de tous les eleves -->
                <!-- Boutons modifier / supprimer -->
                <div class="mt-4 flex gap-2 border-t border-[var(--color-brand-gold-300)]/20 pt-3">
                  <button type="button" (click)="openEdit(exam)"
                          class="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-gold-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-cream)]">
                    <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">edit</mat-icon>
                    Modifier
                  </button>
                  <button type="button" (click)="deleteExam(exam)"
                          class="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50">
                    <mat-icon class="!h-[14px] !w-[14px] !text-[14px]">delete_outline</mat-icon>
                    Supprimer
                  </button>
                </div>

                <!-- Formulaire d'edition inline -->
                @if (editingId() === exam.id) {
                  <form [formGroup]="editForm" (ngSubmit)="saveEdit(exam.id)"
                        class="mt-4 space-y-3 rounded-[20px] border border-[var(--color-brand-gold-300)]/30 bg-[var(--color-brand-cream)] p-4">
                    <div class="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-gold-700)]">Modifier l'examen</div>
                    <input formControlName="title" placeholder="Titre *"
                           class="w-full rounded-2xl bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-gold-300)]" />
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Echeance</label>
                        <input formControlName="dueDate" type="date"
                               class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-gold-300)]" />
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Duree (min)</label>
                        <input formControlName="durationMinutes" type="number" min="5" max="180"
                               class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Echelle</label>
                        <select formControlName="gradingScaleMax"
                                class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none">
                          <option value="20">/ 20</option>
                          <option value="10">/ 10</option>
                          <option value="100">100 %</option>
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Seuil</label>
                        <input formControlName="passThreshold" type="number" min="0"
                               class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Essais max</label>
                        <select formControlName="maxAttempts"
                                class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button type="submit" [disabled]="editForm.invalid || editSaving()"
                              class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-50">
                        {{ editSaving() ? 'Sauvegarde...' : 'Enregistrer' }}
                      </button>
                      <button type="button" (click)="cancelEdit()"
                              class="rounded-full border border-[var(--color-brand-gold-300)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-cream)]">
                        Annuler
                      </button>
                    </div>
                  </form>
                }

                @if (exam.allStudents.length > 0) {
                  <div class="mt-4">
                    <div class="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-brand-gold-700)]">Resultats eleves</div>
                    <div class="overflow-hidden rounded-[16px] border border-[var(--color-brand-gold-300)]/20">
                      <table class="w-full text-sm">
                        <thead class="bg-[var(--color-brand-cream)]">
                          <tr>
                            <th class="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/55">Eleve</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/55">Note</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/55">Statut</th>
                            <th class="hidden px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-green-800)]/55 sm:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[var(--color-brand-gold-300)]/15 bg-white">
                          @for (student of exam.allStudents; track student.studentId) {
                            <tr>
                              <td class="px-4 py-3">
                                <div class="font-semibold text-[var(--color-brand-green-900)]">{{ student.studentName }}</div>
                                <div class="text-xs text-[var(--color-brand-green-800)]/50">{{ student.studentEmail }}</div>
                              </td>
                              <td class="px-4 py-3 text-center">
                                <span class="inline-flex h-9 w-16 items-center justify-center rounded-full text-sm font-bold"
                                      [class.bg-emerald-100]="student.passed"
                                      [class.text-emerald-800]="student.passed"
                                      [class.bg-red-100]="!student.passed"
                                      [class.text-red-700]="!student.passed">
                                  {{ formatScore(student.score, exam.gradingScaleMax) }}
                                </span>
                              </td>
                              <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                                      [class.bg-emerald-50]="student.passed"
                                      [class.text-emerald-700]="student.passed"
                                      [class.bg-red-50]="!student.passed"
                                      [class.text-red-600]="!student.passed">
                                  <mat-icon class="!h-[13px] !w-[13px] !text-[13px]">{{ student.passed ? 'check_circle' : 'cancel' }}</mat-icon>
                                  {{ student.passed ? 'Reussi' : 'Echoue' }}
                                </span>
                              </td>
                              <td class="hidden px-4 py-3 text-right text-xs text-[var(--color-brand-green-800)]/50 sm:table-cell">
                                {{ student.submittedAt | date:'dd/MM/yy HH:mm' }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                } @else {
                  <div class="mt-4 rounded-[16px] bg-[var(--color-brand-cream)] px-4 py-3 text-sm text-[var(--color-brand-green-800)]/55 text-center">
                    Aucune soumission pour le moment.
                  </div>
                }
              </article>
            }

            @if (exams().length === 0) {
              <div class="rounded-[24px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                <mat-icon class="!h-12 !w-12 !text-[48px] text-[var(--color-brand-green-800)]/25">quiz</mat-icon>
                <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/55">Aucun examen publie. Creez votre premier QCM a droite.</p>
              </div>
            }
          </div>

          <!-- Panel droit : creer un examen -->
          <div>
            <div class="sticky top-4 rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
              <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Creer un QCM</h2>

              @if (createSuccess()) {
                <div class="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <mat-icon class="mr-2 !h-[16px] !w-[16px] !text-[16px] align-middle">check_circle</mat-icon>
                  Examen publie avec succes !
                </div>
              }

              <form [formGroup]="form" (ngSubmit)="createExam()" class="mt-5 space-y-4">
                <!-- Titre -->
                <input formControlName="title" placeholder="Titre de l'examen *" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-gold-300)]" />

                <!-- Cours -->
                <select formControlName="courseId" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-gold-300)]">
                  @for (course of courses(); track course.id) {
                    <option [value]="course.id">{{ course.title }}</option>
                  }
                </select>

                <!-- Type + Duree -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Type</label>
                    <select formControlName="examType" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                      <option value="quiz">Quiz</option>
                      <option value="final">Examen final</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Duree (min)</label>
                    <input formControlName="durationMinutes" type="number" min="5" max="180" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  </div>
                </div>

                <!-- Echelle + Seuil + Essais -->
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Echelle</label>
                    <select formControlName="gradingScaleMax" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                      <option value="20">/ 20</option>
                      <option value="10">/ 10</option>
                      <option value="100">100 %</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Seuil reussite</label>
                    <input formControlName="passThreshold" type="number" min="0" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Essais max</label>
                    <select formControlName="maxAttempts" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                </div>

                <!-- Date echeance -->
                <input formControlName="dueDate" type="date" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />

                <!-- Questions -->
                <div class="space-y-3" formArrayName="questions">
                  @for (group of questionGroups.controls; track $index; let i = $index) {
                    <div [formGroupName]="i" class="rounded-[20px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                      <div class="mb-3 flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-gold-700)]">Question {{ i + 1 }}</span>
                        @if (questionGroups.length > 1) {
                          <button type="button" (click)="removeQuestion(i)" class="text-xs text-red-500 hover:text-red-700">Supprimer</button>
                        }
                      </div>
                      <textarea formControlName="prompt" placeholder="Enonce de la question *" rows="2" class="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm outline-none"></textarea>
                      <div class="mt-3 grid gap-2">
                        @for (letter of ['A','B','C','D']; track letter; let oi = $index) {
                          <div class="flex items-center gap-2">
                            <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-green-900)] text-xs font-bold text-white">{{ letter }}</span>
                            <input [formControlName]="'option' + letter" [placeholder]="'Reponse ' + letter + (oi < 2 ? ' *' : ' (optionnel)')" class="flex-1 rounded-2xl bg-white px-3 py-2 text-sm outline-none" />
                          </div>
                        }
                      </div>
                      <div class="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Bonne reponse</label>
                          <select formControlName="correctIndex" class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none">
                            <option [value]="0">A</option>
                            <option [value]="1">B</option>
                            <option [value]="2">C</option>
                            <option [value]="3">D</option>
                          </select>
                        </div>
                        <div>
                          <label class="mb-1 block text-xs text-[var(--color-brand-green-800)]/55">Points</label>
                          <input formControlName="points" type="number" min="0.5" step="0.5" class="w-full rounded-2xl bg-white px-3 py-2 text-sm outline-none" />
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <div class="flex gap-3">
                  <button type="button" (click)="addQuestion()" class="flex-1 rounded-full border border-[var(--color-brand-gold-300)] bg-[var(--color-brand-cream)] px-4 py-3 text-sm font-semibold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-gold-300)]/20">
                    + Ajouter une question
                  </button>
                  <button type="submit" [disabled]="form.invalid || saving()" class="flex-1 rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-50">
                    {{ saving() ? 'Publication...' : 'Publier le QCM' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </app-dashboard-layout>
  `,
})
export class InstructorExamsComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  courses = signal<ManagedCourse[]>([]);
  exams = signal<ManagedExam[]>([]);
  saving = signal(false);
  createSuccess = signal(false);
  editingId = signal<string | null>(null);
  editSaving = signal(false);

  editForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    dueDate: ['', Validators.required],
    durationMinutes: [20, Validators.required],
    gradingScaleMax: [20, Validators.required],
    passThreshold: [10, Validators.required],
    maxAttempts: [1, Validators.required],
  });

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['', Validators.required],
    examType: ['quiz', Validators.required],
    durationMinutes: [20, Validators.required],
    gradingScaleMax: [20, Validators.required],
    passThreshold: [10, Validators.required],
    maxAttempts: [1, Validators.required],
    dueDate: ['', Validators.required],
    questions: this.fb.array([this.createQuestionGroup()]),
  });

  get questionGroups(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  ngOnInit(): void {
    this.staff.getInstructorCourses().subscribe((data) => {
      this.courses.set(data);
      if (data.length) this.form.patchValue({ courseId: data[0].id });
    });
    this.load();
  }

  createQuestionGroup() {
    return this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(5)]],
      optionA: ['', Validators.required],
      optionB: ['', Validators.required],
      optionC: [''],
      optionD: [''],
      correctIndex: [0, Validators.required],
      points: [1, Validators.required],
    });
  }

  addQuestion(): void {
    this.questionGroups.push(this.createQuestionGroup());
  }

  removeQuestion(index: number): void {
    if (this.questionGroups.length > 1) {
      this.questionGroups.removeAt(index);
    }
  }

  load(): void {
    this.staff.getInstructorExams().subscribe((data) => this.exams.set(data));
  }

  createExam(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.createSuccess.set(false);
    const v = this.form.getRawValue();
    this.staff.createInstructorExam({
      title: v.title ?? '',
      courseId: v.courseId ?? '',
      dueDate: v.dueDate ?? '',
      examType: (v.examType as 'quiz' | 'final') ?? 'quiz',
      durationMinutes: Number(v.durationMinutes ?? 20),
      gradingScaleMax: Number(v.gradingScaleMax ?? 20),
      passThreshold: Number(v.passThreshold ?? 10),
      maxAttempts: Number(v.maxAttempts ?? 1),
      questions: (v.questions ?? []).map((q: any) => ({
        prompt: q.prompt,
        options: [q.optionA, q.optionB, q.optionC, q.optionD].filter((o: string) => o?.trim()),
        correctIndex: Number(q.correctIndex),
        points: Number(q.points),
      })),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.createSuccess.set(true);
        this.form.patchValue({ title: '', dueDate: '' });
        this.questionGroups.clear();
        this.questionGroups.push(this.createQuestionGroup());
        this.load();
        setTimeout(() => this.createSuccess.set(false), 4000);
      },
      error: () => this.saving.set(false),
    });
  }

  openEdit(exam: ManagedExam): void {
    this.editingId.set(exam.id);
    this.editForm.patchValue({
      title: exam.title,
      dueDate: exam.dueDate ? exam.dueDate.slice(0, 10) : '',
      durationMinutes: exam.durationMinutes,
      gradingScaleMax: exam.gradingScaleMax,
      passThreshold: exam.passThreshold,
      maxAttempts: exam.maxAttempts,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(examId: string): void {
    if (this.editForm.invalid) return;
    this.editSaving.set(true);
    const v = this.editForm.getRawValue();
    this.staff.updateInstructorExam(examId, {
      title: v.title ?? undefined,
      dueDate: v.dueDate ?? undefined,
      durationMinutes: Number(v.durationMinutes),
      gradingScaleMax: Number(v.gradingScaleMax),
      passThreshold: Number(v.passThreshold),
      maxAttempts: Number(v.maxAttempts),
    }).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.editingId.set(null);
        this.load();
      },
      error: () => this.editSaving.set(false),
    });
  }

  deleteExam(exam: ManagedExam): void {
    if (!confirm(`Supprimer l'examen "${exam.title}" ? Cette action est irreversible.`)) return;
    this.staff.deleteInstructorExam(exam.id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  formatScore(score: number, scaleMax: number): string {
    if (scaleMax === 100) return `${score}%`;
    return `${score}/${scaleMax}`;
  }

  formatThreshold(exam: ManagedExam): string {
    if (exam.gradingScaleMax === 100) return `${exam.passThreshold}%`;
    return `${exam.passThreshold}/${exam.gradingScaleMax}`;
  }

  formatAvg(exam: ManagedExam): string {
    return this.formatScore(exam.averageScore, exam.gradingScaleMax);
  }

  passRate(exam: ManagedExam): number {
    if (!exam.submissions) return 0;
    const passed = exam.allStudents.filter((s) => s.passed).length;
    return Math.round((passed / exam.submissions) * 100);
  }

  totalSubmissions(): number {
    return this.exams().reduce((sum, e) => sum + e.submissions, 0);
  }

  globalPassRate(): number {
    const total = this.totalSubmissions();
    if (!total) return 0;
    const passed = this.exams().reduce((sum, e) => sum + e.allStudents.filter((s) => s.passed).length, 0);
    return Math.round((passed / total) * 100);
  }
}
