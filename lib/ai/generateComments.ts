import type { ContentAnalysis, GeneratedComment, Persona } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildGenerationPrompt } from "@/config/prompts";

interface RawComment {
  text: string;
  angle: string;
}

export async function generateComments(
  originalContent: string,
  analysis: ContentAnalysis,
  persona: Persona,
  count: number = 5
): Promise<GeneratedComment[]> {
  const prompt = buildGenerationPrompt(
    analysis,
    persona,
    count,
    originalContent
  );

  const raw = await chatCompletion(prompt, {
    temperature: 0.92,
    maxTokens: 1500,
  });

  const parsed = parseAIJson<RawComment[]>(raw);

  return parsed
    .filter((c) => c.text && c.text.length > 0)
    .map((c) => ({
      text: c.text,
      angle: validateAngle(c.angle),
    }));
}

function validateAngle(angle: string): GeneratedComment["angle"] {
  const valid: GeneratedComment["angle"][] = [
    "agree",
    "question",
    "joke",
    "supplement",
    "empathy",
    "sarcasm",
  ];
  return valid.includes(angle as GeneratedComment["angle"])
    ? (angle as GeneratedComment["angle"])
    : "agree";
}
