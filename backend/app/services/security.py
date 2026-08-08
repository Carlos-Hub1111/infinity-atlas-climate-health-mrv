"""Password hashing, JWT sessions, and role dependencies."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Callable
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.models import AuthSession, User

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class IssuedToken:
    access_token: str
    expires_at: datetime
    jti: str


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("!"):
        return False
    try:
        return password_hash.verify(password, stored_hash)
    except Exception:
        return False


def find_user_by_identifier(db: Session, identifier: str) -> User | None:
    normalized = identifier.strip().lower()
    return db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(
            or_(
                User.username == normalized,
                User.email == normalized,
            )
        )
    )


def issue_access_token(user: User) -> IssuedToken:
    if not settings.jwt_is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication signing key is not configured.",
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    jti = str(uuid4())
    payload = {
        "sub": str(user.id),
        "role": user.role.name,
        "jti": jti,
        "iat": now,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return IssuedToken(access_token=token, expires_at=expires_at, jti=jti)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def decode_access_token(token: str) -> dict:
    if not settings.jwt_is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication signing key is not configured.",
        )
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "jti", "exp", "iat", "iss"]},
        )
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> tuple[User, AuthSession]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc

    session = db.scalar(
        select(AuthSession).where(
            AuthSession.jti == payload["jti"],
            AuthSession.user_id == user_id,
        )
    )
    now = datetime.now(timezone.utc)
    if session is None or session.revoked_at is not None or _as_utc(session.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer active.",
        )

    user = db.scalar(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or unavailable.",
        )
    return user, session


def get_current_user(
    current: Annotated[tuple[User, AuthSession], Depends(get_current_session)],
) -> User:
    return current[0]


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentSession = Annotated[tuple[User, AuthSession], Depends(get_current_session)]


def require_roles(*allowed_roles: str) -> Callable:
    def dependency(current_user: CurrentUser) -> User:
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency
