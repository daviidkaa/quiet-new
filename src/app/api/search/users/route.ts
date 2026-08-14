import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
        },
      },

      select: {
        id: true,
        username: true,
        avatar: true,
      },

      take: 8,
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
