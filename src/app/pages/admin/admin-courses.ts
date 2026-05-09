import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SlicePipe } from '@angular/common';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

type CourseModuleItem = NonNullable<ManagedCourse['moduleItems']>[number];

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, MatIconModule, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Catalogue Formations" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[1.08fr_1.2fr]">
        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">{{ editingId() ? 'Modifier la formation' : 'Ajouter une formation' }}</h2>
              <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/68">Admin: Créer, modifier et gérer les formations du catalogue.</p>
            </div>
            <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
              <mat-icon>school</mat-icon>
            </span>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="mt-6 space-y-5">
            @if (feedback(); as note) {
              <div class="rounded-2xl px-4 py-3 text-sm font-medium"
                [class.bg-emerald-100]="note.type === 'success'"
                [class.text-emerald-800]="note.type === 'success'"
                [class.bg-rose-100]="note.type === 'error'"
                [class.text-rose-800]="note.type === 'error'">
                {{ note.text }}
              </div>
            }
            <div class="grid gap-4 md:grid-cols-2">
              <input formControlName="title" placeholder="Titre de la formation" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
              <input formControlName="category" placeholder="Catégorie" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            </div>

            <textarea formControlName="description" rows="5" placeholder="Description complète" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Image de formation</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">Depuis l'appareil</div>
                </div>
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-sm font-semibold text-white">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">upload</mat-icon>
                  Téléverser image
                  <input type="file" accept="image/*" class="hidden" (change)="onThumbnailSelected($event)" />
                </label>
              </div>
              @if (form.value.thumbnail) {
                <img [src]="form.value.thumbnail!" alt="Aperçu formation" class="mt-4 h-40 w-full rounded-2xl object-cover" />
              }
            </div>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Modules PDF</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">{{ moduleItems.length }} module(s) - {{ (moduleItems.controls | slice:0).filter(m => m.value.pdfDataUrl).length }} avec PDF</div>
                </div>
                <button type="button" (click)="addModule()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">add</mat-icon>
                  Ajouter module
                </button>
              </div>

              <div formArrayName="moduleItems" class="mt-4 space-y-4">
                @for (module of moduleItems.controls; track $index) {
                  <div [formGroupName]="$index" class="rounded-[22px] p-4" [class.bg-emerald-50]="module.value.pdfDataUrl" [class.bg-rose-50]="module.value.title.trim() && !module.value.pdfDataUrl" [class.bg-[var(--color-brand-cream)]/75]="!module.value.title.trim() || !module.value.pdfDataUrl">
                    <div class="grid gap-4 md:grid-cols-[1fr_auto]">
                      <div>
                        <input formControlName="title" placeholder="Titre du module" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                        @if (module.value.title.trim() && !module.value.pdfDataUrl) {
                          <div class="mt-2 text-xs text-red-700 flex items-center gap-1">
                            <mat-icon class="!h-[16px] !w-[16px] !text-[16px]">warning</mat-icon>
                            PDF manquant pour ce module
                          </div>
                        }
                      </div>
                      <button type="button" (click)="removeModule($index)" class="rounded-full bg-[#f8e7e7] px-4 py-3 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                    </div>
                    <div class="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div class="text-sm" [class.text-emerald-700]="module.value.pdfDataUrl" [class.text-red-700]="module.value.title.trim() && !module.value.pdfDataUrl" [class.text-[var(--color-brand-green-800)]/70]="!module.value.pdfDataUrl">
                        @if (module.value.pdfDataUrl) {
                          <div class="flex items-center gap-2">
                            <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">check_circle</mat-icon>
                            {{ module.value.pdfName || 'PDF attaché' }}
                          </div>
                        } @else {
                          {{ module.value.pdfName || 'Aucun PDF sélectionné' }}
                        }
                      </div>
                      <label class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">picture_as_pdf</mat-icon>
                        Upload PDF
                        <input type="file" accept="application/pdf" class="hidden" (change)="onModulePdfSelected($event, $index)" />
                      </label>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <select formControlName="access" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                <option value="free">Gratuit</option>
                <option value="paid">Payant</option>
              </select>
              <select formControlName="pricingCurrency" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                <option value="EUR">Euros</option>
                <option value="TND">TND</option>
                <option value="USD">Dollars</option>
              </select>
              <select formControlName="status" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
              </select>
            </div>

            @if (form.value.access === 'paid') {
              <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
                <div class="grid gap-4 md:grid-cols-3">
                  <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Prix Euros</label>
                    <input formControlName="priceEur" type="number" placeholder="Prix EUR" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Prix TND</label>
                    <input formControlName="priceTnd" type="number" placeholder="Prix TND" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Prix Dollars</label>
                    <input formControlName="priceUsd" type="number" placeholder="Prix USD" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  </div>
                </div>

                <label class="mt-4 flex items-center gap-3 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  <input type="checkbox" formControlName="promoEnabled" class="h-4 w-4" />
                  Activer une promo
                </label>

                @if (form.value.promoEnabled) {
                  <div class="mt-4 grid gap-4 md:grid-cols-3">
                    <div class="space-y-2">
                      <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Promo Euros</label>
                      <input formControlName="promoPriceEur" type="number" placeholder="Promo EUR" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Promo TND</label>
                      <input formControlName="promoPriceTnd" type="number" placeholder="Promo TND" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/55">Promo Dollars</label>
                      <input formControlName="promoPriceUsd" type="number" placeholder="Promo USD" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                    </div>
                  </div>
                }
              </div>
            }

            <div class="flex flex-wrap gap-3">
              <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">
                {{ editingId() ? 'Enregistrer' : (form.value.status === 'published' ? 'Créer et publier' : 'Créer la formation') }}
              </button>
              @if (editingId()) {
                <button type="button" (click)="resetForm()" class="rounded-full bg-[var(--color-brand-cream)] px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)]">Annuler</button>
              }
            </div>
          </form>
        </section>

        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Catalogue global</h2>
            <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ courses().length }} formations</div>
          </div>
          <div class="space-y-4">
            @for (course of courses(); track course.id) {
              <article class="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="flex gap-4">
                    <img [src]="course.thumbnail" [alt]="course.title" class="h-20 w-20 rounded-2xl object-cover" referrerpolicy="no-referrer" />
                    <div>
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ course.category }}</span>
                        <span class="rounded-full bg-[var(--color-brand-green-900)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                          {{ course.access === 'free' ? 'Gratuit' : displayPrice(course) }}
                        </span>
                        @if (course.promoEnabled) {
                          <span class="rounded-full bg-[#f8e7e7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b2c2c]">Promo</span>
                        }
                        <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]" [class.bg-emerald-200]="course.status === 'published'" [class.text-emerald-800]="course.status === 'published'" [class.bg-amber-200]="course.status === 'draft'" [class.text-amber-800]="course.status === 'draft'">
                          {{ course.status === 'published' ? 'Publié' : 'Brouillon' }}
                        </span>
                      </div>
                      <h3 class="mt-3 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ course.title }}</h3>
                      <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/70">{{ course.description }}</p>
                      <p class="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/48">{{ course.moduleItems?.length || course.modules }} modules</p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="edit(course)" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">Modifier</button>
                    <button (click)="remove(course.id)" class="rounded-full bg-[#f8e7e7] px-4 py-2 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `
})
export class AdminCoursesComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...ADMIN_MENU_ITEMS];
  courses = signal<ManagedCourse[]>([]);
  editingId = signal<string | null>(null);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    thumbnail: ['module-nutrition-pathologie.svg'],
    category: ['Formation'],
    access: this.fb.nonNullable.control<'free' | 'paid'>('free'),
    pricingCurrency: this.fb.nonNullable.control<'EUR' | 'TND' | 'USD'>('EUR'),
    priceEur: [0],
    priceTnd: [0],
    priceUsd: [0],
    promoEnabled: [false],
    promoPriceEur: [0],
    promoPriceTnd: [0],
    promoPriceUsd: [0],
    status: this.fb.nonNullable.control<'published' | 'draft'>('published'),
    moduleItems: this.fb.array([]),
  });

  get moduleItems(): FormArray {
    return this.form.get('moduleItems') as FormArray;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.staff.getAdminCourses().subscribe((data) => this.courses.set(data));
  }

  private createModuleGroup(module?: CourseModuleItem) {
    return this.fb.nonNullable.group({
      id: [module?.id ?? `module-${Date.now()}-${this.moduleItems.length}`],
      title: [module?.title ?? ''],
      pdfName: [module?.pdfName ?? ''],
      pdfDataUrl: [module?.pdfDataUrl ?? ''],
    });
  }

  addModule(): void {
    this.moduleItems.push(this.createModuleGroup());
  }

  removeModule(index: number): void {
    this.moduleItems.removeAt(index);
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.form.patchValue({ thumbnail: String(reader.result ?? '') });
    reader.readAsDataURL(file);
  }

  onModulePdfSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const group = this.moduleItems.at(index);
      group.patchValue({
        pdfName: file.name,
        pdfDataUrl: String(reader.result ?? ''),
      });
    };
    reader.readAsDataURL(file);
  }

  edit(course: ManagedCourse): void {
    this.editingId.set(course.id);
    this.moduleItems.clear();
    (course.moduleItems ?? []).forEach((module: CourseModuleItem) => this.moduleItems.push(this.createModuleGroup(module)));
    this.form.patchValue({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      access: course.access,
      pricingCurrency: course.pricingCurrency ?? 'EUR',
      priceEur: course.priceEur,
      priceTnd: course.priceTnd ?? 0,
      priceUsd: course.priceUsd ?? 0,
      promoEnabled: course.promoEnabled ?? false,
      promoPriceEur: course.promoPriceEur ?? 0,
      promoPriceTnd: course.promoPriceTnd ?? 0,
      promoPriceUsd: course.promoPriceUsd ?? 0,
      status: course.status,
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.feedback.set(null);
    this.form.reset({
      title: '',
      description: '',
      thumbnail: 'module-nutrition-pathologie.svg',
      category: 'Formation',
      access: 'free',
      pricingCurrency: 'EUR',
      priceEur: 0,
      priceTnd: 0,
      priceUsd: 0,
      promoEnabled: false,
      promoPriceEur: 0,
      promoPriceTnd: 0,
      promoPriceUsd: 0,
      status: 'published',
    });
    this.moduleItems.clear();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set({ type: 'error', text: 'Le titre (min 3 caractères) et la description (min 10 caractères) sont obligatoires.' });
      return;
    }

    const raw = this.form.getRawValue();
    const validModules = (raw.moduleItems as CourseModuleItem[]).filter((item: CourseModuleItem) => item.title.trim() && item.pdfDataUrl);
    
    // Vérifier que les modules avec titre et PDF sont présents
    const allModules = (raw.moduleItems as CourseModuleItem[]);
    const incompleteModules = allModules.filter((item: CourseModuleItem) => item.title.trim() && !item.pdfDataUrl);
    
    if (incompleteModules.length > 0) {
      this.feedback.set({ 
        type: 'error', 
        text: `${incompleteModules.length} module(s) n'ont pas de PDF attaché. Veuillez ajouter les PDFs manquants.` 
      });
      return;
    }

    // Avertissement si aucun module n'est ajouté
    if (validModules.length === 0 && raw.status === 'published') {
      this.feedback.set({ 
        type: 'error', 
        text: 'Vous devez ajouter au moins un module PDF avant de publier la formation.' 
      });
      return;
    }

    const payload: Partial<ManagedCourse> = {
      ...raw,
      moduleItems: validModules,
      modules: validModules.length,
      priceEur: raw.access === 'paid' ? Number(raw.priceEur) : 0,
      priceTnd: raw.access === 'paid' ? Number(raw.priceTnd) : 0,
      priceUsd: raw.access === 'paid' ? Number(raw.priceUsd) : 0,
      promoPriceEur: raw.access === 'paid' && raw.promoEnabled ? Number(raw.promoPriceEur) : 0,
      promoPriceTnd: raw.access === 'paid' && raw.promoEnabled ? Number(raw.promoPriceTnd) : 0,
      promoPriceUsd: raw.access === 'paid' && raw.promoEnabled ? Number(raw.promoPriceUsd) : 0,
    };

    const request = this.editingId()
      ? this.staff.updateAdminCourse(this.editingId()!, payload)
      : this.staff.createAdminCourse(payload);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.load();
        this.feedback.set({
          type: 'success',
          text: payload.status === 'published'
            ? 'La formation a bien été créée et publiée.'
            : 'La formation a bien été enregistrée.'
        });
        setTimeout(() => this.feedback.set(null), 5000);
      },
      error: (err: any) => {
        console.error('Erreur lors de la création:', err);
        const errorMsg = err?.error?.error || err?.error?.message || err?.message || 'La création a échoué. Réessayez.';
        this.feedback.set({ type: 'error', text: errorMsg });
      }
    });
  }

  remove(courseId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;
    this.staff.deleteAdminCourse(courseId).subscribe({
      next: () => {
        this.load();
        this.feedback.set({ type: 'success', text: 'La formation a bien été supprimée.' });
        setTimeout(() => this.feedback.set(null), 5000);
      },
      error: (err) => {
        console.error('Erreur lors de la suppression:', err);
        this.feedback.set({ type: 'error', text: 'La suppression a échoué. Réessayez.' });
      }
    });
  }

  displayPrice(course: ManagedCourse): string {
    const currency = course.pricingCurrency ?? 'EUR';
    if (currency === 'TND') return `${course.priceTnd ?? 0} TND`;
    if (currency === 'USD') return `${course.priceUsd ?? 0} $`;
    return `${course.priceEur} €`;
  }
}
