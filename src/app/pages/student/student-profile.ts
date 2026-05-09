import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { AuthService } from '../../services/auth.service';
import { StudentPortalService, StudentProfile } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Mon Profil" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <section class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
          <div class="flex flex-col items-center text-center">
            <div class="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-brand-gold-500)] text-3xl font-bold text-white">
              {{ initial() }}
            </div>
            <h2 class="mt-5 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ profile()?.name }}</h2>
            <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ profile()?.email }}</p>
            <div class="mt-4 rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">
              Étudiante Essenti’Elle
            </div>
          </div>

          <div class="mt-8 space-y-4">
            <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Téléphone</div>
              <div class="mt-2 font-semibold text-[var(--color-brand-green-900)]">{{ profile()?.phone || 'Non renseigné' }}</div>
            </div>
            <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Ville</div>
              <div class="mt-2 font-semibold text-[var(--color-brand-green-900)]">{{ profile()?.city || 'Non renseignée' }}</div>
            </div>
            <div class="rounded-2xl bg-[var(--color-brand-cream)] p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Pays</div>
              <div class="mt-2 font-semibold text-[var(--color-brand-green-900)]">{{ profile()?.country || 'Non renseigné' }}</div>
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Modifier mes informations</h2>
          <form [formGroup]="form" (ngSubmit)="save()" class="mt-6 grid gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">Nom complet</label>
              <input formControlName="name" class="w-full rounded-2xl border border-gray-200 bg-[var(--color-brand-cream)] px-4 py-3 text-sm text-[var(--color-brand-green-900)] outline-none" />
            </div>
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">Téléphone</label>
              <input formControlName="phone" class="w-full rounded-2xl border border-gray-200 bg-[var(--color-brand-cream)] px-4 py-3 text-sm text-[var(--color-brand-green-900)] outline-none" />
            </div>
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">Ville</label>
              <input formControlName="city" class="w-full rounded-2xl border border-gray-200 bg-[var(--color-brand-cream)] px-4 py-3 text-sm text-[var(--color-brand-green-900)] outline-none" />
            </div>
            <div class="md:col-span-2">
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">Pays</label>
              <input formControlName="country" class="w-full rounded-2xl border border-gray-200 bg-[var(--color-brand-cream)] px-4 py-3 text-sm text-[var(--color-brand-green-900)] outline-none" />
            </div>
            <div class="md:col-span-2">
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">Objectif</label>
              <textarea formControlName="objective" rows="5" class="w-full rounded-2xl border border-gray-200 bg-[var(--color-brand-cream)] px-4 py-3 text-sm leading-7 text-[var(--color-brand-green-900)] outline-none"></textarea>
            </div>
            <div class="md:col-span-2">
              <button type="submit" [disabled]="form.invalid" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:cursor-not-allowed disabled:opacity-50">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">save</mat-icon>
                Enregistrer mes modifications
              </button>
            </div>
          </form>
        </section>
      </div>
    </app-dashboard-layout>
  `
})
export class StudentProfileComponent implements OnInit {
  private portal = inject(StudentPortalService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  menuItems = [...STUDENT_MENU_ITEMS];
  profile = signal<StudentProfile | null>(null);
  initial = signal('E');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    city: [''],
    country: [''],
    objective: [''],
  });

  ngOnInit(): void {
    this.portal.getProfile().subscribe((data) => {
      this.profile.set(data);
      this.initial.set(data.name.charAt(0).toUpperCase());
      this.form.patchValue({
        name: data.name,
        phone: data.phone,
        city: data.city,
        country: data.country,
        objective: data.objective,
      });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.portal.updateProfile(this.form.getRawValue()).subscribe((data) => {
      this.profile.set(data);
      this.initial.set(data.name.charAt(0).toUpperCase());
      this.auth.updateCurrentUser({ name: data.name });
    });
  }
}
