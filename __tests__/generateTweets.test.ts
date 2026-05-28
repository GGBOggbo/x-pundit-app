import { describe, it, expect } from "vitest";
import { buildGenerateTweetsPrompt } from "@/config/prompts";
import type { StyleProfile } from "@/types/tweet";

const mockStyle: StyleProfile = {
  tone: "直接幽默",
  vocabulary: ["说白了", "其实", "真的"],
  sentencePattern: "短句为主",
  emojiUsage: "偶尔点缀",
  topics: ["AI", "创业"],
  avgLength: 80,
  lengthRange: "短推为主（20-120字）",
  summary: "直接、口语化、偶尔反问",
};

const mockPersona = {
  name: "贴吧老哥",
  systemPrompt: "你是贴吧老哥",
};

describe("buildGenerateTweetsPrompt", () => {
  it("should include style profile info", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("直接幽默");
    expect(prompt).toContain("说白了");
    expect(prompt).toContain("短句为主");
  });

  it("should include persona name", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("贴吧老哥");
  });

  it("should use topicHint when provided", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3, "区块链");
    expect(prompt).toContain("区块链");
  });

  it("should fall back to style topics when no hint", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("AI");
    expect(prompt).toContain("创业");
  });

  it("should include count", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 5);
    expect(prompt).toContain("5");
  });

  it("should forbid fabricating data", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("不要编造");
  });

  it("should forbid copying original tweets", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("不要复制");
  });
});
