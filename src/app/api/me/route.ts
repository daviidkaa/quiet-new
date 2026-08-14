import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    const decoded: any = jwt.verify(token, SECRET);

    await prisma.user.update({
      where: {
        id: decoded.userId,
      },
      data: {
        lastActive: new Date(),
      },
    });
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        lastActive: true,
        role: true,
        publicKey: true,
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
