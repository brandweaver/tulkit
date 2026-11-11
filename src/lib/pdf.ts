import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessProfile, InvoiceDocument } from "./types";
import { computeTotals, formatCurrency, formatDate } from "./format";
import { can } from "./features";

interface PdfOptions {
  business: BusinessProfile;
  doc: InvoiceDocument;
  // Auth context for feature gating (watermark if no no_watermark feature)
  user?: {
    role: string;
    subscriptionStatus: string;
    allocatedFeatures: string[];
  } | null;
}

// Convert hex "#RRGGBB" -> [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function generateInvoicePdf({ business, doc, user }: PdfOptions): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const accent = hexToRgb(business.accentColor || "#0E7C9C");
  const totals = computeTotals(doc);
  const isInvoice = doc.type === "invoice";
  const title = isInvoice ? "INVOICE" : "QUOTE";

  // Determine if we should show watermark (free users without no_watermark feature)
  const showWatermark = !can(
    user
      ? {
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          allocatedFeatures: user.allocatedFeatures as never,
        }
      : null,
    "no_watermark",
  );

  // ----- Header band (accent colour) -----
  pdf.setFillColor(accent[0], accent[1], accent[2]);
  pdf.rect(0, 0, pageW, 6, "F");

  // ----- Business block (top-left) -----
  let y = 50;
  const logoMaxW = 100;
  const logoMaxH = 50;
  let logoH = 0;

  if (business.logoDataUrl) {
    try {
      // Detect format from data URL prefix
      const isPng = business.logoDataUrl.startsWith("data:image/png");
      const isJpeg =
        business.logoDataUrl.startsWith("data:image/jpeg") ||
        business.logoDataUrl.startsWith("data:image/jpg");
      const format = isPng ? "PNG" : isJpeg ? "JPEG" : "PNG";

      // Get image dimensions to preserve aspect ratio
      const imgDims = pdf.getImageProperties(business.logoDataUrl);
      const ratio = imgDims.width / imgDims.height;
      // Fit within logoMaxW × logoMaxH while preserving aspect ratio
      let drawW = logoMaxW;
      let drawH = drawW / ratio;
      if (drawH > logoMaxH) {
        drawH = logoMaxH;
        drawW = drawH * ratio;
      }
      pdf.addImage(business.logoDataUrl, format, margin, y, drawW, drawH);
      logoH = drawH;
    } catch {
      // ignore bad image data
    }
  }

  // Business name + details — positioned BELOW the logo (avoids overlap)
  const textStartY = y + Math.max(logoH, 0) + 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(20, 20, 20);
  pdf.text(business.name, margin, textStartY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  const bizLines = [
    business.address,
    business.email,
    business.phone,
    business.vatNumber ? `VAT: ${business.vatNumber}` : "",
  ].filter(Boolean);

  // Use splitTextToSize to wrap long lines, with proper line spacing
  const maxBizLineW = 220;
  let bizY = textStartY + 14;
  bizLines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(line, maxBizLineW);
    wrapped.forEach((wLine: string) => {
      pdf.text(wLine, margin, bizY);
      bizY += 12;
    });
  });

  // ----- Title + number block (top-right) -----
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(accent[0], accent[1], accent[2]);
  pdf.text(title, pageW - margin, y + 4, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(60, 60, 60);
  pdf.text(doc.number, pageW - margin, y + 22, { align: "right" });

  // Issue / Due dates — right column
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  const dateX = pageW - margin;
  let dateY = y + 44;
  pdf.text("Issue Date", dateX, dateY, { align: "right" });
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatDate(doc.issueDate), dateX, dateY + 12, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  dateY += 32;
  pdf.text(isInvoice ? "Due Date" : "Valid Until", dateX, dateY, { align: "right" });
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.text(formatDate(doc.dueDate), dateX, dateY + 12, { align: "right" });

  // ----- Bill To block — positioned below the business block -----
  const billToY = Math.max(bizY + 16, dateY + 32);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text(isInvoice ? "BILL TO" : "QUOTE FOR", margin, billToY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  const client = doc.clientSnapshot;
  pdf.text(client.company || client.name, margin, billToY + 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  const clientLines = [
    client.company ? client.name : "",
    client.address,
    client.email,
    client.phone,
    client.vatNumber ? `VAT: ${client.vatNumber}` : "",
  ].filter(Boolean);

  const maxClientLineW = 250;
  let clientTextY = billToY + 32;
  clientLines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(line, maxClientLineW);
    wrapped.forEach((wLine: string) => {
      pdf.text(wLine, margin, clientTextY);
      clientTextY += 12;
    });
  });

  // ----- Items table -----
  const tableStartY = clientTextY + 16;
  autoTable(pdf, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["Description", "Qty", "Unit Price", "Disc.", "Amount"]],
    body: doc.items.map((it) => {
      const gross = it.quantity * it.unitPrice;
      const net = gross * (1 - (it.discountPercent ?? 0) / 100);
      return [
        it.description || "—",
        String(it.quantity),
        formatCurrency(it.unitPrice, business.currencySymbol),
        it.discountPercent ? `${it.discountPercent}%` : "—",
        formatCurrency(net, business.currencySymbol),
      ];
    }),
    theme: "striped",
    headStyles: {
      fillColor: [accent[0], accent[1], accent[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 50, halign: "right" },
      2: { cellWidth: 80, halign: "right" },
      3: { cellWidth: 50, halign: "right" },
      4: { cellWidth: 90, halign: "right" },
    },
  });

  // ----- Totals -----
  // @ts-expect-error autoTable injects lastAutoTable on the doc instance
  let afterTableY: number = pdf.lastAutoTable.finalY + 18;
  const totalsX = pageW - margin - 220;
  const totalsW = 220;

  const totalRows: [string, string][] = [
    ["Subtotal", formatCurrency(totals.subtotal, business.currencySymbol)],
  ];
  if (totals.globalDiscountAmount > 0) {
    totalRows.push([
      `Discount (${doc.globalDiscountPercent}%)`,
      `- ${formatCurrency(totals.globalDiscountAmount, business.currencySymbol)}`,
    ]);
  }
  totalRows.push([
    `Tax (${doc.taxRate}%)`,
    formatCurrency(totals.taxAmount, business.currencySymbol),
  ]);

  totalRows.forEach(([label, value]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(90, 90, 90);
    pdf.text(label, totalsX, afterTableY);
    pdf.setTextColor(40, 40, 40);
    pdf.text(value, totalsX + totalsW, afterTableY, { align: "right" });
    afterTableY += 16;
  });

  // Total band
  pdf.setFillColor(accent[0], accent[1], accent[2]);
  pdf.rect(totalsX - 8, afterTableY, totalsW + 16, 26, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text("TOTAL", totalsX, afterTableY + 17);
  pdf.text(
    formatCurrency(totals.total, business.currencySymbol),
    totalsX + totalsW,
    afterTableY + 17,
    { align: "right" },
  );
  afterTableY += 50;

  // ----- Payment info (invoice only + banking_details feature) -----
  const showBanking = isInvoice && (business.bankName || business.bankAccount);
  const canShowBanking = can(
    user
      ? {
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          allocatedFeatures: user.allocatedFeatures as never,
        }
      : null,
    "banking_details",
  );

  if (showBanking && canShowBanking) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text("PAYMENT DETAILS", margin, afterTableY);
    afterTableY += 14;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    const bankLines = [
      business.bankName ? `Bank: ${business.bankName}` : "",
      business.bankAccount ? `Account: ${business.bankAccount}` : "",
      business.bankBranch ? `Branch: ${business.bankBranch}` : "",
      business.swift ? `SWIFT: ${business.swift}` : "",
    ].filter(Boolean);
    bankLines.forEach((line) => {
      pdf.text(line, margin, afterTableY);
      afterTableY += 12;
    });
    afterTableY += 8;
  }

  // ----- Payment terms + notes -----
  if (doc.paymentTerms) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text("TERMS", margin, afterTableY);
    afterTableY += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const wrapped = pdf.splitTextToSize(doc.paymentTerms, pageW - margin * 2);
    pdf.text(wrapped, margin, afterTableY);
    afterTableY += wrapped.length * 12 + 8;
  }

  if (doc.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text("NOTES", margin, afterTableY);
    afterTableY += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const wrappedNotes = pdf.splitTextToSize(doc.notes, pageW - margin * 2);
    pdf.text(wrappedNotes, margin, afterTableY);
  }

  // ----- Watermark (free users) -----
  if (showWatermark) {
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.12 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(64);
    pdf.setTextColor(150, 150, 150);
    pdf.text("FREE PLAN", pageW / 2, pageH / 2, {
      align: "center",
      angle: 45,
    });
    pdf.restoreGraphicsState();
  }

  // ----- Footer -----
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, pageH - 40, pageW - margin, pageH - 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `${business.name} · ${business.email ?? ""} · ${business.phone ?? ""}`,
    pageW / 2,
    pageH - 24,
    { align: "center" },
  );

  return pdf;
}

export function downloadInvoicePdf(opts: PdfOptions): void {
  const pdf = generateInvoicePdf(opts);
  const { doc, business } = opts;
  const clientSlug = (doc.clientSnapshot.company || doc.clientSnapshot.name || "client")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${doc.type === "invoice" ? "Invoice" : "Quote"}_${doc.number}_${clientSlug}_${doc.issueDate}.pdf`;
  pdf.save(filename);
}

export function invoicePdfDataUrl(opts: PdfOptions): string {
  const pdf = generateInvoicePdf(opts);
  return pdf.output("datauristring");
}
