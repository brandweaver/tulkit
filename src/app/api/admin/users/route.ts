import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/types";
import { daysRemaining } from "@/lib/features";

// GET /api/admin/users — list all users (admin only)
export async function GET() {
  await requireAdmin();

  const profiles = await db.businessProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      role: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      subscriptionActivatedAt: true,
      allocatedFeatures: true,
      createdAt: true,
    },
  });

  const users = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    email: p.email,
    role: p.role,
    subscriptionStatus: p.subscriptionStatus,
    subscriptionExpiresAt: p.subscriptionExpiresAt?.toISOString(),
    subscriptionActivatedAt: p.subscriptionActivatedAt?.toISOString(),
    allocatedFeatures: p.allocatedFeatures
      ? p.allocatedFeatures.split(",").filter((f) =>
          FEATURE_KEYS.includes(f as (typeof FEATURE_KEYS)[number]),
        )
      : [],
    daysRemaining: daysRemaining(p.subscriptionExpiresAt?.toISOString()),
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ users });
}
