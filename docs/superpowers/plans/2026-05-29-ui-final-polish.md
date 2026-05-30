# UI Final Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the remaining product pages and result cards up to the same premium, unified standard as the refreshed core workflows.

**Architecture:** Keep all existing routes and business logic intact, and finish the product through presentation-focused changes: auth/history pages adopt the shared brand system, result cards gain stronger recommendation hierarchy, and global states become more consistent. Verification remains centered on page structure, CSS classes, and full project checks.

**Tech Stack:** Next.js App Router, React client components, TypeScript, global CSS, Vitest, ESLint

---

## File Structure

- Modify: `app/history/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/components/CommentCard.tsx`
- Modify: `app/components/TweetCard.tsx`
- Modify: `app/globals.css`
- Create: `__tests__/ui-final-polish.test.ts`
- Test: `npx vitest run __tests__/ui-final-polish.test.ts`
- Test: `npm run typecheck`
- Test: `npm run lint`
- Test: `npm run verify`

### Task 1: Lock the Final Polish Scope with a Failing UI Test

**Files:**
- Create: `__tests__/ui-final-polish.test.ts`

- [ ] **Step 1: Write the failing test for auth, history, and card polish markers**

Create a file that reads the relevant source files and asserts the presence of the new final-polish class markers:

```ts
expect(loginPage).toContain("auth-hero")
expect(historyPage).toContain("history-stage")
expect(commentCard).toContain("result-card-top")
expect(tweetCard).toContain("result-card-top")
expect(css).toContain(".auth-hero")
expect(css).toContain(".history-stage")
expect(css).toContain(".result-card-top")
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx vitest run __tests__/ui-final-polish.test.ts`

Expected: FAIL because the new auth/history/card polish markers do not exist yet

### Task 2: Upgrade Login and Register into Branded Entry Pages

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Add the new auth hero structure to login**

Update the login page card header so it feels like entry into the workspace, for example:

```tsx
<div className="auth-hero">
  <span className="auth-kicker">Workspace Access</span>
  <h1 className="auth-title">回到你的评论与推文工作台</h1>
  <p className="auth-subtitle">登录后继续生成、润色和回看你之前的输出结果。</p>
</div>
```

- [ ] **Step 2: Add the same auth hero system to register**

Use the same pattern on register with account-creation framing:

```tsx
<div className="auth-hero">
  <span className="auth-kicker">Create Access</span>
  <h1 className="auth-title">创建账号，保存你的输出资产</h1>
  <p className="auth-subtitle">注册后可保留历史记录，在同一工作台里继续生成和整理内容。</p>
</div>
```

- [ ] **Step 3: Run typecheck after auth page edits**

Run: `npm run typecheck`

Expected: command exits `0`

### Task 3: Upgrade History into a Workspace Asset Page

**Files:**
- Modify: `app/history/page.tsx`

- [ ] **Step 1: Add the new history-stage header and empty-state framing**

Reshape the page header so it feels like an asset library:

```tsx
<section className="history-stage">
  <div className="history-stage-copy">
    <span className="history-stage-kicker">Output Archive</span>
    <h1 className="history-title">你的评论资产与生成记录</h1>
    <p>这里保留你生成过的内容，方便回看、复制和继续整理。</p>
  </div>
</section>
```

- [ ] **Step 2: Make each history card feel more editorial**

Add a content header / meta wrapper and stronger empty/result grouping while keeping actions unchanged.

- [ ] **Step 3: Run typecheck after history page edits**

Run: `npm run typecheck`

Expected: command exits `0`

### Task 4: Upgrade Comment and Tweet Cards into Recommended Output Cards

**Files:**
- Modify: `app/components/CommentCard.tsx`
- Modify: `app/components/TweetCard.tsx`

- [ ] **Step 1: Add shared premium card structure to CommentCard**

Wrap the tags and copy in stronger hierarchy classes:

```tsx
<div className="result-item result-card-premium">
  <div className="result-card-top">...</div>
  <div className="result-card-copy">...</div>
</div>
```

- [ ] **Step 2: Apply the same premium card structure to TweetCard**

Use the same shared classes so both cards visually belong to one system.

- [ ] **Step 3: Run the targeted test to verify the new structure passes**

Run: `npx vitest run __tests__/ui-final-polish.test.ts`

Expected: PASS

### Task 5: Install the Shared Final Polish CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add auth hero styles**

Add styles for:

```css
.auth-hero {}
.auth-kicker {}
```

- [ ] **Step 2: Add history-stage styles**

Add styles for:

```css
.history-stage {}
.history-stage-copy {}
.history-stage-kicker {}
```

- [ ] **Step 3: Add premium result-card styles**

Add styles for:

```css
.result-card-premium {}
.result-card-top {}
.result-card-copy {}
```

- [ ] **Step 4: Run lint after the CSS pass**

Run: `npm run lint`

Expected: command exits `0`

### Task 6: Verify the Final Polish End-to-End

**Files:**
- Modify: `app/history/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/components/CommentCard.tsx`
- Modify: `app/components/TweetCard.tsx`
- Modify: `app/globals.css`
- Create: `__tests__/ui-final-polish.test.ts`

- [ ] **Step 1: Run the full project verification**

Run: `npm run verify`

Expected:

- all tests pass
- `tsc --noEmit` passes
- `eslint` passes

- [ ] **Step 2: Confirm the local preview target is still serving**

Run: `curl -I http://localhost:3000`

Expected: a successful HTTP response header from the local Next.js app
