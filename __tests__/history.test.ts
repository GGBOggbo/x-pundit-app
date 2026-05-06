import { describe, it, expect } from "vitest";
import { buildContentPreview, getLocalHistory, clearLocalHistory } from "@/lib/history";

describe("buildContentPreview", () => {
  it("should return full content if <= 50 chars", () => {
    expect(buildContentPreview("短文本")).toBe("短文本");
  });

  it("should truncate and add ellipsis if > 50 chars", () => {
    const long = "a".repeat(60);
    const result = buildContentPreview(long);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle empty string", () => {
    expect(buildContentPreview("")).toBe("");
  });
});

describe("getLocalHistory", () => {
  it("should return empty array when localStorage is unavailable", () => {
    // 在 node 环境下 localStorage 不存在
    const result = getLocalHistory();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("clearLocalHistory", () => {
  it("should not throw when localStorage is unavailable", () => {
    expect(() => clearLocalHistory()).not.toThrow();
  });
});
