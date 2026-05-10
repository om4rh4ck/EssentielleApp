import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { ADMIN_MENU_ITEMS } from './admin-menu';
import { ConversationMessage, MessageContact, StaffPortalService } from '../../services/staff-portal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [DashboardLayoutComponent, ReactiveFormsModule, DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dashboard-layout title="Messages Admin" [menuItems]="menuItems">
      <div class="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section class="rounded-[28px] bg-white p-6 shadow-[0_28px_60px_rgba(0,0,0,0.08)]">
          <div class="flex items-center justify-between gap-3 border-b border-[var(--color-brand-gold-100)] pb-4">
            <div>
              <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Utilisateurs</h2>
              <p class="text-sm text-[var(--color-brand-green-800)]/70">Liste des contacts actifs</p>
            </div>
            <span class="rounded-full bg-[var(--color-brand-gold-100)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-gold-700)]">
              {{ contacts().length }}
            </span>
          </div>

          <div class="mt-6 space-y-3">
            @for (contact of contacts(); track contact.id) {
              <button
                type="button"
                (click)="selectContact(contact)"
                class="flex w-full items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition shadow-sm"
                [class.border-[var(--color-brand-green-900)]]="selectedContactId() === contact.id"
                [class.bg-[var(--color-brand-cream)]]="selectedContactId() === contact.id"
                [class.border-gray-100]="selectedContactId() !== contact.id"
                [class.bg-white]="selectedContactId() !== contact.id">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-green-900)]/10 text-[var(--color-brand-green-900)] uppercase font-bold">
                  {{ contact.name.split(' ').map(n => n[0]).join('') }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-[var(--color-brand-green-900)] truncate">{{ contact.name }}</div>
                  <div class="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-brand-green-800)]/55">{{ roleLabel(contact.role) }}</div>
                </div>
                <mat-icon class="text-[var(--color-brand-gold-700)]">chevron_right</mat-icon>
              </button>
            }
          </div>
        </section>

        <section class="rounded-[28px] bg-white p-6 shadow-[0_28px_60px_rgba(0,0,0,0.08)] flex flex-col gap-6">
          <div class="border-b border-[var(--color-brand-gold-100)] pb-4">
            <h2 class="font-serif text-3xl text-[var(--color-brand-green-900)]">Conversation</h2>
            <p class="mt-2 text-sm leading-6 text-[var(--color-brand-green-800)]/70">
              @if (selectedContact(); as contact) {
                Échanges avec <span class="font-semibold text-[var(--color-brand-green-900)]">{{ contact.name }}</span>
              } @else {
                Sélectionnez un utilisateur pour démarrer la conversation.
              }
            </p>
          </div>

          <div class="flex flex-col gap-4 overflow-hidden rounded-[30px] border border-[var(--color-brand-gold-100)] bg-[var(--color-brand-cream)] p-5 shadow-inner shadow-[inset_0_2px_10px_rgba(15,23,19,0.04)]">
            <div class="flex items-center justify-between gap-4">
              <div>
                @if (selectedContact(); as contact) {
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">{{ contact.name }}</div>
                  <div class="text-xs uppercase tracking-[0.18em] text-[var(--color-brand-green-800)]/60">{{ roleLabel(contact.role) }}</div>
                } @else {
                  <div class="text-sm font-semibold text-[var(--color-brand-green-900)]">Aucun contact sélectionné</div>
                }
              </div>
              <button
                type="button"
                (click)="refreshConversation()"
                class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-green-900)]/18 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-green-900)] shadow-[0_10px_24px_rgba(15,23,19,0.06)] transition hover:border-[var(--color-brand-green-900)]/40 hover:bg-[var(--color-brand-cream)]">
                <span class="inline-flex items-center justify-center" style="width:22px;height:22px;font-size:22px;line-height:22px;color: rgb(15,23,19);">
                  <mat-icon style="width:22px;height:22px;display:block;">refresh</mat-icon>
                </span>
                Actualiser
              </button>
            </div>

            <div class="flex-1 overflow-y-auto space-y-4 px-1 py-2" style="max-height:520px;">
              @if (conversation().length > 0) {
                @for (message of conversation(); track message.id) {
                  <div class="flex" [class.justify-end]="message.senderRole === 'admin'" [class.justify-start]="message.senderRole !== 'admin'">
                    <div class="max-w-[85%] rounded-[28px] p-5 shadow-sm"
                      [class.bg-white]="message.senderRole === 'admin'"
                      [class.bg-[var(--color-brand-green-900)]/10]="message.senderRole !== 'admin'">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-green-900)]">{{ message.senderName }}</div>
                          <div class="mt-2 text-sm font-semibold text-[var(--color-brand-green-900)]">{{ message.subject }}</div>
                        </div>
                        <div class="text-[11px] text-[var(--color-brand-green-800)]/60">{{ message.sentAt | date:'dd/MM/yyyy HH:mm' }}</div>
                      </div>
                      <p class="mt-3 text-sm leading-7 text-[var(--color-brand-green-800)]/75">{{ message.content }}</p>
                    </div>
                  </div>
                }
              } @else {
                <div class="rounded-[24px] border border-dashed border-[var(--color-brand-green-800)]/40 bg-white/80 p-8 text-center text-sm text-[var(--color-brand-green-800)]/65">
                  Aucune discussion disponible. Lancez une conversation en sélectionnant un utilisateur.
                </div>
              }
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="send()" class="rounded-[30px] bg-[var(--color-brand-cream)] p-6 shadow-[0_14px_40px_rgba(15,23,19,0.06)]">
            <div class="grid gap-4 md:grid-cols-[1fr_120px]">
              <input formControlName="subject" placeholder="Sujet" class="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none border border-[var(--color-brand-gold-100)]" />
              <button
                type="submit"
                [disabled]="form.invalid || !selectedContactId()"
                class="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-green-900)] px-6 py-3 text-sm font-bold text-white uppercase tracking-[0.16em] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
                <mat-icon class="!h-[18px] !w-[18px] !text-[18px]">send</mat-icon>
                Envoyer
              </button>
            </div>
            <textarea formControlName="content" rows="5" placeholder="Votre message" class="mt-4 w-full rounded-3xl bg-white px-4 py-4 text-sm outline-none border border-[var(--color-brand-gold-100)]"></textarea>
          </form>
        </section>
      </div>
    </app-dashboard-layout>
  `,
})
export class AdminMessagesComponent implements OnInit {
  private readonly staff = inject(StaffPortalService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = [...ADMIN_MENU_ITEMS];
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
    this.staff.getAdminMessages().subscribe({
      next: (data) => this.messages.set(data),
      error: (error) => this.handleHttpError(error),
    });
  }

  refreshConversation(resetSelection = true): void {
    this.staff.getAdminMessageContacts().subscribe({
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
    this.staff.sendAdminMessage({
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
