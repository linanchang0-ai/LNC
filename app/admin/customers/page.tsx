"use client";

import { formatPrice, formatDateYMD } from "@/lib/admin-data";
import { useAdminResource } from "@/components/admin-data-loader";
import { useState } from "react";

export const dynamic = "force-dynamic";

export default function AdminCustomersPage() {
  const { items: customers, loading, error } = useAdminResource<{ email: string; name: string; city: string; orders: number; totalSpent: number; registeredAt: string | null }>("customers");
  const [search, setSearch] = useState("");
  const visibleCustomers = customers.filter((customer) => [customer.name, customer.email, customer.city].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));

  const exportCustomers = () => {
    const rows = [["姓名", "邮箱", "城市", "订单数", "累计消费", "注册时间"], ...visibleCustomers.map((customer) => [customer.name, customer.email, customer.city, String(customer.orders), String(customer.totalSpent), formatDateYMD(customer.registeredAt)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "LNC SPORTS-客户.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-hero">
        <h1>客户管理</h1>
        <p>查看客户资料、购买记录和所在地。</p>
      </div>

      <div className="admin-panel">
        <div className="form-grid" style={{ marginBottom: 18 }}><label>搜索客户<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="姓名、邮箱或城市" /></label></div>
        <button className="small-button" onClick={exportCustomers} disabled={!visibleCustomers.length}>导出 CSV</button>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>城市</th>
                <th>订单数</th>
                <th>累计消费</th>
                <th>注册时间</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr key={customer.email}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.city}</td>
                  <td>{customer.orders}</td>
                  <td>{formatPrice(customer.totalSpent)}</td>
                  <td>{formatDateYMD(customer.registeredAt)}</td>
                </tr>
              ))}
              {!loading && visibleCustomers.length === 0 ? <tr><td colSpan={6}>{customers.length ? "没有符合搜索条件的客户。" : "暂无有订单记录的客户。"}</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}
