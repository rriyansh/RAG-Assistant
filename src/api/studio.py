from pathlib import Path
import os, sqlite3

STUDIO_DB = Path("data/studio.sqlite3")

def database() -> sqlite3.Connection:
    STUDIO_DB.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(STUDIO_DB)
    os.chmod(STUDIO_DB, 0o600)
    return connection
