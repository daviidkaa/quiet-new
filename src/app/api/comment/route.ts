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

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Empty comment" }, { status: 400 });
    }

    // CREATE COMMENT
    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        userId: decoded.userId,
        postId: body.postId,
      },
      include: {
        user: true,
      },
    });

    // GET POST
    const post = await prisma.post.findUnique({
      where: {
        id: body.postId,
      },
    });

    // CREATE NOTIFICATION
    if (post && post.userId !== decoded.userId) {
      await prisma.notification.create({
        data: {
          type: "comment",
          userId: post.userId,
          actorId: decoded.userId,
        },
      });
    }

    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
