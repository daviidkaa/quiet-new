import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const currentUser = getUserFromRequest(req as any);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUser.userId },
    },
    select: {
      id: true,
      username: true,
      createdAt: true,
      avatar: true,
      devices: {
        where: { approved: true },
        select: { id: true, publicKey: true, name: true },
      },
      followers: {
        where: {
          followerId: currentUser.userId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return NextResponse.json(
    users.map(({ followers, ...user }) => ({
      ...user,
      isFollowing: followers.length > 0,
    })),
  );
}
