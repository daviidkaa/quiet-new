import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const user = getUserFromRequest(req as any);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ✅ unwrap async params
  const { userId } = await context.params;

  const otherUserId = Number(userId);
  const deviceId = req.headers.get("x-device-id");

  if (isNaN(otherUserId)) {
    return NextResponse.json(
      { error: "Invalid userId" },
      { status: 400 }
    );
  }

  if (!deviceId) {
    return NextResponse.json({ error: "Missing device" }, { status: 400 });
  }

  const device = await prisma.device.findFirst({
    where: { id: deviceId, userId: user.userId, approved: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Unapproved device" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        {
          senderId: user.userId,
          receiverId: otherUserId,
        },
        {
          senderId: otherUserId,
          receiverId: user.userId,
        },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      keyEnvelopes: {
        where: { deviceId },
        select: { encryptedKey: true },
      },
    },
  });

  return NextResponse.json(messages);
}
