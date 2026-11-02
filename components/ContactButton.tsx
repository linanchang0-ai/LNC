import { siteConfig } from "@/lib/site-config";

export function ContactButton() {
  const whatsappHref = siteConfig.whatsappNumber
    ? `https://wa.me/${siteConfig.whatsappNumber}`
    : "/contact";

  return (
    <a
      href={whatsappHref}
      className={`contact-float${siteConfig.whatsappNumber ? " is-whatsapp" : ""}`}
      aria-label={siteConfig.whatsappNumber ? "Contactar por WhatsApp" : "Contactar"}
      target={siteConfig.whatsappNumber ? "_blank" : undefined}
      rel={siteConfig.whatsappNumber ? "noopener noreferrer" : undefined}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {siteConfig.whatsappNumber ? (
          <>
            <path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.6Z" />
            <path d="M8.5 8.5c.4 2.4 2.1 4.1 4.7 5l1-1 1.8.8c.3.2.4.5.2.8-.5.8-1.3 1.2-2.2 1.1-3.7-.5-6.5-3.4-6.8-6.5-.1-.8.4-1.6 1-2 .4-.2.7 0 .9.3l.7 1.7-.7.8Z" />
          </>
        ) : (
          <>
            <path d="M3 5.5h18v13H3z" />
            <path d="m3.5 6 8.5 7 8.5-7" />
          </>
        )}
      </svg>
    </a>
  );
}
