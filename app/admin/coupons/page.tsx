"use client";

import { useAdminResource } from "@/components/admin-data-loader";
import { useState, type FormEvent } from "react";

type Coupon = { id: string; code: string; discount_type: "percentage" | "fixed"; discount_value: number; minimum_subtotal: number; expires_at: string | null; max_uses: number | null; uses_count: number; is_active: boolean };

export const dynamic = "force-dynamic";

export default function AdminCouponsPage() {
  const { items, loading, error, setItems } = useAdminResource<Coupon>("coupons");
  const [form, setForm] = useState({ code: "", discountType: "percentage" as Coupon["discount_type"], discountValue: "10", minimumSubtotal: "0", expiresAt: "", maxUses: "" });
  const [message, setMessage] = useState("");

  const createCoupon = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "coupons", code: form.code, discountType: form.discountType, discountValue: Number(form.discountValue), minimumSubtotal: Number(form.minimumSubtotal), expiresAt: form.expiresAt || undefined, maxUses: form.maxUses ? Number(form.maxUses) : null }) });
    const data = await response.json() as { item?: Coupon; error?: string };
    if (!response.ok || !data.item) return setMessage(data.error ?? "优惠码创建失败。");
    setItems((current) => [data.item!, ...current]);
    setForm({ code: "", discountType: "percentage", discountValue: "10", minimumSubtotal: "0", expiresAt: "", maxUses: "" });
    setMessage("优惠码已创建。");
  };

  const setActive = async (coupon: Coupon) => {
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "coupons", id: coupon.id, isActive: !coupon.is_active }) });
    const data = await response.json() as { item?: Coupon; error?: string };
    if (!response.ok || !data.item) return setMessage(data.error ?? "更新失败。");
    setItems((current) => current.map((item) => item.id === coupon.id ? data.item! : item));
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`确定删除优惠码 ${coupon.code} 吗？`)) return;
    const response = await fetch(`/api/admin?resource=coupons&id=${encodeURIComponent(coupon.id)}`, { method: "DELETE" });
    if (!response.ok) return setMessage("删除失败。");
    setItems((current) => current.filter((item) => item.id !== coupon.id));
  };

  return <div><div className="page-hero"><h1>优惠码</h1><p>创建和管理结账优惠。</p></div><section className="admin-panel"><form className="field-row" onSubmit={createCoupon}><div className="field"><label>代码</label><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WELCOME10" required /></div><div className="field"><label>类型</label><select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value as Coupon["discount_type"] })}><option value="percentage">百分比</option><option value="fixed">固定金额</option></select></div><div className="field"><label>优惠金额</label><input type="number" min="0.01" max={form.discountType === "percentage" ? 100 : undefined} step="0.01" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} required /></div><div className="field"><label>最低消费（MXN）</label><input type="number" min="0" step="0.01" value={form.minimumSubtotal} onChange={(event) => setForm({ ...form, minimumSubtotal: event.target.value })} required /></div><div className="field"><label>到期日期</label><input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></div><div className="field"><label>最多使用次数</label><input type="number" min="1" step="1" value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} /></div><button className="primary-button" type="submit">创建优惠码</button></form>{message ? <p className="muted">{message}</p> : null}</section><section className="admin-panel"><div className="table-wrap"><table><thead><tr><th>代码</th><th>优惠</th><th>最低消费</th><th>使用次数</th><th>到期</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((coupon) => <tr key={coupon.id}><td><strong>{coupon.code}</strong></td><td>{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `MXN ${coupon.discount_value}`}</td><td>MXN {coupon.minimum_subtotal}</td><td>{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}</td><td>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleString("zh-CN") : "不限"}</td><td>{coupon.is_active ? "启用" : "停用"}</td><td><button className="small-button" onClick={() => void setActive(coupon)}>{coupon.is_active ? "停用" : "启用"}</button><button className="small-button" onClick={() => void deleteCoupon(coupon)}>删除</button></td></tr>)}{!loading && !items.length ? <tr><td colSpan={7}>暂无优惠码。</td></tr> : null}</tbody></table></div>{error ? <p className="error-box">{error}</p> : null}</section></div>;
}