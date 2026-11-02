import { notFound } from "next/navigation";
import { CategoryProductList } from "@/components/category-product-list";
import { getCatalogCategories, getCatalogPopularProductIds, getCatalogProducts } from "@/lib/catalog";
import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const [categories, locale] = await Promise.all([getCatalogCategories(), getRequestLocale()]);
  const category = categories.find((item) => item.slug === resolvedParams.slug);
  if (!category) notFound();
  const translate = (text: string) => translateText(locale, text);

  const [products, popularity] = await Promise.all([getCatalogProducts(), getCatalogPopularProductIds()]);
  const categoryProducts = products.filter((product) => product.category === category.slug);

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{translate(category.name)}</h1>
        <p>{translate(category.label)}</p>
      </div>

      {category.image ? <div className="category-card" style={{ marginBottom: 20 }}><img src={category.image} alt={translate(category.name)} /></div> : null}

      <CategoryProductList products={categoryProducts} popularProductIds={popularity.ids} popularityAvailable={popularity.available} />
    </div>
  );
}
