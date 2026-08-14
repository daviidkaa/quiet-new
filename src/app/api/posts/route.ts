import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req as any);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // get who user follows
  const following = await prisma.follow.findMany({
    where: {
      followerId: user.userId,
    },

    select: {
      followingId: true,
    },
  });

  const followingIds = following.map((f) => f.followingId);

  // include yourself
  followingIds.push(user.userId);

  // fetch posts only from those users
  const posts = await prisma.post.findMany({
    where: {
      userId: {
        in: followingIds,
      },
    },
    include: {
      user: true,

      likes: {
        select: {
          userId: true,
        },
      },

      comments: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },

      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req as any);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if ((!body?.content || !body.content.trim()) && !body?.image) {
    return NextResponse.json(
      { error: "Post cannot be empty" },
      { status: 400 },
    );
  }

  const post = await prisma.post.create({
    data: {
      content: body.content,
      image: body.image,
      userId: user.userId,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
