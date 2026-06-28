import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await db.insert(users).values({ email, password: hashedPassword });
    
    return NextResponse.json({ success: true, message: `User created. Tell them to login with password: ${defaultPassword}` });
  } catch (err) {
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}
