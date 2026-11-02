const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "8615219204028").replace(/[\s()+-]/g, "");

export const siteConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  whatsappNumber: /^\d{8,15}$/.test(whatsappNumber) ? whatsappNumber : "",
  meta: {
    title: "LNC SPORTS | Premium Lifestyle",
    description: "Tienda premium mexicana de hogar, mascotas, auto, outdoor y regalos.",
  },
};

export const currency = {
  code: "MXN",
  locale: "es-MX",
};
