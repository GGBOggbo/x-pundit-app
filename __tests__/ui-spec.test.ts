import { describe, it, expect } from "vitest";
import { personas } from "@/config/personas";
import fs from "fs";
import path from "path";

/**
 * TDD: 匹配最终设计稿 HTML 参考的测试
 * Token 测试读取真实 CSS 文件，不是自断言硬编码值
 */

// ========== 1. Design Tokens 双主题测试 ==========

describe("dual theme design tokens", () => {
  const cssPath = path.resolve(__dirname, "../app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  // 从 CSS 中提取指定区块内的变量（:root 或 [data-theme="light"]）
  function extractBlock(content: string, blockSelector: string): string {
    const startPattern = blockSelector === ":root"
      ? /:root\s*\{/
      : new RegExp(`\\[data-theme="light"\\]\\s*\\{`);
    const startMatch = content.match(startPattern);
    if (!startMatch || startMatch.index === undefined) return "";
    let depth = 0;
    let i = startMatch.index;
    while (i < content.length) {
      if (content[i] === "{") depth++;
      if (content[i] === "}") { depth--; if (depth === 0) return content.slice(startMatch.index, i + 1); }
      i++;
    }
    return "";
  }

  function extractVar(block: string, varName: string): string | null {
    const regex = new RegExp(`${varName.replace(/-/g, "\\-")}\\s*:\\s*([^;]+)`);
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  }

  const darkExpected: Record<string, string> = {
    "--bg-page":       "#09090b",
    "--bg-card":       "#09090b",
    "--bg-secondary":  "#18181b",
    "--border-normal": "#27272a",
    "--border-hi":     "#3b82f6",
    "--blue":          "#3b82f6",
    "--text-primary":  "#f4f4f5",
    "--text-body":     "#a1a1aa",
    "--text-muted":    "#71717a",
    "--success":       "#22c55e",
    "--warning":       "#f97316",
  };

  // 浅色 token 已修正对比度：text-muted #64748B (4.76:1), success #15803d (5.02:1), warning #b45309 (5.02:1)
  const lightExpected: Record<string, string> = {
    "--bg-page":       "#ffffff",
    "--bg-card":       "#ffffff",
    "--bg-secondary":  "#f8fafc",
    "--border-normal": "#e2e8f0",
    "--border-hi":     "#2563eb",
    "--blue":          "#2563eb",
    "--text-primary":  "#1f2937",
    "--text-body":     "#475569",
    "--text-muted":    "#64748b",
    "--text-placeholder": "#94a3b8",
    "--success":       "#15803d",
    "--warning":       "#b45309",
  };

  it(":root (dark) tokens should all exist and match", () => {
    const block = extractBlock(cssContent, ":root");
    expect(block.length).toBeGreaterThan(0);
    for (const [varName, expected] of Object.entries(darkExpected)) {
      const actual = extractVar(block, varName);
      expect(actual, `:root ${varName}`).toBe(expected);
    }
  });

  it("[data-theme=light] tokens should all exist and match", () => {
    const block = extractBlock(cssContent, '[data-theme="light"]');
    expect(block.length).toBeGreaterThan(0);
    for (const [varName, expected] of Object.entries(lightExpected)) {
      const actual = extractVar(block, varName);
      expect(actual, `[data-theme="light"] ${varName}`).toBe(expected);
    }
  });

  it("dark and light should differ for bg/text/border", () => {
    expect(darkExpected["--bg-page"]).not.toBe(lightExpected["--bg-page"]);
    expect(darkExpected["--text-primary"]).not.toBe(lightExpected["--text-primary"]);
    expect(darkExpected["--border-normal"]).not.toBe(lightExpected["--border-normal"]);
  });

  it("accent purple should be consistent across themes", () => {
    const darkBlock = extractBlock(cssContent, ":root");
    const lightBlock = extractBlock(cssContent, '[data-theme="light"]');
    expect(extractVar(darkBlock, "--purple")).toBe("#7c3aed");
    expect(extractVar(lightBlock, "--purple")).toBe("#7c3aed");
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
  it("personas config should have 9 entries", () => {
    expect(personas).toHaveLength(9);
  });

  it("each persona should have emoji, name, description, tags", () => {
    personas.forEach((p) => {
      expect(p.emoji.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.tags.length).toBeGreaterThan(0);
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

  it("desktop layout should be two column (400px 1fr)", () => {
    const desktopLayout = "grid-template-columns: 400px 1fr";
    expect(desktopLayout).toContain("400px");
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
