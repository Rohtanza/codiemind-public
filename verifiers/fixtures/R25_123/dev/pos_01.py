from typing import Optional


def parse_port(value: str, default: int = 8080) -> int:
    try:
        return int(value)
    except ValueError:
        return default


def find_user(users: dict[str, int], name: str) -> Optional[int]:
    return users.get(name)
