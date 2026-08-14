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

    await prisma.notification.updateMany({
      where: {
        userId: decoded.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
