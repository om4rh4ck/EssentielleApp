import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, MatIconModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-[var(--color-brand-cream)] font-sans relative overflow-hidden">
      <div class="absolute top-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-[var(--color-brand-gold-300)]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md bg-white rounded-[2rem] p-8 border border-[var(--color-brand-gold-300)]/30 relative z-10 shadow-xl shadow-[var(--color-brand-green-800)]/5">
        <div class="text-center mb-8 flex flex-col items-center">
          <a routerLink="/" class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/40 bg-white p-2 shadow-lg shadow-[var(--color-brand-gold-300)]/25">
            <img src="ess logo.png" alt="Essenti'Elle Santé" class="h-full w-full rounded-full object-contain" />
          </a>
          <h1 class="text-3xl font-serif text-[var(--color-brand-green-900)]">Rejoindre l'Institut</h1>
          <p class="text-sm font-light text-[var(--color-brand-green-800)]/70 mt-2">Créez votre espace Essenti'Elle Santé.</p>
        </div>

        @if (errorMsg()) {
          <div class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <mat-icon class="text-base" style="width: 16px; height: 16px;">error_outline</mat-icon>
            {{ errorMsg() }}
          </div>
        }

        @if (successMsg()) {
          <div class="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <mat-icon class="text-base" style="width: 16px; height: 16px;">check_circle</mat-icon>
            {{ successMsg() }}
          </div>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <label for="reg-name" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Nom complet</label>
            <input type="text" id="reg-name" formControlName="name"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="Ex: Sophie Martin" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reg-email" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Email</label>
            <input type="email" id="reg-email" formControlName="email"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="votre@email.com" />
          </div>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="reg-phone" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Téléphone</label>
              <input type="text" id="reg-phone" formControlName="phone"
                class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
                placeholder="+216 ..." />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="reg-city" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Ville</label>
              <input type="text" id="reg-city" formControlName="city"
                class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
                placeholder="Djerba" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reg-country" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Pays</label>
            <input type="text" id="reg-country" formControlName="country"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="Tunisie" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reg-objective" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Objectif</label>
            <textarea id="reg-objective" rows="3" formControlName="objective"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl resize-none"
              placeholder="Votre projet dans le bien-être féminin"></textarea>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label for="reg-pwd" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Mot de passe</label>
            <input type="password" id="reg-pwd" formControlName="password"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="••••••••" />
          </div>

          <button type="submit" [disabled]="registerForm.invalid || loading()"
            class="mt-4 w-full bg-[var(--color-brand-green-800)] text-[var(--color-brand-cream)] py-4 font-medium uppercase tracking-widest text-sm hover:bg-[var(--color-brand-green-900)] transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {{ loading() ? 'Création en cours...' : "S'inscrire" }}
          </button>
        </form>

        <p class="text-center text-sm font-light text-[var(--color-brand-green-800)]/70 mt-8">
          Déjà un compte ? <a routerLink="/login" class="text-[var(--color-brand-gold-500)] font-medium hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    city: [''],
    country: [''],
    objective: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMsg.set('Veuillez remplir correctement tous les champs.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const { name, email, password, phone, city, country, objective } = this.registerForm.getRawValue();
    this.auth.register({
      name: name!,
      email: email!,
      password: password!,
      phone: phone ?? '',
      city: city ?? '',
      country: country ?? '',
      objective: objective ?? '',
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMsg.set('Compte créé avec succès. Redirection vers votre espace...');
        if (res.user.role === 'admin') this.router.navigate(['/admin']);
        else if (res.user.role === 'instructor') this.router.navigate(['/instructor']);
        else this.router.navigate(['/student']);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.error ?? "Impossible de créer le compte pour le moment.";
        this.errorMsg.set(message);
      }
    });
  }
}
