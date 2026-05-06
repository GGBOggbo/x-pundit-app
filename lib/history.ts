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
  const res = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "migrate", items }),
  });
  if (!res.ok) throw new Error("迁移失败");
  return res.json();
}
