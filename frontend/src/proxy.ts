import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "suivi_chantier_auth";
const publicPaths = ["/login", "/signup"];

// ponytail: check "optimiste" par simple présence du cookie (opaque, géré par ASP.NET Core).
// Le vrai gardien reste [Authorize] côté backend ; un cookie expiré mais présent
// passera ici et sera rattrapé par le 401 dans lib/api.ts.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.has(AUTH_COOKIE);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.svg).*)"],
};
