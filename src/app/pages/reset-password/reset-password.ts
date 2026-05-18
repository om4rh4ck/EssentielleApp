import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[linear-gradient(135deg,#f8f4ec_0%,#fffdf9_36%,#f0e4c9_100%)] px-4 py-8">
      <div class="mx-auto max-w-2xl rounded-[34px] border border-white/70 bg-white/92 p-6 shadow-[0_30px_80px_rgba(17,28,22,0.10)] sm:p-8 lg:p-10">
        <div class="border-b border-[var(--color-brand-gold-300)]/25 pb-6">
          <h1 class="font-serif text-4xl text-[var(--color-brand-green-900)]">Nouveau mot de passe</h1>
          <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/70">
            Saisissez votre nouveau mot de passe puis enregistrez-le pour retrouver l'acces a votre compte.
          </p>
        </div>

        @if (errorMsg()) {
          <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMsg() }}</div>
        }

        @if (successMsg()) {
          <div class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMsg() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-5">
          <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)]">
            <label for="reset-password" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
              <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">lock_reset</mat-icon>
              Nouveau mot de passe
            </label>
            <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
              <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">password</mat-icon>
              </span>
              <input id="reset-password" type="password" formControlName="password"
                class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none"
                placeholder="8 caracteres minimum" />
            </div>
          </div>

          <button type="submit" [disabled]="form.invalid || loading()" class="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-green-900)_0%,#24372c_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white disabled:opacity-55">
            <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">save</mat-icon>
            {{ loading() ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </form>

        <div class="mt-6 text-sm text-[var(--color-brand-green-800)]/70">
          <a routerLink="/login" class="font-semibold text-[var(--color-brand-gold-500)]">Retour a la connexion</a>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  submit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.errorMsg.set('Lien de reinitialisation invalide.');
      return;
    }

    if (this.form.invalid) return;
    this.loading.set(true);
    this.successMsg.set(null);
    this.errorMsg.set(null);

    this.auth.resetPassword(token, this.form.controls.password.value).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMsg.set(response.message);
        setTimeout(() => void this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error || 'Impossible de mettre a jour le mot de passe.');
      },
    });
  }
}
