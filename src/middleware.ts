import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value

  // Protect /chat route
  if (req.nextUrl.pathname.startsWith("/chat") && !token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

// Run middleware only on these routes
export const config = {
  matcher: ["/chat/:path*"],
}
