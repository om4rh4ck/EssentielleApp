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
  templateUrl: './landing.html',
  styles: [`
    @keyframes dest-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .dest-track {
      animation: dest-scroll 45s linear infinite;
      will-change: transform;
    }
    .dest-track:hover { animation-play-state: paused; }
    .dest-card img { transition: transform .6s cubic-bezier(.4,0,.2,1); }
    .dest-card:hover img { transform: scale(1.08); }
    .dest-card:hover .dest-overlay { opacity: .55; }
    .dest-overlay { transition: opacity .4s; }
    .social-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.7);
      font-size: 0.78rem; font-weight: 600;
      transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
    }
    .social-pill:hover {
      background: rgba(200,169,106,0.18);
      border-color: rgba(200,169,106,0.5);
      color: #e2c17a;
      transform: translateY(-2px);
    }
  `]
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
