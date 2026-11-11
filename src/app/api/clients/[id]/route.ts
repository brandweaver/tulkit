import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeClient } from "@/lib/serialize";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type Params = { params: Promise<{ id: string }> };

// PUT /api/clients/[id] — update a client (must be owned by current user)
export async function PUT(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Validate name is non-empty if provided
  if (body.name !== undefined && (!body.name || !String(body.name).trim())) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
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
// Returns 409 if the client has linked documents (use ?force=true to override)
export async function DELETE(request: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await db.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check for linked documents
  const docCount = await db.invoiceDocument.count({
    where: { clientId: id },
  });

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  if (docCount > 0 && !force) {
    return NextResponse.json(
      {
        error: "Client has linked documents",
        code: "HAS_DOCUMENTS",
        docCount,
        message: `This client has ${docCount} document(s). Deleting will also delete all linked invoices/quotes. Add ?force=true to confirm.`,
      },
      { status: 409 },
    );
  }

  // Cascade delete will remove all linked documents
  await db.client.delete({ where: { id } });
  return NextResponse.json({ success: true, deletedDocs: docCount });
}
