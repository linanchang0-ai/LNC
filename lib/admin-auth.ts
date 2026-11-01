import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const adminRoles = ["admin", "operations", "support", "warehouse", "finance"] as const;
export type AdminRole = (typeof adminRoles)[number];

export async function getAdminRole(userId: string | undefined): Promise<AdminRole | null> {
  const supabase = createAdminDataClient();
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  return !error && data && adminRoles.includes(data.role as AdminRole) ? data.role as AdminRole : null;
}

export async function hasAdminRole(userId: string | undefined, allowedRoles: readonly AdminRole[]) {
  const role = await getAdminRole(userId);
  return Boolean(role && allowedRoles.includes(role));
}

export function createAdminAuthClient(getAll: () => { name: string; value: string }[]) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll,
      setAll: () => undefined,
    },
  });
}

export function createAdminDataClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}