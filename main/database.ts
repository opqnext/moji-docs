import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

export function initDatabase(docsRoot: string): Database.Database {
  const mojiDir = join(docsRoot, '.moji')
  if (!existsSync(mojiDir)) {
    mkdirSync(mojiDir, { recursive: true })
  }

  const dbPath = join(mojiDir, 'index.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')

  createTables(db)
  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS doc_index (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      is_directory INTEGER DEFAULT 0,
      sort INTEGER DEFAULT 0,
      parent_path TEXT DEFAULT '',
      file_hash TEXT DEFAULT '',
      file_mtime REAL DEFAULT 0,
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_parent ON doc_index(parent_path);
    CREATE INDEX IF NOT EXISTS idx_pinned ON doc_index(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_updated ON doc_index(updated_at);
    CREATE INDEX IF NOT EXISTS idx_directory ON doc_index(is_directory);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
  `)

  const ftsExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='doc_fts'"
  ).get()

  if (!ftsExists) {
    db.exec(`
      CREATE VIRTUAL TABLE doc_fts USING fts5(
        title, content,
        content='doc_index', content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS doc_ai AFTER INSERT ON doc_index BEGIN
        INSERT INTO doc_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS doc_ad AFTER DELETE ON doc_index BEGIN
        INSERT INTO doc_fts(doc_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
      END;

      CREATE TRIGGER IF NOT EXISTS doc_au AFTER UPDATE ON doc_index BEGIN
        INSERT INTO doc_fts(doc_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
        INSERT INTO doc_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
      END;
    `)
  }
}

export function dropAndRebuildFts(db: Database.Database): void {
  db.exec(`
    DROP TRIGGER IF EXISTS doc_ai;
    DROP TRIGGER IF EXISTS doc_ad;
    DROP TRIGGER IF EXISTS doc_au;
    DROP TABLE IF EXISTS doc_fts;
  `)

  db.exec(`
    CREATE VIRTUAL TABLE doc_fts USING fts5(
      title, content,
      content='doc_index', content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER doc_ai AFTER INSERT ON doc_index BEGIN
      INSERT INTO doc_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
    END;

    CREATE TRIGGER doc_ad AFTER DELETE ON doc_index BEGIN
      INSERT INTO doc_fts(doc_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
    END;

    CREATE TRIGGER doc_au AFTER UPDATE ON doc_index BEGIN
      INSERT INTO doc_fts(doc_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
      INSERT INTO doc_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
    END;

    INSERT INTO doc_fts(rowid, title, content)
    SELECT rowid, title, content FROM doc_index;
  `)
}
