import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyCode, DisplayPreferencesService, LanguageCode, LocalizedText } from '../../shared/services/display-preferences.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, MatIconModule],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayoutComponent {
  private readonly preferences = inject(DisplayPreferencesService);

  readonly currency = this.preferences.currency;
  readonly language = this.preferences.language;

  showCurrencyMenu = false;
  showLanguageMenu = false;

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
    if (this.showCurrencyMenu) {
      this.showLanguageMenu = false;
    }
  }

  toggleLanguageMenu(): void {
    this.showLanguageMenu = !this.showLanguageMenu;
    if (this.showLanguageMenu) {
      this.showCurrencyMenu = false;
    }
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
    return this.currencyOptions.find((option) => option.code === this.currency())?.icon ?? 'icon-currency-eur.svg';
  }

  currentLanguageIcon(): string {
    return this.languageOptions.find((option) => option.code === this.language())?.icon ?? 'flag-fr.svg';
  }

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }
}
