import sqlite3
import json
import os
from app.config import settings

def init_db():
    """Creates the SQLite cache table if it doesn't exist."""
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_cache (
            coords_hash TEXT PRIMARY KEY,
            geojson_data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize database table on import
init_db()

def get_cached_scan(geojson_coords: list):
    """Retrieves cached scan results by coordinate key."""
    coords_key = json.dumps(geojson_coords)
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT geojson_data FROM scan_cache WHERE coords_hash = ?", (coords_key,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return json.loads(row[0])
    return None

def save_scan_cache(geojson_coords: list, result_data: dict):
    """Saves scan results to SQLite."""
    coords_key = json.dumps(geojson_coords)
    data_str = json.dumps(result_data)
    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO scan_cache (coords_hash, geojson_data) VALUES (?, ?)",
        (coords_key, data_str)
    )
    conn.commit()
    conn.close()