const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "8615219204028").replace(/[\s()+-]/g, "");

const socialLinks = {
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM?.trim() || "https://www.instagram.com/nanchang.li/",
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK?.trim() || "https://www.facebook.com/profile.php?id=61579683620534",
  tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK?.trim() || "",
};

export const siteConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  whatsappNumber: /^\d{8,15}$/.test(whatsappNumber) ? whatsappNumber : "",
  social: socialLinks,
  meta: {
    title: "LNC SPORTS | Camisetas de fútbol para hinchas",
    description: "Camisetas de fútbol para hinchas en México: ediciones local y visitante, tallas S–4XL, envío con seguimiento a todo el país y pago seguro.",
  },
};

export const currency = {
  code: "MXN",
  locale: "es-MX",
};
