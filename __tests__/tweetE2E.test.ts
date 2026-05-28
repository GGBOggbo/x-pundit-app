import { describe, it, expect } from "vitest";
import { parseTweets, detectLanguage } from "@/lib/tweets/parseTweets";
import { buildAnalyzeStylePrompt } from "@/config/prompts";
import { buildGenerateTweetsPrompt } from "@/config/prompts";
import { buildTweetRefinePrompt } from "@/config/prompts";
import type { StyleProfile } from "@/types/tweet";

describe("tweet generation E2E flow", () => {
  const sampleTweets = [
    "今天又是被 AI 震撼的一天",
    "创业第三年，终于理解了 PMF 的意思",
    "说白了，大部分会议就是在浪费时间",
    "GPT-5 来了，你的工作还安全吗",
    "真正厉害的人，都在闷声做产品",
    "不要用战术上的勤奋掩盖战略上的懒惰",
    "AI 不会取代你，但会用 AI 的人会",
    "创业就是九死一生，但那一次值得",
  ];

  it("should parse tweets correctly", () => {
    const result = parseTweets(sampleTweets.join("\n"));
    expect(result.valid.length).toBe(8);
    expect(result.valid[0]).toBe("今天又是被 AI 震撼的一天");
  });

  it("should detect Chinese language", () => {
    const result = parseTweets(sampleTweets.join("\n"));
    expect(detectLanguage(result.valid)).toBe("zh");
  });

  it("should build analysis prompt without persona", () => {
    const prompt = buildAnalyzeStylePrompt(sampleTweets);
    expect(prompt).not.toContain("persona");
    expect(prompt).toContain("1. 今天又是被 AI 震撼的一天");
  });

  it("should build generation prompt with style and persona", () => {
    const style: StyleProfile = {
      tone: "直接",
      vocabulary: ["说白了"],
      sentencePattern: "短句",
      emojiUsage: "少",
      topics: ["AI", "创业"],
      avgLength: 30,
      lengthRange: "短推",
      summary: "直接、口语化",
    };
    const prompt = buildGenerateTweetsPrompt(
      style,
      { name: "贴吧老哥", systemPrompt: "你是贴吧老哥" } as any,
      3
    );
    expect(prompt).toContain("直接");
    expect(prompt).toContain("贴吧老哥");
    expect(prompt).toContain("3");
  });

  it("should build refine prompt for tweets", () => {
    const prompt = buildTweetRefinePrompt({
      tweet: "AI 改变一切",
      personaName: "贴吧老哥",
      personaDescription: "直接/玩梗",
      personaPrompt: "你是贴吧老哥",
      styleSummary: "直接、短句",
      refineType: "colloquial",
    });
    expect(prompt).toContain("AI 改变一切");
    expect(prompt).toContain("口语");
    expect(prompt).not.toContain("评论");
  });
});
