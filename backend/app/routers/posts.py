from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import Post, Tag, User
from ..schemas import PostCreate, PostOut, PostPage, PostSummary, PostUpdate
from ..security import slugify

router = APIRouter(prefix="/api/posts", tags=["posts"])


async def _resolve_tags(db: AsyncSession, names: list[str]) -> list[Tag]:
    resolved: list[Tag] = []
    for raw in {n.strip() for n in names if n.strip()}:
        slug = slugify(raw)
        tag = await db.scalar(select(Tag).where(Tag.slug == slug))
        if tag is None:
            tag = Tag(name=raw[:50], slug=slug)
            db.add(tag)
            await db.flush()
        resolved.append(tag)
    return resolved


async def _unique_slug(db: AsyncSession, title: str) -> str:
    base = slugify(title)
    candidate, n = base, 1
    while True:
        exists = await db.scalar(select(Post.id).where(Post.slug == candidate))
        if exists is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


async def _load(db: AsyncSession, post_id: int) -> Post:
    post = await db.scalar(
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.tags), selectinload(Post.comments))
        .where(Post.id == post_id)
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post


async def _get_by_slug(db: AsyncSession, slug: str) -> Post:
    post = await db.scalar(
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.tags), selectinload(Post.comments))
        .where(Post.slug == slug)
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post


@router.get("", response_model=PostPage)
async def list_posts(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    tag: str | None = None,
    q: str | None = None,
    include_drafts: bool = False,
) -> PostPage:
    stmt = select(Post).options(selectinload(Post.author), selectinload(Post.tags))
    count_stmt = select(func.count(Post.id))

    filters = []
    if not include_drafts:
        filters.append(Post.published.is_(True))
    if tag:
        filters.append(Post.tags.any(Tag.slug == slugify(tag)))
    if q:
        filters.append(or_(Post.title.ilike(f"%{q}%"), Post.excerpt.ilike(f"%{q}%")))
    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)

    total = await db.scalar(count_stmt) or 0
    rows = (
        await db.scalars(
            stmt.order_by(Post.created_at.desc()).offset((page - 1) * size).limit(size)
        )
    ).all()
    return PostPage(
        items=[PostSummary.model_validate(r) for r in rows], total=total, page=page, size=size
    )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Post:
    post = Post(
        title=payload.title,
        slug=await _unique_slug(db, payload.title),
        excerpt=payload.excerpt,
        content=payload.content,
        published=payload.published,
        author_id=current.id,
        tags=await _resolve_tags(db, payload.tags),
    )
    db.add(post)
    await db.commit()
    return await _load(db, post.id)


@router.get("/{slug}", response_model=PostOut)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)) -> Post:
    return await _get_by_slug(db, slug)


@router.put("/{post_id}", response_model=PostOut)
async def update_post(
    post_id: int,
    payload: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Post:
    post = await _load(db, post_id)
    if post.author_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your post")

    data = payload.model_dump(exclude_unset=True)
    if "tags" in data:
        post.tags = await _resolve_tags(db, data.pop("tags") or [])
    # The slug is deliberately left untouched: renaming a post must not break
    # existing links or anything already shared.
    for key, value in data.items():
        setattr(post, key, value)

    await db.commit()
    return await _load(db, post.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    post = await _load(db, post_id)
    if post.author_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your post")
    await db.delete(post)
    await db.commit()
