import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { STUDENT_MENU_ITEMS } from './student-menu';
import { StudentOverview, StudentPortalService } from '../../services/student-portal.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, RouterModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Mon Espace" [menuItems]="menuItems">
      @if (loading()) {
        <div class="flex h-64 items-center justify-center">
          <mat-icon class="animate-spin text-[var(--color-brand-green-900)]">autorenew</mat-icon>
        </div>
      } @else if (overview(); as data) {
        <div class="space-y-8">
          <section class="overflow-hidden rounded-[34px] bg-[linear-gradient(120deg,#102519_0%,#173927_44%,#7f6f55_100%)] p-8 text-white shadow-[0_34px_70px_rgba(18,53,36,0.18)]">
            <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div class="max-w-2xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/78">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">favorite</mat-icon>
                  Espace étudiante
                </div>
                <h2 class="mb-3 mt-4 font-serif text-4xl leading-tight">Votre formation avance pas à pas.</h2>
                <p class="max-w-xl text-sm leading-7 text-white/80">
                  Continuez votre parcours, consultez vos examens, vos certificats et vos échanges avec la formatrice ou la directrice depuis un seul espace.
                </p>
                <a [routerLink]="['/student/course', data.featuredCourseId]" class="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-cream)]">
                  Reprendre {{ data.featuredCourseTitle }}
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">arrow_forward</mat-icon>
                </a>
              </div>

              <div class="grid w-full max-w-xl grid-cols-2 gap-4">
                <div class="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs uppercase tracking-[0.25em] text-white/60">Progression</div>
                    <mat-icon class="text-[var(--color-brand-gold-300)]">trending_up</mat-icon>
                  </div>
                  <div class="mt-2 text-3xl font-bold">{{ data.featuredProgress }}%</div>
                  <div class="mt-3 h-2 rounded-full bg-white/15">
                    <div class="h-2 rounded-full bg-[var(--color-brand-gold-300)]" [style.width.%]="data.featuredProgress"></div>
                  </div>
                </div>
                <div class="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs uppercase tracking-[0.25em] text-white/60">Moyenne</div>
                    <mat-icon class="text-[var(--color-brand-gold-300)]">workspace_premium</mat-icon>
                  </div>
                  <div class="mt-2 text-3xl font-bold">{{ data.averageScore }}/20</div>
                  <div class="mt-2 text-sm text-white/70">Résultats affectés par la formatrice</div>
                </div>
                <div class="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs uppercase tracking-[0.25em] text-white/60">Formations</div>
                    <mat-icon class="text-[var(--color-brand-gold-300)]">auto_stories</mat-icon>
                  </div>
                  <div class="mt-2 text-3xl font-bold">{{ data.enrolledCount }}</div>
                  <div class="mt-2 text-sm text-white/70">En cours ou terminées</div>
                </div>
                <div class="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs uppercase tracking-[0.25em] text-white/60">Certificats</div>
                    <mat-icon class="text-[var(--color-brand-gold-300)]">verified</mat-icon>
                  </div>
                  <div class="mt-2 text-3xl font-bold">{{ data.certificateCount }}</div>
                  <div class="mt-2 text-sm text-white/70">Disponibles après validation</div>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="mb-6 flex items-center justify-between">
                <div>
                  <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Mes formations</h3>
                  <p class="mt-1 text-sm text-[var(--color-brand-green-800)]/65">Accédez à vos cours gratuits ou premium.</p>
                </div>
                <a routerLink="/student/catalog" class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold-700)] shadow-[0_10px_22px_rgba(18,53,36,0.06)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">travel_explore</mat-icon>
                  Voir le catalogue
                </a>
              </div>

              <div class="grid gap-5 md:grid-cols-2">
                @for (course of data.courses; track course.id) {
                  <article class="overflow-hidden rounded-[24px] border border-[var(--color-brand-gold-300)]/18 bg-[linear-gradient(180deg,#ffffff_0%,#f1e7d5_100%)] shadow-[0_12px_30px_rgba(18,53,36,0.05)]">
                    <img [src]="course.thumbnail" [alt]="course.title" class="h-44 w-full object-cover" referrerpolicy="no-referrer" />
                    <div class="space-y-4 p-5">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <div class="mb-2 inline-flex rounded-full bg-[var(--color-brand-green-900)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                            {{ course.access === 'free' ? 'Gratuit' : 'Payant' }}
                          </div>
                          <h4 class="text-lg font-bold text-[var(--color-brand-green-900)]">{{ course.title }}</h4>
                        </div>
                        <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-brand-green-900)] shadow-[0_8px_18px_rgba(18,53,36,0.05)]">{{ course.progress }}%</span>
                      </div>
                      <p class="text-sm leading-6 text-[var(--color-brand-green-800)]/75">{{ course.description }}</p>
                      <div class="h-2 rounded-full bg-white/90">
                        <div class="h-2 rounded-full bg-[var(--color-brand-gold-500)]" [style.width.%]="course.progress"></div>
                      </div>
                      <div class="flex items-center justify-between text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-brand-green-800)]/50">
                        <span>{{ course.modules }} modules</span>
                        <span>{{ course.students }} inscrites</span>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </div>

            <div class="space-y-6">
              <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
                <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Accès rapide</h3>
                <div class="mt-5 space-y-3">
                  <a routerLink="/student/certificates" class="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_10px_22px_rgba(18,53,36,0.05)] transition hover:bg-white">
                    <span class="inline-flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">workspace_premium</mat-icon>
                      </span>
                      Certificats
                    </span>
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
                  </a>
                  <a routerLink="/student/messages" class="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_10px_22px_rgba(18,53,36,0.05)] transition hover:bg-white">
                    <span class="inline-flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-[var(--color-brand-green-900)]">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">mail</mat-icon>
                      </span>
                      Messages
                    </span>
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
                  </a>
                  <a routerLink="/student/exams" class="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_10px_22px_rgba(18,53,36,0.05)] transition hover:bg-white">
                    <span class="inline-flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-green-800)] text-white">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">fact_check</mat-icon>
                      </span>
                      Examen & Moyenne
                    </span>
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
                  </a>
                  <a routerLink="/student/schedule" class="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_10px_22px_rgba(18,53,36,0.05)] transition hover:bg-white">
                    <span class="inline-flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">calendar_month</mat-icon>
                      </span>
                      Emploi du temps
                    </span>
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
                  </a>
                  <a routerLink="/student/profile" class="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_10px_22px_rgba(18,53,36,0.05)] transition hover:bg-white">
                    <span class="inline-flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-300)] text-[var(--color-brand-green-900)]">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">person</mat-icon>
                      </span>
                      Mon profil
                    </span>
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
                  </a>
                </div>
              </section>

              <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#133123_0%,#234835_100%)] p-6 text-white shadow-[0_24px_54px_rgba(18,53,36,0.14)]">
                <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-[var(--color-brand-gold-300)]">
                  <mat-icon>emoji_events</mat-icon>
                </div>
                <h3 class="mt-4 font-serif text-2xl">Objectif du moment</h3>
                <p class="mt-3 text-sm leading-7 text-white/78">
                  Finalisez vos modules, validez votre examen puis recevez votre certificat administré par l'équipe Essenti'Elle.
                </p>
              </section>
            </div>
          </section>
        </div>
      }
    </app-dashboard-layout>
  `
})
export class StudentDashboardComponent implements OnInit {
  private portal = inject(StudentPortalService);

  menuItems = [...STUDENT_MENU_ITEMS];
  loading = signal(true);
  overview = signal<StudentOverview | null>(null);

  ngOnInit(): void {
    this.portal.getOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
