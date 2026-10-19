from typing import Callable


def retry(times: int) -> Callable:
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(times - 1):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    pass
            return func(*args, **kwargs)

        return wrapper

    return decorator
