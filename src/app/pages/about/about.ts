import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { animate } from 'motion';
import { DisplayPreferencesService, LocalizedText } from '../../shared/services/display-preferences.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './about.html',
})
export class AboutComponent {
  private readonly preferences = inject(DisplayPreferencesService);
  private readonly platformId = inject(PLATFORM_ID);
  @ViewChild('conceptLogo') conceptLogo!: ElementRef<HTMLImageElement>;

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }

  readonly values = [
    { icon: 'school',        label: { fr: 'Excellence pédagogique',      en: 'Pedagogical excellence',    ar: 'التميز التربوي' } },
    { icon: 'verified_user', label: { fr: 'Professionnalisme & éthique', en: 'Professionalism & ethics',   ar: 'المهنية والأخلاق' } },
    { icon: 'favorite',      label: { fr: 'Bienveillance & respect',     en: 'Kindness & respect',         ar: 'اللطف والاحترام' } },
    { icon: 'support_agent', label: { fr: 'Accompagnement personnalisé', en: 'Personalised guidance',      ar: 'المرافقة الفردية' } },
    { icon: 'auto_awesome',  label: { fr: 'Innovation & modernité',      en: 'Innovation & modernity',     ar: 'الابتكار والحداثة' } },
    { icon: 'people',        label: { fr: 'Accessibilité pour tous',     en: 'Accessibility for all',      ar: 'الوصول للجميع' } },
    { icon: 'public',        label: { fr: 'Ouverture internationale',    en: 'International openness',     ar: 'الانفتاح الدولي' } },
    { icon: 'build',         label: { fr: 'Transmission de savoir-faire', en: 'Sharing practical skills', ar: 'نقل المهارات العملية' } },
  ];

  onLogoClick() {
    if (!isPlatformBrowser(this.platformId) || !this.conceptLogo) {
      return;
    }

    animate(
      this.conceptLogo.nativeElement,
      { x: [0, -18, 18, -12, 12, -6, 6, 0] },
      { duration: 0.65, ease: 'easeInOut' }
    );
  }
}
