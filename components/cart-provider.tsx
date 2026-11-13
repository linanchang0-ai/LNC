"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import type { ProductTranslations } from "@/lib/product-translations";
import { getShippingCost } from "@/lib/shipping";
import { fetchCatalogProducts } from "@/lib/catalog-client";

export type CartItem = {
  id: string | number;
  slug: string;
  name: string;
  translations?: ProductTranslations;
  price: number;
  image: string;
  color?: string;
  size?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  couponPending: boolean;
  total: number;
  itemCount: number;
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string | number, color: string | undefined, size: string | undefined, delta: number) => void;
  removeFromCart: (id: string | number, color?: string, size?: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = "lnc_sports_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<{ code: string; discount: number; validatedSubtotal: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return;
      // Muestra de inmediato el carrito guardado; después se valida contra el catálogo.
      startTransition(() => setItems(parsed));
      void fetchCatalogProducts()
        .then((catalog) => {
          const availableIds = new Set(catalog.map((product) => String(product.databaseId ?? product.id)));
          startTransition(() => setItems(parsed.filter((item) => availableIds.has(String(item.id)))));
        })
        .catch(() => startTransition(() => setItems(parsed)));
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Omit<CartItem, "quantity">) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === product.id && entry.color === product.color && entry.size === product.size);
      if (item) {
        return current.map((entry) =>
          entry.id === product.id && entry.color === product.color && entry.size === product.size ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
    window.dispatchEvent(new CustomEvent("lnc-sports:add-to-cart", { detail: product }));
  };

  const updateQuantity = (id: string | number, color: string | undefined, size: string | undefined, delta: number) => {
    setItems((current) =>
      current
        .map((entry) =>
          entry.id === id && entry.color === color && entry.size === size ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  };

  const removeFromCart = (id: string | number, color?: string, size?: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id || entry.color !== color || entry.size !== size));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    setCouponError(null);
  };
  const applyCoupon = (code: string, discount: number) => {
    setCoupon({ code, discount, validatedSubtotal: subtotal });
    setCouponError(null);
  };
  const clearCoupon = () => {
    setCoupon(null);
    setCouponError(null);
  };

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const shipping = useMemo(() => getShippingCost(subtotal), [subtotal]);
  const couponPending = Boolean(coupon && coupon.validatedSubtotal !== subtotal);
  const discount = Math.min(subtotal, coupon && coupon.validatedSubtotal === subtotal ? coupon.discount : 0);
  const total = subtotal + shipping - discount;
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    const code = coupon?.code;
    if (!code || coupon.validatedSubtotal === subtotal) return;

    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotal }),
          signal: controller.signal,
        });
        const data = await response.json() as { code?: unknown; discount?: unknown; error?: string };
        if (!active) return;
        const validatedCode = data.code;
        const validatedDiscount = data.discount;
        if (!response.ok || typeof validatedCode !== "string" || typeof validatedDiscount !== "number") {
          setCoupon((current) => current?.code === code ? null : current);
          setCouponError(data.error ?? "No se pudo aplicar el cupón.");
          return;
        }

        setCoupon((current) => current?.code === code
          ? { code: validatedCode, discount: validatedDiscount, validatedSubtotal: subtotal }
          : current);
        setCouponError(null);
      } catch {
        if (!active) return;
        setCoupon((current) => current?.code === code ? null : current);
        setCouponError("No se pudo aplicar el cupón.");
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [coupon?.code, coupon?.validatedSubtotal, subtotal]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      subtotal,
      shipping,
      discount,
      couponCode: coupon?.code ?? null,
      couponError,
      couponPending,
      total,
      itemCount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyCoupon,
      clearCoupon,
    }),
    [items, subtotal, shipping, discount, coupon, couponError, couponPending, total, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
