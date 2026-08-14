import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const user = getUserFromRequest(req as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deviceId } = await context.params;
  const { approverDeviceId } = await req.json();
  const approver = await prisma.device.findFirst({
    where: { id: approverDeviceId, userId: user.userId, approved: true },
  });
  const pendingDevice = await prisma.device.findFirst({
    where: { id: deviceId, userId: user.userId, approved: false },
  });

  if (!approver || !pendingDevice) {
    return NextResponse.json({ error: "Invalid device approval" }, { status: 400 });
  }

  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { approved: true, approvedAt: new Date(), linkCode: null },
  });
  return NextResponse.json(device);
}
