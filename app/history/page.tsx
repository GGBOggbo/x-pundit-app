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
