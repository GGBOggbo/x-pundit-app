# Foundation Maintainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the repo to a clean “basic maintainable” state by hardening runtime boundaries, adding onboarding/developer basics, and clearing foundational lint issues.

**Architecture:** Keep the current Next.js structure and existing product behavior, but move runtime configuration and initialization into clearer boundaries, add a standard local-development contract, and clean low-risk code-quality issues that block a green verify command.

**Tech Stack:** Next.js App Router, React 19, TypeScript, NextAuth, better-sqlite3, Vitest, ESLint

---

### Task 1: Harden runtime configuration and comments API boundaries

**Files:**
- Create: `lib/config/runtime.ts`
- Modify: `lib/ai/client.ts`
- Modify: `app/api/comments/route.ts`
- Create: `__tests__/runtime-config.test.ts`
- Create: `__tests__/comments-route.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:

```ts
it("throws when AI_API_KEY is missing", async () => {
  const mod = await import("@/lib/config/runtime");
  expect(() => mod.getAiRuntimeConfig()).toThrow("Missing required environment variable: AI_API_KEY");
});

it("returns 400 when content exceeds 5000 characters", async () => {
  const res = await POST(new NextRequest("http://localhost/api/comments", {
    method: "POST",
    body: JSON.stringify({ content: "a".repeat(5001), personaId: "tieba_bro", count: 5 }),
    headers: { "content-type": "application/json" },
  }));
  expect(res.status).toBe(400);
});

it("returns 429 when comments requests exceed the rate limit", async () => {
  // prepare ten successful requests, then assert the next one is blocked
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run __tests__/runtime-config.test.ts __tests__/comments-route.test.ts`
Expected: FAIL because runtime config module and comments guards do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- `lib/config/runtime.ts`
  - export `getAiRuntimeConfig()`
  - require `AI_API_KEY`
  - provide defaults for `AI_BASE_URL` and `AI_MODEL`
- `lib/ai/client.ts`
  - create Anthropic client lazily via validated runtime config
- `app/api/comments/route.ts`
  - keep current SSE flow
  - reject invalid JSON with `400`
  - reject empty content with `400`
  - reject content longer than `5000`
  - apply `checkRateLimit()` using request IP
  - return `429` on limit hit before AI work begins

- [ ] **Step 4: Run focused verification**

Run: `npx vitest run __tests__/runtime-config.test.ts __tests__/comments-route.test.ts __tests__/client.test.ts __tests__/rate-limit.test.ts`
Expected: PASS

### Task 2: Remove layout-owned DB initialization

**Files:**
- Modify: `app/layout.tsx`
- Modify: `__tests__/db-connection.test.ts`
- Reuse: `lib/db/index.ts`

- [ ] **Step 1: Write the failing/coverage test**

Add a test proving `getDb()` can initialize tables without relying on layout side effects:

```ts
it("getDb initializes required tables without layout side effects", () => {
  const db = getDb();
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).all();
  expect(result).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused DB test**

Run: `npx vitest run __tests__/db-connection.test.ts`
Expected: PASS before cleanup or provide coverage confirming the DB module owns initialization.

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- remove the top-level DB init block from `app/layout.tsx`
- preserve lazy DB initialization through `getDb()`

- [ ] **Step 4: Run DB verification**

Run: `npx vitest run __tests__/db-connection.test.ts __tests__/db-schema.test.ts`
Expected: PASS

### Task 3: Add local-development foundation files

**Files:**
- Modify: `README.md`
- Create: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Write the minimal developer contract**

Update `package.json` scripts to include:

```json
{
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "verify": "npm run test && npm run typecheck && npm run lint"
}
```

- [ ] **Step 2: Add environment example**

Create `.env.example` containing:

```env
AI_API_KEY=your-ai-api-key
AI_BASE_URL=https://open.bigmodel.cn/api/anthropic
AI_MODEL=claude-3-5-sonnet-20241022
AUTH_SECRET=replace-with-a-long-random-string
```

- [ ] **Step 3: Rewrite README for real project onboarding**

README must include:

- project purpose
- major features
- environment variables
- local start steps
- common scripts
- SQLite file location
- current engineering status

- [ ] **Step 4: Run package contract verification**

Run: `npm run test`
Expected: PASS

### Task 4: Clear foundational lint blockers

**Files:**
- Modify: `app/components/ThemeToggle.tsx`
- Modify: `app/history/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/api/history/route.ts`
- Modify: `lib/session.ts`
- Modify: `lib/db/schema.ts`
- Modify: `types/next-auth.d.ts`
- Modify: test files flagged by lint

- [ ] **Step 1: Run lint to capture the current blockers**

Run: `npm run lint`
Expected: FAIL with concrete file-level issues to fix.

- [ ] **Step 2: Write minimal fixes**

Fix only low-risk issues in the current slice:

- replace page navigation `<a>` tags with `Link`
- stop calling `setState` synchronously inside effects when lint rejects it
- remove unused imports/variables
- replace `require()` in tests with `node:` imports
- remove avoidable `any`

- [ ] **Step 3: Re-run lint**

Run: `npm run lint`
Expected: PASS

### Task 5: Full maintainability verification

**Files:**
- Review all changed files from Tasks 1-4

- [ ] **Step 1: Run the full verification entrypoint**

Run: `npm run verify`
Expected: PASS

- [ ] **Step 2: Confirm scope discipline**

The final diff should only cover:

- runtime config and API guards
- layout DB init cleanup
- `.env.example`, README, scripts
- foundational lint fixes
- tests required to prove the above
