import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req as any);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicKey, replaceIfUnused } = await req.json();
    if (typeof publicKey !== "string" || publicKey.length < 128 || publicKey.length > 8192) {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { publicKey: true },
    });

    if (currentUser?.publicKey) {
      if (!replaceIfUnused) {
        return NextResponse.json({ error: "Encryption key already exists" }, { status: 409 });
      }

      const encryptedMessageCount = await prisma.message.count({
        where: {
          OR: [{ senderId: user.userId }, { receiverId: user.userId }],
          encryptedContent: { not: null },
        },
      });

      // A key must never be silently replaced after encrypted messages exist.
      if (encryptedMessageCount > 0) {
        return NextResponse.json(
          { error: "Encryption key is on another device" },
          { status: 409 },
        );
      }
    }

    await prisma.user.update({
      where: { id: user.userId },
      data: { publicKey },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to activate encryption key", error);
    return NextResponse.json({ error: "Unable to activate encryption" }, { status: 500 });
  }
}
