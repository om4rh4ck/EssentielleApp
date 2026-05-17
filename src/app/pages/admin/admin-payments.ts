import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { EnrollmentRequestRecord, PaymentRecord, StaffPortalService } from '../../services/staff-portal.service';
import { ADMIN_MENU_ITEMS } from './admin-menu';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [DashboardLayoutComponent, DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Paiements & Abos" [menuItems]="menuItems">
      <div class="space-y-6">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Demandes d'inscription</h2>
              <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">
                Validez la demande pour ouvrir l'acces de l'etudiante a sa formation payante.
              </p>
            </div>
            <div class="text-sm text-[var(--color-brand-green-800)]/60">{{ enrollmentRequests().length }} demandes</div>
          </div>

          @if (feedback()) {
            <div class="mb-4 rounded-2xl border px-4 py-3 text-sm"
              [class.border-emerald-200]="feedback()!.type === 'success'"
              [class.bg-emerald-50]="feedback()!.type === 'success'"
              [class.text-emerald-800]="feedback()!.type === 'success'"
              [class.border-rose-200]="feedback()!.type === 'error'"
              [class.bg-rose-50]="feedback()!.type === 'error'"
              [class.text-rose-800]="feedback()!.type === 'error'">
              {{ feedback()!.text }}
            </div>
          }

          <div class="space-y-4">
            @for (request of enrollmentRequests(); track request.id) {
              <article class="rounded-[24px] bg-[var(--color-brand-cream)] p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">{{ request.name }}</h3>
                    <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ request.courseTitle }}</p>
                    <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ request.email }} · {{ request.phone }}</p>
                    <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ request.requestedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                    @if (request.certificateCount) {
                      <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ request.certificateCount }} certificat(s)</p>
                    }
                    @if (request.matchedStudentName) {
                      <p class="mt-2 text-sm font-semibold text-emerald-700">Compte etudiante : {{ request.matchedStudentName }}</p>
                    } @else {
                      <p class="mt-2 text-sm font-semibold text-amber-700">Aucun compte etudiante relie a cet email.</p>
                    }
                    @if (request.message) {
                      <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">{{ request.message }}</p>
                    }
                  </div>

                  <div class="text-right">
                    <div class="mt-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
                      [class.bg-emerald-50]="request.status === 'approved'"
                      [class.text-emerald-700]="request.status === 'approved'"
                      [class.bg-amber-50]="request.status === 'pending'"
                      [class.text-amber-700]="request.status === 'pending'">
                      {{ request.status === 'approved' ? 'Validee' : 'En attente' }}
                    </div>

                    @if (request.status === 'pending') {
                      <button
                        type="button"
                        (click)="approve(request)"
                        [disabled]="approvingId() === request.id"
                        class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)] disabled:opacity-60">
                        <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">verified</mat-icon>
                        {{ approvingId() === request.id ? 'Validation...' : 'Valider et ouvrir l acces' }}
                      </button>
                    }
                  </div>
                </div>
              </article>
            }
          </div>
        </section>

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
                    <div class="text-2xl font-bold text-[var(--color-brand-green-900)]">{{ payment.amountEur }} EUR</div>
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
      </div>
    </app-dashboard-layout>
  `
})
export class AdminPaymentsComponent implements OnInit {
  private staff = inject(StaffPortalService);

  menuItems = [...ADMIN_MENU_ITEMS];
  payments = signal<PaymentRecord[]>([]);
  enrollmentRequests = signal<EnrollmentRequestRecord[]>([]);
  approvingId = signal<string | null>(null);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.staff.getAdminPayments().subscribe((data) => this.payments.set(data));
    this.staff.getAdminEnrollmentRequests().subscribe((data) => this.enrollmentRequests.set(data));
  }

  approve(request: EnrollmentRequestRecord): void {
    this.approvingId.set(request.id);
    this.feedback.set(null);
    this.staff.approveAdminEnrollmentRequest(request.id).subscribe({
      next: () => {
        this.approvingId.set(null);
        this.feedback.set({ type: 'success', text: `La demande de ${request.name} a ete validee et l'acces a la formation est maintenant ouvert.` });
        this.load();
      },
      error: (err) => {
        this.approvingId.set(null);
        this.feedback.set({ type: 'error', text: err?.error?.error || 'Impossible de valider cette demande pour le moment.' });
      },
    });
  }
}
