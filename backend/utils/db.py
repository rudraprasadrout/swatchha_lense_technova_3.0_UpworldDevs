import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "swachhlens.db")
MODEL_PATH = os.path.join(BASE_DIR, "face_detection_yunet_2023mar.onnx")

def get_conn(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path):
    conn = get_conn(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            category TEXT,
            volume_band TEXT,
            hazard_level INTEGER,
            description TEXT,
            confidence REAL,
            urgency_score REAL,
            status TEXT DEFAULT 'reported',
            img_hash TEXT,
            faces_blurred INTEGER DEFAULT 0,
            plates_blurred INTEGER DEFAULT 0,
            image_b64 TEXT,
            note TEXT,
            lang TEXT,
            created_at TEXT,
            last_seen TEXT,
            duplicate_count INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()
