import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req as any);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: user.userId }, { receiverId: user.userId }],
      },
      select: {
        senderId: true,
        receiverId: true,
        encryptedContent: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            devices: { where: { approved: true }, select: { id: true, publicKey: true, name: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            devices: { where: { approved: true }, select: { id: true, publicKey: true, name: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const conversationsMap = new Map();

    for (const msg of messages) {
      const otherUser = msg.senderId === user.userId ? msg.receiver : msg.sender;

      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          user: otherUser,
          // Do not return ciphertext as a preview; the server must not decrypt it.
          lastMessage: msg.encryptedContent ? "Encrypted message" : "Legacy message",
          createdAt: msg.createdAt,
        });
      }
    }

    return NextResponse.json(Array.from(conversationsMap.values()));
  } catch (error) {
    console.error("Failed to load conversations", error);
    return NextResponse.json(
      { error: "Unable to load conversations" },
      { status: 500 },
    );
  }
}
