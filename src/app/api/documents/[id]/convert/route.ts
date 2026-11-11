import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeDoc } from "@/lib/serialize";
import { todayISO, addDaysISO } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

// POST /api/documents/[id]/convert — convert a quote into an invoice
export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;

  // Find the quote
  const quote = await db.invoiceDocument.findFirst({
    where: { id, userId: user.id, type: "quote" },
    include: { items: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status === "converted") {
    return NextResponse.json(
      { error: "Quote has already been converted" },
      { status: 400 },
    );
  }

  // Get the business profile to generate a new invoice number
  const business = await db.businessProfile.findUnique({
    where: { userId: user.id },
  });
  if (!business) {
    return NextResponse.json({ error: "Business profile not found" }, { status: 500 });
  }

  const num = business.nextInvoiceNumber;
  const number = `${business.invoicePrefix}-${String(num).padStart(4, "0")}`;

  // Create the invoice as a copy of the quote
  const now = new Date().toISOString();
  const invoice = await db.invoiceDocument.create({
    data: {
      userId: user.id,
      clientId: quote.clientId,
      type: "invoice",
      number,
      status: "draft",
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientPhone: quote.clientPhone,
      clientCompany: quote.clientCompany,
      clientAddress: quote.clientAddress,
      clientVatNumber: quote.clientVatNumber,
      issueDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 7),
      taxRate: quote.taxRate,
      globalDiscountPercent: quote.globalDiscountPercent,
      notes: "Thank you for your business.",
      paymentTerms: quote.paymentTerms,
      convertedFromId: quote.id,
      createdAt: now,
      updatedAt: now,
      items: {
        create: quote.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
        })),
      },
    },
    include: { items: true },
  });

  // Advance invoice counter
  await db.businessProfile.update({
    where: { userId: user.id },
    data: { nextInvoiceNumber: { increment: 1 } },
  });

  // Mark the quote as converted
  await db.invoiceDocument.update({
    where: { id: quote.id },
    data: { status: "converted", updatedAt: now },
  });

  return NextResponse.json(serializeDoc(invoice), { status: 201 });
}
