"use client";

import { useEffect, useState } from "react";

export function useAdminResource<T>(resource: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin?resource=${resource}`);
      const data = await response.json() as { items?: T[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "数据加载失败。");
      setItems(data.items ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      try {
        const response = await fetch(`/api/admin?resource=${resource}`);
        const data = await response.json() as { items?: T[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "数据加载失败。");
        if (!cancelled) {
          setItems(data.items ?? []);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "数据加载失败。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [resource]);

  return { items, loading, error, reload: load, setItems };
}