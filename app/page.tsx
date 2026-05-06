"use client";

import { useState, useEffect } from "react";
import { personas } from "@/config/personas";
import type { GenerateResponse, GeneratedComment, RefineRecord } from "@/types";
import { createHistoryItem, getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";
import PersonaPickerModal from "./components/PersonaPickerModal";

const angleLabels: Record<string, string> = {
  agree: "赞同",
  question: "质疑",
  joke: "调侃",
  supplement: "补充",
  empathy: "共鸣",
  sarcasm: "阴阳",
};

const features = [
  { icon: "🌀", name: "多角度评论", desc: "不同视角切入" },
  { icon: "👤", name: "真人感优化", desc: "告别 AI 味" },
  { icon: "📍", name: "热度评分", desc: "预测互动热度" },
  { icon: "📋", name: "一键复制", desc: "快速复制使用" },
];

export default function Home() {
  const [content, setContent] = useState("");
  const [personaId, setPersonaId] = useState("tieba_bro");
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [generationStep, setGenerationStep] = useState<"idle" | "analyzing" | "generating" | "ranking" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [resultPersona, setResultPersona] = useState<{ name: string; emoji: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          setSession(data);
          // 首次登录后迁移 localStorage
          const localItems = getLocalHistory();
          if (localItems.length > 0) {
            migrateLocalHistory(localItems).then((result) => {
              if (result.imported > 0) clearLocalHistory();
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    const currentPersona = personas.find((p) => p.id === personaId)!;
    setLoading(true);
    setResult(null);
    setResultPersona(null);
    setGenerationStep("analyzing");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, personaId, count, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerationStep("done");
        setResult(data);
        setResultPersona({ name: currentPersona.name, emoji: currentPersona.emoji });
        // 已登录则保存到后端
        if (session?.user?.id) {
          try {
            await createHistoryItem({
              content,
              personaId,
              personaName: currentPersona.name,
              personaEmoji: currentPersona.emoji,
              comments: data.comments,
              analysis: data.analysis,
            });
          } catch {
            // 保存失败不影响展示
          }
        }
      } else {
        alert(data.error || "生成失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setLoading(false);
      setGenerationStep("idle");
    }
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

  const handlePasteExample = () => {
    setContent(
      "GPT-5 正式发布，官方称在多项基准测试中超越人类专家水平，推理能力提升 3 倍……"
    );
  };

  const selectedPersona = personas.find((p) => p.id === personaId);

  function handleCommentRefined(index: number, refined: string, record: RefineRecord) {
    if (!result) return;
    const updated = { ...result };
    const comment = { ...updated.comments[index] };
    comment.originalText = comment.originalText ?? comment.text;
    comment.refineHistory = [...(comment.refineHistory || []), record];
    comment.text = refined;
    updated.comments = [...updated.comments];
    updated.comments[index] = comment;
    setResult(updated);
  }

  return (
    <div className="page">
      {/* ══ HEADER ══ */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="header-titles">
            <h1>X 评论生成器</h1>
            <p>把普通回复，变成像真人写的高互动评论</p>
          </div>
        </div>
        <div className="header-right">
          {session ? (
            <>
              <a href="/history" className="btn-ghost" style={{ textDecoration: "none" }}>
                📋 历史记录
              </a>
              <button
                className="btn-primary"
                onClick={() => {
                  fetch("/api/auth/signout", { method: "POST" }).then(() => {
                    setSession(null);
                    window.location.reload();
                  });
                }}
              >
                👋 退出
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-ghost"
                onClick={() => window.location.href = "/login?redirect=/history"}
              >
                📋 历史记录
              </button>
              <a href="/login" className="btn-primary" style={{ textDecoration: "none" }}>
                🔑 登录
              </a>
            </>
          )}
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <div className="main">
        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          {/* STEP 1 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 1</span>
              <span className="step-name">粘贴推文内容</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴一条 X 推文、长文观点，或者想回复的内容..."
            />
            <div
              className="char-count"
              style={{ color: content.length > 1800 ? "#F59E0B" : "#475569" }}
            >
              {content.length} / 2000 字
            </div>
            <div className="mini-btns">
              <button className="btn-mini" onClick={handlePasteExample}>
                📋 粘贴示例
              </button>
              {content.length > 0 && (
                <button className="btn-mini" onClick={() => setContent("")}>
                  🗑 清空
                </button>
              )}
            </div>
          </div>

          {/* STEP 2 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 2</span>
              <span className="step-name">选择评论人格</span>
            </div>
            {selectedPersona && (
              <div
                className="selected-persona"
                onClick={() => setIsPersonaModalOpen(true)}
              >
                <div className="selected-persona-emoji">{selectedPersona.emoji}</div>
                <div className="selected-persona-info">
                  <div className="selected-persona-name">{selectedPersona.name}</div>
                  <div className="selected-persona-desc">{selectedPersona.description}</div>
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

          {/* STEP 3 */}
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
                    <option value={5}>5 条</option>
                    <option value={3}>3 条</option>
                    <option value={10}>10 条</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
            </div>
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={loading || !content.trim()}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading || !content.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "⏳ 生成中..." : `🚀 生成 ${count} 条真人感评论`}
            </button>
            <div className="gen-note">预计消耗 1 次生成额度</div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="card">
            <div className="panel-title">✨ 生成结果预览</div>

            {!result && !loading && <EmptyState />}
            {loading && <LoadingState step={generationStep} />}
            {result && resultPersona && (
              <ResultPanel
                result={result}
                personaName={resultPersona.name}
                personaEmoji={resultPersona.emoji}
                personaId={personaId}
                originalContent={content}
                copiedIndex={copiedIndex}
                onCopy={handleCopy}
                onRefined={handleCommentRefined}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 空状态 ==========
function EmptyState() {
  return (
    <>
      <div className="empty-wrap">
        <div className="empty-icon">📦</div>
        <div className="empty-desc">
          粘贴推文后，我会帮你生成多角度、低 AI 味、高互动感的评论
        </div>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature-item" key={f.name}>
              <span className="feat-icon">{f.icon}</span>
              <div>
                <div className="feat-name">{f.name}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider-label">示例评论预览</div>
      <div className="example-box">
        <div className="ex-text">
          绷不住了，这不就是每次大版本更新先吹上天的经典剧情吗😅
        </div>
        <div className="ex-meta">
          <span>贴吧老哥</span>
          <span className="dot" />
          <span>调侃</span>
          <span className="dot" />
          <span>
            热度 <strong style={{ color: "#F59E0B" }}>86</strong> 🔥
          </span>
        </div>
      </div>
    </>
  );
}

// ========== 加载状态 ==========
function LoadingState({ step }: { step: string }) {
  const stepLabels: Record<string, { text: string; icon: string }> = {
    analyzing: { text: "正在分析内容...", icon: "🔍" },
    generating: { text: "正在生成评论...", icon: "✍️" },
    ranking: { text: "正在评分润色...", icon: "⭐" },
  };
  const current = stepLabels[step] || { text: "AI 正在生成评论...", icon: "✨" };
  const steps = [
    { key: "analyzing", label: "分析" },
    { key: "generating", label: "生成" },
    { key: "ranking", label: "评分" },
  ];

  return (
    <div className="empty-wrap">
      <div className="empty-icon" style={{ fontSize: 32 }}>{current.icon}</div>
      <div className="empty-desc">{current.text}</div>
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
function ResultPanel({
  result,
  personaName,
  personaEmoji,
  personaId,
  originalContent,
  copiedIndex,
  onCopy,
  onRefined,
  onRegenerate,
}: {
  result: GenerateResponse;
  personaName: string;
  personaEmoji: string;
  personaId: string;
  originalContent: string;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
  onRefined: (index: number, refined: string, record: RefineRecord) => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {/* 内容分析 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#64748B", marginBottom: 10 }}>
          📊 内容分析
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div>
            <span style={{ color: "#64748B" }}>主题：</span>
            <span style={{ color: "#CBD5E1" }}>{result.analysis.topic}</span>
          </div>
          <div>
            <span style={{ color: "#64748B" }}>情绪：</span>
            <span style={{ color: "#CBD5E1" }}>{result.analysis.sentiment}</span>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <span style={{ color: "#64748B" }}>核心观点：</span>
            <span style={{ color: "#CBD5E1" }}>{result.analysis.coreOpinion}</span>
          </div>
        </div>
      </div>

      <div className="divider-label">生成结果</div>

      {/* 评论列表 */}
      <div className="result-list">
        {result.comments.map((comment, i) => (
          <CommentCard
            key={i}
            index={i}
            comment={comment}
            personaName={personaName}
            personaId={personaId}
            originalContent={originalContent}
            isCopied={copiedIndex === i}
            onCopy={() => onCopy(comment.text, i)}
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
            const allText = result.comments.map((c) => c.text).join("\n\n");
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

// ========== 评论卡片 ==========
function CommentCard({
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
            热度 <strong style={{ color: score >= 80 ? "#22C55E" : "#F59E0B" }}>{score}</strong> 🔥
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
