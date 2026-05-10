import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { StudentPortalService, StudentScheduleEntry } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Emploi du temps" [menuItems]="menuItems">
      <div class="space-y-6">
        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#133123_0%,#234835_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.14)]">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white/76">
                <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">calendar_month</mat-icon>
                Planning etudiant
              </div>
              <h2 class="mt-4 font-serif text-4xl">Vos seances inscrites</h2>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-white/80">
                Seules les seances des formations auxquelles vous etes inscrite apparaissent dans cette grille.
              </p>
            </div>
            <div class="rounded-3xl border border-white/14 bg-white/10 px-6 py-5 text-center backdrop-blur-sm">
              <div class="text-xs uppercase tracking-[0.22em] text-white/60">Seances prevues</div>
              <div class="mt-2 text-4xl font-bold">{{ entries().length }}</div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Grille hebdomadaire</h3>
          <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
            Votre formatrice ajoute les seances par formation, puis elles s'affichent ici automatiquement.
          </p>

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
                        <div class="flex h-full flex-col justify-between rounded-lg bg-white/78 p-2 shadow-[0_8px_18px_rgba(18,53,36,0.08)]">
                          <div>
                            <div class="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-brand-green-900)]">
                              {{ entry.title }}
                            </div>
                            <div class="mt-1 text-[11px] font-semibold text-[var(--color-brand-green-800)]/70">
                              {{ entry.courseTitle }}
                            </div>
                          </div>
                          <div class="mt-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-brand-green-800)]/60">
                            {{ entry.startTime }} - {{ entry.endTime }}
                          </div>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Liste detaillee</h3>
          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (entry of sortedEntries(); track entry.id) {
              <article class="rounded-[22px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                <div class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-gold-700)]">
                  {{ entry.day }} • {{ entry.startTime }} - {{ entry.endTime }}
                </div>
                <h4 class="mt-3 font-bold text-[var(--color-brand-green-900)]">{{ entry.title }}</h4>
                <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/72">{{ entry.courseTitle }}</p>
                <div class="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-green-800)]/60">
                  {{ formatLabel(entry.format) }}
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
                Aucun emploi du temps n'est encore disponible pour vos formations.
              </div>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class StudentScheduleComponent implements OnInit {
  private readonly portal = inject(StudentPortalService);

  readonly menuItems = [...STUDENT_MENU_ITEMS];
  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  readonly timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  readonly entries = signal<StudentScheduleEntry[]>([]);

  ngOnInit(): void {
    this.portal.getSchedule().subscribe((entries) => this.entries.set(entries));
  }

  sortedEntries(): StudentScheduleEntry[] {
    return [...this.entries()].sort((left, right) => {
      const dayOrder = this.days.indexOf(left.day) - this.days.indexOf(right.day);
      if (dayOrder !== 0) return dayOrder;
      return left.startTime.localeCompare(right.startTime);
    });
  }

  entryForSlot(day: string, slot: string): StudentScheduleEntry | undefined {
    return this.sortedEntries().find((entry) => entry.day === day && this.slotIsWithinEntry(slot, entry));
  }

  slotIsWithinEntry(slot: string, entry: StudentScheduleEntry): boolean {
    return slot >= entry.startTime && slot < entry.endTime;
  }

  formatHourRange(slot: string): string {
    const [hours, minutes] = slot.split(':').map(Number);
    const nextHour = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return `${slot} - ${nextHour}`;
  }

  formatLabel(format: StudentScheduleEntry['format']): string {
    if (format === 'onsite') return 'Presentiel';
    if (format === 'hybrid') return 'Hybride';
    return 'En ligne';
  }
}
