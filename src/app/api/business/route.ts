import { NextResponse } from "next/server";
import { requireAuth, ensureBusinessProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBusiness } from "@/lib/serialize";

// GET /api/business — current user's business profile
export async function GET() {
  const user = await requireAuth();
  const profile = await ensureBusinessProfile(user.id);
  return NextResponse.json(serializeBusiness(profile));
}

// PUT /api/business — update business profile
export async function PUT(request: Request) {
  const user = await requireAuth();
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Only allow these fields to be updated
  const allowedFields = [
    "name", "email", "phone", "address", "vatNumber",
    "bankName", "bankAccount", "bankBranch", "swift",
    "logoDataUrl", "accentColor", "currency", "currencySymbol",
    "invoicePrefix", "quotePrefix", "nextInvoiceNumber", "nextQuoteNumber",
    "defaultTaxRate", "defaultPaymentTerms",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  const updated = await db.businessProfile.update({
    where: { userId: user.id },
    data,
  });

  return NextResponse.json(serializeBusiness(updated));
}
