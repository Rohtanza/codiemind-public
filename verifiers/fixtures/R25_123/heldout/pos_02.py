from collections.abc import Iterable, Iterator
from typing import TypeVar

T = TypeVar("T")


def chunked(
    items: Iterable[T],
    size: int,
    /,
    *,
    drop_last: bool = False,
) -> Iterator[list[T]]:
    batch: list[T] = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch and not drop_last:
        yield batch
