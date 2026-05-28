import { describe, it, expect } from "vitest";
import { buildTweetRefinePrompt } from "@/config/prompts";

describe("buildTweetRefinePrompt", () => {
  const base = {
    tweet: "AI 真的会改变一切",
    personaName: "贴吧老哥",
    personaDescription: "直接/玩梗/冲浪感",
    personaPrompt: "你是贴吧老哥",
    styleSummary: "直接、短句、偶尔反问",
  };

  it("should include the tweet text", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).toContain("AI 真的会改变一切");
  });

  it("should include style summary", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).toContain("直接、短句、偶尔反问");
  });

  it("should have different instructions for colloquial vs sharp", () => {
    const colloquial = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    const sharp = buildTweetRefinePrompt({ ...base, refineType: "sharp" });
    expect(colloquial).toContain("口语");
    expect(sharp).toContain("犀利");
  });

  it("should not mention 'comment' or '评论'", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).not.toContain("评论");
    expect(prompt).not.toContain("comment");
  });

  it("should forbid fabrication", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "sharp" });
    expect(prompt).toContain("不要编造");
  });
});
