import { ChangeDetectionStrategy, Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,169,106,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(18,53,36,0.08),transparent_24%),linear-gradient(180deg,#fbf8f2_0%,#f4ede1_45%,#efe6d7_100%)] font-sans text-[var(--color-brand-green-900)]">
      @if (menuOpen() && !isDesktop()) {
        <button
          type="button"
          aria-label="Fermer le menu"
          (click)="closeMenu()"
          class="fixed inset-0 z-40 bg-[rgba(10,18,46,0.34)] backdrop-blur-[5px] lg:hidden">
        </button>
      }

      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[360px] flex-col overflow-hidden bg-white text-[var(--color-brand-green-900)] shadow-[0_24px_60px_rgba(15,23,18,0.14)] lg:w-72 lg:border-r lg:border-[var(--color-brand-gold-300)]/18 lg:shadow-[0_18px_40px_rgba(15,23,18,0.08)]"
        [style.transform]="menuOpen() ? 'translateX(0)' : 'translateX(-115%)'"
        [style.visibility]="menuOpen() ? 'visible' : 'hidden'"
        [style.pointerEvents]="menuOpen() ? 'auto' : 'none'"
        style="will-change: transform">
        <div class="border-b border-white/10 px-4 pb-6 pt-5 lg:border-[var(--color-brand-gold-300)]/16 lg:px-6 lg:py-7">
          <div class="flex items-start justify-between gap-3">
            <a routerLink="/" (click)="closeMenu()" class="flex min-w-0 items-center gap-3">
              <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white p-2 shadow-[0_12px_30px_rgba(255,255,255,0.12)] lg:rounded-[20px] lg:border-[var(--color-brand-gold-300)]/40 lg:bg-white lg:shadow-[0_10px_24px_rgba(200,169,106,0.16)]">
                <img src="lo2 originale.png" alt="Essenti'Elle Sante" class="h-full w-full object-contain" />
              </span>
              <span class="min-w-0">
                <span class="block truncate font-serif text-[1.55rem] leading-none tracking-tight text-[var(--color-brand-green-900)]">
                  Essenti'Elle
                </span>
                <span class="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand-gold-700)]">
                  Sante Premium
                </span>
              </span>
            </a>

            <button
              type="button"
              (click)="closeMenu()"
              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/30 bg-[var(--color-brand-cream)] text-[var(--color-brand-green-900)] lg:hidden">
              <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">close</mat-icon>
            </button>
          </div>
        </div>

        <nav class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 lg:px-5 lg:py-6">
          @for (item of menuItems(); track item.label; let first = $first) {
            <a
              #rla="routerLinkActive"
              [routerLink]="item.path"
              (click)="closeMenu()"
              routerLinkActive="bg-[linear-gradient(135deg,var(--color-brand-green-900)_0%,var(--color-brand-green-800)_60%,#355c47_100%)] text-white shadow-[0_16px_34px_rgba(18,53,36,0.18)] [&_.dashboard-item-label]:text-white [&_.dashboard-item-icon]:bg-white [&_.dashboard-item-icon]:text-[var(--color-brand-green-900)]"
              [routerLinkActiveOptions]="{ exact: true }"
              class="group flex items-center gap-3 rounded-[24px] px-4 py-3.5 text-[1rem] font-semibold text-[var(--color-brand-green-900)] transition-none hover:bg-[var(--color-brand-cream)] lg:text-sm">
              <span class="dashboard-item-icon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#ffffff_0%,#f6ecdb_100%)] text-[var(--color-brand-green-900)] shadow-[0_10px_20px_rgba(18,53,36,0.06)] lg:h-11 lg:w-11 lg:rounded-[16px]">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">{{ item.icon }}</mat-icon>
              </span>
              <span
                class="dashboard-item-label flex-1 leading-5"
                [class.!text-white]="rla.isActive">
                {{ item.label }}
              </span>
              @if (first) {
                <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--color-brand-green-900)] shadow-[0_8px_18px_rgba(18,53,36,0.08)]">
                  9
                </span>
              }
            </a>
          }
        </nav>

        <div class="hidden px-4 pb-5 pt-2 lg:block lg:border-t lg:border-[var(--color-brand-gold-300)]/16 lg:bg-white lg:px-5 lg:py-5">
          <button
            type="button"
            (click)="auth.logout()"
            class="flex w-full items-center justify-center gap-2 rounded-[20px] border border-[var(--color-brand-green-900)]/10 bg-white px-4 py-3.5 text-sm font-semibold text-[var(--color-brand-green-900)] transition-none hover:border-[var(--color-brand-gold-500)] hover:bg-[var(--color-brand-cream)]">
            <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">logout</mat-icon>
            Deconnexion
          </button>
        </div>
      </aside>

      <main class="min-h-screen" [style.marginLeft]="isDesktop() && menuOpen() ? '18rem' : '0'">
        <header class="sticky top-0 z-30 border-b border-[var(--color-brand-gold-300)]/14 bg-[linear-gradient(180deg,rgba(255,252,246,0.96)_0%,rgba(250,244,232,0.93)_100%)] backdrop-blur-xl">
          <div class="flex min-h-[78px] items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                (click)="toggleMenu()"
                class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/28 bg-[var(--color-brand-cream)] text-[var(--color-brand-green-900)] shadow-[0_10px_24px_rgba(18,53,36,0.07)] lg:hidden">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">menu</mat-icon>
              </button>

              <a routerLink="/" class="inline-flex items-center gap-3 lg:hidden">
                <span class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/25 bg-white p-2 shadow-[0_10px_22px_rgba(200,169,106,0.16)]">
                  <img src="lo2 originale.png" alt="Essenti'Elle Sante" class="h-full w-full object-contain" />
                </span>
              </a>

              <div class="min-w-0 flex-1">
                <p class="hidden text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--color-brand-gold-700)] sm:block">Dashboard Premium</p>
                <h2 class="truncate pr-1 font-serif text-[1.15rem] leading-tight text-[var(--color-brand-green-900)] sm:text-[1.75rem]">{{ title() }}</h2>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                class="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/26 bg-[var(--color-brand-cream)] text-[var(--color-brand-gold-700)] shadow-[0_10px_24px_rgba(200,169,106,0.12)] transition hover:text-[var(--color-brand-green-900)] sm:h-12 sm:w-12">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">notifications_none</mat-icon>
                <span class="absolute right-[11px] top-[11px] h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--color-brand-green-800)]"></span>
              </button>

              <div class="hidden items-center gap-3 rounded-full border border-[var(--color-brand-gold-300)]/24 bg-white/80 px-3 py-2 shadow-[0_14px_28px_rgba(18,53,36,0.06)] sm:flex">
                <span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d3a879_0%,#f3dec4_100%)] text-sm font-bold tracking-[0.14em] text-[var(--color-brand-green-900)]">
                  {{ initials() }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-[var(--color-brand-green-900)]">{{ displayName() }}</p>
                  <p class="truncate text-xs font-medium text-[var(--color-brand-green-800)]/68">{{ roleLabel() }}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div class="px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
          <ng-content></ng-content>

          <section class="mt-8 rounded-[28px] border border-[var(--color-brand-gold-300)]/28 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe1_100%)] p-5 shadow-[0_16px_34px_rgba(18,53,36,0.05)]">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)] text-white">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">gavel</mat-icon>
              </span>
              <div>
                <h3 class="font-serif text-2xl text-[var(--color-brand-green-900)]">Reservation des droits</h3>
                <p class="mt-2 text-sm leading-7 text-[var(--color-brand-green-800)]/78">
                  Tous les contenus, images, videos, audios, documents et supports de cette plateforme sont reserves et proteges. Toute copie, recuperation, reutilisation, diffusion ou redistribution sans autorisation ecrite prealable est strictement interdite.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  `
})
export class DashboardLayoutComponent {
  title = input.required<string>();
  menuItems = input.required<{ label: string; icon: string; path: string }[]>();
  auth = inject(AuthService);
  roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'admin') return 'Administration';
    if (role === 'instructor') return 'Instructrice';
    if (role === 'student') return 'Etudiante';
    return 'Espace membre';
  });

  displayName = computed(() => this.auth.currentUser()?.name || "Essenti'Elle");

  initials = computed(() =>
    this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'EE'
  );

  isDesktop = signal(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  menuOpen = signal(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined') {
      const desktop = window.innerWidth >= 1024;
      this.isDesktop.set(desktop);
      if (desktop) {
        this.menuOpen.set(true);
      } else {
        this.menuOpen.set(false);
      }
    }
  }
}
