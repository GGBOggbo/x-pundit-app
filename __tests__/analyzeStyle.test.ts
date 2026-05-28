import { describe, it, expect } from "vitest";
import { buildAnalyzeStylePrompt } from "@/config/prompts";

describe("buildAnalyzeStylePrompt", () => {
  it("should include all tweets numbered", () => {
    const prompt = buildAnalyzeStylePrompt(["第一条推文", "第二条推文"]);
    expect(prompt).toContain("1. 第一条推文");
    expect(prompt).toContain("2. 第二条推文");
  });

  it("should request JSON output", () => {
    const prompt = buildAnalyzeStylePrompt(["test tweet"]);
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("tone");
    expect(prompt).toContain("vocabulary");
    expect(prompt).toContain("summary");
  });

  it("should not include persona references", () => {
    const prompt = buildAnalyzeStylePrompt(["test"]);
    expect(prompt).not.toContain("persona");
    expect(prompt).not.toContain("人格");
  });
});
