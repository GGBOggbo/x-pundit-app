import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const row = db
      .prepare("SELECT * FROM history WHERE id = ? AND user_id = ?")
      .get(id, user.id) as HistoryRow | undefined;

    if (!row) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json(rowToHistoryItem(row));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("获取历史详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const result = db
      .prepare("DELETE FROM history WHERE id = ? AND user_id = ?")
      .run(id, user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("删除历史失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
