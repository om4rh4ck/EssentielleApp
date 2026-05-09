import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { AdminStatsData, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Statistiques Globales" [menuItems]="menuItems">
      @if (stats(); as data) {
        <div class="space-y-8">
          <section class="overflow-hidden rounded-[34px] bg-[linear-gradient(120deg,#102519_0%,#173927_42%,#6e6148_100%)] p-8 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)]">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-3xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">monitoring</mat-icon>
                  Dashboard analytique
                </div>
                <h2 class="mt-4 font-serif text-4xl leading-tight">Suivez les inscrites, les formations et les paiements réels de la plateforme.</h2>
                <p class="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                  Les chiffres ci-dessous sont calculés à partir des utilisatrices enregistrées, des formations actives et des paiements présents dans la plateforme.
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-3xl border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <div class="text-xs uppercase tracking-[0.24em] text-white/55">Inscriptions totales</div>
                  <div class="mt-2 text-3xl font-bold">{{ data.totalEnrollments }}</div>
                </div>
                <div class="rounded-3xl border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <div class="text-xs uppercase tracking-[0.24em] text-white/55">CA encaissé</div>
                  <div class="mt-2 text-3xl font-bold">{{ data.totalRevenue }} €</div>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article class="rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffaf2_0%,#f5ebdb_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.16)]">
                <mat-icon>groups</mat-icon>
              </span>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Utilisatrices</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalUsers }}</div>
              <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/68">{{ data.totalStudents }} étudiantes, {{ data.totalInstructors }} formatrice(s), {{ data.totalAdmins }} admin(s)</p>
            </article>

            <article class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#f4f0e8_0%,#e7dcc7_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-[var(--color-brand-green-900)] shadow-[0_18px_30px_rgba(200,169,106,0.22)]">
                <mat-icon>library_books</mat-icon>
              </span>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Formations</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.activeCourses }}</div>
              <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/68">{{ data.freeCourses }} gratuites, {{ data.paidCourses }} payantes</p>
            </article>

            <article class="rounded-[30px] border border-emerald-900/8 bg-[linear-gradient(180deg,#1f3c2d_0%,#102519_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.16)]">
              <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 text-[var(--color-brand-gold-300)]">
                <mat-icon>payments</mat-icon>
              </span>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-white/56">Paiements validés</div>
              <div class="mt-3 text-4xl font-bold">{{ data.paidPayments }}</div>
              <p class="mt-3 text-sm text-white/70">Panier moyen {{ data.averageBasket }} €</p>
            </article>

            <article class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-800)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.14)]">
                <mat-icon>schedule_send</mat-icon>
              </span>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Paiements en attente</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.pendingPayments }}</div>
              <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/68">{{ data.pendingRevenue }} € à encaisser</p>
            </article>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Courbe des encaissements</h3>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/68">Évolution mensuelle réelle des paiements validés.</p>
                </div>
                <span class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold-700)] shadow-[0_10px_22px_rgba(18,53,36,0.06)]">Vue 6 mois</span>
              </div>

              <div class="overflow-hidden rounded-[26px] border border-[var(--color-brand-gold-300)]/18 bg-[linear-gradient(180deg,#f8f1e4_0%,#f3ead8_100%)] p-4 md:p-6">
                <div class="relative h-[280px]">
                  <div class="absolute inset-0 flex flex-col justify-between">
                    @for (level of chartLevels(data); track $index) {
                      <div class="flex items-center gap-3">
                        <span class="w-12 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-green-800)]/42">{{ level }}€</span>
                        <div class="h-px flex-1 border-t border-dashed border-[var(--color-brand-gold-300)]/35"></div>
                      </div>
                    }
                  </div>

                  <svg viewBox="0 0 640 280" class="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="#c8a96a" stop-opacity="0.35"></stop>
                        <stop offset="100%" stop-color="#c8a96a" stop-opacity="0.04"></stop>
                      </linearGradient>
                      <linearGradient id="revenue-stroke" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stop-color="#183726"></stop>
                        <stop offset="100%" stop-color="#c8a96a"></stop>
                      </linearGradient>
                    </defs>
                    <path [attr.d]="areaPath(data)" fill="url(#revenue-fill)"></path>
                    <path [attr.d]="linePath(data)" fill="none" stroke="url(#revenue-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>

                    @for (point of chartPoints(data); track point.label) {
                      <circle [attr.cx]="point.x" [attr.cy]="point.y" r="6" fill="#183726"></circle>
                      <circle [attr.cx]="point.x" [attr.cy]="point.y" r="12" fill="rgba(200,169,106,0.18)"></circle>
                    }
                  </svg>

                  <div class="absolute inset-x-0 bottom-0 grid grid-cols-6 gap-2 pt-4">
                    @for (point of chartPoints(data); track point.label) {
                      <div class="text-center">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/45">{{ point.label }}</div>
                        <div class="mt-1 text-sm font-bold text-[var(--color-brand-green-900)]">{{ point.amount }} €</div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Répartition rapide</h3>
                <mat-icon class="text-[var(--color-brand-gold-700)]">donut_small</mat-icon>
              </div>
              <div class="space-y-4">
                <article class="flex items-center justify-between rounded-[22px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                  <div>
                    <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Catalogue gratuit</div>
                    <div class="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/48">Accès libre</div>
                  </div>
                  <div class="text-2xl font-bold text-[var(--color-brand-green-900)]">{{ data.freeCourses }}</div>
                </article>
                <article class="flex items-center justify-between rounded-[22px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                  <div>
                    <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Catalogue payant</div>
                    <div class="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/48">Formations monétisées</div>
                  </div>
                  <div class="text-2xl font-bold text-[var(--color-brand-green-900)]">{{ data.paidCourses }}</div>
                </article>
                <article class="flex items-center justify-between rounded-[22px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                  <div>
                    <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Inscriptions cumulées</div>
                    <div class="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/48">Tous modules confondus</div>
                  </div>
                  <div class="text-2xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalEnrollments }}</div>
                </article>
              </div>
            </section>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Top formations</h3>
                <span class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold-700)] shadow-[0_10px_22px_rgba(18,53,36,0.06)]">Selon les inscrites et revenus</span>
              </div>
              <div class="space-y-4">
                @for (course of data.topCourses; track course.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/78 p-5 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ course.title }}</h4>
                        <div class="mt-2 flex flex-wrap gap-2">
                          <span class="rounded-full bg-[var(--color-brand-green-900)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">{{ course.access === 'free' ? 'Gratuit' : 'Payant' }}</span>
                          <span class="rounded-full bg-[var(--color-brand-gold-300)]/26 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">{{ course.status === 'published' ? 'Publié' : 'Brouillon' }}</span>
                        </div>
                      </div>
                      <div class="grid grid-cols-2 gap-3 text-center">
                        <div class="rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3">
                          <div class="text-[11px] uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/45">Inscrites</div>
                          <div class="mt-1 text-xl font-bold text-[var(--color-brand-green-900)]">{{ course.enrollments }}</div>
                        </div>
                        <div class="rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3">
                          <div class="text-[11px] uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/45">Revenus</div>
                          <div class="mt-1 text-xl font-bold text-[var(--color-brand-green-900)]">{{ course.revenue }} €</div>
                        </div>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </section>

            <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Paiements récents</h3>
                <mat-icon class="text-[var(--color-brand-gold-700)]">receipt_long</mat-icon>
              </div>
              <div class="space-y-4">
                @for (payment of data.recentPayments; track payment.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/78 p-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-bold text-[var(--color-brand-green-900)]">{{ payment.studentName }}</div>
                        <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/68">{{ payment.courseTitle }}</div>
                        <div class="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/45">{{ payment.paidAt.slice(0, 10) }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ payment.amountEur }} €</div>
                        <span class="mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
                          [class.bg-emerald-100]="payment.status === 'paid'"
                          [class.text-emerald-800]="payment.status === 'paid'"
                          [class.bg-amber-100]="payment.status === 'pending'"
                          [class.text-amber-800]="payment.status === 'pending'">
                          {{ payment.status === 'paid' ? 'Payé' : 'En attente' }}
                        </span>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </section>
          </section>
        </div>
      }
    </app-dashboard-layout>
  `
})
export class AdminStatsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...ADMIN_MENU_ITEMS];
  stats = signal<AdminStatsData | null>(null);

  ngOnInit(): void {
    this.staff.getAdminStats().subscribe((data) => this.stats.set(data));
  }

  chartPoints(data: AdminStatsData): Array<{ label: string; amount: number; x: number; y: number }> {
    const max = Math.max(...data.revenueData.map((item) => item.amount), 1);
    const width = 640;
    const height = 220;
    const startX = 36;
    const endX = width - 36;
    const step = data.revenueData.length > 1 ? (endX - startX) / (data.revenueData.length - 1) : 0;

    return data.revenueData.map((item, index) => ({
      label: item.month,
      amount: item.amount,
      x: startX + (step * index),
      y: 24 + ((max - item.amount) / max) * (height - 36),
    }));
  }

  linePath(data: AdminStatsData): string {
    const points = this.chartPoints(data);
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  areaPath(data: AdminStatsData): string {
    const points = this.chartPoints(data);
    if (!points.length) return '';
    const baseline = 244;
    const start = `M ${points[0].x} ${baseline}`;
    const curve = points.map((point, index) => `${index === 0 ? 'L' : 'L'} ${point.x} ${point.y}`).join(' ');
    const end = `L ${points[points.length - 1].x} ${baseline} Z`;
    return `${start} ${curve} ${end}`;
  }

  chartLevels(data: AdminStatsData): number[] {
    const max = Math.max(...data.revenueData.map((item) => item.amount), 1);
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  }
}
