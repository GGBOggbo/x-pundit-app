import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    if (req.method === "POST") {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
      }
    }
    return handler(req);
  };
}

export const POST = withRateLimit(handlers.POST);
export const GET = handlers.GET;
