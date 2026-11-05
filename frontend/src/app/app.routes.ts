import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/posts/post-list.component').then((m) => m.PostListComponent),
    title: 'Inkwell — Writing worth your time',
  },
  {
    path: 'post/:slug',
    loadComponent: () =>
      import('./features/posts/post-detail.component').then((m) => m.PostDetailComponent),
  },
  {
    path: 'editor/new',
    loadComponent: () =>
      import('./features/posts/post-editor.component').then((m) => m.PostEditorComponent),
    canActivate: [authGuard],
    title: 'New post — Inkwell',
  },
  {
    path: 'editor/:id',
    loadComponent: () =>
      import('./features/posts/post-editor.component').then((m) => m.PostEditorComponent),
    canActivate: [authGuard],
    title: 'Edit post — Inkwell',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Sign in — Inkwell',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
    title: 'Create account — Inkwell',
  },
  { path: '**', redirectTo: '' },
];
