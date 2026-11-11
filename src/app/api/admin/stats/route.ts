import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

// GET /api/admin/stats — dashboard stats for admin
export async function GET() {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

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
    estimatedMonthlyRevenue: activeSubscriptions * 99,
  });
}
