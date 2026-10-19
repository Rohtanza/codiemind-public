import logging

logger = logging.getLogger(__name__)


def log_event(name: str, *args: str, **extra) -> None:
    logger.info("%s %s", name, " ".join(args), extra=extra)
