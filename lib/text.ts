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
