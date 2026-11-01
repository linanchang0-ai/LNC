"use client";

import { formatPrice } from "@/lib/admin-data";
import { useAdminResource } from "@/components/admin-data-loader";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

export const dynamic = "force-dynamic";

type AdminProduct = { id: string; name: string; category: string | null; price: number; shipping_fee: number | null; inventory_quantity: number | null; short_description: string | null; description: string | null; materials: unknown; dimensions: string | null; colors: unknown; size_options: unknown; featured: boolean; is_published: boolean; image_url: string | null; color_images: unknown; color_prices: unknown; gallery: unknown; detail_images: unknown };
type AdminCategory = { id: string; slug: string; name: string };

const MAX_UPLOAD_IMAGE_BYTES = 7 * 1024 * 1024;
const STORAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

export default function AdminProductsPage() {
  const { items: products, loading, error, setItems } = useAdminResource<AdminProduct>("products");
  const { items: categories, error: categoriesError, setItems: setCategories } = useAdminResource<AdminCategory>("categories");
  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "", price: "", shippingFee: "0", inventoryQuantity: "", shortDescription: "", description: "", materials: "", dimensions: "", colors: "", sizes: "", primaryImage: "", colorImages: {} as Record<string, string>, colorPrices: {} as Record<string, string>, gallery: [] as string[], detailImages: [] as string[] });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPrimaryImages, setPendingPrimaryImages] = useState<File[]>([]);
  const [pendingDetailImages, setPendingDetailImages] = useState<File[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
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
  const productGroups = Array.from(new Set(products.map((product) => product.category || "uncategorized"))).map((categorySlug) => ({
    slug: categorySlug,
    name: categories.find((category) => category.slug === categorySlug)?.name ?? (categorySlug === "uncategorized" ? "未分类" : categorySlug),
    products: products.filter((product) => (product.category || "uncategorized") === categorySlug),
  }));
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
    setPendingDetailImages([]);
    const primaryImage = product.image_url || gallery[0] || "";
    const detailImages = toStringList(product.detail_images);
    setDraft({ name: product.name, category: product.category ?? "", price: String(product.price), shippingFee: String(product.shipping_fee ?? 0), inventoryQuantity: String(product.inventory_quantity ?? 0), shortDescription: product.short_description ?? "", description: product.description ?? "", materials: materials.join(", "), dimensions: product.dimensions ?? "", colors: colors.join(", "), sizes: sizes.join(", "), primaryImage, colorImages, colorPrices, gallery: gallery.filter((image) => image !== primaryImage), detailImages });
  };

  const beginCreating = () => {
    setCreating(true);
    setEditingId(null);
    setSaveError("");
    setPendingPrimaryImages([]);
    setPendingDetailImages([]);
    setDraft({ name: "", category: "", price: "", shippingFee: "0", inventoryQuantity: "0", shortDescription: "", description: "", materials: "", dimensions: "", colors: "", sizes: "", primaryImage: "", colorImages: {}, colorPrices: {}, gallery: [], detailImages: [] });
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setCreating(false);
    setEditingId(null);
    setPendingPrimaryImages([]);
    setPendingDetailImages([]);
    setSaveError("");
  };

  const removeImage = (imageIndex: number) => {
    setDraft((current) => ({ ...current, detailImages: current.detailImages.filter((_, index) => index !== imageIndex) }));
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
      const uploadFiles = await Promise.all(selectedFiles.map(prepareImageForUpload));
      const formData = new FormData();
      formData.append("productId", editingId);
      uploadFiles.forEach((file) => formData.append("images", file));
      const response = await fetch("/api/admin/products/images", { method: "POST", body: formData });
      const data = await response.json() as { urls?: string[]; error?: string };
      const uploadedUrls = data.urls;
      if (!response.ok || !uploadedUrls) throw new Error(data.error ?? "图片上传失败。");
      if (target === "detail") {
        const detailImages = [...draft.detailImages, ...uploadedUrls];
        const saveResponse = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, detailImages }) });
        const savedData = await saveResponse.json().catch(() => ({})) as { item?: AdminProduct; error?: string };
        if (!saveResponse.ok || !savedData.item) throw new Error(savedData.error ?? "详情图保存失败。请重新上传。");
        setDraft((current) => ({ ...current, detailImages }));
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
    const files = [...pendingPrimaryImages, ...pendingDetailImages];
    if (!files.length) return { primaryImage: draft.primaryImage, gallery: draft.gallery, detailImages: draft.detailImages };

    const uploadFiles = await Promise.all(files.map(prepareImageForUpload));
    const formData = new FormData();
    formData.append("productId", productId);
    uploadFiles.forEach((file) => formData.append("images", file));
    const response = await fetch("/api/admin/products/images", { method: "POST", body: formData });
    const data = await response.json() as { urls?: string[]; error?: string };
    if (!response.ok || !data.urls) throw new Error(data.error ?? "图片上传失败。");

    const newPrimaryImages = data.urls.slice(0, pendingPrimaryImages.length);
    const primaryImage = draft.primaryImage || newPrimaryImages[0] || "";
    return { primaryImage, gallery: [...draft.gallery, ...newPrimaryImages.slice(draft.primaryImage ? 0 : 1)], detailImages: [...draft.detailImages, ...data.urls.slice(pendingPrimaryImages.length)] };
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, target: "primary" | "detail", color?: string) => {
    if (event.target.files) void uploadImages(event.target.files, target, color);
    event.target.value = "";
  };

  const handlePendingFileChange = (event: ChangeEvent<HTMLInputElement>, target: "primary" | "detail") => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (target === "primary") setPendingPrimaryImages(selectedFiles);
    else setPendingDetailImages(selectedFiles);
    event.target.value = "";
  };

  const saveProduct = async (id?: string) => {
    setSaving(true);
    setSaveError("");
    try {
      const savedColorPrices = Object.fromEntries(Object.entries(draft.colorPrices).flatMap(([color, price]) => Number(price) > 0 ? [[color, Number(price)]] : []));
      const colorPrices = Object.keys(savedColorPrices).length ? savedColorPrices : undefined;
      const sizes = toStringList(draft.sizes);
      const response = await fetch("/api/admin", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: draft.name, category: draft.category, price: Number(draft.price), shippingFee: Number(draft.shippingFee), inventoryQuantity: Number(draft.inventoryQuantity), shortDescription: draft.shortDescription, description: draft.description, materials: draft.materials.split(",").map((item) => item.trim()).filter(Boolean), dimensions: draft.dimensions, colors: draft.colors.split(",").map((item) => item.trim()).filter(Boolean), sizes, primaryImage: draft.primaryImage, colorImages: draft.colorImages, colorPrices, gallery: draft.gallery, detailImages: draft.detailImages }) });
      const data = await response.json() as { item?: AdminProduct; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "商品保存失败。");
      const savedProduct = data.item;
      if (!id && (pendingPrimaryImages.length || pendingDetailImages.length)) {
        setUploading(true);
        const images = await uploadPendingImages(savedProduct.id);
        const imageResponse = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: savedProduct.id, name: draft.name, category: draft.category, price: Number(draft.price), shippingFee: Number(draft.shippingFee), inventoryQuantity: Number(draft.inventoryQuantity), shortDescription: draft.shortDescription, description: draft.description, materials: draft.materials.split(",").map((item) => item.trim()).filter(Boolean), dimensions: draft.dimensions, colors: draft.colors.split(",").map((item) => item.trim()).filter(Boolean), sizes, primaryImage: images.primaryImage, colorImages: draft.colorImages, colorPrices, gallery: images.gallery, detailImages: images.detailImages }) });
        const imageData = await imageResponse.json() as { item?: AdminProduct; error?: string };
        if (!imageResponse.ok || !imageData.item) throw new Error(imageData.error ?? "图片保存失败。");
        setPendingPrimaryImages([]);
        setPendingDetailImages([]);
        setItems((current) => [imageData.item!, ...current]);
        beginEditing(imageData.item);
      } else {
        setItems((current) => id ? current.map((product) => product.id === id ? { ...product, ...savedProduct } : product) : [savedProduct, ...current]);
        if (id) setEditingId(null);
        else beginEditing(savedProduct);
      }
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
    if (!name) return;
    setCategorySaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "categories", name }) });
      const data = await response.json() as { item?: AdminCategory; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "分类创建失败。");
      const createdCategory = data.item;
      setCategories((current) => [...current, createdCategory].sort((first, second) => first.name.localeCompare(second.name)));
      setNewCategoryName("");
    } catch (categoryError) {
      setSaveError(categoryError instanceof Error ? categoryError.message : "分类创建失败。");
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (category: AdminCategory) => {
    if (!window.confirm(`确定要删除分类“${category.name}”吗？`)) return;
    setSaveError("");
    const response = await fetch(`/api/admin?resource=categories&id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setSaveError(data.error ?? "分类删除失败。");
    setCategories((current) => current.filter((item) => item.id !== category.id));
  };

  const draftColors = draft.colors.split(",").map((color) => color.trim()).filter(Boolean);
  const mainImages = [draft.primaryImage, ...draft.gallery].filter(Boolean);

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
            <div className="field"><label htmlFor="new-category">新建分类</label><input id="new-category" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：配件" /></div>
            <button className="small-button category-create-button" type="button" onClick={() => void createCategory()} disabled={categorySaving || !newCategoryName.trim()}>{categorySaving ? "正在保存..." : "添加分类"}</button>
          </div>
          <div className="filter-bar" aria-label="已有商品分类">
            {categories.map((category) => <span className="filter-chip" key={category.id}>{category.name} <button type="button" onClick={() => void deleteCategory(category)} aria-label={`删除 ${category.name}`}>×</button></span>)}
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
                  <td>{product.category}</td>
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
                  <span>{product.category}</span>
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
        {editorOpen ? <dialog ref={editorDialogRef} className="admin-product-modal-dialog" aria-labelledby="admin-product-editor-title" onCancel={(event) => { event.preventDefault(); closeEditor(); }} onClick={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <section className="form-card admin-product-modal">
          <div className="product-editor-heading"><h2 id="admin-product-editor-title">{creating ? "新增商品" : "编辑商品"}</h2><div className="product-editor-actions"><button className="small-button" type="button" onClick={() => void saveProduct(editingId ?? undefined)} disabled={saving || uploading}>{saving ? "正在保存..." : creating ? "创建商品" : "保存修改"}</button><button className="ghost-button" type="button" onClick={closeEditor} disabled={saving || uploading}>取消</button></div></div>
          {saveError ? <p className="error-box" role="alert">{saveError}</p> : null}
          {editingId ? <div className="product-image-editor">
            <div className="product-image-heading"><div><h3>商品图片</h3><p>主图用于商品列表，详情图显示在商品详情页。</p></div></div>
            <div className="product-image-channels">
            <div className="product-image-group">
              <strong>主图</strong>
              {draft.primaryImage ? <div className="product-primary-image"><img src={draft.primaryImage} alt={`${draft.name} 的主图`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => ({ ...current, primaryImage: "" }))} aria-label="删除主图" title="删除主图">×</button></div> : null}
              {draft.gallery.map((image, index) => <div className="product-primary-image" key={`${image}-${index}`}><img src={image} alt={`${draft.name} 的主图 ${index + 2}`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((_, imageIndex) => imageIndex !== index) }))} aria-label={`删除主图 ${index + 2}`} title={`删除主图 ${index + 2}`}>×</button></div>)}
              <label className={`product-image-upload-button${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : "添加主图"}<input className="product-image-file-input" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => handleFileChange(event, "primary")} /></label>
            </div>
            <div className="product-image-group">
              <strong>详情图上传</strong>
              <div className="product-image-strip-row">
                <div className="product-image-strip" aria-label="商品详情图">
                  {draft.detailImages.map((image, index) => <div className="product-image-item" key={`${image}-${index}`}><div className="product-image-thumb"><img src={image} alt={`${draft.name} 的详情图 ${index + 1}`} /><button type="button" className="product-image-remove" onClick={() => removeImage(index)} aria-label={`删除详情图 ${index + 1}`} title={`删除详情图 ${index + 1}`}>×</button></div></div>)}
                </div>
                <label className={`product-image-dropzone${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : "选择详情图"}<input className="product-image-file-input" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => handleFileChange(event, "detail")} /></label>
              </div>
            </div>
            </div>
            {draftColors.length > 0 ? <div className="color-primary-images"><strong>颜色主图</strong><p>可按顺序自动匹配，或为单个颜色上传不同图片。</p>{mainImages.length > 0 ? <button type="button" className="small-button" onClick={matchColorImagesByOrder}>按顺序匹配颜色主图</button> : null}<div className="color-primary-images-grid">{draftColors.map((color) => <div className="color-primary-image" key={color}><span>{color}</span>{draft.colorImages[color] ? <div className="product-primary-image"><img src={draft.colorImages[color]} alt={`${draft.name} ${color} 主图`} /><button type="button" className="product-image-remove" onClick={() => setDraft((current) => { const colorImages = { ...current.colorImages }; delete colorImages[color]; return { ...current, colorImages }; })} aria-label={`删除${color}主图`} title={`删除${color}主图`}>×</button></div> : null}<label className={`product-image-upload-button${uploading ? " is-disabled" : ""}`}>{uploading ? "正在上传..." : draft.colorImages[color] ? "更换主图" : "上传主图"}<input className="product-image-file-input" type="file" accept="image/*" disabled={uploading} onChange={(event) => handleFileChange(event, "primary", color)} /></label></div>)}</div></div> : null}
          </div> : <div className="product-image-pending"><strong>商品图片</strong><span>可先从图库选择图片，创建商品后会自动上传。</span><div className="product-image-channels"><label className="product-image-upload-button">{pendingPrimaryImages.length ? `已选 ${pendingPrimaryImages.length} 张主图` : "选择主图"}<input className="product-image-file-input" type="file" accept="image/*" multiple onChange={(event) => handlePendingFileChange(event, "primary")} /></label><label className="product-image-upload-button">{pendingDetailImages.length ? `已选 ${pendingDetailImages.length} 张详情图` : "选择详情图"}<input className="product-image-file-input" type="file" accept="image/*" multiple onChange={(event) => handlePendingFileChange(event, "detail")} /></label></div></div>}
          <div className="field"><label>商品名称</label><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
          <div className="field-row two-col"><div className="field"><label>商品分类</label><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="">请选择</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></div><div className="field"><label>商品价格（MXN）</label><input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></div></div>
          <div className="field"><label>可售库存</label><input type="number" min="0" step="1" value={draft.inventoryQuantity} onChange={(event) => setDraft({ ...draft, inventoryQuantity: event.target.value })} /></div>
          <div className="field"><label>简短描述</label><input value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} /></div>
          <div className="field"><label>详细描述</label><textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
          <div className="field-row two-col"><div className="field"><label>材质</label><input value={draft.materials} onChange={(event) => setDraft({ ...draft, materials: event.target.value })} placeholder="用逗号分隔" /></div><div className="field"><label>颜色</label><input value={draft.colors} onChange={(event) => setDraft({ ...draft, colors: event.target.value })} placeholder="用逗号分隔" /></div></div>
          {draftColors.length > 0 ? <div className="field"><label>颜色单独价格（MXN）</label><div className="color-primary-images-grid">{draftColors.map((color) => <label className="color-primary-image" key={`${color}-price`}><span>{color}</span><input type="number" min="0.01" step="0.01" value={draft.colorPrices[color] ?? ""} placeholder={`默认 ${draft.price || "价格"}`} onChange={(event) => setDraft((current) => ({ ...current, colorPrices: { ...current.colorPrices, [color]: event.target.value } }))} /></label>)}</div></div> : null}
          <div className="field-row two-col"><div className="field"><label>尺寸描述</label><input value={draft.dimensions} onChange={(event) => setDraft({ ...draft, dimensions: event.target.value })} placeholder="例如：长 30 × 宽 20 cm" /></div><div className="field"><label>尺码选项</label><input value={draft.sizes} onChange={(event) => setDraft({ ...draft, sizes: event.target.value })} placeholder="例如：S, M, L, XL；不适用可留空" /></div></div>
          <div className="field"><label>每件商品运费（MXN）</label><input type="number" min="0" step="0.01" value={draft.shippingFee} onChange={(event) => setDraft({ ...draft, shippingFee: event.target.value })} /></div>
          </section>
        </dialog> : null}
      </div>
    </div>
  );
}
