import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/stats — dashboard stats for admin
export async function GET() {
  await requireAdmin();

  const totalUsers = await db.businessProfile.count();
  const activeSubscriptions = await db.businessProfile.count({
    where: { subscriptionStatus: "active" },
  });
  const expiredSubscriptions = await db.businessProfile.count({
    where: { subscriptionStatus: "expired" },
  });
  const freeUsers = await db.businessProfile.count({
    where: { subscriptionStatus: "none" },
  });
  const totalDocuments = await db.invoiceDocument.count();
  const totalClients = await db.client.count();

  // Count users with active subs created in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentActivations = await db.businessProfile.count({
    where: {
      subscriptionStatus: "active",
      subscriptionActivatedAt: { gte: thirtyDaysAgo },
    },
  });

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    expiredSubscriptions,
    freeUsers,
    totalDocuments,
    totalClients,
    recentActivations,
    // Revenue estimate (R99 per active sub)
    estimatedMonthlyRevenue: activeSubscriptions * 99,
  });
}
