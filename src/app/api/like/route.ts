import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    const decoded: any = jwt.verify(token, SECRET);

    const body = await req.json();

    const existingLike = await prisma.like.findFirst({
      where: {
        userId: decoded.userId,
        postId: body.postId,
      },
    });

    // UNLIKE
    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      return NextResponse.json({
        liked: false,
      });
    }

    // CREATE LIKE
    await prisma.like.create({
      data: {
        userId: decoded.userId,
        postId: body.postId,
      },
    });

    // GET POST OWNER
    const post = await prisma.post.findUnique({
      where: {
        id: body.postId,
      },
    });

    // CREATE NOTIFICATION
    if (post && post.userId !== decoded.userId) {
      await prisma.notification.create({
        data: {
          type: "like",
          userId: post.userId,
          actorId: decoded.userId,
        },
      });
    }

    return NextResponse.json({
      liked: true,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
