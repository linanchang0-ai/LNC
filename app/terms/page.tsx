import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>Términos y condiciones</h1>
        <p>Reglas claras para una compra segura y transparente.</p>
      </div>
      <div className="form-card legal-content" style={{ maxWidth: 820 }}>
        <p>Estos Términos regulan el uso de LNC SPORTS y las compras realizadas en nuestro sitio. Se aplican junto con nuestras políticas publicadas y la legislación aplicable en México.</p>
        <h2>Pedidos</h2><p>Un pedido se considera aceptado cuando el pago ha sido confirmado y, cuando sea necesario, ha superado las verificaciones razonables de seguridad y revisión del pedido. Antes de la aceptación, LNC SPORTS podrá suspender o cancelar un pedido cuando exista un error evidente de inventario, precio, sistema o pago, o señales razonables de fraude. Si corresponde un reembolso por ley o por nuestras políticas, se gestionará conforme al proceso aplicable.</p>
        <h2>Precios y disponibilidad</h2><p>Los precios, promociones y existencias pueden actualizarse. Si un precio publicado contiene un error manifiesto técnico, de sistema o humano, podremos corregirlo y, antes de la entrega, cancelar el pedido conforme a la legislación aplicable. En ese caso, cualquier importe que corresponda será tratado según la Política de devoluciones y la ley.</p>
        <h2>Pagos y revisión de seguridad</h2><p>Los pagos pueden requerir validación por parte de LNC SPORTS o de la plataforma de pago. Si una transacción es rechazada, presenta datos inconsistentes o un riesgo razonable de seguridad, podremos solicitar verificación adicional, suspender el pedido o cancelarlo en la medida permitida por la ley. Consulta nuestra <Link href="/payments">Política de pagos</Link>.</p>
        <h2>Información proporcionada por el cliente</h2><p>El cliente debe proporcionar correctamente su nombre, teléfono, correo electrónico, dirección y código postal. Si información incorrecta, incompleta o imposible de verificar causa una entrega fallida, devolución, reenvío, almacenaje o transporte adicional, los costos razonables podrán tratarse según el caso, las condiciones de la paquetería y la legislación aplicable.</p>
        <h2>Productos e imágenes</h2><p>Las imágenes pueden mostrar ligeras variaciones de color o apariencia por iluminación, configuración de pantalla y características del producto. LNC SPORTS procura que las dimensiones, cantidad, materiales, funciones y especificaciones relevantes sean precisos. Esto no limita las soluciones que correspondan por un producto defectuoso o incorrecto.</p>
        <h2>Envíos, terceros y fuerza mayor</h2><p>Los tiempos de entrega son estimados. Pueden variar por procesamiento, transportistas, aduanas, ubicación del destinatario u otras circunstancias fuera del control razonable de LNC SPORTS. Podemos utilizar plataformas de pago, paqueterías, almacenes y otros proveedores. En la medida permitida por la ley, no respondemos por demoras o fallas atribuibles directamente a terceros o a fuerza mayor, como desastres naturales, clima extremo, medidas gubernamentales, restricciones aduaneras, interrupciones de transporte, fallas logísticas generalizadas o fallas graves de red. Esto no excluye las obligaciones que no puedan limitarse legalmente.</p>
        <h2>Responsabilidad y derechos del consumidor</h2><p>En la medida permitida por la legislación aplicable, LNC SPORTS no será responsable por daños indirectos o consecuenciales derivados de circunstancias fuera de su control razonable. Nada de estos Términos pretende excluir o limitar derechos o responsabilidades que no puedan excluirse legalmente.</p>
        <h2>Contacto</h2><p>Para consultas sobre estos Términos o un pedido, visita <Link href="/contact">Contacto</Link>.</p>
      </div>
    </div>
  );
}
