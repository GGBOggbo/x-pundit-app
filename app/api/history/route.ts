import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";
import { buildContentPreview } from "@/lib/history";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

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

    // 正常新增分支
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

// ========== GET 列表 ==========

interface HistoryRow {
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

function rowToHistoryItem(row: HistoryRow) {
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
      .all(user.id, pageSize, offset) as HistoryRow[];

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

// ========== DELETE 清空全部 ==========

export async function DELETE() {
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
