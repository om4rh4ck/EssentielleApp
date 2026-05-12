import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyCode, DisplayPreferencesService, LocalizedText } from '../../shared/services/display-preferences.service';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PublicCatalogCourse, PublicCatalogFormula, PublicCatalogService } from '../../services/public-catalog.service';

@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './formations.html',
})
export class FormationsComponent implements OnInit {
  private readonly preferences = inject(DisplayPreferencesService);
  private readonly catalog = inject(PublicCatalogService);

  readonly currency = this.preferences.currency;
  readonly courses = signal<PublicCatalogCourse[]>([]);
  readonly formulas = signal<PublicCatalogFormula[]>([]);

  ngOnInit(): void {
    this.catalog.getCatalog().subscribe((data) => {
      this.courses.set(data.courses);
      this.formulas.set(
        data.formulas.map((formula) =>
          formula.id === 'formula-3'
            ? {
                ...formula,
                description: 'Une formule premium concue pour offrir un parcours professionnalisant complet, avec certifications, ressources exclusives et accompagnement personnalise.',
                highlights: [
                  '3 certificats professionnels inclus',
                  'Ebook exclusif offert',
                  'Suivi personnalise pendant 1 mois',
                ],
              }
            : formula
        )
      );
    });
  }

  formatPrice(amountInEuro: number): string {
    const currency = this.currency();
    const convertedAmount = this.preferences.convertFromEuro(amountInEuro, currency);

    return new Intl.NumberFormat(this.getLocale(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'TND' ? 3 : 0,
    }).format(convertedAmount);
  }

  formulaPrice(formula: PublicCatalogFormula): string {
    const currency = this.currency();
    const value =
      currency === 'TND' ? formula.activePriceTnd :
      currency === 'USD' ? formula.activePriceUsd :
      formula.activePriceEur;

    return new Intl.NumberFormat(this.getLocale(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'TND' ? 3 : 0,
    }).format(value);
  }

  coursePrice(course: PublicCatalogCourse): string {
    if (course.access === 'free') {
      return this.t({ fr: 'Acces libre', en: 'Free access', ar: 'دخول مجاني' });
    }

    if (course.priceMinEur && course.priceMaxEur && course.priceMaxEur > course.priceMinEur) {
      return `${this.formatPrice(course.priceMinEur)} - ${this.formatPrice(course.priceMaxEur)}`;
    }

    const basePrice = course.promoEnabled && course.promoPriceEur && course.promoPriceEur > 0
      ? course.promoPriceEur
      : course.priceEur;

    return this.formatPrice(basePrice);
  }

  courseCertificates(course: PublicCatalogCourse): string | null {
    if (!course.certificateOptions?.length) {
      return null;
    }

    const min = Math.min(...course.certificateOptions);
    const max = Math.max(...course.certificateOptions);
    return `${min} - ${max} certificat${max > 1 ? 's' : ''}`;
  }

  private getLocale(currency: CurrencyCode): string {
    if (currency === 'TND') return 'fr-TN';
    if (currency === 'USD') return 'en-US';
    return 'fr-FR';
  }

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }
}
