import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap-narrow auth-wrap">
      <div class="card auth-card">
        <h1>Welcome back</h1>
        <p class="sub">Sign in to write and join the conversation.</p>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="username">Username</label>
            <input id="username" name="username" type="text" [(ngModel)]="username" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
            />
          </div>
          <button class="btn btn-accent full" type="submit" [disabled]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="alt">
          No account? <a routerLink="/register">Create one</a>
        </p>
        <p class="demo">Demo user: <code>ada</code> / <code>password123</code></p>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-wrap {
        display: flex;
        justify-content: center;
        padding-top: 2rem;
      }
      .auth-card {
        width: min(420px, 100%);
        padding: 2.2rem;
      }
      h1 {
        font-family: var(--font-display);
        font-size: 1.9rem;
        margin: 0 0 0.4rem;
        letter-spacing: -0.02em;
      }
      .sub {
        color: var(--ink-soft);
        font-size: 0.92rem;
        margin: 0 0 1.6rem;
      }
      .full {
        width: 100%;
        margin-top: 0.4rem;
      }
      .alt {
        text-align: center;
        font-size: 0.88rem;
        color: var(--ink-soft);
        margin: 1.2rem 0 0;
      }
      .alt a {
        color: var(--accent);
        font-weight: 600;
      }
      .demo {
        text-align: center;
        font-size: 0.78rem;
        color: var(--ink-soft);
        opacity: 0.8;
        margin: 0.6rem 0 0;
      }
      code {
        font-family: var(--font-mono);
        background: var(--paper-2);
        padding: 0.1em 0.35em;
        border-radius: 4px;
      }
    `,
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  username = '';
  password = '';

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.auth.loadMe();
        this.router.navigate(['/']);
      },
      error: () => {
        this.error.set('Incorrect username or password.');
        this.busy.set(false);
      },
    });
  }
}
