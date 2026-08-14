import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "QUIET-";

  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

async function authorize(req: Request) {
  const auth = req.headers.get("authorization");

  if (!auth) {
    return null;
  }

  const token = auth.split(" ")[1];

  const decoded: any = jwt.verify(token, SECRET);

  const currentUser = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
    },
  });

  if (currentUser?.role !== "developer") {
    return null;
  }

  return currentUser;
}

// GET INVITES
export async function GET(req: Request) {
  try {
    const authorized = await authorize(req);

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.inviteCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invites);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// CREATE INVITE
export async function POST(req: Request) {
  try {
    const authorized = await authorize(req);

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const invite = await prisma.inviteCode.create({
      data: {
        code: generateCode(),
        reusable: body.reusable || false,
      },
    });

    return NextResponse.json(invite);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE INVITE
export async function DELETE(req: Request) {
  try {
    const authorized = await authorize(req);

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.inviteCode.delete({
      where: {
        id: Number(id),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
