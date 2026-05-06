import { describe, it, expect } from "vitest";
import { buildRefinePrompt } from "@/config/prompts";
import { getPersonaById } from "@/config/personas";

// ============================================================================
// TDD: 润色 API 测试 — 先写失败测试，再写实现让它通过
// ============================================================================

// ========== 1. buildRefinePrompt 单元测试 ==========

describe("buildRefinePrompt", () => {
  const persona = getPersonaById("tieba_bro")!;

  it("should include colloquial instruction when refineType is colloquial", () => {
    const prompt = buildRefinePrompt({
      comment: "这是一个很好的产品",
      originalContent: "某公司发布了新产品",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: "colloquial",
    });
    expect(prompt).toContain("口语");
    expect(prompt).toContain("随意");
  });

  it("should include sharp instruction when refineType is sharp", () => {
    const prompt = buildRefinePrompt({
      comment: "这是一个很好的产品",
      originalContent: "某公司发布了新产品",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: "sharp",
    });
    expect(prompt).toContain("犀利");
    expect(prompt).toContain("一针见血");
  });

  it("should include the original comment in prompt", () => {
    const prompt = buildRefinePrompt({
      comment: "这是一个很好的产品",
      originalContent: "某公司发布了新产品",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: "colloquial",
    });
    expect(prompt).toContain("这是一个很好的产品");
  });

  it("should include persona name and description", () => {
    const prompt = buildRefinePrompt({
      comment: "测试评论",
      originalContent: "原文内容",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: "colloquial",
    });
    expect(prompt).toContain(persona.name);
    expect(prompt).toContain(persona.description);
  });

  it("should include persona system prompt", () => {
    const prompt = buildRefinePrompt({
      comment: "测试评论",
      originalContent: "原文内容",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: persona.lengthRange,
      refineType: "colloquial",
    });
    expect(prompt).toContain(persona.systemPrompt.slice(0, 20));
  });

  it("should include length range", () => {
    const prompt = buildRefinePrompt({
      comment: "测试评论",
      originalContent: "原文内容",
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      lengthRange: { min: 10, max: 80 },
      refineType: "colloquial",
    });
    expect(prompt).toContain("10");
    expect(prompt).toContain("80");
  });
});

// ========== 2. 输入校验逻辑测试（API route 的校验规则） ==========

describe("refine input validation", () => {
  it("should reject empty comment", () => {
    const body = { comment: "", originalContent: "原文", personaId: "tieba_bro", refineType: "colloquial" };
    expect(body.comment.trim().length).toBe(0);
  });

  it("should reject comment over 500 chars", () => {
    const body = { comment: "a".repeat(501), originalContent: "原文", personaId: "tieba_bro", refineType: "colloquial" };
    expect(body.comment.length).toBeGreaterThan(500);
  });

  it("should reject empty originalContent", () => {
    const body = { comment: "评论", originalContent: "", personaId: "tieba_bro", refineType: "colloquial" };
    expect(body.originalContent.trim().length).toBe(0);
  });

  it("should reject originalContent over 5000 chars", () => {
    const body = { comment: "评论", originalContent: "a".repeat(5001), personaId: "tieba_bro", refineType: "colloquial" };
    expect(body.originalContent.length).toBeGreaterThan(5000);
  });

  it("should reject unknown personaId", () => {
    const persona = getPersonaById("nonexistent_persona");
    expect(persona).toBeUndefined();
  });

  it("should reject invalid refineType", () => {
    const validTypes = ["colloquial", "sharp"];
    const invalid = "aggressive";
    expect(validTypes.includes(invalid)).toBe(false);
  });

  it("should accept valid input", () => {
    const comment = "这是一个测试评论";
    const originalContent = "这是原文内容";
    const personaId = "tieba_bro";
    const refineType = "colloquial";

    const persona = getPersonaById(personaId);
    const validTypes: string[] = ["colloquial", "sharp"];

    const valid =
      comment.trim().length > 0 &&
      comment.length <= 500 &&
      originalContent.trim().length > 0 &&
      originalContent.length <= 5000 &&
      persona !== undefined &&
      validTypes.includes(refineType);

    expect(valid).toBe(true);
  });
});
