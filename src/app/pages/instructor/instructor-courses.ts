import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

type CourseModuleItem = NonNullable<ManagedCourse['moduleItems']>[number];
type CourseContentItem = NonNullable<ManagedCourse['contentItems']>[number];
type CourseChapterItem = NonNullable<ManagedCourse['chapters']>[number];

@Component({
  selector: 'app-instructor-courses',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Mes Formations" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[1.08fr_1.2fr]">
        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/26 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">{{ editingId() ? 'Modifier la formation' : 'Ajouter une formation' }}</h2>
              <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/68">Titre, contenu, objectifs, programme, PDF, prix multi-devise et promo.</p>
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
              <input formControlName="category" placeholder="Categorie" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            </div>

            <textarea formControlName="description" rows="4" placeholder="Description courte" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <textarea formControlName="presentation" rows="4" placeholder="Presentation de la formation" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <textarea formControlName="warning" rows="3" placeholder="Avertissement ou remarque importante" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Objectifs</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">{{ objectives.length }} objectif(s)</div>
                </div>
                <button type="button" (click)="addObjective()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">add</mat-icon>
                  Ajouter objectif
                </button>
              </div>
              <div formArrayName="objectives" class="mt-4 space-y-3">
                @for (objective of objectives.controls; track $index) {
                  <div class="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input [formControlName]="$index" placeholder="Texte de l'objectif" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                    <button type="button" (click)="removeObjective($index)" class="rounded-full bg-[#f8e7e7] px-4 py-3 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Contenu de la formation</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">{{ contentItems.length }} element(s)</div>
                </div>
                <button type="button" (click)="addContentItem()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">add</mat-icon>
                  Ajouter contenu
                </button>
              </div>
              <div formArrayName="contentItems" class="mt-4 space-y-3">
                @for (item of contentItems.controls; track $index) {
                  <div [formGroupName]="$index" class="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input formControlName="text" placeholder="Ex: PDF, Video, Exam, QCM" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
                    <button type="button" (click)="removeContentItem($index)" class="rounded-full bg-[#f8e7e7] px-4 py-3 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Programme par chapitre</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">{{ chapters.length }} chapitre(s)</div>
                </div>
                <button type="button" (click)="addChapter()" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-green-900)]">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">add</mat-icon>
                  Ajouter chapitre
                </button>
              </div>
              <div formArrayName="chapters" class="mt-4 space-y-4">
                @for (chapter of chapters.controls; track $index) {
                  <div [formGroupName]="$index" class="rounded-[22px] bg-[var(--color-brand-cream)]/65 p-4">
                    <div class="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input formControlName="title" placeholder="Titre du chapitre" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
                      <button type="button" (click)="removeChapter($index)" class="rounded-full bg-[#f8e7e7] px-4 py-3 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                    </div>
                    <textarea formControlName="content" rows="4" placeholder="Texte du chapitre" class="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none"></textarea>
                  </div>
                }
              </div>
            </div>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Image de formation</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">Depuis l'appareil</div>
                </div>
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-4 py-2 text-sm font-semibold text-white">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">upload</mat-icon>
                  Televerser image
                  <input type="file" accept="image/*" class="hidden" (change)="onThumbnailSelected($event)" />
                </label>
              </div>
              @if (form.value.thumbnail) {
                <img [src]="form.value.thumbnail!" alt="Apercu formation" class="mt-4 h-40 w-full rounded-2xl object-cover" />
              }
            </div>

            <div class="rounded-[24px] border border-[var(--color-brand-gold-300)]/24 bg-white/75 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Modules PDF</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/48">{{ moduleItems.length }} module(s) - {{ modulePdfCount() }} avec PDF</div>
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
                      </div>
                      <button type="button" (click)="removeModule($index)" class="rounded-full bg-[#f8e7e7] px-4 py-3 text-sm font-semibold text-[#9b2c2c]">Supprimer</button>
                    </div>
                    <div class="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div class="text-sm text-[var(--color-brand-green-800)]/70">
                        {{ module.value.pdfName || 'Aucun PDF selectionne' }}
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
                <option value="published">Publie</option>
                <option value="draft">Brouillon</option>
              </select>
            </div>

            @if (form.value.access === 'paid') {
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
            }

            <div class="flex flex-wrap gap-3">
              <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">
                {{ editingId() ? 'Enregistrer' : 'Creer la formation' }}
              </button>
              @if (editingId()) {
                <button type="button" (click)="resetForm()" class="rounded-full bg-[var(--color-brand-cream)] px-5 py-3 text-sm font-bold text-[var(--color-brand-green-900)]">Annuler</button>
              }
            </div>
          </form>
        </section>

        <section class="rounded-[30px] border border-[var(--color-brand-gold-300)]/24 bg-[linear-gradient(180deg,#faf6ef_0%,#efe5d4_100%)] p-6 shadow-[0_24px_54px_rgba(18,53,36,0.08)]">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Catalogue formatrice</h2>
            <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ courses().length }} formations</div>
          </div>
          <div class="space-y-4">
            @for (course of courses(); track course.id) {
              <article class="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_12px_26px_rgba(18,53,36,0.05)]">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="flex gap-4">
                    <img [src]="course.thumbnail" [alt]="course.title" class="h-20 w-20 rounded-2xl object-cover" />
                    <div>
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ course.category }}</span>
                        <span class="rounded-full bg-[var(--color-brand-green-900)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                          {{ course.access === 'free' ? 'Gratuit' : displayPrice(course) }}
                        </span>
                      </div>
                      <h3 class="mt-3 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ course.title }}</h3>
                      <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/70">{{ course.description }}</p>
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
export class InstructorCoursesComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  courses = signal<ManagedCourse[]>([]);
  editingId = signal<string | null>(null);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    presentation: [''],
    warning: [''],
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
    objectives: this.fb.array([]),
    contentItems: this.fb.array([]),
    chapters: this.fb.array([]),
    moduleItems: this.fb.array([]),
  });

  get moduleItems(): FormArray {
    return this.form.get('moduleItems') as FormArray;
  }

  get objectives(): FormArray {
    return this.form.get('objectives') as FormArray;
  }

  get contentItems(): FormArray {
    return this.form.get('contentItems') as FormArray;
  }

  get chapters(): FormArray {
    return this.form.get('chapters') as FormArray;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.staff.getInstructorCourses().subscribe((data) => this.courses.set(data));
  }

  private createModuleGroup(module?: CourseModuleItem) {
    return this.fb.nonNullable.group({
      id: [module?.id ?? `module-${Date.now()}-${this.moduleItems.length}`],
      title: [module?.title ?? ''],
      pdfName: [module?.pdfName ?? ''],
      pdfDataUrl: [module?.pdfDataUrl ?? ''],
    });
  }

  private createContentItemGroup(item?: CourseContentItem) {
    return this.fb.nonNullable.group({
      id: [item?.id ?? `content-${Date.now()}-${this.contentItems.length}`],
      text: [item?.text ?? ''],
    });
  }

  private createChapterGroup(chapter?: CourseChapterItem) {
    return this.fb.nonNullable.group({
      id: [chapter?.id ?? `chapter-${Date.now()}-${this.chapters.length}`],
      title: [chapter?.title ?? ''],
      content: [chapter?.content ?? ''],
    });
  }

  addObjective(): void {
    this.objectives.push(this.fb.nonNullable.control(''));
  }

  removeObjective(index: number): void {
    this.objectives.removeAt(index);
  }

  addContentItem(): void {
    this.contentItems.push(this.createContentItemGroup());
  }

  removeContentItem(index: number): void {
    this.contentItems.removeAt(index);
  }

  addChapter(): void {
    this.chapters.push(this.createChapterGroup());
  }

  removeChapter(index: number): void {
    this.chapters.removeAt(index);
  }

  addModule(): void {
    this.moduleItems.push(this.createModuleGroup());
  }

  removeModule(index: number): void {
    this.moduleItems.removeAt(index);
  }

  modulePdfCount(): number {
    return this.moduleItems.controls.filter((module) => !!module.value?.pdfDataUrl).length;
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
    this.objectives.clear();
    this.contentItems.clear();
    this.chapters.clear();
    this.moduleItems.clear();

    (course.objectives ?? []).forEach((objective) => this.objectives.push(this.fb.nonNullable.control(objective)));
    (course.contentItems ?? []).forEach((item) => this.contentItems.push(this.createContentItemGroup(item)));
    (course.chapters ?? []).forEach((chapter) => this.chapters.push(this.createChapterGroup(chapter)));
    (course.moduleItems ?? []).forEach((module) => this.moduleItems.push(this.createModuleGroup(module)));

    this.form.patchValue({
      title: course.title,
      description: course.description,
      presentation: course.presentation ?? '',
      warning: course.warning ?? '',
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
      presentation: '',
      warning: '',
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
    this.objectives.clear();
    this.contentItems.clear();
    this.chapters.clear();
    this.moduleItems.clear();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set({ type: 'error', text: 'Le titre et la description sont obligatoires.' });
      return;
    }

    const raw = this.form.getRawValue();
    const validModules = (raw.moduleItems as CourseModuleItem[]).filter((item) => item.title.trim() && item.pdfDataUrl);
    const payload: Partial<ManagedCourse> = {
      ...raw,
      objectives: (raw.objectives as string[]).map((item) => item.trim()).filter(Boolean),
      contentItems: (raw.contentItems as CourseContentItem[]).filter((item) => item.text.trim()),
      chapters: (raw.chapters as CourseChapterItem[]).filter((item) => item.title.trim() || item.content.trim()),
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
      ? this.staff.updateInstructorCourse(this.editingId()!, payload)
      : this.staff.createInstructorCourse(payload);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.load();
        this.feedback.set({ type: 'success', text: 'La formation a bien ete enregistree.' });
        setTimeout(() => this.feedback.set(null), 5000);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.error || err?.error?.message || err?.message || 'La creation a echoue. Reessayez.';
        this.feedback.set({ type: 'error', text: errorMsg });
      }
    });
  }

  remove(courseId: string): void {
    this.staff.deleteInstructorCourse(courseId).subscribe(() => this.load());
  }

  displayPrice(course: ManagedCourse): string {
    const currency = course.pricingCurrency ?? 'EUR';
    if (currency === 'TND') return `${course.priceTnd ?? 0} TND`;
    if (currency === 'USD') return `${course.priceUsd ?? 0} $`;
    return `${course.priceEur} EUR`;
  }
}
