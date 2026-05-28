"use client";

import { useState } from "react";
import type { GeneratedComment, RefineRecord } from "@/types";

const angleLabels: Record<string, string> = {
  agree: "赞同",
  question: "质疑",
  joke: "调侃",
  supplement: "补充",
  empathy: "共鸣",
  sarcasm: "阴阳",
};

export default function CommentCard({
  index,
  comment,
  personaName,
  personaId,
  originalContent,
  isCopied,
  readOnly,
  onCopy,
  onRefined,
}: {
  index: number;
  comment: GeneratedComment;
  personaName: string;
  personaId?: string;
  originalContent?: string;
  isCopied: boolean;
  readOnly?: boolean;
  onCopy: () => void;
  onRefined?: (index: number, refined: string, record: RefineRecord) => void;
}) {
  const [refiningType, setRefiningType] = useState<"colloquial" | "sharp" | null>(null);
  const score = comment.score ?? 0;

  async function handleRefine(type: "colloquial" | "sharp") {
    if (!personaId || !originalContent || !onRefined) return;
    setRefiningType(type);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: comment.text,
          originalContent,
          personaId,
          refineType: type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const record: RefineRecord = {
          type,
          before: comment.text,
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
          <span className="tag tag-t">
            {angleLabels[comment.angle] || comment.angle}
          </span>
          {comment.originalText && (
            <span className="tag tag-refined">已润色</span>
          )}
          <span className="tag-heat">
            热度 <strong className={`score-${score >= 80 ? "high" : "mid"}`}>{score}</strong> 🔥
          </span>
        </div>
        <div className="res-text">{comment.text}</div>
        <div className="res-actions">
          <button className="btn-act" onClick={onCopy}>
            {isCopied ? "✅ 已复制" : "📋 复制"}
          </button>
          {comment.originalText && onRefined && (
            <button
              className="btn-act"
              onClick={() => {
                onRefined(index, comment.originalText!, {
                  type: "colloquial",
                  before: comment.text,
                  after: comment.originalText!,
                  createdAt: Date.now(),
                });
              }}
            >
              ↩ 还原
            </button>
          )}
          {!readOnly && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
