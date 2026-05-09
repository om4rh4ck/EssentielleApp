import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { AdminUser, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DashboardLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Utilisatrices & Accès" [menuItems]="menuItems">
      <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Gestion des rôles</h2>
          <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ users().length }} comptes</div>
        </div>
        <div class="space-y-4">
          @for (user of users(); track user.id) {
            <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ user.name }}</h3>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ user.email }} · {{ user.city }} {{ user.country ? '· ' + user.country : '' }}</p>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ user.courses }} éléments liés</p>
                </div>
                <select [value]="user.role" (change)="changeRole(user.id, $any($event.target).value)" class="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--color-brand-green-900)] outline-none">
                  <option value="student">Étudiante</option>
                  <option value="instructor">Formatrice</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </article>
          }
        </div>
      </section>
    </app-dashboard-layout>
  `
})
export class AdminUsersComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...ADMIN_MENU_ITEMS];
  users = signal<AdminUser[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.staff.getAdminUsers().subscribe((data) => this.users.set(data));
  }

  changeRole(userId: string, role: 'student' | 'instructor' | 'admin'): void {
    this.staff.updateAdminUserRole(userId, role).subscribe(() => this.load());
  }
}
