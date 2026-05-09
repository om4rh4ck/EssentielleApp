import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedFormula, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-formulas',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Mes Formules" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">{{ editingId() ? 'Modifier la formule' : 'Ajouter une formule' }}</h2>
              <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/68">Titre, description, image et prix de la formule affichés sur la page formations.</p>
            </div>
            <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
              <mat-icon>sell</mat-icon>
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

            <input formControlName="title" placeholder="Titre de la formule" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <textarea formControlName="description" rows="5" placeholder="Description complète" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <textarea formControlName="highlightsText" rows="4" placeholder="Inclusions de la formule, une par ligne" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Image de formule</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">Depuis l'appareil</div>
                </div>
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-sm font-semibold text-white">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">upload</mat-icon>
                  Téléverser image
                  <input type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" />
                </label>
              </div>
              @if (form.value.image) {
                <img [src]="form.value.image!" alt="Aperçu formule" class="mt-4 h-40 w-full rounded-2xl object-cover" />
              }
            </div>

            <div class="grid gap-4 md:grid-cols-2">
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

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="grid gap-4 md:grid-cols-3">
                <input formControlName="priceEur" type="number" placeholder="Prix EUR" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                <input formControlName="priceTnd" type="number" placeholder="Prix TND" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                <input formControlName="priceUsd" type="number" placeholder="Prix USD" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
              </div>

              <label class="mt-4 flex items-center gap-3 text-sm font-semibold text-[var(--color-brand-green-900)]">
                <input type="checkbox" formControlName="promoEnabled" class="h-4 w-4" />
                Activer une promo
              </label>

              @if (form.value.promoEnabled) {
                <div class="mt-4 grid gap-4 md:grid-cols-3">
                  <input formControlName="promoPriceEur" type="number" placeholder="Promo EUR" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  <input formControlName="promoPriceTnd" type="number" placeholder="Promo TND" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                  <input formControlName="promoPriceUsd" type="number" placeholder="Promo USD" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                </div>
              }
            </div>

            <div class="flex flex-wrap gap-3">
              <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">
                {{ editingId() ? 'Enregistrer' : 'Créer la formule' }}
              </button>
              @if (editingId()) {
                <button type="button" (click)="resetForm()" class="rounded-full bg-[var(--color-brand-cream)] px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)]">Annuler</button>
              }
            </div>
          </form>
        </section>

        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Catalogue des formules</h2>
            <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ formulas().length }} formules</div>
          </div>

          <div class="space-y-4">
            @for (formula of formulas(); track formula.id) {
              <article class="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="flex gap-4">
                    <img [src]="formula.image" [alt]="formula.title" class="h-20 w-20 rounded-2xl object-cover" referrerpolicy="no-referrer" />
                    <div>
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full bg-[var(--color-brand-green-900)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">{{ displayPrice(formula) }}</span>
                        @if (formula.promoEnabled) {
                          <span class="rounded-full bg-[#f8e7e7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b2c2c]">Promo</span>
                        }
                        <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]" [class.bg-emerald-200]="formula.status === 'published'" [class.text-emerald-800]="formula.status === 'published'" [class.bg-amber-200]="formula.status === 'draft'" [class.text-amber-800]="formula.status === 'draft'">
                          {{ formula.status === 'published' ? 'Publié' : 'Brouillon' }}
                        </span>
                      </div>
                      <h3 class="mt-3 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ formula.title }}</h3>
                      <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/70">{{ formula.description }}</p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="edit(formula)" class="rounded-full bg-[var(--color-brand-cream)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">Modifier</button>
                    <button (click)="remove(formula.id)" class="rounded-full bg-[#f8e7e7] px-4 py-2 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class InstructorFormulasComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  formulas = signal<ManagedFormula[]>([]);
  editingId = signal<string | null>(null);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    highlightsText: [''],
    image: ['module-nutrition-pathologie.svg'],
    pricingCurrency: this.fb.nonNullable.control<'EUR' | 'TND' | 'USD'>('EUR'),
    priceEur: [0],
    priceTnd: [0],
    priceUsd: [0],
    promoEnabled: [false],
    promoPriceEur: [0],
    promoPriceTnd: [0],
    promoPriceUsd: [0],
    status: this.fb.nonNullable.control<'published' | 'draft'>('published'),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.staff.getInstructorFormulas().subscribe((data) => this.formulas.set(data));
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.form.patchValue({ image: String(reader.result ?? '') });
    reader.readAsDataURL(file);
  }

  edit(formula: ManagedFormula): void {
    this.editingId.set(formula.id);
    this.feedback.set(null);
    this.form.patchValue({
      title: formula.title,
      description: formula.description,
      highlightsText: (formula.highlights ?? []).join('\n'),
      image: formula.image,
      pricingCurrency: formula.pricingCurrency ?? 'EUR',
      priceEur: formula.priceEur ?? 0,
      priceTnd: formula.priceTnd ?? 0,
      priceUsd: formula.priceUsd ?? 0,
      promoEnabled: formula.promoEnabled ?? false,
      promoPriceEur: formula.promoPriceEur ?? 0,
      promoPriceTnd: formula.promoPriceTnd ?? 0,
      promoPriceUsd: formula.promoPriceUsd ?? 0,
      status: formula.status,
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.feedback.set(null);
    this.form.reset({
      title: '',
      description: '',
      highlightsText: '',
      image: 'module-nutrition-pathologie.svg',
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
  }

  save(): void {
    const raw = this.form.getRawValue();
    const title = raw.title.trim();
    const description = raw.description.trim();
    const highlights = String(raw.highlightsText ?? '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (title.length < 3) {
      this.feedback.set({ type: 'error', text: 'Le titre de la formule doit contenir au moins 3 caractères.' });
      return;
    }

    if (description.length < 5) {
      this.feedback.set({ type: 'error', text: 'La description de la formule doit contenir au moins 5 caractères.' });
      return;
    }

    if ([Number(raw.priceEur), Number(raw.priceTnd), Number(raw.priceUsd)].every((price) => price <= 0)) {
      this.feedback.set({ type: 'error', text: 'Ajoutez au moins un prix valide pour la formule.' });
      return;
    }

    const payload: Partial<ManagedFormula> = {
      ...raw,
      title,
      description,
      highlights,
      priceEur: Number(raw.priceEur),
      priceTnd: Number(raw.priceTnd),
      priceUsd: Number(raw.priceUsd),
      promoPriceEur: raw.promoEnabled ? Number(raw.promoPriceEur) : 0,
      promoPriceTnd: raw.promoEnabled ? Number(raw.promoPriceTnd) : 0,
      promoPriceUsd: raw.promoEnabled ? Number(raw.promoPriceUsd) : 0,
    };

    const request = this.editingId()
      ? this.staff.updateInstructorFormula(this.editingId()!, payload)
      : this.staff.createInstructorFormula(payload);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.load();
        this.feedback.set({ type: 'success', text: 'La formule a bien été enregistrée.' });
      },
      error: (err: any) => {
        const errorMsg = err?.error?.error || err?.error?.message || err?.message || 'La sauvegarde de la formule a échoué.';
        this.feedback.set({ type: 'error', text: errorMsg });
      },
    });
  }

  remove(formulaId: string): void {
    this.staff.deleteInstructorFormula(formulaId).subscribe({
      next: () => {
        this.load();
        this.feedback.set({ type: 'success', text: 'La formule a bien été supprimée.' });
      },
      error: () => this.feedback.set({ type: 'error', text: 'La suppression de la formule a échoué.' }),
    });
  }

  displayPrice(formula: ManagedFormula): string {
    const currency = formula.pricingCurrency ?? 'EUR';
    if (currency === 'TND') return `${formula.priceTnd ?? 0} TND`;
    if (currency === 'USD') return `${formula.priceUsd ?? 0} $`;
    return `${formula.priceEur} €`;
  }
}
