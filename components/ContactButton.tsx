export function ContactButton() {
  return (
    <a
      href="/contact"
      className="contact-float"
      aria-label="Contactar por correo electrónico"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5.5h18v13H3z" />
        <path d="m3.5 6 8.5 7 8.5-7" />
      </svg>
    </a>
  );
}
