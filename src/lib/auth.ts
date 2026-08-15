import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export function getUserFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const cookieToken = req.cookies?.get("token")?.value ?? null;
    const token = headerToken || cookieToken;

    if (!token) return null;

    const decoded = verifyToken(token);

    return decoded as { userId: number; username: string };
  } catch {
    return null;
  }
}