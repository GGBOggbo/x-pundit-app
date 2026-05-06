import type { ContentAnalysis } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildAnalysisPrompt } from "@/config/prompts";

export async function analyzeContent(
  content: string,
  language: "zh" | "en" | "auto" = "auto"
): Promise<ContentAnalysis> {
  const lang =
    language === "auto"
      ? /[\u4e00-\u9fff]/.test(content)
        ? "zh"
        : "en"
      : language;

  const prompt = buildAnalysisPrompt(content, lang);

  const raw = await chatCompletion(prompt, {
    temperature: 0.3,
    maxTokens: 800,
    thinking: false,
  });

  return parseAIJson<ContentAnalysis>(raw);
}
