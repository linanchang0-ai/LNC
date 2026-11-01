const signals = [
  { title: "Pago seguro", text: "Procesado mediante plataformas de pago confiables.", icon: <path d="M7 10V8a5 5 0 0 1 10 0v2 M5 10h14v10H5V10Z M12 14v2" /> },
  { title: "Envío con seguimiento", text: "Consulta el estado de tu pedido cuando esté disponible.", icon: <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z M3 7.5l9 4.5 9-4.5 M12 12v9" /> },
  { title: "Políticas transparentes", text: "Consulta las condiciones antes de realizar tu compra.", icon: <path d="M4 7h12a4 4 0 0 1 0 8H8 M4 7l3-3 M4 7l3 3" /> },
  { title: "Atención personalizada", text: "Nuestro equipo está disponible para ayudarte.", icon: <path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4 M4 13v4a2 2 0 0 0 2 2h2v-6H4 M12 21h2" /> },
];

export function TrustSignals() {
  return <div className="trust-signals">{signals.map((signal) => <div className="trust-signal" key={signal.title}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{signal.icon}</svg><div><strong>{signal.title}</strong><span>{signal.text}</span></div></div>)}</div>;
}
