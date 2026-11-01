"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  const [state, setState] = useState<{ orders: Array<{ order_number: string; customer_name: string | null; total: number; order_status: string | null; payment_status: string | null; created_at: string }>; products: Array<{ id: string; name: string; stock: string | null; inventory_quantity: number | null; price: number; featured: boolean; is_published: boolean }>; refunds: Array<{ refund_amount: number | null; refund_status: string | null }>; customerCount: number }>({ orders: [], products: [], refunds: [], customerCount: 0 });
  const [dashboardLoadedAt] = useState(() => Date.now());
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin?resource=dashboard")
      .then(async (response) => {
        const data = await response.json() as typeof state & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "后台数据加载失败。");
        setState(data);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "后台数据加载失败。"));
  }, []);

  const paidOrders = state.orders.filter((order) => order.payment_status === "Pagado");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = state.orders.filter((order) => order.order_status === "Pendiente").length;
  const totalRefunds = state.refunds.filter((refund) => ["COMPLETED", "Procesado"].includes(refund.refund_status ?? "")).reduce((sum, refund) => sum + Number(refund.refund_amount ?? 0), 0);
  const thirtyDaysAgo = dashboardLoadedAt - 30 * 24 * 60 * 60 * 1000;
  const recentPaidOrders = paidOrders.filter((order) => new Date(order.created_at).getTime() >= thirtyDaysAgo);
  const lowStockProducts = state.products.filter((product) => product.is_published && (product.inventory_quantity ?? 0) <= 5);

  return (
    <div>
      <div className="page-hero">
        <h1>数据概览</h1>
        <p>查看店铺的订单、客户和经营情况。</p>
      </div>

      <div className="admin-stats">
        <div className="stats-card">
          <span>营业额</span>
          <strong>{formatPrice(totalRevenue)}</strong>
        </div>
        <div className="stats-card">
          <span>待处理订单</span>
          <strong>{pendingOrders}</strong>
        </div>
        <div className="stats-card">
          <span>客户数量</span>
          <strong>{state.customerCount}</strong>
        </div>
        <div className="stats-card">
          <span>退款金额</span>
          <strong>{formatPrice(totalRefunds)}</strong>
        </div>
        <div className="stats-card">
          <span>低库存商品</span>
          <strong>{lowStockProducts.length}</strong>
        </div>
        <div className="stats-card">
          <span>近 30 天销售额</span>
          <strong>{formatPrice(recentPaidOrders.reduce((sum, order) => sum + order.total, 0))}</strong>
        </div>
      </div>

      <div className="admin-panels">
        <section className="admin-panel">
          <h3>最近订单</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>订单</th>
                  <th>客户</th>
                  <th>Total</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {state.orders.slice(0, 4).map((order) => (
                  <tr key={order.order_number}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name ?? "客户"}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td><span className="status-pill status-pill--neutral">{order.order_status ?? "待处理"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <h3>精选商品</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>库存</th>
                  <th>价格</th>
                </tr>
              </thead>
              <tbody>
                {state.products.filter((product) => product.featured).slice(0, 4).map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.stock}</td>
                    <td>{formatPrice(product.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <h3>需要补货</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>库存数量</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.slice(0, 4).map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.inventory_quantity ?? 0}</td>
                    <td><span className="status-pill status-pill--neutral">{product.inventory_quantity === 0 ? "已售罄" : "库存不足"}</span></td>
                  </tr>
                ))}
                {lowStockProducts.length === 0 ? <tr><td colSpan={3}>没有低库存商品。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {error ? <p className="error-box">{error}</p> : null}
    </div>
  );
}
