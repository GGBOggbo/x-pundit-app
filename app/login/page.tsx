"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { getLocalHistory, migrateLocalHistory, clearLocalHistory } from "@/lib/history";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码错误");
        return;
      }

      await migrateOldHistory();

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      window.location.href = redirect;
    } catch {
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* 品牌区 */}
        <div className="auth-brand">
          <div className="auth-logo">💬</div>
          <div className="auth-brand-text">
            <h1 className="auth-title">欢迎回来</h1>
            <p className="auth-subtitle">登录你的账号，继续生成精彩评论</p>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱地址</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="至少 8 位"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="btn-generate"
            disabled={loading}
            style={{ marginTop: 8, height: 48 }}
          >
            {loading ? "⏳ 登录中..." : "登录"}
          </button>
        </form>

        <div className="auth-divider">
          <span>还没有账号？</span>
        </div>

        <a href="/register" className="auth-alt-btn">
          创建新账号
        </a>

        <a href="/" className="auth-back-home">← 返回首页</a>
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
    // 迁移失败不影响登录
  }
}
