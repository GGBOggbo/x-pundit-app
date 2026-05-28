import { NextRequest, NextResponse } from "next/server";
import { getPersonaById } from "@/config/personas";
import { buildTweetRefinePrompt } from "@/config/prompts";
import { chatCompletion } from "@/lib/ai/client";

const VALID_REFINE_TYPES = ["colloquial", "sharp"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.tweet?.trim()) {
      return NextResponse.json(
        { error: "tweet 不能为空" },
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

    if (!VALID_REFINE_TYPES.includes(body.refineType)) {
      return NextResponse.json(
        { error: "refineType 只能是 colloquial 或 sharp" },
        { status: 400 }
      );
    }

    const prompt = buildTweetRefinePrompt({
      tweet: body.tweet,
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      styleSummary: body.styleSummary || "",
      refineType: body.refineType,
    });

    const refined = await chatCompletion(prompt, {
      temperature: 0.85,
      maxTokens: 300,
    });

    return NextResponse.json({ refined });
  } catch (error) {
    console.error("推文润色失败:", error);
    return NextResponse.json(
      { error: "润色失败，请重试" },
      { status: 500 }
    );
  }
}
