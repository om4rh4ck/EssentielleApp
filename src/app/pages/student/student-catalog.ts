import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { StudentCourse, StudentPortalService } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-catalog',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, RouterLink, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Catalogue" [menuItems]="menuItems">
      <div class="space-y-6">
        <div class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-8 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Les formations disponibles</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-brand-green-800)]/70">
            Les formations gratuites peuvent etre rejointes immediatement. Les formations payantes peuvent maintenant etre demandees directement depuis votre catalogue et seront activees apres validation par l'administration.
          </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          @for (course of courses(); track course.id) {
            <article class="overflow-hidden rounded-[28px] border border-[var(--color-brand-gold-300)]/30 bg-white shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
              <img [src]="course.thumbnail" [alt]="course.title" class="h-56 w-full object-cover" referrerpolicy="no-referrer" />
              <div class="space-y-5 p-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ course.category }}</span>
                  <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
                    [class]="course.access === 'free'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-[var(--color-brand-green-900)] text-white'">
                    {{ course.access === 'free' ? 'Gratuit' : 'Payant' }}
                  </span>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ course.title }}</h3>
                    <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/75">{{ course.description }}</p>
                  </div>
                  <div class="shrink-0 rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-right">
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Prix</div>
                    <div class="mt-1 text-lg font-bold text-[var(--color-brand-green-900)]">
                      {{ course.access === 'free' ? 'Acces libre' : (course.priceEur | currency:'EUR':'symbol':'1.0-0') }}
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3 rounded-2xl bg-[var(--color-brand-cream)] p-4 text-center">
                  <div>
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/40">Modules</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ course.modules }}</div>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/40">Inscrites</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ course.students }}</div>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/40">Progression</div>
                    <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ course.progress }}%</div>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3">
                  @if (course.enrolled) {
                    <a [routerLink]="['/student/course', course.id]" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]">
                      Continuer la formation
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">play_circle</mat-icon>
                    </a>
                  } @else if (course.access === 'free') {
                    <button (click)="enroll(course.id)" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-900)]">
                      S'inscrire gratuitement
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">how_to_reg</mat-icon>
                    </button>
                  } @else if (course.enrollmentRequestStatus === 'pending') {
                    <button type="button" disabled class="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 opacity-90">
                      Demande envoyee
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">schedule</mat-icon>
                    </button>
                  } @else {
                    <button type="button" (click)="requestEnrollment(course.id)" class="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)] transition hover:bg-[var(--color-brand-green-900)] hover:text-white">
                      Demander l'inscription
                      <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">assignment</mat-icon>
                    </button>
                  }

                  <span class="inline-flex items-center rounded-full bg-[var(--color-brand-cream)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/60">
                    {{ course.enrolled ? 'Deja inscrite' : (course.enrollmentRequestStatus === 'pending' ? 'En attente' : 'Disponible') }}
                  </span>
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class StudentCatalogComponent implements OnInit {
  private portal = inject(StudentPortalService);
  private router = inject(Router);

  menuItems = [...STUDENT_MENU_ITEMS];
  courses = signal<StudentCourse[]>([]);

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.portal.getCatalog().subscribe((data) => this.courses.set(data));
  }

  enroll(courseId: string): void {
    this.portal.enrollInCourse(courseId).subscribe(() => this.loadCatalog());
  }

  requestEnrollment(courseId: string): void {
    void this.router.navigate(['/formations', courseId, 'inscription'], {
      queryParams: { returnTo: '/student/catalog' },
    });
  }
}
