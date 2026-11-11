import { NextResponse } from "next/server";
import { getCurrentUser, ensureBusinessProfile } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  await ensureBusinessProfile(user.id);
  return NextResponse.json({ user }, { status: 200 });
}
