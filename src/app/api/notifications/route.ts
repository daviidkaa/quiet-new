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

    const notifications = await prisma.notification.findMany({
      where: {
        userId: decoded.userId,
      },

      include: {
        actor: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    });

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
