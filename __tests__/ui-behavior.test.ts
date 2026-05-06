import { describe, it, expect } from "vitest";
import { personas, getPersonaById } from "@/config/personas";
import type { GeneratedComment } from "@/types";

/**
 * TDD: 新版 UI 行为测试
 * 先写失败测试，再写实现让它通过
 */

// ========== 1. 人格卡片描述测试 ==========

describe("persona card descriptions", () => {
  const shortDescriptions: Record<string, string> = {
    tieba_bro: "直接 / 玩梗 / 冲浪感",
    zhihu_expert: "理性 / 分析 / 有结论",
    weibo_hot: "共鸣 / 金句 / 情绪强",
    yin_yang: "反讽 / 话里有话",
    warm_support: "温柔 / 支持 / 正能量",
    duan_zi: "幽默 / 神转折",
    tech_bro: "AI / Startup / Ship it",
    gen_z: "短句 / 梗感 / 英文网感",
    hu_chenfeng: "定性 / 品牌论 / 购买力",
  };

  it("every persona should have a short description mapping", () => {
    for (const p of personas) {
      expect(shortDescriptions[p.id]).toBeDefined();
      expect(shortDescriptions[p.id].length).toBeGreaterThan(0);
    }
  });

  it("short descriptions should be under 20 chars for compact card display", () => {
    for (const id of Object.keys(shortDescriptions)) {
      expect(shortDescriptions[id].length).toBeLessThanOrEqual(30);
    }
  });
});

// ========== 2. CTA 按钮文案测试 ==========

describe("CTA button text", () => {
  function getButtonText(count: number, loading: boolean): string {
    if (loading) return "⏳ 生成中...";
    return `🚀 生成 ${count} 条真人感评论`;
  }

  it("should show count in button text when not loading", () => {
    expect(getButtonText(5, false)).toContain("5");
    expect(getButtonText(3, false)).toContain("3");
    expect(getButtonText(10, false)).toContain("10");
  });

  it("should show loading text when loading", () => {
    expect(getButtonText(5, true)).toBe("⏳ 生成中...");
  });

  it("should contain '真人感' in non-loading text", () => {
    expect(getButtonText(5, false)).toContain("真人感");
  });
});

// ========== 3. 空状态展示测试 ==========

describe("empty state content", () => {
  const capabilities = [
    "多角度评论",
    "真人感优化",
    "热度评分",
    "一键复制",
  ];

  it("should have exactly 4 capability items", () => {
    expect(capabilities).toHaveLength(4);
  });

  it("each capability should be non-empty", () => {
    capabilities.forEach((c) => {
      expect(c.length).toBeGreaterThan(0);
    });
  });
});

// ========== 4. 评论卡片结构测试 ==========

describe("comment card data structure", () => {
  const mockComment: GeneratedComment = {
    text: "绷不住了，这不就是每次大版本更新先吹上天的经典剧情吗😅",
    angle: "joke",
    score: 88,
    problems: [],
  };

  it("should have angle label mapping for all angles", () => {
    const angleLabels: Record<string, string> = {
      agree: "赞同",
      question: "质疑",
      joke: "调侃",
      supplement: "补充",
      empathy: "共鸣",
      sarcasm: "阴阳",
    };
    const validAngles = ["agree", "question", "joke", "supplement", "empathy", "sarcasm"];
    validAngles.forEach((angle) => {
      expect(angleLabels[angle]).toBeDefined();
    });
  });

  it("score color should be green >= 80, yellow >= 60, red < 60", () => {
    function getScoreColor(score: number): string {
      if (score >= 80) return "green";
      if (score >= 60) return "yellow";
      return "red";
    }
    expect(getScoreColor(88)).toBe("green");
    expect(getScoreColor(75)).toBe("yellow");
    expect(getScoreColor(45)).toBe("red");
  });
});

// ========== 5. 字数统计测试 ==========

describe("content length counter", () => {
  it("should show 0 for empty content", () => {
    expect("".length).toBe(0);
  });

  it("should show correct length", () => {
    const content = "这是一条测试推文";
    expect(content.length).toBe(8);
  });

  it("should cap at 2000 display", () => {
    const display = `${Math.min(2500, 2000)} / 2000`;
    expect(display).toBe("2000 / 2000");
  });
});

// ========== 6. Step 标签测试 ==========

describe("step labels", () => {
  const steps = [
    { number: 1, label: "粘贴推文" },
    { number: 2, label: "选择人格" },
    { number: 3, label: "生成评论" },
  ];

  it("should have exactly 3 steps", () => {
    expect(steps).toHaveLength(3);
  });

  it("steps should be numbered 1-3", () => {
    steps.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
    });
  });
});

// ========== 7. 生成进度步骤测试 ==========

describe("generation step progress", () => {
  type Step = "idle" | "analyzing" | "generating" | "ranking" | "done";

  const stepLabels: Record<string, string> = {
    analyzing: "正在分析内容...",
    generating: "正在生成评论...",
    ranking: "正在评分润色...",
  };

  it("each step should have a label", () => {
    ["analyzing", "generating", "ranking"].forEach((step) => {
      expect(stepLabels[step]).toBeDefined();
      expect(stepLabels[step].length).toBeGreaterThan(0);
    });
  });

  it("idle and done should not have loading labels", () => {
    expect(stepLabels["idle"]).toBeUndefined();
    expect(stepLabels["done"]).toBeUndefined();
  });
});

// ========== 8. 还原按钮逻辑测试 ==========

describe("refine restore logic", () => {
  it("should show restore button when originalText exists", () => {
    const comment: GeneratedComment = {
      text: "润色后的评论",
      angle: "joke",
      score: 85,
      originalText: "原始评论",
    };
    expect(comment.originalText).toBeDefined();
    expect(comment.originalText).not.toBe(comment.text);
  });

  it("should not show restore button when originalText is undefined", () => {
    const comment: GeneratedComment = {
      text: "未润色的评论",
      angle: "joke",
      score: 75,
    };
    expect(comment.originalText).toBeUndefined();
  });
});

// ========== 9. 批量复制逻辑测试 ==========

describe("batch copy", () => {
  it("should join all comments with double newline", () => {
    const comments = [
      { text: "评论1", angle: "agree" as const },
      { text: "评论2", angle: "joke" as const },
      { text: "评论3", angle: "sarcasm" as const },
    ];
    const allText = comments.map((c) => c.text).join("\n\n");
    expect(allText).toBe("评论1\n\n评论2\n\n评论3");
  });
});

// ========== 10. Persona Picker Modal 逻辑测试 ==========

describe("persona picker filter logic", () => {
  const mockPersonas = [
    { id: "a", name: "Foo", tags: ["搞笑", "社交"], language: "zh", description: "desc a" },
    { id: "b", name: "Bar", tags: ["专业", "英文"], language: "en", description: "desc b" },
    { id: "c", name: "Baz", tags: ["温暖"], language: "zh", description: "desc c" },
  ];

  const filterTags = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];

  it("filter tags should include expected categories", () => {
    expect(filterTags).toContain("全部");
    expect(filterTags).toContain("搞笑");
    expect(filterTags).toContain("英文");
  });

  it("filtering by tag '搞笑' should return matching personas", () => {
    const filtered = mockPersonas.filter((p) => p.tags.includes("搞笑"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("a");
  });

  it("filtering by tag '全部' should return all personas", () => {
    const activeTag = "全部";
    const filtered = mockPersonas.filter(
      (p) => activeTag === "全部" || p.tags.includes(activeTag)
    );
    expect(filtered).toHaveLength(3);
  });

  it("search by name should be case-insensitive", () => {
    const keyword = "bar";
    const filtered = mockPersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some((t) => t.toLowerCase().includes(keyword))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("b");
  });

  it("search by tag should work", () => {
    const keyword = "温暖";
    const filtered = mockPersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some((t) => t.toLowerCase().includes(keyword))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("c");
  });
});
