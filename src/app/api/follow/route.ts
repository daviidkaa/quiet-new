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

    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: decoded.userId,
        followingId: body.followingId,
      },
    });

    // UNFOLLOW
    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          id: existingFollow.id,
        },
      });

      return NextResponse.json({
        following: false,
      });
    }

    // FOLLOW
    await prisma.follow.create({
      data: {
        followerId: decoded.userId,
        followingId: body.followingId,
      },
    });

    // CREATE NOTIFICATION
    if (body.followingId !== decoded.userId) {
      await prisma.notification.create({
        data: {
          type: "follow",
          userId: body.followingId,
          actorId: decoded.userId,
        },
      });
    }

    return NextResponse.json({
      following: true,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
