import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host split (Sabu-style): kitchen lives on KITCHEN_HOST only.
 * Customer hosts keep /admin and /api/admin hidden (404).
 * Leave KITCHEN_HOST unset for local/dev so /admin stays reachable everywhere.
 */
function kitchenHosts(): Set<string> {
  return new Set(
    (process.env.KITCHEN_HOST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase().replace(/:\d+$/, ""))
      .filter(Boolean),
  );
}

function requestHost(request: NextRequest): string {
  return (request.headers.get("host") ?? "").toLowerCase().split(":")[0] ?? "";
}

export function proxy(request: NextRequest) {
  const hosts = kitchenHosts();
  if (hosts.size === 0) return NextResponse.next();

  const host = requestHost(request);
  const path = request.nextUrl.pathname;
  const onKitchen = hosts.has(host);
  const kitchenPath =
    path === "/admin" || path.startsWith("/admin/") || path === "/api/admin" || path.startsWith("/api/admin/");

  if (onKitchen) {
    if (path === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (kitchenPath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};
