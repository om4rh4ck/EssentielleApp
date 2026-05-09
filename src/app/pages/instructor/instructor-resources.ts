import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ManagedCourse, ResourceItem, LiveSession, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-resources',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Sessions & Ressources" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-2">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Planifier une session live</h2>
          <form [formGroup]="sessionForm" (ngSubmit)="createSession()" class="mt-6 space-y-4">
            <input formControlName="title" placeholder="Titre de la session" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <select formControlName="courseId" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>
            <input formControlName="scheduledAt" type="datetime-local" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <input formControlName="meetLink" placeholder="Lien Google Meet" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <textarea formControlName="notes" rows="4" placeholder="Notes pour les étudiantes" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <button type="submit" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white">Envoyer le live aux étudiantes</button>
          </form>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Ajouter une ressource</h2>
          <form [formGroup]="resourceForm" (ngSubmit)="createResource()" class="mt-6 space-y-4">
            <input formControlName="title" placeholder="Titre" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <select formControlName="courseId" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>
            <select formControlName="type" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none">
              <option value="pdf">PDF</option>
              <option value="video">Vidéo</option>
              <option value="audio">Audio</option>
              <option value="link">Lien</option>
            </select>
            <input formControlName="url" placeholder="URL / fichier" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none" />
            <textarea formControlName="description" rows="4" placeholder="Description" class="w-full rounded-2xl bg-[var(--color-brand-cream)] px-4 py-3 text-sm outline-none"></textarea>
            <button type="submit" class="rounded-full bg-[var(--color-brand-gold-500)] px-5 py-3 text-sm font-bold text-white">Ajouter la ressource</button>
          </form>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Sessions programmées</h3>
          <div class="mt-6 space-y-4">
            @for (session of sessions(); track session.id) {
              <article class="rounded-[22px] bg-[var(--color-brand-cream)] p-4">
                <h4 class="font-bold text-[var(--color-brand-green-900)]">{{ session.title }}</h4>
                <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ session.courseTitle }} · {{ session.scheduledAt | date:'dd/MM/yyyy HH:mm' }}</p>
                <a [href]="session.meetLink" target="_blank" class="mt-3 inline-block text-sm font-semibold text-[var(--color-brand-gold-700)]">{{ session.meetLink }}</a>
              </article>
            }
          </div>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <h3 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Bibliothèque</h3>
          <div class="mt-6 space-y-4">
            @for (resource of resources(); track resource.id) {
              <article class="rounded-[22px] bg-[var(--color-brand-cream)] p-4">
                <h4 class="font-bold text-[var(--color-brand-green-900)]">{{ resource.title }}</h4>
                <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ resource.courseTitle }} · {{ resource.type.toUpperCase() }}</p>
                <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">{{ resource.description }}</p>
              </article>
            }
          </div>
        </section>
      </div>
    </app-dashboard-layout>
  `
})
export class InstructorResourcesComponent implements OnInit {
  private staff = inject(StaffPortalService);
  private fb = inject(FormBuilder);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  courses = signal<ManagedCourse[]>([]);
  sessions = signal<LiveSession[]>([]);
  resources = signal<ResourceItem[]>([]);

  sessionForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['1'],
    scheduledAt: [''],
    meetLink: ['', [Validators.required]],
    notes: [''],
  });

  resourceForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['1'],
    type: this.fb.nonNullable.control<'pdf' | 'video' | 'audio' | 'link'>('pdf'),
    url: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(5)]],
  });

  ngOnInit(): void {
    this.staff.getInstructorCourses().subscribe((data) => this.courses.set(data));
    this.load();
  }

  load(): void {
    this.staff.getInstructorResources().subscribe((data) => {
      this.sessions.set(data.sessions);
      this.resources.set(data.resources);
    });
  }

  createSession(): void {
    if (this.sessionForm.invalid) return;
    this.staff.createLiveSession(this.sessionForm.getRawValue()).subscribe(() => {
      this.sessionForm.patchValue({ title: '', scheduledAt: '', meetLink: '', notes: '' });
      this.load();
    });
  }

  createResource(): void {
    if (this.resourceForm.invalid) return;
    this.staff.createResource(this.resourceForm.getRawValue()).subscribe(() => {
      this.resourceForm.patchValue({ title: '', url: '', description: '' });
      this.load();
    });
  }
}
