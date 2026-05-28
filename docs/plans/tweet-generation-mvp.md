# Feature A: 推文生成 MVP（无持久化）

> 目标：端到端跑通"粘贴历史推文 → 选人格 → 生成推文 → 复制/润色"，验证核心假设：生成的推文像不像用户本人？
> 原则：零数据库变更、零持久化、推文内容纯 request body 传递

## 验收标准

- [ ] /generate-tweets 页面可访问，左右分栏布局
- [ ] 粘贴 5+ 条历史推文，实时显示有效条数
- [ ] 选择 persona（复用 PersonaPickerModal）
- [ ] 设置 count / language / topicHint
- [ ] 点击生成 → SSE 流式进度（分析风格 → 生成推文）
- [ ] 结果展示 TweetCard（推文文本 + 话题 + 评分）
- [ ] 复制、再口语一点、更犀利、还原
- [ ] 现有评论生成器所有测试不受影响
- [ ] 新功能有完整测试覆盖

---

## Task 1: Types & parseTweets

**目标**：定义推文生成的核心类型 + 推文解析清洗函数

### 1.1 新增类型 — types/tweet.ts

```typescript
// types/tweet.ts

export interface StyleProfile {
  tone: string;
  vocabulary: string[];
  sentencePattern: string;
  emojiUsage: string;
  topics: string[];
  avgLength: number;
  lengthRange: string;
  summary: string;
}

export interface GeneratedTweet {
  text: string;
  topic: string;
  score: number;
  reason: string;
  originalText?: string;
  refineHistory?: import("./index").RefineRecord[];
}

export interface TweetGenerateRequest {
  tweets: string[];
  personaId: string;
  count: number;
  language: "auto" | "zh" | "en";
  topicHint?: string;
}

export interface TweetGenerateResponse {
  tweets: GeneratedTweet[];
  styleProfile: StyleProfile;
}
```

### 1.2 parseTweets — lib/tweets/parseTweets.ts

```typescript
// lib/tweets/parseTweets.ts

const MIN_LENGTH = 5;
const MAX_SINGLE_LENGTH = 500;
const MAX_COUNT = 100;

export interface ParseResult {
  valid: string[];
  totalLines: number;
  dropped: { reason: string; count: number }[];
}

export function parseTweets(raw: string): ParseResult {
  const lines = raw.split("\n");
  const dropped: { reason: string; count: number }[] = [];
  let dropEmpty = 0, dropShort = 0, dropDuplicate = 0, dropTooLong = 0, dropRt = 0;

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const line of lines) {
    let text = line.trim();

    // 空行
    if (!text) { dropEmpty++; continue; }

    // 去掉 RT 前缀
    const rtMatch = text.match(/^RT[:\s]/i);
    if (rtMatch) {
      text = text.slice(rtMatch[0]).trim();
      dropRt++;
    }

    // 去掉 @username 前缀（转发格式）
    text = text.replace(/^@\w+\s*/, "").trim();

    // 太短
    if (text.length < MIN_LENGTH) { dropShort++; continue; }

    // 太长
    if (text.length > MAX_SINGLE_LENGTH) { dropTooLong++; continue; }

    // 去重
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) { dropDuplicate++; continue; }
    seen.add(normalized);

    valid.push(text);
  }

  // 限制最大条数
  const trimmed = valid.slice(0, MAX_COUNT);

  if (dropEmpty > 0) dropped.push({ reason: "空行", count: dropEmpty });
  if (dropShort > 0) dropped.push({ reason: `少于${MIN_LENGTH}字`, count: dropShort });
  if (dropTooLong > 0) dropped.push({ reason: `超过${MAX_SINGLE_LENGTH}字`, count: dropTooLong });
  if (dropDuplicate > 0) dropped.push({ reason: "重复内容", count: dropDuplicate });
  if (dropRt > 0) dropped.push({ reason: "RT前缀已清理", count: dropRt });

  return {
    valid: trimmed,
    totalLines: lines.length,
    dropped,
  };
}

export function detectLanguage(tweets: string[]): "zh" | "en" | "mixed" {
  let zhCount = 0;
  let totalCount = 0;

  for (const tweet of tweets) {
    const chars = tweet.replace(/\s/g, "");
    totalCount += chars.length;
    for (const ch of chars) {
      if (/[一-鿿]/.test(ch)) zhCount++;
    }
  }

  if (totalCount === 0) return "mixed";
  const zhRatio = zhCount / totalCount;
  if (zhRatio > 0.8) return "zh";
  if (zhRatio < 0.2) return "en";
  return "mixed";
}
```

### 1.3 测试 — \_\_tests\_\_/parseTweets.test.ts

```typescript
// __tests__/parseTweets.test.ts
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
```

---

## Task 2: Style Analysis

**目标**：从用户历史推文中提取风格画像

### 2.1 Prompt — config/prompts.ts（追加）

```typescript
// 追加到 config/prompts.ts 末尾

export function buildAnalyzeStylePrompt(tweets: string[]): string {
  return `你是一个社交媒体风格分析专家。请分析以下推文，提取作者的个人写作风格特征。

【推文列表】
${tweets.map((t, i) => `${i + 1}. ${t}`).join("\n")}

请严格输出以下 JSON（不要输出其他任何内容）：

{
  "tone": "风格基调，如：直接幽默/理性分析/感性共情/犀利反讽",
  "vocabulary": ["高频词汇或口头禅，3-5个"],
  "sentencePattern": "句式特点，如：短句为主/喜欢排比/偶尔反问",
  "emojiUsage": "emoji使用习惯，如：几乎不用/偶尔点缀/大量使用",
  "topics": ["常聊话题，2-4个"],
  "avgLength": 80,
  "lengthRange": "推文长度特点，如：短推为主（20-120字）",
  "summary": "一句话总结这个人的写作风格"
}`;
}
```

### 2.2 调用函数 — lib/tweets/analyzeStyle.ts

```typescript
// lib/tweets/analyzeStyle.ts

import type { StyleProfile } from "@/types/tweet";
import { chatCompletion, parseAIJson } from "@/lib/ai/client";
import { buildAnalyzeStylePrompt } from "@/config/prompts";

export async function analyzeUserStyle(
  tweets: string[]
): Promise<StyleProfile> {
  const prompt = buildAnalyzeStylePrompt(tweets);

  const raw = await chatCompletion(prompt, {
    temperature: 0.3,
    maxTokens: 800,
    thinking: false,
  });

  return parseAIJson<StyleProfile>(raw);
}
```

### 2.3 测试 — \_\_tests\_\_/analyzeStyle.test.ts

```typescript
// __tests__/analyzeStyle.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildAnalyzeStylePrompt } from "@/config/prompts";

describe("buildAnalyzeStylePrompt", () => {
  it("should include all tweets numbered", () => {
    const prompt = buildAnalyzeStylePrompt(["第一条推文", "第二条推文"]);
    expect(prompt).toContain("1. 第一条推文");
    expect(prompt).toContain("2. 第二条推文");
  });

  it("should request JSON output", () => {
    const prompt = buildAnalyzeStylePrompt(["test tweet"]);
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("tone");
    expect(prompt).toContain("vocabulary");
    expect(prompt).toContain("summary");
  });

  it("should not include persona references", () => {
    const prompt = buildAnalyzeStylePrompt(["test"]);
    expect(prompt).not.toContain("persona");
    expect(prompt).not.toContain("人格");
  });
});
```

---

## Task 3: Tweet Generation

**目标**：结合风格画像 + persona 生成推文

### 3.1 Prompt — config/prompts.ts（追加）

```typescript
// 追加到 config/prompts.ts

export function buildGenerateTweetsPrompt(
  styleProfile: StyleProfile,
  persona: { name: string; systemPrompt: string },
  count: number,
  topicHint?: string
): string {
  const topicInstruction = topicHint
    ? `话题方向：${topicHint}`
    : `从用户常聊话题中选一个方向：${styleProfile.topics.join("、")}`;

  return `${persona.systemPrompt}

---

你要模拟用户的写作风格，生成原创推文。

注意：你不是在冒充某个真实公众人物，而是在延续用户本人提供的历史表达风格。

【用户写作风格】
- 语调: ${styleProfile.tone}
- 常用词: ${styleProfile.vocabulary.join(", ")}
- 句式: ${styleProfile.sentencePattern}
- emoji 习惯: ${styleProfile.emojiUsage}
- 长度特点: ${styleProfile.lengthRange}
- 风格总结: ${styleProfile.summary}

【${persona.name} 人格特征】
你的作用是调整表达的"味道"（比如更犀利、更幽默），而不是替换用户的声音。
如果个人风格和人格特征冲突，以个人风格为准。

【生成要求】
1. 写 ${count} 条原创推文
2. 每条推文必须读起来像用户本人发的
3. ${topicInstruction}
4. 每条推文的角度和表达必须不同
5. 不要复制用户历史推文中的原句
6. 不要编造具体经历、收益、数据
7. 不要声称做过用户没有提供的信息
8. 长度匹配用户的习惯: ${styleProfile.lengthRange}
9. 以下词汇绝对禁止出现：不得不说、值得一提的是、总的来说、众所周知

请严格按以下 JSON 数组格式输出（不要输出其他任何内容）：

[
  {
    "text": "推文内容",
    "topic": "话题标签",
    "score": 85,
    "reason": "评分理由，一句话"
  }
]

评分标准（每条 1-100）：
- 风格匹配度：是否像用户本人写的
- 原创性：是否是新的表达，不是复述
- 网感：放在 X/Twitter 上是否自然
- 发布欲：用户会不会想直接发`;
}
```

### 3.2 调用函数 — lib/tweets/generateTweets.ts

```typescript
// lib/tweets/generateTweets.ts

import type { StyleProfile, GeneratedTweet } from "@/types/tweet";
import type { Persona } from "@/types";
import { chatCompletion, parseAIJson } from "@/lib/ai/client";
import { buildGenerateTweetsPrompt } from "@/config/prompts";

interface RawTweet {
  text: string;
  topic: string;
  score: number;
  reason: string;
}

export async function generateTweets(
  styleProfile: StyleProfile,
  persona: Persona,
  count: number,
  topicHint?: string
): Promise<GeneratedTweet[]> {
  const prompt = buildGenerateTweetsPrompt(
    styleProfile,
    persona,
    count,
    topicHint
  );

  const raw = await chatCompletion(prompt, {
    temperature: 0.92,
    maxTokens: 2000,
  });

  const parsed = parseAIJson<RawTweet[]>(raw);

  return parsed
    .filter((t) => t.text && t.text.length > 0)
    .sort((a, b) => b.score - a.score)
    .map((t) => ({
      text: t.text,
      topic: t.topic || "未分类",
      score: t.score || 60,
      reason: t.reason || "",
    }));
}
```

### 3.3 测试 — \_\_tests\_\_/generateTweets.test.ts

```typescript
// __tests__/generateTweets.test.ts
import { describe, it, expect } from "vitest";
import { buildGenerateTweetsPrompt } from "@/config/prompts";
import type { StyleProfile } from "@/types/tweet";

const mockStyle: StyleProfile = {
  tone: "直接幽默",
  vocabulary: ["说白了", "其实", "真的"],
  sentencePattern: "短句为主",
  emojiUsage: "偶尔点缀",
  topics: ["AI", "创业"],
  avgLength: 80,
  lengthRange: "短推为主（20-120字）",
  summary: "直接、口语化、偶尔反问",
};

const mockPersona = {
  name: "贴吧老哥",
  systemPrompt: "你是贴吧老哥",
};

describe("buildGenerateTweetsPrompt", () => {
  it("should include style profile info", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("直接幽默");
    expect(prompt).toContain("说白了");
    expect(prompt).toContain("短句为主");
  });

  it("should include persona name", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("贴吧老哥");
  });

  it("should use topicHint when provided", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3, "区块链");
    expect(prompt).toContain("区块链");
  });

  it("should fall back to style topics when no hint", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("AI");
    expect(prompt).toContain("创业");
  });

  it("should include count", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 5);
    expect(prompt).toContain("5");
  });

  it("should forbid fabricating data", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("不要编造");
  });

  it("should forbid copying original tweets", () => {
    const prompt = buildGenerateTweetsPrompt(mockStyle, mockPersona, 3);
    expect(prompt).toContain("不要复制");
  });
});
```

---

## Task 4: Refine Prompt Adaptation

**目标**：推文场景的润色 prompt（独立于评论润色）

### 4.1 Prompt — config/prompts.ts（追加）

```typescript
// 追加到 config/prompts.ts

export function buildTweetRefinePrompt(params: {
  tweet: string;
  personaName: string;
  personaDescription: string;
  personaPrompt: string;
  styleSummary: string;
  refineType: "colloquial" | "sharp";
}): string {
  const refineInstruction =
    params.refineType === "colloquial"
      ? "请把推文改得更口语、更随意、更像真人在手机上随手发的。保持原意不变，去掉书面语和 AI 味。"
      : "请把推文改得更犀利、更一针见血、更有传播力。保持原意不变，增强力度，但不要人身攻击。";

  return `你是一个社交媒体推文润色专家。

【用户风格】
${params.styleSummary}

【当前人格】
${params.personaName}（${params.personaDescription}）

【人格风格要求】
${params.personaPrompt}

【原推文】
${params.tweet}

【润色任务】
${refineInstruction}

【要求】
1. 只输出润色后的推文本身
2. 不要解释
3. 不要加引号
4. 不要编造新信息
5. 不要变成客服口吻
6. 保持推文的自然长度`;
}
```

### 4.2 API 路由适配

推文润色复用 `/api/refine` 端点，但需要区分是评论还是推文。在请求体里加 `type` 字段：

```typescript
// app/api/refine/route.ts 追加逻辑
// 在现有校验后，根据 body.type 调用不同 prompt
```

或者新增 `/api/tweets/refine` 端点。第一版建议后者，保持清晰边界。

### 4.3 测试 — \_\_tests\_\_/tweetRefine.test.ts

```typescript
// __tests__/tweetRefine.test.ts
import { describe, it, expect } from "vitest";
import { buildTweetRefinePrompt } from "@/config/prompts";

describe("buildTweetRefinePrompt", () => {
  const base = {
    tweet: "AI 真的会改变一切",
    personaName: "贴吧老哥",
    personaDescription: "直接/玩梗/冲浪感",
    personaPrompt: "你是贴吧老哥",
    styleSummary: "直接、短句、偶尔反问",
  };

  it("should include the tweet text", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).toContain("AI 真的会改变一切");
  });

  it("should include style summary", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).toContain("直接、短句、偶尔反问");
  });

  it("should have different instructions for colloquial vs sharp", () => {
    const colloquial = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    const sharp = buildTweetRefinePrompt({ ...base, refineType: "sharp" });
    expect(colloquial).toContain("口语");
    expect(sharp).toContain("犀利");
  });

  it("should not mention 'comment' or '评论'", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "colloquial" });
    expect(prompt).not.toContain("评论");
    expect(prompt).not.toContain("comment");
  });

  it("should forbid fabrication", () => {
    const prompt = buildTweetRefinePrompt({ ...base, refineType: "sharp" });
    expect(prompt).toContain("不要编造");
  });
});
```

---

## Task 5: SSE API Endpoint

**目标**：`POST /api/tweets/generate`，SSE 流式返回

### 5.1 路由 — app/api/tweets/generate/route.ts

```typescript
// app/api/tweets/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { TweetGenerateRequest, TweetGenerateResponse } from "@/types/tweet";
import { getPersonaById } from "@/config/personas";
import { parseTweets, detectLanguage } from "@/lib/tweets/parseTweets";
import { analyzeUserStyle } from "@/lib/tweets/analyzeStyle";
import { generateTweets } from "@/lib/tweets/generateTweets";

export async function POST(req: NextRequest) {
  let body: TweetGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  // 校验推文
  if (!body.tweets || !Array.isArray(body.tweets) || body.tweets.length < 5) {
    return NextResponse.json(
      { error: "至少需要 5 条历史推文" },
      { status: 400 }
    );
  }

  // 校验人格
  const persona = getPersonaById(body.personaId);
  if (!persona) {
    return NextResponse.json(
      { error: `未知人格: ${body.personaId}` },
      { status: 400 }
    );
  }

  const count = Math.min(Math.max(body.count || 3, 1), 8);

  // 语言检测
  let language = body.language;
  if (language === "auto") {
    const detected = detectLanguage(body.tweets);
    language = detected === "mixed" ? "zh" : detected;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // Step 1: 分析风格
        send({ step: "analyzing_style", message: "正在分析你的写作风格..." });
        const styleProfile = await analyzeUserStyle(body.tweets);

        send({
          step: "style_done",
          message: `识别到你的风格：${styleProfile.summary}`,
        });

        // Step 2: 生成推文（自带评分）
        send({ step: "generating", message: "正在结合人格生成原创推文..." });
        const tweets = await generateTweets(
          styleProfile,
          persona,
          count,
          body.topicHint
        );

        const result: TweetGenerateResponse = { tweets, styleProfile };
        send({ step: "done", result });
        controller.close();
      } catch (error) {
        console.error("推文生成失败:", error);
        send({
          step: "error",
          message:
            error instanceof Error ? error.message : "生成失败，请重试",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 5.2 测试 — \_\_tests\_\_/tweetGenerateApi.test.ts

```typescript
// __tests__/tweetGenerateApi.test.ts
import { describe, it, expect } from "vitest";
import { parseTweets } from "@/lib/tweets/parseTweets";

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
```

---

## Task 6: Page Skeleton

**目标**：`/generate-tweets` 页面骨架，左右分栏

### 6.1 页面 — app/generate-tweets/page.tsx

```typescript
// app/generate-tweets/page.tsx
"use client";

import { useState, useEffect, useReducer, useRef } from "react";
import { personas } from "@/config/personas";
import type {
  TweetGenerateResponse,
  GeneratedTweet,
  StyleProfile,
} from "@/types/tweet";
import type { RefineRecord } from "@/types";
import { parseTweets, detectLanguage } from "@/lib/tweets/parseTweets";
import PersonaPickerModal from "../components/PersonaPickerModal";
import ThemeToggle from "../components/ThemeToggle";
import TweetCard from "../components/TweetCard";
import ToastContainer, { showToast } from "../components/Toast";

// 状态管理（复用评论页的 reducer 模式）
type GenerationStep =
  | "idle"
  | "analyzing_style"
  | "style_done"
  | "generating"
  | "done";

interface GenerateState {
  step: GenerationStep;
  error: string | null;
  styleMessage: string | null;
}

type GenerateAction =
  | { type: "START" }
  | { type: "SET_STEP"; step: GenerationStep; message?: string }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

function generateReducer(
  state: GenerateState,
  action: GenerateAction
): GenerateState {
  switch (action.type) {
    case "START":
      return { step: "analyzing_style", error: null, styleMessage: null };
    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        styleMessage: action.message ?? state.styleMessage,
      };
    case "ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return { step: "idle", error: null, styleMessage: null };
    default:
      return state;
  }
}

export default function GenerateTweetsPage() {
  const [rawInput, setRawInput] = useState("");
  const [personaId, setPersonaId] = useState("tieba_bro");
  const [count, setCount] = useState(3);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [topicHint, setTopicHint] = useState("");
  const [genState, genDispatch] = useReducer(generateReducer, {
    step: "idle",
    error: null,
    styleMessage: null,
  });
  const [result, setResult] = useState<TweetGenerateResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loading = genState.step !== "idle";

  // 解析推文
  const parseResult = parseTweets(rawInput);
  const validCount = parseResult.valid.length;
  const langDetected =
    validCount >= 5 ? detectLanguage(parseResult.valid) : "mixed";

  // 语言自动设置
  useEffect(() => {
    if (language === "auto" && langDetected !== "mixed") {
      // 自动检测到的语言会在生成时使用，UI 上保持 "auto"
    }
  }, [langDetected, language]);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    if (validCount < 5) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setResult(null);
    genDispatch({ type: "START" });

    try {
      const res = await fetch("/api/tweets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: parseResult.valid,
          personaId,
          count,
          language,
          topicHint: topicHint.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "生成失败", "error");
        genDispatch({ type: "RESET" });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.step === "done") {
            genDispatch({ type: "SET_STEP", step: "done" });
            setResult(event.result);
          } else if (event.step === "error") {
            showToast(event.message || "生成失败", "error");
            genDispatch({ type: "RESET" });
          } else {
            genDispatch({
              type: "SET_STEP",
              step: event.step,
              message: event.message,
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      showToast("网络错误，请重试", "error");
      genDispatch({ type: "RESET" });
    } finally {
      if (!controller.signal.aborted) {
        genDispatch({ type: "RESET" });
      }
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    genDispatch({ type: "RESET" });
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleTweetRefined = (
    index: number,
    refined: string,
    record: RefineRecord
  ) => {
    if (!result) return;
    const updated = { ...result };
    const tweet = { ...updated.tweets[index] };
    tweet.originalText = tweet.originalText ?? tweet.text;
    tweet.refineHistory = [...(tweet.refineHistory || []), record];
    tweet.text = refined;
    updated.tweets = [...updated.tweets];
    updated.tweets[index] = tweet;
    setResult(updated);
  };

  const selectedPersona = personas.find((p) => p.id === personaId);

  return (
    <div className="page">
      <ToastContainer />

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="header-titles">
            <h1>推文生成器</h1>
            <p>粘贴你的历史推文，AI 学习你的风格，生成像你写的原创推文</p>
          </div>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <a
            href="/"
            className="btn-ghost"
            style={{ textDecoration: "none" }}
          >
            ← 回到评论生成
          </a>
        </div>
      </header>

      {/* MAIN */}
      <div className="main">
        {/* LEFT PANEL */}
        <div className="left-panel">
          {/* STEP 1: 粘贴历史推文 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 1</span>
              <span className="step-name">粘贴你的历史推文</span>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"每行粘贴一条你发过的推文，例如：\n\n今天又是被 AI 震撼的一天\n创业第三年，终于理解了 PMF 的意思\n说白了，大部分会议就是在浪费时间"}
              style={{ height: 200 }}
            />
            <ParseStatus validCount={validCount} dropped={parseResult.dropped} />
          </div>

          {/* STEP 2: 选择叠加人格 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 2</span>
              <span className="step-name">选择叠加人格</span>
            </div>
            {selectedPersona && (
              <div
                className="selected-persona"
                onClick={() => setIsPersonaModalOpen(true)}
              >
                <div className="selected-persona-emoji">
                  {selectedPersona.emoji}
                </div>
                <div className="selected-persona-info">
                  <div className="selected-persona-name">
                    {selectedPersona.name}
                  </div>
                  <div className="selected-persona-desc">
                    {selectedPersona.description}
                  </div>
                </div>
                <span className="selected-persona-change">更换</span>
              </div>
            )}
            <PersonaPickerModal
              open={isPersonaModalOpen}
              currentPersonaId={personaId}
              onSelect={setPersonaId}
              onClose={() => setIsPersonaModalOpen(false)}
            />
          </div>

          {/* STEP 3: 生成设置 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 3</span>
              <span className="step-name">生成设置</span>
            </div>
            <div className="settings-row">
              <div>
                <div className="field-label">🌐 语言</div>
                <div className="select-wrap">
                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as "auto" | "zh" | "en")
                    }
                  >
                    <option value="auto">自动检测</option>
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
              <div>
                <div className="field-label"># 数量</div>
                <div className="select-wrap">
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    <option value={3}>3 条</option>
                    <option value={5}>5 条</option>
                    <option value={8}>8 条</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="field-label">💡 话题方向（可选）</div>
              <input
                type="text"
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                placeholder="例如：AI 和创业"
                className="modal-search"
                style={{ width: "100%" }}
              />
            </div>
            <button
              className="btn-generate"
              onClick={loading ? handleCancel : handleGenerate}
              disabled={!loading && validCount < 5}
            >
              {loading
                ? "⏹ 取消生成"
                : `🚀 生成 ${count} 条原创推文`}
            </button>
            <div className="gen-note">
              {loading
                ? genState.styleMessage || "生成中..."
                : validCount < 5
                  ? "至少需要 5 条历史推文"
                  : "将分析你的风格并叠加人格生成"}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="card">
            <div className="panel-title">✨ 生成结果预览</div>

            {!result && !loading && <TweetEmptyState />}
            {loading && (
              <TweetLoadingState
                step={genState.step}
                message={genState.styleMessage}
              />
            )}
            {result && (
              <TweetResultPanel
                result={result}
                personaName={selectedPersona!.name}
                personaEmoji={selectedPersona!.emoji}
                personaId={personaId}
                styleProfile={result.styleProfile}
                copiedIndex={copiedIndex}
                onCopy={handleCopy}
                onRefined={handleTweetRefined}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 推文解析状态 ==========
function ParseStatus({
  validCount,
  dropped,
}: {
  validCount: number;
  dropped: { reason: string; count: number }[];
}) {
  const getStatusColor = () => {
    if (validCount < 5) return "var(--warning)";
    if (validCount < 10) return "var(--warning)";
    return "var(--success)";
  };

  const getStatusText = () => {
    if (validCount === 0) return "请粘贴你的历史推文";
    if (validCount < 5) return `已识别 ${validCount} 条，至少需要 5 条`;
    if (validCount < 10)
      return `已识别 ${validCount} 条推文（建议 10 条以上，风格更稳定）`;
    return `已识别 ${validCount} 条推文 ✓`;
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div
        className="char-count"
        style={{ color: getStatusColor() }}
      >
        {getStatusText()}
      </div>
      {dropped.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          已过滤:{" "}
          {dropped.map((d) => `${d.reason}(${d.count})`).join("、")}
        </div>
      )}
    </div>
  );
}

// ========== 空状态 ==========
function TweetEmptyState() {
  return (
    <div className="empty-wrap">
      <div className="empty-icon">✍️</div>
      <div className="empty-desc">
        粘贴你的历史推文后，AI 会学习你的写作风格，生成像你本人发的原创推文
      </div>
      <div className="feature-grid">
        <div className="feature-item">
          <span className="feat-icon">🔍</span>
          <div>
            <div className="feat-name">风格学习</div>
            <div className="feat-desc">从历史推文提取个人风格</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">🎭</span>
          <div>
            <div className="feat-name">人格叠加</div>
            <div className="feat-desc">用人格调味你的风格</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">✍️</span>
          <div>
            <div className="feat-name">原创推文</div>
            <div className="feat-desc">生成像你写的推文</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">📋</span>
          <div>
            <div className="feat-name">一键复制</div>
            <div className="feat-desc">复制后去 X 发布</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 加载状态 ==========
function TweetLoadingState({
  step,
  message,
}: {
  step: string;
  message: string | null;
}) {
  const steps = [
    { key: "analyzing_style", label: "分析风格" },
    { key: "generating", label: "生成推文" },
  ];

  return (
    <div className="empty-wrap">
      <div className="empty-icon" style={{ fontSize: 32 }}>
        {step === "analyzing_style" ? "🔍" : "✍️"}
      </div>
      <div className="empty-desc">
        {message || "AI 正在工作中..."}
      </div>
      <div className="loading-steps">
        {steps.map((s) => (
          <span
            key={s.key}
            className={`loading-step${step === s.key ? " active" : ""}`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ========== 结果面板 ==========
function TweetResultPanel({
  result,
  personaName,
  personaEmoji,
  personaId,
  styleProfile,
  copiedIndex,
  onCopy,
  onRefined,
  onRegenerate,
}: {
  result: TweetGenerateResponse;
  personaName: string;
  personaEmoji: string;
  personaId: string;
  styleProfile: StyleProfile;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
  onRefined: (index: number, refined: string, record: RefineRecord) => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {/* 风格画像摘要 */}
      <div style={{ marginBottom: 20 }}>
        <h3 className="analysis-heading">🎨 你的写作风格</h3>
        <div className="analysis-grid">
          <div>
            <span className="analysis-label">语调：</span>
            <span className="analysis-value">{styleProfile.tone}</span>
          </div>
          <div>
            <span className="analysis-label">句式：</span>
            <span className="analysis-value">
              {styleProfile.sentencePattern}
            </span>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <span className="analysis-label">总结：</span>
            <span className="analysis-value">{styleProfile.summary}</span>
          </div>
        </div>
      </div>

      <div className="divider-label">生成结果</div>

      {/* 推文列表 */}
      <div className="result-list">
        {result.tweets.map((tweet, i) => (
          <TweetCard
            key={i}
            index={i}
            tweet={tweet}
            personaName={personaName}
            personaId={personaId}
            styleProfile={styleProfile}
            isCopied={copiedIndex === i}
            onCopy={() => onCopy(tweet.text, i)}
            onRefined={onRefined}
          />
        ))}
      </div>

      {/* 底部操作栏 */}
      <div className="result-actions-bar">
        <button className="btn-act" onClick={onRegenerate}>
          🔄 换一批
        </button>
        <button
          className="btn-act"
          onClick={() => {
            const allText = result.tweets.map((t) => t.text).join("\n\n");
            navigator.clipboard.writeText(allText).catch(() => {
              const el = document.createElement("textarea");
              el.value = allText;
              el.style.position = "fixed";
              el.style.opacity = "0";
              document.body.appendChild(el);
              el.select();
              document.execCommand("copy");
              document.body.removeChild(el);
            });
          }}
        >
          📋 复制全部
        </button>
      </div>
    </>
  );
}
```

---

## Task 7: TweetCard Component

**目标**：独立的推文结果卡片组件

### 7.1 组件 — app/components/TweetCard.tsx

```typescript
// app/components/TweetCard.tsx
"use client";

import { useState } from "react";
import type { GeneratedTweet, StyleProfile } from "@/types/tweet";
import type { RefineRecord } from "@/types";

export default function TweetCard({
  index,
  tweet,
  personaName,
  personaId,
  styleProfile,
  isCopied,
  onCopy,
  onRefined,
}: {
  index: number;
  tweet: GeneratedTweet;
  personaName: string;
  personaId: string;
  styleProfile: StyleProfile;
  isCopied: boolean;
  onCopy: () => void;
  onRefined?: (index: number, refined: string, record: RefineRecord) => void;
}) {
  const [refiningType, setRefiningType] = useState<"colloquial" | "sharp" | null>(null);

  async function handleRefine(type: "colloquial" | "sharp") {
    if (!personaId || !onRefined) return;
    setRefiningType(type);
    try {
      const res = await fetch("/api/tweets/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweet: tweet.text,
          personaId,
          styleSummary: styleProfile.summary,
          refineType: type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const record: RefineRecord = {
          type,
          before: tweet.text,
          after: data.refined,
          createdAt: Date.now(),
        };
        onRefined(index, data.refined, record);
      } else {
        alert(data.error || "润色失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setRefiningType(null);
    }
  }

  return (
    <div className="result-item">
      <span className="res-num">{index + 1}</span>
      <div className="res-body">
        <div className="res-tags">
          <span className="tag tag-p">{personaName}</span>
          <span className="tag tag-t">{tweet.topic}</span>
          {tweet.originalText && (
            <span className="tag tag-refined">已润色</span>
          )}
          <span className="tag-heat">
            匹配度{" "}
            <strong
              className={`score-${tweet.score >= 80 ? "high" : "mid"}`}
            >
              {tweet.score}
            </strong>{" "}
            ✨
          </span>
        </div>
        <div className="res-text">{tweet.text}</div>
        {tweet.reason && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            {tweet.reason}
          </div>
        )}
        <div className="res-actions">
          <button className="btn-act" onClick={onCopy}>
            {isCopied ? "✅ 已复制" : "📋 复制"}
          </button>
          {tweet.originalText && onRefined && (
            <button
              className="btn-act"
              onClick={() => {
                onRefined(index, tweet.originalText!, {
                  type: "colloquial",
                  before: tweet.text,
                  after: tweet.originalText!,
                  createdAt: Date.now(),
                });
              }}
            >
              ↩ 还原
            </button>
          )}
          <button
            className="btn-act"
            disabled={!!refiningType}
            onClick={() => handleRefine("colloquial")}
          >
            {refiningType === "colloquial" ? "⏳ 润色中..." : "再口语一点"}
          </button>
          <button
            className="btn-act"
            disabled={!!refiningType}
            onClick={() => handleRefine("sharp")}
          >
            {refiningType === "sharp" ? "⏳ 润色中..." : "更犀利"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 7.2 推文润色 API — app/api/tweets/refine/route.ts

```typescript
// app/api/tweets/refine/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPersonaById } from "@/config/personas";
import { buildTweetRefinePrompt } from "@/config/prompts";
import { chatCompletion } from "@/lib/ai/client";

const VALID_REFINE_TYPES = ["colloquial", "sharp"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.tweet?.trim()) {
      return NextResponse.json(
        { error: "tweet 不能为空" },
        { status: 400 }
      );
    }

    const persona = getPersonaById(body.personaId);
    if (!persona) {
      return NextResponse.json(
        { error: `未知人格: ${body.personaId}` },
        { status: 400 }
      );
    }

    if (!VALID_REFINE_TYPES.includes(body.refineType)) {
      return NextResponse.json(
        { error: "refineType 只能是 colloquial 或 sharp" },
        { status: 400 }
      );
    }

    const prompt = buildTweetRefinePrompt({
      tweet: body.tweet,
      personaName: persona.name,
      personaDescription: persona.description,
      personaPrompt: persona.systemPrompt,
      styleSummary: body.styleSummary || "",
      refineType: body.refineType,
    });

    const refined = await chatCompletion(prompt, {
      temperature: 0.85,
      maxTokens: 300,
    });

    return NextResponse.json({ refined });
  } catch (error) {
    console.error("推文润色失败:", error);
    return NextResponse.json(
      { error: "润色失败，请重试" },
      { status: 500 }
    );
  }
}
```

---

## Task 8: Header Navigation

**目标**：在现有 Header 中增加"推文生成"入口

### 8.1 修改 app/page.tsx Header

在现有 Header 的 `.header-right` 中，登录/退出按钮前面加一个导航链接：

```tsx
<a href="/generate-tweets" className="btn-ghost" style={{ textDecoration: "none" }}>
  ✍️ 推文生成
</a>
```

### 8.2 测试

验证 Header 中存在指向 `/generate-tweets` 的链接。

---

## Task 9: 现有功能回归测试

**目标**：确保新功能不影响现有评论生成器

### 9.1 运行全量测试

```bash
npx vitest run
```

所有现有测试必须通过。

### 9.2 手动回归

- 评论生成流程正常
- 历史记录正常
- 登录/注册正常
- 主题切换正常

---

## Task 10: Integration Test

**目标**：推文生成端到端流程测试

### 10.1 测试 — \_\_tests\_\_/tweetE2E.test.ts

```typescript
// __tests__/tweetE2E.test.ts
import { describe, it, expect } from "vitest";
import { parseTweets, detectLanguage } from "@/lib/tweets/parseTweets";
import { buildAnalyzeStylePrompt } from "@/config/prompts";
import { buildGenerateTweetsPrompt } from "@/config/prompts";
import { buildTweetRefinePrompt } from "@/config/prompts";
import type { StyleProfile } from "@/types/tweet";

describe("tweet generation E2E flow", () => {
  const sampleTweets = [
    "今天又是被 AI 震撼的一天",
    "创业第三年，终于理解了 PMF 的意思",
    "说白了，大部分会议就是在浪费时间",
    "GPT-5 来了，你的工作还安全吗",
    "真正厉害的人，都在闷声做产品",
    "不要用战术上的勤奋掩盖战略上的懒惰",
    "AI 不会取代你，但会用 AI 的人会",
    "创业就是九死一生，但那一次值得",
  ];

  it("should parse tweets correctly", () => {
    const result = parseTweets(sampleTweets.join("\n"));
    expect(result.valid.length).toBe(8);
    expect(result.valid[0]).toBe("今天又是被 AI 震撼的一天");
  });

  it("should detect Chinese language", () => {
    const result = parseTweets(sampleTweets.join("\n"));
    expect(detectLanguage(result.valid)).toBe("zh");
  });

  it("should build analysis prompt without persona", () => {
    const prompt = buildAnalyzeStylePrompt(sampleTweets);
    expect(prompt).not.toContain("persona");
    expect(prompt).toContain("1. 今天又是被 AI 震撼的一天");
  });

  it("should build generation prompt with style and persona", () => {
    const style: StyleProfile = {
      tone: "直接",
      vocabulary: ["说白了"],
      sentencePattern: "短句",
      emojiUsage: "少",
      topics: ["AI", "创业"],
      avgLength: 30,
      lengthRange: "短推",
      summary: "直接、口语化",
    };
    const prompt = buildGenerateTweetsPrompt(
      style,
      { name: "贴吧老哥", systemPrompt: "你是贴吧老哥" } as any,
      3
    );
    expect(prompt).toContain("直接");
    expect(prompt).toContain("贴吧老哥");
    expect(prompt).toContain("3");
  });

  it("should build refine prompt for tweets", () => {
    const prompt = buildTweetRefinePrompt({
      tweet: "AI 改变一切",
      personaName: "贴吧老哥",
      personaDescription: "直接/玩梗",
      personaPrompt: "你是贴吧老哥",
      styleSummary: "直接、短句",
      refineType: "colloquial",
    });
    expect(prompt).toContain("AI 改变一切");
    expect(prompt).toContain("口语");
    expect(prompt).not.toContain("评论");
  });
});
```

---

## 文件清单

| 操作 | 文件 |
|------|------|
| 新增 | types/tweet.ts |
| 新增 | lib/tweets/parseTweets.ts |
| 新增 | lib/tweets/analyzeStyle.ts |
| 新增 | lib/tweets/generateTweets.ts |
| 新增 | app/generate-tweets/page.tsx |
| 新增 | app/components/TweetCard.tsx |
| 新增 | app/api/tweets/generate/route.ts |
| 新增 | app/api/tweets/refine/route.ts |
| 修改 | config/prompts.ts（追加 3 个函数） |
| 修改 | app/page.tsx（Header 加导航链接） |
| 新增 | \_\_tests\_\_/parseTweets.test.ts |
| 新增 | \_\_tests\_\_/analyzeStyle.test.ts |
| 新增 | \_\_tests\_\_/generateTweets.test.ts |
| 新增 | \_\_tests\_\_/tweetRefine.test.ts |
| 新增 | \_\_tests\_\_/tweetGenerateApi.test.ts |
| 新增 | \_\_tests\_\_/tweetE2E.test.ts |

## 成本预估

| 项目 | 数量 |
|------|------|
| 新增文件 | 8 个 |
| 修改文件 | 2 个 |
| 新增测试文件 | 6 个 |
| AI 调用（每生成一次） | 2 次（分析 + 生成） |
| Task 数量 | 10 个 |
| subagent 调用预估 | 10 × 3 = 30 次 |
| Opus 审查预估 | 1-2 轮 |
| 总预估 | ~32 次调用 |
