"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Loader2,
  Crown,
  Shield,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";
import { DocumentEditor } from "@/components/document-editor";
import { ClientsPanel } from "@/components/clients-panel";
import { BusinessSettings } from "@/components/business-settings";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { AuthForm } from "@/components/auth/auth-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type View = "dashboard" | "clients" | "settings" | "admin";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const authUser = useStore((s) => s.authUser);
  const authLoading = useStore((s) => s.authLoading);
  const fetchAuthUser = useStore((s) => s.fetchAuthUser);
  const loadFromServer = useStore((s) => s.loadFromServer);
  const signOut = useStore((s) => s.signOut);
  const createDocument = useStore((s) => s.createDocument);

  useEffect(() => {
    fetchAuthUser();
  }, [fetchAuthUser]);

  useEffect(() => {
    if (authUser) {
      loadFromServer();
    }
  }, [authUser, loadFromServer]);

  function handleNewDoc(type: "invoice" | "quote") {
    createDocument(type).then((doc) => {
      if (doc) {
        setEditingDocId(doc.id);
        setView("dashboard");
      } else {
        toast({
          title: "Could not create document",
          description: "You may have hit the free tier limit. Upgrade for unlimited documents.",
          variant: "destructive",
        });
        setUpgradeOpen(true);
      }
    });
  }

  function handleOpenDoc(id: string) {
    setEditingDocId(id);
  }

  function handleBack() {
    setEditingDocId(null);
  }

  // Loading state
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

  // Not signed in → auth form
  if (!authUser) {
    return <AuthForm />;
  }

  const isAdmin = authUser.role === "admin";

  const navItems: { key: View; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "clients", label: "Clients", icon: <Users className="h-4 w-4" /> },
    { key: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    { key: "admin", label: "Admin", icon: <Shield className="h-4 w-4" />, adminOnly: true },
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

          {!editingDocId && (
            <nav className="flex items-center gap-1">
              {navItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
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
                <div className="hidden sm:block text-right max-w-[180px]">
                  <div className="text-xs font-medium truncate">{authUser.email}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {authUser.role === "admin"
                      ? "Admin"
                      : authUser.subscriptionStatus === "active"
                        ? "Pro plan"
                        : "Free plan"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Sign out of Tulkit?")) {
                      signOut();
                      toast({ title: "Signed out" });
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-4">
        {/* Subscription banner (not on admin page, not when editing) */}
        {!editingDocId && view !== "admin" && (
          <SubscriptionBanner onUpgradeClick={() => setUpgradeOpen(true)} />
        )}

        {editingDocId ? (
          <DocumentEditor docId={editingDocId} onBack={handleBack} />
        ) : view === "dashboard" ? (
          <Dashboard onOpenDoc={handleOpenDoc} onNewDoc={handleNewDoc} />
        ) : view === "clients" ? (
          <ClientsPanel />
        ) : view === "admin" && isAdmin ? (
          <AdminDashboard />
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

      {/* Upgrade dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              Unlock all features for 30 days. No accumulation — pay once, use for 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/50 p-4 space-y-2">
              <div className="font-semibold">Pro — R99 / 30 days</div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Unlimited documents</li>
                <li>✅ Unlimited clients</li>
                <li>✅ PDF download (no watermark)</li>
                <li>✅ WhatsApp & Email sharing</li>
                <li>✅ Custom logo & branding</li>
                <li>✅ Banking details on invoices</li>
                <li>✅ Convert quotes to invoices</li>
              </ul>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
              <div className="font-semibold text-amber-800 dark:text-amber-200">
                Pay with cash
              </div>
              <div className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                Contact us to pay R99 cash. After payment, we&apos;ll activate your 30-day Pro access manually.
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              Maybe later
            </Button>
            <Button
              className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
              onClick={() => {
                window.open("https://wa.me/27738239666?text=Hi%20I%20want%20to%20upgrade%20to%20Tulkit%20Pro", "_blank");
              }}
            >
              Contact us to pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
