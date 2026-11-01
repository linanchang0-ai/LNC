export type AddressFields = {
  name: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  postalCode: string;
  neighborhood: string;
  street: string;
  number: string;
};

const mexicanStates = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "CDMX",
];

const emptyAddress: AddressFields = {
  name: "",
  phone: "",
  email: "",
  state: "",
  city: "",
  postalCode: "",
  neighborhood: "",
  street: "",
  number: "",
};

function extractLabelledValue(text: string, labels: string[]) {
  const labelPattern = labels.join("|");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*[:：-]\\s*([^\\n]+)`, "im"));
  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseAddressText(text: string): AddressFields {
  const normalized = text.replace(/\r/g, "").replace(/，/g, ",");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const phone = normalized.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim() ?? "";
  const email = normalized.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const postalCode = normalized.match(/\b\d{5}\b/)?.[0] ?? "";
  const state = mexicanStates.find((candidate) => normalized.toLowerCase().includes(candidate.toLowerCase())) ?? "";
  const name = extractLabelledValue(normalized, ["nombre", "destinatario", "contacto"])
    || lines.find((line) => !line.match(/\d|@|calle|colonia|estado|ciudad|tel|phone/i))
    || "";
  const cityFromStateLine = state
    ? lines.find((line) => new RegExp(`^(.+?),\\s*${escapeRegExp(state)}\\s*$`, "i").test(line))?.replace(new RegExp(`,\\s*${escapeRegExp(state)}\\s*$`, "i"), "").trim() ?? ""
    : "";
  const city = extractLabelledValue(normalized, ["ciudad", "municipio", "alcald[ií]a"]) || cityFromStateLine;
  const neighborhoodLine = lines.find((line) => /^(?:colonia|col\.?|barrio|fraccionamiento)\s+/i.test(line)) ?? "";
  const neighborhood = extractLabelledValue(normalized, ["colonia", "barrio", "fraccionamiento"])
    || neighborhoodLine.replace(/^(?:colonia|col\.?|barrio|fraccionamiento)\s+/i, "").trim();
  const labelledStreet = extractLabelledValue(normalized, ["direcci[oó]n", "calle", "domicilio"]);
  const addressLine = labelledStreet || lines.find((line) => /(?:calle|avenida|av\.?|blvd\.?|boulevard|carretera|c\.\s)/i.test(line)) || "";
  const number = extractLabelledValue(normalized, ["n[uú]mero", "no\.?"]) || addressLine.match(/(?:#|no\.?\s*)?(\d+[\w-]*)\s*$/i)?.[1] || "";
  const street = number ? addressLine.replace(new RegExp(`(?:#|no\\.?\\s*)?${number}\\s*$`, "i"), "").trim() : addressLine;

  return { ...emptyAddress, name, phone, email, state, city, postalCode, neighborhood, street, number };
}