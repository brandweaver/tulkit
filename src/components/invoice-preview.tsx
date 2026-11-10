"use client";

import type { BusinessProfile, InvoiceDocument } from "@/lib/types";
import { computeTotals, formatCurrency, formatDate } from "@/lib/format";

interface Props {
  business: BusinessProfile;
  doc: InvoiceDocument;
}

// Visual HTML preview that mirrors the structure of the generated PDF so the
// user sees roughly what they'll get before downloading.
export function InvoicePreview({ business, doc }: Props) {
  const totals = computeTotals(doc);
  const isInvoice = doc.type === "invoice";
  const accent = business.accentColor || "#059669";
  const client = doc.clientSnapshot;

  return (
    <div className="bg-white text-neutral-900 shadow-sm border rounded-lg overflow-hidden">
      {/* accent top band */}
      <div className="h-1.5" style={{ backgroundColor: accent }} />

      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            {business.logoDataUrl ? (
              <img
                src={business.logoDataUrl}
                alt="Logo"
                className="h-12 w-auto object-contain mb-2"
              />
            ) : null}
            <h2 className="text-lg font-bold">{business.name}</h2>
            <div className="text-xs text-neutral-500 space-y-0.5">
              {business.address && <div>{business.address}</div>}
              {business.email && <div>{business.email}</div>}
              {business.phone && <div>{business.phone}</div>}
              {business.vatNumber && <div>VAT: {business.vatNumber}</div>}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: accent }}
            >
              {isInvoice ? "INVOICE" : "QUOTE"}
            </div>
            <div className="text-sm font-medium text-neutral-700">{doc.number}</div>
            <div className="text-xs text-neutral-500 mt-2 space-y-1">
              <div>
                <span className="text-neutral-400">Issue Date: </span>
                <span className="font-medium text-neutral-700">
                  {formatDate(doc.issueDate)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">
                  {isInvoice ? "Due Date: " : "Valid Until: "}
                </span>
                <span className="font-medium text-neutral-700">
                  {formatDate(doc.dueDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div>
          <div className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
            {isInvoice ? "Bill To" : "Quote For"}
          </div>
          <div className="mt-1 font-semibold text-neutral-900">
            {client.company || client.name}
          </div>
          <div className="text-xs text-neutral-600 space-y-0.5 mt-1">
            {client.company && <div>{client.name}</div>}
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
            {client.vatNumber && <div>VAT: {client.vatNumber}</div>}
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: accent, color: "white" }}>
                <th className="text-left font-semibold px-3 py-2">Description</th>
                <th className="text-right font-semibold px-3 py-2 w-12">Qty</th>
                <th className="text-right font-semibold px-3 py-2 w-24">Unit</th>
                <th className="text-right font-semibold px-3 py-2 w-16">Disc.</th>
                <th className="text-right font-semibold px-3 py-2 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it, i) => {
                const gross = it.quantity * it.unitPrice;
                const net = gross * (1 - (it.discountPercent ?? 0) / 100);
                return (
                  <tr
                    key={it.id}
                    className={i % 2 === 0 ? "bg-neutral-50" : "bg-white"}
                  >
                    <td className="px-3 py-2 text-neutral-700">
                      {it.description || (
                        <span className="text-neutral-400 italic">(empty)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-700">
                      {it.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-700">
                      {formatCurrency(it.unitPrice, business.currencySymbol)}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-700">
                      {it.discountPercent ? `${it.discountPercent}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-neutral-900">
                      {formatCurrency(net, business.currencySymbol)}
                    </td>
                  </tr>
                );
              })}
              {doc.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-400 italic">
                    No line items yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal, business.currencySymbol)} />
            {totals.globalDiscountAmount > 0 && (
              <Row
                label={`Discount (${doc.globalDiscountPercent}%)`}
                value={`- ${formatCurrency(totals.globalDiscountAmount, business.currencySymbol)}`}
              />
            )}
            <Row
              label={`Tax (${doc.taxRate}%)`}
              value={formatCurrency(totals.taxAmount, business.currencySymbol)}
            />
            <div
              className="flex justify-between items-center px-3 py-2 rounded mt-2 text-white font-bold"
              style={{ backgroundColor: accent }}
            >
              <span>TOTAL</span>
              <span>{formatCurrency(totals.total, business.currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* Payment details + terms + notes */}
        {(isInvoice && (business.bankName || business.bankAccount)) && (
          <div className="text-xs">
            <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
              Payment Details
            </div>
            <div className="mt-1 text-neutral-700 space-y-0.5">
              {business.bankName && <div>Bank: {business.bankName}</div>}
              {business.bankAccount && <div>Account: {business.bankAccount}</div>}
              {business.bankBranch && <div>Branch: {business.bankBranch}</div>}
              {business.swift && <div>SWIFT: {business.swift}</div>}
            </div>
          </div>
        )}

        {doc.paymentTerms && (
          <div className="text-xs">
            <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
              Terms
            </div>
            <div className="mt-1 text-neutral-700">{doc.paymentTerms}</div>
          </div>
        )}

        {doc.notes && (
          <div className="text-xs">
            <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
              Notes
            </div>
            <div className="mt-1 text-neutral-700 whitespace-pre-wrap">{doc.notes}</div>
          </div>
        )}
      </div>

      <div className="border-t px-6 py-3 text-center text-[10px] text-neutral-400">
        {business.name}
        {business.email ? ` · ${business.email}` : ""}
        {business.phone ? ` · ${business.phone}` : ""}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-600">
      <span>{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}
