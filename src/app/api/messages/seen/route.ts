import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const user = getUserFromRequest(req as any);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  await prisma.message.updateMany({
    where: {
      senderId: userId,
      receiverId: user.userId,
      seen: false,
    },
    data: {
      seen: true,
    },
  });

  return NextResponse.json({ success: true });
}