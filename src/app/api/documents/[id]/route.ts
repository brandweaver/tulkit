import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { serializeDoc } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/[id] — fetch a single document with items
export async function GET(_request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;
  const doc = await db.invoiceDocument.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeDoc(doc));
}

// PUT /api/documents/[id] — update document fields + items
export async function PUT(request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify ownership
  const existing = await db.invoiceDocument.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update scalar fields
  const allowedFields = [
    "type", "number", "status", "issueDate", "dueDate",
    "taxRate", "globalDiscountPercent", "notes", "paymentTerms",
    "clientName", "clientEmail", "clientPhone", "clientCompany",
    "clientAddress", "clientVatNumber",
  ];
  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  // Handle status timestamps
  if (body.status === "sent" && !existing.sentAt) {
    data.sentAt = new Date().toISOString();
  }
  if (body.status === "paid") {
    data.paidAt = new Date().toISOString();
  }

  // Update client if changed
  if (body.clientId && body.clientId !== existing.clientId) {
    const newClient = await db.client.findFirst({
      where: { id: body.clientId, userId: user.id },
    });
    if (newClient) {
      data.clientId = newClient.id;
      data.clientName = newClient.name;
      data.clientEmail = newClient.email;
      data.clientPhone = newClient.phone;
      data.clientCompany = newClient.company;
      data.clientAddress = newClient.address;
      data.clientVatNumber = newClient.vatNumber;
    }
  }

  // Handle items update if provided
  if (Array.isArray(body.items)) {
    // Replace all items — simplest correct approach
    await db.lineItem.deleteMany({ where: { documentId: id } });
    if (body.items.length > 0) {
      await db.lineItem.createMany({
        data: body.items.map((it: { description?: string; quantity?: number; unitPrice?: number; discountPercent?: number }) => ({
          id: uuid(),
          documentId: id,
          description: it.description ?? "",
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice ?? 0,
          discountPercent: it.discountPercent ?? 0,
        })),
      });
    } else {
      // Ensure at least one empty item
      await db.lineItem.create({
        data: {
          id: uuid(),
          documentId: id,
          description: "",
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
        },
      });
    }
  }

  const updated = await db.invoiceDocument.update({
    where: { id },
    data,
    include: { items: true },
  });

  return NextResponse.json(serializeDoc(updated));
}

// DELETE /api/documents/[id] — delete a document
export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;

  const existing = await db.invoiceDocument.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.invoiceDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
