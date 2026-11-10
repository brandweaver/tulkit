// Core domain types for the Invoice/Quote Maker app

export type DocumentType = "invoice" | "quote";
export type DocumentStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  // Optional per-line discount as percentage (0-100)
  discountPercent?: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string; // E.164-ish, e.g. +27821234567
  company?: string;
  address?: string;
  vatNumber?: string;
}

export interface BusinessProfile {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  swift?: string;
  logoDataUrl?: string; // base64 image
  accentColor: string; // hex
  currency: string; // ISO code, e.g. ZAR, USD
  currencySymbol: string;
  // Sequential numbering prefixes
  invoicePrefix: string;
  quotePrefix: string;
  nextInvoiceNumber: number;
  nextQuoteNumber: number;
  defaultTaxRate: number; // %
  defaultPaymentTerms: string; // e.g. "Payment due within 7 days"
}

export interface InvoiceDocument {
  id: string;
  type: DocumentType;
  number: string; // INV-0001 / QUO-0001
  status: DocumentStatus;
  clientId: string;
  clientSnapshot: Client; // capture at creation so historical invoices stay accurate
  issueDate: string; // ISO yyyy-mm-dd
  dueDate: string;
  items: LineItem[];
  taxRate: number; // %
  globalDiscountPercent: number; // %
  notes?: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface AppData {
  business: BusinessProfile;
  clients: Client[];
  documents: InvoiceDocument[];
}
