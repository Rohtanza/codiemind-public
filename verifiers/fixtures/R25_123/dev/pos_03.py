import asyncio
from typing import Any


async def gather_all(*tasks: asyncio.Task, timeout: float = 5.0, **options: Any) -> list[Any]:
    done = await asyncio.wait_for(asyncio.gather(*tasks), timeout=timeout)
    return list(done)
