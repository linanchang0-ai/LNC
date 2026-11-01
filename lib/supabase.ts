import { createClient } from "@supabase/supabase-js";

export const supabaseConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-key",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key",
};

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const tableNames = {
  users: "users",
  products: "products",
  categories: "categories",
  orders: "orders",
  orderItems: "order_items",
  payments: "payments",
  refunds: "refunds",
  returns: "returns",
  addresses: "addresses",
  favorites: "favorites",
  webhookEvents: "webhook_events",
};
