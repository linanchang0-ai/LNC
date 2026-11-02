export const productTranslationLocales = ["en", "zh"] as const;

export type ProductTranslationLocale = (typeof productTranslationLocales)[number];
export type ProductTranslationTextField = "name" | "shortDescription" | "description" | "dimensions";

export type ProductTranslation = {
  name?: string;
  shortDescription?: string;
  description?: string;
  dimensions?: string;
  materials?: Record<string, string>;
  colors?: Record<string, string>;
};

export type ProductTranslations = Partial<Record<ProductTranslationLocale, ProductTranslation>>;

const textLimits: Record<ProductTranslationTextField, number> = {
  name: 300,
  shortDescription: 2000,
  description: 12000,
  dimensions: 500,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeProductTranslations(value: unknown): ProductTranslations | null {
  if (!isRecord(value) || Object.keys(value).some((locale) => !productTranslationLocales.includes(locale as ProductTranslationLocale))) return null;

  const result: ProductTranslations = {};
  for (const locale of productTranslationLocales) {
    const rawTranslation = value[locale];
    if (rawTranslation === undefined) continue;
    if (!isRecord(rawTranslation)) return null;

    const translation: ProductTranslation = {};
    for (const [field, rawText] of Object.entries(rawTranslation)) {
      if (Object.prototype.hasOwnProperty.call(textLimits, field)) {
        if (typeof rawText !== "string" || rawText.length > textLimits[field as ProductTranslationTextField]) return null;
        const text = rawText.trim();
        if (text) translation[field as ProductTranslationTextField] = text;
        continue;
      }

      if (field === "materials") {
        if (!isRecord(rawText) || Object.keys(rawText).length > 100) return null;
        const materials: [string, string][] = [];
        for (const [material, translatedMaterial] of Object.entries(rawText)) {
          if (!material.trim() || material.length > 250 || typeof translatedMaterial !== "string" || translatedMaterial.length > 250) return null;
          const text = translatedMaterial.trim();
          if (text) materials.push([material.trim(), text]);
        }
        translation.materials = Object.fromEntries(materials);
        continue;
      }

      if (field === "colors") {
        if (!isRecord(rawText) || Object.keys(rawText).length > 100) return null;
        const colors: [string, string][] = [];
        for (const [color, translatedColor] of Object.entries(rawText)) {
          if (!color.trim() || color.length > 100 || typeof translatedColor !== "string" || translatedColor.length > 100) return null;
          const text = translatedColor.trim();
          if (text) colors.push([color.trim(), text]);
        }
        translation.colors = Object.fromEntries(colors);
        continue;
      }

      return null;
    }

    result[locale] = translation;
  }

  return result;
}
