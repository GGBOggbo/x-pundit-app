import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest, GenerateResponse } from "@/types";
import { getPersonaById } from "@/config/personas";
import { analyzeContent } from "@/lib/ai/analyzeContent";
import { generateComments } from "@/lib/ai/generateComments";
import { rankAndPolishComments } from "@/lib/ai/rankAndPolish";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "content 不能为空" },
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

    const analysis = await analyzeContent(body.content, body.language);

    const rawComments = await generateComments(
      body.content,
      analysis,
      persona,
      count
    );

    const rankedComments = await rankAndPolishComments(
      rawComments,
      persona,
      body.content
    );

    const response: GenerateResponse = {
      analysis,
      comments: rankedComments,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成失败:", error);
    return NextResponse.json(
      { error: "生成失败，请重试" },
      { status: 500 }
    );
  }
}
