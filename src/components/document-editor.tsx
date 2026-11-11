"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Share2,
  ChevronLeft,
  Copy,
  Check,
  Printer,
  Save,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  computeTotals,
  formatCurrency,
  statusColor,
  statusLabel,
} from "@/lib/format";
import { InvoicePreview } from "./invoice-preview";
import { ShareDialog } from "./share-dialog";
import { downloadInvoicePdf } from "@/lib/pdf";
import { can } from "@/lib/features";
import type { DocumentStatus, InvoiceDocument } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface Props {
  docId: string;
  onBack: () => void;
}

export function DocumentEditor({ docId, onBack }: Props) {
  const business = useStore((s) => s.business);
  const clients = useStore((s) => s.clients);
  const authUser = useStore((s) => s.authUser);
  const doc = useStore((s) => s.documents.find((d) => d.id === docId));
  const updateDoc = useStore((s) => s.updateDocument);
  const saveDoc = useStore((s) => s.saveDocument);
  const updateItem = useStore((s) => s.updateDocumentItem);
  const addItem = useStore((s) => s.addDocumentItem);
  const removeItem = useStore((s) => s.removeDocumentItem);
  const markAs = useStore((s) => s.markAs);
  const deleteDoc = useStore((s) => s.deleteDocument);
  const createDocument = useStore((s) => s.createDocument);
  const convertQuoteToInvoice = useStore((s) => s.convertQuoteToInvoice);

  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Document not found.</p>
        <Button onClick={onBack} variant="outline" className="mt-3">
          Back
        </Button>
      </div>
    );
  }

  const totals = computeTotals(doc);
  const isInvoice = doc.type === "invoice";
  const userCtx = authUser
    ? {
        role: authUser.role,
        subscriptionStatus: authUser.subscriptionStatus,
        allocatedFeatures: authUser.allocatedFeatures,
      }
    : null;
  const showWatermark = !can(userCtx, "no_watermark");
  const canShareWhatsApp = can(userCtx, "whatsapp_share");
  const canShareEmail = can(userCtx, "email_share");
  const canDownloadPdf = can(userCtx, "pdf_download");
  const canConvert = can(userCtx, "convert_quote_to_invoice");

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateDoc(doc!.id, { clientId, clientSnapshot: { ...client } });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveDoc(doc!.id);
      setSaved(true);
      toast({ title: "Saved!", description: "Your changes have been saved." });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    if (!canDownloadPdf) {
      toast({
        title: "Pro feature",
        description: "PDF download requires a Pro subscription.",
        variant: "destructive",
      });
      return;
    }
    try {
      downloadInvoicePdf({ business, doc: doc as InvoiceDocument, user: userCtx });
      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "PDF generation failed", variant: "destructive" });
    }
  }

  async function handleConvert() {
    if (!canConvert) {
      toast({
        title: "Pro feature",
        description: "Converting quotes to invoices requires a Pro subscription.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm("Convert this quote into an invoice? The quote will be marked as converted.")) {
      return;
    }
    const newInvoice = await convertQuoteToInvoice(doc!.id);
    if (newInvoice) {
      toast({
        title: "Converted!",
        description: `Created invoice ${newInvoice.number} from this quote.`,
      });
      onBack();
    } else {
      toast({ title: "Conversion failed", variant: "destructive" });
    }
  }

  async function handleDuplicate() {
    const newDoc = await createDocument(doc!.type, doc!.clientId);
    if (newDoc) {
      await updateDoc(newDoc.id, {
        items: doc!.items,
        taxRate: doc!.taxRate,
        globalDiscountPercent: doc!.globalDiscountPercent,
        notes: doc!.notes,
        paymentTerms: doc!.paymentTerms,
      });
      toast({ title: `Duplicated as ${newDoc.number}` });
      onBack();
    }
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{doc.number}</h1>
              <Badge className={statusColor(doc.status)} variant="secondary">
                {statusLabel(doc.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {doc.type} · created {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Save button */}
          <Button onClick={handleSave} disabled={saving} variant="outline">
            {saving ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check className="h-4 w-4 mr-2 text-emerald-600" /> Saved</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save</>
            )}
          </Button>

          {/* Convert quote → invoice */}
          {!isInvoice && doc.status !== "converted" && (
            <Button onClick={handleConvert} variant="outline">
              <ArrowRight className="h-4 w-4 mr-2" /> Convert to Invoice
            </Button>
          )}

          <Button onClick={() => setShareOpen(true)} className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={!canDownloadPdf}
            title={!canDownloadPdf ? "Pro feature — upgrade to download PDFs" : undefined}
          >
            <Printer className="h-4 w-4 mr-2" /> PDF
            {!canDownloadPdf && <Lock className="h-3 w-3 ml-1" />}
          </Button>

          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" /> Duplicate
          </Button>

          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete ${doc.number}?`)) {
                deleteDoc(doc.id);
                toast({ title: "Document deleted" });
                onBack();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          {/* Status + client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={doc.status}
                    onValueChange={(v) => markAs(doc.id, v as DocumentStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      {doc.status === "converted" && (
                        <SelectItem value="converted" disabled>Converted</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select value={doc.clientId} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Issue date</Label>
                  <Input
                    type="date"
                    value={doc.issueDate}
                    onChange={(e) => updateDoc(doc.id, { issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isInvoice ? "Due date" : "Valid until"}</Label>
                  <Input
                    type="date"
                    value={doc.dueDate}
                    onChange={(e) => updateDoc(doc.id, { dueDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Line items</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addItem(doc.id)}
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.items.map((it, idx) => {
                const gross = it.quantity * it.unitPrice;
                const net = gross * (1 - (it.discountPercent ?? 0) / 100);
                return (
                  <div
                    key={it.id}
                    className="rounded-md border p-3 space-y-2 bg-muted/20"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground pt-2.5 w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <Input
                        placeholder="Item description"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(doc.id, it.id, { description: e.target.value })
                        }
                        className="flex-1 min-w-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => removeItem(doc.id, it.id)}
                        disabled={doc.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pl-7">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(doc.id, it.id, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Unit price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(doc.id, it.id, {
                              unitPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Disc %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={it.discountPercent ?? 0}
                          onChange={(e) =>
                            updateItem(doc.id, it.id, {
                              discountPercent: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Total</Label>
                        <div className="h-9 flex items-center justify-end px-3 rounded-md border bg-background font-medium">
                          {formatCurrency(net, business.currencySymbol)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Tax, discount, terms, notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary & notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tax rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={doc.taxRate}
                    onChange={(e) =>
                      updateDoc(doc.id, { taxRate: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Global discount (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={doc.globalDiscountPercent}
                    onChange={(e) =>
                      updateDoc(doc.id, {
                        globalDiscountPercent: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payment terms</Label>
                <Textarea
                  rows={2}
                  value={doc.paymentTerms ?? ""}
                  onChange={(e) => updateDoc(doc.id, { paymentTerms: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={doc.notes ?? ""}
                  onChange={(e) => updateDoc(doc.id, { notes: e.target.value })}
                />
              </div>

              {/* Totals summary */}
              <div className="rounded-md border p-3 space-y-1 text-sm">
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal, business.currencySymbol)} />
                {totals.globalDiscountAmount > 0 && (
                  <SummaryRow
                    label={`Discount (${doc.globalDiscountPercent}%)`}
                    value={`- ${formatCurrency(totals.globalDiscountAmount, business.currencySymbol)}`}
                  />
                )}
                <SummaryRow
                  label={`Tax (${doc.taxRate}%)`}
                  value={formatCurrency(totals.taxAmount, business.currencySymbol)}
                />
                <div className="flex justify-between font-bold pt-1 border-t mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total, business.currencySymbol)}</span>
                </div>
              </div>

              {/* Save button at the bottom too */}
              <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0E7C9C] hover:bg-[#0A6582] text-white">
                {saving ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Check className="h-4 w-4 mr-2" /> Saved!</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save changes</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: live preview */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-600" /> Live preview (updates as you type)
          </div>
          <div className="lg:sticky lg:top-4">
            <InvoicePreview
              business={business}
              doc={doc as InvoiceDocument}
              showWatermark={showWatermark}
            />
          </div>
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        doc={doc as InvoiceDocument}
        canWhatsApp={canShareWhatsApp}
        canEmail={canShareEmail}
        canDownloadPdf={canDownloadPdf}
      />
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
