import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeClient } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

// PUT /api/clients/[id] — update a client (must be owned by current user)
export async function PUT(request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await db.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.client.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      company: body.company ?? existing.company,
      address: body.address ?? existing.address,
      vatNumber: body.vatNumber ?? existing.vatNumber,
    },
  });

  return NextResponse.json(serializeClient(updated));
}

// DELETE /api/clients/[id] — delete a client (must be owned by current user)
export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;

  const existing = await db.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
