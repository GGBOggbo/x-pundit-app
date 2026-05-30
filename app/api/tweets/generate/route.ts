import { NextRequest, NextResponse } from "next/server";
import type { TweetGenerateRequest, TweetGenerateResponse } from "@/types/tweet";
import { getPersonaById } from "@/config/personas";
import { detectLanguage } from "@/lib/tweets/parseTweets";
import { analyzeUserStyle } from "@/lib/tweets/analyzeStyle";
import { generateTweets } from "@/lib/tweets/generateTweets";

export async function POST(req: NextRequest) {
  let body: TweetGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  // 校验推文
  if (!body.tweets || !Array.isArray(body.tweets) || body.tweets.length < 5) {
    return NextResponse.json(
      { error: "至少需要 5 条历史推文" },
      { status: 400 }
    );
  }

  // 校验人格
  const persona = getPersonaById(body.personaId);
  if (!persona) {
    return NextResponse.json(
      { error: `未知人格: ${body.personaId}` },
      { status: 400 }
    );
  }

  const count = Math.min(Math.max(body.count || 3, 1), 8);

  // 语言检测
  let language = body.language;
  if (language === "auto") {
    const detected = detectLanguage(body.tweets);
    language = detected === "mixed" ? "zh" : detected;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // Step 1: 分析风格
        send({ step: "analyzing_style", message: "正在分析你的写作风格..." });
        const styleProfile = await analyzeUserStyle(body.tweets);

        send({
          step: "style_done",
          message: `识别到你的风格：${styleProfile.summary}`,
        });

        // Step 2: 生成推文（自带评分）
        send({ step: "generating", message: "正在结合人格生成原创推文..." });
        const tweets = await generateTweets(
          styleProfile,
          persona,
          count,
          body.topicHint
        );

        const result: TweetGenerateResponse = { tweets, styleProfile };
        send({ step: "done", result });
        controller.close();
      } catch (error) {
        console.error("推文生成失败:", error);
        send({
          step: "error",
          message:
            error instanceof Error ? error.message : "生成失败，请重试",
        });
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
