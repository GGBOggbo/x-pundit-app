# Feature 4: 历史记录页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建独立的 `/history` 页面，展示用户的历史生成记录，支持展开详情、删除单条、清空全部、分页加载。

**Architecture:** Next.js App Router 页面 `app/history/page.tsx`，客户端组件。使用现有的暗色主题 CSS 变量和组件风格。复用主页的 `CommentCard` 组件（readOnly 模式）。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4

---

### Task 1: 创建历史页面布局和认证守卫

**Files:**
- Create: `app/history/page.tsx`

- [ ] **Step 1: 创建历史页面骨架（含认证守卫和数据获取）**

Create `app/history/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistoryItem } from "@/types";
import {
  fetchHistoryList,
  deleteHistoryItem,
  clearAllHistory,
} from "@/lib/history";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadHistory = useCallback(async (pageNum: number) => {
    try {
      const data = await fetchHistoryList(pageNum, 20);
      if (pageNum === 1) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      // 401 表示未登录
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  // 未登录跳转
  useEffect(() => {
    if (!authed && !loading) {
      window.location.href = "/login?redirect=/history";
    }
  }, [authed, loading]);

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => prev - 1);
  };

  const handleClearAll = async () => {
    await clearAllHistory();
    setItems([]);
    setTotal(0);
    setConfirmClear(false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="history-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="history-header">
        <div className="history-header-left">
          <a href="/" className="history-back">
            ← 返回
          </a>
          <h1 className="history-title">📋 历史记录</h1>
          {total > 0 && (
            <span className="history-count">共 {total} 条</span>
          )}
        </div>
        {items.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="history-confirm">
                <span className="history-confirm-text">确定清空全部？</span>
                <button
                  className="btn-act"
                  onClick={handleClearAll}
                >
                  确定
                </button>
                <button
                  className="btn-act"
                  onClick={() => setConfirmClear(false)}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                className="btn-ghost"
                onClick={() => setConfirmClear(true)}
              >
                🗑 清空全部
              </button>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      {items.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon">📦</div>
          <p className="empty-desc">还没有生成记录</p>
          <a href="/" className="btn-primary">
            去试试 →
          </a>
        </div>
      ) : (
        <>
          <div className="history-list">
            {items.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onDelete={() => handleDelete(item.id)}
                onCopy={handleCopy}
              />
            ))}
          </div>
          {hasMore && (
            <div className="history-more">
              <button className="btn-ghost" onClick={handleLoadMore}>
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== 工具函数 ==========
function handleCopy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

// ========== 历史卡片组件 ==========
function HistoryCard({
  item,
  onDelete,
  onCopy,
}: {
  item: HistoryItem;
  onDelete: () => void;
  onCopy: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="history-card">
      <div
        className="history-card-summary"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="history-card-meta">
          <span className="history-time">{relativeTime(item.createdAt)}</span>
          <span className="dot" />
          <span>
            {item.personaEmoji} {item.personaName}
          </span>
          <span className="dot" />
          <span>{item.commentCount} 条评论</span>
        </div>
        <div className="history-card-preview">{item.contentPreview}</div>
        <div className="history-card-actions">
          <button
            className="btn-act"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑 删除
          </button>
          <span className="history-expand-hint">
            {expanded ? "收起 ▲" : "展开 ▼"}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="history-card-detail">
          <div className="history-full-content">{item.content}</div>
          <div className="divider-label">评论列表</div>
          {item.comments.map((comment, i) => (
            <div key={i} className="result-item">
              <span className="res-num">{i + 1}</span>
              <div className="res-body">
                <div className="res-text">{comment.text}</div>
                <div className="res-actions">
                  <button
                    className="btn-act"
                    onClick={() => onCopy(comment.text)}
                  >
                    📋 复制
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 添加历史页面专属 CSS**

在 `app/globals.css` 末尾追加：

```css
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
.history-title { font-size: 24px; font-weight: 700; }
.history-count {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-secondary);
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
}
.history-card-summary {
  padding: 16px 20px;
  cursor: pointer;
  transition: background .15s;
}
.history-card-summary:hover { background: rgba(255,255,255,.02); }
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
```

- [ ] **Step 3: 验证页面能渲染（不崩溃）**

Run: `npm run build`
Expected: 编译成功，无类型错误

- [ ] **Step 4: Commit**

```bash
git add app/history/page.tsx app/globals.css
git commit -m "feat: add /history page with list, detail expand, delete, pagination"
```
