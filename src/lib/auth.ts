import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export function getUserFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) return null;

    const token = authHeader.split(" ")[1]; // "Bearer TOKEN"

    if (!token) return null;

    const decoded = verifyToken(token);

    return decoded as { userId: number; username: string };
  } catch {
    return null;
  }
}