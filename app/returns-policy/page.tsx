import Link from "next/link";

export default function ReturnsPolicyPage() {
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>Política de devoluciones</h1>
        <p>Un proceso claro para solicitudes elegibles y problemas con tu pedido.</p>
      </div>
      <div className="form-card legal-content" style={{ maxWidth: 820 }}>
        <p>Las devoluciones están sujetas a esta Política y a la legislación aplicable. Estas condiciones no limitan los derechos que correspondan al consumidor conforme a la legislación aplicable.</p>
        <h2>Cómo solicitar una devolución</h2><p>Para revisar una solicitud, proporciona tu número de pedido, el motivo y la información necesaria para evaluar el caso. Puedes iniciar el proceso desde <Link href="/returns">Solicitar devolución</Link> o contactarnos directamente.</p>
        <h2>Condiciones de los productos</h2><p>Cuando sea aplicable, los artículos deben conservar un estado original razonable, no haber sido usados indebidamente y incluir, en la medida de lo posible, empaque y accesorios relevantes. La elegibilidad se revisa según el producto, el motivo de la solicitud y las condiciones publicadas.</p>
        <h2>Situaciones que pueden afectar la elegibilidad</h2><p>En la medida permitida por la ley, una solicitud puede verse afectada si el producto presenta uso evidente, daño causado por el cliente, uso o instalación incorrectos, desmontaje, modificación o reparación no autorizada, falta de accesorios importantes, conservación inadecuada u otra condición incompatible con esta Política.</p>
        <h2>Productos con defectos o incorrectos</h2><p>Si consideras que un producto tiene un defecto o fue enviado incorrectamente, contáctanos con el número de pedido, fotografías, videos cuando sean necesarios y una descripción detallada. LNC SPORTS revisará la información y, si se confirma un problema atribuible al producto, ofrecerá la solución que corresponda conforme a la ley y a esta Política.</p>
        <h2>Uso incorrecto del producto</h2><p>LNC SPORTS no asume responsabilidad más allá de lo exigido por la ley por problemas derivados de uso, instalación, modificación, desmontaje, reparación, almacenamiento inadecuado, accidentes o desgaste normal atribuibles al consumidor.</p>
        <h2>Reembolsos</h2><p>Los reembolsos se realizarán únicamente cuando correspondan conforme a esta Política, las condiciones de la compra o la legislación aplicable. Normalmente se tramitan mediante el método de pago original o el proceso de pago aplicable. Los tiempos dependen de la plataforma de pago y de la institución financiera; consulta la <Link href="/payments">Política de pagos</Link>.</p>
      </div>
    </div>
  );
}
