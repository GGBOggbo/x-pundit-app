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
