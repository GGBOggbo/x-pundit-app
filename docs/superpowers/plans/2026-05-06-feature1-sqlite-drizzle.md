# Feature 1: SQLite + Drizzle 建库建表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 SQLite 数据库，定义 users 和 history 两张表的 Drizzle schema，确保数据库文件在启动时自动创建。

**Architecture:** 使用 Drizzle ORM + better-sqlite3 驱动。数据库文件存放在 `.data/x-pundit.db`，通过单例模式连接。schema 定义 users 和 history 两张表，应用启动时自动建表。

**Tech Stack:** drizzle-orm, better-sqlite3, drizzle-kit, @types/better-sqlite3

---

### Task 1: 安装依赖并更新 .gitignore

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: 安装依赖**

Run:
```bash
cd /data/project/x-pundit-app && npm install drizzle-orm better-sqlite3 && npm install -D drizzle-kit @types/better-sqlite3
```

Expected: `package.json` 出现新依赖，`node_modules` 安装成功。

- [ ] **Step 2: 更新 .gitignore 排除数据库文件**

在 `.gitignore` 的 `# misc` 区块末尾添加：

```
# database
.data/
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add drizzle-orm, better-sqlite3 dependencies and gitignore .data/"
```

---

### Task 2: 编写 Drizzle schema

**Files:**
- Create: `lib/db/schema.ts`
- Test: `__tests__/db-schema.test.ts`

- [ ] **Step 1: 写失败测试 — 验证 schema 导出和表结构**

Create `__tests__/db-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { users, history } from "@/lib/db/schema";
import { is } from "drizzle-orm";

describe("db schema", () => {
  it("should export users table", () => {
    expect(users).toBeDefined();
    // users 表应有这些列
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it("should export history table", () => {
    expect(history).toBeDefined();
    expect(history.id).toBeDefined();
    expect(history.userId).toBeDefined();
    expect(history.content).toBeDefined();
    expect(history.contentPreview).toBeDefined();
    expect(history.personaId).toBeDefined();
    expect(history.personaName).toBeDefined();
    expect(history.personaEmoji).toBeDefined();
    expect(history.commentCount).toBeDefined();
    expect(history.comments).toBeDefined();
    expect(history.analysis).toBeDefined();
    expect(history.createdAt).toBeDefined();
  });

  it("users table should have unique email", () => {
    // drizzle schema 的 unique 约束在表级定义
    // 我们验证 schema 文件包含 .unique()
    const schemaSource = require("fs").readFileSync(
      require("path").resolve(__dirname, "../lib/db/schema.ts"),
      "utf-8"
    );
    expect(schemaSource).toContain("unique()");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run __tests__/db-schema.test.ts`
Expected: FAIL — `Cannot find module '@/lib/db/schema'`

- [ ] **Step 3: 创建 schema 文件**

Create `lib/db/schema.ts`:

```ts
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  contentPreview: text("content_preview").notNull(),
  personaId: text("persona_id").notNull(),
  personaName: text("persona_name").notNull(),
  personaEmoji: text("persona_emoji").notNull(),
  commentCount: integer("comment_count").notNull(),
  comments: text("comments").notNull(),
  analysis: text("analysis").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run __tests__/db-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts __tests__/db-schema.test.ts
git commit -m "feat: add drizzle schema for users and history tables"
```

---

### Task 3: 编写数据库连接和自动建表

**Files:**
- Create: `lib/db/index.ts`
- Test: `__tests__/db-connection.test.ts`

- [ ] **Step 1: 写失败测试 — 验证数据库连接和建表**

Create `__tests__/db-connection.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { getDb, initDb } from "@/lib/db/index";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.resolve(__dirname, "../.data/test-db.test.db");

describe("db connection", () => {
  afterAll(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("should create database file on initDb", () => {
    initDb(TEST_DB_PATH);
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  it("should create users table", () => {
    const db = initDb(TEST_DB_PATH);
    const result = db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    expect(result).toHaveLength(1);
  });

  it("should create history table", () => {
    const db = initDb(TEST_DB_PATH);
    const result = db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='history'"
    );
    expect(result).toHaveLength(1);
  });

  it("getDb should return the same instance", () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run __tests__/db-connection.test.ts`
Expected: FAIL — `Cannot find module '@/lib/db/index'`

- [ ] **Step 3: 创建数据库连接文件**

Create `lib/db/index.ts`:

```ts
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

    UNIQUE(content, persona_id, created_at),
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run __tests__/db-connection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/index.ts __tests__/db-connection.test.ts
git commit -m "feat: add SQLite connection with auto-create tables"
```

---

### Task 4: 更新 types/index.ts — 添加 HistoryItem.userId

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: 给 HistoryItem 添加 userId 字段**

在 `types/index.ts` 的 `HistoryItem` 接口中添加 `userId` 字段：

```ts
export interface HistoryItem {
  id: string;
  userId?: string;           // 新增：后端存储时必填，localStorage 迁移时可选
  createdAt: number;
  content: string;
  contentPreview: string;
  personaId: string;
  personaName: string;
  personaEmoji: string;
  commentCount: number;
  comments: GeneratedComment[];
  analysis: ContentAnalysis;
}
```

- [ ] **Step 2: 运行全部测试确认无破坏**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add userId to HistoryItem type"
```
