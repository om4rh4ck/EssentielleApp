import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { PaymentRecord, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [DashboardLayoutComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Paiements & Abos" [menuItems]="menuItems">
      <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Suivi des paiements</h2>
          <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ payments().length }} lignes</div>
        </div>
        <div class="space-y-4">
          @for (payment of payments(); track payment.id) {
            <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ payment.studentName }}</h3>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ payment.courseTitle }}</p>
                  <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ payment.paidAt | date:'dd/MM/yyyy HH:mm' }}</p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-[var(--color-brand-green-900)]">{{ payment.amountEur }} €</div>
                  <div class="mt-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
                    [class]="payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                    {{ payment.status }}
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
      </section>
    </app-dashboard-layout>
  `
})
export class AdminPaymentsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...ADMIN_MENU_ITEMS];
  payments = signal<PaymentRecord[]>([]);

  ngOnInit(): void {
    this.staff.getAdminPayments().subscribe((data) => this.payments.set(data));
  }
}
