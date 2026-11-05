export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Comment {
  id: number;
  body: string;
  created_at: string;
  author: User;
}

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  author: User;
  tags: Tag[];
}

export interface Post extends PostSummary {
  content: string;
  updated_at: string;
}

export interface PostPage {
  items: PostSummary[];
  total: number;
  page: number;
  size: number;
}

export interface PostPayload {
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
  tags: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
}
