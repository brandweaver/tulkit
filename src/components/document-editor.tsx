"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Share2, ChevronLeft, Copy, Check, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  computeTotals,
  formatCurrency,
  statusColor,
  statusLabel,
  todayISO,
  addDaysISO,
} from "@/lib/format";
import { InvoicePreview } from "./invoice-preview";
import { ShareDialog } from "./share-dialog";
import { downloadInvoicePdf } from "@/lib/pdf";
import type { DocumentStatus, InvoiceDocument } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface Props {
  docId: string;
  onBack: () => void;
}

export function DocumentEditor({ docId, onBack }: Props) {
  const business = useStore((s) => s.business);
  const clients = useStore((s) => s.clients);
  const doc = useStore((s) => s.documents.find((d) => d.id === docId));
  const updateDoc = useStore((s) => s.updateDocument);
  const updateItem = useStore((s) => s.updateDocumentItem);
  const addItem = useStore((s) => s.addDocumentItem);
  const removeItem = useStore((s) => s.removeDocumentItem);
  const markAs = useStore((s) => s.markAs);
  const deleteDoc = useStore((s) => s.deleteDocument);
  const createDocument = useStore((s) => s.createDocument);

  const [shareOpen, setShareOpen] = useState(false);

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

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateDoc(doc!.id, { clientId, clientSnapshot: { ...client } });
    }
  }

  function handleDuplicate() {
    const newDoc = createDocument(doc!.type, doc!.clientId);
    updateDoc(newDoc.id, {
      items: doc!.items.map((it) => ({ ...it, id: crypto.randomUUID() })),
      taxRate: doc!.taxRate,
      globalDiscountPercent: doc!.globalDiscountPercent,
      notes: doc!.notes,
      paymentTerms: doc!.paymentTerms,
      dueDate: addDaysISO(todayISO(), 7),
    });
    toast({ title: `Duplicated as ${newDoc.number}` });
    onBack();
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{doc.number}</h1>
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
          <Button onClick={() => setShareOpen(true)} className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                downloadInvoicePdf({ business, doc });
                toast({ title: "PDF downloaded" });
              } catch {
                toast({ title: "PDF generation failed", variant: "destructive" });
              }
            }}
          >
            <Printer className="h-4 w-4 mr-2" /> Download PDF
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
                      <span className="text-xs text-muted-foreground pt-2.5 w-5">
                        {idx + 1}.
                      </span>
                      <Input
                        placeholder="Item description"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(doc.id, it.id, { description: e.target.value })
                        }
                        className="flex-1"
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
            </CardContent>
          </Card>
        </div>

        {/* Right: live preview */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-3.5 w-3.5" /> Live preview (mirrors the PDF)
          </div>
          <div className="lg:sticky lg:top-4">
            <InvoicePreview business={business} doc={doc as InvoiceDocument} />
          </div>
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} doc={doc} />
    </div>
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
