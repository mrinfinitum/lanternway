import { auth } from "@/lib/auth/server";

// Every app screen needs a signed-in parent. Open to everyone: the welcome tour (/),
// sign-in and sign-up pages, teacher check-in links (/c/...), and the auth API.
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: [
    "/home/:path*",
    "/log/:path*",
    "/timeline/:path*",
    "/medications/:path*",
    "/therapy/:path*",
    "/school/:path*",
    "/about-me/:path*",
    "/reports/:path*",
    "/more/:path*",
    "/kids/:path*",
    "/api/medications/:path*",
  ],
};
