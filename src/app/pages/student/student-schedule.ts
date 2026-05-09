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
              <h2 class="mt-4 font-serif text-4xl">Consultez vos prochains cours</h2>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-white/80">
                Retrouvez ici les seances planifiees par la formatrice pour vos formations inscrites.
              </p>
            </div>
            <div class="rounded-3xl border border-white/14 bg-white/10 px-6 py-5 text-center backdrop-blur-sm">
              <div class="text-xs uppercase tracking-[0.22em] text-white/60">Seances prevues</div>
              <div class="mt-2 text-4xl font-bold">{{ entries().length }}</div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
            <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Tableau hebdomadaire</h3>
            <div class="mt-6 overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr class="text-left text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">
                    <th class="px-4">Jour</th>
                    <th class="px-4">Horaire</th>
                    <th class="px-4">Cours</th>
                    <th class="px-4">Format</th>
                    <th class="px-4">Lieu</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of sortedEntries(); track entry.id) {
                    <tr class="rounded-2xl bg-[var(--color-brand-cream)] text-sm text-[var(--color-brand-green-900)]">
                      <td class="rounded-l-2xl px-4 py-4 font-semibold">{{ entry.day }}</td>
                      <td class="px-4 py-4">{{ entry.startTime }} - {{ entry.endTime }}</td>
                      <td class="px-4 py-4">
                        <div class="font-semibold">{{ entry.title }}</div>
                        <div class="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--color-brand-green-800)]/55">{{ entry.courseTitle }}</div>
                      </td>
                      <td class="px-4 py-4">{{ formatLabel(entry.format) }}</td>
                      <td class="rounded-r-2xl px-4 py-4">{{ entry.room || '-' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="rounded-2xl bg-[var(--color-brand-cream)] px-4 py-8 text-center text-sm text-[var(--color-brand-green-800)]/65">
                        Aucun emploi du temps n'est encore disponible pour vos formations.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
            <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Par jour</h3>
            <div class="mt-6 space-y-4">
              @for (day of days; track day) {
                <article class="rounded-[22px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)] p-4">
                  <div class="flex items-center justify-between">
                    <h4 class="font-semibold text-[var(--color-brand-green-900)]">{{ day }}</h4>
                    <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/55">{{ entriesForDay(day).length }}</span>
                  </div>
                  <div class="mt-3 space-y-3">
                    @for (entry of entriesForDay(day); track entry.id) {
                      <div class="rounded-2xl bg-white px-4 py-3">
                        <div class="font-semibold text-[var(--color-brand-green-900)]">{{ entry.startTime }} - {{ entry.endTime }}</div>
                        <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/72">{{ entry.title }}</div>
                      </div>
                    } @empty {
                      <div class="text-sm text-[var(--color-brand-green-800)]/60">Aucune seance.</div>
                    }
                  </div>
                </article>
              }
            </div>
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class StudentScheduleComponent implements OnInit {
  private readonly portal = inject(StudentPortalService);

  readonly menuItems = [...STUDENT_MENU_ITEMS];
  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
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

  entriesForDay(day: string): StudentScheduleEntry[] {
    return this.sortedEntries().filter((entry) => entry.day === day);
  }

  formatLabel(format: StudentScheduleEntry['format']): string {
    if (format === 'onsite') return 'Presentiel';
    if (format === 'hybrid') return 'Hybride';
    return 'En ligne';
  }
}
