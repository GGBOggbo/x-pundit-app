import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("should allow requests under limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }
  });

  it("should block requests over limit", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }
    expect(checkRateLimit("192.168.1.1")).toBe(false);
  });

  it("should track different IPs separately", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }
    expect(checkRateLimit("192.168.1.2")).toBe(true);
  });
});
