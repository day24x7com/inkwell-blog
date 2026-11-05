from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import User
from .security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    username = decode_token(token)
    if username is None:
        raise CREDENTIALS_ERROR
    user = await db.scalar(select(User).where(User.username == username))
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    return user


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
) -> User | None:
    if not token:
        return None
    username = decode_token(token)
    if username is None:
        return None
    return await db.scalar(select(User).where(User.username == username))
