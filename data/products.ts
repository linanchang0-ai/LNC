export type Category = {
  slug: string;
  name: string;
  label: string;
  description: string;
  image: string;
};

export type Product = {
  id: string | number;
  databaseId?: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  createdAt?: string;
  oldPrice?: number;
  badge?: string;
  shortDescription: string;
  description: string;
  materials: string[];
  dimensions: string;
  colors: string[];
  sizes?: string[];
  details: string[];
  image: string;
  colorImages?: Record<string, string>;
  colorPrices?: Record<string, number>;
  gallery: string[];
  detailImages?: string[];
  stock: string;
  inventoryQuantity?: number;
  shippingFee?: number;
  featured?: boolean;
  limited?: boolean;
};

export const categories: Category[] = [
  {
    slug: "hogar",
    name: "Hogar & Diseño",
    label: "Diseño para transformar tu espacio.",
    description: "Objetos elegantes para espacios más cálidos y contemplativos.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "mascotas",
    name: "Mascotas",
    label: "Premium essentials para quienes forman parte de tu familia.",
    description: "Comodidad, detalle y materiales de alto nivel para cada miembro de la casa.",
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "auto",
    name: "Auto",
    label: "Detalles que elevan cada viaje.",
    description: "Accesorios refinados para transformar cada recorrido en una experiencia premium.",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "outdoor",
    name: "Outdoor",
    label: "Diseñado para disfrutar afuera.",
    description: "Luz, ritual y confort para momentos al aire libre con estilo.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "regalos",
    name: "Regalos",
    label: "Regalos memorables para momentos especiales.",
    description: "Detalles únicos pensados para celebrar la identidad de cada persona.",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
  },
];

export const products: Product[] = [
  {
    id: 1,
    slug: "lampara-de-mesa-premium",
    name: "Lámpara de Mesa de Diseño",
    category: "hogar",
    price: 1999,
    oldPrice: 2499,
    badge: "Best Seller",
    shortDescription: "Luz cálida y diseño minimalista para espacios contemporáneos.",
    description:
      "Una lámpara de mesa con una silueta escultórica, materiales premium y una iluminación cálida que transforma la atmosfera de cada rincón.",
    materials: ["Metal negro mate", "Vidrio soplado", "Base de madera de roble"],
    dimensions: "42 cm alto × 18 cm diámetro",
    colors: ["Negro", "Madera", "Bronce"],
    details: [
      "Pantalla de vidrio transparente con difusor suave",
      "Interruptor táctil integrado",
      "Luz cálida 2700K",
      "Ideal para escritorio o mesita lateral",
    ],
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
    featured: true,
  },
  {
    id: 2,
    slug: "lampara-de-piso-ambiental",
    name: "Lámpara de Pie Ambiental Premium",
    category: "hogar",
    price: 3499,
    shortDescription: "Iluminación escultórica para dormitorios, salas y reading corners.",
    description:
      "Una lámpara de pie con presencia editorial, calidez premium y acabados de alta calidad para crear escenarios mínimos y sofisticados.",
    materials: ["Aluminio anodizado", "Tela texturada", "Base sólida"],
    dimensions: "170 cm alto × 32 cm base",
    colors: ["Blanco", "Grafito", "Marrón claro"],
    details: [
      "Luz indirecta para ambientes relajados",
      "Base pesada para máxima estabilidad",
      "Dimmable con control suave",
    ],
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "Pocas unidades",
    featured: true,
  },
  {
    id: 3,
    slug: "deco-pared-artistica",
    name: "Decoración Artística de Pared",
    category: "hogar",
    price: 2499,
    shortDescription: "Pieza decorativa con carácter y profundidad visual.",
    description:
      "Diseño artístico pensado para aportar presencia y personalidad a puertas, salas o espacios de trabajo inspiradores.",
    materials: ["Madera natural", "Laca mate", "Acabado artesanal"],
    dimensions: "90 cm × 60 cm",
    colors: ["Arena", "Blanco", "Caoba"],
    details: [
      "Textura artesanal de alta calidad",
      "Diseño pensado para pared principal",
      "Listo para colgar",
    ],
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 4,
    slug: "deco-escultural-home",
    name: "Decoración Escultural para el Hogar",
    category: "hogar",
    price: 4199,
    shortDescription: "Escultura moderna para dar carácter a cualquier ambiente.",
    description:
      "Un objeto con presencia escultórica y un acabado que dialoga con las texturas más nobles del diseño contemporáneo.",
    materials: ["Resina premium", "Polvo mineral", "Pátina suave"],
    dimensions: "55 cm alto × 24 cm ancho",
    colors: ["Blanco", "Negro", "Terracota"],
    details: [
      "Look editorial para sala o entrada",
      "Acabado que resiste uso diario",
      "Piezas únicas en tirada limitada",
    ],
    image:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "Limitado",
    limited: true,
  },
  {
    id: 5,
    slug: "sofa-premium-para-perro",
    name: "Sofá Premium para Perro",
    category: "mascotas",
    price: 2899,
    shortDescription: "Comodidad premium para tus momentos de descanso compartidos.",
    description:
      "Sofá diseñado para perros con apoyo ergonómico, materiales suaves y un perfil elegante que se integra con el hogar.",
    materials: ["Tela de alto rendimiento", "Espuma de memoria", "Base reforzada"],
    dimensions: "100 cm × 75 cm × 52 cm",
    colors: ["Oat", "Marrón", "Grafito"],
    details: [
      "Funda desmontable",
      "Tejido resistente y fácil de limpiar",
      "Diseño pensado para hogar moderno",
    ],
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 6,
    slug: "mueble-moderno-gato",
    name: "Mueble Moderno para Gato",
    category: "mascotas",
    price: 2399,
    shortDescription: "Mueble pensado para la rutina y el descanso de tu gato.",
    description:
      "Una pieza funcional con líneas depuradas, acabados cuidados y soluciones prácticas para hogares contemporáneos.",
    materials: ["Madera compacta", "Tela premium", "Metal negro"],
    dimensions: "72 cm × 52 cm × 35 cm",
    colors: ["Natural", "Café", "Negro"],
    details: [
      "Área de descanso y observación",
      "Diseño compacto para espacios modernos",
      "Materiales durables y compatibles con el hogar",
    ],
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 7,
    slug: "gabinete-oculto-arenero",
    name: "Gabinete Oculto para Arenero",
    category: "mascotas",
    price: 4999,
    shortDescription: "Elegancia discreta para un espacio más limpio y refinado.",
    description:
      "Cabina discreta que oculta el arenero con un diseño saludable para la casa y para la rutina diaria con mascotas.",
    materials: ["MDF premium", "Acabado liso", "Cerradura suave"],
    dimensions: "85 cm × 58 cm × 43 cm",
    colors: ["Blanco", "Wenge", "Beige"],
    details: [
      "Oculta el arenero visualmente",
      "Sistema de ventilación",
      "Diseño ideal para living y dormitorios",
    ],
    image:
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 8,
    slug: "cama-premium-mascota",
    name: "Cama Premium para Mascota",
    category: "mascotas",
    price: 1899,
    shortDescription: "Cama de descanso con sensación de lujo y confort constante.",
    description:
      "Una cama ergonométrica con materiales suaves, relleno de alta densidad y tonalidades suaves para un descanso profundo.",
    materials: ["Fleece premium", "Algodón", "Relleno de alta densidad"],
    dimensions: "75 cm × 60 cm × 20 cm",
    colors: ["Taupe", "Arena", "Mushroom"],
    details: [
      "Funda extraíble",
      "Textura suave para uso diario",
      "Ideal para espacios de relajación",
    ],
    image:
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 9,
    slug: "kit-iluminacion-ambiental-auto",
    name: "Kit de Iluminación Ambiental para Auto",
    category: "auto",
    price: 3299,
    shortDescription: "Luz interior premium con control de tono y ambiente elegante.",
    description:
      "Un kit de iluminación pensado para elevar cada viaje con detalles discretos, potencia y un diseño elegante para el habitáculo.",
    materials: ["LED de alta intensidad", "Silicona flexible", "Control inteligente"],
    dimensions: "Completo para vehículo de tamaño medio",
    colors: ["Blanco cálido", "Azul", "RGB"],
    details: [
      "Control vía app",
      "Instalación simple y segura",
      "Atmosfera premium para el interior",
    ],
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 10,
    slug: "linterna-outdoor-premium",
    name: "Linterna Premium para Exterior",
    category: "outdoor",
    price: 2599,
    shortDescription: "Luz para exteriores con presencia y un diseño con carácter.",
    description:
      "Linterna de exterior pensada para la experiencia al aire libre, con un diseño premium y una utilidad funcional profesional.",
    materials: ["Metal anodizado", "Cristal endurecido", "Batería de larga duración"],
    dimensions: "34 cm alto × 15 cm diámetro",
    colors: ["Bronce", "Negro", "Madera"],
    details: [
      "Encendido resistente a la intemperie",
      "Fuerte potencia lumínica",
      "Diseño para patio o terraza",
    ],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "En stock",
  },
  {
    id: 11,
    slug: "regalo-arte-personalizado",
    name: "Regalo de Arte Personalizado",
    category: "regalos",
    price: 3999,
    shortDescription: "Un regalo pensado para momentos inolvidables y detalles únicos.",
    description:
      "Pieza personalizada que combina diseño, arte y memoria para convertir un detalle en un recuerdo con sentido.",
    materials: ["Papel premium", "Marco de madera", "Impresión de alta calidad"],
    dimensions: "50 cm × 70 cm",
    colors: ["Natural", "Negro", "Blanco"],
    details: [
      "Personalización disponible",
      "Lista para entrega",
      "Ideal para celebraciones y momentos especiales",
    ],
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "Personalizable",
    limited: true,
  },
  {
    id: 12,
    slug: "wall-art-edicion-limitada",
    name: "Arte de Pared de Edición Limitada",
    category: "regalos",
    price: 7999,
    badge: "Limited",
    shortDescription: "Edición numerada para coleccionistas con gusto por lo exclusivo.",
    description:
      "Una pieza de arte limitada, destinada para quienes buscan piezas escasas y con una presencia distintiva en la pared.",
    materials: ["Lienzo de algodón", "Tinta pigmentada", "Marco premium"],
    dimensions: "120 cm × 80 cm",
    colors: ["Blanco y arena", "Bistro", "Negro"],
    details: [
      "Número de edición incluido",
      "Tirada limitada",
      "Packaging premium para regalo",
    ],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    ],
    stock: "Solo 8 piezas",
    featured: true,
    limited: true,
  },
];

export const getProductBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
