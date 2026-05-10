import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  
  constructor() {
    this.checkToken();
    this.bindStorageSync();
  }

  private checkToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userJSON = localStorage.getItem('user');
      if (token && userJSON) {
        this.currentUser.set(this.parseStoredUser(userJSON));
      }
    }
  }

  private bindStorageSync() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event) => {
      if (event.key !== 'token' && event.key !== 'user') {
        return;
      }

      const token = localStorage.getItem('token');
      const userJSON = localStorage.getItem('user');
      this.currentUser.set(token && userJSON ? this.parseStoredUser(userJSON) : null);
    });
  }

  private parseStoredUser(userJSON: string): User | null {
    try {
      return JSON.parse(userJSON) as User;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  getDashboardRoute(user: User | null = this.currentUser()): string {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'instructor') return '/instructor';
    return '/student';
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('token');
  }

  login(email: string, password: string) {
    return this.http.post<{token: string, user: User}>('/api/login', { email, password }).pipe(
      tap(response => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUser.set(response.user);
        }
      })
    );
  }

  register(payload: { name: string; email: string; password: string; phone?: string; city?: string; country?: string; objective?: string }) {
    return this.http.post<{token: string, user: User}>('/api/register', payload).pipe(
      tap(response => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUser.set(response.user);
        }
      })
    );
  }

  updateCurrentUser(patch: Partial<User>) {
    const current = this.currentUser();
    if (!current || typeof window === 'undefined') {
      return;
    }
    const nextUser = { ...current, ...patch };
    localStorage.setItem('user', JSON.stringify(nextUser));
    this.currentUser.set(nextUser);
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUser.set(null);
      this.router.navigate(['/']);
    }
  }
}
