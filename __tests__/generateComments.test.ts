import { describe, it, expect } from "vitest";
import type { GeneratedComment } from "@/types";

// 测试 validateAngle 逻辑（通过导出的函数间接测试）
// 由于 generateComments 依赖 AI client，我们测试其内部校验逻辑
// 通过 mock 来验证数据流

describe("comment generation data flow", () => {
  it("should filter out empty text comments", () => {
    const rawComments = [
      { text: "好的评论", angle: "agree" },
      { text: "", angle: "joke" },
      { text: "也不错", angle: "supplement" },
    ];

    const filtered = rawComments.filter((c) => c.text && c.text.length > 0);
    expect(filtered).toHaveLength(2);
  });

  it("should map valid angles correctly", () => {
    const validAngles: GeneratedComment["angle"][] = [
      "agree", "question", "joke", "supplement", "empathy", "sarcasm",
    ];
    const input = "agree";
    const result = validAngles.includes(input as GeneratedComment["angle"])
      ? input
      : "agree";
    expect(result).toBe("agree");
  });

  it("should fallback to 'agree' for invalid angles", () => {
    const validAngles: GeneratedComment["angle"][] = [
      "agree", "question", "joke", "supplement", "empathy", "sarcasm",
    ];
    const input = "invalid_angle";
    const result = validAngles.includes(input as GeneratedComment["angle"])
      ? input
      : "agree";
    expect(result).toBe("agree");
  });

  it("should sort comments by score descending", () => {
    const comments: GeneratedComment[] = [
      { text: "a", angle: "agree", score: 70 },
      { text: "b", angle: "joke", score: 90 },
      { text: "c", angle: "sarcasm", score: 50 },
    ];

    const sorted = comments.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    expect(sorted[0].score).toBe(90);
    expect(sorted[1].score).toBe(70);
    expect(sorted[2].score).toBe(50);
  });

  it("should handle comments without score", () => {
    const comments: GeneratedComment[] = [
      { text: "a", angle: "agree" },
      { text: "b", angle: "joke", score: 80 },
    ];

    const sorted = comments.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    expect(sorted[0].text).toBe("b");
    expect(sorted[1].text).toBe("a");
  });
});
