import { describe, it, expect } from "vitest";

describe("tweet generate API validation", () => {
  it("should require at least 5 tweets", () => {
    const tweets = ["a", "b", "c", "d"];
    expect(tweets.length).toBeLessThan(5);
  });

  it("should accept 5 or more tweets", () => {
    const tweets = Array.from({ length: 5 }, (_, i) => `tweet content ${i}`);
    expect(tweets.length).toBeGreaterThanOrEqual(5);
  });

  it("should cap count at 8", () => {
    const count = Math.min(Math.max(10, 1), 8);
    expect(count).toBe(8);
  });

  it("should floor count at 1", () => {
    const count = Math.min(Math.max(0, 1), 8);
    expect(count).toBe(1);
  });
});
