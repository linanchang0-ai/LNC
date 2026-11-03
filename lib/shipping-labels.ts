import type { SupabaseClient } from "@supabase/supabase-js";

export const SHIPPING_LABEL_BUCKET = "shipping-labels";

export async function signShippingLabel(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from(SHIPPING_LABEL_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
