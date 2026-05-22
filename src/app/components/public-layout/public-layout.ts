import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyCode, DisplayPreferencesService, LanguageCode, LocalizedText } from '../../shared/services/display-preferences.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, MatIconModule],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayoutComponent {
  private readonly preferences = inject(DisplayPreferencesService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currency = this.preferences.currency;
  readonly language = this.preferences.language;

  isScrolled  = signal(false);
  mobileOpen  = signal(false);
  showCurrencyMenu = false;
  showLanguageMenu = false;

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled.set(window.scrollY > 30);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.header-floating-menu')) {
      this.showCurrencyMenu = false;
      this.showLanguageMenu = false;
    }
    if (!target.closest('.mobile-menu-wrapper')) {
      this.mobileOpen.set(false);
    }
  }

  readonly currencyOptions: { code: CurrencyCode; label: string; icon: string }[] = [
    { code: 'EUR', label: 'Euro', icon: 'icon-currency-eur.svg' },
    { code: 'USD', label: 'Dollar', icon: 'icon-currency-usd.svg' },
    { code: 'TND', label: 'Dinar tunisien', icon: 'icon-currency-tnd.svg' },
  ];

  readonly languageOptions: { code: LanguageCode; label: string; icon: string }[] = [
    { code: 'fr', label: 'Français', icon: 'flag-fr.svg' },
    { code: 'en', label: 'English', icon: 'flag-gb.svg' },
    { code: 'ar', label: 'العربية', icon: 'flag-sa.svg' },
  ];

  toggleCurrencyMenu(): void {
    this.showCurrencyMenu = !this.showCurrencyMenu;
    if (this.showCurrencyMenu) this.showLanguageMenu = false;
  }

  toggleLanguageMenu(): void {
    this.showLanguageMenu = !this.showLanguageMenu;
    if (this.showLanguageMenu) this.showCurrencyMenu = false;
  }

  setCurrency(currency: CurrencyCode): void {
    this.preferences.setCurrency(currency);
    this.showCurrencyMenu = false;
  }

  setLanguage(language: LanguageCode): void {
    this.preferences.setLanguage(language);
    this.showLanguageMenu = false;
  }

  currentCurrencyIcon(): string {
    return this.currencyOptions.find((o) => o.code === this.currency())?.icon ?? 'icon-currency-eur.svg';
  }

  currentLanguageIcon(): string {
    return this.languageOptions.find((o) => o.code === this.language())?.icon ?? 'flag-fr.svg';
  }

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }

  navigateToAccount(): void {
    void this.router.navigate([this.auth.getDashboardRoute()]);
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.mobileOpen.set(false);
  }

  closeMobile(): void { this.mobileOpen.set(false); }
}
