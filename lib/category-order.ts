type CategoryOrderable = { slug: string; name: string; sort_order?: number | null };

export function sortCategoriesForDisplay<T extends CategoryOrderable>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const difference = (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER);
    if (difference) return difference;
    return a.name.localeCompare(b.name, "es") || a.slug.localeCompare(b.slug);
  });
}
