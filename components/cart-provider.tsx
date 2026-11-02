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

export type CartItem = {
  id: string | number;
  slug: string;
  name: string;
  translations?: ProductTranslations;
  price: number;
  image: string;
  color?: string;
  size?: string;
  shippingFee?: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
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
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return;
      void fetch("/api/products")
        .then(async (response) => response.ok ? await response.json() as { items?: Array<{ databaseId?: string; id: string | number }> } : null)
        .then((catalog) => {
          const availableIds = new Set((catalog?.items ?? []).map((product) => String(product.databaseId ?? product.id)));
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
  };
  const applyCoupon = (code: string, discount: number) => setCoupon({ code, discount });
  const clearCoupon = () => setCoupon(null);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const shipping = useMemo(
    () => items.reduce((total, item) => total + (item.shippingFee ?? 0) * item.quantity, 0),
    [items],
  );
  const discount = Math.min(subtotal, coupon?.discount ?? 0);
  const total = subtotal + shipping - discount;
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      subtotal,
      shipping,
      discount,
      couponCode: coupon?.code ?? null,
      total,
      itemCount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyCoupon,
      clearCoupon,
    }),
    [items, subtotal, shipping, discount, coupon, total, itemCount],
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
