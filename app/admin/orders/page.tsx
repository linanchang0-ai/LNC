"use client";

import { formatPrice } from "@/lib/admin-data";
import { useAdminResource } from "@/components/admin-data-loader";
import { useState } from "react";

export const dynamic = "force-dynamic";

const orderStatusLabel = (status: string | null) => ({ Pendiente: "待处理", Procesando: "处理中", Enviado: "已发货", Entregado: "已送达", Cancelado: "已取消" }[status ?? ""] ?? status ?? "待处理");
const paymentStatusLabel = (status: string | null) => status === "Pagado" ? "已支付" : status ?? "待支付";

export default function AdminOrdersPage() {
  type AdminOrder = { id: string; order_number: string; customer_name: string | null; guest_email: string | null; phone: string | null; shipping_address: { street?: string; number?: string; neighborhood?: string; city?: string; state?: string; postalCode?: string } | null; total: number; order_status: string | null; payment_status: string | null; paypal_capture_id: string | null; tracking_number: string | null; shipping_carrier: string | null; shipped_at: string | null; created_at: string };
  const { items: orders, loading, error, reload, setItems } = useAdminResource<AdminOrder>("orders");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState({ status: "Procesando", carrier: "", trackingNumber: "" });
  const [fulfillmentError, setFulfillmentError] = useState("");
  const [savingFulfillment, setSavingFulfillment] = useState(false);
  const [detail, setDetail] = useState<{ id: string; order_number: string; customer_name: string | null; guest_email: string | null; phone: string | null; shipping_address: AdminOrder["shipping_address"]; total: number; payment_status: string | null; paypal_order_id: string | null; paypal_capture_id: string | null; shipping_label_url?: string | null; items: Array<{ id: string; product_name: string | null; price: number | null; quantity: number | null; image_url?: string | null }>; returns: Array<{ id: string; reason: string | null; description: string | null; status: string | null; created_at: string; restocked_at: string | null }>; refunds: Array<{ id: string; refund_amount: number | null; refund_status: string | null; refund_reason: string | null; refund_date: string | null; created_at: string }> } | null>(null);
  const [detailError, setDetailError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const visibleOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [order.order_number, order.customer_name, order.guest_email, order.tracking_number].some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (statusFilter === "Todos" || order.order_status === statusFilter);
  });

  const exportOrders = () => {
    const rows = [["订单", "客户", "邮箱", "电话", "总额", "状态", "支付", "日期", "物流公司", "物流单号"], ...visibleOrders.map((order) => [order.order_number, order.customer_name ?? "", order.guest_email ?? "", order.phone ?? "", String(order.total), orderStatusLabel(order.order_status), paymentStatusLabel(order.payment_status), order.created_at, order.shipping_carrier ?? "", order.tracking_number ?? ""])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "LNC SPORTS-订单.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportOrderDetails = async () => {
    const response = await fetch("/api/admin?resource=order-report");
    const data = await response.json() as { items?: Array<{ order_number: string; customer_name: string | null; guest_email: string | null; phone: string | null; shipping_address: AdminOrder["shipping_address"]; total: number; currency: string | null; order_status: string | null; payment_status: string | null; created_at: string; order_items: Array<{ product_name: string | null; price: number | null; quantity: number | null }> | null }>; error?: string };
    if (!response.ok || !data.items) {
      window.alert(data.error ?? "订单明细导出失败。");
      return;
    }
    const rows = [["订单号", "下单时间", "客户", "邮箱", "电话", "收货地址", "商品", "单价", "数量", "商品小计", "订单总额", "币种", "订单状态", "支付状态"]];
    data.items.forEach((order) => {
      const address = order.shipping_address ? [order.shipping_address.street, order.shipping_address.number, order.shipping_address.neighborhood, order.shipping_address.city, order.shipping_address.state, order.shipping_address.postalCode].filter(Boolean).join(", ") : "";
      const orderItems = order.order_items?.length ? order.order_items : [{ product_name: "", price: 0, quantity: 0 }];
      orderItems.forEach((item) => rows.push([order.order_number, order.created_at, order.customer_name ?? "", order.guest_email ?? "", order.phone ?? "", address, item.product_name ?? "", String(item.price ?? 0), String(item.quantity ?? 0), String(Number(item.price ?? 0) * Number(item.quantity ?? 0)), String(order.total), order.currency ?? "MXN", orderStatusLabel(order.order_status), paymentStatusLabel(order.payment_status)]));
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "LNC SPORTS-订单明细.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadDetail = async (orderId: string) => {
    setLoadingDetail(true);
    setDetailError("");
    try {
      const response = await fetch(`/api/admin?resource=order&id=${encodeURIComponent(orderId)}`);
      const data = await response.json() as { item?: NonNullable<typeof detail>; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "订单详情加载失败。");
      setDetail(data.item);
      setTimeout(() => document.getElementById("order-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      setRefundAmount("");
      setRefundReason("");
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "订单详情加载失败。");
    } finally {
      setLoadingDetail(false);
    }
  };

  const beginFulfillment = (order: AdminOrder) => {
    setEditingId(order.id);
    setFulfillmentError("");
    setFulfillment({ status: order.order_status ?? "Procesando", carrier: order.shipping_carrier ?? "", trackingNumber: order.tracking_number ?? "" });
  };

  const saveFulfillment = async (orderId: string) => {
    setSavingFulfillment(true);
    setFulfillmentError("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "orders", id: orderId, status: fulfillment.status, shippingCarrier: fulfillment.carrier, trackingNumber: fulfillment.trackingNumber }) });
      const data = await response.json() as { item?: Pick<AdminOrder, "id" | "order_status" | "shipping_carrier" | "tracking_number" | "shipped_at">; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "物流信息更新失败。");
      setItems((current) => current.map((order) => order.id === orderId ? { ...order, ...data.item } : order));
      setEditingId(null);
    } catch (saveError) {
      setFulfillmentError(saveError instanceof Error ? saveError.message : "物流信息更新失败。");
    } finally {
      setSavingFulfillment(false);
    }
  };

  const shrinkLabelImage = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("图片处理失败，请换一张图片。");
    return new File([blob], "shipping-label.jpg", { type: "image/jpeg" });
  };

  const uploadLabel = async (file: File | undefined) => {
    if (!file || !detail) return;
    setLabelBusy(true);
    setLabelError("");
    try {
      const form = new FormData();
      form.set("orderId", detail.id);
      form.set("image", await shrinkLabelImage(file));
      const response = await fetch("/api/admin/shipping-label", { method: "POST", body: form });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "面单上传失败。");
      setDetail((current) => current ? { ...current, shipping_label_url: data.url ?? null } : current);
    } catch (uploadError) {
      setLabelError(uploadError instanceof Error ? uploadError.message : "面单上传失败。");
    } finally {
      setLabelBusy(false);
    }
  };

  const removeLabel = async () => {
    if (!detail || !window.confirm("确定删除这张面单照片吗？客户将不再看到它。")) return;
    setLabelBusy(true);
    setLabelError("");
    try {
      const response = await fetch(`/api/admin/shipping-label?orderId=${encodeURIComponent(detail.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "删除失败。");
      setDetail((current) => current ? { ...current, shipping_label_url: null } : current);
    } catch (removeError) {
      setLabelError(removeError instanceof Error ? removeError.message : "删除失败。");
    } finally {
      setLabelBusy(false);
    }
  };

  const refundOrder = async (order: { id: string; total: number; paypal_capture_id: string | null; payment_status: string | null }) => {
    if (!order.paypal_capture_id || order.payment_status !== "Pagado" || !window.confirm(`确定通过 PayPal 退款 ${formatPrice(order.total)} 吗？`)) return;
    const response = await fetch("/api/admin/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { window.alert(data.error ?? "退款处理失败。"); return; }
    window.alert("退款申请已提交。");
    reload();
  };

  const refundFromDetail = async () => {
    if (!detail) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setRefundError("请输入有效的退款金额。"); return; }
    if (!window.confirm(`确定申请退款 ${formatPrice(amount)} 吗？`)) return;
    setRefunding(true);
    setRefundError("");
    try {
      const response = await fetch("/api/admin/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: detail.id, amount, reason: refundReason }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "退款处理失败。");
      await loadDetail(detail.id);
      reload();
    } catch (refundError) {
      setRefundError(refundError instanceof Error ? refundError.message : "退款处理失败。");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div>
      <div className="page-hero">
        <h1>订单管理</h1>
        <p>查看每笔订单的付款、客户和物流信息。</p>
      </div>

      <div className="admin-panel">
        <div className="form-grid" style={{ marginBottom: 18 }}>
          <label>搜索订单、客户、邮箱或物流单号<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索" /></label>
          <label>状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="Todos">全部</option><option value="Pendiente">待处理</option><option value="Procesando">处理中</option><option value="Enviado">已发货</option><option value="Entregado">已送达</option><option value="Cancelado">已取消</option></select></label>
        </div>
        <button className="small-button" onClick={exportOrders} disabled={!visibleOrders.length}>导出订单汇总</button>
        <button className="small-button" onClick={() => void exportOrderDetails()} disabled={!orders.length}>导出订单明细</button>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>订单</th>
                <th>客户</th>
                <th>邮箱</th>
                <th>总额</th>
                <th>状态</th>
                <th>日期</th>
                <th>物流</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.customer_name ?? "客户"}</td>
                  <td>{order.guest_email ?? "-"}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>{editingId === order.id ? <select value={fulfillment.status} onChange={(event) => setFulfillment({ ...fulfillment, status: event.target.value })} aria-label="订单状态"><option value="Pendiente">待处理</option><option value="Procesando">处理中</option><option value="Enviado">已发货</option><option value="Entregado">已送达</option><option value="Cancelado">已取消</option></select> : <span className="status-pill">{orderStatusLabel(order.order_status)}</span>}</td>
                  <td>{new Date(order.created_at).toLocaleDateString("zh-CN")}</td>
                  <td>{editingId === order.id ? <><input value={fulfillment.carrier} onChange={(event) => setFulfillment({ ...fulfillment, carrier: event.target.value })} placeholder="物流公司" aria-label="物流公司" /><input value={fulfillment.trackingNumber} onChange={(event) => setFulfillment({ ...fulfillment, trackingNumber: event.target.value })} placeholder="物流单号" aria-label="物流单号" /></> : order.tracking_number ? <>{order.shipping_carrier ?? "物流公司"}<br />{order.tracking_number}</> : "未填写"}</td>
                  <td>{editingId === order.id ? <><button className="small-button" onClick={() => saveFulfillment(order.id)} disabled={savingFulfillment}>{savingFulfillment ? "正在保存" : "保存物流"}</button><button className="small-button" onClick={() => setEditingId(null)} disabled={savingFulfillment}>取消</button></> : <><button className="small-button" onClick={() => void loadDetail(order.id)}>查看详情</button><button className="small-button" onClick={() => beginFulfillment(order)}>管理物流</button><button className="small-button" onClick={() => void loadDetail(order.id)}>上传面单</button>{order.payment_status === "Pagado" && order.paypal_capture_id ? <button className="small-button" onClick={() => refundOrder(order)}>退款</button> : null}</>}</td>
                </tr>
              ))}
              {!loading && visibleOrders.length === 0 ? <tr><td colSpan={8}>{orders.length ? "没有符合筛选条件的订单。" : "暂无订单。"}</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
        {fulfillmentError ? <p className="error-box">{fulfillmentError}</p> : null}
        {detailError ? <p className="error-box">{detailError}</p> : null}
        {loadingDetail ? <p className="muted">正在加载订单详情...</p> : null}
        {detail ? <section id="order-detail-panel" className="form-card" style={{ marginTop: 18 }}>
          <div className="meta-row"><h2>{detail.order_number}</h2><button className="small-button" onClick={() => setDetail(null)}>关闭</button></div>
          <div className="meta-row"><span>客户</span><span>{detail.customer_name ?? "客户"}</span></div>
          <div className="meta-row"><span>联系方式</span><span>{detail.guest_email ?? "-"}{detail.phone ? ` · ${detail.phone}` : ""}</span></div>
          <div className="meta-row"><span>付款</span><span>{paymentStatusLabel(detail.payment_status)}</span></div>
          {detail.shipping_address ? <div className="meta-row"><span>收货地址</span><span>{[detail.shipping_address.street, detail.shipping_address.number, detail.shipping_address.neighborhood, detail.shipping_address.city, detail.shipping_address.state, detail.shipping_address.postalCode].filter(Boolean).join(", ")}</span></div> : null}
          <h3 style={{ marginTop: 18 }}>商品</h3>
          {detail.items.map((item) => <div className="meta-row" key={item.id} style={{ alignItems: "center", gap: 12 }}>{item.image_url ? <a href={item.image_url} target="_blank" rel="noopener noreferrer" style={{ flex: "0 0 auto" }}><img src={item.image_url} alt={item.product_name ?? "商品"} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)", display: "block" }} /></a> : null}<span style={{ flex: 1 }}>{item.product_name ?? "商品"} × {item.quantity ?? 1}</span><span>{formatPrice(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</span></div>)}
          <h3 style={{ marginTop: 18 }}>物流面单（客户可见）</h3>
          {detail.shipping_label_url ? <a href={detail.shipping_label_url} target="_blank" rel="noopener noreferrer"><img src={detail.shipping_label_url} alt="物流面单" style={{ display: "block", width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid var(--line)" }} /></a> : <p className="muted">还没有上传面单照片。</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <label className="small-button" style={{ cursor: "pointer" }}>{labelBusy ? "处理中..." : detail.shipping_label_url ? "重新上传" : "上传面单照片"}<input type="file" accept="image/*" hidden disabled={labelBusy} onChange={(event) => { void uploadLabel(event.target.files?.[0]); event.target.value = ""; }} /></label>
            {detail.shipping_label_url ? <button type="button" className="small-button" onClick={() => void removeLabel()} disabled={labelBusy}>删除面单</button> : null}
          </div>
          {labelError ? <p className="error-box">{labelError}</p> : null}
          {detail.returns.length ? <><h3 style={{ marginTop: 18 }}>退货</h3>{detail.returns.map((item) => <div className="meta-row" key={item.id}><span>{item.reason ?? "退货"}: {item.status ?? "待处理"}</span><span>{item.restocked_at ? "已补回库存" : ""}</span></div>)}</> : null}
          {detail.refunds.length ? <><h3 style={{ marginTop: 18 }}>退款记录</h3>{detail.refunds.map((item) => <div className="meta-row" key={item.id}><span>{item.refund_reason ?? "退款"}: {item.refund_status ?? "待处理"}</span><span>{formatPrice(Number(item.refund_amount ?? 0))}</span></div>)}</> : null}
          {detail.payment_status === "Pagado" && detail.paypal_capture_id ? <><h3 style={{ marginTop: 18 }}>申请退款</h3><div className="form-grid"><label>退款金额<input type="number" min="0.01" max={detail.total} step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder={`最多 ${formatPrice(detail.total)}`} /></label><label>退款原因<input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="退款原因" /></label></div><button className="small-button" onClick={() => void refundFromDetail()} disabled={refunding}>{refunding ? "处理中" : "申请退款"}</button>{refundError ? <p className="error-box">{refundError}</p> : null}</> : null}
        </section> : null}
      </div>
    </div>
  );
}
