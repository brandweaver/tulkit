import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { BusinessProfile } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
}

// Returns the current authenticated user, or null.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

// Throws 401 if not authenticated. Returns the user otherwise.
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// Ensures the user has a BusinessProfile row (creates default if missing).
// Returns the profile.
export async function ensureBusinessProfile(
  userId: string,
): Promise<BusinessProfile> {
  const existing = await db.businessProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  return await db.businessProfile.create({
    data: { userId },
  });
}
