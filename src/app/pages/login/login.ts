import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8f4ec_0%,#fffdf9_36%,#f0e4c9_100%)] px-2 py-4 font-sans sm:px-3 sm:py-5 lg:px-4 lg:py-6">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute left-[-8%] top-[8%] h-72 w-72 rounded-full bg-[var(--color-brand-gold-300)]/28 blur-3xl"></div>
        <div class="absolute bottom-[-8%] right-[-5%] h-80 w-80 rounded-full bg-[var(--color-brand-green-800)]/10 blur-3xl"></div>
      </div>

      <div class="relative z-10 mx-auto min-h-[calc(100vh-1.5rem)] w-full">
        <section class="w-full rounded-[34px] border border-white/70 bg-white/92 p-6 shadow-[0_30px_80px_rgba(17,28,22,0.10)] backdrop-blur sm:p-8 lg:p-10 xl:p-12 2xl:px-14">
          <div class="mb-8 flex flex-col gap-6 border-b border-[var(--color-brand-gold-300)]/25 pb-8 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <h1 class="font-serif text-4xl leading-tight text-[var(--color-brand-green-900)] sm:text-5xl">Connexion</h1>
            </div>
          </div>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ef_100%)] p-6 shadow-[0_18px_40px_rgba(17,28,22,0.05)] sm:p-7 xl:p-9">
              <div class="mb-6 flex items-center gap-3">
                <a routerLink="/" class="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-brand-gold-300)]/35 bg-white p-2 shadow-lg shadow-[var(--color-brand-gold-300)]/20">
                  <img src="lo2 originale.png" alt="Essenti' Elle Formation et Bien Être" class="h-full w-full rounded-xl object-contain" />
                </a>
                <div>
                  <div class="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-brand-gold-500)]">Connexion</div>
                  <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/70">Acces securise a votre compte</div>
                </div>
              </div>

              @if (errorMsg()) {
                <div class="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">error_outline</mat-icon>
                  {{ errorMsg() }}
                </div>
              }

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
                <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)]">
                  <label for="login-email" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">alternate_email</mat-icon>
                    Email ou nom d'utilisateur
                  </label>
                  <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                    <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                      <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">mail</mat-icon>
                    </span>
                    <input type="text" id="login-email" formControlName="email"
                      class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                      placeholder="contact@exemple.com ou votre identifiant" />
                  </div>
                </div>

                <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)]">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <label for="login-password" class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">lock</mat-icon>
                      Mot de passe
                    </label>
                    <div class="flex items-center gap-4">
                      <a routerLink="/forgot-password" class="text-xs font-semibold text-[var(--color-brand-gold-500)] transition hover:text-[var(--color-brand-green-900)]">
                        Mot de passe oublie ?
                      </a>
                      <a routerLink="/register" [queryParams]="registerQueryParams()" class="text-xs font-semibold text-[var(--color-brand-gold-500)] transition hover:text-[var(--color-brand-green-900)]">
                        Creer un compte
                      </a>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                    <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                      <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">password</mat-icon>
                    </span>
                    <input type="password" id="login-password" formControlName="password"
                      class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                      placeholder="••••••••" />
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/24 bg-[var(--color-brand-cream)]/75 px-4 py-3">
                    <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">shield</mat-icon>
                      Acces securise
                    </div>
                    <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/68">Connexion reservee aux espaces admin, formatrice et etudiante.</p>
                  </div>
                  <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/24 bg-[var(--color-brand-cream)]/75 px-4 py-3">
                    <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">mark_email_read</mat-icon>
                      E-mail principal
                    </div>
                    <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/68">Vous pouvez vous connecter avec votre e-mail complet ou avec la partie avant le symbole @.</p>
                  </div>
                </div>

                <button type="submit" [disabled]="loginForm.invalid || loading()"
                  class="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-green-900)_0%,#24372c_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_24px_40px_rgba(15,23,19,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_46px_rgba(15,23,19,0.22)] disabled:cursor-not-allowed disabled:opacity-55">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">login</mat-icon>
                  {{ loading() ? 'Connexion...' : 'Se connecter' }}
                </button>
              </form>

              <div class="mt-8 border-t border-[var(--color-brand-gold-300)]/25 pt-6">
                <div class="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-green-800)]/52">
                  <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">bolt</mat-icon>
                  Comptes de test
                </div>
                <div class="grid gap-3">
                  <button type="button" (click)="fillDemo('admin')" class="flex items-center justify-between rounded-2xl border border-[var(--color-brand-gold-300)]/20 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-brand-gold-300)]/45 hover:shadow-[0_16px_28px_rgba(17,28,22,0.06)]">
                    <span class="flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">admin_panel_settings</mat-icon>
                      </span>
                      <span>
                        <span class="block text-sm font-bold text-[var(--color-brand-green-900)]">Admin</span>
                        <span class="block text-xs text-[var(--color-brand-green-800)]/60">admin&#64;lessentielle-sante.site</span>
                      </span>
                    </span>
                    <mat-icon class="text-[var(--color-brand-gold-500)]">arrow_forward</mat-icon>
                  </button>

                  <button type="button" (click)="fillDemo('instructor')" class="flex items-center justify-between rounded-2xl border border-[var(--color-brand-gold-300)]/20 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-brand-gold-300)]/45 hover:shadow-[0_16px_28px_rgba(17,28,22,0.06)]">
                    <span class="flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-500)] text-white">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">co_present</mat-icon>
                      </span>
                      <span>
                        <span class="block text-sm font-bold text-[var(--color-brand-green-900)]">Formatrice</span>
                        <span class="block text-xs text-[var(--color-brand-green-800)]/60">instructor&#64;lessentielle-sante.site</span>
                      </span>
                    </span>
                    <mat-icon class="text-[var(--color-brand-gold-500)]">arrow_forward</mat-icon>
                  </button>

                  <button type="button" (click)="fillDemo('student')" class="flex items-center justify-between rounded-2xl border border-[var(--color-brand-gold-300)]/20 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-brand-gold-300)]/45 hover:shadow-[0_16px_28px_rgba(17,28,22,0.06)]">
                    <span class="flex items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-cream)] text-[var(--color-brand-green-900)]">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">school</mat-icon>
                      </span>
                      <span>
                        <span class="block text-sm font-bold text-[var(--color-brand-green-900)]">Etudiante</span>
                        <span class="block text-xs text-[var(--color-brand-green-800)]/60">student&#64;lessentielle-sante.site</span>
                      </span>
                    </span>
                    <mat-icon class="text-[var(--color-brand-gold-500)]">arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <aside class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#183126_0%,#101b16_100%)] p-6 text-white shadow-[0_28px_60px_rgba(15,23,19,0.28)] sm:p-7">
              <div class="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-gold-300)]">
                <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">event_available</mat-icon>
                Reservation
              </div>

              <h2 class="mt-5 font-serif text-3xl leading-tight">Reserver votre place en formation</h2>
              <p class="mt-4 text-sm leading-7 text-white/74">
                Accedez rapidement a la reservation de votre prochaine formation et suivez la validation de votre inscription depuis la plateforme.
              </p>

              <div class="mt-6 space-y-3">
                <div class="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <div class="flex items-center gap-3 text-sm font-semibold">
                    <mat-icon class="text-[var(--color-brand-gold-300)]">mail</mat-icon>
                    Confirmation par e-mail
                  </div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <div class="flex items-center gap-3 text-sm font-semibold">
                    <mat-icon class="text-[var(--color-brand-gold-300)]">workspace_premium</mat-icon>
                    Validation admin rapide
                  </div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <div class="flex items-center gap-3 text-sm font-semibold">
                    <mat-icon class="text-[var(--color-brand-gold-300)]">auto_stories</mat-icon>
                    Acces direct a vos contenus
                  </div>
                </div>
              </div>

              <a routerLink="/formations/2/inscription" class="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-brand-gold-500)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#d4b57c]">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">calendar_month</mat-icon>
                Reserver maintenant
              </a>

              <a routerLink="/register" [queryParams]="registerQueryParams()" class="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/18 bg-white/6 px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">person_add_alt_1</mat-icon>
                Creer mon compte
              </a>

              <div class="mt-8 rounded-[26px] border border-white/10 bg-white/6 p-5">
                <div class="flex items-start gap-3">
                  <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">gavel</mat-icon>
                  </span>
                  <p class="text-sm leading-7 text-white/74">
                    Tous les contenus, supports, videos et documents de Essenti' Elle Formation et Bien Être restent reserves et proteges.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  registerQueryParams(): { redirectTo?: string } {
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
    return redirectTo ? { redirectTo } : {};
  }

  fillDemo(role: 'admin' | 'instructor' | 'student') {
    this.loginForm.patchValue({
      email: role + '@lessentielle-sante.site',
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
          const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
          if (res.user.role === 'student' && redirectTo?.startsWith('/')) {
            void this.router.navigateByUrl(redirectTo);
            return;
          }
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
