"use client";

import { useAdminResource } from "@/components/admin-data-loader";

export const dynamic = "force-dynamic";

type AuditEntry = {
  id: string;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  created: "已创建",
  updated: "已更新",
  deleted: "已删除",
  replied: "已回复",
  requested_refund: "已申请退款",
};

const resourceLabels: Record<string, string> = {
  product: "商品",
  order: "订单",
  return: "退货申请",
  refund: "退款",
  contact_message: "客户消息",
  category: "商品分类",
};

const detailLabels: Record<string, string> = {
  name: "名称",
  category: "分类",
  price: "价格",
  stock: "库存状态",
  inventory_quantity: "库存数量",
  featured: "精选",
  is_published: "发布状态",
  status: "状态",
  trackingNumber: "物流单号",
  shippingCarrier: "物流公司",
  amount: "金额",
  reason: "原因",
  refund_id: "退款编号",
  gallery: "商品图片",
  image_url: "主图",
  materials: "材质",
  dimensions: "尺寸",
  colors: "颜色",
  description: "详细描述",
  short_description: "简短描述",
  inspectionNotes: "检查备注",
  restockApproved: "恢复库存",
  paypal_request_key: "PayPal 请求编号",
};

function formatDetailValue(value: unknown) {
  if (value === true) return "是";
  if (value === false) return "否";
  if (value === null) return "无";
  if (value === "Agotado") return "已售罄";
  if (value === "Pocas unidades") return "库存不足";
  if (value === "En stock") return "有库存";
  return String(value);
}

export default function AdminAuditPage() {
  const { items, loading, error } = useAdminResource<AuditEntry>("audit");

  return (
    <div>
      <div className="page-hero">
        <h1>操作记录</h1>
        <p>查看后台中的操作和变更历史。</p>
      </div>
      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>时间</th><th>管理员</th><th>操作</th><th>对象</th><th>详情</th></tr></thead>
            <tbody>
              {items.map((entry) => <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString("zh-CN")}</td>
                <td>{entry.admin_email}</td>
                <td>{actionLabels[entry.action] ?? entry.action}</td>
                <td>{resourceLabels[entry.resource_type] ?? entry.resource_type} · {entry.resource_id.slice(0, 8)}</td>
                <td>{entry.details && Object.keys(entry.details).length ? Object.entries(entry.details).map(([key, value]) => `${detailLabels[key] ?? key}: ${formatDetailValue(value)}`).join(" · ") : "-"}</td>
              </tr>)}
              {!loading && items.length === 0 ? <tr><td colSpan={5}>暂无操作记录。</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}