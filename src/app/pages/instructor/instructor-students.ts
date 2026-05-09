import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { InstructorStudent, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';

@Component({
  selector: 'app-instructor-students',
  standalone: true,
  imports: [DashboardLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Étudiantes" [menuItems]="menuItems">
      <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Suivi des étudiantes</h2>
          <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ students().length }} profils</div>
        </div>
        <div class="space-y-4">
          @for (student of students(); track student.id) {
            <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ student.name }}</h3>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ student.email }} · {{ student.phone || 'Téléphone non renseigné' }}</p>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ student.city }} · {{ student.country }}</p>
                  <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/70">Formations : {{ student.enrolledCourses.join(', ') || 'Aucune' }}</p>
                </div>
                <div class="rounded-2xl bg-white px-5 py-4 text-center">
                  <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/45">Moyenne</div>
                  <div class="mt-2 text-2xl font-bold text-[var(--color-brand-green-900)]">{{ student.averageScore }}/20</div>
                </div>
              </div>
            </article>
          }
        </div>
      </section>
    </app-dashboard-layout>
  `
})
export class InstructorStudentsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...INSTRUCTOR_MENU_ITEMS];
  students = signal<InstructorStudent[]>([]);

  ngOnInit(): void {
    this.staff.getInstructorStudents().subscribe((data) => this.students.set(data));
  }
}
