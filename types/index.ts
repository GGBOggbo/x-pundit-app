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

export interface RefineRecord {
  type: "colloquial" | "sharp";
  before: string;
  after: string;
  createdAt: number;
}

export interface GeneratedComment {
  text: string;
  angle: CommentAngle;
  score?: number;
  problems?: string[];
  polished?: string;
  originalText?: string;
  refineHistory?: RefineRecord[];
}

export interface HistoryItem {
  id: string;
  userId?: string;           // 后端存储时必填，localStorage 迁移时可选
  createdAt: number;
  content: string;
  contentPreview: string;
  personaId: string;
  personaName: string;
  personaEmoji: string;
  commentCount: number;
  comments: GeneratedComment[];
  analysis: ContentAnalysis;
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
