import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  if (!getUserFromRequest(req as any)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      avatar: true,
      devices: {
        where: { approved: true },
        select: { id: true, publicKey: true, name: true },
      },
    },
  });

  return NextResponse.json(users);
}
