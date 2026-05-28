import type { StyleProfile } from "@/types/tweet";
import { chatCompletion, parseAIJson } from "@/lib/ai/client";
import { buildAnalyzeStylePrompt } from "@/config/prompts";

export async function analyzeUserStyle(
  tweets: string[]
): Promise<StyleProfile> {
  const prompt = buildAnalyzeStylePrompt(tweets);

  const raw = await chatCompletion(prompt, {
    temperature: 0.3,
    maxTokens: 800,
    thinking: false,
  });

  return parseAIJson<StyleProfile>(raw);
}
