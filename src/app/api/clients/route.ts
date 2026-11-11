import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeClient } from "@/lib/serialize";
import { can } from "@/lib/features";
import { FREE_TIER_LIMITS } from "@/lib/types";

// GET /api/clients — list all clients for current user
export async function GET() {
  const user = await requireAuth();
  const clients = await db.client.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients.map(serializeClient));
}

// POST /api/clients — create a new client
export async function POST(request: Request) {
  const user = await requireAuth();
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Check client limit for free users
  const currentClientCount = await db.client.count({
    where: { userId: user.id },
  });
  const userCanCreate = can(
    { role: user.role, subscriptionStatus: user.subscriptionStatus, allocatedFeatures: user.allocatedFeatures as never },
    "unlimited_clients",
  );
  if (!userCanCreate && currentClientCount >= FREE_TIER_LIMITS.maxClients) {
    return NextResponse.json(
      {
        error: "Free tier limit reached",
        code: "FREE_TIER_LIMIT",
        limit: FREE_TIER_LIMITS.maxClients,
        message: `Free users can save up to ${FREE_TIER_LIMITS.maxClients} clients. Upgrade to Pro for unlimited.`,
      },
      { status: 403 },
    );
  }

  const client = await db.client.create({
    data: {
      userId: user.id,
      name: String(body.name),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      company: body.company ? String(body.company) : null,
      address: body.address ? String(body.address) : null,
      vatNumber: body.vatNumber ? String(body.vatNumber) : null,
    },
  });

  return NextResponse.json(serializeClient(client), { status: 201 });
}
