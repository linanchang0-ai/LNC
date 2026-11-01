"use client";

import { useAdminResource } from "@/components/admin-data-loader";
import { useState } from "react";

export const dynamic = "force-dynamic";

export default function AdminReturnsPage() {
  const { items: returns, loading, error, setItems } = useAdminResource<{ id: string; order_id: string; reason: string | null; status: string | null; inspection_notes: string | null; restock_approved: boolean | null; orders: { customer_name: string | null; guest_email: string | null; order_number: string | null } | null }>("returns");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [inspection, setInspection] = useState<{ id: string; notes: string; restockApproved: boolean } | null>(null);

  const updateStatus = async (id: string, status: string) => {
    if (status === "Recibida") {
      const returnItem = returns.find((item) => item.id === id);
      setInspection({ id, notes: returnItem?.inspection_notes ?? "", restockApproved: returnItem?.restock_approved === true });
      return;
    }
    setUpdatingId(id);
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "returns", id, status }) });
    if (response.ok) setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setUpdatingId(null);
  };

  const saveInspection = async () => {
    if (!inspection) return;
    setUpdatingId(inspection.id);
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "returns", id: inspection.id, status: "Recibida", inspectionNotes: inspection.notes, restockApproved: inspection.restockApproved }) });
    const data = await response.json() as { item?: { status: string; inspection_notes: string | null; restock_approved: boolean | null }; error?: string };
    if (response.ok && data.item) {
      setItems((current) => current.map((item) => item.id === inspection.id ? { ...item, ...data.item } : item));
      setInspection(null);
    }
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="page-hero">
        <h1>退货管理</h1>
        <p>查看客户的退货申请、原因和检查记录。</p>
      </div>

      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>客户</th>
                <th>原因</th>
                <th>状态</th>
                <th>订单</th>
                <th>检查</th>
                <th>更新状态</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((returnItem) => (
                <tr key={returnItem.id}>
                  <td>{returnItem.id.slice(0, 8)}</td>
                  <td>{returnItem.orders?.customer_name ?? returnItem.orders?.guest_email ?? "-"}</td>
                  <td>{returnItem.reason ?? "-"}</td>
                  <td><span className="status-pill">{returnItem.status ?? "审核中"}</span></td>
                  <td>{returnItem.orders?.order_number ?? returnItem.order_id.slice(0, 8)}</td>
                  <td>{returnItem.status === "Recibida" ? <>{returnItem.restock_approved ? "已恢复库存" : "不恢复库存"}{returnItem.inspection_notes ? <><br />{returnItem.inspection_notes}</> : null}</> : "-"}</td>
                  <td><select value={returnItem.status ?? "Solicitud de devolución"} onChange={(event) => updateStatus(returnItem.id, event.target.value)} disabled={updatingId === returnItem.id} aria-label="退货状态"><option value="Solicitud de devolución">退货申请</option><option value="En revisión">审核中</option><option value="Aprobada">已批准</option><option value="Rechazada">已拒绝</option><option value="Recibida">已收到</option><option value="Cerrada">已关闭</option></select></td>
                </tr>
              ))}
              {!loading && returns.length === 0 ? <tr><td colSpan={7}>暂无退货记录。</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
        {inspection ? <section className="form-card" style={{ marginTop: 18 }}><h2>收货与检查</h2><label>检查备注<textarea value={inspection.notes} onChange={(event) => setInspection({ ...inspection, notes: event.target.value })} placeholder="商品状态、损坏情况或是否可再次销售" /></label><label><input type="checkbox" checked={inspection.restockApproved} onChange={(event) => setInspection({ ...inspection, restockApproved: event.target.checked })} /> 将合格商品恢复到库存</label><div><button className="small-button" onClick={() => void saveInspection()} disabled={updatingId === inspection.id}>{updatingId === inspection.id ? "正在保存" : "确认收货"}</button><button className="small-button" onClick={() => setInspection(null)} disabled={updatingId === inspection.id}>取消</button></div></section> : null}
      </div>
    </div>
  );
}
