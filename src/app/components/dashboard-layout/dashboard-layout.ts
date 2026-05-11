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
        class="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[360px] flex-col overflow-hidden bg-[linear-gradient(180deg,#102519_0%,#173927_100%)] text-white shadow-[0_30px_80px_rgba(4,10,28,0.45)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-72 lg:border-r lg:border-[var(--color-brand-gold-300)]/18 lg:bg-[linear-gradient(180deg,#fffefb_0%,#f7f0e3_46%,#f2e8d6_100%)] lg:text-[var(--color-brand-green-900)] lg:shadow-[0_22px_50px_rgba(15,23,18,0.08)]"
        [style.transform]="menuOpen() ? 'translateX(0)' : 'translateX(-115%)'"
        [style.visibility]="menuOpen() ? 'visible' : 'hidden'"
        [style.pointerEvents]="menuOpen() ? 'auto' : 'none'"
        style="will-change: transform">
        <div class="border-b border-white/10 px-4 pb-6 pt-5 lg:border-[var(--color-brand-gold-300)]/16 lg:px-6 lg:py-7">
          <div class="flex items-start justify-between gap-3">
            <a routerLink="/" (click)="closeMenu()" class="flex min-w-0 items-center gap-3">
              <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white p-2 shadow-[0_12px_30px_rgba(255,255,255,0.12)] lg:rounded-[20px] lg:border-[var(--color-brand-gold-300)]/40 lg:bg-white lg:shadow-[0_10px_24px_rgba(200,169,106,0.16)]">
                <img src="ess logo.png" alt="Essenti'Elle Sante" class="h-full w-full object-contain" />
              </span>
              <span class="min-w-0">
                <span class="block truncate font-serif text-[1.55rem] leading-none tracking-tight text-[var(--color-brand-gold-300)] lg:text-[var(--color-brand-green-900)]">
                  Essenti'Elle
                </span>
                <span class="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-white/72 lg:text-[var(--color-brand-gold-700)]">
                  Sante Premium
                </span>
              </span>
            </a>

            <button
              type="button"
              (click)="closeMenu()"
              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/6 text-white lg:hidden">
              <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">close</mat-icon>
            </button>
          </div>

          <div class="mt-6 rounded-[28px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:border-[var(--color-brand-gold-300)]/18 lg:bg-white/78 lg:p-5 lg:shadow-[0_14px_34px_rgba(18,53,36,0.05)]">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#133123_0%,#28533c_100%)] text-sm font-bold tracking-[0.14em] text-[var(--color-brand-gold-300)] shadow-[0_16px_28px_rgba(18,53,36,0.18)]">
                {{ initials() }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-white lg:text-[var(--color-brand-green-900)]">{{ auth.currentUser()?.email }}</p>
                <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand-gold-300)] lg:text-[var(--color-brand-green-800)]/70">
                  {{ roleLabel() }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 lg:px-5 lg:py-6">
          @for (item of menuItems(); track item.label; let first = $first) {
            <a
              #rla="routerLinkActive"
              [routerLink]="item.path"
              (click)="closeMenu()"
              routerLinkActive="bg-white text-black shadow-[0_16px_36px_rgba(255,255,255,0.10)] lg:bg-[linear-gradient(135deg,var(--color-brand-green-900)_0%,var(--color-brand-green-800)_60%,#355c47_100%)] lg:text-white lg:shadow-[0_16px_34px_rgba(18,53,36,0.18)] lg:[&_.dashboard-item-label]:text-white"
              [routerLinkActiveOptions]="{ exact: true }"
              class="group flex items-center gap-3 rounded-[24px] px-4 py-3.5 text-[1rem] font-semibold text-white/88 transition-all duration-300 hover:bg-white/8 hover:text-white lg:text-sm lg:text-[var(--color-brand-green-900)]/76 lg:hover:bg-white/70 lg:hover:text-[var(--color-brand-green-900)]">
              <span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 group-hover:bg-white/14 group-[.bg-white]:bg-[rgba(15,27,61,0.08)] group-[.bg-white]:text-black lg:h-11 lg:w-11 lg:rounded-[16px] lg:border lg:border-[var(--color-brand-gold-300)]/28 lg:bg-[linear-gradient(180deg,#ffffff_0%,#f6ecdb_100%)] lg:text-[var(--color-brand-green-900)] lg:shadow-[0_10px_20px_rgba(18,53,36,0.06)]">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">{{ item.icon }}</mat-icon>
              </span>
              <span
                class="dashboard-item-label flex-1 leading-5"
                [class.text-black]="rla.isActive && !isDesktop()"
                [class.!text-white]="rla.isActive && isDesktop()">
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

        <div class="px-4 pb-5 pt-2 lg:border-t lg:border-[var(--color-brand-gold-300)]/16 lg:bg-white/66 lg:px-5 lg:py-5">
          <button
            type="button"
            (click)="auth.logout()"
            class="flex w-full items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/6 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 lg:border-[var(--color-brand-green-900)]/10 lg:bg-white lg:text-[var(--color-brand-green-900)] lg:hover:border-[var(--color-brand-gold-500)] lg:hover:bg-[var(--color-brand-cream)]">
            <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">logout</mat-icon>
            Deconnexion
          </button>
        </div>
      </aside>

      <main class="min-h-screen transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" [style.marginLeft]="isDesktop() && menuOpen() ? '18rem' : '0'">
        <header class="sticky top-0 z-30 border-b border-[var(--color-brand-gold-300)]/14 bg-[linear-gradient(180deg,rgba(255,252,246,0.96)_0%,rgba(250,244,232,0.93)_100%)] backdrop-blur-xl">
          <div class="flex min-h-[78px] items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                (click)="toggleMenu()"
                class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/28 bg-[var(--color-brand-cream)] text-[var(--color-brand-green-900)] shadow-[0_10px_24px_rgba(18,53,36,0.07)] lg:hidden">
                <mat-icon class="!h-[20px] !w-[20px] !text-[20px]">menu</mat-icon>
              </button>

              <a routerLink="/" class="inline-flex items-center gap-3 lg:hidden">
                <span class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/25 bg-white p-2 shadow-[0_10px_22px_rgba(200,169,106,0.16)]">
                  <img src="ess logo.png" alt="Essenti'Elle Sante" class="h-full w-full object-contain" />
                </span>
              </a>

              <div class="min-w-0">
                <p class="hidden text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--color-brand-gold-700)] sm:block">Dashboard Premium</p>
                <h2 class="truncate font-serif text-[1.45rem] leading-tight text-[var(--color-brand-green-900)] sm:text-[1.75rem]">{{ title() }}</h2>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-brand-gold-300)]/26 bg-[var(--color-brand-cream)] text-[var(--color-brand-gold-700)] shadow-[0_10px_24px_rgba(200,169,106,0.12)] transition hover:text-[var(--color-brand-green-900)]">
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
