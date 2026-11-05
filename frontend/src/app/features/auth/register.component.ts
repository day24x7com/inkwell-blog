import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap-narrow auth-wrap">
      <div class="card auth-card">
        <h1>Create your account</h1>
        <p class="sub">Start writing in under a minute.</p>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" [(ngModel)]="email" required />
          </div>
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
              minlength="8"
            />
            <small>At least 8 characters.</small>
          </div>
          <button class="btn btn-accent full" type="submit" [disabled]="busy()">
            {{ busy() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="alt">Already have one? <a routerLink="/login">Sign in</a></p>
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
        width: min(440px, 100%);
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
      small {
        font-size: 0.76rem;
        color: var(--ink-soft);
        opacity: 0.8;
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
    `,
  ],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  email = '';
  username = '';
  password = '';

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth
      .register(this.email.trim(), this.username.trim(), this.password)
      .subscribe({
        next: () => {
          this.auth.login(this.username.trim(), this.password).subscribe({
            next: () => {
              this.auth.loadMe();
              this.router.navigate(['/']);
            },
            error: () => {
              this.error.set('Account created but sign-in failed. Try signing in.');
              this.busy.set(false);
            },
          });
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Could not create the account.');
          this.busy.set(false);
        },
      });
  }
}
