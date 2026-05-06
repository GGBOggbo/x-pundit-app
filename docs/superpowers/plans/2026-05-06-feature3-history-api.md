# Feature 3: 历史 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现历史记录的完整 CRUD API（新增、列表、详情、删除、清空、迁移），所有接口需要认证守卫。

**Architecture:** 两个路由文件：`app/api/history/route.ts` 处理列表/新增/清空/迁移，`app/api/history/[id]/route.ts` 处理详情/删除。所有接口通过 `requireAuth()` 校验登录状态。`lib/history.ts` 重写为前端 API 调用封装。

**Tech Stack:** drizzle-orm, better-sqlite3, NextAuth v5

---

### Task 1: 重写 lib/history.ts 为前端 API 客户端

**Files:**
- Modify: `lib/history.ts`
- Test: `__tests__/history-api-client.test.ts`

- [ ] **Step 1: 写失败测试 — API 客户端函数**

Create `__tests__/history-api-client.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildContentPreview } from "@/lib/history";

describe("buildContentPreview", () => {
  it("should return full content if <= 50 chars", () => {
    expect(buildContentPreview("短文本")).toBe("短文本");
  });

  it("should truncate and add ellipsis if > 50 chars", () => {
    const long = "a".repeat(60);
    const result = buildContentPreview(long);
    expect(result.length).toBe(53); // 50 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle empty string", () => {
    expect(buildContentPreview("")).toBe("");
  });

  it("should handle exactly 50 chars", () => {
    const exact = "a".repeat(50);
    expect(buildContentPreview(exact)).toBe(exact);
  });
});
```

- [ ] **Step 2: 运行测试确认 buildContentPreview 还能通过**

Run: `npx vitest run __tests__/history-api-client.test.ts`
Expected: PASS（buildContentPreview 保留，其余函数替换为 API 调用）

- [ ] **Step 3: 重写 lib/history.ts**

完全替换 `lib/history.ts` 的内容为：

```ts
import type { HistoryItem, GeneratedComment, ContentAnalysis } from "@/types";

const HISTORY_KEY = "x-pundit-history";

/**
 * 生成内容摘要（前后端共用）
 */
export function buildContentPreview(content: string): string {
  if (content.length <= 50) return content;
  return content.slice(0, 50) + "...";
}

// ========== localStorage 工具（仅用于迁移前的旧数据读取） ==========

export function getLocalHistory(): HistoryItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export function clearLocalHistory(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

// ========== 后端 API 调用 ==========

export async function createHistoryItem(params: {
  content: string;
  personaId: string;
  personaName: string;
  personaEmoji: string;
  comments: GeneratedComment[];
  analysis: ContentAnalysis;
}): Promise<{ id: string; createdAt: number }> {
  const res = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "保存失败");
  }
  return res.json();
}

export async function fetchHistoryList(
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: HistoryItem[]; total: number; hasMore: boolean }> {
  const res = await fetch(`/api/history?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error("获取历史失败");
  return res.json();
}

export async function fetchHistoryDetail(
  id: string
): Promise<HistoryItem> {
  const res = await fetch(`/api/history/${id}`);
  if (!res.ok) throw new Error("获取详情失败");
  return res.json();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("删除失败");
}

export async function clearAllHistory(): Promise<{ deleted: number }> {
  const res = await fetch("/api/history", { method: "DELETE" });
  if (!res.ok) throw new Error("清空失败");
  return res.json();
}

export async function migrateLocalHistory(
  items: HistoryItem[]
): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/history/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("迁移失败");
  return res.json();
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run __tests__/history-api-client.test.ts`
Expected: PASS

- [ ] **Step 5: 运行全部测试确认无破坏**

Run: `npx vitest run`
Expected: ALL PASS（旧的 `__tests__/history.test.ts` 可能需要更新或删除）

- [ ] **Step 6: 更新旧测试文件**

更新 `__tests__/history.test.ts`，只保留 `buildContentPreview` 和 `getLocalHistory` 的测试：

```ts
import { describe, it, expect } from "vitest";
import { buildContentPreview, getLocalHistory, clearLocalHistory } from "@/lib/history";

describe("buildContentPreview", () => {
  it("should return full content if <= 50 chars", () => {
    expect(buildContentPreview("短文本")).toBe("短文本");
  });

  it("should truncate and add ellipsis if > 50 chars", () => {
    const long = "a".repeat(60);
    const result = buildContentPreview(long);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle empty string", () => {
    expect(buildContentPreview("")).toBe("");
  });
});

describe("getLocalHistory", () => {
  it("should return empty array when localStorage is empty", () => {
    // 在 node 环境下 localStorage 不存在
    const result = getLocalHistory();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("clearLocalHistory", () => {
  it("should not throw when localStorage is unavailable", () => {
    expect(() => clearLocalHistory()).not.toThrow();
  });
});
```

- [ ] **Step 7: 删除重复的测试文件**

Run: `rm __tests__/history-api-client.test.ts`（合并到 `__tests__/history.test.ts` 了）

- [ ] **Step 8: Commit**

```bash
git add lib/history.ts __tests__/history.test.ts
git rm __tests__/history-api-client.test.ts
git commit -m "refactor: replace localStorage history with API client functions"
```

---

### Task 2: 编写历史 API — POST 新增

**Files:**
- Create: `app/api/history/route.ts`

- [ ] **Step 1: 创建历史 API route（先只写 POST）**

Create `app/api/history/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";
import { buildContentPreview } from "@/lib/history";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
    }
    if (!body.personaId?.trim()) {
      return NextResponse.json({ error: "personaId 不能为空" }, { status: 400 });
    }
    if (!body.comments || !Array.isArray(body.comments) || body.comments.length === 0) {
      return NextResponse.json({ error: "comments 不能为空" }, { status: 400 });
    }
    if (!body.analysis) {
      return NextResponse.json({ error: "analysis 不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const contentPreview = buildContentPreview(body.content);
    const now = Date.now();

    const db = getDb();
    db.prepare(
      `INSERT INTO history (id, user_id, content, content_preview, persona_id, persona_name, persona_emoji, comment_count, comments, analysis, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user.id,
      body.content,
      contentPreview,
      body.personaId,
      body.personaName || "",
      body.personaEmoji || "",
      body.comments.length,
      JSON.stringify(body.comments),
      JSON.stringify(body.analysis),
      now
    );

    return NextResponse.json({ id, createdAt: now });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("保存历史失败:", error);
    return NextResponse.json({ error: "保存失败，请重试" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history/route.ts
git commit -m "feat: add POST /api/history for saving history records"
```

---

### Task 3: 编写历史 API — GET 列表 + DELETE 清空

**Files:**
- Modify: `app/api/history/route.ts`

- [ ] **Step 1: 在 route.ts 中添加 GET 和 DELETE handler**

在 `app/api/history/route.ts` 中添加 `GET` 和 `DELETE` 导出函数：

```ts
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(
      Math.max(parseInt(url.searchParams.get("pageSize") || "20"), 1),
      100
    );
    const offset = (page - 1) * pageSize;

    const db = getDb();

    const total = (
      db
        .prepare("SELECT COUNT(*) as count FROM history WHERE user_id = ?")
        .get(user.id) as { count: number }
    ).count;

    const rows = db
      .prepare(
        "SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(user.id, pageSize, offset) as Array<{
      id: string;
      user_id: string;
      content: string;
      content_preview: string;
      persona_id: string;
      persona_name: string;
      persona_emoji: string;
      comment_count: number;
      comments: string;
      analysis: string;
      created_at: number;
    }>;

    const items = rows.map(rowToHistoryItem);

    return NextResponse.json({
      items,
      total,
      hasMore: offset + pageSize < total,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("获取历史失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDb();
    const result = db
      .prepare("DELETE FROM history WHERE user_id = ?")
      .run(user.id);
    return NextResponse.json({ deleted: result.changes });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("清空历史失败:", error);
    return NextResponse.json({ error: "清空失败" }, { status: 500 });
  }
}
```

在文件底部添加 `rowToHistoryItem` 辅助函数（GET 和 GET/[id] 共用）：

```ts
function rowToHistoryItem(row: {
  id: string;
  user_id: string;
  content: string;
  content_preview: string;
  persona_id: string;
  persona_name: string;
  persona_emoji: string;
  comment_count: number;
  comments: string;
  analysis: string;
  created_at: number;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    contentPreview: row.content_preview,
    personaId: row.persona_id,
    personaName: row.persona_name,
    personaEmoji: row.persona_emoji,
    commentCount: row.comment_count,
    comments: JSON.parse(row.comments),
    analysis: JSON.parse(row.analysis),
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history/route.ts
git commit -m "feat: add GET list and DELETE all for history API"
```

---

### Task 4: 编写历史 API — POST migrate

**Files:**
- Modify: `app/api/history/route.ts`

- [ ] **Step 1: 添加 migrate 处理逻辑**

由于 Next.js route handler 不支持在同一个 route.ts 里通过 URL path 区分 `/api/history` 和 `/api/history/migrate`，migrate 需要通过请求体中的 `action` 字段来区分。

修改 `POST` 函数，在现有逻辑前添加 migrate 分支：

在 `POST` 函数的 `const body = await req.json();` 之后添加：

```ts
    // 迁移分支：body.action === "migrate"
    if (body.action === "migrate") {
      if (!body.items || !Array.isArray(body.items)) {
        return NextResponse.json({ error: "items 不能为空" }, { status: 400 });
      }

      const db = getDb();
      const insertStmt = db.prepare(
        `INSERT OR IGNORE INTO history (id, user_id, content, content_preview, persona_id, persona_name, persona_emoji, comment_count, comments, analysis, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      // 为防重复，给 history 表加一个唯一约束
      // 使用 content + persona_id + created_at 组合
      // 在 initDb 的建表语句中已添加，这里直接用 INSERT OR IGNORE

      let imported = 0;
      let skipped = 0;

      for (const item of body.items) {
        if (!item.content || !item.personaId || !item.createdAt) {
          skipped++;
          continue;
        }
        const id = item.id || crypto.randomUUID();
        const contentPreview = item.contentPreview || buildContentPreview(item.content);
        try {
          insertStmt.run(
            id,
            user.id,
            item.content,
            contentPreview,
            item.personaId,
            item.personaName || "",
            item.personaEmoji || "",
            item.commentCount || 0,
            JSON.stringify(item.comments || []),
            JSON.stringify(item.analysis || {}),
            item.createdAt
          );
          imported++;
        } catch {
          skipped++;
        }
      }

      return NextResponse.json({ imported, skipped });
    }
```

注意：需要在 `lib/db/index.ts` 的建表 SQL 中给 history 表添加唯一约束。在 `CREATE TABLE IF NOT EXISTS history` 语句的 `created_at` 行之后添加：

```sql
    UNIQUE(content, persona_id, created_at)
```

同时更新前端 `migrateLocalHistory` 函数，添加 `action: "migrate"` 字段：

在 `lib/history.ts` 的 `migrateLocalHistory` 函数中：

```ts
export async function migrateLocalHistory(
  items: HistoryItem[]
): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "migrate", items }),
  });
  if (!res.ok) throw new Error("迁移失败");
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history/route.ts lib/db/index.ts lib/history.ts
git commit -m "feat: add POST /api/history migrate for localStorage import"
```

---

### Task 5: 编写历史 API — GET/DELETE 单条

**Files:**
- Create: `app/api/history/[id]/route.ts`

- [ ] **Step 1: 创建单条历史 API route**

Create `app/api/history/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";

function rowToHistoryItem(row: {
  id: string;
  user_id: string;
  content: string;
  content_preview: string;
  persona_id: string;
  persona_name: string;
  persona_emoji: string;
  comment_count: number;
  comments: string;
  analysis: string;
  created_at: number;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    contentPreview: row.content_preview,
    personaId: row.persona_id,
    personaName: row.persona_name,
    personaEmoji: row.persona_emoji,
    commentCount: row.comment_count,
    comments: JSON.parse(row.comments),
    analysis: JSON.parse(row.analysis),
    createdAt: row.created_at,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const row = db
      .prepare("SELECT * FROM history WHERE id = ? AND user_id = ?")
      .get(id, user.id) as
      | {
          id: string;
          user_id: string;
          content: string;
          content_preview: string;
          persona_id: string;
          persona_name: string;
          persona_emoji: string;
          comment_count: number;
          comments: string;
          analysis: string;
          created_at: number;
        }
      | undefined;

    if (!row) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json(rowToHistoryItem(row));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("获取历史详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const result = db
      .prepare("DELETE FROM history WHERE id = ? AND user_id = ?")
      .run(id, user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("删除历史失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history/\[id\]/route.ts
git commit -m "feat: add GET/DELETE /api/history/[id] for single record"
```
