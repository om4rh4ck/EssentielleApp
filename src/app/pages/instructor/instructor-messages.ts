import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ConversationMessage, MessageContact, StaffPortalService } from '../../services/staff-portal.service';
import { INSTRUCTOR_MENU_ITEMS } from './instructor-menu';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-instructor-messages',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Messages / Q&A" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Utilisatrices</h2>
            <span class="rounded-full bg-[var(--color-brand-gold-100)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-gold-700)]">
              {{ contacts().length }}
            </span>
          </div>
          <div class="mt-6 space-y-3">
            @for (contact of contacts(); track contact.id) {
              <button
                type="button"
                (click)="selectContact(contact)"
                class="flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition"
                [class.border-[var(--color-brand-green-900)]]="selectedContactId() === contact.id"
                [class.bg-[var(--color-brand-cream)]]="selectedContactId() === contact.id"
                [class.border-gray-100]="selectedContactId() !== contact.id"
                [class.bg-white]="selectedContactId() !== contact.id">
                <span>
                  <span class="block font-semibold text-[var(--color-brand-green-900)]">{{ contact.name }}</span>
                  <span class="mt-1 block text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/55">{{ roleLabel(contact.role) }}</span>
                </span>
                <mat-icon class="text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
              </button>
            }
          </div>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.04)]">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Conversation</h2>
              <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
                @if (selectedContact(); as contact) {
                  Echanges avec {{ contact.name }}
                } @else {
                  Selectionnez un contact pour consulter vos messages.
                }
              </p>
            </div>
            <button
              type="button"
              (click)="refreshConversation()"
              class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-green-900)]/18 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-green-900)] shadow-[0_10px_24px_rgba(15,23,19,0.06)] transition hover:border-[var(--color-brand-green-900)]/40 hover:bg-[var(--color-brand-cream)]">
              <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">refresh</mat-icon>
              Actualiser
            </button>
          </div>

          <div class="mt-6 space-y-4">
            @for (message of conversation(); track message.id) {
              <article class="rounded-[24px] p-5" [class.bg-[var(--color-brand-cream)]]="message.senderRole === 'instructor'" [class.bg-[#f7f7f7]]="message.senderRole !== 'instructor'">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-gold-700)]">{{ message.senderName }}</div>
                    <h3 class="mt-2 text-lg font-bold text-[var(--color-brand-green-900)]">{{ message.subject }}</h3>
                  </div>
                  <div class="text-xs text-[var(--color-brand-green-800)]/50">{{ message.sentAt | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
                <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/70">{{ message.content }}</p>
              </article>
            } @empty {
              <div class="rounded-[24px] border border-dashed border-[var(--color-brand-gold-300)]/35 p-6 text-sm text-[var(--color-brand-green-800)]/60">
                Aucun message pour ce contact.
              </div>
            }
          </div>

          <form [formGroup]="form" (ngSubmit)="send()" class="mt-8 space-y-4 rounded-[24px] bg-[var(--color-brand-cream)] p-5">
            <input formControlName="subject" placeholder="Sujet" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none" />
            <textarea formControlName="content" rows="7" placeholder="Votre message" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none"></textarea>
            <button type="submit" [disabled]="form.invalid || !selectedContactId()" class="rounded-full bg-[var(--color-brand-green-900)] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
              Envoyer
            </button>
          </form>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class InstructorMessagesComponent implements OnInit {
  private readonly staff = inject(StaffPortalService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = [...INSTRUCTOR_MENU_ITEMS];
  readonly contacts = signal<MessageContact[]>([]);
  readonly messages = signal<ConversationMessage[]>([]);
  readonly selectedContactId = signal<string>('');
  readonly selectedContact = computed(() => this.contacts().find((contact) => contact.id === this.selectedContactId()) ?? null);
  readonly conversation = computed(() =>
    this.messages().filter((message) => {
      const contactId = this.selectedContactId();
      return !!contactId && (message.senderId === contactId || message.recipientId === contactId);
    })
  );

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(3)]],
    content: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.refreshConversation();
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshConversation(false));
  }

  load(): void {
    this.staff.getInstructorMessages().subscribe({
      next: (data) => this.messages.set(data),
      error: (error) => this.handleHttpError(error),
    });
  }

  refreshConversation(resetSelection = true): void {
    this.staff.getInstructorMessageContacts().subscribe({
      next: (contacts) => {
        this.contacts.set(contacts);
        if (!contacts.length) {
          this.selectedContactId.set('');
          return;
        }

        const current = this.selectedContactId();
        const hasCurrent = contacts.some((contact) => contact.id === current);
        if (resetSelection || !hasCurrent) {
          this.selectedContactId.set(hasCurrent && current ? current : contacts[0].id);
        }
      },
      error: (error) => this.handleHttpError(error),
    });

    this.load();
  }

  selectContact(contact: MessageContact): void {
    this.selectedContactId.set(contact.id);
  }

  send(): void {
    if (this.form.invalid || !this.selectedContactId()) return;
    this.staff.replyInstructorMessage({
      recipientId: this.selectedContactId(),
      ...this.form.getRawValue(),
    }).subscribe({
      next: () => {
        this.form.patchValue({ subject: '', content: '' });
        this.refreshConversation(false);
      },
      error: (error) => this.handleHttpError(error),
    });
  }

  roleLabel(role: MessageContact['role']): string {
    if (role === 'admin') return 'Admin';
    if (role === 'instructor') return 'Formatrice';
    return 'Etudiante';
  }

  private handleHttpError(error: { status?: number }): void {
    if (error?.status === 401) {
      this.auth.logout();
    }
  }
}
