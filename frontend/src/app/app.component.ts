import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" routerLink="/"><span class="brand-mark">Ink</span>well</a>
        <nav class="nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Latest</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/editor/new" routerLinkActive="active">Write</a>
          }
        </nav>
        <div class="actions">
          @if (auth.isLoggedIn()) {
            <span class="who">{{ auth.user()?.username }}</span>
            <a class="btn btn-ghost" routerLink="/editor/new">New post</a>
            <button class="btn btn-quiet" type="button" (click)="auth.logout()">Sign out</button>
          } @else {
            <a class="btn btn-ghost" routerLink="/login">Sign in</a>
            <a class="btn" routerLink="/register">Get started</a>
          }
        </div>
      </div>
    </header>

    <main class="site-main">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <div class="wrap footer-inner">
        <p>Inkwell — a small place for long thoughts.</p>
        <p class="muted">Angular · FastAPI · PostgreSQL</p>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .site-header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: rgba(253, 252, 249, 0.88);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--rule);
      }
      .header-inner {
        display: flex;
        align-items: center;
        gap: 2rem;
        height: 68px;
      }
      .brand {
        font-family: var(--font-display);
        font-size: 1.55rem;
        letter-spacing: -0.02em;
        color: var(--ink);
      }
      .brand-mark {
        color: var(--accent);
      }
      .nav {
        display: flex;
        gap: 1.5rem;
        margin-right: auto;
      }
      .nav a {
        font-size: 0.92rem;
        color: var(--ink-soft);
        padding-bottom: 4px;
        border-bottom: 2px solid transparent;
      }
      .nav a.active,
      .nav a:hover {
        color: var(--ink);
        border-bottom-color: var(--accent);
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 0.7rem;
      }
      .who {
        font-size: 0.85rem;
        color: var(--ink-soft);
      }
      .site-main {
        flex: 1;
        padding: 2.5rem 0 5rem;
      }
      .site-footer {
        border-top: 1px solid var(--rule);
        padding: 1.75rem 0;
        background: var(--paper-2);
      }
      .footer-inner {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.85rem;
        color: var(--ink-soft);
      }
      .muted {
        opacity: 0.7;
      }
      @media (max-width: 640px) {
        .header-inner {
          gap: 1rem;
        }
        .nav,
        .who {
          display: none;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.loadMe();
  }
}
