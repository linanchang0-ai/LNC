"use client";

import { useAdminResource } from "@/components/admin-data-loader";
import { formatPrice } from "@/lib/admin-data";
import { stockStatusLabel } from "@/lib/admin-labels";

export const dynamic = "force-dynamic";

type LowStockProduct = {
  id: string;
  name: string;
  stock: string | null;
  inventory_quantity: number | null;
  price: number;
  featured: boolean;
  is_published: boolean;
};

export default function LowStockReportPage() {
  const { items: products, loading, error } = useAdminResource<LowStockProduct>("products");
  const lowStockProducts = products.filter((product) => product.is_published && (product.inventory_quantity ?? 0) <= 5);

  return (
    <div>
      <div className="page-hero">
        <h1>低库存商品</h1>
        <p>已发布且库存数量不超过 5 件的商品。</p>
      </div>

      <div className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>库存数量</th>
                <th>价格</th>
                <th>库存状态</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.inventory_quantity ?? 0}</td>
                  <td>{formatPrice(Number(product.price ?? 0))}</td>
                  <td><span className="status-pill">{product.inventory_quantity === 0 ? "已售罄" : stockStatusLabel(product.stock)}</span></td>
                </tr>
              ))}
              {!loading && lowStockProducts.length === 0 ? <tr><td colSpan={4}>没有低库存商品。</td></tr> : null}
            </tbody>
          </table>
        </div>
        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </div>
  );
}
