"use client";

import Link from "next/link";
import { useState, useEffect, useReducer, useRef } from "react";
import { personas } from "@/config/personas";
import type {
  TweetGenerateResponse,
  StyleProfile,
} from "@/types/tweet";
import type { RefineRecord } from "@/types";
import { parseTweets } from "@/lib/tweets/parseTweets";
import PersonaPickerModal from "../components/PersonaPickerModal";
import ThemeToggle from "../components/ThemeToggle";
import TweetCard from "../components/TweetCard";
import ToastContainer, { showToast } from "../components/Toast";

// 状态管理（复用评论页的 reducer 模式）
type GenerationStep =
  | "idle"
  | "analyzing_style"
  | "style_done"
  | "generating"
  | "done";

interface GenerateState {
  step: GenerationStep;
  error: string | null;
  styleMessage: string | null;
}

type GenerateAction =
  | { type: "START" }
  | { type: "SET_STEP"; step: GenerationStep; message?: string }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

function generateReducer(
  state: GenerateState,
  action: GenerateAction
): GenerateState {
  switch (action.type) {
    case "START":
      return { step: "analyzing_style", error: null, styleMessage: null };
    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        styleMessage: action.message ?? state.styleMessage,
      };
    case "ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return { step: "idle", error: null, styleMessage: null };
    default:
      return state;
  }
}

export default function GenerateTweetsPage() {
  const [rawInput, setRawInput] = useState("");
  const [personaId, setPersonaId] = useState("tieba_bro");
  const [count, setCount] = useState(3);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [topicHint, setTopicHint] = useState("");
  const [genState, genDispatch] = useReducer(generateReducer, {
    step: "idle",
    error: null,
    styleMessage: null,
  });
  const [result, setResult] = useState<TweetGenerateResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 历史内容源
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);

  // 加载历史内容
  useEffect(() => {
    fetch("/api/tweets/sources")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login?redirect=/generate-tweets";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setSources(data.contents || []);
        }
      })
      .catch(() => {})
      .finally(() => setSourcesLoading(false));
  }, []);

  const loading = genState.step !== "idle";

  // 切换选中状态
  const toggleSource = (index: number) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllSources = () => {
    if (selectedSources.size === sources.length) {
      setSelectedSources(new Set());
    } else {
      setSelectedSources(new Set(sources.map((_, i) => i)));
    }
  };

  // 合并：勾选的历史 + 手动补充
  const selectedContents = Array.from(selectedSources).map((i) => sources[i]);
  const manualContents = rawInput.trim() ? parseTweets(rawInput).valid : [];
  const allContents = [...new Set([...selectedContents, ...manualContents])];
  const validCount = allContents.length;

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    if (validCount < 5) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setResult(null);
    genDispatch({ type: "START" });

    try {
      const res = await fetch("/api/tweets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: allContents,
          personaId,
          count,
          language,
          topicHint: topicHint.trim() || undefined,
        }),
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
          } else if (event.step === "error") {
            showToast(event.message || "生成失败", "error");
            genDispatch({ type: "RESET" });
          } else {
            genDispatch({
              type: "SET_STEP",
              step: event.step,
              message: event.message,
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
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

  const handleTweetRefined = (
    index: number,
    refined: string,
    record: RefineRecord
  ) => {
    if (!result) return;
    const updated = { ...result };
    const tweet = { ...updated.tweets[index] };
    tweet.originalText = tweet.originalText ?? tweet.text;
    tweet.refineHistory = [...(tweet.refineHistory || []), record];
    tweet.text = refined;
    updated.tweets = [...updated.tweets];
    updated.tweets[index] = tweet;
    setResult(updated);
  };

  const selectedPersona = personas.find((p) => p.id === personaId);

  return (
    <div className="page">
      <ToastContainer />

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="header-titles">
            <h1>推文生成器</h1>
            <p>粘贴你的历史推文，AI 学习你的风格，生成像你写的原创推文</p>
          </div>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <Link
            href="/"
            className="btn-ghost"
            style={{ textDecoration: "none" }}
          >
            ← 回到评论生成
          </Link>
        </div>
      </header>

      <section className="workspace-hero workspace-hero-tweet">
        <div className="workspace-hero-copy">
          <span className="workspace-eyebrow">Tweet Writing Studio</span>
          <h2>先学习你的历史表达，再生成像你本人会发的原创推文</h2>
          <p>
            历史内容负责底色，人格负责调味，最后输出像你自己、但更适合直接发布的新内容。
            先理解你的写法，再帮助你更稳定地持续产出。
          </p>
          <div className="workspace-chip-row">
            <span className="workspace-chip">历史内容学习</span>
            <span className="workspace-chip">风格画像提炼</span>
            <span className="workspace-chip">原创推文输出</span>
          </div>
        </div>
        <div className="workspace-hero-side">
          <div className="workspace-stat">
            <strong>最低样本</strong>
            <span>至少 5 条，建议 10 条以上</span>
          </div>
          <div className="workspace-stat">
            <strong>工作方式</strong>
            <span>学习表达 → 建立风格画像 → 生成推文</span>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <div className="main">
        {/* LEFT PANEL */}
        <div className="left-panel">
          {/* STEP 1: 选择历史内容 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 1</span>
              <span className="step-name">准备你的历史表达样本</span>
            </div>
            <div className="section-helper">
              最少 5 条，建议 10 条以上。内容越能代表你平时的发帖风格，生成结果越像你本人。
            </div>

            {sourcesLoading ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
                加载历史记录中...
              </div>
            ) : sources.length > 0 ? (
              <>
                {/* 全选按钮 */}
                <div className="source-prep-header">
                  <div>
                    <strong>历史表达样本</strong>
                    <span>先挑最能代表你语气、节奏和表达习惯的内容</span>
                  </div>
                  <span className="source-prep-count">已选 {selectedSources.size} / {sources.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button className="btn-mini" onClick={toggleAllSources}>
                    {selectedSources.size === sources.length ? "取消全选" : "全选"}
                  </button>
                </div>

                {/* 历史内容列表 */}
                <div className="history-source-list">
                  {sources.map((content, i) => (
                    <label key={i} className="source-item">
                      <input
                        type="checkbox"
                        checked={selectedSources.has(i)}
                        onChange={() => toggleSource(i)}
                      />
                      <span className="source-text">
                        {content.length > 80 ? content.slice(0, 80) + "..." : content}
                      </span>
                    </label>
                  ))}
                </div>

                {/* 手动补充 */}
                {showManualInput ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="field-label">手动补充（可选）</div>
                    <textarea
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="每行一条额外内容..."
                      style={{ height: 100 }}
                    />
                  </div>
                ) : (
                  <button
                    className="btn-mini"
                    style={{ marginTop: 12 }}
                    onClick={() => setShowManualInput(true)}
                  >
                    + 手动补充
                  </button>
                )}
              </>
            ) : (
              <>
                {/* 无历史，fallback 到手动粘贴 */}
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                  暂无历史记录，请手动粘贴你发过的推文或短内容
                </div>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder={"每行粘贴一条你发过的推文，例如：\n\n今天又是被 AI 震撼的一天\n创业第三年，终于理解了 PMF 的意思"}
                  style={{ height: 200 }}
                />
              </>
            )}

            <ParseStatus validCount={validCount} dropped={[]} />
          </div>

          {/* STEP 2: 选择叠加人格 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 2</span>
              <span className="step-name">选择想叠加的表达口吻</span>
            </div>
            <div className="section-helper">
              你的历史风格是底色，人格只是“调味”。如果两者冲突，系统会优先保留你的原始表达习惯。
            </div>
            {selectedPersona && (
              <div
                className="selected-persona"
                onClick={() => setIsPersonaModalOpen(true)}
              >
                <div className="selected-persona-emoji">
                  {selectedPersona.emoji}
                </div>
                <div className="selected-persona-info">
                  <div className="selected-persona-name">
                    {selectedPersona.name}
                  </div>
                  <div className="selected-persona-desc">
                    {selectedPersona.description}
                  </div>
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

          {/* STEP 3: 生成设置 */}
          <div className="card">
            <div className="step-row">
              <span className="step-badge">STEP 3</span>
              <span className="step-name">确认生成方向</span>
            </div>
            <div className="task-launch-bar">
              <div className="task-launch-meta">
                <span>有效样本：{validCount} 条</span>
                <span>输出：{count} 条</span>
                <span>语言：{language === "auto" ? "自动" : language}</span>
              </div>
              <div className="task-launch-note">
                {loading ? "风格工作流运行中，可随时取消" : "样本准备完成后，即可启动本次推文工作流"}
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
                    <option value={3}>3 条</option>
                    <option value={5}>5 条</option>
                    <option value={8}>8 条</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="field-label">💡 话题方向（可选）</div>
              <input
                type="text"
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                placeholder="例如：AI 和创业"
                className="modal-search"
                style={{ width: "100%" }}
              />
            </div>
            <button
              className="btn-generate"
              onClick={loading ? handleCancel : handleGenerate}
              disabled={!loading && validCount < 5}
            >
              {loading
                ? "⏹ 取消生成"
                : `🚀 生成 ${count} 条原创推文`}
            </button>
            <div className="gen-note">
              {loading
                ? genState.styleMessage || "生成中..."
                : validCount < 5
                  ? "至少需要 5 条内容（勾选历史或手动粘贴）"
                  : `将使用 ${validCount} 条内容先分析风格，再生成原创推文`}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="card">
            <div className="result-stage">
              <div className="result-stage-header">
                <span className="result-stage-kicker">写作画像与输出</span>
                <h3>先确认风格像不像你，再挑最顺手的一条继续完善</h3>
              </div>
            </div>

            {!result && !loading && <TweetEmptyState />}
            {loading && (
              <TweetLoadingState
                step={genState.step}
                message={genState.styleMessage}
              />
            )}
            {result && (
              <TweetResultPanel
                result={result}
                personaName={selectedPersona!.name}
                personaId={personaId}
                styleProfile={result.styleProfile}
                copiedIndex={copiedIndex}
                onCopy={handleCopy}
                onRefined={handleTweetRefined}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 推文解析状态 ==========
function ParseStatus({
  validCount,
  dropped,
}: {
  validCount: number;
  dropped: { reason: string; count: number }[];
}) {
  const getStatusColor = () => {
    if (validCount < 5) return "var(--warning)";
    if (validCount < 10) return "var(--warning)";
    return "var(--success)";
  };

  const getStatusText = () => {
    if (validCount === 0) return "请粘贴你的历史推文";
    if (validCount < 5) return `已识别 ${validCount} 条，至少需要 5 条`;
    if (validCount < 10)
      return `已识别 ${validCount} 条推文（建议 10 条以上，风格更稳定）`;
    return `已识别 ${validCount} 条推文 ✓`;
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div
        className="char-count"
        style={{ color: getStatusColor() }}
      >
        {getStatusText()}
      </div>
      {dropped.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          已过滤:{" "}
          {dropped.map((d) => `${d.reason}(${d.count})`).join("、")}
        </div>
      )}
    </div>
  );
}

// ========== 空状态 ==========
function TweetEmptyState() {
  return (
    <div className="empty-wrap">
      <div className="empty-icon">✍️</div>
      <div className="empty-desc">
        系统会先学习你的历史表达方式，再结合这次的人格方向，生成更像你本人会发的原创推文。
      </div>
      <div className="empty-highlight">
        适合想保持个人风格，但又不想每次都从零起草内容的时候。
      </div>
      <div className="feature-grid">
        <div className="feature-item">
          <span className="feat-icon">🔍</span>
          <div>
            <div className="feat-name">风格学习</div>
            <div className="feat-desc">从历史推文提取个人风格</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">🎭</span>
          <div>
            <div className="feat-name">人格叠加</div>
            <div className="feat-desc">用人格调味你的风格</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">✍️</span>
          <div>
            <div className="feat-name">原创推文</div>
            <div className="feat-desc">生成像你写的推文</div>
          </div>
        </div>
        <div className="feature-item">
          <span className="feat-icon">📋</span>
          <div>
            <div className="feat-name">一键复制</div>
            <div className="feat-desc">复制后去 X 发布</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 加载状态 ==========
function TweetLoadingState({
  step,
  message,
}: {
  step: string;
  message: string | null;
}) {
  const steps = [
    { key: "analyzing_style", label: "分析风格" },
    { key: "generating", label: "生成推文" },
  ];

  return (
    <div className="empty-wrap">
      <div className="empty-icon" style={{ fontSize: 32 }}>
        {step === "analyzing_style" ? "🔍" : "✍️"}
      </div>
      <div className="empty-desc">
        {message || "AI 正在工作中..."}
      </div>
      <div className="loading-caption">
        这一步会先提取你的语调和表达习惯，再生成新的候选推文。
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
function TweetResultPanel({
  result,
  personaName,
  personaId,
  styleProfile,
  copiedIndex,
  onCopy,
  onRefined,
  onRegenerate,
}: {
  result: TweetGenerateResponse;
  personaName: string;
  personaId: string;
  styleProfile: StyleProfile;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
  onRefined: (index: number, refined: string, record: RefineRecord) => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {/* 风格画像摘要 */}
      <div className="result-intro">
        <div>
          <h3>已生成 {result.tweets.length} 条候选推文</h3>
          <p>先看风格画像是否像你，再从结果里挑最顺手的一条继续润色或直接复制。</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 className="analysis-heading">🎨 你的写作风格</h3>
        <div className="analysis-grid">
          <div>
            <span className="analysis-label">语调：</span>
            <span className="analysis-value">{styleProfile.tone}</span>
          </div>
          <div>
            <span className="analysis-label">句式：</span>
            <span className="analysis-value">
              {styleProfile.sentencePattern}
            </span>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <span className="analysis-label">总结：</span>
            <span className="analysis-value">{styleProfile.summary}</span>
          </div>
        </div>
      </div>

      <div className="divider-label">生成结果</div>

      {/* 推文列表 */}
      <div className="result-list">
        {result.tweets.map((tweet, i) => (
          <TweetCard
            key={i}
            index={i}
            tweet={tweet}
            personaName={personaName}
            personaId={personaId}
            styleProfile={styleProfile}
            isCopied={copiedIndex === i}
            onCopy={() => onCopy(tweet.text, i)}
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
            const allText = result.tweets.map((t) => t.text).join("\n\n");
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
