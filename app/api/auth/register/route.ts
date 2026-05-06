import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

function validateRegisterInput(body: {
  email?: string;
  password?: string;
  confirmPassword?: string;
}): { valid: boolean; error?: string } {
  if (!body.email?.trim()) return { valid: false, error: "邮箱不能为空" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) return { valid: false, error: "邮箱格式不正确" };

  if (!body.password) return { valid: false, error: "密码不能为空" };
  if (body.password.length < 8) return { valid: false, error: "密码至少 8 位" };

  if (body.password !== body.confirmPassword) return { valid: false, error: "两次密码不一致" };

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const body = await req.json();

    const validation = validateRegisterInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const db = getDb();

    // 检查邮箱是否已注册
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(body.email.trim().toLowerCase()) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    // 创建用户
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);
    const email = body.email.trim().toLowerCase();
    const now = Date.now();

    db.prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
    ).run(id, email, passwordHash, now);

    return NextResponse.json({
      ok: true,
      user: { id, email },
    });
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
  }
}
