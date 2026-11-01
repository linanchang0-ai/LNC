"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SetAdminPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("两次输入的密码不一致。");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/admin/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "密码保存失败。");
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return <div className="container-shell" style={{ padding: "56px 0 80px" }}><div className="form-shell" style={{ maxWidth: 480, margin: "0 auto" }}><form className="form-card" onSubmit={submit}><h1>设置后台密码</h1><p className="muted">该密码用于保护后台管理权限。</p><div className="field"><label>新密码</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></div><div className="field"><label>确认密码</label><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} required /></div>{error ? <p className="error-box">{error}</p> : null}<button className="primary-button" type="submit" style={{ width: "100%" }} disabled={loading}>{loading ? "正在保存..." : "保存密码"}</button></form></div></div>;
}