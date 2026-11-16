import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function limited(request: Request, context: RouteContext) {
  const limit = rateLimit(`auth:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  return handler(request, context) as Promise<Response>;
}

export { limited as GET, limited as POST };
