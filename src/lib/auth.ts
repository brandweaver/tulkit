import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { BusinessProfile } from "@prisma/client";
import { isSubscriptionExpired } from "@/lib/features";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  allocatedFeatures: string[];
}

// Returns the current authenticated user, or null.
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the user's profile to check role + subscription
    const profile = await ensureBusinessProfile(user.id);

    // Server-side subscription expiry check
    let status = profile.subscriptionStatus;
    if (status === "active" && isSubscriptionExpired(profile.subscriptionExpiresAt ?? undefined)) {
      await db.businessProfile.update({
        where: { userId: user.id },
        data: { subscriptionStatus: "expired" },
      });
      status = "expired";
    }

    return {
      id: user.id,
      email: user.email ?? "",
      role: profile.role,
      subscriptionStatus: status,
      subscriptionExpiresAt: profile.subscriptionExpiresAt?.toISOString() ?? undefined,
      allocatedFeatures: profile.allocatedFeatures
        ? profile.allocatedFeatures.split(",").filter(Boolean)
        : [],
    };
  } catch (e) {
    // If Supabase is unreachable, env vars are missing, or session is invalid,
    // treat as unauthenticated. The user will see the login screen.
    console.error("Auth check failed:", e);
    return null;
  }
}

// Returns the current user, or null if not authenticated.
// Callers MUST check for null and return a 401 response.
export async function requireAuth(): Promise<SessionUser | null> {
  return await getCurrentUser();
}

// Returns the current admin user, or null if not authenticated / not admin.
// Callers MUST check for null and return a 401 or 403 response.
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "admin") return null;
  return user;
}

// Ensures the user has a BusinessProfile row (creates default if missing).
// Also: if this is the FIRST user ever, makes them admin.
export async function ensureBusinessProfile(
  userId: string,
): Promise<BusinessProfile> {
  const existing = await db.businessProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  // Check if this is the first user (admin auto-assign)
  const userCount = await db.businessProfile.count();
  const role = userCount === 0 ? "admin" : "user";

  return await db.businessProfile.create({
    data: { userId, role },
  });
}
