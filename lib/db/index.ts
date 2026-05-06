import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { users, history } from "./schema";
import path from "path";
import fs from "fs";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), ".data/x-pundit.db");

let sqliteDb: Database.Database | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

export function initDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || DEFAULT_DB_PATH;

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqliteDb = new Database(resolvedPath);

  // 启用 WAL 模式提升并发性能
  sqliteDb.pragma("journal_mode = WAL");

  // 自动建表
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      content_preview TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      persona_name TEXT NOT NULL,
      persona_emoji TEXT NOT NULL,
      comment_count INTEGER NOT NULL,
      comments TEXT NOT NULL,
      analysis TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_history_unique ON history(content, persona_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at);
  `);

  return sqliteDb;
}

export function getDb(): Database.Database {
  if (!sqliteDb) {
    return initDb();
  }
  return sqliteDb;
}

export function getDrizzle(): ReturnType<typeof drizzle> {
  if (!drizzleInstance) {
    const db = getDb();
    drizzleInstance = drizzle(db, { schema: { users, history } });
  }
  return drizzleInstance;
}
