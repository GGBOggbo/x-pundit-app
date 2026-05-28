import { describe, it, expect } from "vitest";
import { parseTweets, detectLanguage } from "@/lib/tweets/parseTweets";

describe("parseTweets", () => {
  it("should split by newline and trim", () => {
    const result = parseTweets("  hello world  \n  foo bar  ");
    expect(result.valid).toEqual(["hello world", "foo bar"]);
  });

  it("should drop empty lines", () => {
    const result = parseTweets("hello\n\n\nworld");
    expect(result.valid).toEqual(["hello", "world"]);
    expect(result.dropped.find(d => d.reason === "空行")?.count).toBe(2);
  });

  it("should drop lines shorter than 5 chars", () => {
    const result = parseTweets("hi\nhello world");
    expect(result.valid).toEqual(["hello world"]);
    expect(result.dropped.find(d => d.reason.includes("少于"))?.count).toBe(1);
  });

  it("should deduplicate case-insensitively", () => {
    const result = parseTweets("Hello World\nhello world\nHELLO WORLD");
    expect(result.valid).toHaveLength(1);
    expect(result.dropped.find(d => d.reason === "重复内容")?.count).toBe(2);
  });

  it("should strip RT prefix", () => {
    const result = parseTweets("RT: this is a retweet\nRT @user another one");
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toBe("this is a retweet");
  });

  it("should strip @username prefix", () => {
    const result = parseTweets("@user123 my actual tweet content");
    expect(result.valid[0]).toBe("my actual tweet content");
  });

  it("should limit max 100 tweets", () => {
    const lines = Array.from({ length: 150 }, (_, i) => `tweet number ${i} content`);
    const result = parseTweets(lines.join("\n"));
    expect(result.valid.length).toBeLessThanOrEqual(100);
  });

  it("should handle empty input", () => {
    const result = parseTweets("");
    expect(result.valid).toEqual([]);
    expect(result.totalLines).toBe(1);
  });
});

describe("detectLanguage", () => {
  it("should detect Chinese", () => {
    expect(detectLanguage(["今天天气不错", "适合出去走走"])).toBe("zh");
  });

  it("should detect English", () => {
    expect(detectLanguage(["hello world", "this is a test"])).toBe("en");
  });

  it("should detect mixed", () => {
    expect(detectLanguage(["今天 weather 不错", "let's 出去走走"])).toBe("mixed");
  });

  it("should handle empty input", () => {
    expect(detectLanguage([])).toBe("mixed");
  });
});
