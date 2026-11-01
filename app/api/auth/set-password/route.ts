import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "customer-set-password", 5, 15 * 60_000);
  if (limited) return limited;
  let password: string | undefined;
  try {
    ({ password } = await request.json() as { password?: string });
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
  if (!password || password.length < 10) return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: "La autenticación no está configurada." }, { status: 503 });

  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.headers.get("cookie")?.split(";").map((part) => {
        const [name, ...value] = part.trim().split("=");
        return { name, value: value.join("=") };
      }).filter((cookie) => cookie.name) ?? [],
      setAll: (cookies) => cookies.forEach((cookie) => cookiesToSet.push(cookie)),
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}