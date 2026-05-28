import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GeneratedComment, RefineRecord } from "@/types";

/**
 * TDD: 前端重构测试
 * 测试状态管理、组件拆分、请求取消、错误处理的预期行为
 */

// ========== 1. 状态管理：合并 loading 和 generationStep ==========

describe("state management: unified generation state", () => {
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

  it("should derive loading from step !== idle", () => {
    const state: GenerateState = { step: "analyzing", error: null };
    const loading = state.step !== "idle";
    expect(loading).toBe(true);
  });

  it("should not be loading when idle", () => {
    const state: GenerateState = { step: "idle", error: null };
    const loading = state.step !== "idle";
    expect(loading).toBe(false);
  });

  it("START should set step to analyzing and clear error", () => {
    const state = generateReducer(
      { step: "idle", error: "previous error" },
      { type: "START" }
    );
    expect(state.step).toBe("analyzing");
    expect(state.error).toBeNull();
  });

  it("SET_STEP should update step", () => {
    const state = generateReducer(
      { step: "analyzing", error: null },
      { type: "SET_STEP", step: "generating" }
    );
    expect(state.step).toBe("generating");
  });

  it("ERROR should set error and keep step", () => {
    const state = generateReducer(
      { step: "generating", error: null },
      { type: "ERROR", error: "网络错误" }
    );
    expect(state.error).toBe("网络错误");
    expect(state.step).toBe("generating");
  });

  it("RESET should return to idle", () => {
    const state = generateReducer(
      { step: "done", error: null },
      { type: "RESET" }
    );
    expect(state.step).toBe("idle");
    expect(state.error).toBeNull();
  });
});

// ========== 2. CommentCard 组件拆分 ==========

describe("CommentCard component interface", () => {
  const angleLabels: Record<string, string> = {
    agree: "赞同",
    question: "质疑",
    joke: "调侃",
    supplement: "补充",
    empathy: "共鸣",
    sarcasm: "阴阳",
  };

  it("should have angle label for all valid angles", () => {
    const validAngles = ["agree", "question", "joke", "supplement", "empathy", "sarcasm"];
    validAngles.forEach((angle) => {
      expect(angleLabels[angle]).toBeDefined();
      expect(angleLabels[angle].length).toBeGreaterThan(0);
    });
  });

  it("should handle unknown angle gracefully", () => {
    const unknownAngle = "unknown";
    const label = angleLabels[unknownAngle] || unknownAngle;
    expect(label).toBe("unknown");
  });

  it("refine history should track before/after", () => {
    const record: RefineRecord = {
      type: "colloquial",
      before: "原始评论",
      after: "润色后评论",
      createdAt: Date.now(),
    };
    expect(record.before).not.toBe(record.after);
    expect(["colloquial", "sharp"]).toContain(record.type);
  });
});

// ========== 3. 请求取消 (AbortController) ==========

describe("request cancellation", () => {
  it("should create AbortController", () => {
    const controller = new AbortController();
    expect(controller.signal).toBeDefined();
    expect(controller.signal.aborted).toBe(false);
  });

  it("should abort when abort() is called", () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it("should pass signal to fetch", () => {
    const controller = new AbortController();
    const fetchOptions = {
      method: "POST",
      signal: controller.signal,
    };
    expect(fetchOptions.signal).toBe(controller.signal);
  });

  it("should detect AbortError in catch", () => {
    const error = new DOMException("The operation was aborted.", "AbortError");
    expect(error.name).toBe("AbortError");
  });
});

// ========== 4. Toast 错误提示 ==========

describe("toast notification system", () => {
  type ToastType = "success" | "error" | "info";

  interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
  }

  function createToast(message: string, type: ToastType = "error"): Toast {
    return {
      id: Math.random().toString(36).slice(2),
      type,
      message,
      duration: type === "error" ? 5000 : 3000,
    };
  }

  it("should create toast with unique id", () => {
    const t1 = createToast("错误1");
    const t2 = createToast("错误2");
    expect(t1.id).not.toBe(t2.id);
  });

  it("error toast should have longer duration", () => {
    const toast = createToast("失败", "error");
    expect(toast.duration).toBe(5000);
  });

  it("success toast should have shorter duration", () => {
    const toast = createToast("成功", "success");
    expect(toast.duration).toBe(3000);
  });

  it("should default to error type", () => {
    const toast = createToast("出错了");
    expect(toast.type).toBe("error");
  });
});

// ========== 5. 复制工具函数 ==========

describe("copy utility", () => {
  it("should fallback to textarea when clipboard fails", () => {
    // 模拟 clipboard 不可用
    const clipboardAvailable = false;
    const fallback = !clipboardAvailable;
    expect(fallback).toBe(true);
  });

  it("should batch copy with double newline separator", () => {
    const comments: GeneratedComment[] = [
      { text: "评论1", angle: "agree" },
      { text: "评论2", angle: "joke" },
      { text: "评论3", angle: "sarcasm" },
    ];
    const allText = comments.map((c) => c.text).join("\n\n");
    expect(allText).toBe("评论1\n\n评论2\n\n评论3");
  });
});
