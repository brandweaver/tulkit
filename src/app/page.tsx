"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Settings,
  Sparkles,
  Database,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";
import { DocumentEditor } from "@/components/document-editor";
import { ClientsPanel } from "@/components/clients-panel";
import { BusinessSettings } from "@/components/business-settings";
import { toast } from "@/hooks/use-toast";
import type { DocumentType } from "@/lib/types";

type View = "dashboard" | "clients" | "settings";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const documents = useStore((s) => s.documents);
  const business = useStore((s) => s.business);
  const createDocument = useStore((s) => s.createDocument);
  const seedSampleData = useStore((s) => s.seedSampleData);
  const resetAll = useStore((s) => s.resetAll);

  // Auto-seed sample data on first visit so the dashboard isn't empty.
  useEffect(() => {
    const KEY = "invoice-maker-seeded";
    if (!localStorage.getItem(KEY) && documents.length === 0) {
      seedSampleData();
      localStorage.setItem(KEY, "1");
    }
  }, [documents.length, seedSampleData]);

  function handleNewDoc(type: DocumentType) {
    const doc = createDocument(type);
    setEditingDocId(doc.id);
    setView("dashboard");
  }

  function handleOpenDoc(id: string) {
    setEditingDocId(id);
  }

  function handleBack() {
    setEditingDocId(null);
  }

  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "clients", label: "Clients", icon: <Users className="h-4 w-4" /> },
    { key: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => {
              setEditingDocId(null);
              setView("dashboard");
            }}
            className="flex items-center gap-2 min-w-0"
          >
            {/* Tulkit logo on powder-blue chip */}
            <span
              className="rounded-md flex items-center justify-center shrink-0 px-2 py-1"
              style={{ backgroundColor: "#B0E0E6" }}
            >
              <img
                src="/tulkit.png"
                alt="Tulkit"
                className="h-7 w-auto object-contain"
              />
            </span>
            <div className="min-w-0 hidden sm:block">
              <div className="font-bold text-sm truncate">Tulkit</div>
              <div className="text-[10px] text-muted-foreground">Invoices & Quotes</div>
            </div>
          </button>

          {/* Tab nav (hidden when editing a doc) */}
          {!editingDocId && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  variant={view === item.key ? "default" : "ghost"}
                  size="sm"
                  className={
                    view === item.key
                      ? "bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
                      : ""
                  }
                  onClick={() => setView(item.key)}
                >
                  {item.icon}
                  <span className="ml-1.5 hidden sm:inline">{item.label}</span>
                </Button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {editingDocId ? (
          <DocumentEditor docId={editingDocId} onBack={handleBack} />
        ) : view === "dashboard" ? (
          <Dashboard onOpenDoc={handleOpenDoc} onNewDoc={handleNewDoc} />
        ) : view === "clients" ? (
          <ClientsPanel />
        ) : (
          <BusinessSettings />
        )}

        {/* Dev tools — only on settings page */}
        {view === "settings" && !editingDocId && (
          <div className="max-w-3xl mx-auto mt-8 border-t pt-6">
            <div className="rounded-md border border-dashed p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" /> Data tools
              </div>
              <p className="text-xs text-muted-foreground">
                All data is saved locally in your browser (localStorage). Use these
                buttons to load demo data or wipe everything.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    seedSampleData();
                    toast({ title: "Sample data loaded" });
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Load sample data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (
                      confirm(
                        "Reset ALL data? This deletes every invoice, client, and your business profile.",
                      )
                    ) {
                      resetAll();
                      toast({ title: "All data reset" });
                    }
                  }}
                >
                  Reset everything
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center space-y-1">
          <div className="text-xs text-muted-foreground">
            Tulkit · Invoices &amp; Quotes made easy
          </div>
          <div className="text-[11px] text-muted-foreground/80">
            Powered by{" "}
            <a
              href="https://brandweaver.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
            >
              Brandweaver
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
