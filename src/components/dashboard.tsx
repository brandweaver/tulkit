"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  FilePlus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  computeTotals,
  formatCurrency,
  formatDate,
  statusColor,
  statusLabel,
} from "@/lib/format";
import { useState } from "react";
import type { DocumentType } from "@/lib/types";

interface Props {
  onOpenDoc: (id: string) => void;
  onNewDoc: (type: DocumentType) => void;
}

export function Dashboard({ onOpenDoc, onNewDoc }: Props) {
  const business = useStore((s) => s.business);
  const documents = useStore((s) => s.documents);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const invoices = documents.filter((d) => d.type === "invoice");
    const paid = invoices.filter((d) => d.status === "paid");
    const outstanding = invoices.filter(
      (d) => d.status === "sent" || d.status === "viewed" || d.status === "overdue",
    );
    const overdue = invoices.filter((d) => d.status === "overdue");

    const totalPaid = paid.reduce(
      (sum, d) => sum + computeTotals(d).total,
      0,
    );
    const totalOutstanding = outstanding.reduce(
      (sum, d) => sum + computeTotals(d).total,
      0,
    );
    const totalOverdue = overdue.reduce(
      (sum, d) => sum + computeTotals(d).total,
      0,
    );

    return {
      totalPaid,
      totalOutstanding,
      totalOverdue,
      invoiceCount: invoices.length,
      quoteCount: documents.filter((d) => d.type === "quote").length,
    };
  }, [documents]);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => (typeFilter === "all" ? true : d.type === typeFilter))
      .filter((d) => (statusFilter === "all" ? true : d.status === statusFilter))
      .filter((d) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          d.number.toLowerCase().includes(q) ||
          d.clientSnapshot.name.toLowerCase().includes(q) ||
          (d.clientSnapshot.company ?? "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [documents, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Paid"
          value={formatCurrency(stats.totalPaid, business.currencySymbol)}
          tone="emerald"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Outstanding"
          value={formatCurrency(stats.totalOutstanding, business.currencySymbol)}
          tone="amber"
        />
        <StatCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Overdue"
          value={formatCurrency(stats.totalOverdue, business.currencySymbol)}
          tone="red"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Documents"
          value={`${documents.length}`}
          tone="neutral"
          sub={`${stats.invoiceCount} invoices · ${stats.quoteCount} quotes`}
        />
      </div>

      {/* Quick create */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Button
          onClick={() => onNewDoc("invoice")}
          className="h-auto py-4 justify-start bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
        >
          <FilePlus className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">New Invoice</div>
            <div className="text-xs text-emerald-100">Create and send in 60 seconds</div>
          </div>
        </Button>
        <Button
          onClick={() => onNewDoc("quote")}
          variant="outline"
          className="h-auto py-4 justify-start"
        >
          <FileText className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">New Quote</div>
            <div className="text-xs text-muted-foreground">Send a price estimate</div>
          </div>
        </Button>
      </div>

      {/* Documents list */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Documents</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="quote">Quotes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {documents.length === 0
                  ? "No documents yet. Create your first invoice above."
                  : "No documents match your filters."}
              </p>
              {documents.length === 0 && (
                <Button
                  onClick={() => onNewDoc("invoice")}
                  className="mt-3 bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((d) => {
                const totals = computeTotals(d);
                return (
                  <button
                    key={d.id}
                    onClick={() => onOpenDoc(d.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                          d.type === "invoice"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {d.type === "invoice" ? (
                          <FilePlus className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{d.number}</span>
                          <Badge className={statusColor(d.status)} variant="secondary">
                            {statusLabel(d.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.clientSnapshot.company || d.clientSnapshot.name}
                          {" · "}
                          {formatDate(d.issueDate)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm">
                        {formatCurrency(totals.total, business.currencySymbol)}
                      </div>
                      {d.type === "invoice" && (
                        <div className="text-xs text-muted-foreground">
                          Due {formatDate(d.dueDate)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "red" | "neutral";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  }[tone];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={`w-7 h-7 rounded-md flex items-center justify-center ${toneClass}`}>
            {icon}
          </span>
        </div>
        <div className="text-xl font-bold mt-2 truncate">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
