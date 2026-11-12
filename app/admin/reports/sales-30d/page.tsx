"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDateYMD } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type SalesOrder = {
  order_number: string;
  total: number;
  payment_status: string | null;
  created_at: string;
};

const localYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Sales30dReportPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin?resource=sales-report")
      .then(async (response) => {
        const data = await response.json() as { items?: SalesOrder[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "销售报表加载失败。");
        if (!cancelled) setOrders(data.items ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "销售报表加载失败。");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const paidOrders = orders.filter((order) => order.payment_status === "Pagado");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    return { date: localYMD(date), count: 0, total: 0 };
  });
  const byDay = new Map(days.map((day) => [day.date, day]));
  paidOrders.forEach((order) => {
    const entry = byDay.get(localYMD(new Date(order.created_at)));
    if (entry) {
      entry.count += 1;
      entry.total += Number(order.total ?? 0);
    }
  });
  const totalCount = days.reduce((sum, day) => sum + day.count, 0);
  const totalSales = days.reduce((sum, day) => sum + day.total, 0);

  return (
    <div>
      <div className="page-hero">
        <h1>近 30 天销售报表</h1>
        <p>按日期统计已支付订单的销售额（MXN）。</p>
      </div>

      <div className="admin-stats">
        <div className="stats-card">
          <span>30 天订单数</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="stats-card">
          <span>30 天销售额</span>
          <strong>{formatPrice(totalSales)}</strong>
        </div>
      </div>

      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>订单数</th>
                <th>销售额</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <td>{formatDateYMD(day.date)}</td>
                  <td>{day.count}</td>
                  <td>{formatPrice(day.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}
