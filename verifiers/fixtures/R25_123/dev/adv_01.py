def register(name: str, handler: object) -> None:
    """Register a handler under a name.

    Example of a legacy handler this replaces:

    def old_handler(event, ctx):
        pass
    """
    HANDLERS[name] = handler


HANDLERS: dict[str, object] = {}
