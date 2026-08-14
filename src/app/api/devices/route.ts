import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      publicKey: true,
      name: true,
      approved: true,
      linkCode: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req as any);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { deviceId, publicKey, name } = await req.json();
    if (
      typeof deviceId !== "string" ||
      deviceId.length < 16 ||
      typeof publicKey !== "string" ||
      publicKey.length < 128 ||
      publicKey.length > 8192
    ) {
      return NextResponse.json({ error: "Invalid device key" }, { status: 400 });
    }

    const existing = await prisma.device.findUnique({ where: { id: deviceId } });
    if (existing) {
      if (existing.userId !== user.userId || existing.publicKey !== publicKey) {
        return NextResponse.json({ error: "Device key mismatch" }, { status: 409 });
      }
      return NextResponse.json(existing);
    }

    const approvedCount = await prisma.device.count({
      where: { userId: user.userId, approved: true },
    });
    const approved = approvedCount === 0;
    const device = await prisma.device.create({
      data: {
        id: deviceId,
        userId: user.userId,
        publicKey,
        name: typeof name === "string" && name.length <= 80 ? name : "Browser",
        approved,
        approvedAt: approved ? new Date() : null,
        linkCode: approved ? null : crypto.randomUUID(),
      },
    });

    return NextResponse.json(device, { status: approved ? 201 : 202 });
  } catch (error) {
    console.error("Failed to register device", error);
    return NextResponse.json({ error: "Unable to register device" }, { status: 500 });
  }
}
