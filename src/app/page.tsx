"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";
import { DocumentEditor } from "@/components/document-editor";
import { ClientsPanel } from "@/components/clients-panel";
import { BusinessSettings } from "@/components/business-settings";
import { AuthForm } from "@/components/auth/auth-form";
import type { DocumentType } from "@/lib/types";

type View = "dashboard" | "clients" | "settings";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const authUser = useStore((s) => s.authUser);
  const authLoading = useStore((s) => s.authLoading);
  const fetchAuthUser = useStore((s) => s.fetchAuthUser);
  const loadFromServer = useStore((s) => s.loadFromServer);
  const signOut = useStore((s) => s.signOut);
  const business = useStore((s) => s.business);
  const createDocument = useStore((s) => s.createDocument);

  // On mount: check if user is signed in
  useEffect(() => {
    fetchAuthUser();
  }, [fetchAuthUser]);

  // When user becomes authenticated, load their data
  useEffect(() => {
    if (authUser) {
      loadFromServer();
    }
  }, [authUser, loadFromServer]);

  function handleNewDoc(type: DocumentType) {
    createDocument(type).then((doc) => {
      if (doc) {
        setEditingDocId(doc.id);
        setView("dashboard");
      }
    });
  }

  function handleOpenDoc(id: string) {
    setEditingDocId(id);
  }

  function handleBack() {
    setEditingDocId(null);
  }

  // Loading state while checking auth
  if (authLoading && !authUser) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #B0E0E6 0%, #E6F2F5 50%, #F0F7FA 100%)" }}
      >
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center rounded-xl px-4 py-3"
            style={{ backgroundColor: "#B0E0E6" }}
          >
            <img src="/tulkit.png" alt="Tulkit" className="h-12 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-2 text-neutral-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Tulkit...
          </div>
        </div>
      </div>
    );
  }

  // Not signed in → show auth form
  if (!authUser) {
    return <AuthForm />;
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
            <span
              className="rounded-md flex items-center justify-center shrink-0 px-2 py-1"
              style={{ backgroundColor: "#B0E0E6" }}
            >
              <img src="/tulkit.png" alt="Tulkit" className="h-7 w-auto object-contain" />
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
              {/* Account menu */}
              <div className="ml-2 pl-2 border-l flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium truncate max-w-[160px]">
                    {authUser.email}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Signed in</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Sign out of Tulkit?")) {
                      signOut();
                    }
                  }}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Sign out</span>
                </Button>
              </div>
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
