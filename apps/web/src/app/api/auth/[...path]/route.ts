import { auth } from "@/lib/auth/server";

// Proxies sign-in, sign-up, session, and sign-out requests to Neon Auth.
export const { GET, POST } = auth.handler();
