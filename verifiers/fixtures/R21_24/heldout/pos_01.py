import asyncio


async def run_all(*coros, **options):
    """Run coroutines concurrently and gather their results.

    Args:
        *coros: Coroutine objects to run.
        **options: Keyword options forwarded to ``asyncio.gather``.

    Returns:
        list: The results in the order the coroutines were given.
    """
    return await asyncio.gather(*coros, **options)
