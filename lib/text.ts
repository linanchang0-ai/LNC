/**
 * Normaliza un texto para comparaciones sin sensibilidad a mayusculas,
 * acentos y espacios repetidos. Util para la busqueda de productos y la
 * coincidencia de colores, de modo que "mexico" encuentre "Mexico".
 */
export function normalizeSearchText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza un segmento de ruta (slug) para compararlo con el catálogo:
 * los caracteres no ASCII pueden llegar percent-encodeados en la URL, así que
 * se decodifica y se aplica normalización Unicode NFC antes de comparar.
 */
export function normalizeRouteSlug(value: string | undefined | null): string {
  const raw = value ?? "";
  try {
    return decodeURIComponent(raw).normalize("NFC").trim();
  } catch {
    return raw.normalize("NFC").trim();
  }
}
