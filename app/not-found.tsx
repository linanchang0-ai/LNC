import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-shell" style={{ padding: "56px 0 80px" }}>
      <div className="page-hero">
        <h1>Página no encontrada</h1>
        <p>La sección que buscas no está disponible en este momento.</p>
      </div>
      <Link href="/" className="primary-button" style={{ width: "100%", maxWidth: 420, marginTop: 18 }}>
        Volver al inicio
      </Link>
    </div>
  );
}
