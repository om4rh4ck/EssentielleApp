import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DisplayPreferencesService, LocalizedText } from '../../shared/services/display-preferences.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './contact.html',
})
export class ContactComponent {
  private readonly preferences = inject(DisplayPreferencesService);

  t(value: LocalizedText): string {
    return this.preferences.text(value);
  }
}
