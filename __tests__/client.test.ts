import { describe, it, expect } from "vitest";
import { parseAIJson, buildMessageParams } from "@/lib/ai/client";

describe("parseAIJson", () => {
  it("should parse plain JSON string", () => {
    const input = '{"key": "value"}';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should parse JSON wrapped in ```json``` code block", () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should parse JSON wrapped in ``` code block without language tag", () => {
    const input = '```\n{"key": "value"}\n```';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should handle JSON with whitespace", () => {
    const input = '  \n{"key": "value"}\n  ';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should throw on invalid JSON", () => {
    expect(() => parseAIJson("not json")).toThrow();
  });

  it("should extract JSON from text with trailing content (thinking mode)", () => {
    const input = '{"key": "value"}\n\nHere is some extra text after JSON';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should extract JSON from text with leading content (thinking mode)", () => {
    const input = 'Some thinking text before JSON\n{"key": "value"}';
    const result = parseAIJson<{ key: string }>(input);
    expect(result.key).toBe("value");
  });

  it("should extract JSON array with surrounding content (thinking mode)", () => {
    const input = 'Let me think...\n[{"text": "hello", "angle": "agree"}]\nDone.';
    const result = parseAIJson<Array<{ text: string }>>(input);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("hello");
  });

  it("should parse array JSON", () => {
    const input = '[{"text": "hello", "angle": "agree"}]';
    const result = parseAIJson<Array<{ text: string; angle: string }>>(input);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("hello");
  });
});

describe("buildMessageParams", () => {
  it("should include thinking config by default", () => {
    const params = buildMessageParams("test prompt");
    expect(params.thinking).toEqual({ type: "enabled", budget_tokens: 4096 });
  });

  it("should not include temperature when thinking is enabled", () => {
    const params = buildMessageParams("test prompt");
    expect(params).not.toHaveProperty("temperature");
  });

  it("should include temperature when thinking is disabled", () => {
    const params = buildMessageParams("test prompt", { temperature: 0.5, thinking: false });
    expect(params).toHaveProperty("temperature", 0.5);
    expect(params).not.toHaveProperty("thinking");
  });

  it("should use default max_tokens when not specified", () => {
    const params = buildMessageParams("test prompt");
    expect(params.max_tokens).toBe(32000);
  });

  it("should auto-raise max_tokens to budget + response when thinking on and maxTokens too small", () => {
    const params = buildMessageParams("test prompt", { maxTokens: 800 });
    // budget(4096) + 800 = 4896
    expect(params.max_tokens).toBe(4896);
  });

  it("should not lower max_tokens when it already exceeds budget + response", () => {
    const params = buildMessageParams("test prompt", { maxTokens: 32000 });
    // 32000 > budget(4096), so keep 32000
    expect(params.max_tokens).toBe(32000);
  });

  it("should use provided max_tokens", () => {
    const params = buildMessageParams("test prompt", { maxTokens: 2000, thinking: false });
    expect(params.max_tokens).toBe(2000);
  });

  it("should use provided model", () => {
    const params = buildMessageParams("test prompt", { model: "my-model" });
    expect(params.model).toBe("my-model");
  });

  it("should set budget_tokens from thinkingBudget option", () => {
    const params = buildMessageParams("test prompt", { thinkingBudget: 8192 });
    expect(params.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
  });
});
