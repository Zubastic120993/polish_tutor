"""Authentication router."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field

from src.core.auth import (
    authenticate_user,
    create_tokens,
    get_current_user,
    get_refresh_token,
    revoke_refresh_token,
    store_refresh_token,
    verify_token,
)
from src.models.user import User
from src.services.database_service import Database
from src.core.metrics import record_auth_login, record_auth_token_issued

router = APIRouter(prefix="/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    """Login request model."""

    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""

    refresh_token: str


class UserResponse(BaseModel):
    """User response model."""

    id: int
    name: str
    profile_template: str

    @classmethod
    def from_user(cls, user: User) -> "UserResponse":
        """Create UserResponse from User model."""
        return cls(id=user.id, name=user.name, profile_template=user.profile_template)


@router.post("/login", response_model=dict)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db_service: Database = Depends()
):
    """Authenticate user and return JWT tokens."""
    user = authenticate_user(db_service, form_data.username, form_data.password)
    if not user:
        record_auth_login(success=False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tokens = create_tokens(user)

    # Store refresh token for this user
    store_refresh_token(user.id, tokens.refresh_token)

    # Record metrics
    record_auth_login(success=True)
    record_auth_token_issued("access")
    record_auth_token_issued("refresh")

    return {
        "status": "success",
        "message": "Login successful",
        "data": {"user": UserResponse.from_user(user), "tokens": tokens.dict()},
    }


@router.post("/refresh", response_model=dict)
async def refresh_token(request: RefreshTokenRequest, db_service: Database = Depends()):
    """Refresh access token using refresh token."""
    try:
        # Verify the refresh token
        token_data = verify_token(request.refresh_token, "refresh")

        # Check if this refresh token is still valid for this user
        stored_token = get_refresh_token(token_data.user_id)
        if not stored_token or stored_token != request.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get the user
        with db_service.get_session() as session:
            user = session.query(User).filter(User.id == token_data.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            session.expunge(user)

        # Create new tokens
        tokens = create_tokens(user)

        # Store new refresh token
        store_refresh_token(user.id, tokens.refresh_token)

        return {
            "status": "success",
            "message": "Token refreshed successfully",
            "data": {"tokens": tokens.dict()},
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout", response_model=dict)
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user by revoking their refresh token."""
    revoke_refresh_token(current_user.id)

    return {"status": "success", "message": "Logged out successfully", "data": None}


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's information."""
    return {
        "status": "success",
        "message": "User information retrieved",
        "data": {"user": UserResponse.from_user(current_user)},
    }
