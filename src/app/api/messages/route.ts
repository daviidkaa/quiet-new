import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req as any);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { encryptedContent, iv, receiverId, imageUrl, keyEnvelopes } =
      await req.json();

    if (
      typeof encryptedContent !== "string" ||
      typeof iv !== "string" ||
      !Number.isInteger(receiverId) ||
      receiverId === user.userId ||
      !Array.isArray(keyEnvelopes) ||
      keyEnvelopes.length === 0 ||
      keyEnvelopes.some(
        (envelope) =>
          typeof envelope?.deviceId !== "string" ||
          typeof envelope?.encryptedKey !== "string",
      )
    ) {
      return NextResponse.json({ error: "Invalid encrypted message" }, { status: 400 });
    }

    const approvedDevices = await prisma.device.findMany({
      where: {
        approved: true,
        userId: { in: [user.userId, receiverId] },
      },
      select: { id: true },
    });
    const approvedDeviceIds = new Set(approvedDevices.map((device) => device.id));
    const envelopeDeviceIds = new Set(keyEnvelopes.map((envelope) => envelope.deviceId));
    if (
      envelopeDeviceIds.size !== approvedDeviceIds.size ||
      [...approvedDeviceIds].some((id) => !envelopeDeviceIds.has(id))
    ) {
      return NextResponse.json({ error: "Device list changed; refresh and try again" }, { status: 409 });
    }

    const message = await prisma.message.create({
      data: {
        encryptedContent,
        iv,
        imageUrl: typeof imageUrl === "string" ? imageUrl : null,
        senderId: user.userId,
        receiverId,
        keyEnvelopes: {
          create: keyEnvelopes.map((envelope) => ({
            deviceId: envelope.deviceId,
            encryptedKey: envelope.encryptedKey,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Failed to save encrypted message", error);
    return NextResponse.json({ error: "Unable to save message" }, { status: 500 });
  }
}
