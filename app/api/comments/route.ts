import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest, GenerateResponse } from "@/types";
import { getPersonaById } from "@/config/personas";
import { analyzeContent } from "@/lib/ai/analyzeContent";
import { generateComments } from "@/lib/ai/generateComments";
import { rankAndPolishComments } from "@/lib/ai/rankAndPolish";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "content 不能为空" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  if (body.content.length > 5000) {
    return NextResponse.json(
      { error: "content 不能超过 5000 字" },
      { status: 400 }
    );
  }

  const persona = getPersonaById(body.personaId);
  if (!persona) {
    return NextResponse.json(
      { error: `未知人格: ${body.personaId}` },
      { status: 400 }
    );
  }

  const count = Math.min(Math.max(body.count || 5, 1), 10);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send({ step: "analyzing" });
        const analysis = await analyzeContent(body.content, body.language);

        send({ step: "generating" });
        const rawComments = await generateComments(
          body.content,
          analysis,
          persona,
          count
        );

        send({ step: "ranking" });
        const rankedComments = await rankAndPolishComments(
          rawComments,
          persona,
          body.content
        );

        const result: GenerateResponse = {
          analysis,
          comments: rankedComments,
        };
        send({ step: "done", result });
        controller.close();
      } catch (error) {
        console.error("生成失败:", error);
        send({ step: "error", error: "生成失败，请重试" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
