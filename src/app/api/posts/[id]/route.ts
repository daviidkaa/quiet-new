import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.JWT_SECRET;

function getUserId(req: Request) {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;

  const decoded = jwt.verify(token, SECRET);
  if (typeof decoded === "string" || typeof decoded.userId !== "number") {
    return null;
  }

  return decoded.userId;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        likes: true,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(req);

    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isInteger(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json();
    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { content: body.content },
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(req);

    if (userId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const postId = Number(id);

    if (!Number.isInteger(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.like.deleteMany({ where: { postId } });
    await prisma.comment.deleteMany({ where: { postId } });
    await prisma.notification.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
