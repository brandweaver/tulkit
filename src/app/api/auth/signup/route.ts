import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Create a BusinessProfile for the new user
  // ensureBusinessProfile handles admin auto-assign for first user
  if (data.user) {
    try {
      const userCount = await db.businessProfile.count();
      const role = userCount === 0 ? "admin" : "user";
      await db.businessProfile.create({
        data: { userId: data.user.id, role },
      });
    } catch (e) {
      // Profile might already exist
      console.error("Failed to create business profile:", e);
    }
  }

  // If Supabase returned a session, email confirmation is OFF — auto-login works.
  // If no session, email confirmation is ON — user needs to check email.
  const requiresEmailConfirmation = !data.session;

  return NextResponse.json({
    user: data.user,
    requiresEmailConfirmation,
  });
}
