import { cookies } from "next/headers";
import { normalizeLocale } from "@/lib/i18n";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("lnc-locale")?.value);
}
