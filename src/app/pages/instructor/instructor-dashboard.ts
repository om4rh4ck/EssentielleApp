import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { InstructorOverview, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Espace Formatrice" [menuItems]="menuItems">
      @if (overview(); as data) {
        <div class="space-y-8">
          <section class="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_78%_28%,rgba(232,199,133,0.22),transparent_14%),radial-gradient(circle_at_80%_70%,rgba(232,199,133,0.16),transparent_22%),linear-gradient(120deg,#102519_0%,#173927_46%,#4f5d46_100%)] p-7 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)] lg:p-8">
            <div class="pointer-events-none absolute inset-x-6 bottom-3 h-24 rounded-full bg-[radial-gradient(circle,rgba(200,169,106,0.18),transparent_68%)] blur-2xl"></div>
            <div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">school</mat-icon>
                  Pilotage formatrice
                </div>
                <h2 class="mt-5 max-w-xl font-serif text-[2.35rem] leading-[1.1] lg:text-[3rem]">
                  Gerez vos <span class="text-[var(--color-brand-gold-300)]">formations</span>,
                  vos <span class="text-[var(--color-brand-gold-300)]">lives</span>, vos examens et vos etudiantes.
                </h2>
                <p class="mt-4 max-w-xl text-sm leading-7 text-white/78 lg:text-[15px]">
                  Toutes vos actions sont liees au catalogue, aux messages et aux examens visibles par les etudiantes.
                </p>
              </div>

              <div class="flex w-full max-w-[420px] items-center justify-between gap-5 self-stretch xl:justify-end">
                <div class="relative hidden h-[230px] flex-1 xl:block">
                  <div class="absolute inset-0 rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)]"></div>
                  <div class="absolute bottom-6 left-10 h-16 w-16 rounded-[18px] bg-[linear-gradient(180deg,#f9f4e5_0%,#d7be8a_100%)] shadow-[0_18px_36px_rgba(0,0,0,0.18)]"></div>
                  <div class="absolute bottom-16 left-24 h-24 w-24 rounded-[26px] bg-[linear-gradient(180deg,#274f39_0%,#173927_100%)] shadow-[0_24px_44px_rgba(0,0,0,0.2)]"></div>
                  <div class="absolute bottom-12 left-32 h-24 w-28 rounded-[24px] bg-[linear-gradient(180deg,#315a43_0%,#1e402d_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.18)]"></div>
                  <div class="absolute bottom-20 left-40 h-24 w-32 rounded-[24px] bg-[linear-gradient(180deg,#3a6b50_0%,#264734_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.16)]"></div>
                  <div class="absolute left-36 top-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(180deg,#547b63_0%,#2b4b39_100%)] shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                    <mat-icon class="!h-[34px] !w-[34px] !text-[34px] text-[var(--color-brand-gold-300)]">school</mat-icon>
                  </div>
                </div>

                <div class="flex min-w-[210px] max-w-[240px] flex-1 flex-col gap-3">
                  <a routerLink="/instructor/courses" class="inline-flex items-center justify-between gap-3 rounded-[18px] bg-white px-5 py-4 text-sm font-bold text-[var(--color-brand-green-900)] shadow-[0_12px_26px_rgba(255,255,255,0.18)]">
                    <span class="inline-flex items-center gap-3">
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">auto_stories</mat-icon>
                      Mes formations
                    </span>
                  </a>
                  <a routerLink="/instructor/formulas" class="inline-flex items-center justify-between gap-3 rounded-[18px] border border-white/22 bg-white/6 px-5 py-4 text-sm font-bold text-white backdrop-blur-sm">
                    <span class="inline-flex items-center gap-3">
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">sell</mat-icon>
                      Mes formules
                    </span>
                  </a>
                  <a routerLink="/instructor/exams" class="inline-flex items-center justify-between gap-3 rounded-[18px] border border-white/22 bg-white/6 px-5 py-4 text-sm font-bold text-white backdrop-blur-sm">
                    <span class="inline-flex items-center gap-3">
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task</mat-icon>
                      Creer un examen
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-6 md:grid-cols-3">
            <article class="relative overflow-hidden rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="absolute -right-2 bottom-1 h-20 w-44 bg-[radial-gradient(circle_at_left,rgba(42,126,74,0.3),transparent_62%)]"></div>
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.16)]">
                <mat-icon>groups_2</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-[var(--color-brand-green-800)]/52">Etudiantes</div>
              <div class="mt-3 flex items-end gap-2">
                <div class="text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalStudents }}</div>
                <div class="pb-1 text-sm font-semibold text-[#4d9c52]">+12%</div>
              </div>
              <div class="mt-1 text-xs text-[var(--color-brand-green-800)]/55">vs mois dernier</div>
              <div class="mt-5 flex h-12 items-end gap-1">
                <span class="w-5 rounded-full bg-[#dcead9]" style="height: 28%"></span>
                <span class="w-5 rounded-full bg-[#c8dfc5]" style="height: 36%"></span>
                <span class="w-5 rounded-full bg-[#b2d3ae]" style="height: 48%"></span>
                <span class="w-5 rounded-full bg-[#98c492]" style="height: 56%"></span>
                <span class="w-5 rounded-full bg-[#7cb575]" style="height: 52%"></span>
                <span class="w-5 rounded-full bg-[#58a55a]" style="height: 72%"></span>
                <span class="w-5 rounded-full bg-[#3d8e48]" style="height: 100%"></span>
              </div>
            </article>

            <article class="relative overflow-hidden rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#faf4e7_0%,#ecdebf_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="absolute -right-2 bottom-1 h-20 w-44 bg-[radial-gradient(circle_at_left,rgba(200,169,106,0.35),transparent_62%)]"></div>
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-[var(--color-brand-green-900)] shadow-[0_18px_30px_rgba(200,169,106,0.22)]">
                <mat-icon>menu_book</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-[var(--color-brand-green-800)]/52">Formations actives</div>
              <div class="mt-3 flex items-end gap-2">
                <div class="text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.activeCourses }}</div>
                <div class="pb-1 text-sm font-semibold text-[#d28f34]">+2</div>
              </div>
              <div class="mt-1 text-xs text-[var(--color-brand-green-800)]/55">nouvelles</div>
              <div class="mt-5 flex h-12 items-end gap-1">
                <span class="w-5 rounded-full bg-[#efe2c2]" style="height: 36%"></span>
                <span class="w-5 rounded-full bg-[#ead8b2]" style="height: 28%"></span>
                <span class="w-5 rounded-full bg-[#e5cf9f]" style="height: 40%"></span>
                <span class="w-5 rounded-full bg-[#dfc487]" style="height: 56%"></span>
                <span class="w-5 rounded-full bg-[#d7b870]" style="height: 51%"></span>
                <span class="w-5 rounded-full bg-[#cfa95a]" style="height: 72%"></span>
                <span class="w-5 rounded-full bg-[#bc9043]" style="height: 100%"></span>
              </div>
            </article>

            <article class="relative overflow-hidden rounded-[30px] border border-emerald-900/8 bg-[radial-gradient(circle_at_80%_20%,rgba(232,199,133,0.12),transparent_18%),linear-gradient(180deg,#1f3c2d_0%,#102519_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.16)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 text-[var(--color-brand-gold-300)]">
                <mat-icon>workspace_premium</mat-icon>
              </div>
              <div class="mt-5 text-xs uppercase tracking-[0.28em] text-white/56">Note moyenne</div>
              <div class="mt-3 text-4xl font-bold">{{ data.averageRating }}/5</div>
              <div class="mt-3 flex gap-1 text-[var(--color-brand-gold-300)]">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">star</mat-icon>
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">star</mat-icon>
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">star</mat-icon>
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">star</mat-icon>
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">star</mat-icon>
              </div>
            </article>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Vos formations</h3>
                <a routerLink="/instructor/courses" class="inline-flex items-center gap-2 rounded-[16px] bg-[var(--color-brand-green-900)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(18,53,36,0.12)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">edit_square</mat-icon>
                  Gerer tout
                </a>
              </div>
              <div class="space-y-4">
                @for (course of data.courses; track course.id) {
                  <article class="flex flex-col gap-4 rounded-[24px] border border-[var(--color-brand-gold-300)]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f4ead9_100%)] p-4 md:flex-row md:items-center md:justify-between">
                    <div class="flex items-center gap-4">
                      <img [src]="course.thumbnail" [alt]="course.title" class="h-16 w-16 rounded-2xl object-cover" referrerpolicy="no-referrer" />
                      <div>
                        <div class="mb-2 inline-flex rounded-full bg-[#dbefda] px-3 py-1 text-[11px] font-bold text-[#4d9c52]">
                          {{ course.status === 'published' ? 'Publiee' : 'Brouillon' }}
                        </div>
                        <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ course.title }}</h4>
                        <p class="text-sm text-[var(--color-brand-green-800)]/65">{{ course.students }} etudiantes · {{ course.modules }} modules</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_18px_rgba(18,53,36,0.14)]">
                        {{ course.access === 'free' ? 'Gratuit' : 'Payant' }}
                      </div>
                      <mat-icon class="text-[var(--color-brand-green-900)]/70">chevron_right</mat-icon>
                    </div>
                  </article>
                }
              </div>
            </div>

            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Derniers messages</h3>
                <a routerLink="/instructor/messages" class="text-sm font-semibold text-[var(--color-brand-gold-700)] hover:underline">Ouvrir tout</a>
              </div>
              <div class="space-y-4">
                @for (message of data.latestMessages; track message.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/78 p-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center gap-3">
                          <div class="flex -space-x-2">
                            <span class="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--color-brand-green-900)] text-[10px] font-bold text-[var(--color-brand-gold-300)]">
                              {{ message.studentName.slice(0, 1) }}
                            </span>
                            <span class="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--color-brand-gold-500)] text-[10px] font-bold text-[var(--color-brand-green-900)]">
                              EE
                            </span>
                          </div>
                          <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ message.studentName }}</div>
                        </div>
                        <h4 class="mt-3 font-bold text-[var(--color-brand-green-900)]">{{ message.subject }}</h4>
                        <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">{{ message.content }}</p>
                      </div>
                      <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-brand-green-900)]/65">
                        <mat-icon>more_vert</mat-icon>
                      </button>
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
export class InstructorDashboardComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  overview = signal<InstructorOverview | null>(null);

  ngOnInit(): void {
    this.staff.getInstructorOverview().subscribe((data) => this.overview.set(data));
  }
}
