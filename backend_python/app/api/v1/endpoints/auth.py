"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import jwt

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.exceptions import CustomException

router = APIRouter()
security = HTTPBearer()


# Pydantic models for request/response
class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    organization: Optional[str] = None
    role: str = "organizer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    organization: Optional[str]
    role: str
    avatar_url: Optional[str]
    timezone: str
    language: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    notification_preferences: dict
    ai_preferences: dict
    security_settings: dict
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Dependency to get current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user from database
    result = await db.execute(
        "SELECT * FROM users WHERE id = :user_id", 
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if user is None:
        raise credentials_exception
    
    return User(**dict(user))


# Authentication endpoints
@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register new user"""
    
    # Check if user already exists
    result = await db.execute(
        "SELECT id FROM users WHERE email = :email", 
        {"email": user_data.email}
    )
    if result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists with this email"
        )
    
    # Create new user
    user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        phone=user_data.phone,
        organization=user_data.organization,
        role=user_data.role
    )
    user.password = user_data.password  # This will hash the password
    
    # Save to database
    await db.execute(
        """
        INSERT INTO users (first_name, last_name, email, password_hash, phone, organization, role, created_at, updated_at)
        VALUES (:first_name, :last_name, :email, :password_hash, :phone, :organization, :role, :created_at, :updated_at)
        """,
        {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "password_hash": user.password_hash,
            "phone": user.phone,
            "organization": user.organization,
            "role": user.role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )
    await db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Update last login
    user.update_last_login()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.to_dict())
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
    
    # Get user from database
    result = await db.execute(
        "SELECT * FROM users WHERE email = :email", 
        {"email": login_data.email}
    )
    user_data = result.fetchone()
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user = User(**dict(user_data))
    
    # Verify password
    if not user.verify_password(login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Update last login
    user.update_last_login()
    await db.execute(
        "UPDATE users SET last_login = :last_login WHERE id = :user_id",
        {"last_login": datetime.utcnow(), "user_id": user.id}
    )
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.to_dict())
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(**current_user.to_dict())


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logout successful"}


@router.get("/verify")
async def verify_token(
    current_user: User = Depends(get_current_user)
):
    """Verify token validity"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role
        }
    }
