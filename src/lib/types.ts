// Core domain types for the Tulkit multi-user SaaS app

export type DocumentType = "invoice" | "quote";
export type DocumentStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "converted";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  vatNumber?: string;
}

export type UserRole = "admin" | "user";
export type SubscriptionStatus = "none" | "active" | "expired";

// All monetizable features. Free users have NONE of these.
// When a user has an active subscription, they get access to allocated features.
export const FEATURE_KEYS = [
  "pdf_download",
  "whatsapp_share",
  "email_share",
  "custom_branding",
  "banking_details",
  "unlimited_documents",
  "unlimited_clients",
  "convert_quote_to_invoice",
  "no_watermark",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  pdf_download: "Download PDF",
  whatsapp_share: "Share via WhatsApp",
  email_share: "Share via Email",
  custom_branding: "Custom logo & branding",
  banking_details: "Banking details on invoices",
  unlimited_documents: "Unlimited documents",
  unlimited_clients: "Unlimited clients",
  convert_quote_to_invoice: "Convert quotes to invoices",
  no_watermark: "Remove watermark",
};

// Free tier limits
export const FREE_TIER_LIMITS = {
  maxDocuments: 3,
  maxClients: 3,
} as const;

export interface BusinessProfile {
  // Business details
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  swift?: string;
  logoDataUrl?: string;
  accentColor: string;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  quotePrefix: string;
  nextInvoiceNumber: number;
  nextQuoteNumber: number;
  defaultTaxRate: number;
  defaultPaymentTerms: string;

  // Role + subscription
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string; // ISO
  subscriptionActivatedAt?: string; // ISO
  allocatedFeatures: FeatureKey[]; // empty = free tier
}

export interface InvoiceDocument {
  id: string;
  type: DocumentType;
  number: string;
  status: DocumentStatus;
  clientId: string;
  clientSnapshot: Client;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  taxRate: number;
  globalDiscountPercent: number;
  notes?: string;
  paymentTerms?: string;
  convertedFromId?: string;
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

// Auth user (returned by /api/auth/me)
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  allocatedFeatures: FeatureKey[];
}
