import type { BusinessProfile, InvoiceDocument } from "./types";
import { computeTotals, formatCurrency, formatDate, phoneForWa } from "./format";

interface ShareContext {
  business: BusinessProfile;
  doc: InvoiceDocument;
}

function friendlyDocType(doc: InvoiceDocument): string {
  return doc.type === "invoice" ? "invoice" : "quote";
}

// Build a friendly, WhatsApp-style message that includes the doc number,
// amount and due date. This is what gets pre-filled into WhatsApp / email body.
export function buildShareMessage({ business, doc }: ShareContext): string {
  const totals = computeTotals(doc);
  const isInvoice = doc.type === "invoice";
  const label = isInvoice ? "Invoice" : "Quote";
  const clientName = doc.clientSnapshot.company || doc.clientSnapshot.name;

  const lines = [
    `Hi ${clientName},`,
    "",
    `Here is your ${label.toLowerCase()} ${doc.number} from ${business.name}.`,
    `Amount: ${formatCurrency(totals.total, business.currencySymbol)}`,
    isInvoice
      ? `Due: ${formatDate(doc.dueDate)}`
      : `Valid until: ${formatDate(doc.dueDate)}`,
    "",
    "Thank you for your business!",
    `- ${business.name}`,
  ];

  return lines.join("\n");
}

// Build a short subject line for email.
export function buildShareSubject({ business, doc }: ShareContext): string {
  const label = doc.type === "invoice" ? "Invoice" : "Quote";
  const totals = computeTotals(doc);
  return `${label} ${doc.number} from ${business.name} — ${formatCurrency(
    totals.total,
    business.currencySymbol,
  )}`;
}

// WhatsApp deep link using wa.me — opens WhatsApp with the message pre-filled.
// If the client has no phone number, returns the web.whatsapp.com send URL
// without a recipient (the user picks the contact in WhatsApp).
export function whatsappShareUrl({ business, doc }: ShareContext): string {
  const message = encodeURIComponent(buildShareMessage({ business, doc }));
  const phone = phoneForWa(doc.clientSnapshot.phone ?? "");
  if (phone) {
    return `https://wa.me/${phone}?text=${message}`;
  }
  // No phone — let the user pick the chat
  return `https://wa.me/?text=${message}`;
}

// Mailto URL — works without any backend or API key. Opens the user's email
// client with subject + body pre-filled. The PDF must be attached manually
// after the email client opens (browsers cannot attach files to mailto for
// security reasons). We make this very clear in the UI.
export function emailShareUrl({ business, doc }: ShareContext): string {
  const subject = encodeURIComponent(buildShareSubject({ business, doc }));
  const body = encodeURIComponent(buildShareMessage({ business, doc }));
  const to = doc.clientSnapshot.email || "";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

// Copy a plain-text summary of the invoice to the clipboard (fallback when
// WhatsApp/email clients aren't installed).
export async function copySummaryToClipboard({
  business,
  doc,
}: ShareContext): Promise<void> {
  const totals = computeTotals(doc);
  const isInvoice = doc.type === "invoice";
  const client = doc.clientSnapshot;

  const lines = [
    `${isInvoice ? "INVOICE" : "QUOTE"}: ${doc.number}`,
    `From: ${business.name}`,
    `To: ${client.company || client.name}`,
    `Date: ${formatDate(doc.issueDate)}`,
    isInvoice ? `Due: ${formatDate(doc.dueDate)}` : `Valid until: ${formatDate(doc.dueDate)}`,
    "",
    "Items:",
    ...doc.items.map((it) => {
      const gross = it.quantity * it.unitPrice;
      const net = gross * (1 - (it.discountPercent ?? 0) / 100);
      return `  - ${it.description || "(no description)"} × ${it.quantity} = ${formatCurrency(
        net,
        business.currencySymbol,
      )}`;
    }),
    "",
    `Subtotal: ${formatCurrency(totals.subtotal, business.currencySymbol)}`,
    totals.globalDiscountAmount > 0
      ? `Discount (${doc.globalDiscountPercent}%): -${formatCurrency(totals.globalDiscountAmount, business.currencySymbol)}`
      : "",
    `Tax (${doc.taxRate}%): ${formatCurrency(totals.taxAmount, business.currencySymbol)}`,
    `TOTAL: ${formatCurrency(totals.total, business.currencySymbol)}`,
  ].filter(Boolean);

  await navigator.clipboard.writeText(lines.join("\n"));
}
