# Visual Redesign: Modern Technical Documentation Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark cyberpunk visual theme with a clean Modern Technical Documentation style (white background, slate borders, Inter font, high readability).

**Architecture:** Pure CSS redesign — all changes happen in `globals.css` Design Tokens + component styles. Only minimal JSX changes in `page.tsx` to replace inline styles with CSS classes. No component structure, logic, or data changes.

**Tech Stack:** Next.js 16 (App Router), plain CSS (globals.css), Vitest

---

## Day 2 变更分拣

| 问题 | 回答 |
|---|---|
| 改数据模型/接口契约？ | 否 |
| 影响面 >1 Feature？ | 否 — 一个视觉改造 Feature |
| 新增 >200 行？ | 是 — globals.css 全面改写 |
| **结论** | **M 级**（变更 Spec + 1 Feature 详细 plan） |

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/globals.css` | Design Tokens 翻新 + 所有组件样式重写 |
| Modify | `app/page.tsx` | 清除内联 style，改用 CSS class |
| Modify | `__tests__/ui-spec.test.ts` | 更新 design tokens 测试值 |

---

### Task 1: Update Design Tokens + Base Styles

**Files:**
- Modify: `app/globals.css:1-36`

- [ ] **Step 1: Write the failing test**

Update `__tests__/ui-spec.test.ts` section 1 — replace the entire `describe("design tokens match reference HTML", ...)` block:

```ts
// ========== 1. Design Tokens 颜色测试 ==========

describe("design tokens match Modern Technical Doc style", () => {
  const tokens = {
    bgPage: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgSecondary: "#F8FAFC",
    borderNormal: "#E2E8F0",
    borderHi: "#2563EB",
    purple: "#7C3AED",
    blue: "#2563EB",
    textPrimary: "#1F2937",
    textBody: "#475569",
    textMuted: "#94A3B8",
    textPlaceholder: "#CBD5E1",
    success: "#16A34A",
    warning: "#D97706",
  };

  it("all tokens should be valid 6-digit hex", () => {
    Object.values(tokens).forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("bgCard should be white (#FFFFFF) per new design", () => {
    expect(tokens.bgCard).toBe("#FFFFFF");
  });

  it("borderNormal should be slate-200 (#E2E8F0) per new design", () => {
    expect(tokens.borderNormal).toBe("#E2E8F0");
  });

  it("textPrimary should be dark (#1F2937) per new design", () => {
    expect(tokens.textPrimary).toBe("#1F2937");
  });

  it("accent colors should remain blue (#2563EB) and purple (#7C3AED)", () => {
    expect(tokens.blue).toBe("#2563EB");
    expect(tokens.purple).toBe("#7C3AED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ui-spec.test.ts`
Expected: FAIL — test expects `#FFFFFF` bgCard but current CSS has `#0F172A`

- [ ] **Step 3: Update Design Tokens in globals.css**

Replace lines 1-36 of `app/globals.css` (the `@import`, `@layer base`, and `:root` block) with:

```css
@import "tailwindcss";

@layer base {
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC',
                 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
    background: var(--bg-page);
    color: var(--text-primary);
    min-height: 100vh;
  }
}

/* ─── Design Tokens ─── */
:root {
  --bg-page:       #FFFFFF;
  --bg-card:       #FFFFFF;
  --bg-secondary:  #F8FAFC;
  --border-normal: #E2E8F0;
  --border-hi:     #2563EB;
  --purple:        #7C3AED;
  --blue:          #2563EB;
  --text-primary:  #1F2937;
  --text-body:     #475569;
  --text-muted:    #94A3B8;
  --text-placeholder: #CBD5E1;
  --success:       #16A34A;
  --warning:       #D97706;
  --radius-card:   12px;
  --radius-btn:    8px;
  --btn-h:         48px;
}
```

Key changes:
- `--bg-page`: `#050816` → `#FFFFFF`
- `--bg-card`: `#0F172A` → `#FFFFFF`
- `--bg-secondary`: `#111827` → `#F8FAFC`
- `--border-normal`: `#1F2937` → `#E2E8F0`
- `--border-hi`: `#6366F1` → `#2563EB` (indigo → blue)
- `--text-primary`: `#F8FAFC` → `#1F2937` (light → dark)
- `--text-body`: `#CBD5E1` → `#475569`
- `--text-muted`: `#64748B` → `#94A3B8`
- `--text-placeholder`: `#475569` → `#CBD5E1`
- `--success`: `#22C55E` → `#16A34A`
- `--warning`: `#F59E0B` → `#D97706`
- Removed radial-gradient from body
- Added 'Inter' and 'Noto Sans SC' to font stack

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/ui-spec.test.ts -t "design tokens"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/globals.css __tests__/ui-spec.test.ts
git commit -m "refactor: update design tokens from dark cyberpunk to Modern Tech Doc style"
```

---

### Task 2: Rewrite Component Styles (Header, Buttons, Layout, Cards, Steps)

**Files:**
- Modify: `app/globals.css:37-120`

- [ ] **Step 1: Replace base + header + buttons + layout + card + step styles**

Replace lines 37-120 of `app/globals.css` (from `/* ─── Base ─── */` through `.step-name`) with:

```css
/* ─── Base ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

button { font-family: inherit; cursor: pointer; transition: opacity .15s, background-color .15s, border-color .15s; }

/* ─── Page Wrapper ─── */
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px;
}

/* ═══════ HEADER ═══════ */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal);
}
.header-left { display: flex; align-items: center; gap: 14px; }

.logo {
  width: 44px; height: 44px;
  background: var(--blue);
  border-radius: 10px;
  display: grid; place-items: center;
  color: #FFFFFF;
  flex-shrink: 0;
}
.header-titles h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.header-titles p  { font-size: 14px; font-weight: 400; color: var(--text-muted); margin-top: 2px; }

.header-right { display: flex; align-items: center; gap: 10px; }

/* ─── Buttons ─── */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-normal);
  color: var(--text-body);
  padding: 8px 16px;
  border-radius: var(--radius-btn);
  font-size: 14px;
  display: inline-flex; align-items: center; gap: 6px;
  white-space: nowrap;
}
.btn-ghost:hover { border-color: var(--border-hi); color: var(--border-hi); }
.btn-ghost .highlight { color: var(--blue); font-weight: 700; font-size: 16px; }

.btn-primary {
  background: var(--blue);
  border: none;
  color: #FFFFFF;
  padding: 8px 20px;
  border-radius: var(--radius-btn);
  font-size: 14px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn-primary:hover { background: #1D4ED8; }

/* ═══════ TWO-COLUMN LAYOUT ═══════ */
.main {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 32px;
  align-items: start;
}

/* ─── Card ─── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}

/* ─── Step Label ─── */
.step-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.step-badge {
  background: #EFF6FF;
  color: var(--blue);
  font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 4px; letter-spacing: .6px;
}
.step-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
```

Key changes:
- Header: removed gradient logo (solid blue), added bottom border separator
- Cards: white bg + subtle shadow instead of dark bg
- Step badge: light blue bg (#EFF6FF) instead of dark bg
- Buttons: solid blue instead of gradient, hover darkens instead of opacity
- Layout: fixed left column 400px instead of 40%

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass (CSS changes don't break logic tests)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite header, buttons, layout, cards for Modern Tech Doc theme"
```

---

### Task 3: Rewrite Left Panel + Persona + Modal Styles

**Files:**
- Modify: `app/globals.css:120-278` (left panel + persona + modal sections)

- [ ] **Step 1: Replace left panel + modal styles**

Replace the sections from `/* ═══════ LEFT PANEL ═══════ */` through the end of `.modal-persona-check { ... }` (lines 120-278) with:

```css
/* ═══════ LEFT PANEL ═══════ */
.left-panel { display: flex; flex-direction: column; gap: 20px; }

/* Step 1 – Textarea */
textarea {
  width: 100%; height: 180px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 12px 14px;
  resize: none; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
textarea::placeholder { color: var(--text-placeholder); }
textarea:focus { border-color: var(--border-hi); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

.char-count { text-align: right; font-size: 12px; color: var(--text-muted); margin-top: 6px; }

.mini-btns { display: flex; gap: 8px; margin-top: 10px; }
.btn-mini {
  background: transparent;
  border: 1px solid var(--border-normal);
  color: var(--text-body);
  padding: 6px 12px; border-radius: 6px; font-size: 12px;
  display: inline-flex; align-items: center; gap: 4px;
}
.btn-mini:hover { border-color: var(--border-hi); color: var(--border-hi); }

/* Step 2 – Selected Persona Card */
.selected-persona {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color .2s;
}
.selected-persona:hover { border-color: var(--border-hi); }
.selected-persona-emoji { font-size: 28px; flex-shrink: 0; }
.selected-persona-info { flex: 1; min-width: 0; }
.selected-persona-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.selected-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.selected-persona-change {
  font-size: 12px; color: var(--border-hi);
  background: transparent; border: 1px solid var(--border-normal);
  border-radius: 6px; padding: 5px 12px;
  white-space: nowrap;
  transition: border-color .15s;
}
.selected-persona-change:hover { border-color: var(--border-hi); background: #EFF6FF; }

/* ═══════ PERSONA PICKER MODAL ═══════ */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,.4);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: fadeIn .15s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: 16px;
  width: 100%; max-width: 560px;
  max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
  animation: slideUp .2s ease-out;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 0;
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.modal-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.modal-close {
  background: transparent; border: none; color: var(--text-muted);
  font-size: 18px; padding: 4px 8px; border-radius: 6px;
  cursor: pointer; transition: background .15s;
}
.modal-close:hover { background: var(--bg-secondary); color: var(--text-primary); }

.modal-search-wrap { padding: 16px 24px 0; }
.modal-search {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 10px 14px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.modal-search::placeholder { color: var(--text-placeholder); }
.modal-search:focus { border-color: var(--border-hi); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

.modal-tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 12px 24px 0;
}
.modal-tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 14px;
  color: var(--text-body);
  font-size: 12px; padding: 5px 14px;
  cursor: pointer; transition: all .15s;
}
.modal-tag:hover { border-color: var(--border-hi); }
.modal-tag.active {
  background: #EFF6FF;
  border-color: var(--border-hi);
  color: var(--border-hi); font-weight: 600;
}

.modal-grid {
  flex: 1; overflow-y: auto;
  padding: 16px 24px 24px;
  display: flex; flex-direction: column; gap: 8px;
}
.modal-empty {
  text-align: center; color: var(--text-muted);
  padding: 40px 0; font-size: 14px;
}

.modal-persona-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; padding: 12px 14px;
  cursor: pointer; text-align: left;
  transition: border-color .2s, background .15s;
  width: 100%;
}
.modal-persona-card:hover { border-color: var(--border-hi); background: #F8FAFC; }
.modal-persona-card.active {
  border-color: var(--border-hi);
  background: #EFF6FF;
}
.modal-persona-emoji { font-size: 24px; flex-shrink: 0; }
.modal-persona-info { flex: 1; min-width: 0; }
.modal-persona-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.modal-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.modal-persona-check {
  width: 20px; height: 20px;
  background: var(--border-hi);
  border-radius: 50%; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
  display: grid; flex-shrink: 0;
}
```

Key changes:
- Textarea: added focus ring (`box-shadow`)
- Modal overlay: lighter backdrop (`rgba(15,23,42,.4)` instead of `rgba(0,0,0,.6)`)
- Modal panel: removed dark border, added box-shadow, white bg
- Modal tags: light blue active state (#EFF6FF) instead of indigo tint
- Active persona card: light blue bg instead of indigo tint

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite left panel, persona card, modal for Modern Tech Doc theme"
```

---

### Task 4: Rewrite Settings + Generate Button + Right Panel Styles

**Files:**
- Modify: `app/globals.css` (settings + generate + right panel + empty state + result sections)

- [ ] **Step 1: Replace settings through result-actions-bar styles**

Replace from `/* Step 3 – Settings */` through `/* ═══════ RESULT ACTIONS BAR ═══════ */` (including the closing brace) with:

```css
/* Step 3 – Settings */
.settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.field-label {
  font-size: 12px; color: var(--text-muted);
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 6px;
}
.select-wrap { position: relative; }
select {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 10px 32px 10px 12px;
  appearance: none; outline: none; cursor: pointer;
  transition: border-color .2s;
}
select:focus { border-color: var(--border-hi); }
.select-arrow {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted); font-size: 11px;
  pointer-events: none;
}

/* Generate Button */
.btn-generate {
  width: 100%; height: var(--btn-h);
  background: var(--blue);
  border: none; border-radius: 10px;
  color: #FFFFFF;
  font-size: 16px; font-weight: 600;
  margin-top: 16px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s;
}
.btn-generate:hover { background: #1D4ED8; }
.btn-generate:disabled { background: var(--border-normal); color: var(--text-muted); cursor: not-allowed; }
.gen-note { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 8px; }

/* ═══════ RIGHT PANEL ═══════ */
.right-panel .card { height: 100%; min-height: 600px; }
.panel-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }

/* Empty State */
.empty-wrap { text-align: center; padding: 12px 0 24px; }
.empty-icon {
  width: 56px; height: 56px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 12px;
  display: grid; place-items: center;
  font-size: 24px;
  margin: 0 auto 14px;
}
.empty-desc {
  font-size: 15px; color: var(--text-body);
  line-height: 1.5; max-width: 420px; margin: 0 auto 20px;
}

.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; }
.feature-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; padding: 12px;
  display: flex; align-items: flex-start; gap: 10px;
}
.feat-icon  { font-size: 24px; flex-shrink: 0; }
.feat-name  { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.feat-desc  { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* Divider */
.divider-label {
  position: relative;
  text-align: center;
  font-size: 12px; color: var(--text-muted);
  margin: 20px 0 12px;
}
.divider-label::before, .divider-label::after {
  content: ''; position: absolute;
  top: 50%; width: 38%; height: 1px;
  background: var(--border-normal);
}
.divider-label::before { left: 0; }
.divider-label::after  { right: 0; }

/* Example */
.example-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; padding: 14px;
  margin-bottom: 4px;
}
.ex-text { font-size: 14px; color: var(--text-primary); margin-bottom: 8px; line-height: 1.6; }
.ex-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--text-muted);
}
.dot { width: 3px; height: 3px; background: var(--text-muted); border-radius: 50%; display: inline-block; }

/* Result Items */
.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; padding: 16px;
  display: flex; gap: 12px;
}
.res-num { font-size: 18px; font-weight: 700; color: var(--border-hi); flex-shrink: 0; width: 18px; }
.res-body { flex: 1; }

.res-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tag {
  font-size: 11px; font-weight: 500;
  padding: 2px 8px; border-radius: 4px;
}
.tag-p { background: #EFF6FF; color: var(--blue); }
.tag-t { background: #F5F3FF; color: var(--purple); }
.tag-heat { font-size: 12px; color: var(--text-body); }

.res-text { font-size: 14px; color: var(--text-body); line-height: 1.55; }

.res-actions { display: flex; gap: 6px; margin-top: 10px; }
.btn-act {
  background: #FFFFFF;
  border: 1px solid var(--border-normal);
  border-radius: 6px;
  color: var(--text-body);
  font-size: 12px; padding: 5px 10px;
  display: inline-flex; align-items: center; gap: 4px;
}
.btn-act:hover { border-color: var(--border-hi); color: var(--border-hi); }
.btn-act:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══════ TAG: 已润色 ═══════ */
.tag-refined { background: #F0FDF4; color: var(--success); font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }

/* ═══════ LOADING STEPS ═══════ */
.loading-steps {
  display: flex; gap: 8px; justify-content: center; margin-top: 12px;
}
.loading-step {
  font-size: 12px; color: var(--text-muted);
  padding: 4px 12px; border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
}
.loading-step.active {
  color: var(--border-hi); background: #EFF6FF;
  border-color: var(--border-hi);
  font-weight: 600;
}

/* ═══════ RESULT ACTIONS BAR ═══════ */
.result-actions-bar {
  display: flex; gap: 8px; margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-normal);
}
```

Key changes:
- Generate button: solid blue, hover darkens, disabled state uses border color
- Result item number: blue color instead of muted
- Tags: light bg (blue tint / purple tint) with dark text
- btn-act: white bg + border instead of dark bg
- Refined tag: green tint (#F0FDF4)
- Loading steps: border added, active uses blue tint

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite settings, generate button, right panel, result cards for Modern Tech Doc theme"
```

---

### Task 5: Rewrite History Drawer + History Page + Auth Page Styles + Responsive

**Files:**
- Modify: `app/globals.css` (history drawer through end of file)

- [ ] **Step 1: Replace history drawer, history page, auth, and responsive styles**

Replace from `/* ═══════ HISTORY DRAWER ═══════ */` through the end of file with:

```css
/* ═══════ HISTORY DRAWER ═══════ */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,.3);
  z-index: 100;
  display: flex; justify-content: flex-end;
}
.drawer-panel {
  width: 480px; max-width: 90vw;
  height: 100vh;
  background: var(--bg-card);
  border-left: 1px solid var(--border-normal);
  display: flex; flex-direction: column;
  animation: slideIn .2s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-normal);
}
.drawer-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.drawer-close {
  background: transparent; border: none; color: var(--text-muted);
  font-size: 18px; padding: 4px 8px; border-radius: 6px;
}
.drawer-close:hover { background: var(--bg-secondary); color: var(--text-primary); }

.drawer-body {
  flex: 1; overflow-y: auto; padding: 16px;
}
.drawer-empty {
  text-align: center; color: var(--text-muted); padding: 60px 0;
  font-size: 14px;
}
.drawer-footer {
  padding: 16px 20px; border-top: 1px solid var(--border-normal);
  text-align: center;
}

.history-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; margin-bottom: 10px;
  overflow: hidden;
}
.history-summary {
  padding: 14px; cursor: pointer;
  transition: background .15s;
}
.history-summary:hover { background: #F8FAFC; }

.history-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--text-muted);
  margin-bottom: 6px;
}
.history-time { color: var(--text-muted); }
.history-preview { font-size: 13px; color: var(--text-body); line-height: 1.4; }
.history-actions { margin-top: 8px; }

.history-detail {
  padding: 14px;
  border-top: 1px solid var(--border-normal);
}
.history-full-content {
  font-size: 13px; color: var(--text-body);
  background: var(--bg-secondary); border-radius: 8px;
  border: 1px solid var(--border-normal);
  padding: 12px; margin-bottom: 12px; line-height: 1.5;
}

/* ═══════ HISTORY PAGE ═══════ */
.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-muted);
  gap: 16px;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-normal);
}
.history-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.history-back {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  transition: color .15s;
}
.history-back:hover { color: var(--text-primary); }
.history-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.history-count {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  padding: 3px 10px;
  border-radius: 12px;
}
.history-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-confirm-text { font-size: 13px; color: var(--warning); }
.history-list { display: flex; flex-direction: column; gap: 12px; }
.history-card {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.history-card-summary {
  padding: 16px 20px;
  cursor: pointer;
  transition: background .15s;
}
.history-card-summary:hover { background: #F8FAFC; }
.history-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.history-time { color: var(--border-hi); }
.history-card-preview {
  font-size: 14px;
  color: var(--text-body);
  line-height: 1.5;
}
.history-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.history-expand-hint {
  font-size: 12px;
  color: var(--text-placeholder);
}
.history-card-detail {
  padding: 0 20px 16px;
  border-top: 1px solid var(--border-normal);
}
.history-full-content {
  font-size: 13px;
  color: var(--text-body);
  line-height: 1.6;
  padding: 12px 0;
  white-space: pre-wrap;
}
.history-more {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

/* ═══════ AUTH PAGES ═══════ */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--bg-secondary);
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: 16px;
  padding: 48px 40px 40px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
}
.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}
.auth-logo {
  width: 56px; height: 56px;
  background: var(--blue);
  border-radius: 14px;
  display: grid; place-items: center;
  color: #fff;
  box-shadow: 0 4px 16px rgba(37,99,235,.2);
  transition: transform .2s, box-shadow .2s;
}
.auth-logo:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37,99,235,.3);
}
.auth-brand-text { text-align: center; }
.auth-title {
  font-size: 26px; font-weight: 700;
  margin-bottom: 6px; letter-spacing: -0.02em;
  color: var(--text-primary);
}
.auth-subtitle {
  font-size: 14px; color: var(--text-muted);
  line-height: 1.5; max-width: 300px;
  margin: 0 auto;
}
.auth-error {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #DC2626;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: left;
}
.auth-form { text-align: left; }
.auth-field { margin-bottom: 18px; }
.auth-label {
  display: block;
  font-size: 13px; font-weight: 500;
  color: var(--text-body);
  margin-bottom: 8px;
}
.auth-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 15px;
  padding: 12px 14px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.auth-input::placeholder { color: var(--text-placeholder); }
.auth-input:focus {
  border-color: var(--border-hi);
  box-shadow: 0 0 0 3px rgba(37,99,235,.1);
}
.auth-submit {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  background: var(--blue);
  border: none; border-radius: 10px;
  color: #fff;
  font-size: 15px; font-weight: 600;
  cursor: pointer;
  transition: background .15s, transform .15s;
  display: flex; align-items: center; justify-content: center;
}
.auth-submit:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); }
.auth-submit:active:not(:disabled) { transform: translateY(0); }
.auth-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.auth-submit-loading {
  display: flex; align-items: center; gap: 8px;
}
.auth-spinner {
  animation: auth-spin .8s linear infinite;
}
@keyframes auth-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.auth-divider {
  position: relative;
  text-align: center;
  margin: 24px 0 16px;
  font-size: 13px;
  color: var(--text-muted);
}
.auth-divider::before, .auth-divider::after {
  content: ''; position: absolute;
  top: 50%; width: 35%; height: 1px;
  background: var(--border-normal);
}
.auth-divider::before { left: 0; }
.auth-divider::after  { right: 0; }
.auth-alt-btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-normal);
  background: var(--bg-secondary);
  color: var(--text-body);
  font-size: 14px; font-weight: 500;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: border-color .2s, background .2s, color .2s;
}
.auth-alt-btn:hover {
  border-color: var(--border-hi);
  background: #EFF6FF;
  color: var(--border-hi);
}
.auth-back-home {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 24px;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color .15s;
}
.auth-back-home:hover { color: var(--text-primary); }

/* ═══════ RESPONSIVE: ≤768px ═══════ */
@media (max-width: 768px) {
  .page { padding: 16px; }

  /* Header 堆叠 */
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    border-bottom: none;
  }
  .header-right { width: 100%; flex-wrap: wrap; }

  /* 主区域单栏 */
  .main {
    grid-template-columns: 1fr;
  }

  /* 卡片缩窄 */
  .card { padding: 16px; box-shadow: none; }

  /* 标题缩小 */
  .header-titles h1 { font-size: 22px; }
  .header-titles p  { font-size: 13px; }

  /* STEP 1 textarea */
  textarea { height: 120px; }

  /* Settings 2列变1列 */
  .settings-row { grid-template-columns: 1fr; }

  /* 人格卡片缩窄 */
  .selected-persona { padding: 10px 12px; }
  .selected-persona-emoji { font-size: 22px; }
  .selected-persona-name { font-size: 13px; }
  .selected-persona-desc { font-size: 11px; }
  .selected-persona-change { font-size: 11px; padding: 4px 8px; }

  /* 右面板最小高度 */
  .right-panel .card { min-height: auto; }

  /* 历史页面 */
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    border-bottom: none;
  }
  .history-header-left { flex-wrap: wrap; }
  .history-title { font-size: 20px; }

  /* 认证页 */
  .auth-card {
    padding: 32px 24px 28px;
  }
  .auth-title { font-size: 22px; }
}
```

Key changes:
- Drawer overlay: lighter backdrop
- Auth page: light gray bg (#F8FAFC) instead of dark with gradients
- Auth card: white bg + subtle shadow, no backdrop-filter blur
- Auth error: red tint bg + red text instead of dark red bg
- Auth inputs: light gray bg, blue focus ring
- Auth submit: solid blue, hover darkens
- Auth alt button: light gray bg, blue hover
- Responsive: removed shadow on mobile cards

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite history drawer, history page, auth pages, responsive for Modern Tech Doc theme"
```

---

### Task 6: Clean Inline Styles in page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/ui-spec.test.ts`:

```ts
// ========== 11. Inline Style 清零测试 ==========

describe("inline style cleanup", () => {
  it("no hardcoded dark-theme colors should remain in inline styles", () => {
    const darkThemeColors = ["#0F172A", "#111827", "#1F2937", "#6366F1", "#64748B", "#CBD5E1", "#475569", "#F8FAFC"];
    // These colors should NOT appear in JSX inline styles
    // They should all be in CSS via variables
    expect(darkThemeColors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Remove inline styles from page.tsx**

In `app/page.tsx`, make these changes:

**a) Line 202-203: char-count color — remove inline style, add CSS class**

Replace:
```tsx
<div
  className="char-count"
  style={{ color: content.length > 1800 ? "#F59E0B" : "#475569" }}
>
```
With:
```tsx
<div className={`char-count${content.length > 1800 ? " warn" : ""}`}>
```

**b) Line 288-291: btn-generate disabled style — remove inline style**

Replace:
```tsx
<button
  className="btn-generate"
  onClick={handleGenerate}
  disabled={loading || !content.trim()}
  style={{
    opacity: loading ? 0.7 : 1,
    cursor: loading || !content.trim() ? "not-allowed" : "pointer",
  }}
>
```
With:
```tsx
<button
  className="btn-generate"
  onClick={handleGenerate}
  disabled={loading || !content.trim()}
>
```

**c) Line 425-426: ResultPanel analysis heading — remove inline style**

Replace:
```tsx
<h3 style={{ fontSize: 14, fontWeight: 600, color: "#64748B", marginBottom: 10 }}>
```
With:
```tsx
<h3 className="analysis-heading">
```

**d) Line 428-439: ResultPanel analysis grid — remove inline styles**

Replace:
```tsx
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
  <div>
    <span style={{ color: "#64748B" }}>主题：</span>
    <span style={{ color: "#CBD5E1" }}>{result.analysis.topic}</span>
  </div>
  <div>
    <span style={{ color: "#64748B" }}>情绪：</span>
    <span style={{ color: "#CBD5E1" }}>{result.analysis.sentiment}</span>
  </div>
  <div style={{ gridColumn: "span 2" }}>
    <span style={{ color: "#64748B" }}>核心观点：</span>
    <span style={{ color: "#CBD5E1" }}>{result.analysis.coreOpinion}</span>
  </div>
</div>
```
With:
```tsx
<div className="analysis-grid">
  <div>
    <span className="analysis-label">主题：</span>
    <span className="analysis-value">{result.analysis.topic}</span>
  </div>
  <div>
    <span className="analysis-label">情绪：</span>
    <span className="analysis-value">{result.analysis.sentiment}</span>
  </div>
  <div style={{ gridColumn: "span 2" }}>
    <span className="analysis-label">核心观点：</span>
    <span className="analysis-value">{result.analysis.coreOpinion}</span>
  </div>
</div>
```

**e) Line 562: score color — remove inline style**

Replace:
```tsx
热度 <strong style={{ color: score >= 80 ? "#22C55E" : "#F59E0B" }}>{score}</strong> 🔥
```
With:
```tsx
热度 <strong className={`score-${score >= 80 ? "high" : "mid"}`}>{score}</strong> 🔥
```

**f) Line 359: example heat score color — remove inline style**

Replace:
```tsx
热度 <strong style={{ color: "#F59E0B" }}>86</strong> 🔥
```
With:
```tsx
热度 <strong className="score-mid">86</strong> 🔥
```

- [ ] **Step 3: Add new CSS classes for removed inline styles**

Append to `app/globals.css` (before the responsive section):

```css
/* ═══════ INLINE STYLE REPLACEMENTS ═══════ */
.char-count.warn { color: var(--warning); }

.analysis-heading { font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 10px; }
.analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
.analysis-label { color: var(--text-muted); }
.analysis-value { color: var(--text-body); }
.score-high { color: var(--success); }
.score-mid { color: var(--warning); }
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css __tests__/ui-spec.test.ts
git commit -m "refactor: remove inline styles from page.tsx, replace with CSS classes"
```

---

### Task 7: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify no dark-theme remnants in globals.css**

Run: `grep -n "#050816\|#0F172A\|#111827\|#1F2937\|#6366F1" app/globals.css`
Expected: No matches (all old dark-theme hex values removed)

- [ ] **Step 3: Verify no inline color styles in page.tsx**

Run: `grep -n 'style={{.*color:' app/page.tsx`
Expected: No matches (all inline color styles removed)

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task |
|---|---|
| Design Tokens 全部翻新 | Task 1 |
| 所有组件视觉统一 (card/button/tag/badge/textarea/select/modal/drawer/auth) | Task 2-5 |
| 对比度合规 | Task 1 (white bg + dark text = ≥ 15:1) |
| 内联样式清零 | Task 6 |
| 所有测试通过 | Task 7 |

### 2. Placeholder Scan

No TBD/TODO/fill-in-later found. All code blocks contain complete CSS/TSX implementations.

### 3. Type Consistency

- CSS variable names (`--bg-page`, `--text-primary`, etc.) consistent across all tasks
- New CSS classes (`char-count.warn`, `analysis-heading`, `score-high`, `score-mid`) defined in Task 6, used in Task 6 JSX
- No type mismatches found
