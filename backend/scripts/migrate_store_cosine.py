"""Migrate a pre-fix CodieMind store to the P1-fixed scorer.

Two changes, both required before the fixed backend will open an old store:

1. Chroma: collections built before the fix use the default `l2` metric, and
   Chroma fixes a collection's metric at creation, so it cannot be changed in
   place. Each `l2` collection is copied into a new cosine collection, verified,
   and swapped in under the original name. The stored vectors are copied, not
   regenerated. The metric is an index property, so the same vectors under a
   cosine index give cosine distances, and copying needs no embedding API call.
2. SQLite: `preferences.last_accessed_at` is added and backfilled from
   `created_at`, the only timestamp that exists for old rows.

Dry run by default. `--apply` first copies the whole data directory to a sibling
`<name>.pre-cosine-backup[-N]` and refuses to continue if the copy fails.

    python -m scripts.migrate_store_cosine --data-dir PATH            # report only
    python -m scripts.migrate_store_cosine --data-dir PATH --apply    # migrate
"""
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
from pathlib import Path

import chromadb

COLLECTIONS = ("preferences", "decisions")
SPACE = "cosine"
_BATCH = 500


def _space(collection) -> str:
    return (collection.configuration or {}).get("hnsw", {}).get("space", "l2")


def _backup(data_dir: Path) -> Path:
    target = data_dir.parent / f"{data_dir.name}.pre-cosine-backup"
    n = 2
    while target.exists():
        target = data_dir.parent / f"{data_dir.name}.pre-cosine-backup-{n}"
        n += 1
    shutil.copytree(data_dir, target)
    return target


def _plan(data_dir: Path) -> dict:
    plan: dict = {"data_dir": str(data_dir), "collections": {}, "sqlite": None}
    chroma_dir = data_dir / "chroma"
    if chroma_dir.is_dir():
        client = chromadb.PersistentClient(path=str(chroma_dir))
        existing = {c.name for c in client.list_collections()}
        for name in COLLECTIONS:
            if name in existing:
                col = client.get_collection(name)
                plan["collections"][name] = {"space": _space(col), "count": col.count()}
    db_path = data_dir / "memory.db"
    if db_path.is_file():
        con = sqlite3.connect(db_path)
        cols = {r[1] for r in con.execute("PRAGMA table_info(preferences)")}
        con.close()
        if cols:
            plan["sqlite"] = {"has_last_accessed_at": "last_accessed_at" in cols}
    return plan


def _migrate_collection(client, name: str) -> dict:
    old = client.get_collection(name)
    data = old.get(include=["embeddings", "documents", "metadatas"])
    ids = list(data["ids"])
    tmp_name = f"{name}-cosine-migration"
    if tmp_name in {c.name for c in client.list_collections()}:
        client.delete_collection(tmp_name)
    new = client.create_collection(tmp_name, configuration={"hnsw": {"space": SPACE}})
    for start in range(0, len(ids), _BATCH):
        sl = slice(start, start + _BATCH)
        new.add(
            ids=ids[sl],
            embeddings=[list(map(float, e)) for e in data["embeddings"][sl]],
            documents=data["documents"][sl],
            metadatas=data["metadatas"][sl],
        )
    copied = new.get(ids=ids, include=[])["ids"] if ids else []
    if sorted(copied) != sorted(ids) or new.count() != old.count():
        client.delete_collection(tmp_name)
        raise RuntimeError(f"copy of '{name}' did not verify; original left untouched")
    client.delete_collection(name)
    new.modify(name=name)
    final = client.get_collection(name)
    return {"space": _space(final), "count": final.count()}


def _migrate_sqlite(db_path: Path) -> dict:
    # Same statements as app/db.py `_add_missing_columns`, kept in sync by hand;
    # tests/test_scorer_p1.py exercises both paths.
    con = sqlite3.connect(db_path)
    cols = {r[1] for r in con.execute("PRAGMA table_info(preferences)")}
    added = False
    if cols and "last_accessed_at" not in cols:
        con.execute("ALTER TABLE preferences ADD COLUMN last_accessed_at DATETIME")
        added = True
    filled = con.execute(
        "UPDATE preferences SET last_accessed_at = created_at WHERE last_accessed_at IS NULL"
    ).rowcount if cols else 0
    con.commit()
    con.close()
    return {"column_added": added, "rows_backfilled": filled}


def migrate(data_dir: Path, apply: bool = False) -> dict:
    data_dir = Path(data_dir).resolve()
    if not data_dir.is_dir():
        raise SystemExit(f"not a directory: {data_dir}")
    report = {"before": _plan(data_dir), "applied": apply, "backup": None, "after": None}
    if not apply:
        return report

    report["backup"] = str(_backup(data_dir))
    chroma_dir = data_dir / "chroma"
    if chroma_dir.is_dir():
        client = chromadb.PersistentClient(path=str(chroma_dir))
        for name, info in report["before"]["collections"].items():
            if info["space"] != SPACE:
                _migrate_collection(client, name)
    if (data_dir / "memory.db").is_file():
        report["sqlite_result"] = _migrate_sqlite(data_dir / "memory.db")
    report["after"] = _plan(data_dir)
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--data-dir", required=True, help="the .codiemind directory")
    ap.add_argument("--apply", action="store_true", help="migrate (default: report only)")
    args = ap.parse_args()
    print(json.dumps(migrate(Path(args.data_dir), apply=args.apply), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
