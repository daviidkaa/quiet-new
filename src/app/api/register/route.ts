import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, email, password, inviteCode, publicKey } =
      await req.json();

    // VALIDATION
    if (!username || !email || !password || !inviteCode || !publicKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // EMAIL VALIDATION
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // USERNAME LENGTH
    if (username.length < 3) {
      return NextResponse.json(
        {
          error: "Username too short",
        },
        { status: 400 },
      );
    }

    // PASSWORD LENGTH
    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password too short",
        },
        { status: 400 },
      );
    }

    // CHECK USERNAME
    const existingUser = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Username already exists",
        },
        { status: 400 },
      );
    }

    // CHECK EMAIL
    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          error: "Email already used",
        },
        { status: 400 },
      );
    }

    // CHECK INVITE
    const invite = await prisma.inviteCode.findUnique({
      where: {
        code: inviteCode,
      },
    });

    if (!invite) {
      return NextResponse.json(
        {
          error: "Invalid invite code",
        },
        { status: 400 },
      );
    }

    // USED INVITE
    if (invite.used && !invite.reusable) {
      return NextResponse.json(
        {
          error: "Invite already used",
        },
        { status: 400 },
      );
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        publicKey,
      },
    });

    // MARK INVITE USED
    if (!invite.reusable) {
      await prisma.inviteCode.update({
        where: {
          id: invite.id,
        },

        data: {
          used: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
