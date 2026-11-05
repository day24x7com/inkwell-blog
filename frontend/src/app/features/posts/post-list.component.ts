import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { PostService } from '../../core/post.service';
import { PostSummary, Tag } from '../../core/models';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="wrap">
      <section class="hero">
        <p class="kicker">Inkwell Journal</p>
        <h1>Writing worth<br />your time.</h1>
        <p class="lede">
          Essays on engineering, craft and the habits that make work last longer
          than the week it was done in.
        </p>
      </section>

      <div class="toolbar">
        <form class="search" (ngSubmit)="search()">
          <input
            type="text"
            name="q"
            placeholder="Search essays…"
            [(ngModel)]="query"
            aria-label="Search posts"
          />
          <button class="btn btn-ghost" type="submit">Search</button>
        </form>
        <div class="tags">
          @for (tag of tags(); track tag.slug) {
            <button
              type="button"
              class="chip"
              [class.active]="activeTag() === tag.slug"
              (click)="filterTag(tag.slug)"
            >
              {{ tag.name }}
            </button>
          }
        </div>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="loading">Loading essays…</p>
      } @else if (posts().length === 0) {
        <div class="empty">
          <h2>Nothing here yet</h2>
          <p>Try clearing the search or pick another tag.</p>
        </div>
      } @else {
        <ul class="post-list">
          @for (post of posts(); track post.id) {
            <li>
              <article class="post-row">
                <div class="meta">
                  <span>{{ post.created_at | date: 'MMM d, y' }}</span>
                  <span class="dot">·</span>
                  <span>{{ post.author.username }}</span>
                </div>
                <h2><a [routerLink]="['/post', post.slug]">{{ post.title }}</a></h2>
                <p class="excerpt">{{ post.excerpt }}</p>
                <div class="row-foot">
                  <div class="tags">
                    @for (tag of post.tags; track tag.id) {
                      <button type="button" class="tag chip-small" (click)="filterTag(tag.slug)">
                        {{ tag.name }}
                      </button>
                    }
                  </div>
                  <a class="read" [routerLink]="['/post', post.slug]">Read →</a>
                </div>
              </article>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .hero {
        padding: 3rem 0 2.5rem;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 2rem;
      }
      .kicker {
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--accent);
        font-weight: 700;
        margin: 0 0 1rem;
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(2.2rem, 6vw, 3.6rem);
        line-height: 1.08;
        letter-spacing: -0.025em;
        margin: 0 0 1.2rem;
      }
      .lede {
        font-size: 1.1rem;
        color: var(--ink-soft);
        max-width: 54ch;
        margin: 0;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
      }
      .search {
        display: flex;
        gap: 0.5rem;
        flex: 1 1 280px;
        max-width: 380px;
      }
      .tags {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
      }
      .chip {
        border: 1px solid var(--rule);
        background: transparent;
        color: var(--ink-soft);
        padding: 0.3rem 0.8rem;
        border-radius: 999px;
        font-size: 0.8rem;
        cursor: pointer;
        font-family: inherit;
      }
      .chip:hover {
        border-color: var(--ink);
        color: var(--ink);
      }
      .chip.active {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--paper);
      }
      .chip-small {
        border: none;
        cursor: pointer;
        font-family: inherit;
      }
      .loading {
        color: var(--ink-soft);
        padding: 2rem 0;
      }
      .post-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .post-row {
        padding: 1.9rem 0;
        border-bottom: 1px solid var(--rule);
      }
      .post-row:hover h2 a {
        color: var(--accent);
      }
      .meta {
        font-size: 0.8rem;
        color: var(--ink-soft);
        display: flex;
        gap: 0.45rem;
        margin-bottom: 0.5rem;
      }
      .dot {
        opacity: 0.5;
      }
      .post-row h2 {
        font-family: var(--font-display);
        font-size: 1.7rem;
        line-height: 1.25;
        letter-spacing: -0.015em;
        margin: 0 0 0.6rem;
      }
      .post-row h2 a {
        transition: color 0.15s ease;
      }
      .excerpt {
        color: var(--ink-soft);
        margin: 0 0 1rem;
        max-width: 62ch;
      }
      .row-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .read {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--accent);
        white-space: nowrap;
      }
    `,
  ],
})
export class PostListComponent implements OnInit {
  private posts$ = inject(PostService);
  private router = inject(Router);

  readonly posts = signal<PostSummary[]>([]);
  readonly tags = signal<Tag[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTag = signal<string | null>(null);
  query = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.posts$.list({ size: 30, tag: this.activeTag() ?? undefined, q: this.query || undefined }).subscribe({
      next: (page) => {
        this.posts.set(page.items);
        this.collectTags(page.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not reach the API. Is the backend running?');
        this.loading.set(false);
      },
    });
  }

  private collectTags(items: PostSummary[]): void {
    const seen = new Map<string, Tag>();
    for (const post of items) {
      for (const tag of post.tags) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag);
      }
    }
    this.tags.set([...seen.values()]);
  }

  search(): void {
    this.load();
  }

  filterTag(slug: string): void {
    this.activeTag.set(this.activeTag() === slug ? null : slug);
    this.query = '';
    this.load();
  }
}
