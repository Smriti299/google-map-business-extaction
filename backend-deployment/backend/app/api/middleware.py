import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from logger import get_logger

logger = get_logger("api.middleware")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = (time.time() - start_time) * 1000
        logger.info(
            "%s %s completed in %.2fms with status %s",
            request.method,
            request.url.path,
            duration,
            response.status_code,
        )
        return response
