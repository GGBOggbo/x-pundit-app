# Feature 5: 主页集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改造主页 Header 显示认证状态，替换 localStorage 保存为后端 API 保存，删除 HistoryDrawer，创建登录/注册页面。

**Architecture:** 主页通过 `fetch('/api/auth/session')` 获取登录状态。生成后已登录则调 `POST /api/history` 保存。登录页/注册页独立路由。登录成功后触发 localStorage → 后端迁移。

**Tech Stack:** Next.js 16, React 19, NextAuth v5

---

### Task 1: 创建登录页面

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: 创建登录页**

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码错误");
        return;
      }

      // 登录成功，迁移 localStorage
      await migrateOldHistory();

      // 跳转
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      window.location.href = redirect;
    } catch {
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1 className="auth-title">登录</h1>
        <p className="auth-subtitle">登录后可保存历史记录</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="至少 8 位"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="btn-generate"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? "⏳ 登录中..." : "🔑 登录"}
          </button>
        </form>

        <div className="auth-footer">
          没有账号？{" "}
          <a href="/register" className="auth-link">
            注册
          </a>
        </div>
      </div>
    </div>
  );
}

// 迁移 localStorage 旧数据到后端
async function migrateOldHistory() {
  try {
    const localItems = getLocalHistory();
    if (localItems.length === 0) return;

    const result = await migrateLocalHistory(localItems);
    if (result.imported > 0) {
      clearLocalHistory();
    }
  } catch {
    // 迁移失败不影响登录
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add /login page with credentials form and localStorage migration"
```

---

### Task 2: 创建注册页面

**Files:**
- Create: `app/register/page.tsx`

- [ ] **Step 1: 创建注册页**

Create `app/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    setLoading(true);

    try {
      // 1. 注册
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "注册失败");
        return;
      }

      // 2. 自动登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // 注册成功但自动登录失败，手动跳转登录页
        window.location.href = "/login";
        return;
      }

      // 3. 迁移 localStorage
      await migrateOldHistory();

      // 4. 跳转主页
      window.location.href = "/";
    } catch {
      setError("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1 className="auth-title">注册</h1>
        <p className="auth-subtitle">创建账号，保存你的评论历史</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="至少 8 位"
              required
              minLength={8}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="再输入一次"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="btn-generate"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? "⏳ 注册中..." : "🚀 注册"}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？{" "}
          <a href="/login" className="auth-link">
            登录
          </a>
        </div>
      </div>
    </div>
  );
}

async function migrateOldHistory() {
  try {
    const localItems = getLocalHistory();
    if (localItems.length === 0) return;

    const result = await migrateLocalHistory(localItems);
    if (result.imported > 0) {
      clearLocalHistory();
    }
  } catch {
    // 迁移失败不影响注册
  }
}
```

- [ ] **Step 2: 添加认证页面 CSS**

在 `app/globals.css` 末尾追加：

```css
/* ═══════ AUTH PAGES ═══════ */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: var(--radius-card);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}
.auth-logo {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, var(--purple), var(--blue));
  border-radius: 16px;
  display: grid; place-items: center;
  font-size: 24px;
  margin: 0 auto 16px;
}
.auth-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.auth-subtitle { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; }
.auth-error {
  background: rgba(239,68,68,.15);
  color: #FCA5A5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}
.auth-form { text-align: left; }
.auth-field { margin-bottom: 14px; }
.auth-label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.auth-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
  transition: border-color .2s;
}
.auth-input::placeholder { color: var(--text-placeholder); }
.auth-input:focus { border-color: var(--border-hi); }
.auth-footer {
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-muted);
}
.auth-link {
  color: var(--border-hi);
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }
```

- [ ] **Step 3: Commit**

```bash
git add app/register/page.tsx app/globals.css
git commit -m "feat: add /register page and auth page CSS styles"
```

---

### Task 3: 改造主页 — Header 认证状态 + 删除 HistoryDrawer

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 添加 session 获取逻辑**

在 `app/page.tsx` 顶部添加 import：

```tsx
import { useState, useEffect } from "react";
import { createHistoryItem, getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";
```

注意：删除原来的 `getHistory, saveHistoryItem, deleteHistoryItem, clearHistory, buildContentPreview` 导入。

在 `Home()` 函数内添加 session state 和获取逻辑：

```tsx
const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);

useEffect(() => {
  fetch("/api/auth/session")
    .then((r) => r.json())
    .then((data) => {
      if (data?.user?.id) {
        setSession(data);
        // 首次登录后迁移 localStorage
        const localItems = getLocalHistory();
        if (localItems.length > 0) {
          migrateLocalHistory(localItems).then((result) => {
            if (result.imported > 0) clearLocalHistory();
          });
        }
      }
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 2: 修改 Header 按钮**

替换原来的 Header right 部分：

```tsx
<div className="header-right">
  <button className="btn-ghost">
    今日剩余 <span className="highlight">20</span> 次
  </button>
  {session ? (
    <>
      <a href="/history" className="btn-ghost" style={{ textDecoration: "none" }}>
        📋 历史记录
      </a>
      <button
        className="btn-primary"
        onClick={() => {
          fetch("/api/auth/signout", { method: "POST" }).then(() => {
            setSession(null);
            window.location.reload();
          });
        }}
      >
        👋 退出
      </button>
    </>
  ) : (
    <>
      <button
        className="btn-ghost"
        onClick={() => alert("登录后可保存历史记录")}
      >
        📋 历史记录
      </button>
      <a href="/login" className="btn-primary" style={{ textDecoration: "none" }}>
        🔑 登录
      </a>
    </>
  )}
</div>
```

- [ ] **Step 3: 修改 handleGenerate 的保存逻辑**

替换原来的 localStorage 保存为后端 API 保存。将 handleGenerate 中 `if (res.ok)` 块内的历史保存部分替换为：

```tsx
if (res.ok) {
  setResult(data);
  setResultPersona({ name: currentPersona.name, emoji: personaEmojis[currentPersona.id] });
  // 已登录则保存到后端
  if (session?.user?.id) {
    try {
      await createHistoryItem({
        content,
        personaId,
        personaName: currentPersona.name,
        personaEmoji: personaEmojis[currentPersona.id],
        comments: data.comments,
        analysis: data.analysis,
      });
    } catch {
      // 保存失败不影响展示
    }
  }
}
```

- [ ] **Step 4: 删除 HistoryDrawer 和相关 state**

从 `Home()` 函数中删除：
- `const [history, setHistory] = useState<HistoryItem[]>([]);`
- `const [showHistory, setShowHistory] = useState(false);`
- `useEffect(() => { setHistory(getHistory()); }, []);`
- handleGenerate 中的 localStorage 保存逻辑（已替换）

删除文件底部的整个 `HistoryDrawer` 组件函数。

删除 `HistoryDrawer` 的渲染：
```tsx
// 删除这段
{showHistory && (
  <HistoryDrawer
    history={history}
    ...
  />
)}
```

从 import 中删除 `HistoryItem`（如果不再直接使用）。保留 `createHistoryItem` 和迁移相关的导入。

- [ ] **Step 5: 运行全部测试确认无破坏**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate auth state in header, replace localStorage with API save, remove HistoryDrawer"
```

---

### Task 4: 在应用启动时初始化数据库

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 确保数据库在服务端启动时初始化**

在 `app/layout.tsx` 中添加服务端数据库初始化（只在服务端执行一次）：

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 初始化数据库（服务端执行）
if (typeof window === "undefined") {
  const { initDb } = require("@/lib/db/index");
  initDb();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReplyGuy - X Comment Generator",
  description: "Paste a tweet, pick a persona, generate human-like comments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: 验证应用能正常启动**

Run: `npm run build && npm start`
Expected: 编译成功，启动成功，`.data/x-pundit.db` 文件被创建

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: initialize SQLite database on server startup"
```

---

### Task 5: 端到端冒烟测试

**Files:** 无新文件

- [ ] **Step 1: 手动验证完整流程**

启动应用 `npm run dev`，验证以下流程：

1. **未登录状态**：主页可见，生成评论正常，历史记录按钮提示登录
2. **注册**：点击登录 → 注册 → 填写邮箱密码 → 注册成功自动跳回主页
3. **已登录状态**：Header 显示"历史记录"链接和"退出"按钮
4. **生成并保存**：生成评论后检查 `.data/x-pundit.db` 中 history 表有新记录
5. **历史页面**：点击历史记录 → `/history` 页面展示记录列表
6. **展开详情**：点击卡片展开，显示完整原文和评论列表
7. **删除**：删除单条记录，确认消失
8. **退出**：退出后回到未登录状态

- [ ] **Step 2: 运行全部测试**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Final commit（如有未提交的修改）**

```bash
git add -A
git commit -m "chore: verify full auth + history integration"
```
