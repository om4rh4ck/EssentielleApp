import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { AuthService } from '../../services/auth.service';
import { RoleProfile, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-profile',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Profil" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <section class="rounded-[28px] bg-white p-6 text-center shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-brand-gold-500)] text-3xl font-bold text-white">{{ initial() }}</div>
          <h2 class="mt-5 font-serif text-3xl text-[var(--color-brand-green-900)]">{{ profile()?.name }}</h2>
          <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ profile()?.email }}</p>
          <p class="mt-4 text-sm leading-7 text-[var(--color-brand-green-800)]/70">{{ profile()?.bio }}</p>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Modifier le profil formatrice</h2>
          <form [formGroup]="form" (ngSubmit)="save()" class="mt-6 grid gap-4">
            <input formControlName="name" placeholder="Nom" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <input formControlName="phone" placeholder="Téléphone" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <input formControlName="city" placeholder="Ville" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <input formControlName="country" placeholder="Pays" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <textarea formControlName="bio" rows="5" placeholder="Bio" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">Enregistrer</button>
          </form>
        </section>
      </div>
    </app-dashboard-layout>
  `
})
export class InstructorProfileComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  profile = signal<RoleProfile | null>(null);
  initial = signal('F');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    city: [''],
    country: [''],
    bio: [''],
  });

  ngOnInit(): void {
    this.staff.getInstructorProfile().subscribe((data) => {
      this.profile.set(data);
      this.initial.set(data.name.charAt(0).toUpperCase());
      this.form.patchValue(data);
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.staff.updateInstructorProfile(this.form.getRawValue()).subscribe((data) => {
      this.profile.set(data);
      this.initial.set(data.name.charAt(0).toUpperCase());
      this.auth.updateCurrentUser({ name: data.name });
    });
  }
}
