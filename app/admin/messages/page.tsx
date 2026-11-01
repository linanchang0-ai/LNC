"use client";

import { useAdminResource } from "@/components/admin-data-loader";
import { useState } from "react";

type ContactMessage = { id: string; name: string; email: string; message: string; status: string; reply: string | null; replied_at: string | null; replied_by: string | null; created_at: string; resolved_at: string | null };

export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  const { items, loading, error, setItems } = useAdminResource<ContactMessage>("messages");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "messages", id, status }) });
    const data = await response.json() as { item?: Pick<ContactMessage, "id" | "status" | "resolved_at"> };
    if (response.ok && data.item) setItems((current) => current.map((item) => item.id === id ? { ...item, ...data.item } : item));
    setUpdatingId(null);
  };

  const sendReply = async (item: ContactMessage) => {
    const message = reply.trim();
    if (!message) return setReplyError("请输入回复内容后再发送。");
    setUpdatingId(item.id);
    setReplyError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "messages", id: item.id, status: "Resuelto", reply: message }) });
    const data = await response.json() as { item?: ContactMessage; error?: string };
    if (response.ok && data.item) {
      setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, ...data.item } : currentItem));
      setReplyingId(null);
      setReply("");
    } else {
      setReplyError(data.error ?? "回复发送失败。");
    }
    setUpdatingId(null);
  };

  return <div>
    <div className="page-hero"><h1>客户消息</h1><p>客户通过联系表单发送的咨询。</p></div>
    <div className="admin-panel"><div className="table-wrap"><table>
      <thead><tr><th>时间</th><th>客户</th><th>消息</th><th>回复</th><th>状态</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}>
        <td>{new Date(item.created_at).toLocaleString("zh-CN")}</td>
        <td>{item.name}<br />{item.email}</td>
        <td>{item.message}</td>
        <td>{replyingId === item.id ? <><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} aria-label={`回复 ${item.name}`} /><button className="small-button" onClick={() => void sendReply(item)} disabled={updatingId === item.id}>{updatingId === item.id ? "正在发送" : "发送"}</button><button className="small-button" onClick={() => setReplyingId(null)} disabled={updatingId === item.id}>取消</button></> : item.reply ? <>{item.reply}<br /><small>{item.replied_by ?? ""} {item.replied_at ? new Date(item.replied_at).toLocaleString("zh-CN") : ""}</small></> : <button className="small-button" onClick={() => { setReplyingId(item.id); setReply(""); setReplyError(""); }}>回复</button>}</td>
        <td><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)} disabled={updatingId === item.id} aria-label={`${item.name} 的消息状态`}><option value="Nuevo">新消息</option><option value="En proceso">处理中</option><option value="Resuelto">已解决</option></select></td>
      </tr>)}{!loading && items.length === 0 ? <tr><td colSpan={5}>暂无消息。</td></tr> : null}</tbody>
    </table></div>{error ? <p className="error-box">{error}</p> : null}{replyError ? <p className="error-box">{replyError}</p> : null}</div>
  </div>;
}