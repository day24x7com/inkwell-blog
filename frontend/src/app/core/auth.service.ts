import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_BASE } from './api.config';
import { Token, User } from './models';

const TOKEN_KEY = 'inkwell.token';
const USER_KEY = 'inkwell.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSig = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userSig = signal<User | null>(this.readStoredUser());

  readonly token = this.tokenSig.asReadonly();
  readonly user = this.userSig.asReadonly();
  readonly isLoggedIn = computed(() => this.tokenSig() !== null);

  constructor(private http: HttpClient, private router: Router) {}

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  register(email: string, username: string, password: string): Observable<User> {
    return this.http.post<User>(`${API_BASE}/auth/register`, { email, username, password });
  }

  login(username: string, password: string): Observable<Token> {
    const body = new URLSearchParams({ username, password });
    return this.http
      .post<Token>(`${API_BASE}/auth/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSig.set(token);
  }

  loadMe(): void {
    if (!this.isLoggedIn()) return;
    this.http.get<User>(`${API_BASE}/auth/me`).subscribe({
      next: (user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSig.set(user);
      },
      error: () => this.logout(),
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSig.set(null);
    this.userSig.set(null);
    void this.router.navigate(['/']);
  }
}
