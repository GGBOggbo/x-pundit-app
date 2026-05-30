import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OLD_ENV = { ...process.env };

describe("runtime config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("throws a clear error when AI_API_KEY is missing", async () => {
    const mod = await import("@/lib/config/runtime");
    expect(() => mod.getAiRuntimeConfig()).toThrow(
      "Missing required environment variable: AI_API_KEY"
    );
  });

  it("returns defaults when optional AI env vars are absent", async () => {
    process.env.AI_API_KEY = "test-key";
    const mod = await import("@/lib/config/runtime");
    expect(mod.getAiRuntimeConfig()).toEqual({
      apiKey: "test-key",
      baseURL: "https://open.bigmodel.cn/api/anthropic",
      model: "claude-3-5-sonnet-20241022",
    });
  });
});
