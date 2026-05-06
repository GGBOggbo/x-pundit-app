import { describe, it, expect } from "vitest";
import {
  buildAnalysisPrompt,
  buildGenerationPrompt,
  buildRankAndPolishPrompt,
} from "@/config/prompts";
import { getPersonaById } from "@/config/personas";
import type { ContentAnalysis } from "@/types";

describe("buildAnalysisPrompt", () => {
  it("should include the content in the prompt", () => {
    const prompt = buildAnalysisPrompt("这是一条推文", "zh");
    expect(prompt).toContain("这是一条推文");
  });

  it("should use 中文 for Chinese language", () => {
    const prompt = buildAnalysisPrompt("test content", "zh");
    expect(prompt).toContain("中文");
  });

  it("should use English for English language", () => {
    const prompt = buildAnalysisPrompt("test content", "en");
    expect(prompt).toContain("English");
  });

  it("should request JSON output", () => {
    const prompt = buildAnalysisPrompt("test", "zh");
    expect(prompt).toContain("JSON");
  });
});

describe("buildGenerationPrompt", () => {
  const mockAnalysis: ContentAnalysis = {
    topic: "科技",
    coreOpinion: "AI正在改变世界",
    sentiment: "positive",
    keyEntities: ["OpenAI", "GPT"],
    debatePoints: ["AI是否会取代人类"],
    emotionalHooks: ["对未来的期待"],
    funPoints: ["AI写评论自己评自己"],
  };

  it("should include persona system prompt", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildGenerationPrompt(mockAnalysis, persona, 5, "原文内容");
    expect(prompt).toContain(persona.systemPrompt);
  });

  it("should include analysis data", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildGenerationPrompt(mockAnalysis, persona, 5, "原文内容");
    expect(prompt).toContain("AI正在改变世界");
    expect(prompt).toContain("科技");
  });

  it("should include count in generation requirements", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildGenerationPrompt(mockAnalysis, persona, 5, "原文内容");
    expect(prompt).toContain("5 条评论");
  });

  it("should use different angle instructions based on count", () => {
    const persona = getPersonaById("tieba_bro")!;

    const small = buildGenerationPrompt(mockAnalysis, persona, 2, "原文");
    expect(small).toContain("每条评论选不同角度");

    const medium = buildGenerationPrompt(mockAnalysis, persona, 5, "原文");
    expect(medium).toContain("1条赞同");

    const large = buildGenerationPrompt(mockAnalysis, persona, 8, "原文");
    expect(large).toContain("尽量覆盖多种角度");
  });
});

describe("buildRankAndPolishPrompt", () => {
  it("should include the comment to review", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildRankAndPolishPrompt("测试评论", persona, "原文内容");
    expect(prompt).toContain("测试评论");
  });

  it("should include persona name", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildRankAndPolishPrompt("测试评论", persona, "原文内容");
    expect(prompt).toContain(persona.name);
  });

  it("should request JSON output with score structure", () => {
    const persona = getPersonaById("tieba_bro")!;
    const prompt = buildRankAndPolishPrompt("测试评论", persona, "原文内容");
    expect(prompt).toContain("score");
    expect(prompt).toContain("breakdown");
    expect(prompt).toContain("polished");
  });
});
