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
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Ajouter une seance</h2>
              <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
                Planifiez vos seances. Elles seront visibles uniquement par les etudiantes inscrites a la formation concernee.
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
              Ajouter la seance
            </button>
          </form>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Grille hebdomadaire</h2>
              <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
                La grille ci-dessous montre les seances qui seront affichees aux etudiantes inscrites.
              </p>
            </div>
            <div class="rounded-full bg-[var(--color-brand-gold-100)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-gold-700)]">
              {{ entries().length }} seances
            </div>
          </div>

          <div class="mt-6 overflow-x-auto">
            <div class="min-w-[980px] rounded-[26px] bg-[#fff6da] p-3">
              <div class="grid grid-cols-[120px_repeat(5,minmax(0,1fr))] gap-2">
                <div class="flex items-center justify-center rounded-xl bg-[#ffd457] px-3 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-[var(--color-brand-green-900)]">
                  Horaires
                </div>
                @for (day of days; track day) {
                  <div class="flex items-center justify-center rounded-xl bg-[#ffd457] px-3 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-[var(--color-brand-green-900)]">
                    {{ day }}
                  </div>
                }

                @for (slot of timeSlots; track slot) {
                  <div class="flex min-h-[68px] items-center justify-center rounded-xl bg-[#d9edf0] px-3 text-sm font-semibold text-[var(--color-brand-green-900)]/70">
                    {{ formatHourRange(slot) }}
                  </div>

                  @for (day of days; track day) {
                    <div class="min-h-[68px] rounded-xl border border-white/80 bg-[#f6dbe7] p-2">
                      @if (entryForSlot(day, slot); as entry) {
                        <div class="flex h-full flex-col justify-between rounded-lg bg-white/72 p-2 shadow-[0_8px_18px_rgba(18,53,36,0.08)]">
                          <div>
                            <div class="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-brand-green-900)]">
                              {{ entry.title }}
                            </div>
                            <div class="mt-1 text-[11px] font-semibold text-[var(--color-brand-green-800)]/70">
                              {{ entry.courseTitle }}
                            </div>
                          </div>
                          <div class="mt-2 flex items-center justify-between gap-2">
                            <div class="text-[10px] uppercase tracking-[0.08em] text-[var(--color-brand-green-800)]/60">
                              {{ entry.startTime }} - {{ entry.endTime }}
                            </div>
                            <button type="button" (click)="deleteEntry(entry.id)" class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f8e7e7] text-[#9b2c2c] transition hover:bg-[#f1d3d3]">
                              <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">delete</mat-icon>
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (entry of sortedEntries(); track entry.id) {
              <article class="rounded-[22px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-bold text-[var(--color-brand-green-900)]">{{ entry.title }}</h3>
                    <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/70">{{ entry.courseTitle }}</p>
                  </div>
                  <button type="button" (click)="deleteEntry(entry.id)" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e7e7] text-[#9b2c2c] transition hover:bg-[#f1d3d3]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">delete</mat-icon>
                  </button>
                </div>
                <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-green-800)]/60">
                  <span>{{ entry.day }}</span>
                  <span>{{ entry.startTime }} - {{ entry.endTime }}</span>
                  <span>{{ formatLabel(entry.format) }}</span>
                </div>
                @if (entry.room) {
                  <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/72">Lieu: {{ entry.room }}</p>
                }
                @if (entry.notes) {
                  <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/72">{{ entry.notes }}</p>
                }
              </article>
            } @empty {
              <div class="rounded-[22px] border border-dashed border-[var(--color-brand-gold-300)]/40 bg-white/70 p-4 text-sm text-[var(--color-brand-green-800)]/60">
                Aucune seance planifiee.
              </div>
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
  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  readonly timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
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
        day: 'Lundi',
        startTime: '09:00',
        endTime: '10:00',
        format: 'online',
        room: '',
        notes: '',
      });
      this.load();
    });
  }

  deleteEntry(entryId: string): void {
    this.staff.deleteInstructorScheduleEntry(entryId).subscribe(() => this.load());
  }

  sortedEntries(): ScheduleEntry[] {
    return [...this.entries()].sort((left, right) => {
      const dayOrder = this.days.indexOf(left.day) - this.days.indexOf(right.day);
      if (dayOrder !== 0) return dayOrder;
      return left.startTime.localeCompare(right.startTime);
    });
  }

  entryForSlot(day: string, slot: string): ScheduleEntry | undefined {
    return this.sortedEntries().find((entry) => entry.day === day && this.slotIsWithinEntry(slot, entry));
  }

  slotIsWithinEntry(slot: string, entry: ScheduleEntry): boolean {
    return slot >= entry.startTime && slot < entry.endTime;
  }

  formatHourRange(slot: string): string {
    const [hours, minutes] = slot.split(':').map(Number);
    const nextHour = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return `${slot} - ${nextHour}`;
  }

  formatLabel(format: ScheduleEntry['format']): string {
    if (format === 'onsite') return 'Presentiel';
    if (format === 'hybrid') return 'Hybride';
    return 'En ligne';
  }
}
