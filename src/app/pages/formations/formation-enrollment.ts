import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PublicCatalogCourse, PublicCatalogFormula, PublicCatalogService } from '../../services/public-catalog.service';

@Component({
  selector: 'app-formation-enrollment',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,169,106,0.18),transparent_25%),linear-gradient(180deg,#fffdf9_0%,#f6efdf_48%,#efe5d0_100%)] px-4 py-10">
      <div class="mx-auto max-w-6xl">
        <a routerLink="/formations" class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)] shadow-[0_12px_26px_rgba(18,53,36,0.08)]">
          <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">arrow_back</mat-icon>
          Retour aux formations
        </a>

        @if (course(); as selectedCourse) {
          <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
            <section class="overflow-hidden rounded-[32px] border border-[var(--color-brand-gold-300)]/26 bg-white shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <img [src]="selectedCourse.thumbnail" [alt]="selectedCourse.title" class="h-64 w-full object-cover" referrerpolicy="no-referrer" />
              <div class="space-y-5 p-6">
                <div class="flex flex-wrap gap-3">
                  <span class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ selectedCourse.category }}</span>
                  <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]" [class.bg-emerald-100]="selectedCourse.access === 'free'" [class.text-emerald-800]="selectedCourse.access === 'free'" [class.bg-rose-100]="selectedCourse.access === 'paid'" [class.text-rose-800]="selectedCourse.access === 'paid'">
                    <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">{{ selectedCourse.access === 'free' ? 'lock_open' : 'lock' }}</mat-icon>
                    {{ selectedCourse.access === 'free' ? 'Inscription ouverte' : 'Inscription avec formule' }}
                  </span>
                </div>

                <div>
                  <h1 class="font-serif text-4xl text-[var(--color-brand-green-900)]">{{ selectedCourse.title }}</h1>
                  <p class="mt-4 text-sm leading-7 text-[var(--color-brand-green-800)]/75">{{ selectedCourse.description }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 rounded-[24px] bg-[var(--color-brand-cream)] p-4">
                  <div>
                    <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Modules</div>
                    <div class="mt-2 text-lg font-bold text-[var(--color-brand-green-900)]">{{ selectedCourse.modules }}</div>
                  </div>
                  <div>
                    <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Accès</div>
                    <div class="mt-2 text-lg font-bold text-[var(--color-brand-green-900)]">{{ selectedCourse.access === 'free' ? 'Gratuit' : 'Payant' }}</div>
                  </div>
                </div>

                @if (selectedCourse.access === 'paid') {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[#fffaf2] p-5">
                    <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Formules disponibles</h2>
                    <div class="mt-4 space-y-3">
                      @for (formula of formulas(); track formula.id) {
                        <div class="rounded-2xl bg-white p-4 shadow-[0_10px_22px_rgba(18,53,36,0.04)]">
                          <div class="flex items-start justify-between gap-4">
                            <div>
                              <div class="font-bold text-[var(--color-brand-green-900)]">{{ formula.title }}</div>
                              <div class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ formula.description }}</div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="rounded-[32px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-gold-300)]/35 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">assignment_ind</mat-icon>
                    Demande d'inscription
                  </div>
                  <h2 class="mt-4 font-serif text-3xl text-[var(--color-brand-green-900)]">Réserver votre place</h2>
                  <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/68">
                    Complétez ce formulaire pour la formation <strong>{{ selectedCourse.title }}</strong>.
                  </p>
                </div>
              </div>

              @if (successMsg()) {
                <div class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{{ successMsg() }}</div>
              }

              @if (errorMsg()) {
                <div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{{ errorMsg() }}</div>
              }

              <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-4">
                <input formControlName="name" placeholder="Nom complet" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                <div class="grid gap-4 md:grid-cols-2">
                  <input formControlName="email" placeholder="Email" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  <input formControlName="phone" placeholder="Téléphone" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                  <input formControlName="city" placeholder="Ville" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  <input formControlName="country" placeholder="Pays" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                </div>

                @if (selectedCourse.access === 'paid') {
                  <select formControlName="formulaId" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none">
                    <option value="">Choisir une formule</option>
                    @for (formula of formulas(); track formula.id) {
                      <option [value]="formula.id">{{ formula.title }}</option>
                    }
                  </select>
                }

                <textarea formControlName="message" rows="5" placeholder="Message ou précision sur votre demande" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none"></textarea>

                <button type="submit" [disabled]="loading()" class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--color-brand-gold-500)] disabled:opacity-60">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">{{ selectedCourse.access === 'free' ? 'how_to_reg' : 'payments' }}</mat-icon>
                  {{ loading() ? 'Envoi en cours...' : (selectedCourse.access === 'free' ? 'Envoyer mon inscription' : 'Envoyer ma demande') }}
                </button>
              </form>
            </section>
          </div>
        } @else {
          <div class="mt-8 rounded-[28px] bg-white p-8 text-center shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Formation introuvable</h2>
            <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/70">Cette formation n'est pas disponible ou n'est plus publiée.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class FormationEnrollmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private catalog = inject(PublicCatalogService);

  course = signal<PublicCatalogCourse | null>(null);
  formulas = signal<PublicCatalogFormula[]>([]);
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    city: [''],
    country: [''],
    formulaId: [''],
    message: [''],
  });

  readonly selectedFormula = computed(() => this.formulas().find((item) => item.id === this.form.controls.formulaId.value) ?? null);

  ngOnInit(): void {
    this.catalog.getCatalog().subscribe((data) => {
      const id = this.route.snapshot.paramMap.get('id');
      this.course.set(data.courses.find((course) => course.id === id) ?? null);
      this.formulas.set(data.formulas);
    });
  }

  submit(): void {
    const selectedCourse = this.course();
    if (!selectedCourse) {
      this.errorMsg.set('Formation introuvable.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Veuillez remplir correctement les champs obligatoires.');
      return;
    }

    if (selectedCourse.access === 'paid' && !this.form.controls.formulaId.value) {
      this.errorMsg.set('Veuillez choisir une formule pour cette formation payante.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const raw = this.form.getRawValue();
    this.catalog.createEnrollmentRequest({
      courseId: selectedCourse.id,
      formulaId: raw.formulaId || undefined,
      name: raw.name.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      city: raw.city.trim(),
      country: raw.country.trim(),
      message: raw.message.trim(),
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMsg.set(response.message);
        this.form.patchValue({ message: '' });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error || 'Impossible d’envoyer votre demande pour le moment.');
      },
    });
  }
}
