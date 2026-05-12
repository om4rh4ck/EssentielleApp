import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-[var(--color-brand-cream)] font-sans relative overflow-hidden">
      <div class="absolute top-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-[var(--color-brand-gold-300)]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md bg-white rounded-[2rem] p-8 border border-[var(--color-brand-gold-300)]/30 relative z-10 shadow-xl shadow-[var(--color-brand-green-800)]/5">
        <div class="text-center mb-8 flex flex-col items-center">
          <a routerLink="/" class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/40 bg-white p-2 shadow-lg shadow-[var(--color-brand-gold-300)]/25">
            <img src="logo origine.png" alt="Essenti'Elle Santé" class="h-full w-full rounded-full object-contain" />
          </a>
          <h1 class="text-3xl font-serif text-[var(--color-brand-green-900)]">Bon retour</h1>
          <p class="text-sm font-light text-[var(--color-brand-green-800)]/70 mt-2">Connectez-vous à l'institut Essenti'Elle Santé.</p>
        </div>

        @if (errorMsg()) {
          <div class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <mat-icon class="text-base" style="width: 16px; height: 16px;">error_outline</mat-icon>
            {{errorMsg()}}
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <label for="login-email" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Email</label>
            <input type="email" id="login-email" formControlName="email"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="votre@email.com" />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="login-password" class="text-xs uppercase tracking-wider font-semibold text-[var(--color-brand-green-900)]">Mot de passe</label>
              <a href="#" class="text-xs text-[var(--color-brand-gold-500)] font-medium hover:underline">Oublié ?</a>
            </div>
            <input type="password" id="login-password" formControlName="password"
              class="px-4 py-3 bg-gray-50 border border-gray-200 outline-none focus:ring-1 focus:ring-[var(--color-brand-gold-500)] focus:border-[var(--color-brand-gold-500)] transition-all text-sm rounded-xl"
              placeholder="••••••••" />
          </div>

          <button type="submit" [disabled]="loginForm.invalid || loading()"
            class="mt-4 w-full bg-[var(--color-brand-green-800)] text-[var(--color-brand-cream)] py-4 font-medium uppercase tracking-widest text-sm hover:bg-[var(--color-brand-green-900)] transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {{ loading() ? 'Connexion...' : 'Se connecter' }}
          </button>
          
          <div class="mt-8 flex flex-col gap-3 pt-6 border-t border-[var(--color-brand-gold-300)]/30">
            <p class="text-[10px] text-[var(--color-brand-green-800)]/50 uppercase tracking-widest text-center mb-1">Comptes de test</p>
            <button type="button" (click)="fillDemo('admin')" class="text-xs py-2 bg-gray-50 hover:bg-gray-100 text-[var(--color-brand-green-800)] font-medium transition uppercase tracking-wider border border-gray-200">
              Admin (admin&#64;essentielle.com)
            </button>
            <button type="button" (click)="fillDemo('instructor')" class="text-xs py-2 bg-gray-50 hover:bg-gray-100 text-[var(--color-brand-green-800)] font-medium transition uppercase tracking-wider border border-gray-200">
              Formatrice (instructor&#64;essentielle.com)
            </button>
            <button type="button" (click)="fillDemo('student')" class="text-xs py-2 bg-gray-50 hover:bg-gray-100 text-[var(--color-brand-green-800)] font-medium transition uppercase tracking-wider border border-gray-200">
              Étudiante (student&#64;essentielle.com)
            </button>
          </div>
        </form>

        <p class="text-center text-sm text-[var(--color-brand-green-800)]/70 font-light mt-8">
          Pas encore de compte ? <a routerLink="/register" class="text-[var(--color-brand-gold-500)] font-medium hover:underline">S'inscrire</a>
        </p>
      </div>

      <div class="absolute bottom-4 left-4 right-4 mx-auto max-w-3xl rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white/92 p-4 shadow-[0_16px_34px_rgba(18,53,36,0.05)]">
        <div class="flex items-start gap-3">
          <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
            <mat-icon class="text-base" style="width: 20px; height: 20px;">gavel</mat-icon>
          </span>
          <p class="text-sm leading-7 text-[var(--color-brand-green-800)]/78">
            Tous les contenus, images, videos, documents et supports de Essenti'Elle Sante sont reserves de droit. Toute copie, recuperation ou reutilisation sans autorisation ecrite est interdite.
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  fillDemo(role: 'admin' | 'instructor' | 'student') {
    this.loginForm.patchValue({
      email: role + '@essentielle.com',
      password: 'password123'
    });
    this.onSubmit();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMsg.set(null);

      const { email, password } = this.loginForm.value;
      this.auth.login(email!, password!).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.user.role === 'admin') this.router.navigate(['/admin']);
          else if (res.user.role === 'instructor') this.router.navigate(['/instructor']);
          else this.router.navigate(['/student']);
        },
        error: (err) => {
          this.loading.set(false);
          const message = err?.error?.error ?? 'Email ou mot de passe incorrect.';
          this.errorMsg.set(message);
        }
      });
    }
  }
}
