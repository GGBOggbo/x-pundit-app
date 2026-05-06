"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    setLoading(true);

    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "注册失败");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        window.location.href = "/login";
        return;
      }

      await migrateOldHistory();

      window.location.href = "/";
    } catch {
      setError("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* 品牌区 */}
        <div className="auth-brand">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="auth-brand-text">
            <h1 className="auth-title">创建账号</h1>
            <p className="auth-subtitle">注册后可保存评论历史，随时回顾生成记录</p>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">邮箱地址</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">密码</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="至少 8 位"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">确认密码</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="再输入一次密码"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-submit-loading">
                <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                注册中...
              </span>
            ) : "注册"}
          </button>
        </form>

        <div className="auth-divider">
          <span>已有账号？</span>
        </div>

        <a href="/login" className="auth-alt-btn">
          去登录
        </a>

        <a href="/" className="auth-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回首页
        </a>
      </div>
    </div>
  );
}

async function migrateOldHistory() {
  try {
    const localItems = getLocalHistory();
    if (localItems.length === 0) return;

    const result = await migrateLocalHistory(localItems);
    if (result.imported > 0) {
      clearLocalHistory();
    }
  } catch {
    // 迁移失败不影响注册
  }
}
