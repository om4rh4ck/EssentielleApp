import { isPlatformBrowser } from '@angular/common';
import { Component, ChangeDetectionStrategy, AfterViewInit, ElementRef, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { animate } from 'motion';
import { DisplayPreferencesService, LocalizedText } from '../../shared/services/display-preferences.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html'
})
export class LandingComponent implements AfterViewInit {
  private readonly preferences = inject(DisplayPreferencesService);
  private readonly platformId = inject(PLATFORM_ID);
  @ViewChild('heroContent') heroContent!: ElementRef;
  readonly newsletterState = signal<'idle' | 'success' | 'error'>('idle');

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }

  onNewsletterSubmit(event: Event, emailInput: HTMLInputElement) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      this.newsletterState.set('error');
      return;
    }

    this.newsletterState.set('success');
    emailInput.value = '';
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && this.heroContent) {
      animate(
        this.heroContent.nativeElement,
        { opacity: [0.2, 1], y: [24, 0] },
        { duration: 0.8, ease: 'easeOut' }
      );
    }
  }
}
