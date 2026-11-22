"""Offline migration. Pause studio writers and snapshot SQLite before running."""
import argparse
import json
import sqlite3
from pathlib import Path

from psycopg.types.json import Jsonb
from src.api.studio_pg import bind, connect, tenant_for


def migrate(source):
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as old, connect() as db:
        old.row_factory = sqlite3.Row
        total = 0
        for row in old.execute("SELECT id, owner, config, key_hash FROM assistants"):
            tenant = tenant_for(row["owner"])
            bind(db, tenant)
            config = json.loads(row["config"])
            inserted = db.execute("""INSERT INTO assistants(tenant_id,id,name,config,workspace_owner)
                VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                (tenant,row["id"],config["name"],Jsonb(config),row["owner"]))
            if not inserted.rowcount:
                saved = db.execute("SELECT config FROM assistants WHERE id=%s", (row["id"],)).fetchone()
                if saved["config"] != config:
                    raise ValueError("Target assistant differs; migration rolled back")
                continue
            if row["key_hash"]:
                db.execute("INSERT INTO studio_chat_routes VALUES (%s,%s,%s)",
                           (tenant,row["id"],bytes.fromhex(row["key_hash"])))
            total += 1
    print(f"Imported {total} assistants")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    migrate(parser.parse_args().source)
