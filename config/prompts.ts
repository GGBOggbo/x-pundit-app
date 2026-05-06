import type { ContentAnalysis, Persona } from "@/types";

/**
 * 评论润色 Prompt
 */
export function buildRefinePrompt(params: {
  comment: string;
  originalContent: string;
  personaName: string;
  personaDescription: string;
  personaPrompt: string;
  lengthRange: { min: number; max: number };
  refineType: "colloquial" | "sharp";
}): string {
  const refineInstruction =
    params.refineType === "colloquial"
      ? "请把评论改得更口语、更随意、更像真人在手机上随手打的。保持原意不变，去掉书面语和 AI 味。"
      : "请把评论改得更犀利、更一针见血、更有评论区杀伤力。保持原意不变，增强力度，但不要人身攻击、不要辱骂、不要歧视性表达。";

  return `你是一个社交媒体评论润色专家。

【原推文内容】
${params.originalContent}

【当前人格】
${params.personaName}（${params.personaDescription}）

【人格风格要求】
${params.personaPrompt}

【人格字数限制】
${params.lengthRange.min}-${params.lengthRange.max} 字

【原评论】
${params.comment}

【润色任务】
${refineInstruction}

【要求】
1. 只输出润色后的评论本身
2. 不要解释
3. 不要加引号
4. 不要说"以下是"
5. 不要复述原推文
6. 不要变成客服口吻
7. 不要过度使用 emoji
8. 保持 X/Twitter 评论习惯，短平快
9. 严格遵守字数限制（${params.lengthRange.min}-${params.lengthRange.max} 字）`.trim();
}

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
