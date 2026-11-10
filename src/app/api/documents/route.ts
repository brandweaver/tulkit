import { NextResponse } from "next/server";
import { requireAuth, ensureBusinessProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { todayISO, addDaysISO } from "@/lib/format";
import { serializeDoc } from "@/lib/serialize";

// GET /api/documents — list all documents for current user
export async function GET() {
  const user = await requireAuth();
  const documents = await db.invoiceDocument.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documents.map(serializeDoc));
}

// POST /api/documents — create a new document
export async function POST(request: Request) {
  const user = await requireAuth();
  const body = await request.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: "Type is required" }, { status: 400 });
  }

  const type = body.type as "invoice" | "quote";
  const business = await ensureBusinessProfile(user.id);

  // Resolve the client (must be owned by the user)
  let clientId: string | undefined = body.clientId;
  let clientData: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    vatNumber: string | null;
  };

  if (clientId) {
    const client = await db.client.findFirst({
      where: { id: clientId, userId: user.id },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    clientData = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      address: client.address,
      vatNumber: client.vatNumber,
    };
  } else {
    // No client selected — use a default empty client
    clientData = {
      name: "New Client",
      email: null,
      phone: null,
      company: null,
      address: null,
      vatNumber: null,
    };
    // Create the client row
    const newClient = await db.client.create({
      data: { userId: user.id, ...clientData },
    });
    clientId = newClient.id;
  }

  // Generate sequential number
  const num =
    type === "invoice"
      ? business.nextInvoiceNumber
      : business.nextQuoteNumber;
  const prefix =
    type === "invoice" ? business.invoicePrefix : business.quotePrefix;
  const number = `${prefix}-${String(num).padStart(4, "0")}`;

  // Advance the counter
  if (type === "invoice") {
    await db.businessProfile.update({
      where: { userId: user.id },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
  } else {
    await db.businessProfile.update({
      where: { userId: user.id },
      data: { nextQuoteNumber: { increment: 1 } },
    });
  }

  const now = new Date().toISOString();
  const doc = await db.invoiceDocument.create({
    data: {
      userId: user.id,
      clientId: clientId!,
      type,
      number,
      status: "draft",
      clientName: clientData.name,
      clientEmail: clientData.email,
      clientPhone: clientData.phone,
      clientCompany: clientData.company,
      clientAddress: clientData.address,
      clientVatNumber: clientData.vatNumber,
      issueDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 7),
      taxRate: business.defaultTaxRate,
      globalDiscountPercent: 0,
      notes: type === "invoice" ? "Thank you for your business." : null,
      paymentTerms: business.defaultPaymentTerms,
      createdAt: now,
      updatedAt: now,
      items: {
        create: [
          {
            id: uuid(),
            description: "",
            quantity: 1,
            unitPrice: 0,
            discountPercent: 0,
          },
        ],
      },
    },
    include: { items: true },
  });

  return NextResponse.json(serializeDoc(doc), { status: 201 });
}
