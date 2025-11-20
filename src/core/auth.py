"""JWT Authentication utilities."""

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from src.core.app_context import app_context
from src.models.user import User
from src.services.database_service import Database

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings from config
config = app_context.config
JWT_SECRET_KEY = config.get("jwt_secret_key", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = config.get("access_token_expire_minutes", 30)
REFRESH_TOKEN_EXPIRE_DAYS = config.get("refresh_token_expire_days", 7)

# Security scheme
security = HTTPBearer()


class TokenData(BaseModel):
    """JWT token payload data."""

    user_id: int
    username: str


class TokenResponse(BaseModel):
    """Response model for token endpoints."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_tokens(user: User) -> TokenResponse:
    """Create both access and refresh tokens for a user."""
    token_data = {"user_id": user.id, "username": user.name}

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("user_id")
        username: str = payload.get("username")
        token_type_check: str = payload.get("type")

        if user_id is None or username is None:
            raise JWTError("Missing user data in token")

        if token_type_check != token_type:
            raise JWTError(
                f"Invalid token type: expected {token_type}, got {token_type_check}"
            )

        return TokenData(user_id=user_id, username=username)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db_service: Database = Depends(),
) -> User:
    """FastAPI dependency to get current authenticated user."""
    token_data = verify_token(credentials.credentials, "access")

    with db_service.get_session() as session:
        user = session.query(User).filter(User.id == token_data.user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Expunge from session so it can be used outside
        session.expunge(user)
        return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db_service: Database = Depends(),
) -> Optional[User]:
    """FastAPI dependency to get current user if authenticated (optional)."""
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db_service)
    except HTTPException:
        return None


def authenticate_user(
    db_service: Database, username: str, password: str
) -> Optional[User]:
    """Authenticate a user with username and password."""
    with db_service.get_session() as session:
        user = session.query(User).filter(User.name == username).first()
        if not user or not user.password_hash:
            return None

        if not verify_password(password, user.password_hash):
            return None

        session.expunge(user)
        return user


# Simple in-memory session store for refresh tokens
# In production, this should be Redis or database-backed
_refresh_token_store = {}


def store_refresh_token(user_id: int, refresh_token: str):
    """Store a refresh token for a user (in-memory for now)."""
    _refresh_token_store[user_id] = refresh_token


def get_refresh_token(user_id: int) -> Optional[str]:
    """Get stored refresh token for a user."""
    return _refresh_token_store.get(user_id)


def revoke_refresh_token(user_id: int):
    """Revoke refresh token for a user."""
    _refresh_token_store.pop(user_id, None)
