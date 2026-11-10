"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BusinessSettings() {
  const business = useStore((s) => s.business);
  const updateBusiness = useStore((s) => s.updateBusiness);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) {
      toast({
        title: "Logo too large",
        description: "Please pick an image under 800 KB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBusiness({ logoDataUrl: String(reader.result) });
      toast({ title: "Logo updated" });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            This appears on every invoice and quote you create.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business name" required>
              <Input
                value={business.name}
                onChange={(e) => updateBusiness({ name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={business.email ?? ""}
                onChange={(e) => updateBusiness({ email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={business.phone ?? ""}
                onChange={(e) => updateBusiness({ phone: e.target.value })}
              />
            </Field>
            <Field label="VAT / Tax number">
              <Input
                value={business.vatNumber ?? ""}
                onChange={(e) => updateBusiness({ vatNumber: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Address">
            <Textarea
              rows={2}
              value={business.address ?? ""}
              onChange={(e) => updateBusiness({ address: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Logo and accent colour used on the PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
              {business.logoDataUrl ? (
                <img
                  src={business.logoDataUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload logo
              </Button>
              {business.logoDataUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateBusiness({ logoDataUrl: undefined })}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Accent colour">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={business.accentColor}
                  onChange={(e) => updateBusiness({ accentColor: e.target.value })}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={business.accentColor}
                  onChange={(e) => updateBusiness({ accentColor: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Currency">
              <Select
                value={business.currency}
                onValueChange={(v) => updateBusiness({ currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Numbering</CardTitle>
          <CardDescription>
            Sequential numbering keeps invoices audit-safe and SARS-friendly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="Invoice prefix">
            <Input
              value={business.invoicePrefix}
              onChange={(e) => updateBusiness({ invoicePrefix: e.target.value })}
            />
          </Field>
          <Field label="Next invoice number">
            <Input
              type="number"
              min={1}
              value={business.nextInvoiceNumber}
              onChange={(e) =>
                updateBusiness({ nextInvoiceNumber: Number(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Quote prefix">
            <Input
              value={business.quotePrefix}
              onChange={(e) => updateBusiness({ quotePrefix: e.target.value })}
            />
          </Field>
          <Field label="Next quote number">
            <Input
              type="number"
              min={1}
              value={business.nextQuoteNumber}
              onChange={(e) =>
                updateBusiness({ nextQuoteNumber: Number(e.target.value) || 1 })
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>Pre-filled when you create a new document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Default tax rate (%)">
              <Input
                type="number"
                step="0.01"
                value={business.defaultTaxRate}
                onChange={(e) =>
                  updateBusiness({ defaultTaxRate: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <Field label="Default payment terms">
            <Textarea
              rows={2}
              value={business.defaultPaymentTerms}
              onChange={(e) =>
                updateBusiness({ defaultPaymentTerms: e.target.value })
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banking details</CardTitle>
          <CardDescription>Shown on invoices for client payment.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="Bank name">
            <Input
              value={business.bankName ?? ""}
              onChange={(e) => updateBusiness({ bankName: e.target.value })}
            />
          </Field>
          <Field label="Account number">
            <Input
              value={business.bankAccount ?? ""}
              onChange={(e) => updateBusiness({ bankAccount: e.target.value })}
            />
          </Field>
          <Field label="Branch code">
            <Input
              value={business.bankBranch ?? ""}
              onChange={(e) => updateBusiness({ bankBranch: e.target.value })}
            />
          </Field>
          <Field label="SWIFT (international)">
            <Input
              value={business.swift ?? ""}
              onChange={(e) => updateBusiness({ swift: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
