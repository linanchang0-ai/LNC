import { FavoriteProducts } from "@/components/favorite-products";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">Volver a mi cuenta</Link>
        <h1>Mis favoritos</h1>
        <p>Productos guardados para tus próximas compras.</p>
      </div>

      <FavoriteProducts />
    </div>
  );
}
