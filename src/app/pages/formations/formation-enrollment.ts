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
                    {{ selectedCourse.access === 'free' ? 'Inscription ouverte' : 'Inscription payante' }}
                  </span>
                </div>

                <div>
                  <h1 class="font-serif text-4xl text-[var(--color-brand-green-900)]">{{ selectedCourse.title }}</h1>
                  <p class="mt-4 text-sm leading-7 text-[var(--color-brand-green-800)]/75">{{ selectedCourse.presentation || selectedCourse.description }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 rounded-[24px] bg-[var(--color-brand-cream)] p-4">
                  <div>
                    <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Modules</div>
                    <div class="mt-2 text-lg font-bold text-[var(--color-brand-green-900)]">{{ selectedCourse.modules }}</div>
                  </div>
                  <div>
                    <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Prix</div>
                    <div class="mt-2 text-lg font-bold text-[var(--color-brand-green-900)]">{{ priceLabel(selectedCourse) }}</div>
                  </div>
                </div>

                @if (selectedCourse.access === 'free' && galleryImages().length) {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/22 bg-white p-5">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Galerie de la formation</h2>
                        <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/70">Les 8 visuels ajoutes pour presenter la formation Detox complete.</p>
                      </div>
                    </div>

                    <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      @for (image of galleryImages(); track image) {
                        <a [href]="image" target="_blank" rel="noopener" class="group overflow-hidden rounded-[20px] border border-[var(--color-brand-gold-300)]/20 bg-[var(--color-brand-cream)]">
                          <img [src]="image" alt="Visuel de la formation Detox" class="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105" referrerpolicy="no-referrer" />
                        </a>
                      }
                    </div>
                  </div>
                }

                @if (selectedCourse.access === 'free' && moduleItems().length) {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/22 bg-[var(--color-brand-cream)]/55 p-5">
                    <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Support PDF</h2>
                    <div class="mt-4 space-y-3">
                      @for (module of moduleItems(); track module.id) {
                        <a [href]="module.pdfDataUrl" target="_blank" rel="noopener" class="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-[0_10px_22px_rgba(18,53,36,0.04)] transition hover:-translate-y-0.5">
                          <div class="flex items-center gap-3">
                            <mat-icon class="!h-[22px] !w-[22px] !text-[22px] text-[#c62828]">picture_as_pdf</mat-icon>
                            <div>
                              <div class="font-bold text-[var(--color-brand-green-900)]">{{ module.title }}</div>
                              <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/70">{{ module.pdfName }}</div>
                            </div>
                          </div>
                          <span class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
                            Ouvrir
                            <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">open_in_new</mat-icon>
                          </span>
                        </a>
                      }
                    </div>
                  </div>
                }

                @if (selectedCourse.access === 'paid') {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[#fffaf2] p-5">
                    <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Contenu complet apres validation</h2>
                    <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/72">
                      Le support PDF integral, les images detaillees, les modules et tous les chapitres deviennent accessibles dans l'espace etudiante apres acceptation de la demande par l'administration.
                    </p>
                  </div>
                }

                @if (selectedCourse.objectives?.length) {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/22 bg-[var(--color-brand-cream)]/55 p-5">
                    <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Objectifs de la formation</h2>
                    <ul class="mt-4 space-y-3 text-sm text-[var(--color-brand-green-800)]/78">
                      @for (objective of selectedCourse.objectives; track objective) {
                        <li class="flex items-start gap-3">
                          <mat-icon class="!h-[18px] !w-[18px] !text-[18px] text-[var(--color-brand-gold-500)]">check_circle</mat-icon>
                          <span>{{ objective }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }

                @if (selectedCourse.certificateOptions?.length) {
                  <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-[#fffaf2] p-5">
                    <h2 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Option 1 a 3 certificats</h2>
                    <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/72">
                      Le prix final depend du nombre de certificats choisis. Selectionnez 1, 2 ou 3 certificats dans votre demande.
                    </p>

                    @if (selectedCourse.chapters?.length) {
                      <div class="mt-4 grid gap-3 sm:grid-cols-2">
                        @for (chapter of selectedCourse.chapters; track chapter.id) {
                          <div class="rounded-2xl bg-white p-4 shadow-[0_10px_22px_rgba(18,53,36,0.04)]">
                            <div class="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Certification</div>
                            <div class="mt-2 font-bold text-[var(--color-brand-green-900)]">{{ chapter.title.replace('Certification ', '') }}</div>
                            <div class="mt-1 text-sm text-[var(--color-brand-green-800)]/70">{{ chapter.content }}</div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                @if (selectedCourse.access === 'paid' && !selectedCourse.certificateOptions?.length) {
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
                  <h2 class="mt-4 font-serif text-3xl text-[var(--color-brand-green-900)]">Reserver votre place</h2>
                  <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/68">
                    Completez ce formulaire pour la formation <strong>{{ selectedCourse.title }}</strong>.
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
                  <input formControlName="phone" placeholder="Telephone" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                  <input formControlName="city" placeholder="Ville" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                  <input formControlName="country" placeholder="Pays" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                </div>

                @if (selectedCourse.access === 'paid' && !selectedCourse.certificateOptions?.length) {
                  <select formControlName="formulaId" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none">
                    <option value="">Choisir une formule</option>
                    @for (formula of formulas(); track formula.id) {
                      <option [value]="formula.id">{{ formula.title }}</option>
                    }
                  </select>
                }

                @if (selectedCourse.certificateOptions?.length) {
                  <select formControlName="certificateCount" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none">
                    <option value="">Choisir le nombre de certificats</option>
                    @for (count of selectedCourse.certificateOptions; track count) {
                      <option [value]="count">{{ count }} certificat{{ count > 1 ? 's' : '' }}</option>
                    }
                  </select>
                }

                <textarea formControlName="message" rows="5" placeholder="Message ou precision sur votre demande" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none"></textarea>

                <button type="submit" [disabled]="loading()" class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--color-brand-gold-500)] disabled:opacity-60">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">{{ selectedCourse.access === 'free' ? 'how_to_reg' : 'payments' }}</mat-icon>
                  {{ loading() ? 'Envoi en cours...' : (selectedCourse.access === 'free' ? 'Envoyer mon inscription' : 'Envoyer ma demande') }}
                </button>
              </form>
            </section>
          </div>

          @if (selectedCourse.access === 'free' && programModules().length) {
            <section class="mt-6 rounded-[32px] border border-[var(--color-brand-gold-300)]/26 bg-white p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)] sm:p-8">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-gold-300)]/35 bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-900)]">
                    <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">library_books</mat-icon>
                    Programme detaille
                  </div>
                  <h2 class="mt-4 font-serif text-3xl text-[var(--color-brand-green-900)]">10 modules - 5 chapitres par module</h2>
                  <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/68">
                    Le contenu de la formation est deja structure ici. Vous pourrez ajouter les PDF ensuite, module par module.
                  </p>
                </div>
              </div>

              <div class="mt-8 grid gap-4 lg:grid-cols-2">
                @for (module of programModules(); track module.id) {
                  <details class="group rounded-[24px] border border-[var(--color-brand-gold-300)]/20 bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1e5_100%)] p-5" [open]="$first">
                    <summary class="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ module.title }}</h3>
                        <p class="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-gold-700)]">{{ module.chapters.length }} chapitres</p>
                      </div>
                      <mat-icon class="!h-[22px] !w-[22px] !text-[22px] text-[var(--color-brand-green-900)] transition-transform group-open:rotate-180">expand_more</mat-icon>
                    </summary>

                    <ul class="mt-5 space-y-3 border-t border-[var(--color-brand-gold-300)]/18 pt-5">
                      @for (chapter of module.chapters; track chapter) {
                        <li class="flex items-start gap-3 text-sm leading-6 text-[var(--color-brand-green-800)]/78">
                          <span class="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-green-900)] text-[11px] font-bold text-white">{{ $index + 1 }}</span>
                          <span>{{ chapter }}</span>
                        </li>
                      }
                    </ul>
                  </details>
                }
              </div>
            </section>
          }
        } @else {
          <div class="mt-8 rounded-[28px] bg-white p-8 text-center shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Formation introuvable</h2>
            <p class="mt-3 text-sm text-[var(--color-brand-green-800)]/70">Cette formation n'est pas disponible ou n'est plus publiee.</p>
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
    certificateCount: [''],
    message: [''],
  });

  readonly selectedFormula = computed(() => this.formulas().find((item) => item.id === this.form.controls.formulaId.value) ?? null);
  readonly programModules = computed(() => this.course()?.programModules ?? []);
  readonly galleryImages = computed(() => this.course()?.galleryImages ?? []);
  readonly moduleItems = computed(() => this.course()?.moduleItems ?? []);

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

    if (selectedCourse.certificateOptions?.length && !this.form.controls.certificateCount.value) {
      this.errorMsg.set('Veuillez choisir le nombre de certificats souhaite.');
      return;
    }

    if (selectedCourse.access === 'paid' && !selectedCourse.certificateOptions?.length && !this.form.controls.formulaId.value) {
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
      certificateCount: raw.certificateCount ? Number(raw.certificateCount) : undefined,
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
        this.errorMsg.set(err?.error?.error || 'Impossible d envoyer votre demande pour le moment.');
      },
    });
  }

  priceLabel(course: PublicCatalogCourse): string {
    if (course.priceMinEur && course.priceMaxEur && course.priceMaxEur > course.priceMinEur) {
      return `${course.priceMinEur} EUR - ${course.priceMaxEur} EUR`;
    }

    return `${course.priceEur} EUR`;
  }
}
