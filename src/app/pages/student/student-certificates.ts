import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { StudentCertificate, StudentPortalService } from '../../services/student-portal.service';
import { STUDENT_MENU_ITEMS } from './student-menu';

@Component({
  selector: 'app-student-certificates',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Certificats" [menuItems]="menuItems">
      <div class="space-y-6">
        <div class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-8 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
          <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Vos certificats de formation</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-brand-green-800)]/70">
            Cette section est liée au suivi pédagogique et à l’administration. Dès qu’une formation est validée, votre certificat est ajouté ici.
          </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          @for (certificate of certificates(); track certificate.id) {
            <article class="rounded-[28px] border border-[var(--color-brand-gold-300)]/35 bg-white p-6 shadow-[0_24px_50px_rgba(0,0,0,0.04)]">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4">
                  <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-gold-300)]/18 text-[var(--color-brand-gold-700)]">
                    <mat-icon>workspace_premium</mat-icon>
                  </div>
                  <div>
                    <div class="rounded-full bg-[var(--color-brand-cream)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/55">
                      {{ certificate.status === 'issued' ? 'Disponible' : 'En attente' }}
                    </div>
                    <h3 class="mt-3 font-serif text-2xl text-[var(--color-brand-green-900)]">{{ certificate.title }}</h3>
                    <p class="mt-2 text-sm text-[var(--color-brand-green-800)]/70">Signé par {{ certificate.signedBy }}</p>
                  </div>
                </div>
                <div class="text-right text-sm text-[var(--color-brand-green-800)]/60">
                  <div class="uppercase tracking-[0.2em] text-xs">Émission</div>
                  <div class="mt-2 font-semibold text-[var(--color-brand-green-900)]">{{ certificate.issuedAt | date:'dd/MM/yyyy' }}</div>
                </div>
              </div>

              <div class="mt-6 flex flex-wrap gap-3">
                <button type="button" class="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-green-800)]" [disabled]="certificate.status !== 'issued'">
                  <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">download</mat-icon>
                  Télécharger
                </button>
                <span class="inline-flex items-center rounded-full bg-[var(--color-brand-cream)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-green-800)]/55">
                  Validation administrative requise
                </span>
              </div>
            </article>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class StudentCertificatesComponent implements OnInit {
  private portal = inject(StudentPortalService);

  menuItems = [...STUDENT_MENU_ITEMS];
  certificates = signal<StudentCertificate[]>([]);

  ngOnInit(): void {
    this.portal.getCertificates().subscribe((data) => this.certificates.set(data));
  }
}
