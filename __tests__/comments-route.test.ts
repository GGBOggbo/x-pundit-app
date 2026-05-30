import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/ai/analyzeContent", () => ({
  analyzeContent: vi.fn(async () => ({
    topic: "topic",
    sentiment: "neutral",
    coreOpinion: "opinion",
  })),
}));

vi.mock("@/lib/ai/generateComments", () => ({
  generateComments: vi.fn(async () => [
    { text: "hello", angle: "agree", score: 80, problems: [] },
  ]),
}));

vi.mock("@/lib/ai/rankAndPolish", () => ({
  rankAndPolishComments: vi.fn(async (comments) => comments),
}));

import { POST } from "@/app/api/comments/route";

describe("/api/comments POST", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns 400 when content exceeds 5000 characters", async () => {
    const req = new NextRequest("http://localhost/api/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "a".repeat(5001),
        personaId: "tieba_bro",
        count: 5,
        language: "auto",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "content 不能超过 5000 字",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    for (let i = 0; i < 10; i++) {
      const okReq = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({
          content: "hello",
          personaId: "tieba_bro",
          count: 5,
          language: "auto",
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "1.2.3.4",
        },
      });
      await POST(okReq);
    }

    const blockedReq = new NextRequest("http://localhost/api/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "hello",
        personaId: "tieba_bro",
        count: 5,
        language: "auto",
      }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
    });

    const res = await POST(blockedReq);
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      error: "请求过于频繁，请稍后再试",
    });
  });
});
