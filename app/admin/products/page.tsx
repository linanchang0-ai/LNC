"use client";

import { formatPrice } from "@/lib/admin-data";
import { useAdminResource } from "@/components/admin-data-loader";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { normalizeProductTranslations, type ProductTranslationLocale, type ProductTranslationTextField, type ProductTranslations } from "@/lib/product-translations";
import { translateText } from "@/lib/i18n";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent } from "react";

export const dynamic = "force-dynamic";

type AdminProduct = { id: string; name: string; category: string | null; price: number; shipping_fee: number | null; inventory_quantity: number | null; short_description: string | null; description: string | null; translations: unknown; materials: unknown; dimensions: string | null; colors: unknown; size_options: unknown; featured: boolean; is_published: boolean; image_url: string | null; color_images: unknown; color_prices: unknown; gallery: unknown; detail_images_by_color: unknown };
type AdminCategory = { id: string; slug: string; name: string; name_zh?: string | null };

const MAX_UPLOAD_IMAGE_BYTES = 7 * 1024 * 1024;
const STORAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type SignedImageUpload = { path: string; token: string; url: string };
type ImageUploadResponse = { uploads?: SignedImageUpload[]; error?: string };

function toStringList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function toImageMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("https://")));
}

function toPriceMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value).flatMap(([color, price]) => typeof price === "number" && Number.isFinite(price) && price > 0 ? [[color, String(price)]] : []));
}

function toDetailByColor(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string[]>;
  return Object.fromEntries(
    Object.entries(value).flatMap(([color, images]) => {
      const list = Array.isArray(images) ? images.filter((image): image is string => typeof image === "string" && image.startsWith("https://")) : [];
      return list.length ? [[color, list]] : [];
    }),
  );
}

async function prepareImageForUpload(file: File) {
  if (STORAGE_IMAGE_TYPES.has(file.type) && file.size <= MAX_UPLOAD_IMAGE_BYTES) return file;

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("无法读取该图片。请在手机相册中转换为 JPEG 后重试。"));
      element.src = sourceUrl;
    });
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, 2560 / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片。请更新浏览器后重试。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!compressed || compressed.size > MAX_UPLOAD_IMAGE_BYTES) throw new Error("图片压缩后仍超过 7 MB，请选择较小的图片。");
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.jpg`;
    return new File([compressed], name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function readImageUploadResponse(response: Response): Promise<ImageUploadResponse> {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as ImageUploadResponse;
  } catch {
    const message = response.status === 413
      ? "图片请求过大，请减少图片数量或选择较小的图片后重试。"
      : `图片上传服务返回异常响应（HTTP ${response.status}）。`;
    throw new Error(message);
  }
}

async function uploadProductImages(productId: string, selectedFiles: File[]) {
  const uploadFiles = await Promise.all(selectedFiles.map(prepareImageForUpload));
  const response = await fetch("/api/admin/products/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, images: uploadFiles.map((file) => ({ type: file.type, size: file.size })) }),
  });
  const data = await readImageUploadResponse(response);
  if (!response.ok) throw new Error(data.error ?? "图片上传失败。");

  const uploads = data.uploads;
  if (!Array.isArray(uploads) || uploads.length !== uploadFiles.length || uploads.some((upload) =>
    !upload ||
    typeof upload.path !== "string" ||
    typeof upload.token !== "string" ||
    typeof upload.url !== "string"
  )) {
    throw new Error("图片上传服务返回的数据不完整，请重试。");
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("图片存储服务未配置，请联系网站管理员。");

  const urls: string[] = [];
  for (const [index, file] of uploadFiles.entries()) {
    const upload = uploads[index];
    const { error } = await supabase.storage.from("product-images").uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`图片上传失败：${error.message}`);
    urls.push(upload.url);
  }
  return urls;
}

export default function AdminProductsPage() {
  const { items: products, loading, error, setItems } = useAdminResource<AdminProduct>("products");
  const { items: categories, error: categoriesError, setItems: setCategories } = useAdminResource<AdminCategory>("categories");
  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "", price: "", inventoryQuantity: "", shortDescription: "", description: "", translations: {} as ProductTranslations, materials: "", dimensions: "", colors: "", sizes: "", primaryImage: "", colorImages: {} as Record<string, string>, colorPrices: {} as Record<string, string>, gallery: [] as string[], detailImagesByColor: {} as Record<string, string[]> });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPrimaryImages, setPendingPrimaryImages] = useState<File[]>([]);
  const [dragDetail, setDragDetail] = useState<{ color: string; index: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ color: string; index: number } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryZh, setNewCategoryZh] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [expandedProductCategories, setExpandedProductCategories] = useState<string[]>([]);
  const editorOpen = creating || editingId !== null;
  useEffect(() => {
    const dialog = editorDialogRef.current;
    if (!editorOpen || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [editorOpen]);
  const categoryBySlug = (slug: string | null | undefined) => categories.find((category) => category.slug === slug);
  const categoryLabel = (category: AdminCategory | null | undefined) => {
    if (!category) return "未分类";
    return category.name_zh?.trim() || translateText("zh", category.name);
  };
  const productGroups = Array.from(new Set(products.map((product) => product.category || "uncategorized"))).map((categorySlug) => {
    const resolvedCategory = categoryBySlug(categorySlug);
    return {
      slug: categorySlug,
      name: resolvedCategory ? categoryLabel(resolvedCategory) : (categorySlug === "uncategorized" ? "未分类" : categorySlug),
      products: products.filter((product) => (product.category || "uncategorized") === categorySlug),
    };
  });
  const isProductCategoryExpanded = (categorySlug: string) => expandedProductCategories.includes(categorySlug);
  const toggleProductCategory = (categorySlug: string) => {
    setExpandedProductCategories((current) => current.includes(categorySlug) ? current.filter((slug) => slug !== categorySlug) : [...current, categorySlug]);
  };
  const toggleFeatured = async (id: string, featured: boolean) => {
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, featured: !featured }) });
    if (response.ok) setItems((current) => current.map((product) => product.id === id ? { ...product, featured: !featured } : product));
  };

  const beginEditing = (product: AdminProduct) => {
    const materials = toStringList(product.materials);
    const colors = toStringList(product.colors);
    const sizes = toStringList(product.size_options);
    const colorImages = toImageMap(product.color_images);
    const colorPrices = toPriceMap(product.color_prices);
    const gallery = toStringList(product.gallery);
    setCreating(false);
    setEditingId(product.id);
    setSaveError("");
    setPendingPrimaryImages([]);
    const primaryImage = product.image_url || gallery[0] || "";
    const detailImagesByColor = toDetailByColor(product.detail_images_by_color);
    setDraft({ name: product.name, category: product.category ?? "", price: String(product.price), inventoryQuantity: String(product.inventory_quantity ?? 0), shortDescription: product.short_description ?? "", description: product.description ?? "", translations: normalizeProductTranslations(product.translations) ?? {}, materials: materials.join(", "), dimensions: product.dimensions ?? "", colors: colors.join(", "), sizes: sizes.join(", "), primaryImage, colorImages, colorPrices, gallery: gallery.filter((image) => image !== primaryImage), detailImagesByColor });
  };

  const beginCreating = () => {
    setCreating(true);
    setEditingId(null);
    setSaveError("");
    setPendingPrimaryImages([]);
    setDraft({ name: "", category: "", price: "", inventoryQuantity: "0", shortDescription: "", description: "", translations: {}, materials: "", dimensions: "", colors: "", sizes: "", primaryImage: "", colorImages: {}, colorPrices: {}, gallery: [], detailImagesByColor: {} });
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setCreating(false);
    setEditingId(null);
    setPendingPrimaryImages([]);
    setSaveError("");
  };

  const removeColorDetailImage = (color: string, imageIndex: number) => {
    setDraft((current) => {
      const list = (current.detailImagesByColor[color] ?? []).filter((_, index) => index !== imageIndex);
      const detailImagesByColor = list.length
        ? { ...current.detailImagesByColor, [color]: list }
        : Object.fromEntries(Object.entries(current.detailImagesByColor).filter(([key]) => key !== color));
      return { ...current, detailImagesByColor };
    });
  };

  const moveColorDetailImage = (color: string, fromIndex: number, toIndex: number) => {
    setDraft((current) => {
      const list = [...(current.detailImagesByColor[color] ?? [])];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return current;
      const [image] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, image);
      return { ...current, detailImagesByColor: { ...current.detailImagesByColor, [color]: list } };
    });
  };

  const handleDetailDragStart = (color: string, index: number, event: DragEvent<HTMLDivElement>) => {
    if (uploading || saving) {
      event.preventDefault();
      return;
    }
    setDragDetail({ color, index });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify({ color, index }));
  };

  const handleDetailDragOver = (color: string, index: number, event: DragEvent<HTMLDivElement>) => {
    if (!dragDetail || dragDetail.color !== color) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragDetail.index !== index) setDropTarget({ color, index });
  };

  const handleDetailDrop = (color: string, index: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    let source = dragDetail;
    const raw = event.dataTransfer.getData("text/plain");
    if (raw) {
      try {
        source = JSON.parse(raw) as { color: string; index: number };
      } catch {
        source = dragDetail;
      }
    }
    if (source && source.color === color && source.index !== index) {
      moveColorDetailImage(color, source.index, index);
    }
    setDragDetail(null);
    setDropTarget(null);
  };

  const handleDetailDragEnd = () => {
    setDragDetail(null);
    setDropTarget(null);
  };

  const uploadImages = async (files: FileList | File[], target: "primary" | "detail", color?: string) => {
    if (!editingId) return;
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setSaveError("请选择图片文件。");
      return;
    }
    setUploading(true);
    setSaveError("");
    try {
      const uploadedUrls = await uploadProductImages(editingId, selectedFiles);
      if (target === "detail") {
        if (!color) return;
        const colorList = [...(draft.detailImagesByColor[color] ?? []), ...uploadedUrls];
        const detailImagesByColor = { ...draft.detailImagesByColor, [color]: colorList };
        const saveResponse = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, detailImagesByColor }) });
        const savedData = await saveResponse.json().catch(() => ({})) as { item?: AdminProduct; error?: string };
        if (!saveResponse.ok || !savedData.item) throw new Error(savedData.error ?? "按颜色详情图保存失败。请重新上传。");
        setDraft((current) => ({ ...current, detailImagesByColor }));
        setItems((current) => current.map((product) => product.id === editingId ? { ...product, ...savedData.item } : product));
        return;
      }
      setDraft((current) => color ? { ...current, colorImages: { ...current.colorImages, [color]: uploadedUrls[0] ?? current.colorImages[color] } } : { ...current, primaryImage: current.primaryImage || uploadedUrls[0] || "", gallery: [...current.gallery, ...uploadedUrls.slice(current.primaryImage ? 0 : 1)] });
    } catch (uploadError) {
      setSaveError(uploadError instanceof Error ? uploadError.message : "图片上传失败。");
    } finally {
      setUploading(false);
    }
  };

  const uploadPendingImages = async (productId: string) => {
    const files = pendingPrimaryImages;
    if (!files.length) return { primaryImage: draft.primaryImage, gallery: draft.gallery };

    const uploadedUrls = await uploadProductImages(productId, files);

    const newPrimaryImages = uploadedUrls.slice(0, pendingPrimaryImages.length);
    const primaryImage = draft.primaryImage || newPrimaryImages[0] || "";
    return { primaryImage, gallery: [...draft.gallery, ...newPrimaryImages.slice(draft.primaryImage ? 0 : 1)] };
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, target: "primary" | "detail", color?: string) => {
    if (event.target.files) void uploadImages(event.target.files, target, color);
    event.target.value = "";
  };

  const handlePendingFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    setPendingPrimaryImages(selectedFiles);
    event.target.value = "";
  };

  const saveProduct = async (id?: string) => {
    setSaving(true);
    setSaveError("");
    try {
      const savedColorPrices = Object.fromEntries(Object.entries(draft.colorPrices).flatMap(([color, price]) => Number(price) > 0 ? [[color, Number(price)]] : []));
      const colorPrices = Object.keys(savedColorPrices).length ? savedColorPrices : undefined;
      const sizes = toStringList(draft.sizes);
      const currentMaterials = toStringList(draft.materials);
      const currentColors = toStringList(draft.colors);
      const detailImagesByColor = Object.fromEntries(Object.entries(draft.detailImagesByColor).filter(([color]) => currentColors.includes(color)));
      const translations = Object.fromEntries((["en", "zh"] as const).map((locale) => {
        const translation = draft.translations[locale] ?? {};
        return [locale, {
          ...translation,
          materials: Object.fromEntries(currentMaterials.flatMap((material) => translation.materials?.[material] ? [[material, translation.materials[material]]] : [])),
          colors: Object.fromEntries(currentColors.flatMap((color) => translation.colors?.[color] ? [[color, translation.colors[color]]] : [])),
        }];
      })) as ProductTranslations;
      const response = await fetch("/api/admin", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: draft.name, category: draft.category, price: Number(draft.price), inventoryQuantity: Number(draft.inventoryQuantity), shortDescription: draft.shortDescription, description: draft.description, translations, materials: currentMaterials, dimensions: draft.dimensions, colors: currentColors, sizes, primaryImage: draft.primaryImage, colorImages: draft.colorImages, colorPrices, gallery: draft.gallery, detailImagesByColor }) });
      const data = await response.json() as { item?: AdminProduct; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "商品保存失败。");
      let savedProduct = data.item;
      const hasPendingImages = pendingPrimaryImages.length > 0;
      if (!id && hasPendingImages) {
        setItems((current) => [savedProduct, ...current.filter((product) => product.id !== savedProduct.id)]);
        setCreating(false);
        setEditingId(savedProduct.id);
      }
      if (hasPendingImages) {
        setUploading(true);
        const images = await uploadPendingImages(savedProduct.id);
        setDraft((current) => ({ ...current, ...images }));
        setPendingPrimaryImages([]);
        const imageResponse = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: savedProduct.id, primaryImage: images.primaryImage, gallery: images.gallery }) });
        const imageData = await imageResponse.json() as { item?: AdminProduct; error?: string };
        if (!imageResponse.ok || !imageData.item) throw new Error(imageData.error ?? "图片保存失败。");
        savedProduct = imageData.item;
      }
      setItems((current) => id ? current.map((product) => product.id === id ? { ...product, ...savedProduct } : product) : [savedProduct, ...current.filter((product) => product.id !== savedProduct.id)]);
      if (id) setEditingId(null);
      else beginEditing(savedProduct);
      setCreating(false);
    } catch (saveProductError) {
      setSaveError(saveProductError instanceof Error ? saveProductError.message : "商品保存失败。");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const togglePublished = async (product: AdminProduct) => {
    setPublishingId(product.id);
    setSaveError("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, isPublished: !product.is_published }) });
      const data = await response.json().catch(() => ({})) as { item?: AdminProduct; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "商品发布状态更新失败，请重新登录后重试。");
      setItems((current) => current.map((item) => item.id === product.id ? { ...item, ...data.item } : item));
    } catch (publishError) {
      setSaveError(publishError instanceof Error ? publishError.message : "商品发布状态更新失败，请稍后重试。");
    } finally {
      setPublishingId(null);
    }
  };

  const deleteProduct = async (product: AdminProduct) => {
    if (!window.confirm(`确定要删除“${product.name}”吗？此操作无法撤销。`)) return;
    const response = await fetch(`/api/admin?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setSaveError(data.error ?? "商品删除失败。");
    setItems((current) => current.filter((item) => item.id !== product.id));
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    const nameZh = newCategoryZh.trim();
    if (!name) return;
    setCategorySaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "categories", name, nameZh }) });
      const data = await response.json() as { item?: AdminCategory; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "分类创建失败。");
      const createdCategory = data.item;
      setCategories((current) => [...current, createdCategory].sort((first, second) => first.name.localeCompare(second.name)));
      setNewCategoryName("");
      setNewCategoryZh("");
    } catch (categoryError) {
      setSaveError(categoryError instanceof Error ? categoryError.message : "分类创建失败。");
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (category: AdminCategory) => {
    if (!window.confirm(`确定要删除分类“${categoryLabel(category)}”吗？`)) return;
    setSaveError("");
    const response = await fetch(`/api/admin?resource=categories&id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setSaveError(data.error ?? "分类删除失败。");
    setCategories((current) => current.filter((item) => item.id !== category.id));
  };

  const draftColors = draft.colors.split(",").map((color) => color.trim()).filter(Boolean);
  const mainImages = [draft.primaryImage, ...draft.gallery].filter(Boolean);
  const updateTranslationText = (locale: ProductTranslationLocale, field: ProductTranslationTextField, value: string) => {
    setDraft((current) => ({ ...current, translations: { ...current.translations, [locale]: { ...current.translations[locale], [field]: value } } }));
  };
  const updateTranslationList = (locale: ProductTranslationLocale, field: "materials" | "colors", value: string) => {
    const values = value.split(",").map((item) => item.trim());
    setDraft((current) => {
      const translation = current.translations[locale] ?? {};
      const sourceValues = toStringList(field === "materials" ? current.materials : current.colors);
      const mappedValues = Object.fromEntries(sourceValues.flatMap((source, index) => values[index] ? [[source, values[index]]] : []));
      const updated = field === "materials"
        ? { ...translation, materials: mappedValues }
        : { ...translation, colors: mappedValues };
      return { ...current, translations: { ...current.translations, [locale]: updated } };
    });
  };

  const matchColorImagesByOrder = () => {
    setDraft((current) => ({
      ...current,
      colorImages: Object.fromEntries(draftColors.map((color, index) => [color, mainImages[index]]).filter(([, image]) => image)),
    }));
  };

  return (
    <div>
      <div className="page-hero">
        <h1>商品管理</h1>
        <p>管理商品目录、库存和精选商品。</p>
        <button className="primary-button" type="button" onClick={beginCreating} disabled={creating || editingId !== null}>新增商品</button>
      </div>

      <section className="admin-panel admin-category-panel" style={{ marginBottom: 18 }}>
        <button type="button" className="admin-category-toggle" onClick={() => setCategoryExpanded((v) => !v)}>
          <span>商品分类（{categories.length}）</span>
          <span>{categoryExpanded ? "收起 ▲" : "展开 ▼"}</span>
        </button>
        {categoryExpanded ? <div className="admin-category-body">
          <div className="field-row category-create-row">
            <div className="field"><label htmlFor="new-category">西语名称（前台显示）</label><input id="new-category" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：Camiseta de baloncesto" /></div>
            <div className="field"><label htmlFor="new-category-zh">中文名称（后台显示）</label><input id="new-category-zh" value={newCategoryZh} onChange={(event) => setNewCategoryZh(event.target.value)} placeholder="例如：篮球球衣" /></div>
            <button className="small-button category-create-button" type="button" onClick={() => void createCategory()} disabled={categorySaving || !newCategoryName.trim()}>{categorySaving ? "正在保存..." : "添加分类"}</button>
          </div>
          <div className="filter-bar" aria-label="已有商品分类">
            {categories.map((category) => <span className="filter-chip" key={category.id}>{categoryLabel(category)} <button type="button" onClick={() => void deleteCategory(category)} aria-label={`删除 ${categoryLabel(category)}`}>×</button></span>)}
          </div>
          {categoriesError ? <p className="error-box">{categoriesError}</p> : null}
        </div> : null}
      </section>

      <div className="admin-panel">
        {productGroups.map((group) => {
          const expanded = isProductCategoryExpanded(group.slug);
          return <section className="admin-product-category" key={group.slug}>
            <button type="button" className="admin-category-toggle" aria-expanded={expanded} onClick={() => toggleProductCategory(group.slug)}>
              <span>{group.name}（{group.products.length}）</span><span>{expanded ? "收起 ▲" : "展开 ▼"}</span>
            </button>
            {expanded ? <>
              <div className="table-wrap product-admin-table">
                <table>
                  <thead><tr><th>商品</th><th>图片</th><th>分类</th><th>价格</th><th>库存状态</th><th>库存数量</th><th>状态</th><th>精选</th><th>操作</th></tr></thead>
                  <tbody>{group.products.map((product) => (
                <tr key={product.id}>
                  <td><div>{product.name}</div><button className="small-button" type="button" style={{ marginTop: 8 }} onClick={() => beginEditing(product)}>编辑</button></td>
                  <td>{product.image_url ? <img className="admin-product-thumb" src={product.image_url} alt="" /> : "暂无图片"}</td>
                  <td>{categoryLabel(categoryBySlug(product.category))}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.inventory_quantity === 0 ? "已售罄" : (product.inventory_quantity ?? 0) <= 5 ? "库存不足" : "有库存"}</td>
                  <td>{product.inventory_quantity ?? 0}</td>
                  <td><span className="status-pill">{product.is_published ? "已发布" : "草稿"}</span></td>
                  <td>
                    <button className="small-button" onClick={() => toggleFeatured(product.id, product.featured)}>
                      {product.featured ? "取消精选" : "设为精选"}
                    </button>
                  </td>
                  <td><button className="small-button" type="button" onClick={() => void togglePublished(product)} disabled={publishingId === product.id}>{publishingId === product.id ? "正在更新..." : product.is_published ? "下架" : "发布"}</button><button className="small-button" type="button" onClick={() => void deleteProduct(product)} disabled={publishingId === product.id}>删除</button></td>
                </tr>
              ))}</tbody>
                </table>
              </div>
              <div className="mobile-admin-product-list">
          {group.products.map((product) => {
            return <details className="mobile-admin-product" key={`mobile-${product.id}`}>
              <summary className="mobile-admin-product-summary">
                <div className="mobile-admin-product-head">
                {product.image_url ? <img src={product.image_url} alt="" /> : <div className="mobile-admin-product-placeholder">暂无图片</div>}
                <div>
                  <strong>{product.name}</strong>
                  <span>{categoryLabel(categoryBySlug(product.category))}</span>
                  <span className="status-pill">{product.is_published ? "已发布" : "草稿"}</span>
                </div>
                </div>
                <span className="mobile-admin-product-chevron" aria-hidden="true" />
                <span className="mobile-admin-product-summary-data"><span>{formatPrice(product.price)}</span><span>库存 {product.inventory_quantity ?? 0}</span></span>
              </summary>
              <div className="mobile-admin-product-actions"><button className="small-button" type="button" onClick={() => beginEditing(product)}>编辑</button><button className="ghost-button" type="button" onClick={() => void togglePublished(product)} disabled={publishingId === product.id}>{publishingId === product.id ? "正在更新..." : product.is_published ? "下架" : "发布"}</button><button className="ghost-button" type="button" onClick={() => void toggleFeatured(product.id, product.featured)} disabled={publishingId === product.id}>{product.featured ? "取消精选" : "设为精选"}</button><button className="ghost-button mobile-admin-delete" type="button" onClick={() => void deleteProduct(product)} disabled={publishingId === product.id}>删除</button></div>
            </details>;
          })}
              </div>
            </> : null}
          </section>;
        })}
        {!loading && products.length === 0 ? <p className="muted">暂无商品。</p> : null}
        {error ? <p className="error-box">{error}</p> : null}
        {saveError ? <p className="error-box">{saveError}</p> : null}
        {editorOpen ? <dialog ref={editorDialogRef} className="admin-product-modal-dialog" aria-labelledby="admin-product-editor-title" onCancel={(event) => { if (event.target === event.currentTarget) event.preventDefault(); }} onClick={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <section className="form-card admin-product-modal">
          <div className="product-editor-heading"><h2 id="admin-product-editor-title">{creating ? "新增商品" : "编辑商品"}</h2><div className="product-editor-actions"><button className="small-button" type="button" onClick={() => void saveProduct(editingId ?? undefined)} disabled={saving || uploading}>{saving ? "正在保存..." : creating ? "创建商品" : "保存修改"}</button><button className="ghost-button" type="button" onClick={closeEditor} disabled={saving || uploading}>取消</button></div></div>
          {saveError ? <p className="error-box" role="alert">{saveError}</p> : null}
          {editingId ? <div className="product-image-editor">
            <div className="product-image-heading"><div><h3>商品图片</h3><p>主图用于商品列表；各颜色的详情图显示在商品详情页。</p></div></div>
            <div className="product-image-channels">
            <div className="product-image-group">
              <strong>主图</strong>
              {draft.primaryImage ? <div className="product-primary-image"><img src={draft.primaryImage} alt={`${draft.name} 的主图`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => ({ ...current, primaryImage: "" }))} aria-label="删除主图" title="删除主图">×</button></div> : null}
              {draft.gallery.map((image, index) => <div className="product-primary-image" key={`${image}-${index}`}><img src={image} alt={`${draft.name} 的主图 ${index + 2}`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((_, imageIndex) => imageIndex !== index) }))} aria-label={`删除主图 ${index + 2}`} title={`删除主图 ${index + 2}`}>×</button></div>)}
              <label className={`product-image-upload-button${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : "添加主图"}<input className="product-image-file-input" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => handleFileChange(event, "primary")} /></label>
            </div>
            </div>
            {draftColors.length > 0 ? (
              <div className="color-primary-images">
                <strong>颜色主图与详情图</strong>
                <p>每个颜色可单独上传主图和详情图；前台切换颜色时，详情图跟随切换。未传详情图的颜色不显示详情图区块。</p>
                {mainImages.length > 0 ? <button type="button" className="small-button" onClick={matchColorImagesByOrder}>按顺序匹配颜色主图</button> : null}
                <div className="color-primary-images-grid">
                  {draftColors.map((color) => {
                    const colorDetailList = draft.detailImagesByColor[color] ?? [];
                    return (
                      <div className="color-primary-image" key={color}>
                        <span>{color}</span>
                        {draft.colorImages[color] ? <div className="product-primary-image"><img src={draft.colorImages[color]} alt={`${draft.name} ${color} 主图`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => { const colorImages = { ...current.colorImages }; delete colorImages[color]; return { ...current, colorImages }; })} aria-label={`删除${color}主图`} title={`删除${color}主图`}>×</button></div> : null}
                        <label className={`product-image-upload-button${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : draft.colorImages[color] ? "更换主图" : "上传主图"}<input className="product-image-file-input" type="file" accept="image/*" disabled={uploading} onChange={(event) => handleFileChange(event, "primary", color)} /></label>
                        <div className="color-detail-images">
                          <strong>详情图</strong>
                          <p className="product-image-order-help">可直接拖拽缩略图调整顺序，也可用下方 ↑↓ 按钮微调。</p>
                          <div className="product-image-strip-row">
                            <div className="product-image-strip" aria-label={`${color} 详情图`}>
                              {colorDetailList.map((image, index) => (
                                <div
                                  className={`product-image-item is-draggable${dragDetail?.color === color && dragDetail.index === index ? " is-dragging" : ""}${dropTarget?.color === color && dropTarget.index === index ? " is-drop-target" : ""}`}
                                  key={`${image}-${index}`}
                                  draggable={!(uploading || saving)}
                                  onDragStart={(event) => handleDetailDragStart(color, index, event)}
                                  onDragOver={(event) => handleDetailDragOver(color, index, event)}
                                  onDrop={(event) => handleDetailDrop(color, index, event)}
                                  onDragEnd={handleDetailDragEnd}
                                >
                                  <div className="product-image-thumb"><img src={image} alt={`${draft.name} ${color} 详情图 ${index + 1}`} draggable={false} /><button type="button" className="product-image-remove" onClick={() => removeColorDetailImage(color, index)} aria-label={`删除${color}详情图 ${index + 1}`} title={`删除详情图`}>×</button></div>
                                  <div className="product-image-order">
                                    <button type="button" onClick={() => moveColorDetailImage(color, index, index - 1)} disabled={index === 0 || uploading || saving} aria-label={`${color}详情图 ${index + 1} 上移`} title="上移">↑</button>
                                    <span>{index + 1}</span>
                                    <button type="button" onClick={() => moveColorDetailImage(color, index, index + 1)} disabled={index === colorDetailList.length - 1 || uploading || saving} aria-label={`${color}详情图 ${index + 1} 下移`} title="下移">↓</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <label className={`product-image-dropzone${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : "选择详情图"}<input className="product-image-file-input" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => handleFileChange(event, "detail", color)} /></label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div> : <div className="product-image-pending"><strong>商品图片</strong><span>可先从图库选择主图，创建商品后会自动上传；详情图在创建商品后按颜色上传。</span><div className="product-image-channels"><label className="product-image-upload-button">{pendingPrimaryImages.length ? `已选 ${pendingPrimaryImages.length} 张主图` : "选择主图"}<input className="product-image-file-input" type="file" accept="image/*" multiple onChange={(event) => handlePendingFileChange(event)} /></label></div></div>}
          <div className="field"><label>商品名称</label><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
          <div className="field">
            <strong>商品译文（西班牙语为原文）</strong>
            <p className="muted">英语和简体中文可留空；留空时会使用现有词典翻译，若词典没有对应内容则显示西班牙语原文。</p>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>商品名称（英语）</label><input value={draft.translations.en?.name ?? ""} onChange={(event) => updateTranslationText("en", "name", event.target.value)} /></div>
            <div className="field"><label>商品名称（简体中文）</label><input value={draft.translations.zh?.name ?? ""} onChange={(event) => updateTranslationText("zh", "name", event.target.value)} /></div>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>简短描述（英语）</label><input value={draft.translations.en?.shortDescription ?? ""} onChange={(event) => updateTranslationText("en", "shortDescription", event.target.value)} /></div>
            <div className="field"><label>简短描述（简体中文）</label><input value={draft.translations.zh?.shortDescription ?? ""} onChange={(event) => updateTranslationText("zh", "shortDescription", event.target.value)} /></div>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>详细描述（英语）</label><textarea rows={4} value={draft.translations.en?.description ?? ""} onChange={(event) => updateTranslationText("en", "description", event.target.value)} /></div>
            <div className="field"><label>详细描述（简体中文）</label><textarea rows={4} value={draft.translations.zh?.description ?? ""} onChange={(event) => updateTranslationText("zh", "description", event.target.value)} /></div>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>材质（英语，按西语材质顺序用逗号分隔）</label><input value={toStringList(draft.materials).map((material) => draft.translations.en?.materials?.[material] ?? "").join(", ")} onChange={(event) => updateTranslationList("en", "materials", event.target.value)} placeholder="与西语材质一一对应" /></div>
            <div className="field"><label>材质（简体中文，按西语材质顺序用逗号分隔）</label><input value={toStringList(draft.materials).map((material) => draft.translations.zh?.materials?.[material] ?? "").join(", ")} onChange={(event) => updateTranslationList("zh", "materials", event.target.value)} placeholder="与西语材质一一对应" /></div>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>颜色（英语，按西语颜色顺序用逗号分隔）</label><input value={draftColors.map((color) => draft.translations.en?.colors?.[color] ?? "").join(", ")} onChange={(event) => updateTranslationList("en", "colors", event.target.value)} placeholder="与西语颜色一一对应" /></div>
            <div className="field"><label>颜色（简体中文，按西语颜色顺序用逗号分隔）</label><input value={draftColors.map((color) => draft.translations.zh?.colors?.[color] ?? "").join(", ")} onChange={(event) => updateTranslationList("zh", "colors", event.target.value)} placeholder="与西语颜色一一对应" /></div>
          </div>
          <div className="field-row two-col">
            <div className="field"><label>尺寸描述（英语）</label><input value={draft.translations.en?.dimensions ?? ""} onChange={(event) => updateTranslationText("en", "dimensions", event.target.value)} /></div>
            <div className="field"><label>尺寸描述（简体中文）</label><input value={draft.translations.zh?.dimensions ?? ""} onChange={(event) => updateTranslationText("zh", "dimensions", event.target.value)} /></div>
          </div>
          <div className="field-row two-col"><div className="field"><label>商品分类</label><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="">请选择</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{categoryLabel(category)}</option>)}</select></div><div className="field"><label>商品价格（MXN）</label><input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></div></div>
          <div className="field"><label>可售库存</label><input type="number" min="0" step="1" value={draft.inventoryQuantity} onChange={(event) => setDraft({ ...draft, inventoryQuantity: event.target.value })} /></div>
          <div className="field"><label>简短描述</label><input value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} /></div>
          <div className="field"><label>详细描述</label><textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
          <div className="field-row two-col"><div className="field"><label>材质</label><input value={draft.materials} onChange={(event) => setDraft({ ...draft, materials: event.target.value })} placeholder="用逗号分隔" /></div><div className="field"><label>颜色</label><input value={draft.colors} onChange={(event) => setDraft({ ...draft, colors: event.target.value })} placeholder="用逗号分隔" /></div></div>
          {draftColors.length > 0 ? <div className="field"><label>颜色单独价格（MXN）</label><div className="color-primary-images-grid">{draftColors.map((color) => <label className="color-primary-image" key={`${color}-price`}><span>{color}</span><input type="number" min="0.01" step="0.01" value={draft.colorPrices[color] ?? ""} placeholder={`默认 ${draft.price || "价格"}`} onChange={(event) => setDraft((current) => ({ ...current, colorPrices: { ...current.colorPrices, [color]: event.target.value } }))} /></label>)}</div></div> : null}
          <div className="field-row two-col"><div className="field"><label>尺寸描述</label><input value={draft.dimensions} onChange={(event) => setDraft({ ...draft, dimensions: event.target.value })} placeholder="例如：长 30 × 宽 20 cm" /></div><div className="field"><label>尺码选项</label><input value={draft.sizes} onChange={(event) => setDraft({ ...draft, sizes: event.target.value })} placeholder="例如：S, M, L, XL；不适用可留空" /></div></div>
          <div className="field"><label>运费规则</label><p>订单商品金额低于 MXN 1,500 收取 MXN 150；达到 MXN 1,500 免运费。</p></div>
          </section>
        </dialog> : null}
      </div>
    </div>
  );
}
