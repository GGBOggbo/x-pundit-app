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
          <div className="auth-logo">💬</div>
          <div className="auth-brand-text">
            <h1 className="auth-title">创建账号</h1>
            <p className="auth-subtitle">注册后可保存评论历史，多设备同步</p>
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
          <div className="auth-field">
            <label className="auth-label">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="再输入一次密码"
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
            {loading ? "⏳ 注册中..." : "注册"}
          </button>
        </form>

        <div className="auth-divider">
          <span>已有账号？</span>
        </div>

        <a href="/login" className="auth-alt-btn">
          去登录
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
    // 迁移失败不影响注册
  }
}
