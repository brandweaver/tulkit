import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/users/[id]/subscribe — mark a user as paid for 30 days
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();

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

  const profile = await db.businessProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();

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
