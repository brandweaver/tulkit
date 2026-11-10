"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, MessageCircle, Mail, Copy, Check, Phone, Info } from "lucide-react";
import type { BusinessProfile, InvoiceDocument } from "@/lib/types";
import {
  downloadInvoicePdf,
  invoicePdfDataUrl,
} from "@/lib/pdf";
import {
  whatsappShareUrl,
  emailShareUrl,
  buildShareMessage,
  buildShareSubject,
  copySummaryToClipboard,
} from "@/lib/share";
import { useStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: InvoiceDocument;
}

export function ShareDialog({ open, onOpenChange, doc }: Props) {
  const business = useStore((s) => s.business);
  const markAs = useStore((s) => s.markAs);
  const [copied, setCopied] = useState(false);
  const [editedPhone, setEditedPhone] = useState(doc.clientSnapshot.phone ?? "");
  const [editedEmail, setEditedEmail] = useState(doc.clientSnapshot.email ?? "");
  const [editedMessage, setEditedMessage] = useState(
    buildShareMessage({ business, doc }),
  );
  const [editedSubject, setEditedSubject] = useState(
    buildShareSubject({ business, doc }),
  );

  const ctx = { business, doc };

  function handleDownload() {
    try {
      downloadInvoicePdf(ctx);
      toast({ title: "PDF downloaded", description: `${doc.number}.pdf saved` });
      if (doc.status === "draft") markAs(doc.id, "sent");
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not generate PDF",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleWhatsApp() {
    const url = whatsappShareUrl({ business, doc });
    window.open(url, "_blank", "noopener,noreferrer");
    if (doc.status === "draft") markAs(doc.id, "sent");
    toast({
      title: "Opening WhatsApp",
      description: "Attach the downloaded PDF in WhatsApp before sending.",
    });
  }

  function handleEmail() {
    const url = emailShareUrl({ business, doc });
    window.location.href = url;
    if (doc.status === "draft") markAs(doc.id, "sent");
    toast({
      title: "Opening email client",
      description: "Attach the PDF after your email client opens.",
    });
  }

  async function handleCopy() {
    try {
      await copySummaryToClipboard(ctx);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }

  function handleOpenPreview() {
    const dataUrl = invoicePdfDataUrl(ctx);
    const w = window.open();
    if (w) {
      w.document.write(
        `<iframe src="${dataUrl}" style="border:0;width:100%;height:100vh"></iframe>`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share {doc.type === "invoice" ? "Invoice" : "Quote"} {doc.number}</DialogTitle>
          <DialogDescription>
            Download the PDF, then send it via WhatsApp or email. The message is pre-filled
            with your client&apos;s details.
          </DialogDescription>
        </DialogHeader>

        {/* Primary actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button onClick={handleDownload} className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button
            onClick={handleWhatsApp}
            className="bg-[#25D366] hover:bg-[#1FB855] text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
          </Button>
          <Button onClick={handleEmail} variant="default">
            <Mail className="h-4 w-4 mr-2" /> Email
          </Button>
        </div>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            Browsers can&apos;t auto-attach files to WhatsApp or email for security reasons.
            Tap <strong>PDF</strong> first, then <strong>WhatsApp</strong> or <strong>Email</strong>
            — your message will be pre-filled, just attach the downloaded PDF.
          </div>
        </div>

        <Tabs defaultValue="message">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="message">Message</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-2 mt-3">
            <Label>Pre-filled message</Label>
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={6}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy summary"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenPreview}>
                Preview PDF in new tab
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-2 mt-3">
            <Label>Send to (client phone)</Label>
            <div className="flex gap-2">
              <Input
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="+27 82 555 0101"
              />
              <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#1FB855] text-white shrink-0">
                <Phone className="h-4 w-4 mr-2" /> Open WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: international with country code (e.g. +27 for South Africa).
              Local 0XX numbers are auto-converted.
            </p>
          </TabsContent>

          <TabsContent value="email" className="space-y-2 mt-3">
            <Label>Send to (client email)</Label>
            <Input
              type="email"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
              placeholder="client@example.com"
            />
            <Label>Subject</Label>
            <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} />
            <Button onClick={handleEmail} className="w-full">
              <Mail className="h-4 w-4 mr-2" /> Open email client
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="text-xs text-muted-foreground">
          Sharing will mark this {doc.type} as &quot;Sent&quot; if it&apos;s still a draft.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
