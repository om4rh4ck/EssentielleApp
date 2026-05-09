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
          <section class="overflow-hidden rounded-[34px] bg-[linear-gradient(120deg,#102519_0%,#173927_45%,#7f6f55_100%)] p-8 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)]">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">school</mat-icon>
                  Pilotage formatrice
                </div>
                <h2 class="mt-4 font-serif text-4xl leading-tight">Gérez vos formations, vos lives, vos examens et vos étudiantes.</h2>
                <p class="mt-4 max-w-xl text-sm leading-7 text-white/80">
                  Toutes vos actions sont liées au catalogue, aux messages et aux examens visibles par les étudiantes.
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                <a routerLink="/instructor/courses" class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)] shadow-[0_12px_26px_rgba(255,255,255,0.18)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">auto_stories</mat-icon>
                  Mes formations
                </a>
                <a routerLink="/instructor/formulas" class="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">sell</mat-icon>
                  Mes formules
                </a>
                <a routerLink="/instructor/exams" class="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">task</mat-icon>
                  Créer un examen
                </a>
              </div>
            </div>
          </section>

          <section class="grid gap-6 md:grid-cols-3">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffaf2_0%,#f5ebdb_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white shadow-[0_18px_30px_rgba(18,53,36,0.16)]">
                <mat-icon>groups_2</mat-icon>
              </div>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/52">Étudiantes</div>
              <div class="mt-3 text-4xl font-bold text-[var(--color-brand-green-900)]">{{ data.totalStudents }}</div>
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
                <mat-icon>workspace_premium</mat-icon>
              </div>
              <div class="mt-5 text-sm uppercase tracking-[0.22em] text-white/56">Note moyenne</div>
              <div class="mt-3 text-4xl font-bold">{{ data.averageRating }}/5</div>
            </div>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Vos formations</h3>
                <a routerLink="/instructor/courses" class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold-700)] shadow-[0_10px_22px_rgba(18,53,36,0.06)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">edit_square</mat-icon>
                  Gérer tout
                </a>
              </div>
              <div class="space-y-4">
                @for (course of data.courses; track course.id) {
                  <article class="flex flex-col gap-4 rounded-[24px] border border-[var(--color-brand-gold-300)]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2e7d4_100%)] p-4 md:flex-row md:items-center md:justify-between">
                    <div class="flex items-center gap-4">
                      <img [src]="course.thumbnail" [alt]="course.title" class="h-16 w-16 rounded-2xl object-cover" referrerpolicy="no-referrer" />
                      <div>
                        <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ course.title }}</h4>
                        <p class="text-sm text-[var(--color-brand-green-800)]/65">{{ course.students }} inscrites · {{ course.modules }} modules</p>
                      </div>
                    </div>
                    <div class="rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_18px_rgba(18,53,36,0.14)]">
                      {{ course.access === 'free' ? 'Gratuit' : 'Payant' }}
                    </div>
                  </article>
                }
              </div>
            </div>

            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between gap-4">
                <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Derniers messages</h3>
                <a routerLink="/instructor/messages" class="text-sm font-semibold text-[var(--color-brand-gold-700)] hover:underline">Ouvrir</a>
              </div>
              <div class="space-y-4">
                @for (message of data.latestMessages; track message.id) {
                  <article class="rounded-[22px] border border-white/70 bg-white/72 p-4 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ message.studentName }}</div>
                        <h4 class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ message.subject }}</h4>
                        <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">{{ message.content }}</p>
                      </div>
                      <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                        <mat-icon>chat_bubble</mat-icon>
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
export class InstructorDashboardComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  overview = signal<InstructorOverview | null>(null);

  ngOnInit(): void {
    this.staff.getInstructorOverview().subscribe((data) => this.overview.set(data));
  }
}
