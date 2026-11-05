import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE } from './api.config';
import { Comment, Post, PostPage, PostPayload } from './models';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);

  list(options: {
    page?: number;
    size?: number;
    tag?: string;
    q?: string;
  } = {}): Observable<PostPage> {
    let params = new HttpParams();
    if (options.page) params = params.set('page', options.page);
    if (options.size) params = params.set('size', options.size);
    if (options.tag) params = params.set('tag', options.tag);
    if (options.q) params = params.set('q', options.q);
    return this.http.get<PostPage>(`${API_BASE}/posts`, { params });
  }

  get(slug: string): Observable<Post> {
    return this.http.get<Post>(`${API_BASE}/posts/${slug}`);
  }

  create(payload: PostPayload): Observable<Post> {
    return this.http.post<Post>(`${API_BASE}/posts`, payload);
  }

  update(id: number, payload: Partial<PostPayload>): Observable<Post> {
    return this.http.put<Post>(`${API_BASE}/posts/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/posts/${id}`);
  }

  comments(slug: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API_BASE}/posts/${slug}/comments`);
  }

  addComment(slug: string, body: string): Observable<Comment> {
    return this.http.post<Comment>(`${API_BASE}/posts/${slug}/comments`, { body });
  }
}
