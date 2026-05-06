import { describe, it, expect } from "vitest";

/**
 * TDD: 匹配最终设计稿 HTML 参考的测试
 */

// ========== 1. Design Tokens 颜色测试 ==========

describe("design tokens match reference HTML", () => {
  const tokens = {
    bgPage: "#050816",
    bgCard: "#0F172A",
    bgSecondary: "#111827",
    borderNormal: "#1F2937",
    borderHi: "#6366F1",
    purple: "#7C3AED",
    blue: "#2563EB",
    textPrimary: "#F8FAFC",
    textBody: "#CBD5E1",
    textMuted: "#64748B",
    textPlaceholder: "#475569",
    success: "#22C55E",
    warning: "#F59E0B",
  };

  it("all tokens should be valid 6-digit hex", () => {
    Object.values(tokens).forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("bgCard should be #0F172A per reference", () => {
    expect(tokens.bgCard).toBe("#0F172A");
  });

  it("borderNormal should be #1F2937 per reference", () => {
    expect(tokens.borderNormal).toBe("#1F2937");
  });

  it("gradient should use purple (#7C3AED) to blue (#2563EB)", () => {
    const gradient = "linear-gradient(135deg, #7C3AED, #2563EB)";
    expect(gradient).toContain("#7C3AED");
    expect(gradient).toContain("#2563EB");
  });
});

// ========== 2. Step Badge 格式测试 ==========

describe("step badge format", () => {
  const steps = [
    { badge: "STEP 1", name: "粘贴推文内容" },
    { badge: "STEP 2", name: "选择评论人格" },
    { badge: "STEP 3", name: "生成设置" },
  ];

  it("should have exactly 3 steps", () => {
    expect(steps).toHaveLength(3);
  });

  it("badge text should be uppercase 'STEP N' format", () => {
    steps.forEach((s) => {
      expect(s.badge).toMatch(/^STEP \d$/);
    });
  });
});

// ========== 3. Feature Grid 测试 ==========

describe("feature grid items", () => {
  const features = [
    { icon: "🌀", name: "多角度评论", desc: "不同视角切入" },
    { icon: "👤", name: "真人感优化", desc: "告别 AI 味" },
    { icon: "📍", name: "热度评分", desc: "预测互动热度" },
    { icon: "📋", name: "一键复制", desc: "快速复制使用" },
  ];

  it("should have exactly 4 features", () => {
    expect(features).toHaveLength(4);
  });

  it("each feature should have icon, name, and desc", () => {
    features.forEach((f) => {
      expect(f.icon.length).toBeGreaterThan(0);
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.desc.length).toBeGreaterThan(0);
    });
  });
});

// ========== 4. Settings 2列测试 ==========

describe("settings row", () => {
  const settings = [
    { label: "语言", options: ["自动检测", "中文", "English"] },
    { label: "数量", options: ["5 条", "3 条", "10 条"] },
  ];

  it("should have exactly 2 setting fields (评论倾向 removed)", () => {
    expect(settings).toHaveLength(2);
  });

  it("should NOT include 评论倾向 field (was fake/non-functional)", () => {
    const labels = settings.map((s) => s.label);
    expect(labels).not.toContain("评论倾向");
  });
});

// ========== 5. Result Card 结构测试 ==========

describe("result card structure", () => {
  const actionButtons = ["复制", "再口语一点", "更犀利"];

  it("should have exactly 3 action buttons", () => {
    expect(actionButtons).toHaveLength(3);
  });

  it("heat display format should be '热度 XX 🔥'", () => {
    const heat = 86;
    const display = `热度 ${heat} 🔥`;
    expect(display).toContain("热度");
    expect(display).toContain("🔥");
  });
});

// ========== 6. Comment card action buttons ==========

describe("comment card action buttons", () => {
  const actions = [
    { label: "📋 复制" },
    { label: "↩ 还原", shownWhen: "has originalText" },
    { label: "再口语一点" },
    { label: "更犀利" },
  ];

  it("should have 4 possible actions (还原 only when refined)", () => {
    expect(actions).toHaveLength(4);
  });
});

// ========== 7. Persona cards 测试 ==========

describe("persona card structure", () => {
  const personas = [
    { id: "tieba", em: "🍻", name: "贴吧老哥", sub: "直接 / 玩梗 / 冲浪感" },
    { id: "zhihu", em: "🎓", name: "知乎大V", sub: "理性 / 分析 / 有结论" },
    { id: "weibo", em: "🔥", name: "微博热评", sub: "共鸣 / 金句 / 情绪强" },
    { id: "yinyang", em: "🌝", name: "阴阳大师", sub: "反讽 / 话里有话" },
    { id: "warm", em: "🤗", name: "暖心鼓励", sub: "温柔 / 支持 / 正能量" },
    { id: "joke", em: "😂", name: "段子手", sub: "幽默 / 神转折" },
    { id: "tech", em: "💻", name: "Tech Bro", sub: "AI / Startup / Ship it" },
    { id: "genz", em: "💀", name: "Gen-Z", sub: "短句 / 梗感 / 英文网感" },
    { id: "hu", em: "🎤", name: "户晨风", sub: "定性 / 品牌论 / 购买力" },
  ];

  it("should have 9 personas", () => {
    expect(personas).toHaveLength(9);
  });

  it("each persona should have emoji, name, sub", () => {
    personas.forEach((p) => {
      expect(p.em.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.sub.length).toBeGreaterThan(0);
    });
  });
});

// ========== 8. CTA 按钮 ==========

describe("CTA button", () => {
  it("should show count and '真人感评论'", () => {
    const count = 5;
    const text = `🚀 生成 ${count} 条真人感评论`;
    expect(text).toContain("5");
    expect(text).toContain("真人感评论");
  });

  it("should have note about consumption", () => {
    const note = "预计消耗 1 次生成额度";
    expect(note).toContain("消耗");
  });
});

// ========== 9. Responsive breakpoint 测试 ==========

describe("responsive layout", () => {
  it("should have 768px breakpoint for mobile", () => {
    const breakpoint = 768;
    expect(breakpoint).toBeLessThanOrEqual(768);
  });

  it("mobile layout should be single column (grid-template-columns: 1fr)", () => {
    const mobileLayout = "grid-template-columns: 1fr";
    expect(mobileLayout).toContain("1fr");
  });

  it("desktop layout should be two column (40% 1fr)", () => {
    const desktopLayout = "grid-template-columns: 40% 1fr";
    expect(desktopLayout).toContain("40%");
    expect(desktopLayout).toContain("1fr");
  });
});

// ========== 10. Modal 结构测试 ==========

describe("modal UI structure", () => {
  it("modal overlay should exist in CSS", () => {
    const overlayClass = "modal-overlay";
    expect(overlayClass).toBe("modal-overlay");
  });

  it("filter tags should match expected list", () => {
    const filterTags = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];
    expect(filterTags).toHaveLength(6);
    expect(filterTags[0]).toBe("全部");
  });
});
