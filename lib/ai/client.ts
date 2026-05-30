import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_AI_MODEL, getAiRuntimeConfig } from "@/lib/config/runtime";

function getClient() {
  const config = getAiRuntimeConfig();

  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

const DEFAULT_THINKING_BUDGET = 4096;
const DEFAULT_MAX_TOKENS = 32000;

export function buildMessageParams(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    thinking?: boolean;
    thinkingBudget?: number;
  }
) {
  const useThinking = options?.thinking !== false; // 默认开启
  const budget = options?.thinkingBudget ?? DEFAULT_THINKING_BUDGET;
  const requestedMax = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  // thinking 开启时，确保 max_tokens > budget_tokens（否则文本输出空间为 0）
  const maxTokens = useThinking && requestedMax <= budget ? budget + requestedMax : requestedMax;

  return {
    model: options?.model || process.env.AI_MODEL || DEFAULT_AI_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user" as const, content: prompt }],
    ...(useThinking && {
      thinking: { type: "enabled" as const, budget_tokens: budget },
    }),
    ...(!useThinking && options?.temperature !== undefined && { temperature: options.temperature }),
  };
}

export async function chatCompletion(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    thinking?: boolean;
    thinkingBudget?: number;
  }
): Promise<string> {
  const params = buildMessageParams(prompt, options);
  const client = getClient();
  const response = await client.messages.create(params);

  // 提取文本：优先 text block，fallback 到 thinking block
  const textBlock = response.content.find((block) => block.type === "text");
  if (textBlock && textBlock.type === "text" && textBlock.text.trim()) {
    return textBlock.text.trim();
  }

  const thinkingBlock = response.content.find((block) => block.type === "thinking");
  if (thinkingBlock && thinkingBlock.type === "thinking" && thinkingBlock.thinking.trim()) {
    return thinkingBlock.thinking.trim();
  }

  return "";
}

/**
 * 清理 JSON 字符串值内未转义的控制字符（换行、回车、制表符等）
 * AI 偶尔会在字符串值里插入裸换行，导致 JSON.parse 报 "Bad control character"
 */
function sanitizeControlChars(json: string): string {
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escape) {
      escape = false;
      result += ch;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
      continue;
    }
    result += ch;
  }

  return result;
}

/**
 * 解析 AI 返回的 JSON（处理 markdown 代码块、thinking 附加文本等脏数据）
 */
export function parseAIJson<T>(raw: string): T {
  let cleaned = raw.trim();

  // 去掉 ```json ... ``` 包裹
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");
  }

  // 直接能解析就返回
  try {
    return JSON.parse(sanitizeControlChars(cleaned)) as T;
  } catch {}

  // thinking 模式下 JSON 前后可能有额外文本，提取第一个完整 JSON 结构
  const startIdx = Math.min(
    ...[cleaned.indexOf("{"), cleaned.indexOf("[")].filter((i) => i >= 0)
  );
  if (startIdx === -1 || !Number.isFinite(startIdx)) throw new SyntaxError("No JSON found");

  const isOpen = cleaned[startIdx] === "{";
  const openChar = isOpen ? "{" : "[";
  const closeChar = isOpen ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;
    if (depth === 0) {
      return JSON.parse(sanitizeControlChars(cleaned.slice(startIdx, i + 1))) as T;
    }
  }

  throw new SyntaxError("Incomplete JSON");
}
