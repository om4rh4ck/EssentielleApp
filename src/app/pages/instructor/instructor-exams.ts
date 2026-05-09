import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, ManagedExam, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-exams',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Examens" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Créer un examen automatique</h2>
          <form [formGroup]="form" (ngSubmit)="createExam()" class="mt-6 space-y-4">
            <input formControlName="title" placeholder="Titre de l'examen" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <select formControlName="courseId" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>
            <input formControlName="dueDate" type="date" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />

            <div formArrayName="questions" class="space-y-4">
              @for (group of questionGroups.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="rounded-[22px] bg-[var(--color-brand-cream)] p-4">
                  <input formControlName="prompt" placeholder="Question" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  <div class="mt-3 grid gap-3">
                    <input formControlName="optionA" placeholder="Réponse A" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                    <input formControlName="optionB" placeholder="Réponse B" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                    <input formControlName="optionC" placeholder="Réponse C" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-3">
                    <select formControlName="correctIndex" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none">
                      <option [value]="0">Bonne réponse : A</option>
                      <option [value]="1">Bonne réponse : B</option>
                      <option [value]="2">Bonne réponse : C</option>
                    </select>
                    <input formControlName="points" type="number" placeholder="Points" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  </div>
                </div>
              }
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="addQuestion()" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-3 text-sm font-semibold text-[var(--color-brand-green-900)]">Ajouter une question</button>
              <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">Publier l’examen</button>
            </div>
          </form>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Archives des notes</h2>
          <div class="mt-6 space-y-4">
            @for (exam of exams(); track exam.id) {
              <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ exam.courseTitle }}</div>
                    <h3 class="mt-2 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ exam.title }}</h3>
                    <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">Soumissions : {{ exam.submissions }} · Moyenne : {{ exam.averageScore }}/20</p>
                  </div>
                  <div class="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--color-brand-green-900)]">{{ exam.dueDate | date:'dd/MM/yyyy' }}</div>
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `
})
export class InstructorExamsComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  courses = signal<ManagedCourse[]>([]);
  exams = signal<ManagedExam[]>([]);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['1', Validators.required],
    dueDate: ['', Validators.required],
    questions: this.fb.array([this.createQuestionGroup()]),
  });

  get questionGroups(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  ngOnInit(): void {
    this.staff.getInstructorCourses().subscribe((data) => this.courses.set(data));
    this.load();
  }

  createQuestionGroup() {
    return this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(5)]],
      optionA: ['', Validators.required],
      optionB: ['', Validators.required],
      optionC: ['', Validators.required],
      correctIndex: [0, Validators.required],
      points: [5, Validators.required],
    });
  }

  addQuestion(): void {
    this.questionGroups.push(this.createQuestionGroup());
  }

  load(): void {
    this.staff.getInstructorExams().subscribe((data) => this.exams.set(data));
  }

  createExam(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.staff.createInstructorExam({
      title: value.title ?? '',
      courseId: value.courseId ?? '1',
      dueDate: value.dueDate ?? '',
      questions: (value.questions ?? []).map((question: any) => ({
        prompt: question.prompt,
        options: [question.optionA, question.optionB, question.optionC],
        correctIndex: Number(question.correctIndex),
        points: Number(question.points),
      })),
    }).subscribe(() => {
      this.form.reset({
        title: '',
        courseId: this.courses()[0]?.id ?? '1',
        dueDate: '',
      });
      this.questionGroups.clear();
      this.questionGroups.push(this.createQuestionGroup());
      this.load();
    });
  }
}
