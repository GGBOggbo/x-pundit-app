"use client";

import Link from "next/link";
import { useState, useEffect, useReducer, useRef } from "react";
import { personas } from "@/config/personas";
import type { GenerateResponse, RefineRecord } from "@/types";
import { createHistoryItem, getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";
import PersonaPickerModal from "./components/PersonaPickerModal";
import ThemeToggle from "./components/ThemeToggle";
import CommentCard from "./components/CommentCard";
import ToastContainer, { showToast } from "./components/Toast";

// ========== 状态管理 ==========

type GenerationStep = "idle" | "analyzing" | "generating" | "ranking" | "done";

interface GenerateState {
  step: GenerationStep;
  error: string | null;
}

type GenerateAction =
  | { type: "START" }
  | { type: "SET_STEP"; step: GenerationStep }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

function generateReducer(state: GenerateState, action: GenerateAction): GenerateState {
  switch (action.type) {
    case "START":
      return { step: "analyzing", error: null };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return { step: "idle", error: null };
    default:
      return state;
  }
}

// ========== 常量 ==========

const features = [
  { icon: "🌀", name: "多角度评论", desc: "不同视角切入" },
  { icon: "👤", name: "真人感优化", desc: "告别 AI 味" },
  { icon: "📍", name: "热度评分", desc: "预测互动热度" },
  { icon: "📋", name: "一键复制", desc: "快速复制使用" },
];

// ========== 主页面 ==========

export default function Home() {
  const [content, setContent] = useState("");
  const [personaId, setPersonaId] = useState("tieba_bro");
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [genState, genDispatch] = useReducer(generateReducer, { step: "idle", error: null });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [resultPersona, setResultPersona] = useState<{ name: string; emoji: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loading = genState.step !== "idle";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          setSession(data);
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

  // 组件卸载时取消进行中的请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    if (!content.trim()) return;

    // 取消之前的请求
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentPersona = personas.find((p) => p.id === personaId)!;
    setResult(null);
    setResultPersona(null);
    genDispatch({ type: "START" });

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, personaId, count, language }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "生成失败", "error");
        genDispatch({ type: "RESET" });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.step === "done") {
            genDispatch({ type: "SET_STEP", step: "done" });
            setResult(event.result);
            setResultPersona({ name: currentPersona.name, emoji: currentPersona.emoji });
            if (session?.user?.id) {
              try {
                await createHistoryItem({
                  content,
                  personaId,
                  personaName: currentPersona.name,
                  personaEmoji: currentPersona.emoji,
                  comments: event.result.comments,
                  analysis: event.result.analysis,
                });
              } catch {
                // 保存失败不影响展示
              }
            }
          } else if (event.step === "error") {
            showToast(event.error || "生成失败", "error");
            genDispatch({ type: "RESET" });
          } else {
            genDispatch({ type: "SET_STEP", step: event.step });
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // 用户取消，不显示错误
        return;
      }
      showToast("网络错误，请重试", "error");
      genDispatch({ type: "RESET" });
    } finally {
      if (!controller.signal.aborted) {
        genDispatch({ type: "RESET" });
      }
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    genDispatch({ type: "RESET" });
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
      <ToastContainer />

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
          <ThemeToggle />
          <Link href="/generate-tweets" className="btn-ghost" style={{ textDecoration: "none" }}>
            ✍️ 推文生成
          </Link>
          {session ? (
            <>
              <Link href="/history" className="btn-ghost" style={{ textDecoration: "none" }}>
                📋 历史记录
              </Link>
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
              <Link href="/login" className="btn-primary" style={{ textDecoration: "none" }}>
                🔑 登录
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="workspace-hero workspace-hero-comment">
        <div className="workspace-hero-copy">
          <span className="workspace-eyebrow">X Comments Studio</span>
          <h2>把普通回复升级成更像真人、更值得发出的评论草案</h2>
          <p>
            输入一条内容，系统会先判断语境，再按你的表达方向生成一组可直接发出的候选评论。
            它更像一个评论工作台，而不只是一次性生成器。
          </p>
          <div className="workspace-chip-row">
            <span className="workspace-chip">热点跟评</span>
            <span className="workspace-chip">观点回复</span>
            <span className="workspace-chip">产品讨论</span>
          </div>
        </div>
        <div className="workspace-hero-side">
          <div className="workspace-stat">
            <strong>3 段流程</strong>
            <span>分析内容 → 生成评论 → 排序挑选</span>
          </div>
          <div className="workspace-stat">
            <strong>最适合</strong>
            <span>你知道想参与讨论，但还没想好怎么回的时候</span>
          </div>
        </div>
      </section>

      {/* ══ MAIN ══ */}
      <div className="main">
        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          {/* STEP 1 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 1</span>
              <span className="step-name">输入你要回复的内容</span>
            </div>
            <div className="section-helper">
              粘贴一条推文、长文观点，或者任何你想参与讨论的内容。越具体，生成结果越稳。
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴一条 X 推文、长文观点，或者想回复的内容..."
            />
            <div className={`char-count${content.length > 1800 ? " warn" : ""}`}>
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
              <span className="step-name">选择这次想用的评论口吻</span>
            </div>
            <div className="section-helper">
              人格决定“味道”，不是决定立场。你可以把它理解成这次回复时的表达滤镜。
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
              <span className="step-name">确认输出数量和语言</span>
            </div>
            <div className="task-launch-bar">
              <div className="task-launch-meta">
                <span>当前人格：{selectedPersona?.name || "未选择"}</span>
                <span>输出：{count} 条</span>
                <span>语言：{language === "auto" ? "自动" : language}</span>
              </div>
              <div className="task-launch-note">
                {loading ? "工作流正在运行中，可随时取消" : "准备完成后即可启动本次评论工作流"}
              </div>
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
              onClick={loading ? handleCancel : handleGenerate}
              disabled={!loading && !content.trim()}
            >
              {loading ? "⏹ 取消生成" : `🚀 生成 ${count} 条真人感评论`}
            </button>
            <div className="gen-note">
              {loading ? "正在连续生成中，点击可随时取消" : "每次生成都会走：分析内容 → 生成评论 → 热度排序"}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="card">
            <div className="result-stage">
              <div className="result-stage-header">
                <span className="result-stage-kicker">AI 输出区</span>
                <h3>先看推荐，再决定复制、润色，还是换一批</h3>
              </div>
            </div>

            {!result && !loading && <EmptyState />}
            {loading && <LoadingState step={genState.step} />}
            {result && resultPersona && (
              <ResultPanel
                result={result}
                personaName={resultPersona.name}
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
          输入原文后，你会先拿到内容分析，再拿到一批不同角度、能直接复制使用的评论。
        </div>
        <div className="empty-highlight">
          最适合你已经知道“想参与讨论”，但还没想好“具体怎么回”的时候。
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
            热度 <strong className="score-mid">86</strong> 🔥
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
      <div className="loading-caption">
        系统会先理解原文语境，再生成候选评论，最后把更值得发的内容排在前面。
      </div>
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
  personaId,
  originalContent,
  copiedIndex,
  onCopy,
  onRefined,
  onRegenerate,
}: {
  result: GenerateResponse;
  personaName: string;
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
      <div className="result-intro">
        <div>
          <h3>已生成 {result.comments.length} 条候选评论</h3>
          <p>建议先快速浏览热度高的几条，再决定复制、继续润色，还是直接换一批。</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 className="analysis-heading">
          📊 内容分析
        </h3>
        <div className="analysis-grid">
          <div>
            <span className="analysis-label">主题：</span>
            <span className="analysis-value">{result.analysis.topic}</span>
          </div>
          <div>
            <span className="analysis-label">情绪：</span>
            <span className="analysis-value">{result.analysis.sentiment}</span>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <span className="analysis-label">核心观点：</span>
            <span className="analysis-value">{result.analysis.coreOpinion}</span>
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
