# 推文生成 STEP 1 自动加载历史记录 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把推文生成页 STEP 1 从手动粘贴 textarea 改为自动从 history 表加载 + checkbox 勾选

**Architecture:** 新增 GET /api/tweets/sources 端点查询 history 表去重内容，前端 useEffect 加载后渲染 checkbox 列表，勾选内容 + 手动补充合并参与风格分析。未登录强制跳转。

**Tech Stack:** Next.js App Router, better-sqlite3, React hooks, existing auth/session utils

---

## Task 1: API 测试 — 未登录返回 401

**Files:**
- Create: `__tests__/tweetSources.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/tweetSources.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock requireAuth
vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

describe("GET /api/tweets/sources", () => {
  it("should return 401 when not logged in", async () => {
    const { GET } = await import("@/app/api/tweets/sources/route");
    const req = new Request("http://localhost/api/tweets/sources");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/tweetSources.test.ts`
Expected: FAIL — module `@/app/api/tweets/sources/route` not found

- [ ] **Step 3: Commit (test first)**

```bash
git add __tests__/tweetSources.test.ts
git commit -test: add failing test for GET /api/tweets/sources 401"
```

---

## Task 2: API 实现 — GET /api/tweets/sources

**Files:**
- Create: `app/api/tweets/sources/route.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// app/api/tweets/sources/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDb();

    const rows = db
      .prepare(
        "SELECT DISTINCT content FROM history WHERE user_id = ? ORDER BY created_at DESC"
      )
      .all(user.id) as { content: string }[];

    const contents = rows.map((r) => r.content);

    return NextResponse.json({ contents, total: contents.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("获取历史内容失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run Task 1 test to verify it passes**

Run: `npx vitest run __tests__/tweetSources.test.ts`
Expected: PASS

- [ ] **Step 3: Write additional tests (with history data)**

追加到 `__tests__/tweetSources.test.ts`:

```typescript
// 重置 mock
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock 需要在每个 describe 里单独设置 ---

describe("GET /api/tweets/sources with history", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return deduplicated content from history", async () => {
    const mockRows = [
      { content: "今天又是被 AI 震撼的一天" },
      { content: "创业第三年，终于理解了 PMF" },
    ];

    vi.doMock("@/lib/session", () => ({
      requireAuth: vi.fn().mockResolvedValue({ id: "user-1", email: "test@test.com" }),
    }));

    vi.doMock("@/lib/db/index", () => ({
      getDb: () => ({
        prepare: () => ({
          all: () => mockRows,
        }),
      }),
    }));

    const { GET } = await import("@/app/api/tweets/sources/route");
    const req = new Request("http://localhost/api/tweets/sources");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.contents).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.contents[0]).toBe("今天又是被 AI 震撼的一天");
  });

  it("should return empty array when no history", async () => {
    vi.doMock("@/lib/session", () => ({
      requireAuth: vi.fn().mockResolvedValue({ id: "user-1", email: "test@test.com" }),
    }));

    vi.doMock("@/lib/db/index", () => ({
      getDb: () => ({
        prepare: () => ({
          all: () => [],
        }),
      }),
    }));

    const { GET } = await import("@/app/api/tweets/sources/route");
    const req = new Request("http://localhost/api/tweets/sources");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.contents).toEqual([]);
    expect(data.total).toBe(0);
  });
});
```

- [ ] **Step 4: Run all API tests**

Run: `npx vitest run __tests__/tweetSources.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/tweets/sources/route.ts __tests__/tweetSources.test.ts
git commit -m "feat: add GET /api/tweets/sources endpoint for history content"
```

---

## Task 3: 页面改造 — 自动加载 + checkbox 选择

**Files:**
- Modify: `app/generate-tweets/page.tsx`

- [ ] **Step 1: Add state and fetch logic**

在 `GenerateTweetsPage` 组件内，现有 state 之后追加：

```typescript
// 历史内容源
const [sources, setSources] = useState<string[]>([]);
const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
const [sourcesLoading, setSourcesLoading] = useState(true);
const [showManualInput, setShowManualInput] = useState(false);

// 加载历史内容
useEffect(() => {
  fetch("/api/tweets/sources")
    .then((r) => {
      if (r.status === 401) {
        window.location.href = "/login?redirect=/generate-tweets";
        return null;
      }
      return r.json();
    })
    .then((data) => {
      if (data) {
        setSources(data.contents || []);
      }
    })
    .catch(() => {})
    .finally(() => setSourcesLoading(false));
}, []);
```

- [ ] **Step 2: Add toggle functions**

```typescript
const toggleSource = (index: number) => {
  setSelectedSources((prev) => {
    const next = new Set(prev);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    return next;
  });
};

const toggleAllSources = () => {
  if (selectedSources.size === sources.length) {
    setSelectedSources(new Set());
  } else {
    setSelectedSources(new Set(sources.map((_, i) => i)));
  }
};
```

- [ ] **Step 3: Compute effective tweet list**

替换现有的 `parseResult` / `validCount` 逻辑：

```typescript
// 合并：勾选的历史 + 手动补充
const selectedContents = Array.from(selectedSources).map((i) => sources[i]);
const manualContents = rawInput.trim() ? parseTweets(rawInput).valid : [];
const allContents = [...new Set([...selectedContents, ...manualContents])];
const validCount = allContents.length;
```

- [ ] **Step 4: Update handleGenerate to use allContents**

替换 `handleGenerate` 中的 `tweets` 字段：

```typescript
body: JSON.stringify({
  tweets: allContents,  // 替换原来的 parseResult.valid
  personaId,
  count,
  language,
  topicHint: topicHint.trim() || undefined,
}),
```

- [ ] **Step 5: Replace STEP 1 textarea with source list UI**

替换 STEP 1 的整个 `<div className="card">` 块：

```tsx
{/* STEP 1: 选择历史内容 */}
<div className="card">
  <div className="step-row">
    <span className="step-badge">STEP 1</span>
    <span className="step-name">选择你的历史内容</span>
  </div>

  {sourcesLoading ? (
    <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
      加载历史记录中...
    </div>
  ) : sources.length > 0 ? (
    <>
      {/* 全选按钮 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          已选 {selectedSources.size} / {sources.length} 条
        </span>
        <button className="btn-mini" onClick={toggleAllSources}>
          {selectedSources.size === sources.length ? "取消全选" : "全选"}
        </button>
      </div>

      {/* 历史内容列表 */}
      <div className="history-source-list">
        {sources.map((content, i) => (
          <label key={i} className="source-item">
            <input
              type="checkbox"
              checked={selectedSources.has(i)}
              onChange={() => toggleSource(i)}
            />
            <span className="source-text">
              {content.length > 80 ? content.slice(0, 80) + "..." : content}
            </span>
          </label>
        ))}
      </div>

      {/* 手动补充 */}
      {showManualInput ? (
        <div style={{ marginTop: 12 }}>
          <div className="field-label">手动补充（可选）</div>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="每行一条额外内容..."
            style={{ height: 100 }}
          />
        </div>
      ) : (
        <button
          className="btn-mini"
          style={{ marginTop: 12 }}
          onClick={() => setShowManualInput(true)}
        >
          + 手动补充
        </button>
      )}
    </>
  ) : (
    <>
      {/* 无历史，fallback 到手动粘贴 */}
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
        暂无历史记录，请手动粘贴你的推文
      </div>
      <textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={"每行粘贴一条你发过的推文，例如：\n\n今天又是被 AI 震撼的一天\n创业第三年，终于理解了 PMF 的意思"}
        style={{ height: 200 }}
      />
    </>
  )}

  <ParseStatus validCount={validCount} dropped={[]} />
</div>
```

- [ ] **Step 6: Add CSS for source list**

追加到 `app/globals.css` 末尾：

```css
/* ═══════ TWEET SOURCES LIST ═══════ */
.history-source-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  padding: 8px;
  background: var(--code-bg);
}
.source-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s;
}
.source-item:hover {
  background: var(--selection-bg);
}
.source-item input[type="checkbox"] {
  margin-top: 3px;
  accent-color: var(--blue);
  flex-shrink: 0;
}
.source-text {
  font-size: 13px;
  color: var(--text-body);
  line-height: 1.5;
}
```

- [ ] **Step 7: Update disabled condition**

替换生成按钮的 `disabled` 条件：

```typescript
disabled={!loading && validCount < 5}
```

以及下方提示文案：

```typescript
validCount < 5
  ? "至少需要 5 条内容（勾选历史或手动粘贴）"
  : `将使用 ${validCount} 条内容分析风格`
```

- [ ] **Step 8: Commit**

```bash
git add app/generate-tweets/page.tsx app/globals.css
git commit -m "feat: auto-load history sources with checkbox selection in tweet generator"
```

---

## Task 4: 回归测试

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS (including existing 150+ tests)

- [ ] **Step 2: Verify no regressions**

Check:
- `__tests__/parseTweets.test.ts` — still passes
- `__tests__/personas.test.ts` — still passes
- All other existing tests — unaffected

- [ ] **Step 3: Final commit (if any fix needed)**

```bash
git add -A
git commit -m "fix: address regression test failures"
```

---

## File Summary

| Action | File |
|--------|------|
| Create | `app/api/tweets/sources/route.ts` |
| Create | `__tests__/tweetSources.test.ts` |
| Modify | `app/generate-tweets/page.tsx` |
| Modify | `app/globals.css` |
