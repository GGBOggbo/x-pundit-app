import type { StyleProfile, GeneratedTweet } from "@/types/tweet";
import type { Persona } from "@/types";
import { chatCompletion, parseAIJson } from "@/lib/ai/client";
import { buildGenerateTweetsPrompt } from "@/config/prompts";

interface RawTweet {
  text: string;
  topic: string;
  score: number;
  reason: string;
}

export async function generateTweets(
  styleProfile: StyleProfile,
  persona: Persona,
  count: number,
  topicHint?: string
): Promise<GeneratedTweet[]> {
  const prompt = buildGenerateTweetsPrompt(
    styleProfile,
    persona,
    count,
    topicHint
  );

  const raw = await chatCompletion(prompt, {
    temperature: 0.92,
    maxTokens: 2000,
  });

  const parsed = parseAIJson<RawTweet[]>(raw);

  return parsed
    .filter((t) => t.text && t.text.length > 0)
    .sort((a, b) => b.score - a.score)
    .map((t) => ({
      text: t.text,
      topic: t.topic || "未分类",
      score: t.score || 60,
      reason: t.reason || "",
    }));
}
