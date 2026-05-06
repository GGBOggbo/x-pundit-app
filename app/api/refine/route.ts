import { NextRequest, NextResponse } from "next/server";
import { getPersonaById } from "@/config/personas";
import { buildRefinePrompt } from "@/config/prompts";
import { chatCompletion } from "@/lib/ai/client";

const VALID_REFINE_TYPES = ["colloquial", "sharp"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 校验 comment
    if (!body.comment?.trim()) {
      return NextResponse.json(
        { error: "comment 不能为空" },
        { status: 400 }
      );
    }
    if (body.comment.length > 500) {
      return NextResponse.json(
        { error: "comment 不能超过 500 字" },
        { status: 400 }
      );
    }

    // 校验 originalContent
    if (!body.originalContent?.trim()) {
      return NextResponse.json(
        { error: "originalContent 不能为空" },
        { status: 400 }
      );
    }
    if (body.originalContent.length > 5000) {
      return NextResponse.json(
        { error: "originalContent 不能超过 5000 字" },
        { status: 400 }
      );
    }

    // 校验 personaId
    const persona = getPersonaById(body.personaId);
    if (!persona) {
      return NextResponse.json(
        { error: `未知人格: ${body.personaId}` },
        { status: 400 }
      );
    }

    // 校验 refineType
    if (!VALID_REFINE_TYPES.includes(body.refineType)) {
      return NextResponse.json(
        { error: "refineType 只能是 colloquial 或 sharp" },
        { status: 400 }
      );
    }

    const prompt = buildRefinePrompt({
      comment: body.comment,
      originalContent: body.originalContent,
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: body.refineType,
    });

    const refined = await chatCompletion(prompt, {
      temperature: 0.85,
      maxTokens: 300,
    });

    return NextResponse.json({ refined });
  } catch (error) {
    console.error("润色失败:", error);
    return NextResponse.json(
      { error: "润色失败，请重试" },
      { status: 500 }
    );
  }
}
