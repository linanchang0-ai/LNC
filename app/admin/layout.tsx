"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    void fetch("/api/admin/session")
      .then(async (response) => response.ok ? response.json() as Promise<{ authenticated: boolean }> : { authenticated: false })
      .then(({ authenticated }) => {
        startTransition(() => {
          setIsAuthenticated(authenticated);
          setReady(true);
        });
        if (!authenticated) router.replace("/admin/login");
      })
      .catch(() => {
        startTransition(() => setReady(true));
        router.replace("/admin/login");
      });
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return children;
  }

  if (!ready) {
    return <div className="container-shell" style={{ padding: "48px 0" }}>正在加载后台...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-inner">
            <div className="admin-brand">LNC SPORTS 管理后台</div>
            <button
              className="ghost-button"
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                router.push("/admin/login");
              }}
            >
              退出
            </button>
          </div>
          <nav className="admin-nav">
            <Link href="/admin">数据概览</Link>
            <Link href="/admin/slides">首页轮播</Link>
            <Link href="/admin/products">商品管理</Link>
            <Link href="/admin/coupons">优惠码</Link>
            <Link href="/admin/orders">订单管理</Link>
            <Link href="/admin/customers">客户管理</Link>
            <Link href="/admin/returns">退货管理</Link>
            <Link href="/admin/refunds">退款管理</Link>
            <Link href="/admin/messages">客户消息</Link>
            <Link href="/admin/audit">操作记录</Link>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
