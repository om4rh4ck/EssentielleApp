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
    .dest-card:hover .dest-overlay { opacity: .45; }
    .dest-overlay { transition: opacity .4s; }
    .dest-text { text-shadow: 0 2px 12px rgba(0,0,0,.9), 0 1px 4px rgba(0,0,0,1); }
    .dest-label { text-shadow: 0 1px 8px rgba(0,0,0,.8); }
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
    @keyframes testi-scroll-l {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes testi-scroll-r {
      from { transform: translateX(-50%); }
      to   { transform: translateX(0); }
    }
    .testi-row-l { animation: testi-scroll-l 55s linear infinite; }
    .testi-row-r { animation: testi-scroll-r 55s linear infinite; }
    .testi-row-l:hover, .testi-row-r:hover { animation-play-state: paused; }
    .testi-card { flex-shrink: 0; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .feat-card {
      animation: fadeUp 0.65s cubic-bezier(.4,0,.2,1) both;
    }
    .feat-card:nth-child(1) { animation-delay: 0.05s; }
    .feat-card:nth-child(2) { animation-delay: 0.18s; }
    .feat-card:nth-child(3) { animation-delay: 0.31s; }
    .feat-card:nth-child(4) { animation-delay: 0.44s; }
    .feat-card:hover .feat-icon { transform: scale(1.12) rotate(-4deg); }
    .feat-icon { transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
    .feat-card:hover { transform: translateY(-6px); }
    .feat-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
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
