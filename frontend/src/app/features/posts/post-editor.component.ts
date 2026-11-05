import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { PostService } from '../../core/post.service';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap-narrow">
      <header class="editor-head">
        <h1>{{ isEdit() ? 'Edit post' : 'New post' }}</h1>
        <p class="hint">Markdown supported — headings, lists, code fences and tables.</p>
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form (ngSubmit)="save()">
        <div class="field">
          <label for="title">Title</label>
          <input id="title" name="title" type="text" [(ngModel)]="title" required />
        </div>

        <div class="field">
          <label for="excerpt">Excerpt</label>
          <input
            id="excerpt"
            name="excerpt"
            type="text"
            maxlength="400"
            placeholder="One sentence that earns the click"
            [(ngModel)]="excerpt"
          />
        </div>

        <div class="field">
          <label for="tags">Tags</label>
          <input
            id="tags"
            name="tags"
            type="text"
            placeholder="Engineering, API"
            [(ngModel)]="tags"
          />
        </div>

        <div class="field">
          <label for="content">Body</label>
          <textarea id="content" name="content" rows="18" [(ngModel)]="content"></textarea>
        </div>

        <div class="editor-actions">
          <label class="publish">
            <input type="checkbox" name="published" [(ngModel)]="published" />
            <span>Published</span>
          </label>
          <div class="buttons">
            <button type="button" class="btn btn-quiet" (click)="cancel()">Cancel</button>
            <button class="btn btn-accent" type="submit" [disabled]="saving() || !title.trim()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Publish post' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .editor-head {
        margin-bottom: 2rem;
        padding-bottom: 1.2rem;
        border-bottom: 1px solid var(--rule);
      }
      h1 {
        font-family: var(--font-display);
        font-size: 2rem;
        letter-spacing: -0.02em;
        margin: 0 0 0.4rem;
      }
      .hint {
        color: var(--ink-soft);
        font-size: 0.88rem;
        margin: 0;
      }
      textarea {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        line-height: 1.6;
        resize: vertical;
      }
      .editor-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        padding-top: 0.5rem;
      }
      .publish {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: var(--ink-soft);
        cursor: pointer;
      }
      .buttons {
        display: flex;
        gap: 0.6rem;
      }
    `,
  ],
})
export class PostEditorComponent implements OnInit {
  /** Present when routed via /editor/:id; absent for /editor/new. */
  readonly id = input<string | undefined>(undefined);

  private postsApi = inject(PostService);
  private router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  title = '';
  excerpt = '';
  tags = '';
  content = '';
  published = true;

  isEdit(): boolean {
    return this.id() !== undefined;
  }

  ngOnInit(): void {
    const postId = this.id();
    if (postId === undefined) return;

    this.postsApi.list({ size: 50 }).subscribe({
      next: (page) => {
        const found = page.items.find((p) => p.id === Number(postId));
        if (!found) {
          this.error.set('That post does not exist or is a draft.');
          return;
        }
        this.postsApi.get(found.slug).subscribe({
          next: (post) => {
            this.title = post.title;
            this.excerpt = post.excerpt;
            this.content = post.content;
            this.published = post.published;
            this.tags = post.tags.map((t) => t.name).join(', ');
          },
          error: () => this.error.set('Could not load that post.'),
        });
      },
      error: () => this.error.set('Could not load posts.'),
    });
  }

  save(): void {
    if (!this.title.trim()) return;
    this.saving.set(true);
    this.error.set(null);

    const payload = {
      title: this.title.trim(),
      excerpt: this.excerpt.trim(),
      content: this.content,
      published: this.published,
      tags: this.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const postId = this.id();
    const request$ =
      postId !== undefined
        ? this.postsApi.update(Number(postId), payload)
        : this.postsApi.create(payload);

    request$.subscribe({
      next: (post) => this.router.navigate(['/post', post.slug]),
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Could not save the post.');
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    history.back();
  }
}
