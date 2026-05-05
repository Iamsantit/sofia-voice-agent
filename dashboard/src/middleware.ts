import { NextResponse, type NextRequest } from "next/server";

// Public routes accessible without auth
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/registro",
  "/onboarding/exito",
];

// API paths that handle their own auth (auth endpoints + public onboarding)
const PUBLIC_API_PATHS = [
  "/api/auth/",
  "/api/industries",
  "/api/onboarding",
  "/api/billing/quote-custom",
  "/api/public/",
  "/api/embed.js",
];

// Pages that don't need a session
const PUBLIC_PAGE_PREFIXES = ["/embed/"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get("sofia_session")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
