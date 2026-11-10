import type { InvoiceDocument, LineItem, BusinessProfile } from "./types";

export function formatCurrency(amount: number, symbol = "R"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${symbol}${formatted}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Compute the line subtotal after the per-line discount.
export function lineSubtotal(item: LineItem): number {
  const gross = item.quantity * item.unitPrice;
  const disc = item.discountPercent ?? 0;
  return gross * (1 - disc / 100);
}

// Totals for a document — returns all the numbers the UI/PDF needs.
export interface DocumentTotals {
  subtotal: number;
  globalDiscountAmount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
}

export function computeTotals(doc: InvoiceDocument): DocumentTotals {
  const subtotal = doc.items.reduce((sum, it) => sum + lineSubtotal(it), 0);
  const globalDiscountAmount = subtotal * (doc.globalDiscountPercent / 100);
  const taxableBase = subtotal - globalDiscountAmount;
  const taxAmount = taxableBase * (doc.taxRate / 100);
  const total = taxableBase + taxAmount;
  return { subtotal, globalDiscountAmount, taxableBase, taxAmount, total };
}

// Pretty-print a phone number into international format for wa.me deep links.
// Strips everything except digits and a leading +, and converts SA local
// formats (0XX...) to +27XX...
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Remove spaces, dashes, parentheses
  s = s.replace(/[\s\-()]/g, "");
  // South African local format -> international
  if (s.startsWith("0")) {
    s = "+27" + s.slice(1);
  } else if (!s.startsWith("+") && /^\d{9,}$/.test(s)) {
    // bare digits, assume SA
    s = "+27" + s.replace(/^27/, "");
  }
  return s;
}

export function phoneForWa(raw: string): string {
  // wa.me wants digits only (no +)
  return normalizePhone(raw).replace(/[^\d]/g, "");
}

export const CURRENCY_OPTIONS: { code: string; symbol: string; label: string }[] = [
  { code: "ZAR", symbol: "R", label: "South African Rand (R)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (₦)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KSh)" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi (GH₵)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)" },
];

export function symbolForCurrency(code: string): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? "R";
}

export const DEFAULT_BUSINESS: BusinessProfile = {
  name: "Your Business Name",
  email: "hello@yourbusiness.co.za",
  phone: "+27 81 234 5678",
  address: "Johannesburg, South Africa",
  vatNumber: "",
  bankName: "",
  bankAccount: "",
  bankBranch: "",
  swift: "",
  logoDataUrl: undefined,
  accentColor: "#0E7C9C", // teal-blue, complements the powder blue app background
  currency: "ZAR",
  currencySymbol: "R",
  invoicePrefix: "INV",
  quotePrefix: "QUO",
  nextInvoiceNumber: 1,
  nextQuoteNumber: 1,
  defaultTaxRate: 15, // SA VAT
  defaultPaymentTerms: "Payment due within 7 days of issue date.",
};

export function statusLabel(status: InvoiceDocument["status"]): string {
  return {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    paid: "Paid",
    overdue: "Overdue",
  }[status];
}

export function statusColor(status: InvoiceDocument["status"]): string {
  return {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    viewed: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  }[status];
}
