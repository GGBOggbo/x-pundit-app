export const DEFAULT_AI_BASE_URL = "https://open.bigmodel.cn/api/anthropic";
export const DEFAULT_AI_MODEL = "claude-3-5-sonnet-20241022";

export function getAiRuntimeConfig() {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing required environment variable: AI_API_KEY");
  }

  return {
    apiKey,
    baseURL: process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL,
    model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
  };
}
