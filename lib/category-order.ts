/**
 * 前台与后台分类列表的统一展示顺序。
 * 墨西哥联赛（Liga MX）作为主打分类固定置顶，其余分类按名称排序。
 */
export const PINNED_CATEGORY_SLUG = "camisetas-liga-mx";

type CategoryOrderable = { slug: string; name: string };

export function sortCategoriesForDisplay<T extends CategoryOrderable>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aPinned = a.slug === PINNED_CATEGORY_SLUG ? 0 : 1;
    const bPinned = b.slug === PINNED_CATEGORY_SLUG ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return a.name.localeCompare(b.name, "es");
  });
}
