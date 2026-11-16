"""SQLite storage for shared household guides and community stories/tips (Task 3) and questions (Task 2)."""

import json
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "second_nature.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS guides (
    id TEXT PRIMARY KEY,
    household TEXT NOT NULL,
    city TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL,
    updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    author TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    caption TEXT NOT NULL,
    item_key TEXT,
    guide_id TEXT REFERENCES guides(id),
    photo TEXT,
    helpful INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    city TEXT NOT NULL,
    details TEXT NOT NULL,
    guess TEXT,
    photo TEXT,
    saved_reply_id INTEGER,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS question_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    author TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL,
    answer_key TEXT,
    helpful INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);
"""

SEED_STORY = {
    "kind": "story",
    "author": "Maya K.",
    "role": "Waste educator",
    "city": "Portland, OR",
    "caption": "I made a five-minute “sorting shelf” by our back door. Now everyone knows where batteries and soft plastics wait for drop-off.",
    "helpful": 34,
}


@contextmanager
def connect(path: Path = DB_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init(path: Path = DB_PATH):
    with connect(path) as conn:
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) FROM stories").fetchone()[0] == 0:
            conn.execute(
                "INSERT INTO stories (kind, author, role, city, caption, helpful, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (*SEED_STORY.values(), time.time() - 2 * 3600),
            )


def _guide(row) -> dict:
    return {
        "id": row["id"],
        "household": row["household"],
        "city": row["city"],
        "note": row["note"],
        "items": json.loads(row["items"]),
        "updated_at": row["updated_at"],
    }


def save_guide(conn, guide_id: str | None, household: str, city: str, note: str, items: list[dict]) -> dict:
    """Create a guide, or update it in place when guide_id already exists (so share links stay stable)."""
    now = time.time()
    payload = json.dumps(items)
    if guide_id and conn.execute("SELECT 1 FROM guides WHERE id = ?", (guide_id,)).fetchone():
        conn.execute(
            "UPDATE guides SET household = ?, city = ?, note = ?, items = ?, updated_at = ? WHERE id = ?",
            (household, city, note, payload, now, guide_id),
        )
    else:
        guide_id = secrets.token_urlsafe(6)
        conn.execute(
            "INSERT INTO guides (id, household, city, note, items, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (guide_id, household, city, note, payload, now),
        )
    return get_guide(conn, guide_id)


def get_guide(conn, guide_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM guides WHERE id = ?", (guide_id,)).fetchone()
    return _guide(row) if row else None


def _story(conn, row) -> dict:
    guide = get_guide(conn, row["guide_id"]) if row["guide_id"] else None
    replies = conn.execute(
        "SELECT id, author, text, created_at FROM replies WHERE story_id = ? ORDER BY id", (row["id"],)
    ).fetchall()
    return {
        "id": row["id"],
        "kind": row["kind"],
        "author": row["author"],
        "role": row["role"],
        "city": row["city"],
        "caption": row["caption"],
        "item_key": row["item_key"],
        "photo": row["photo"],
        "helpful": row["helpful"],
        "created_at": row["created_at"],
        "guide": {"id": guide["id"], "household": guide["household"], "city": guide["city"], "count": len(guide["items"])}
        if guide
        else None,
        "replies": [dict(r) for r in replies],
    }


def list_stories(conn) -> list[dict]:
    rows = conn.execute("SELECT * FROM stories ORDER BY created_at DESC").fetchall()
    return [_story(conn, r) for r in rows]


def get_story(conn, story_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM stories WHERE id = ?", (story_id,)).fetchone()
    return _story(conn, row) if row else None


def add_story(conn, kind: str, author: str, city: str, caption: str, item_key: str | None, guide_id: str | None, photo: str | None) -> dict:
    cur = conn.execute(
        "INSERT INTO stories (kind, author, city, caption, item_key, guide_id, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (kind, author, city, caption, item_key, guide_id, photo, time.time()),
    )
    return get_story(conn, cur.lastrowid)


def bump_helpful(conn, story_id: int, delta: int) -> dict | None:
    conn.execute("UPDATE stories SET helpful = MAX(0, helpful + ?) WHERE id = ?", (delta, story_id))
    return get_story(conn, story_id)


def add_reply(conn, story_id: int, author: str, text: str) -> dict | None:
    if not conn.execute("SELECT 1 FROM stories WHERE id = ?", (story_id,)).fetchone():
        return None
    conn.execute(
        "INSERT INTO replies (story_id, author, text, created_at) VALUES (?, ?, ?, ?)",
        (story_id, author, text, time.time()),
    )
    return get_story(conn, story_id)


# ---- Task 2: questions about items the app can't settle ----
# Neighbor replies are inserted with a future created_at and stay hidden until then, so they
# "arrive" a few seconds after the question is posted.

def _question(conn, row) -> dict:
    now = time.time()
    replies = conn.execute(
        "SELECT id, author, role, text, answer_key, helpful, created_at FROM question_replies"
        " WHERE question_id = ? AND created_at <= ? ORDER BY created_at",
        (row["id"], now),
    ).fetchall()
    pending = conn.execute(
        "SELECT COUNT(*) FROM question_replies WHERE question_id = ? AND created_at > ?", (row["id"], now)
    ).fetchone()[0]
    return {
        "id": row["id"],
        "author": row["author"],
        "city": row["city"],
        "details": row["details"],
        "guess": row["guess"],
        "photo": row["photo"],
        "saved_reply_id": row["saved_reply_id"],
        "created_at": row["created_at"],
        "replies": [dict(r) for r in replies],
        "pending": pending,
    }


def list_questions(conn) -> list[dict]:
    rows = conn.execute("SELECT * FROM questions ORDER BY created_at DESC").fetchall()
    return [_question(conn, r) for r in rows]


def get_question(conn, question_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM questions WHERE id = ?", (question_id,)).fetchone()
    return _question(conn, row) if row else None


def add_question(conn, author: str, city: str, details: str, guess: str | None, photo: str | None, seeded: list[dict]) -> dict:
    now = time.time()
    cur = conn.execute(
        "INSERT INTO questions (author, city, details, guess, photo, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (author, city, details, guess, photo, now),
    )
    conn.executemany(
        "INSERT INTO question_replies (question_id, author, role, text, answer_key, helpful, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(cur.lastrowid, r["author"], r["role"], r["text"], r["answer_key"], r["helpful"], now + r["delay"]) for r in seeded],
    )
    return get_question(conn, cur.lastrowid)


def add_question_reply(conn, question_id: int, author: str, text: str, answer_key: str | None) -> dict | None:
    if not conn.execute("SELECT 1 FROM questions WHERE id = ?", (question_id,)).fetchone():
        return None
    conn.execute(
        "INSERT INTO question_replies (question_id, author, text, answer_key, created_at) VALUES (?, ?, ?, ?, ?)",
        (question_id, author, text, answer_key, time.time()),
    )
    return get_question(conn, question_id)


def bump_reply_helpful(conn, question_id: int, reply_id: int, delta: int) -> dict | None:
    conn.execute(
        "UPDATE question_replies SET helpful = MAX(0, helpful + ?) WHERE id = ? AND question_id = ?",
        (delta, reply_id, question_id),
    )
    return get_question(conn, question_id)


def save_answer(conn, question_id: int, reply_id: int | None) -> dict | None:
    """Marks which reply the asker saved to their guide (None clears it)."""
    if reply_id is not None and not conn.execute(
        "SELECT 1 FROM question_replies WHERE id = ? AND question_id = ? AND answer_key IS NOT NULL", (reply_id, question_id)
    ).fetchone():
        return None
    conn.execute("UPDATE questions SET saved_reply_id = ? WHERE id = ?", (reply_id, question_id))
    return get_question(conn, question_id)
