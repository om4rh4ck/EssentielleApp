import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, ScheduleEntry, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-schedule',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Emploi du temps" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="flex items-start gap-4">
            <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
              <mat-icon>event_note</mat-icon>
            </div>
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Planifier un cours</h2>
              <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
                Creez le tableau d'emploi du temps visible par les etudiantes selon leurs formations.
              </p>
            </div>
          </div>

          <form [formGroup]="scheduleForm" (ngSubmit)="createEntry()" class="mt-6 space-y-4">
            <input formControlName="title" placeholder="Titre de la seance" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />

            <select formControlName="courseId" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>

            <div class="grid gap-4 sm:grid-cols-2">
              <select formControlName="day" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                @for (day of days; track day) {
                  <option [value]="day">{{ day }}</option>
                }
              </select>
              <select formControlName="format" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                <option value="online">En ligne</option>
                <option value="onsite">Presentiel</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <input formControlName="startTime" type="time" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
              <input formControlName="endTime" type="time" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            </div>

            <input formControlName="room" placeholder="Salle ou lien" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <textarea formControlName="notes" rows="4" placeholder="Notes pour les etudiantes" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>

            <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-black">
              Ajouter au tableau
            </button>
          </form>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Tableau hebdomadaire</h2>
              <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
                Les etudiantes verront automatiquement les seances liees a leurs cours.
              </p>
            </div>
            <div class="rounded-full bg-[var(--color-brand-gold-100)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-gold-700)]">
              {{ entries().length }} seances
            </div>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (day of days; track day) {
              <article class="rounded-[24px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ day }}</h3>
                  <span class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">
                    {{ entriesForDay(day).length }} cours
                  </span>
                </div>

                <div class="space-y-3">
                  @for (entry of entriesForDay(day); track entry.id) {
                    <div class="rounded-[20px] bg-white p-4 shadow-[0_10px_24px_rgba(18,53,36,0.05)]">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <h4 class="font-bold text-[var(--color-brand-green-900)]">{{ entry.title }}</h4>
                          <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/65">{{ entry.courseTitle }}</p>
                        </div>
                        <button type="button" (click)="deleteEntry(entry.id)" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e7e7] text-[#9b2c2c] transition hover:bg-[#f1d3d3]">
                          <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">delete</mat-icon>
                        </button>
                      </div>

                      <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-green-800)]/60">
                        <span>{{ entry.startTime }} - {{ entry.endTime }}</span>
                        <span>{{ formatLabel(entry.format) }}</span>
                      </div>

                      @if (entry.room) {
                        <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/72">Lieu: {{ entry.room }}</p>
                      }

                      @if (entry.notes) {
                        <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/72">{{ entry.notes }}</p>
                      }
                    </div>
                  } @empty {
                    <div class="rounded-[20px] border border-dashed border-[var(--color-brand-gold-300)]/40 bg-white/70 p-4 text-sm text-[var(--color-brand-green-800)]/60">
                      Aucune seance planifiee.
                    </div>
                  }
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class InstructorScheduleComponent implements OnInit {
  private readonly staff = inject(StaffPortalService);
  private readonly fb = inject(FormBuilder);

  readonly menuItems = [...INSTRUCTOR_MENU_ITEMS];
  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  readonly courses = signal<ManagedCourse[]>([]);
  readonly entries = signal<ScheduleEntry[]>([]);

  readonly scheduleForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['', Validators.required],
    day: ['Lundi', Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['10:00', Validators.required],
    format: this.fb.nonNullable.control<'online' | 'onsite' | 'hybrid'>('online'),
    room: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.staff.getInstructorCourses().subscribe((courses) => {
      this.courses.set(courses);
      if (courses.length && !this.scheduleForm.controls.courseId.value) {
        this.scheduleForm.patchValue({ courseId: courses[0].id });
      }
    });
    this.load();
  }

  load(): void {
    this.staff.getInstructorSchedule().subscribe((entries) => this.entries.set(entries));
  }

  createEntry(): void {
    if (this.scheduleForm.invalid) return;
    this.staff.createInstructorScheduleEntry(this.scheduleForm.getRawValue()).subscribe(() => {
      this.scheduleForm.patchValue({
        title: '',
        startTime: '09:00',
        endTime: '10:00',
        room: '',
        notes: '',
      });
      this.load();
    });
  }

  deleteEntry(entryId: string): void {
    this.staff.deleteInstructorScheduleEntry(entryId).subscribe(() => this.load());
  }

  entriesForDay(day: string): ScheduleEntry[] {
    return [...this.entries()]
      .filter((entry) => entry.day === day)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }

  formatLabel(format: ScheduleEntry['format']): string {
    if (format === 'onsite') return 'Presentiel';
    if (format === 'hybrid') return 'Hybride';
    return 'En ligne';
  }
}
