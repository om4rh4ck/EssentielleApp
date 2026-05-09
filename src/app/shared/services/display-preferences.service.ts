import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, of } from 'rxjs';

export type CurrencyCode = 'EUR' | 'USD' | 'TND';
export type LanguageCode = 'fr' | 'en' | 'ar';
export type LocalizedText = Record<LanguageCode, string>;

interface DisplayPreferencesSnapshot {
  currency: CurrencyCode;
  language: LanguageCode;
}

@Injectable({ providedIn: 'root' })
export class DisplayPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'essentielle-display-preferences';

  readonly currency = signal<CurrencyCode>(this.readSnapshot().currency);
  readonly language = signal<LanguageCode>(this.readSnapshot().language);

  readonly currencyRates = signal<Record<CurrencyCode, number>>({
    EUR: 1,
    USD: 1.08,
    TND: 3.37,
  });

  constructor() {
    this.applyDocumentLanguage(this.language());
    if (isPlatformBrowser(this.platformId)) {
      this.loadExchangeRates();
    }
  }

  setCurrency(currency: CurrencyCode): void {
    this.currency.set(currency);
    this.persist();
  }

  setLanguage(language: LanguageCode): void {
    this.language.set(language);
    this.applyDocumentLanguage(language);
    this.persist();
  }

  convertFromEuro(amountInEuro: number, currency: CurrencyCode): number {
    return amountInEuro * this.currencyRates()[currency];
  }

  private loadExchangeRates(): void {
    this.http
      .get<{ rates?: Partial<Record<CurrencyCode, number>> }>('https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,TND')
      .pipe(catchError(() => of({ rates: undefined })))
      .subscribe((response) => {
        if (!response.rates?.USD || !response.rates?.TND) {
          return;
        }

        this.currencyRates.set({
          EUR: 1,
          USD: response.rates.USD,
          TND: response.rates.TND,
        });
      });
  }

  private readSnapshot(): DisplayPreferencesSnapshot {
    if (!isPlatformBrowser(this.platformId)) {
      return { currency: 'EUR', language: 'fr' };
    }

    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return { currency: 'EUR', language: 'fr' };
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<DisplayPreferencesSnapshot>;
      return {
        currency: parsed.currency === 'USD' || parsed.currency === 'TND' || parsed.currency === 'EUR' ? parsed.currency : 'EUR',
        language: parsed.language === 'en' || parsed.language === 'ar' || parsed.language === 'fr' ? parsed.language : 'fr',
      };
    } catch {
      return { currency: 'EUR', language: 'fr' };
    }
  }

  text(value: LocalizedText): string {
    return this.repairText(value[this.language()] ?? value.fr);
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const snapshot: DisplayPreferencesSnapshot = {
      currency: this.currency(),
      language: this.language(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  private applyDocumentLanguage(language: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }

  private repairText(value: string): string {
    if (!/[ÃÂØÙâ]/.test(value)) {
      return value;
    }

    try {
      const bytes = Uint8Array.from(Array.from(value).map((character) => character.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

      return decoded.includes('�') ? value : decoded;
    } catch {
      return value;
    }
  }
}
