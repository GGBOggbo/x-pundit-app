import type { GeneratedComment, Persona } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildRankAndPolishPrompt } from "@/config/prompts";

interface RankResult {
  score: number;
  breakdown: {
    authenticity: number;
    relevance: number;
    styleMatch: number;
    vibeCheck: number;
    copyDesire: number;
  };
  problems: string[];
  polished: string;
}

async function rankOne(
  comment: string,
  persona: Persona,
  originalContent: string
): Promise<RankResult> {
  const prompt = buildRankAndPolishPrompt(comment, persona, originalContent);
  const raw = await chatCompletion(prompt, {
    temperature: 0.3,
    maxTokens: 500,
    thinking: false,
  });
  return parseAIJson<RankResult>(raw);
}

export async function rankAndPolishComments(
  comments: GeneratedComment[],
  persona: Persona,
  originalContent: string
): Promise<GeneratedComment[]> {
  const results = await Promise.all(
    comments.map(async (comment) => {
      try {
        const rank = await rankOne(comment.text, persona, originalContent);
        return {
          ...comment,
          score: rank.score,
          problems: rank.problems,
          polished: rank.polished,
          text: rank.polished || comment.text,
        };
      } catch {
        return { ...comment, score: 60, problems: ["评分失败"] };
      }
    })
  );

  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
