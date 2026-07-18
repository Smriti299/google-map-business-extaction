from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Request, status

from backend.app.auth.security import decode_access_token
from backend.app.config import settings


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    full_name: str | None
    role: str
    session_id: str
    csrf_token: str


async def get_current_user(request: Request) -> AuthenticatedUser:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = str(payload.get("sub") or "")
    session_id = str(payload.get("sid") or "")
    csrf_token = str(payload.get("csrf") or "")
    if not user_id or not session_id or not csrf_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

    auth_store = request.app.state.auth_store
    session = auth_store.get_active_session(session_id, token)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")

    user = auth_store.get_user_by_id(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive.")

    return AuthenticatedUser(
        id=str(user["id"]),
        email=str(user["email"]),
        full_name=user.get("full_name"),
        role=str(user.get("role") or "user"),
        session_id=session_id,
        csrf_token=csrf_token,
    )


async def require_csrf(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    x_csrf_token: str | None = Header(default=None),
) -> AuthenticatedUser:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return current_user

    cookie_csrf = request.cookies.get(settings.csrf_cookie_name)
    if not cookie_csrf or not x_csrf_token or cookie_csrf != current_user.csrf_token or x_csrf_token != current_user.csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token.")
    return current_user
