import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "swachhlens.db")
MODEL_PATH = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")

def get_conn(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # so we can access columns by name
    return conn


def init_db(db_path):
    """Create the tickets table if it doesn't exist, and run any schema migrations
    for columns we've added over time."""
    conn = get_conn(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            category TEXT,
            volume_band TEXT,
            hazard_level INTEGER,
            is_drain_blocked INTEGER DEFAULT 0,
            is_fire_hazard INTEGER DEFAULT 0,
            description TEXT,
            confidence REAL,
            urgency_score REAL,
            status TEXT DEFAULT 'reported',
            img_hash TEXT,
            faces_blurred INTEGER DEFAULT 0,
            plates_blurred INTEGER DEFAULT 0,
            image_b64 TEXT,
            note TEXT,
            note_summary_en TEXT,
            lang TEXT,
            created_at TEXT,
            last_seen TEXT,
            duplicate_count INTEGER DEFAULT 0
        )
    """)
    conn.commit()

    # we've added a bunch of columns since the initial schema, so check and add
    # any that are missing. This way existing databases don't break when we deploy
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tickets)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    if "is_drain_blocked" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN is_drain_blocked INTEGER DEFAULT 0")
    if "is_fire_hazard" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN is_fire_hazard INTEGER DEFAULT 0")
    if "note_summary_en" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN note_summary_en TEXT")
    if "is_sensitive_area" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN is_sensitive_area INTEGER DEFAULT 0")
    if "sensitive_area_type" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN sensitive_area_type TEXT DEFAULT 'None'")
    if "dispatch_unit" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN dispatch_unit TEXT")
    if "verification_image_b64" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN verification_image_b64 TEXT")
    if "resolved_at" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN resolved_at TEXT")
    if "in_jurisdiction" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN in_jurisdiction INTEGER DEFAULT 1")
    if "governing_authority" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN governing_authority TEXT DEFAULT 'Bhubaneswar Municipal Corporation (BMC)'")
    if "reporters" not in existing_cols:
        cursor.execute("ALTER TABLE tickets ADD COLUMN reporters TEXT DEFAULT '[]'")
    conn.commit()
    conn.close()


