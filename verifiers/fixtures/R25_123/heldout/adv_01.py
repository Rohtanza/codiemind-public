from datetime import datetime, timezone


def format_timestamp(
    moment: datetime = datetime.now(timezone.utc),
    pattern: str = "%Y-%m-%d",
):
    return moment.strftime(pattern)
