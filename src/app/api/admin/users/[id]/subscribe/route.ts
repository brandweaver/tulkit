import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/users/[id]/subscribe — mark a user as paid for 30 days
// Body: { durationDays: number (default 30), features?: string[] (default: all) }
export async function POST(request: Request, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const durationDays = Number(body.durationDays) || 30;
  const features = Array.isArray(body.features)
    ? body.features.filter((f: string) =>
        FEATURE_KEYS.includes(f as (typeof FEATURE_KEYS)[number]),
      )
    : [...FEATURE_KEYS];

  if (features.length === 0) {
    return NextResponse.json(
      { error: "At least one feature must be allocated" },
      { status: 400 },
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Find the profile by ID
  const profile = await db.businessProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update subscription — NO ACCUMULATION. Always starts from NOW.
  // If user had an active subscription, this REPLACES it (does not extend).
  const updated = await db.businessProfile.update({
    where: { id },
    data: {
      subscriptionStatus: "active",
      subscriptionActivatedAt: now,
      subscriptionExpiresAt: expiresAt,
      allocatedFeatures: features.join(","),
    },
  });

  return NextResponse.json({
    success: true,
    userId: profile.userId,
    subscriptionStatus: "active",
    subscriptionActivatedAt: now.toISOString(),
    subscriptionExpiresAt: expiresAt.toISOString(),
    allocatedFeatures: features,
    daysRemaining: durationDays,
  });
}

// DELETE /api/admin/users/[id]/subscribe — revoke a user's subscription
export async function DELETE(_request: Request, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const profile = await db.businessProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.businessProfile.update({
    where: { id },
    data: {
      subscriptionStatus: "expired",
      allocatedFeatures: null,
    },
  });

  return NextResponse.json({ success: true });
}
