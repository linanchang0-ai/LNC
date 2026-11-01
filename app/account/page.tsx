import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/shop" className="ghost-button">Volver a la tienda</Link>
        <h1>Mi cuenta</h1>
        <p>Consulta tus pedidos, favoritos y detalles personales.</p>
      </div>

      <div className="product-grid">
        <Link href="/account/orders" className="info-card"><h3>Mis pedidos</h3><p>Seguimiento de pedidos y historial.</p></Link>
        <Link href="/account/favorites" className="info-card"><h3>Mis favoritos</h3><p>Productos guardados para comprar después.</p></Link>
        <Link href="/account/addresses" className="info-card"><h3>Mis direcciones</h3><p>Gestiona tus ubicaciones de entrega.</p></Link>
        <Link href="/account/settings" className="info-card"><h3>Datos personales</h3><p>Actualiza tu información base.</p></Link>
      </div>
    </div>
  );
}
