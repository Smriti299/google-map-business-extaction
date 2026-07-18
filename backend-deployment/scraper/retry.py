import asyncio
from functools import wraps
from typing import Callable, Coroutine, Type, Any


class RetryError(Exception):
    pass


def retry_async(
    attempts: int = 3,
    delay_seconds: float = 2.0,
    exceptions: tuple[Type[BaseException], ...] = (Exception,),
):
    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error: BaseException | None = None
            for attempt in range(1, attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as exc:
                    last_error = exc
                    if attempt == attempts:
                        raise RetryError(f"{func.__name__} failed after {attempts} attempts: {exc}") from exc
                    await asyncio.sleep(delay_seconds)
            raise RetryError(f"{func.__name__} could not complete") from last_error

        return wrapper

    return decorator
