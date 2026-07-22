import os
import secrets
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from backend.app.auth.dependencies import AuthenticatedUser, get_current_user, require_csrf
from backend.app.auth.schemas import LoginRequest, LoginResponse, LogoutResponse, UserResponse
from backend.app.auth.security import create_access_token, create_csrf_token, verify_password
from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

_login_attempts: dict[str, deque[float]] = defaultdict(deque)
_LOGIN_WINDOW_SECONDS = 300
_MAX_LOGIN_ATTEMPTS = 8


def _public_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["id"]),
        email=str(user["email"]),
        full_name=user.get("full_name"),
        role=str(user.get("role") or "user"),
    )


def _assert_login_rate_limit(identifier: str) -> None:
    now = time.monotonic()
    attempts = _login_attempts[identifier]
    while attempts and now - attempts[0] > _LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _MAX_LOGIN_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts. Try again later.")
    attempts.append(now)


def _is_secure_cookie_context(request: Request | None = None) -> bool:
    env_name = (settings.env or "").lower()
    if env_name in {"production", "prod", "staging"}:
        return True
    if os.getenv("RENDER") in {"true", "1"} or os.getenv("VERCEL") == "1" or os.getenv("NETLIFY") == "true":
        return True
    if os.getenv("NODE_ENV", "").lower() in {"production", "prod"}:
        return True
    if request is not None:
        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        if forwarded_proto.lower().startswith("https"):
            return True
        return request.url.scheme == "https"
    return False


def _set_auth_cookies(response: Response, token: str, csrf_token: str, remember_me: bool, request: Request | None = None) -> None:
    secure_cookie = _is_secure_cookie_context(request)
    same_site = "none" if secure_cookie else "lax"
    max_age = settings.jwt_expire_minutes * 60 if remember_me else None
    response.set_cookie(
        settings.auth_cookie_name,
        token,
        max_age=max_age,
        httponly=True,
        secure=secure_cookie,
        samesite=same_site,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        httponly=False,
        secure=secure_cookie,
        samesite=same_site,
    )


def _clear_auth_cookies(response: Response, request: Request | None = None) -> None:
    secure_cookie = _is_secure_cookie_context(request)
    same_site = "none" if secure_cookie else "lax"
    response.delete_cookie(settings.auth_cookie_name, secure=secure_cookie, samesite=same_site)
    response.delete_cookie(settings.csrf_cookie_name, secure=secure_cookie, samesite=same_site)


@router.post("/login", response_model=LoginResponse)
async def login(request: Request, response: Response, payload: LoginRequest):
    identifier = f"{request.client.host if request.client else 'unknown'}:{payload.email.lower()}"
    _assert_login_rate_limit(identifier)

    auth_store = request.app.state.auth_store
    auth_store.cleanup_expired_sessions()
    user = auth_store.get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, str(user.get("password_hash") or "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

    if auth_store.count_active_sessions() >= settings.max_active_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Maximum active users reached. Please try again later.",
        )

    csrf_token = create_csrf_token()
    placeholder = f"pending-{secrets.token_urlsafe(16)}"
    session_id = auth_store.create_session(str(user["id"]), placeholder, create_access_token(str(user["id"]), "pending", csrf_token)[1])
    token, _ = create_access_token(str(user["id"]), session_id, csrf_token)
    auth_store.update_session_token(session_id, token)
    _set_auth_cookies(response, token, csrf_token, payload.remember_me, request)
    return LoginResponse(user=_public_user(user))


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response, request: Request, current_user: AuthenticatedUser = Depends(require_csrf)):
    request.app.state.auth_store.deactivate_session(current_user.session_id)
    _clear_auth_cookies(response, request)
    return LogoutResponse()


@router.get("/me", response_model=UserResponse)
async def me(current_user: AuthenticatedUser = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
    )
