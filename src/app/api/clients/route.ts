import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeClient } from "@/lib/serialize";

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
