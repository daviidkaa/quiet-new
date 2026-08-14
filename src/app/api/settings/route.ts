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

    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: decoded.userId,
        },
        data: {
          username: body.username,
          bio: body.bio,
          avatar: body.avatar,
        },
      });

      return NextResponse.json(updatedUser);
    } catch (error: any) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 },
        );
      }

      throw error;
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
