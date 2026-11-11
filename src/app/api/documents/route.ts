import { NextResponse } from "next/server";
import { requireAuth, ensureBusinessProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayISO, addDaysISO } from "@/lib/format";
import { serializeDoc } from "@/lib/serialize";
import { can } from "@/lib/features";
import { FREE_TIER_LIMITS } from "@/lib/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// GET /api/documents — list all documents for current user
export async function GET() {
  const user = await requireAuth();
  if (!user) return unauthorized();
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
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: "Type is required" }, { status: 400 });
  }

  const type = body.type as "invoice" | "quote";
  const business = await ensureBusinessProfile(user.id);

  // Check document limit for free users
  const currentDocCount = await db.invoiceDocument.count({
    where: { userId: user.id },
  });
  const userCanCreate = can(
    { role: user.role, subscriptionStatus: user.subscriptionStatus, allocatedFeatures: user.allocatedFeatures as never },
    "unlimited_documents",
  );
  if (!userCanCreate && currentDocCount >= FREE_TIER_LIMITS.maxDocuments) {
    return NextResponse.json(
      {
        error: "Free tier limit reached",
        code: "FREE_TIER_LIMIT",
        limit: FREE_TIER_LIMITS.maxDocuments,
        message: `Free users can create up to ${FREE_TIER_LIMITS.maxDocuments} documents. Upgrade to Pro for unlimited.`,
      },
      { status: 403 },
    );
  }

  // Resolve the client (must be owned by the user)
  // If no clientId provided, try to use the first existing client.
  // If no clients exist, return an error asking the user to create one first.
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
    // Use the specified client
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
    // No client specified — use the first existing client (if any)
    const firstClient = await db.client.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (firstClient) {
      clientId = firstClient.id;
      clientData = {
        name: firstClient.name,
        email: firstClient.email,
        phone: firstClient.phone,
        company: firstClient.company,
        address: firstClient.address,
        vatNumber: firstClient.vatNumber,
      };
    } else {
      // No clients exist — ask the user to create one first
      return NextResponse.json(
        {
          error: "Please create a client first",
          code: "NO_CLIENTS",
          message: "You need to add at least one client before creating a document.",
        },
        { status: 400 },
      );
    }
  }

  // Generate sequential number and create document in a transaction
  // This prevents duplicate numbers from concurrent requests
  const now = new Date().toISOString();
  const doc = await db.$transaction(async (tx) => {
    // Lock and read the current counter
    const biz = await tx.businessProfile.findUnique({
      where: { userId: user.id },
      select: { nextInvoiceNumber: true, nextQuoteNumber: true, invoicePrefix: true, quotePrefix: true },
    });
    if (!biz) throw new Error("Business profile not found");

    const currentNum = type === "invoice" ? biz.nextInvoiceNumber : biz.nextQuoteNumber;
    const currentPrefix = type === "invoice" ? biz.invoicePrefix : biz.quotePrefix;
    const docNumber = `${currentPrefix}-${String(currentNum).padStart(4, "0")}`;

    // Create the document
    const created = await tx.invoiceDocument.create({
      data: {
        userId: user.id,
        clientId: clientId!,
        type,
        number: docNumber,
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

    // Advance the counter
    if (type === "invoice") {
      await tx.businessProfile.update({
        where: { userId: user.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
    } else {
      await tx.businessProfile.update({
        where: { userId: user.id },
        data: { nextQuoteNumber: { increment: 1 } },
      });
    }

    return created;
  });

  return NextResponse.json(serializeDoc(doc), { status: 201 });
}
