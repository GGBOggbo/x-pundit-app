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
