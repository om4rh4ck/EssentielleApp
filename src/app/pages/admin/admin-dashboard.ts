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
          <section class="overflow-hidden rounded-[34px] bg-[linear-gradient(120deg,#102519_0%,#173927_42%,#6e6148_100%)] p-8 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)]">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">admin_panel_settings</mat-icon>
                  Administration
                </div>
                <h2 class="mt-4 font-serif text-4xl leading-tight">Supervisez les accès, le catalogue, les paiements et les profils.</h2>
              </div>
              <a routerLink="/admin/users" class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)] shadow-[0_12px_26px_rgba(255,255,255,0.18)]">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">group</mat-icon>
                Ouvrir les utilisatrices
              </a>
            </div>
          </section>

          <section class="grid gap-6 md:grid-cols-3">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffaf2_0%,#f5ebdb_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.16)]">
                <mat-icon>groups</mat-icon>
              </div>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Utilisatrices</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalUsers }}</div>
            </div>

            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#f4f0e8_0%,#e7dcc7_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-[var(--color-brand-green-900)] shadow-[0_18px_30px_rgba(200,169,106,0.22)]">
                <mat-icon>menu_book</mat-icon>
              </div>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Formations actives</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.activeCourses }}</div>
            </div>

            <div class="rounded-[30px] border border-emerald-900/8 bg-[linear-gradient(180deg,#1f3c2d_0%,#102519_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.16)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 text-[var(--color-brand-gold-300)]">
                <mat-icon>payments</mat-icon>
              </div>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-white/56">Revenus encaissés</div>
              <div class="mt-3 text-4xl font-bold">{{ data.totalRevenue }} €</div>
            </div>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Évolution des revenus</h3>
                <a routerLink="/admin/stats" class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold-700)] shadow-[0_10px_22px_rgba(18,53,36,0.06)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">insights</mat-icon>
                  Statistiques complètes
                </a>
              </div>
              <div class="grid gap-4 md:grid-cols-5">
                @for (item of data.revenueData; track item.month) {
                  <div class="rounded-[22px] border border-[var(--color-brand-gold-300)]/18 bg-[linear-gradient(180deg,#ffffff_0%,#f1e7d5_100%)] p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">{{ item.month }}</div>
                    <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ item.amount }} €</div>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">À valider</h3>
                <a routerLink="/admin/payments" class="text-sm font-semibold text-[var(--color-brand-gold-700)] hover:underline">Voir paiements</a>
              </div>
              <div class="space-y-4">
                @for (item of data.pendingApprovals; track item.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/72 p-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
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
