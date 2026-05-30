import { describe, it, expect } from "vitest";
import { personas } from "@/config/personas";
import type { GeneratedComment } from "@/types";

/**
 * TDD: 新版 UI 行为测试
 * 先写失败测试，再写实现让它通过
 */

// ========== 1. 人格卡片描述测试 ==========

describe("persona card descriptions", () => {
  it("every persona should have a non-empty description", () => {
    for (const p of personas) {
      expect(p.description).toBeDefined();
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it("descriptions should be short enough for card display (under 30 chars)", () => {
    for (const p of personas) {
      expect(p.description.length).toBeLessThanOrEqual(30);
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
  const PROFESSIONAL_IDS = ["hu_chenfeng", "zhang_xuefeng"];

  const mockPersonas = [
    { id: "tieba_bro", name: "贴吧老哥", tags: ["搞笑", "犀利", "社交"], language: "zh", description: "desc a" },
    { id: "zhihu_expert", name: "知乎大V", tags: ["专业", "分析"], language: "zh", description: "desc b" },
    { id: "hu_chenfeng", name: "户晨风", tags: ["专业", "犀利", "中文"], language: "zh", description: "desc c" },
    { id: "zhang_xuefeng", name: "张雪峰", tags: ["专业", "犀利", "中文"], language: "zh", description: "desc d" },
  ];

  const filterTags = ["全部", "网友", "专业"];

  it("filter tags should be 全部/网友/专业", () => {
    expect(filterTags).toEqual(["全部", "网友", "专业"]);
  });

  it("filtering by '全部' should return all personas", () => {
    const activeTag: string = "全部";
    const filtered = mockPersonas.filter((p) => {
      const isProfessional = PROFESSIONAL_IDS.includes(p.id);
      return activeTag === "全部" ||
        (activeTag === "专业" && isProfessional) ||
        (activeTag === "网友" && !isProfessional);
    });
    expect(filtered).toHaveLength(4);
  });

  it("filtering by '专业' should return 户晨风 and 张雪峰", () => {
    const activeTag: string = "专业";
    const filtered = mockPersonas.filter((p) => {
      const isProfessional = PROFESSIONAL_IDS.includes(p.id);
      return activeTag === "全部" ||
        (activeTag === "专业" && isProfessional) ||
        (activeTag === "网友" && !isProfessional);
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((p) => p.id)).toEqual(["hu_chenfeng", "zhang_xuefeng"]);
  });

  it("filtering by '网友' should return all except professionals", () => {
    const activeTag: string = "网友";
    const filtered = mockPersonas.filter((p) => {
      const isProfessional = PROFESSIONAL_IDS.includes(p.id);
      return activeTag === "全部" ||
        (activeTag === "专业" && isProfessional) ||
        (activeTag === "网友" && !isProfessional);
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((p) => !PROFESSIONAL_IDS.includes(p.id))).toBe(true);
  });

  it("search by name should be case-insensitive", () => {
    const keyword = "贴吧";
    const filtered = mockPersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some((t) => t.toLowerCase().includes(keyword))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("tieba_bro");
  });
});
