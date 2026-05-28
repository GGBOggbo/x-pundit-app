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
