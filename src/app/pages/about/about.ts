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
