# 完全同意，你的思路非常清晰。直接开始写代码。

---

## 先把文件结构建出来

```text
/project-root
├── app/
│   ├── api/
│   │   └── comments/
│   │       └── route.ts              # 唯一的 API
│   ├── page.tsx                       # 主页面
│   └── components/
│       ├── InputPanel.tsx
│       ├── PersonaSelector.tsx
│       └── CommentResultList.tsx
├── lib/
│   └── ai/
│       ├── analyzeContent.ts
│       ├── generateComments.ts
│       ├── rankAndPolish.ts
│       └── client.ts                  # OpenAI client 封装
├── config/
│   ├── personas.ts
│   └── prompts.ts
└── types/
    └── index.ts
```

---

## Step 0：类型定义 `types/index.ts`

```ts
// types/index.ts

export type Sentiment = "positive" | "negative" | "neutral" | "controversial";

export type CommentAngle =
  | "agree"
  | "question"
  | "joke"
  | "supplement"
  | "empathy"
  | "sarcasm";

export interface ContentAnalysis {
  topic: string;
  coreOpinion: string;
  sentiment: Sentiment;
  keyEntities: string[];
  debatePoints: string[];
  emotionalHooks: string[];
  funPoints: string[];
}

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  language: "zh" | "en" | "both";
  description: string;
  tone: string[];
  avoid: string[];
  lengthRange: { min: number; max: number };
  catchphrases: string[];
  examples: string[];
  systemPrompt: string;
}

export interface GeneratedComment {
  text: string;
  angle: CommentAngle;
  score?: number;
  problems?: string[];
  polished?: string;
}

export interface GenerateRequest {
  content: string;
  personaId: string;
  count: number;
  language: "zh" | "en" | "auto";
}

export interface GenerateResponse {
  analysis: ContentAnalysis;
  comments: GeneratedComment[];
}
```

---

## Step 1：人格库 `config/personas.ts`（核心资产）

```ts
// config/personas.ts
import type { Persona } from "@/types";

export const personas: Persona[] = [
  // ========================
  //     中文人格
  // ========================
  {
    id: "tieba_bro",
    name: "贴吧老哥",
    emoji: "🍻",
    language: "zh",
    description: "贴吧资深冲浪选手，说话直接，爱玩梗",
    tone: ["直接", "玩梗", "微微阴阳", "短句为主"],
    avoid: ["说教", "长篇分析", "太礼貌", "AI口吻", "总结性语句"],
    lengthRange: { min: 10, max: 80 },
    catchphrases: [
      "绷不住了", "难绷", "乐", "好家伙", "懂得都懂",
      "蚌埠住了", "这不比xx强", "属于是", "记住你了"
    ],
    examples: [
      "绷不住了 每次都这样 先吹上天再说😅",
      "好家伙 格局打开了属于是",
      "乐 评论区比正文精彩",
    ],
    systemPrompt: `你是一个贴吧老哥，网龄15年+冲浪选手。

核心风格规则：
1. 开头喜欢用"绷不住了""难绷""乐""好家伙"等口头禅，但不是每条都用，自然地选择
2. 说话简短有力，一针见血，不啰嗦
3. 喜欢用省略号和反问句
4. 偶尔用emoji但克制（最多1-2个）
5. 会阴阳怪气但不恶毒，幽默为主
6. 绝对不用"不得不说""值得一提""总的来说"这类AI味词汇
7. 不说完整的规范句子，口语化，像在打字聊天
8. 评论里可以带脏字的语气但不要真骂人（"卧槽""我靠"可以）
9. 字数控制在 10-80 字之间
10. 像真人在手机上快速打的字，不像在写文章`,
  },

  {
    id: "zhihu_expert",
    name: "知乎大V",
    emoji: "🎓",
    language: "zh",
    description: "理性分析，结构清晰，有理有据还有点优越感",
    tone: ["理性", "结构化", "引用数据", "微微优越"],
    avoid: ["太情绪化", "玩梗过多", "口语化过度"],
    lengthRange: { min: 40, max: 200 },
    catchphrases: [
      "谢邀", "先说结论", "利益相关", "以上",
      "这个问题很好", "多说一句", "恰好我做过相关研究"
    ],
    examples: [
      "先说结论：这事没那么简单。\n1. 表面上看是xx\n2. 但实际上是认知差\n以上。",
    ],
    systemPrompt: `你是知乎风格的深度分析型评论者。

核心风格规则：
1. 喜欢"先说结论："开头，然后分点论述
2. 偶尔用"谢邀"但别每次都用
3. 会引用具体数据、案例或者类比来支撑观点
4. 语气客观理性，带一丝知识分子的优越感但不装
5. 结尾喜欢"以上。"或"利益相关：xx"
6. 可以适度表达不同意见，但总是有理有据
7. 不用emoji
8. 字数 40-200 字
9. 核心是让人觉得"这人确实懂"`,
  },

  {
    id: "weibo_hot",
    name: "微博热评",
    emoji: "🔥",
    language: "zh",
    description: "情绪饱满，金句制造机，就是让人想点赞",
    tone: ["情绪化", "共情", "金句", "emoji多"],
    avoid: ["理性分析", "分点论述", "太长"],
    lengthRange: { min: 10, max: 60 },
    catchphrases: [
      "笑死", "真的会谢", "DNA动了", "破防了",
      "谁懂啊", "救命", "人间真实"
    ],
    examples: [
      "笑死 这不就是我每天上班的状态吗😭😭😭",
      "破防了 这种事怎么每次都能精准踩到我的点🥺",
    ],
    systemPrompt: `你是微博热评风格，目标是写出让人想点赞的评论。

核心风格规则：
1. 情绪饱满，善于共情，让人觉得"说到心坎里了"
2. 善造金句，适合被截图转发
3. 大量使用emoji（😭🥺💀🔥😅🤣等），但自然不堆砌
4. 善用排比、对比、反转制造效果
5. 口语化，像在跟闺蜜/兄弟吐槽
6. 字数短！15-60字，金句不需要长
7. 有时候一个反问就够了
8. 不需要分析，要的是情绪共鸣`,
  },

  {
    id: "yin_yang",
    name: "阴阳大师",
    emoji: "🌝",
    language: "zh",
    description: "表面夸奖实则内涵，杀人不见血",
    tone: ["反语", "双关", "表面恭维", "杀伤力强"],
    avoid: ["直接骂人", "太明显的讽刺", "失去高级感"],
    lengthRange: { min: 8, max: 50 },
    catchphrases: [
      "好好好", "6", "真棒呢", "这可太xx了",
      "您说的都对", "确实", "格局大"
    ],
    examples: [
      "好好好 这个公关回应可以作为反面教材收藏了",
      "确实 有钱就是可以这样自信呢🌝",
    ],
    systemPrompt: `你是阴阳怪气评论大师。

核心风格规则：
1. 表面看是夸奖/赞同，实际在讽刺
2. 善用"好好好""6""真棒呢""确实"等词
3. 话里有话，让人品一品才反应过来
4. 绝不直接骂人——让人不舒服但挑不出毛病
5. 有时用🌝😅这类微妙emoji
6. 字数极短，8-50字
7. 高级感很重要——越短越毒越好
8. 有时可以假装认同来放大原文的荒谬`,
  },

  {
    id: "warm_support",
    name: "暖心鼓励",
    emoji: "🤗",
    language: "zh",
    description: "温柔有力量，具体地夸，真诚地鼓励",
    tone: ["温暖", "真诚", "具体", "有力量"],
    avoid: ["空泛的好话", "油腻", "居高临下", "说教"],
    lengthRange: { min: 15, max: 100 },
    catchphrases: ["加油", "真的很棒", "看到了努力", "会越来越好的"],
    examples: [
      "能看出来你在这件事上花了很多心思，这个角度真的不是随便能想到的 ✨",
    ],
    systemPrompt: `你是温暖鼓励型评论者。

核心风格规则：
1. 真诚而不油腻，温暖而不敷衍
2. 具体夸——要说出"哪里好""为什么好"，而不是泛泛说"很棒"
3. 使用温暖emoji但克制（✨❤️💪🌟，1-2个就好）
4. 给人力量感，而不是怜悯感
5. 字数 15-100
6. 核心是让对方看了之后会心一笑、感到被理解`,
  },

  {
    id: "duan_zi",
    name: "段子手",
    emoji: "😂",
    language: "zh",
    description: "脑回路清奇，一句话笑场，评论区氛围组",
    tone: ["出其不意", "谐音梗", "联想", "短"],
    avoid: ["冷笑话", "解释梗", "太长"],
    lengthRange: { min: 5, max: 40 },
    catchphrases: [],
    examples: [
      "GPT-5：我进化了。用户：你没有。GPT-5：但我涨价了。",
      "这篇文章最大的问题是——让我觉得自己还可以更摆",
    ],
    systemPrompt: `你是评论区段子手，目标是一句话让人笑。

核心风格规则：
1. 找到原文里最可以玩的一个点，只打这一个点
2. 善用：对话体、反转、谐音、类比、夸张、故意歪楼
3. 短！5-40字！段子不需要铺垫
4. 不解释梗，笑点到就收
5. 可以跟原文半毛钱关系，只要好笑就行
6. 宁可冷场也别啰嗦`,
  },

  // ========================
  //     英文人格
  // ========================
  {
    id: "tech_bro",
    name: "Tech Bro",
    emoji: "💻",
    language: "en",
    description: "Silicon Valley energy, everything is a paradigm shift",
    tone: ["confident", "jargon-heavy", "optimistic", "slightly ironic"],
    avoid: ["formal language", "academic tone", "negativity without wit"],
    lengthRange: { min: 10, max: 60 },
    catchphrases: [
      "this is the way", "ship it", "LGTM", "bullish",
      "ngl", "the future is now", "based"
    ],
    examples: [
      "ngl this is exactly the kind of disruption we need. ship it.",
      "LGTM. Bullish on this approach, bearish on everything else.",
    ],
    systemPrompt: `You are a Silicon Valley tech worker / Twitter tech bro.

Style rules:
1. Casual, confident, slightly ironic
2. Use tech jargon naturally: "ship it", "LGTM", "bullish", "ngl"
3. Relate things to startups, AI, or engineering culture when possible
4. Short punchy takes, not essays
5. Can be contrarian but always with reasoning
6. No emojis or very minimal (maybe 🚀 once in a while)
7. 10-60 words
8. Sound like you're tweeting from a standing desk in SF`,
  },

  {
    id: "gen_z",
    name: "Gen-Z",
    emoji: "💀",
    language: "en",
    description: "chronically online, all lowercase, chaotic energy",
    tone: ["casual", "chaotic", "lowercase", "meme-literate"],
    avoid: ["proper grammar", "formality", "long sentences"],
    lengthRange: { min: 3, max: 30 },
    catchphrases: [
      "no cap", "fr fr", "lowkey", "slay", "based",
      "this is giving", "not the", "dead", "im crying",
      "bro what", "real"
    ],
    examples: [
      "not the ceo pretending this wasn't planned 💀",
      "bro what. this is giving main character energy fr",
    ],
    systemPrompt: `You are a Gen-Z Twitter user. Chronically online.

Style rules:
1. ALL LOWERCASE. no capitalization ever
2. Minimal punctuation, no periods
3. Heavy use of "no cap", "fr fr", "lowkey", "slay", "based", "im crying"
4. Use 💀 and 😭 liberally
5. Extremely short: 3-30 words
6. React emotionally first, think later
7. Can use "this is giving [noun]" format
8. Sound like you're on your phone at 2am`,
  },
];

// 快速查询
export const getPersonaById = (id: string): Persona | undefined =>
  personas.find((p) => p.id === id);

export const getPersonasByLanguage = (lang: "zh" | "en"): Persona[] =>
  personas.filter((p) => p.language === lang || p.language === "both");
```

---

## Step 2：Prompt 模板 `config/prompts.ts`

```ts
// config/prompts.ts
import type { ContentAnalysis, Persona } from "@/types";

/**
 * 内容分析 Prompt
 */
export function buildAnalysisPrompt(content: string, language: string): string {
  const lang = language === "en" ? "English" : "中文";

  return `你是一个社交媒体内容分析专家。请分析以下推文/文章内容，用${lang}输出。

---内容开始---
${content}
---内容结束---

请严格输出以下 JSON（不要输出其他任何内容）：

{
  "topic": "主题分类，如：科技/政治/搞笑/生活/财经/游戏/情感...",
  "coreOpinion": "作者核心观点，一句话",
  "sentiment": "positive 或 negative 或 neutral 或 controversial",
  "keyEntities": ["涉及的关键实体：人名/产品/事件，最多5个"],
  "debatePoints": ["可以讨论或反驳的点，2-3个"],
  "emotionalHooks": ["容易引发共鸣的点，1-2个"],
  "funPoints": ["可以玩梗或调侃的点，1-2个"]
}`;
}

/**
 * 评论生成 Prompt
 */
export function buildGenerationPrompt(
  analysis: ContentAnalysis,
  persona: Persona,
  count: number,
  originalContent: string
): string {
  // 不同角度的分配策略
  const angleInstruction =
    count <= 3
      ? "每条评论选不同角度（从 赞同/质疑/调侃 中选）"
      : count <= 5
        ? "5条评论的角度分配：1条赞同、1条质疑、1条调侃/玩梗、1条补充、1条共情（可微调）"
        : "尽量覆盖多种角度，不要重复";

  return `${persona.systemPrompt}

---

你现在要对以下推文发表评论。

【原文】
${originalContent.slice(0, 500)}

【内容分析】
- 主题：${analysis.topic}
- 核心观点：${analysis.coreOpinion}
- 情绪倾向：${analysis.sentiment}
- 可讨论的点：${analysis.debatePoints.join("；")}
- 可玩梗的点：${analysis.funPoints.join("；")}
- 可共情的点：${analysis.emotionalHooks.join("；")}

【生成要求】
1. 生成 ${count} 条评论
2. ${angleInstruction}
3. 每条评论必须像真人在手机上随手打的——不像 AI 生成
4. 不要复述/总结原文，要有你自己的反应
5. 严格遵守你的风格规则和字数限制（${persona.lengthRange.min}-${persona.lengthRange.max}字）
6. 以下词汇绝对禁止出现：不得不说、值得一提的是、总的来说、众所周知、毋庸置疑、在当今社会

请严格按以下 JSON 数组格式输出（不要输出其他任何内容）：

[
  {
    "text": "评论内容",
    "angle": "agree 或 question 或 joke 或 supplement 或 empathy 或 sarcasm"
  }
]`;
}

/**
 * 质量评分 + 润色 Prompt
 */
export function buildRankAndPolishPrompt(
  comment: string,
  persona: Persona,
  originalContent: string
): string {
  return `你是社交媒体评论质量评审专家。

请对以下评论进行评分和润色。

【原文摘要】
${originalContent.slice(0, 200)}

【评论人格】${persona.name}（${persona.description}）

【待评审评论】
${comment}

【评分维度（每项1-100分）】
1. 真人感：是否像真人写的，有没有 AI 味？
2. 相关性：跟原文有没有关系？
3. 风格匹配：是否符合"${persona.name}"的说话风格？
4. 网感：放在 X/Twitter 评论区违不违和？
5. 复制欲：用户会不会想直接拿去发？

【AI味检测清单】
以下特征每出现一个扣10分：
- "不得不说""值得一提""总的来说""众所周知"
- 过于工整的排比
- 完美的因果逻辑链
- 说教口吻
- 太面面俱到、两边都夸

请严格输出以下 JSON（不要输出其他任何内容）：

{
  "score": 综合分(1-100的整数),
  "breakdown": {
    "authenticity": 分数,
    "relevance": 分数,
    "styleMatch": 分数,
    "vibeCheck": 分数,
    "copyDesire": 分数
  },
  "problems": ["问题1", "问题2"],
  "polished": "润色后的评论（如果原评论已经很好就原样返回）"
}`;
}
```

---

## Step 3：AI Client 封装 `lib/ai/client.ts`

```ts
// lib/ai/client.ts
import OpenAI from "openai";

// 支持 OpenAI / DeepSeek / 任何兼容 API
const client = new OpenAI({
  apiKey: process.env.AI_API_KEY!,
  baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
});

export async function chatCompletion(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }
): Promise<string> {
  const response = await client.chat.completions.create({
    model: options?.model || process.env.AI_MODEL || "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 2000,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

/**
 * 解析 AI 返回的 JSON（处理 markdown 代码块等脏数据）
 */
export function parseAIJson<T>(raw: string): T {
  // 去掉可能的 ```json ... ``` 包裹
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned) as T;
}
```

---

## Step 4：内容分析器 `lib/ai/analyzeContent.ts`

```ts
// lib/ai/analyzeContent.ts
import type { ContentAnalysis } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildAnalysisPrompt } from "@/config/prompts";

export async function analyzeContent(
  content: string,
  language: "zh" | "en" | "auto" = "auto"
): Promise<ContentAnalysis> {
  // 自动检测语言：简单启发式
  const lang =
    language === "auto"
      ? /[\u4e00-\u9fff]/.test(content)
        ? "zh"
        : "en"
      : language;

  const prompt = buildAnalysisPrompt(content, lang);

  const raw = await chatCompletion(prompt, {
    temperature: 0.3, // 分析需要更确定性
    maxTokens: 800,
  });

  return parseAIJson<ContentAnalysis>(raw);
}
```

---

## Step 5：评论生成器 `lib/ai/generateComments.ts`

```ts
// lib/ai/generateComments.ts
import type { ContentAnalysis, GeneratedComment, Persona } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildGenerationPrompt } from "@/config/prompts";

interface RawComment {
  text: string;
  angle: string;
}

export async function generateComments(
  originalContent: string,
  analysis: ContentAnalysis,
  persona: Persona,
  count: number = 5
): Promise<GeneratedComment[]> {
  const prompt = buildGenerationPrompt(
    analysis,
    persona,
    count,
    originalContent
  );

  const raw = await chatCompletion(prompt, {
    temperature: 0.92, // 高创意
    maxTokens: 1500,
  });

  const parsed = parseAIJson<RawComment[]>(raw);

  // 基础校验 & 标准化
  return parsed
    .filter((c) => c.text && c.text.length > 0)
    .map((c) => ({
      text: c.text,
      angle: validateAngle(c.angle),
    }));
}

function validateAngle(angle: string): GeneratedComment["angle"] {
  const valid = [
    "agree",
    "question",
    "joke",
    "supplement",
    "empathy",
    "sarcasm",
  ];
  return valid.includes(angle)
    ? (angle as GeneratedComment["angle"])
    : "agree";
}
```

---

## Step 6：质量评分 + 润色 `lib/ai/rankAndPolish.ts`

```ts
// lib/ai/rankAndPolish.ts
import type { GeneratedComment, Persona } from "@/types";
import { chatCompletion, parseAIJson } from "./client";
import { buildRankAndPolishPrompt } from "@/config/prompts";

interface RankResult {
  score: number;
  breakdown: {
    authenticity: number;
    relevance: number;
    styleMatch: number;
    vibeCheck: number;
    copyDesire: number;
  };
  problems: string[];
  polished: string;
}

/**
 * 对单条评论评分 + 润色
 */
async function rankOne(
  comment: string,
  persona: Persona,
  originalContent: string
): Promise<RankResult> {
  const prompt = buildRankAndPolishPrompt(comment, persona, originalContent);
  const raw = await chatCompletion(prompt, {
    temperature: 0.3,
    maxTokens: 500,
  });
  return parseAIJson<RankResult>(raw);
}

/**
 * 批量评分 + 润色，按分数排序返回
 */
export async function rankAndPolishComments(
  comments: GeneratedComment[],
  persona: Persona,
  originalContent: string
): Promise<GeneratedComment[]> {
  // 并发评分（所有评论同时打分）
  const results = await Promise.all(
    comments.map(async (comment) => {
      try {
        const rank = await rankOne(comment.text, persona, originalContent);
        return {
          ...comment,
          score: rank.score,
          problems: rank.problems,
          polished: rank.polished,
          // 如果润色后跟原文不同，替换
          text: rank.polished || comment.text,
        };
      } catch {
        // 评分失败就保留原评论，给个默认分
        return { ...comment, score: 60, problems: ["评分失败"] };
      }
    })
  );

  // 按分数降序
  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
```

---

## Step 7：API 路由 `app/api/comments/route.ts`

```ts
// app/api/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest, GenerateResponse } from "@/types";
import { getPersonaById } from "@/config/personas";
import { analyzeContent } from "@/lib/ai/analyzeContent";
import { generateComments } from "@/lib/ai/generateComments";
import { rankAndPolishComments } from "@/lib/ai/rankAndPolish";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    // 1. 参数校验
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "content 不能为空" },
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

    const count = Math.min(Math.max(body.count || 5, 1), 10); // 1-10条

    // 2. 内容分析
    const analysis = await analyzeContent(body.content, body.language);

    // 3. 生成评论
    const rawComments = await generateComments(
      body.content,
      analysis,
      persona,
      count
    );

    // 4. 评分 + 润色
    const rankedComments = await rankAndPolishComments(
      rawComments,
      persona,
      body.content
    );

    // 5. 返回
    const response: GenerateResponse = {
      analysis,
      comments: rankedComments,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成失败:", error);
    return NextResponse.json(
      { error: "生成失败，请重试" },
      { status: 500 }
    );
  }
}
```

---

## Step 8：前端页面 `app/page.tsx`

```tsx
// app/page.tsx
"use client";

import { useState } from "react";
import { personas } from "@/config/personas";
import type { GenerateResponse, GeneratedComment } from "@/types";

// 角度中文映射
const angleLabels: Record<string, string> = {
  agree: "👍 赞同",
  question: "🤔 质疑",
  joke: "😂 玩梗",
  supplement: "📝 补充",
  empathy: "🤝 共情",
  sarcasm: "🌝 阴阳",
};

export default function Home() {
  const [content, setContent] = useState("");
  const [personaId, setPersonaId] = useState("tieba_bro");
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, personaId, count, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || "生成失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const selectedPersona = personas.find((p) => p.id === personaId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">🗣️ X 评论生成器</h1>
        <p className="text-gray-400 mb-8">
          粘贴推文 → 选人格 → 生成真人感评论
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ========== 左侧：输入面板 ========== */}
          <div className="space-y-6">
            {/* 推文输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📋 粘贴推文内容
              </label>
              <textarea
                className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-4 
                           text-white placeholder-gray-500 resize-none
                           focus:outline-none focus:border-blue-500 transition"
                placeholder="把推文内容粘贴到这里..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {content.length} 字
              </div>
            </div>

            {/* 人格选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🎭 选择评论人格
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonaId(p.id)}
                    className={`p-3 rounded-lg border text-sm text-left transition
                      ${
                        personaId === p.id
                          ? "border-blue-500 bg-blue-500/10 text-blue-400"
                          : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                      }`}
                  >
                    <div className="text-lg mb-1">{p.emoji}</div>
                    <div className="font-medium">{p.name}</div>
                  </button>
                ))}
              </div>
              {selectedPersona && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedPersona.description}
                </p>
              )}
            </div>

            {/* 选项行 */}
            <div className="flex gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="auto">🌐 自动</option>
                  <option value="zh">🇨🇳 中文</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  数量
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} 条
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={loading || !content.trim()}
              className="w-full py-3 rounded-lg font-medium text-lg transition
                         bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                         disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ 生成中..." : "🚀 生成评论"}
            </button>
          </div>

          {/* ========== 右侧：结果面板 ========== */}
          <div className="space-y-6">
            {/* 内容分析 */}
            {result?.analysis && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  📊 内容分析
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">主题：</span>
                    {result.analysis.topic}
                  </div>
                  <div>
                    <span className="text-gray-500">情绪：</span>
                    {result.analysis.sentiment}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">核心观点：</span>
                    {result.analysis.coreOpinion}
                  </div>
                </div>
              </div>
            )}

            {/* 评论列表 */}
            {result?.comments && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400">
                  💬 生成评论（按质量排序）
                </h3>
                {result.comments.map((comment, i) => (
                  <CommentCard
                    key={i}
                    index={i}
                    comment={comment}
                    isCopied={copiedIndex === i}
                    onCopy={() => handleCopy(comment.text, i)}
                  />
                ))}
              </div>
            )}

            {/* 空状态 */}
            {!result && !loading && (
              <div className="flex items-center justify-center h-64 text-gray-600">
                ← 粘贴推文内容，选择人格，点击生成
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 评论卡片组件 ==========
function CommentCard({
  index,
  comment,
  isCopied,
  onCopy,
}: {
  index: number;
  comment: GeneratedComment;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 group hover:border-gray-600 transition">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
            {angleLabels[comment.angle] || comment.angle}
          </span>
          {comment.score && (
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded ${
                comment.score >= 80
                  ? "bg-green-900/50 text-green-400"
                  : comment.score >= 60
                    ? "bg-yellow-900/50 text-yellow-400"
                    : "bg-red-900/50 text-red-400"
              }`}
            >
              {comment.score}分
            </span>
          )}
        </div>
        <span className="text-xs text-gray-600">#{index + 1}</span>
      </div>

      {/* 评论正文 */}
      <p className="text-white text-base leading-relaxed mb-3">
        {comment.text}
      </p>

      {/* 问题提示 */}
      {comment.problems && comment.problems.length > 0 && (
        <div className="text-xs text-gray-500 mb-2">
          💡 {comment.problems.join("、")}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 
                     transition font-medium"
        >
          {isCopied ? "✅ 已复制" : "📋 复制"}
        </button>
      </div>
    </div>
  );
}
```

---

## Step 9：环境变量 `.env.local`

```env
# OpenAI
AI_API_KEY=sk-xxxxxxxx
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o

# 如果用 DeepSeek（便宜很多，中文效果好）:
# AI_API_KEY=sk-xxxxxxxx
# AI_BASE_URL=https://api.deepseek.com/v1
# AI_MODEL=deepseek-chat
```

---

## Step 10：启动

```bash
# 安装依赖
npm install openai

# 启动
npm run dev
```

---

## 现在你拥有的是什么

```text
✅ 8 个开箱即用的人格（6中文 + 2英文）
✅ 内容分析 → 评论生成 → 质量评分润色 完整链路
✅ 一个 API 端点搞定一切
✅ 暗色主题 UI，左右分栏
✅ 一键复制
✅ 按质量排序 + 分数显示
✅ 支持 OpenAI / DeepSeek / 任何兼容 API 一键切换
```

**下一步你可以做的（V0.2）：**

| 优先级 | 功能 | 难度 |
|--------|------|------|
| 🔴 高 | "换一批" / "这条换个说法"按钮 | 简单 |
| 🔴 高 | 自定义人格（用户自己写描述） | 中等 |
| 🟡 中 | 评论历史记录（localStorage） | 简单 |
| 🟡 中 | 流式输出（打字机效果） | 中等 |
| 🟢 低 | Chrome 插件 | 较复杂 |

先跑起来，拿真实推文测试，调 prompt，打磨人格——**这比任何功能都重要。**