"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDateYMD } from "@/lib/admin-data";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/admin-labels";

export const dynamic = "force-dynamic";

type SalesOrder = {
  order_number: string;
  customer_name: string | null;
  guest_email: string | null;
  total: number;
  currency: string | null;
  order_status: string | null;
  payment_status: string | null;
  created_at: string;
};

const localYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RevenueReportPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin?resource=sales-report")
      .then(async (response) => {
        const data = await response.json() as { items?: SalesOrder[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "营业额数据加载失败。");
        if (!cancelled) setOrders(data.items ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "营业额数据加载失败。");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const paidOrders = orders.filter((order) => order.payment_status === "Pagado");
  const today = localYMD(new Date());
  const yesterday = localYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const todayTotal = paidOrders.filter((order) => localYMD(new Date(order.created_at)) === today).reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const yesterdayTotal = paidOrders.filter((order) => localYMD(new Date(order.created_at)) === yesterday).reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  const rangeOrders = paidOrders.filter((order) => {
    const day = localYMD(new Date(order.created_at));
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    return true;
  });
  const rangeTotal = rangeOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  return (
    <div>
      <div className="page-hero">
        <h1>营业额详情</h1>
        <p>按日期查看已支付订单的营业额与明细流水（MXN）。</p>
      </div>

      <div className="admin-stats">
        <div className="stats-card">
          <span>今日营业额</span>
          <strong>{formatPrice(todayTotal)}</strong>
        </div>
        <div className="stats-card">
          <span>昨日营业额</span>
          <strong>{formatPrice(yesterdayTotal)}</strong>
        </div>
      </div>

      <div className="admin-panel">
        <div className="form-grid" style={{ marginBottom: 18 }}>
          <label>开始日期<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>结束日期<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label>区间合计<strong>{formatPrice(rangeTotal)}</strong></label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>订单号</th>
                <th>客户</th>
                <th>邮箱</th>
                <th>总额</th>
                <th>订单状态</th>
                <th>支付状态</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {rangeOrders.map((order) => (
                <tr key={order.order_number}>
                  <td>{order.order_number}</td>
                  <td>{order.customer_name ?? "客户"}</td>
                  <td>{order.guest_email ?? "-"}</td>
                  <td>{formatPrice(Number(order.total ?? 0))}</td>
                  <td><span className="status-pill">{orderStatusLabel(order.order_status)}</span></td>
                  <td><span className="status-pill">{paymentStatusLabel(order.payment_status)}</span></td>
                  <td>{formatDateYMD(order.created_at)}</td>
                </tr>
              ))}
              {!loading && rangeOrders.length === 0 ? <tr><td colSpan={7}>没有符合日期筛选的已支付订单。</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}
