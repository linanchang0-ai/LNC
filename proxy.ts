import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  if (pathname === "/admin/login" || pathname === "/admin/set-password" || pathname === "/account/set-password" || pathname === "/account/favorites") return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.redirect(new URL(isAdminRoute ? "/admin/login" : "/login", request.url));

  const response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL(isAdminRoute ? "/admin/login" : "/login", request.url));
  return response;
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };