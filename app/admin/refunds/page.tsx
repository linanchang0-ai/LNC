"use client";

import { formatPrice } from "@/lib/admin-data";
import { useAdminResource } from "@/components/admin-data-loader";

export const dynamic = "force-dynamic";

export default function AdminRefundsPage() {
  const { items: refunds, loading, error } = useAdminResource<{ id: string; order_id: string; refund_amount: number; refund_status: string | null; refund_reason: string | null; orders: { customer_name: string | null; guest_email: string | null; order_number: string | null } | null }>("refunds");

  return (
    <div>
      <div className="page-hero">
        <h1>退款管理</h1>
        <p>查看和管理 PayPal 退款。</p>
      </div>

      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>客户</th>
                <th>金额</th>
                <th>状态</th>
                <th>订单</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td>{refund.id.slice(0, 8)}</td>
                  <td>{refund.orders?.customer_name ?? refund.orders?.guest_email ?? "-"}</td>
                  <td>{formatPrice(refund.refund_amount)}</td>
                  <td><span className="status-pill">{refund.refund_status ?? "待处理"}</span></td>
                  <td>{refund.orders?.order_number ?? refund.order_id.slice(0, 8)}</td>
                  <td>{refund.refund_reason ?? "-"}</td>
                </tr>
              ))}
              {!loading && refunds.length === 0 ? <tr><td colSpan={6}>暂无退款记录。</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}
