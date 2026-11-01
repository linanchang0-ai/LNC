"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "登录失败。");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("无法连接到身份验证服务。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "56px 0 80px" }}>
      <div className="form-shell" style={{ maxWidth: 480, margin: "0 auto" }}>
        <form className="form-card" onSubmit={handleSubmit} autoComplete="on">
          <h1 style={{ marginTop: 0 }}>后台登录</h1>
          <p className="muted" style={{ marginTop: 0 }}>登录后管理商品、订单和退款。</p>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@linanchang.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="primary-button" type="submit" style={{ width: "100%" }} disabled={loading}>
            {loading ? "正在验证..." : "登录后台"}
          </button>
          <p className="muted" style={{ marginBottom: 0, textAlign: "center" }}>
            <Link href="/forgot-password?next=/admin/set-password">忘记密码？</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
