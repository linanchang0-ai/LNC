"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type Slide = { id: string; image_path: string; image_url: string; alt_text: string; href: string | null; sort_order: number; is_active: boolean; created_at: string };
type SlideDraft = { altText: string; href: string; sortOrder: string };

const initialDraft: SlideDraft = { altText: "", href: "", sortOrder: "0" };
const initialIntervalSeconds = 5;

export default function AdminSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState(initialIntervalSeconds);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingInterval, setSavingInterval] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const previewUrlRef = useRef("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadInitialSlides = async () => {
      try {
        const response = await fetch("/api/admin/slides");
        const data = await response.json() as { items?: Slide[]; intervalSeconds?: number; error?: string };
        if (!response.ok) throw new Error(data.error ?? "轮播图加载失败。");
        if (!cancelled) {
          setSlides(data.items ?? []);
          setIntervalSeconds(data.intervalSeconds ?? initialIntervalSeconds);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "轮播图加载失败。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitialSlides();
    return () => {
      cancelled = true;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = selected ? URL.createObjectURL(selected) : "";
    setImagePreview(previewUrlRef.current);
    setImage(selected);
    event.target.value = "";
  };

  const uploadSlide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image) {
      setError("请先选择轮播图片。");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("image", image);
      formData.set("altText", draft.altText);
      formData.set("href", draft.href);
      const response = await fetch("/api/admin/slides", { method: "POST", body: formData });
      const data = await response.json() as { item?: Slide; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "上传轮播图失败。");
      setSlides((current) => [...current, data.item!].sort((first, second) => first.sort_order - second.sort_order));
      setImage(null);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
      setImagePreview("");
      setDraft(initialDraft);
      setMessage("轮播图已添加。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传轮播图失败。");
    } finally {
      setUploading(false);
    }
  };

  const updateSlide = async (slide: Slide, update: Partial<SlideDraft> | { isActive: boolean }) => {
    setSavingId(slide.id);
    setError("");
    setMessage("");
    const body = "isActive" in update ? update : {
      altText: update.altText ?? slide.alt_text,
      href: update.href ?? slide.href ?? "",
      sortOrder: Number(update.sortOrder ?? slide.sort_order),
    };
    try {
      const response = await fetch("/api/admin/slides", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: slide.id, ...body }) });
      const data = await response.json() as { item?: Slide; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error ?? "轮播图更新失败。");
      setSlides((current) => current.map((item) => item.id === slide.id ? data.item! : item).sort((first, second) => first.sort_order - second.sort_order));
      setMessage("轮播图已更新。");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "轮播图更新失败。");
    } finally {
      setSavingId(null);
    }
  };

  const saveInterval = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingInterval(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/slides", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intervalSeconds }) });
      const data = await response.json() as { intervalSeconds?: number; error?: string };
      if (!response.ok || data.intervalSeconds === undefined) throw new Error(data.error ?? "轮播间隔保存失败。");
      setIntervalSeconds(data.intervalSeconds);
      setMessage("轮播间隔已更新。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "轮播间隔保存失败。");
    } finally {
      setSavingInterval(false);
    }
  };

  const deleteSlide = async (slide: Slide) => {
    if (!window.confirm("确定删除这张轮播图吗？图片文件也会一并删除。")) return;
    setSavingId(slide.id);
    setError("");
    try {
      const response = await fetch("/api/admin/slides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: slide.id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "轮播图删除失败。");
      setSlides((current) => current.filter((item) => item.id !== slide.id));
      setMessage("轮播图已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "轮播图删除失败。");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-slides-page">
      <div className="page-hero">
        <h1>首页轮播</h1>
        <p>上传首页轮播图片，按 16:9 比例展示。支持 JPEG、PNG、WebP 或 GIF，最大 8 MB。</p>
      </div>

      <form className="admin-panel admin-slide-interval" onSubmit={saveInterval}>
        <div><h2>轮播切换间隔</h2><p>设置首页每张图片停留的时间。</p></div>
        <label htmlFor="slide-interval">间隔（秒）</label>
        <input id="slide-interval" type="number" min="1" max="60" step="1" required value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))} />
        <button className="small-button" type="submit" disabled={savingInterval}>{savingInterval ? "正在保存..." : "保存间隔"}</button>
      </form>

      <form className="admin-panel admin-slide-upload" onSubmit={uploadSlide}>
        <div className="admin-slide-upload-heading"><div><h2>添加图片</h2><p>建议上传 16:9 横图，手机和桌面均按比例显示。</p></div><span>16:9</span></div>
        <label className={`admin-slide-file${image ? " has-file" : ""}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
          <span>{image ? image.name : "选择轮播图片"}</span>
          <span>{image ? `${(image.size / 1024 / 1024).toFixed(2)} MB` : "点击选择文件"}</span>
        </label>
        {imagePreview ? <div className="admin-slide-preview"><img src={imagePreview} alt="待上传轮播图预览" /></div> : null}
        <div className="field-row two-col admin-slide-fields">
          <div className="field"><label htmlFor="slide-alt-text">替代文字</label><input id="slide-alt-text" value={draft.altText} maxLength={200} onChange={(event) => setDraft({ ...draft, altText: event.target.value })} placeholder="简短描述图片内容" /></div>
          <div className="field"><label htmlFor="slide-href">点击跳转（可选）</label><input id="slide-href" type="text" value={draft.href} onChange={(event) => setDraft({ ...draft, href: event.target.value })} placeholder="/shop 或 https://..." /></div>
        </div>
        <button className="small-button" type="submit" disabled={uploading || !image}>{uploading ? "正在上传..." : "上传到首页轮播"}</button>
      </form>

      {error ? <p className="error-box" role="alert">{error}</p> : null}
      {message ? <p className="admin-slide-message" role="status">{message}</p> : null}

      <section className="admin-slide-list" aria-label="已上传轮播图">
        <div className="section-head"><h2 className="section-title">已上传图片 <span>{slides.length}</span></h2></div>
        {loading ? <p className="muted">正在加载轮播图...</p> : slides.length === 0 ? <p className="admin-slide-empty">还没有轮播图片。</p> : slides.map((slide) => <article className="admin-slide-row" key={slide.id}>
          <img className="admin-slide-thumb" src={slide.image_url} alt={slide.alt_text} />
          <div className="admin-slide-meta"><strong>{slide.alt_text || "未填写替代文字"}</strong><span>{slide.href || "未设置跳转"}</span></div>
          <label className="admin-slide-order">顺序<input type="number" min="0" step="1" defaultValue={slide.sort_order} aria-label="轮播顺序" onBlur={(event) => { const sortOrder = Number(event.target.value); if (Number.isInteger(sortOrder) && sortOrder >= 0 && sortOrder !== slide.sort_order) void updateSlide(slide, { sortOrder: String(sortOrder) }); }} /></label>
          <label className="admin-slide-active"><input type="checkbox" checked={slide.is_active} onChange={(event) => void updateSlide(slide, { isActive: event.target.checked })} disabled={savingId === slide.id} />首页显示</label>
          <button className="ghost-button admin-slide-delete" type="button" onClick={() => void deleteSlide(slide)} disabled={savingId === slide.id}>删除</button>
        </article>)}
      </section>
    </div>
  );
}