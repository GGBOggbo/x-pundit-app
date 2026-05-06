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
      // 1. 注册
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

      // 2. 自动登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // 注册成功但自动登录失败，手动跳转登录页
        window.location.href = "/login";
        return;
      }

      // 3. 迁移 localStorage
      await migrateOldHistory();

      // 4. 跳转主页
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
        <div className="auth-logo">💬</div>
        <h1 className="auth-title">注册</h1>
        <p className="auth-subtitle">创建账号，保存你的评论历史</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱</label>
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
              placeholder="再输入一次"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="btn-generate"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? "⏳ 注册中..." : "🚀 注册"}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？{" "}
          <a href="/login" className="auth-link">
            登录
          </a>
        </div>
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
