import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { PostService } from '../../core/post.service';
import { AuthService } from '../../core/auth.service';
import { Comment, Post } from '../../core/models';
import { renderMarkdown } from '../../shared/markdown';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <article class="wrap-narrow">
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="loading">Loading…</p>
      }
      @if (post(); as p) {
        <header class="post-header">
          <div class="tags">
            @for (tag of p.tags; track tag.id) {
              <span class="tag">{{ tag.name }}</span>
            }
          </div>
          <h1>{{ p.title }}</h1>
          <p class="byline">
            By {{ p.author.username }} · {{ p.created_at | date: 'MMMM d, y' }}
            @if (p.updated_at !== p.created_at) {
              <span class="updated"> · updated {{ p.updated_at | date: 'MMM d' }}</span>
            }
          </p>
          @if (isAuthor()) {
            <a class="btn btn-ghost" [routerLink]="['/editor', p.id]">Edit post</a>
          }
        </header>

        <div class="prose" [innerHTML]="body()"></div>

        <section class="comments">
          <h2>{{ comments().length }} response{{ comments().length === 1 ? '' : 's' }}</h2>

          @if (auth.isLoggedIn()) {
            <form class="comment-form" (ngSubmit)="submitComment()">
              <textarea
                name="body"
                rows="3"
                placeholder="Share a thought…"
                [(ngModel)]="draft"
                required
              ></textarea>
              @if (commentError()) {
                <p class="error">{{ commentError() }}</p>
              }
              <button class="btn btn-accent" type="submit" [disabled]="!draft.trim() || posting()">
                {{ posting() ? 'Posting…' : 'Post response' }}
              </button>
            </form>
          } @else {
            <p class="signin-prompt">
              <a [routerLink]="['/login']">Sign in</a> to join the conversation.
            </p>
          }

          <ul class="comment-list">
            @for (c of comments(); track c.id) {
              <li class="comment">
                <div class="comment-head">
                  <strong>{{ c.author.username }}</strong>
                  <span>{{ c.created_at | date: 'MMM d, y · h:mm a' }}</span>
                </div>
                <p>{{ c.body }}</p>
              </li>
            }
          </ul>
        </section>
      }
    </article>
  `,
  styles: [
    `
      .loading {
        color: var(--ink-soft);
      }
      .post-header {
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 2.5rem;
      }
      .tags {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 1.1rem;
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(1.9rem, 5vw, 2.8rem);
        line-height: 1.15;
        letter-spacing: -0.025em;
        margin: 0 0 1rem;
      }
      .byline {
        color: var(--ink-soft);
        font-size: 0.9rem;
        margin: 0 0 1.2rem;
      }
      .updated {
        opacity: 0.7;
      }
      .comments {
        margin-top: 3.5rem;
        padding-top: 2rem;
        border-top: 1px solid var(--rule);
      }
      .comments h2 {
        font-family: var(--font-display);
        font-size: 1.35rem;
        margin: 0 0 1.2rem;
      }
      .comment-form {
        margin-bottom: 2rem;
      }
      .comment-form textarea {
        margin-bottom: 0.7rem;
        resize: vertical;
      }
      .signin-prompt {
        color: var(--ink-soft);
        font-size: 0.92rem;
        margin-bottom: 2rem;
      }
      .signin-prompt a {
        color: var(--accent);
        font-weight: 600;
      }
      .comment-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .comment {
        background: var(--paper-2);
        border-radius: 12px;
        padding: 1rem 1.15rem;
      }
      .comment-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.82rem;
        color: var(--ink-soft);
        margin-bottom: 0.4rem;
      }
      .comment-head strong {
        color: var(--ink);
      }
      .comment p {
        margin: 0;
        font-size: 0.97rem;
      }
    `,
  ],
})
export class PostDetailComponent implements OnInit {
  readonly slug = input.required<string>();

  private postsApi = inject(PostService);
  readonly auth = inject(AuthService);

  readonly post = signal<Post | null>(null);
  readonly comments = signal<Comment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly posting = signal(false);
  readonly commentError = signal<string | null>(null);
  readonly body = signal('');

  draft = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.postsApi.get(this.slug()).subscribe({
      next: (post) => {
        this.post.set(post);
        this.body.set(renderMarkdown(post.content));
        this.loading.set(false);
        this.loadComments();
      },
      error: () => {
        this.error.set('That post could not be found.');
        this.loading.set(false);
      },
    });
  }

  private loadComments(): void {
    this.postsApi.comments(this.slug()).subscribe({
      next: (comments) => this.comments.set(comments),
      error: () => this.comments.set([]),
    });
  }

  isAuthor(): boolean {
    const current = this.post();
    const user = this.auth.user();
    return !!current && !!user && current.author.id === user.id;
  }

  submitComment(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.posting.set(true);
    this.commentError.set(null);
    this.postsApi.addComment(this.slug(), text).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.draft = '';
        this.posting.set(false);
      },
      error: () => {
        this.commentError.set('Could not post your response. Try again.');
        this.posting.set(false);
      },
    });
  }
}
