import json

CONFIG_PATH = "config.json"
DEFAULTS: dict[str, int] = {"retries": 3, "timeout": 30}

with open(CONFIG_PATH) as fh:
    settings = {**DEFAULTS, **json.load(fh)}

print(settings["retries"])
