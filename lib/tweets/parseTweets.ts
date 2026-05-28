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
      text = text.slice(rtMatch[0].length).trim();
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
