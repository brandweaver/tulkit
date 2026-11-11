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
    // Subscription has expired — update in DB
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

// Throws 403 if not admin. Returns the admin user otherwise.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// Check feature access for a user. Throws 403 if not allowed.
export async function requireFeature(feature: string): Promise<SessionUser> {
  const user = await requireAuth();

  // Admin has everything
  if (user.role === "admin") return user;

  // Free users with no active subscription have no paid features
  if (user.subscriptionStatus !== "active") {
    throw new Response(
      JSON.stringify({ error: "Subscription required", feature, code: "SUBSCRIPTION_REQUIRED" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // Check if feature is allocated
  if (!user.allocatedFeatures.includes(feature)) {
    throw new Response(
      JSON.stringify({ error: "Feature not allocated", feature, code: "FEATURE_NOT_ALLOCATED" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

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
