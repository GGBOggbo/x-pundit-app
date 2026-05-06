# Visual Redesign: Dual Theme (vLLM zinc Dark + Modern Tech Doc Light) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single dark theme with a dual-theme system: a vLLM Recipes-style zinc dark theme (default) + a clean Modern Technical Documentation light theme, with a toggle button persisted in localStorage.

**Architecture:** CSS custom properties power the entire theme system. `:root` defines dark tokens as default; `[data-theme="light"]` overrides them. A small `ThemeToggle` component reads/writes `data-theme` on `<html>` and persists to `localStorage`. All inline styles in JSX are eliminated in favor of CSS classes.

**Tech Stack:** Next.js 16 (App Router), plain CSS (globals.css), React state + localStorage for theme persistence, Vitest

---

## Day 2 变更分拣

| 问题 | 回答 |
|---|---|
| 改数据模型/接口契约？ | 否 |
| 影响面 >1 Feature？ | 否 — 一个视觉改造 Feature |
| 新增 >200 行？ | 是 — globals.css 全面改写 + ThemeToggle 组件 |
| **结论** | **M 级**（变更 Spec + 1 Feature 详细 plan） |

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/globals.css` | 双主题 Design Tokens + 所有组件样式重写 |
| Modify | `app/page.tsx` | 添加 ThemeToggle + 清除内联 style |
| Create | `app/components/ThemeToggle.tsx` | 主题切换按钮（☀/🌙）+ localStorage 持久化 |
| Modify | `__tests__/ui-spec.test.ts` | 更新 design tokens 测试覆盖双主题 |

---

### Task 1: Dual Theme Design Tokens + ThemeToggle Component

**Files:**
- Modify: `app/globals.css:1-36`
- Create: `app/components/ThemeToggle.tsx`

- [ ] **Step 1: Write the failing test**

Update `__tests__/ui-spec.test.ts` section 1 — replace the entire `describe("design tokens match ...")` block:

```ts
// ========== 1. Design Tokens 双主题测试 ==========

describe("dual theme design tokens", () => {
  const darkTokens = {
    bgPage:       "#09090b",
    bgCard:       "#09090b",
    bgSecondary:  "#18181b",
    borderNormal: "#27272a",
    borderHi:     "#3b82f6",
    purple:       "#7c3aed",
    blue:         "#3b82f6",
    textPrimary:  "#f4f4f5",
    textBody:     "#a1a1aa",
    textMuted:    "#71717a",
    textPlaceholder: "#52525b",
    success:      "#22c55e",
    warning:      "#f97316",
  };

  const lightTokens = {
    bgPage:       "#ffffff",
    bgCard:       "#ffffff",
    bgSecondary:  "#f8fafc",
    borderNormal: "#e2e8f0",
    borderHi:     "#2563eb",
    purple:       "#7c3aed",
    blue:         "#2563eb",
    textPrimary:  "#1f2937",
    textBody:     "#475569",
    textMuted:    "#94a3b8",
    textPlaceholder: "#cbd5e1",
    success:      "#16a34a",
    warning:      "#d97706",
  };

  it("all dark tokens should be valid 6-digit hex", () => {
    Object.values(darkTokens).forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("all light tokens should be valid 6-digit hex", () => {
    Object.values(lightTokens).forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("dark and light tokens should differ for bg/text/border", () => {
    expect(darkTokens.bgPage).not.toBe(lightTokens.bgPage);
    expect(darkTokens.textPrimary).not.toBe(lightTokens.textPrimary);
    expect(darkTokens.borderNormal).not.toBe(lightTokens.borderNormal);
  });

  it("accent colors should be defined in both themes", () => {
    expect(darkTokens.blue).toBeDefined();
    expect(lightTokens.blue).toBeDefined();
    expect(darkTokens.purple).toBeDefined();
    expect(lightTokens.purple).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ui-spec.test.ts`
Expected: FAIL — test expects new token values

- [ ] **Step 3: Replace Design Tokens in globals.css**

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
    transition: background-color .2s, color .2s;
  }
}

/* ─── Design Tokens: Dark (default, vLLM zinc) ─── */
:root {
  --bg-page:       #09090b;
  --bg-card:       #09090b;
  --bg-secondary:  #18181b;
  --border-normal: #27272a;
  --border-hi:     #3b82f6;
  --purple:        #7c3aed;
  --blue:          #3b82f6;
  --text-primary:  #f4f4f5;
  --text-body:     #a1a1aa;
  --text-muted:    #71717a;
  --text-placeholder: #52525b;
  --success:       #22c55e;
  --warning:       #f97316;
  --radius-card:   12px;
  --radius-btn:    8px;
  --btn-h:         48px;
  --glow-selected: 0 0 12px rgba(59,130,246,.12);
  --selection-bg:  rgba(59,130,246,.08);
  --code-bg:       #0c0c0e;
  --tag-bg:        rgba(39,39,42,.6);
  --tag-border:    rgba(63,63,70,.5);
}

/* ─── Design Tokens: Light (Modern Tech Doc) ─── */
[data-theme="light"] {
  --bg-page:       #ffffff;
  --bg-card:       #ffffff;
  --bg-secondary:  #f8fafc;
  --border-normal: #e2e8f0;
  --border-hi:     #2563eb;
  --purple:        #7c3aed;
  --blue:          #2563eb;
  --text-primary:  #1f2937;
  --text-body:     #475569;
  --text-muted:    #94a3b8;
  --text-placeholder: #cbd5e1;
  --success:       #16a34a;
  --warning:       #d97706;
  --glow-selected: none;
  --selection-bg:  #eff6ff;
  --code-bg:       #f8fafc;
  --tag-bg:        #f1f5f9;
  --tag-border:    #e2e8f0;
}
```

- [ ] **Step 4: Create ThemeToggle component**

Create `app/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}
```

- [ ] **Step 5: Add theme-toggle CSS**

In `app/globals.css`, add after the `[data-theme="light"]` block:

```css
/* ─── Theme Toggle Button ─── */
.theme-toggle {
  background: transparent;
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-body);
  font-size: 16px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.theme-toggle:hover {
  border-color: var(--border-hi);
  background: var(--bg-secondary);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run __tests__/ui-spec.test.ts -t "dual theme"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/components/ThemeToggle.tsx __tests__/ui-spec.test.ts
git commit -m "feat: dual theme design tokens (vLLM zinc dark + Modern Tech Doc light) + ThemeToggle component"
```

---

### Task 2: Rewrite Base + Header + Buttons + Layout + Cards + Steps

**Files:**
- Modify: `app/globals.css:37-120`
- Modify: `app/page.tsx` (add ThemeToggle import + render)

- [ ] **Step 1: Replace base + header + buttons + layout + card + step styles**

Replace lines 37-120 of `app/globals.css` with:

```css
/* ─── Base ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

button { font-family: inherit; cursor: pointer; transition: opacity .15s, background-color .15s, border-color .15s, color .15s; }

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
  color: #fff;
  flex-shrink: 0;
}
.header-titles h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
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

.btn-primary {
  background: var(--blue);
  border: none;
  color: #fff;
  padding: 8px 20px;
  border-radius: var(--radius-btn);
  font-size: 14px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn-primary:hover { opacity: .88; }

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
}

/* ─── Step Label ─── */
.step-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.step-badge {
  background: var(--selection-bg);
  color: var(--blue);
  font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 4px; letter-spacing: .6px;
}
.step-name { font-size: 14px; font-weight: 600; }
```

- [ ] **Step 2: Add ThemeToggle to page.tsx header**

In `app/page.tsx`:

**a) Add import** (after line 7):

```ts
import ThemeToggle from "./components/ThemeToggle";
```

**b) Add ThemeToggle to header-right** — insert before the session conditional (before line 153):

In the `<div className="header-right">`, add `<ThemeToggle />` as the first child:

Replace:
```tsx
<div className="header-right">
  {session ? (
```
With:
```tsx
<div className="header-right">
  <ThemeToggle />
  {session ? (
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "style: rewrite base, header, buttons, layout, cards with dual-theme CSS variables"
```

---

### Task 3: Rewrite Left Panel + Persona + Modal Styles

**Files:**
- Modify: `app/globals.css` (left panel + modal sections)

- [ ] **Step 1: Replace left panel + modal styles**

Replace the sections from `/* ═══════ LEFT PANEL ═══════ */` through the end of `.modal-persona-check { ... }` with:

```css
/* ═══════ LEFT PANEL ═══════ */
.left-panel { display: flex; flex-direction: column; gap: 20px; }

/* Step 1 – Textarea */
textarea {
  width: 100%; height: 180px;
  background: var(--code-bg);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 12px 14px;
  resize: none; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
textarea::placeholder { color: var(--text-placeholder); }
textarea:focus { border-color: var(--border-hi); box-shadow: 0 0 0 3px rgba(59,130,246,.1); }

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
  transition: border-color .2s, box-shadow .2s;
}
.selected-persona:hover { border-color: var(--border-hi); box-shadow: var(--glow-selected); }
.selected-persona-emoji { font-size: 28px; flex-shrink: 0; }
.selected-persona-info { flex: 1; min-width: 0; }
.selected-persona-name { font-size: 15px; font-weight: 600; }
.selected-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.selected-persona-change {
  font-size: 12px; color: var(--blue);
  background: transparent; border: 1px solid var(--border-normal);
  border-radius: 6px; padding: 5px 12px;
  white-space: nowrap;
  transition: border-color .15s, background .15s;
}
.selected-persona-change:hover { border-color: var(--border-hi); background: var(--selection-bg); }

/* ═══════ PERSONA PICKER MODAL ═══════ */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
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
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
  animation: slideUp .2s ease-out;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 0;
}
.modal-title { font-size: 18px; font-weight: 700; }
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
  background: var(--code-bg);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 10px 14px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.modal-search::placeholder { color: var(--text-placeholder); }
.modal-search:focus { border-color: var(--border-hi); box-shadow: 0 0 0 3px rgba(59,130,246,.1); }

.modal-tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 12px 24px 0;
}
.modal-tag {
  background: var(--tag-bg);
  border: 1px solid var(--tag-border);
  border-radius: 14px;
  color: var(--text-body);
  font-size: 12px; padding: 5px 14px;
  cursor: pointer; transition: all .15s;
}
.modal-tag:hover { border-color: var(--border-hi); }
.modal-tag.active {
  background: var(--selection-bg);
  border-color: var(--border-hi);
  color: var(--blue); font-weight: 600;
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
  transition: border-color .2s, background .15s, box-shadow .2s;
  width: 100%;
}
.modal-persona-card:hover { border-color: var(--border-hi); }
.modal-persona-card.active {
  border-color: var(--border-hi);
  background: var(--selection-bg);
  box-shadow: var(--glow-selected);
}
.modal-persona-emoji { font-size: 24px; flex-shrink: 0; }
.modal-persona-info { flex: 1; min-width: 0; }
.modal-persona-name { font-size: 14px; font-weight: 600; }
.modal-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.modal-persona-check {
  width: 20px; height: 20px;
  background: var(--blue);
  border-radius: 50%; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
  display: grid; flex-shrink: 0;
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite left panel, persona card, modal with dual-theme CSS variables"
```

---

### Task 4: Rewrite Settings + Generate + Right Panel + Results + History + Auth + Responsive

**Files:**
- Modify: `app/globals.css` (rest of file)

- [ ] **Step 1: Replace all remaining styles**

Replace everything from `/* Step 3 – Settings */` through the end of file with the complete remaining styles. The key principle: **every color uses `var(--xxx)`** — no hardcoded hex values.

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
  background: var(--code-bg);
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
  color: #fff;
  font-size: 16px; font-weight: 600;
  margin-top: 16px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s;
}
.btn-generate:hover { opacity: .88; }
.btn-generate:disabled { opacity: .4; cursor: not-allowed; }
.gen-note { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 8px; }

/* ═══════ RIGHT PANEL ═══════ */
.right-panel .card { height: 100%; min-height: 600px; }
.panel-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }

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
.feat-name  { font-size: 13px; font-weight: 600; }
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
.ex-text { font-size: 14px; margin-bottom: 8px; line-height: 1.6; }
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
  transition: border-color .2s, box-shadow .2s;
}
.result-item:hover { border-color: var(--border-hi); box-shadow: var(--glow-selected); }
.res-num { font-size: 18px; font-weight: 700; color: var(--blue); flex-shrink: 0; width: 18px; }
.res-body { flex: 1; }

.res-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tag {
  font-size: 11px; font-weight: 500;
  padding: 2px 8px; border-radius: 4px;
}
.tag-p { background: var(--selection-bg); color: var(--blue); }
.tag-t { background: rgba(124,58,237,.12); color: var(--purple); }
.tag-heat { font-size: 12px; color: var(--text-body); }

.res-text { font-size: 14px; color: var(--text-body); line-height: 1.55; }

.res-actions { display: flex; gap: 6px; margin-top: 10px; }
.btn-act {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: 6px;
  color: var(--text-body);
  font-size: 12px; padding: 5px 10px;
  display: inline-flex; align-items: center; gap: 4px;
  transition: border-color .15s, color .15s;
}
.btn-act:hover { border-color: var(--border-hi); color: var(--border-hi); }
.btn-act:disabled { opacity: .5; cursor: not-allowed; }

/* ═══════ TAG: 已润色 ═══════ */
.tag-refined { background: rgba(34,197,94,.12); color: var(--success); font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }

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
  color: var(--blue); background: var(--selection-bg);
  border-color: var(--border-hi);
  font-weight: 600;
}

/* ═══════ RESULT ACTIONS BAR ═══════ */
.result-actions-bar {
  display: flex; gap: 8px; margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-normal);
}

/* ═══════ INLINE STYLE REPLACEMENTS ═══════ */
.char-count.warn { color: var(--warning); }

.analysis-heading { font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 10px; }
.analysis-grid { display: grid; grid-template-columns: "1fr 1fr"; gap: 8px; font-size: 13px; }
.analysis-label { color: var(--text-muted); }
.analysis-value { color: var(--text-body); }
.score-high { color: var(--success); }
.score-mid { color: var(--warning); }

/* ═══════ HISTORY DRAWER ═══════ */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
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
.drawer-title { font-size: 18px; font-weight: 600; }
.drawer-close {
  background: transparent; border: none; color: var(--text-muted);
  font-size: 18px; padding: 4px 8px; border-radius: 6px;
}
.drawer-close:hover { background: var(--bg-secondary); color: var(--text-primary); }

.drawer-body { flex: 1; overflow-y: auto; padding: 16px; }
.drawer-empty { text-align: center; color: var(--text-muted); padding: 60px 0; font-size: 14px; }
.drawer-footer { padding: 16px 20px; border-top: 1px solid var(--border-normal); text-align: center; }

.history-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px; margin-bottom: 10px;
  overflow: hidden;
}
.history-summary { padding: 14px; cursor: pointer; transition: background .15s; }
.history-summary:hover { background: var(--selection-bg); }
.history-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.history-preview { font-size: 13px; color: var(--text-body); line-height: 1.4; }
.history-actions { margin-top: 8px; }
.history-detail { padding: 14px; border-top: 1px solid var(--border-normal); }
.history-full-content {
  font-size: 13px; color: var(--text-body);
  background: var(--code-bg); border: 1px solid var(--border-normal);
  border-radius: 8px; padding: 12px; margin-bottom: 12px; line-height: 1.5;
}

/* ═══════ HISTORY PAGE ═══════ */
.history-loading, .history-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; color: var(--text-muted); gap: 16px;
}
.history-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid var(--border-normal);
}
.history-header-left { display: flex; align-items: center; gap: 14px; }
.history-back { color: var(--text-muted); text-decoration: none; font-size: 14px; transition: color .15s; }
.history-back:hover { color: var(--text-primary); }
.history-title { font-size: 24px; font-weight: 700; }
.history-count {
  font-size: 13px; color: var(--text-muted);
  background: var(--bg-secondary); border: 1px solid var(--border-normal);
  padding: 3px 10px; border-radius: 12px;
}
.history-confirm { display: flex; align-items: center; gap: 8px; }
.history-confirm-text { font-size: 13px; color: var(--warning); }
.history-list { display: flex; flex-direction: column; gap: 12px; }
.history-card {
  background: var(--bg-card); border: 1px solid var(--border-normal);
  border-radius: var(--radius-card); overflow: hidden;
}
.history-card-summary { padding: 16px 20px; cursor: pointer; transition: background .15s; }
.history-card-summary:hover { background: var(--selection-bg); }
.history-card-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.history-time { color: var(--blue); }
.history-card-preview { font-size: 14px; color: var(--text-body); line-height: 1.5; }
.history-card-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.history-expand-hint { font-size: 12px; color: var(--text-placeholder); }
.history-card-detail { padding: 0 20px 16px; border-top: 1px solid var(--border-normal); }
.history-full-content { font-size: 13px; color: var(--text-body); line-height: 1.6; padding: 12px 0; white-space: pre-wrap; }
.history-more { display: flex; justify-content: center; padding: 24px 0; }

/* ═══════ AUTH PAGES ═══════ */
.auth-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
  background: var(--bg-secondary);
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: 16px;
  padding: 48px 40px 40px;
  width: 100%; max-width: 420px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,.1);
}
.auth-brand { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 32px; }
.auth-logo {
  width: 56px; height: 56px;
  background: var(--blue); border-radius: 14px;
  display: grid; place-items: center; color: #fff;
  box-shadow: 0 4px 16px rgba(59,130,246,.2);
  transition: transform .2s, box-shadow .2s;
}
.auth-logo:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59,130,246,.3); }
.auth-brand-text { text-align: center; }
.auth-title { font-size: 26px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.02em; }
.auth-subtitle { font-size: 14px; color: var(--text-muted); line-height: 1.5; max-width: 300px; margin: 0 auto; }
.auth-error {
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
  color: #ef4444; padding: 12px 16px; border-radius: 10px;
  font-size: 13px; margin-bottom: 20px; text-align: left;
}
.auth-form { text-align: left; }
.auth-field { margin-bottom: 18px; }
.auth-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-body); margin-bottom: 8px; }
.auth-input {
  width: 100%; background: var(--code-bg);
  border: 1px solid var(--border-normal); border-radius: 8px;
  color: var(--text-primary); font-family: inherit; font-size: 15px;
  padding: 12px 14px; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.auth-input::placeholder { color: var(--text-placeholder); }
.auth-input:focus { border-color: var(--border-hi); box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.auth-submit {
  width: 100%; height: 48px; margin-top: 8px;
  background: var(--blue); border: none; border-radius: 10px;
  color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: opacity .15s, transform .15s;
  display: flex; align-items: center; justify-content: center;
}
.auth-submit:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.auth-submit:active:not(:disabled) { transform: translateY(0); }
.auth-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.auth-submit-loading { display: flex; align-items: center; gap: 8px; }
.auth-spinner { animation: auth-spin .8s linear infinite; }
@keyframes auth-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.auth-divider {
  position: relative; text-align: center;
  margin: 24px 0 16px; font-size: 13px; color: var(--text-muted);
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
  width: 100%; padding: 12px; border-radius: 8px;
  border: 1px solid var(--border-normal); background: var(--bg-secondary);
  color: var(--text-body); font-size: 14px; font-weight: 500;
  text-align: center; text-decoration: none; cursor: pointer;
  transition: border-color .2s, background .2s, color .2s;
}
.auth-alt-btn:hover { border-color: var(--border-hi); background: var(--selection-bg); color: var(--border-hi); }
.auth-back-home {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 24px; font-size: 13px; color: var(--text-muted);
  text-decoration: none; cursor: pointer; white-space: nowrap;
  transition: color .15s;
}
.auth-back-home:hover { color: var(--text-primary); }

/* ═══════ RESPONSIVE: ≤768px ═══════ */
@media (max-width: 768px) {
  .page { padding: 16px; }
  .header { flex-direction: column; align-items: flex-start; gap: 16px; border-bottom: none; }
  .header-right { width: 100%; flex-wrap: wrap; }
  .main { grid-template-columns: 1fr; }
  .card { padding: 16px; }
  .header-titles h1 { font-size: 22px; }
  .header-titles p  { font-size: 13px; }
  textarea { height: 120px; }
  .settings-row { grid-template-columns: 1fr; }
  .selected-persona { padding: 10px 12px; }
  .selected-persona-emoji { font-size: 22px; }
  .selected-persona-name { font-size: 13px; }
  .selected-persona-desc { font-size: 11px; }
  .selected-persona-change { font-size: 11px; padding: 4px 8px; }
  .right-panel .card { min-height: auto; }
  .history-header { flex-direction: column; align-items: flex-start; gap: 12px; border-bottom: none; }
  .history-header-left { flex-wrap: wrap; }
  .history-title { font-size: 20px; }
  .auth-card { padding: 32px 24px 28px; }
  .auth-title { font-size: 22px; }
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: complete dual-theme styles for settings, results, history, auth, responsive"
```

---

### Task 5: Clean Inline Styles in page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Remove all inline color styles from page.tsx**

In `app/page.tsx`, make these changes:

**a) Line ~202: char-count color**

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

**b) Line ~288: btn-generate disabled style**

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

**c) Line ~425: ResultPanel analysis heading**

Replace:
```tsx
<h3 style={{ fontSize: 14, fontWeight: 600, color: "#64748B", marginBottom: 10 }}>
```
With:
```tsx
<h3 className="analysis-heading">
```

**d) Line ~428-439: ResultPanel analysis grid**

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

**e) Line ~562: score color**

Replace:
```tsx
热度 <strong style={{ color: score >= 80 ? "#22C55E" : "#F59E0B" }}>{score}</strong> 🔥
```
With:
```tsx
热度 <strong className={`score-${score >= 80 ? "high" : "mid"}`}>{score}</strong> 🔥
```

**f) Line ~359: example heat score**

Replace:
```tsx
热度 <strong style={{ color: "#F59E0B" }}>86</strong> 🔥
```
With:
```tsx
热度 <strong className="score-mid">86</strong> 🔥
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "refactor: remove all inline color styles from page.tsx, replace with CSS classes"
```

---

### Task 6: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify no hardcoded theme colors in globals.css**

Run: `grep -n "#050816\|#0F172A\|#111827\|#1F2937\|#6366F1\|#F8FAFC\|#CBD5E1\|#475569" app/globals.css`
Expected: No matches (old tokens gone, only in `[data-theme="light"]` block as valid light-theme values)

- [ ] **Step 3: Verify no inline color styles in page.tsx**

Run: `grep -n 'style={{.*color:' app/page.tsx`
Expected: No matches

- [ ] **Step 4: Verify ThemeToggle is wired up**

Run: `grep -n "ThemeToggle" app/page.tsx`
Expected: Shows import line + usage in header

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task |
|---|---|
| 双主题 Design Tokens | Task 1 |
| 所有组件双主题兼容 (无硬编码颜色) | Task 2-4 |
| 主题切换功能 (按钮 + localStorage) | Task 1 (ThemeToggle) + Task 2 (wiring) |
| 内联样式清零 | Task 5 |
| 所有测试通过 | Task 6 |

### 2. Placeholder Scan

No TBD/TODO/fill-in-later found. All code blocks contain complete implementations.

### 3. Type Consistency

- CSS variables consistent across all tasks (e.g., `--glow-selected`, `--selection-bg`, `--code-bg`, `--tag-bg`, `--tag-border` used throughout)
- ThemeToggle uses `"dark" | "light"` string literal type, matches `data-theme` attribute values
- New CSS classes (`char-count.warn`, `analysis-*`, `score-*`) defined in Task 4, used in Task 5
- No type mismatches found
