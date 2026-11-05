from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import Comment, Post, User
from ..schemas import CommentCreate, CommentOut
from ..security import slugify

router = APIRouter(prefix="/api/posts", tags=["comments"])


@router.get("/{slug}/comments", response_model=list[CommentOut])
async def list_comments(slug: str, db: AsyncSession = Depends(get_db)) -> list[Comment]:
    post = await db.scalar(select(Post).where(Post.slug == slug))
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    rows = await db.scalars(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.post_id == post.id)
        .order_by(Comment.created_at)
    )
    return list(rows.all())


@router.post(
    "/{slug}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED
)
async def add_comment(
    slug: str,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Comment:
    post = await db.scalar(select(Post).where(Post.slug == slug))
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")

    comment = Comment(body=payload.body, post_id=post.id, author_id=current.id)
    db.add(comment)
    await db.commit()
    await db.refresh(comment, ["author"])
    return comment


@router.delete("/{slug}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    slug: str,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    comment = await db.scalar(
        select(Comment)
        .join(Post, Comment.post_id == Post.id)
        .where(Comment.id == comment_id, Post.slug == slugify(slug))
    )
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if comment.author_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your comment")
    await db.delete(comment)
    await db.commit()
