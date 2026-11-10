import type {
  BusinessProfile as PrismaBusiness,
  Client as PrismaClient,
  InvoiceDocument as PrismaDoc,
  LineItem as PrismaLineItem,
} from "@prisma/client";
import type {
  BusinessProfile,
  Client,
  InvoiceDocument,
  LineItem,
} from "./types";

// Convert Prisma BusinessProfile to the front-end type
export function serializeBusiness(b: PrismaBusiness): BusinessProfile {
  return {
    name: b.name,
    email: b.email ?? undefined,
    phone: b.phone ?? undefined,
    address: b.address ?? undefined,
    vatNumber: b.vatNumber ?? undefined,
    bankName: b.bankName ?? undefined,
    bankAccount: b.bankAccount ?? undefined,
    bankBranch: b.bankBranch ?? undefined,
    swift: b.swift ?? undefined,
    logoDataUrl: b.logoDataUrl ?? undefined,
    accentColor: b.accentColor,
    currency: b.currency,
    currencySymbol: b.currencySymbol,
    invoicePrefix: b.invoicePrefix,
    quotePrefix: b.quotePrefix,
    nextInvoiceNumber: b.nextInvoiceNumber,
    nextQuoteNumber: b.nextQuoteNumber,
    defaultTaxRate: b.defaultTaxRate,
    defaultPaymentTerms: b.defaultPaymentTerms,
  };
}

export function serializeClient(c: PrismaClient): Client {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    company: c.company ?? undefined,
    address: c.address ?? undefined,
    vatNumber: c.vatNumber ?? undefined,
  };
}

// Convert a Prisma InvoiceDocument (with items) to the front-end type.
// We reconstruct a `clientSnapshot` object from the flat client fields stored on the doc.
export function serializeDoc(
  doc: PrismaDoc & { items: PrismaLineItem[] },
): InvoiceDocument {
  return {
    id: doc.id,
    type: doc.type as InvoiceDocument["type"],
    number: doc.number,
    status: doc.status as InvoiceDocument["status"],
    clientId: doc.clientId,
    clientSnapshot: {
      id: doc.clientId,
      name: doc.clientName,
      email: doc.clientEmail ?? undefined,
      phone: doc.clientPhone ?? undefined,
      company: doc.clientCompany ?? undefined,
      address: doc.clientAddress ?? undefined,
      vatNumber: doc.clientVatNumber ?? undefined,
    },
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    items: doc.items.map(serializeLineItem),
    taxRate: doc.taxRate,
    globalDiscountPercent: doc.globalDiscountPercent,
    notes: doc.notes ?? undefined,
    paymentTerms: doc.paymentTerms ?? undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    sentAt: doc.sentAt?.toISOString(),
    paidAt: doc.paidAt?.toISOString(),
  };
}

export function serializeLineItem(it: PrismaLineItem): LineItem {
  return {
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountPercent: it.discountPercent,
  };
}
