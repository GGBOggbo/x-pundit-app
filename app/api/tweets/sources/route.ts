import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDb();

    const rows = db
      .prepare(
        "SELECT DISTINCT content FROM history WHERE user_id = ? ORDER BY created_at DESC"
      )
      .all(user.id) as { content: string }[];

    const contents = rows.map((r) => r.content);

    return NextResponse.json({ contents, total: contents.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("获取历史内容失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
