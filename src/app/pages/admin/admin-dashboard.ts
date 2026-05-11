import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { AdminOverview, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DashboardLayoutComponent, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Vue d'ensemble Admin" [menuItems]="menuItems">
      @if (overview(); as data) {
        <div class="space-y-8">
          <section class="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_78%_28%,rgba(232,199,133,0.2),transparent_16%),linear-gradient(120deg,#102519_0%,#173927_42%,#5c634d_100%)] p-7 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)] lg:p-8">
            <div class="pointer-events-none absolute right-10 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_65%)] blur-2xl"></div>
            <div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">admin_panel_settings</mat-icon>
                  Administration
                </div>
                <h2 class="mt-5 max-w-xl font-serif text-[2.2rem] leading-[1.08] lg:text-[2.8rem]">
                  Supervisez les acces, le catalogue, les paiements et les profils.
                </h2>
                <p class="mt-4 max-w-xl text-sm leading-7 text-white/78">
                  Un tableau de bord premium pour suivre les utilisatrices, valider les actions et garder une vue claire sur l'activite.
                </p>
              </div>

              <div class="flex w-full max-w-[260px] flex-col gap-3">
                <a routerLink="/admin/users" class="inline-flex items-center gap-3 rounded-[18px] bg-white px-5 py-4 text-sm font-bold text-[var(--color-brand-green-900)] shadow-[0_12px_26px_rgba(255,255,255,0.18)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">group</mat-icon>
                  Ouvrir les utilisatrices
                </a>
                <a routerLink="/admin/payments" class="inline-flex items-center gap-3 rounded-[18px] border border-white/22 bg-white/6 px-5 py-4 text-sm font-bold text-white backdrop-blur-sm">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">payments</mat-icon>
                  Voir les paiements
                </a>
              </div>
            </div>
          </section>

          <section class="grid gap-6 md:grid-cols-3">
            <article class="rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.16)]">
                <mat-icon>groups</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-[var(--color-brand-green-800)]/52">Utilisatrices</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalUsers }}</div>
              <div class="mt-4 flex h-12 items-end gap-1">
                <span class="w-5 rounded-full bg-[#dcead9]" style="height: 32%"></span>
                <span class="w-5 rounded-full bg-[#c8dfc5]" style="height: 44%"></span>
                <span class="w-5 rounded-full bg-[#b2d3ae]" style="height: 58%"></span>
                <span class="w-5 rounded-full bg-[#98c492]" style="height: 70%"></span>
                <span class="w-5 rounded-full bg-[#58a55a]" style="height: 100%"></span>
              </div>
            </article>

            <article class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#faf4e7_0%,#ecdebf_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-[var(--color-brand-green-900)] shadow-[0_18px_30px_rgba(200,169,106,0.22)]">
                <mat-icon>menu_book</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-[var(--color-brand-green-800)]/52">Formations actives</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.activeCourses }}</div>
              <div class="mt-4 flex h-12 items-end gap-1">
                <span class="w-5 rounded-full bg-[#efe2c2]" style="height: 26%"></span>
                <span class="w-5 rounded-full bg-[#ead8b2]" style="height: 36%"></span>
                <span class="w-5 rounded-full bg-[#e5cf9f]" style="height: 50%"></span>
                <span class="w-5 rounded-full bg-[#d7b870]" style="height: 72%"></span>
                <span class="w-5 rounded-full bg-[#bc9043]" style="height: 100%"></span>
              </div>
            </article>

            <article class="rounded-[30px] border border-emerald-900/8 bg-[radial-gradient(circle_at_80%_20%,rgba(232,199,133,0.12),transparent_18%),linear-gradient(180deg,#1f3c2d_0%,#102519_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.16)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 text-[var(--color-brand-gold-300)]">
                <mat-icon>payments</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-white/56">Revenus encaisses</div>
              <div class="mt-3 text-4xl font-bold">{{ data.totalRevenue }} EUR</div>
            </article>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Evolution des revenus</h3>
                <a routerLink="/admin/stats" class="inline-flex items-center gap-2 rounded-[16px] bg-[var(--color-brand-green-900)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(18,53,36,0.12)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">insights</mat-icon>
                  Statistiques completes
                </a>
              </div>
              <div class="grid gap-4 md:grid-cols-5">
                @for (item of data.revenueData; track item.month) {
                  <div class="rounded-[22px] border border-[var(--color-brand-gold-300)]/18 bg-[linear-gradient(180deg,#ffffff_0%,#f1e7d5_100%)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">{{ item.month }}</div>
                    <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ item.amount }} EUR</div>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">A valider</h3>
                <a routerLink="/admin/payments" class="text-sm font-semibold text-[var(--color-brand-gold-700)] hover:underline">Voir paiements</a>
              </div>
              <div class="space-y-4">
                @for (item of data.pendingApprovals; track item.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/78 p-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ item.name }}</div>
                        <div class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ item.type }}</div>
                      </div>
                      <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                        <mat-icon>verified_user</mat-icon>
                      </span>
                    </div>
                  </article>
                }
              </div>
            </div>
          </section>
        </div>
      }
    </app-dashboard-layout>
  `
})
export class AdminDashboardComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...ADMIN_MENU_ITEMS];
  overview = signal<AdminOverview | null>(null);

  ngOnInit(): void {
    this.staff.getAdminOverview().subscribe((data) => this.overview.set(data));
  }
}
