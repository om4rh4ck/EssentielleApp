import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, MatIconModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8f4ec_0%,#fffdf9_36%,#f0e4c9_100%)] px-2 py-4 font-sans sm:px-3 sm:py-5 lg:px-4 lg:py-6">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute right-[-6%] top-[8%] h-72 w-72 rounded-full bg-[var(--color-brand-gold-300)]/28 blur-3xl"></div>
        <div class="absolute bottom-[-8%] left-[-5%] h-80 w-80 rounded-full bg-[var(--color-brand-green-800)]/10 blur-3xl"></div>
      </div>

      <div class="relative z-10 mx-auto min-h-[calc(100vh-1.5rem)] w-full">
        <section class="w-full rounded-[34px] border border-white/70 bg-white/92 p-6 shadow-[0_30px_80px_rgba(17,28,22,0.10)] backdrop-blur sm:p-8 lg:p-10 xl:p-12 2xl:px-14">
          <div class="mb-8 flex flex-col gap-6 border-b border-[var(--color-brand-gold-300)]/25 pb-8 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <div class="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-gold-300)]/40 bg-[var(--color-brand-cream)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--color-brand-gold-500)]">
                <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">person_add_alt_1</mat-icon>
                Creation de compte
              </div>
              <h1 class="mt-5 font-serif text-4xl leading-tight text-[var(--color-brand-green-900)] sm:text-5xl">Rejoindre votre espace SaaS Essenti'Elle</h1>
              <p class="mt-4 max-w-xl text-sm leading-7 text-[var(--color-brand-green-800)]/72 sm:text-base">
                Creez votre compte avec votre adresse e-mail pour suivre vos formations, vos demandes et vos reservations en toute simplicite.
              </p>
              <p class="mt-3 max-w-xl text-sm leading-7 text-[var(--color-brand-green-800)]/60">
                Apres inscription, vous pourrez vous connecter soit avec votre e-mail complet, soit avec votre identifiant correspondant a la partie avant le symbole @.
              </p>
            </div>

            <a routerLink="/login" [queryParams]="loginQueryParams()" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-brand-gold-300)]/45 bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(15,23,19,0.16)] transition hover:-translate-y-0.5 hover:bg-[var(--color-brand-green-800)]">
              <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">login</mat-icon>
              Se connecter
            </a>
          </div>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ef_100%)] p-6 shadow-[0_18px_40px_rgba(17,28,22,0.05)] sm:p-7 xl:p-9">
              <div class="mb-6 flex items-center gap-3">
                <a routerLink="/" class="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-brand-gold-300)]/35 bg-white p-2 shadow-lg shadow-[var(--color-brand-gold-300)]/20">
                  <img src="lo2 originale.png" alt="Essenti'Elle Sante" class="h-full w-full rounded-xl object-contain" />
                </a>
                <div>
                  <div class="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-brand-gold-500)]">Inscription</div>
                  <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/70">Ouverture de votre compte etudiante</div>
                </div>
              </div>

              @if (errorMsg()) {
                <div class="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">error_outline</mat-icon>
                  {{ errorMsg() }}
                </div>
              }

              @if (successMsg()) {
                <div class="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">check_circle</mat-icon>
                  {{ successMsg() }}
                </div>
              }

              <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
                <div class="rounded-2xl border border-[var(--color-brand-gold-300)]/24 bg-[var(--color-brand-cream)]/75 px-4 py-3">
                  <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">info</mat-icon>
                    Compte de plateforme
                  </div>
                  <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/68">Cette page sert a l'inscription des comptes etudiantes. Votre e-mail devient l'identifiant principal de connexion.</p>
                </div>

                <div class="grid gap-5 sm:grid-cols-2">
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)] sm:col-span-2">
                    <label for="reg-name" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">badge</mat-icon>
                      Nom complet
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">person</mat-icon>
                      </span>
                      <input type="text" id="reg-name" formControlName="name"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="Ex: Sophie Martin" />
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)] sm:col-span-2">
                    <label for="reg-email" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">alternate_email</mat-icon>
                      Email
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">mail</mat-icon>
                      </span>
                      <input type="email" id="reg-email" formControlName="email"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="votre@email.com" />
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)]">
                    <label for="reg-phone" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">call</mat-icon>
                      Telephone
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">call</mat-icon>
                      </span>
                      <input type="text" id="reg-phone" formControlName="phone"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="+216 ..." />
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)]">
                    <label for="reg-city" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">location_city</mat-icon>
                      Ville
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">apartment</mat-icon>
                      </span>
                      <input type="text" id="reg-city" formControlName="city"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="Djerba" />
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)] sm:col-span-2">
                    <label for="reg-country" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">public</mat-icon>
                      Pays
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">flag</mat-icon>
                      </span>
                      <input type="text" id="reg-country" formControlName="country"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="Tunisie" />
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)] sm:col-span-2">
                    <label for="reg-objective" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">track_changes</mat-icon>
                      Objectif
                    </label>
                    <div class="flex items-start gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">rocket_launch</mat-icon>
                      </span>
                      <textarea id="reg-objective" rows="3" formControlName="objective"
                        class="w-full resize-none border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="Votre projet dans le bien-etre feminin"></textarea>
                    </div>
                  </div>

                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/28 bg-white px-5 py-4 shadow-[0_12px_24px_rgba(17,28,22,0.04)] sm:col-span-2">
                    <label for="reg-pwd" class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-green-900)]">
                      <mat-icon class="!h-[16px] !w-[16px] !text-[16px] text-[var(--color-brand-gold-500)]">lock</mat-icon>
                      Mot de passe
                    </label>
                    <div class="flex items-center gap-3 rounded-2xl border border-[var(--color-brand-gold-300)]/18 bg-[var(--color-brand-cream)]/58 px-4 py-3">
                      <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-gold-500)] shadow-sm">
                        <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">password</mat-icon>
                      </span>
                      <input type="password" id="reg-pwd" formControlName="password"
                        class="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--color-brand-green-900)] outline-none placeholder:text-[var(--color-brand-green-800)]/38"
                        placeholder="********" />
                    </div>
                  </div>
                </div>

                <button type="submit" [disabled]="registerForm.invalid || loading()"
                  class="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-green-900)_0%,#24372c_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_24px_40px_rgba(15,23,19,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_46px_rgba(15,23,19,0.22)] disabled:cursor-not-allowed disabled:opacity-55">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">how_to_reg</mat-icon>
                  {{ loading() ? 'Creation en cours...' : "S'inscrire" }}
                </button>
              </form>
            </div>

            <aside class="rounded-[30px] border border-[var(--color-brand-gold-300)]/22 bg-[linear-gradient(180deg,#183126_0%,#101b16_100%)] p-6 text-white shadow-[0_28px_60px_rgba(15,23,19,0.28)] sm:p-7">
              <div class="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-gold-300)]">
                <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">event_available</mat-icon>
                Reservation
              </div>

              <h2 class="mt-5 font-serif text-3xl leading-tight">Reserver votre place en formation</h2>
              <p class="mt-4 text-sm leading-7 text-white/74">
                Creez votre compte puis passez directement a votre demande d'inscription pour accelerer la validation de votre acces.
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
                    Acces a votre espace etudiante
                  </div>
                </div>
              </div>

              <a routerLink="/formations/2/inscription" class="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-brand-gold-500)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#d4b57c]">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">calendar_month</mat-icon>
                Reserver maintenant
              </a>

              <a routerLink="/login" [queryParams]="loginQueryParams()" class="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/18 bg-white/6 px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">login</mat-icon>
                J'ai deja un compte
              </a>

              <div class="mt-8 rounded-[26px] border border-white/10 bg-white/6 p-5">
                <div class="flex items-start gap-3">
                  <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">gavel</mat-icon>
                  </span>
                  <p class="text-sm leading-7 text-white/74">
                    Tous les contenus, supports, videos et documents de Essenti'Elle Sante restent reserves et proteges.
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
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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

  loginQueryParams(): { redirectTo?: string } {
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
    return redirectTo ? { redirectTo } : {};
  }

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
        this.successMsg.set('Compte cree avec succes. Redirection vers votre espace...');
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
        const message = err?.error?.error ?? "Impossible de creer le compte pour le moment.";
        this.errorMsg.set(message);
      }
    });
  }
}
