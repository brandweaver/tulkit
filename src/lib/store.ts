"use client";

import { create } from "zustand";
import type {
  BusinessProfile,
  Client,
  InvoiceDocument,
  LineItem,
  DocumentType,
  DocumentStatus,
  FeatureKey,
} from "./types";
import { DEFAULT_BUSINESS, symbolForCurrency } from "./format";
import { toast } from "@/hooks/use-toast";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  allocatedFeatures: FeatureKey[];
}

// Typed API error so callers can distinguish failure modes
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
  ) {
    super(message);
  }
}

interface StoreState {
  authUser: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  justSignedUp: boolean;

  business: BusinessProfile;
  clients: Client[];
  documents: InvoiceDocument[];
  dataLoading: boolean;

  // Auth actions
  fetchAuthUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Data actions
  loadFromServer: () => Promise<void>;

  // Business
  updateBusiness: (patch: Partial<BusinessProfile>) => void;
  saveBusiness: () => Promise<void>;

  // Clients
  upsertClient: (client: Client) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;

  // Documents
  createDocument: (type: DocumentType, clientId?: string) => Promise<InvoiceDocument | null>;
  convertQuoteToInvoice: (quoteId: string) => Promise<InvoiceDocument | null>;
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => void;
  saveDocument: (docId: string) => Promise<void>;
  updateDocumentItem: (docId: string, itemId: string, patch: Partial<LineItem>) => void;
  addDocumentItem: (docId: string) => void;
  removeDocumentItem: (docId: string, itemId: string) => void;
  deleteDocument: (id: string) => Promise<boolean>;
  markAs: (id: string, status: DocumentStatus) => Promise<boolean>;
  flushPendingSave: (docId: string) => Promise<void>;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.code ?? null, body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Track pending and failed saves so we can guard navigation
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const failedSaves = new Set<string>();
let businessSaveTimer: ReturnType<typeof setTimeout> | null = null;
let businessSaveFailed = false;

export const useStore = create<StoreState>((set, get) => ({
  authUser: null,
  authLoading: true,
  authError: null,
  justSignedUp: false,

  business: { ...DEFAULT_BUSINESS },
  clients: [],
  documents: [],
  dataLoading: false,

  fetchAuthUser: async () => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiFetch("/api/auth/me");
      set({ authUser: data.user, authLoading: false });
    } catch {
      set({ authUser: null, authLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const me = await apiFetch("/api/auth/me");
      set({ authUser: me.user, authLoading: false, justSignedUp: false });
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  signUp: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.requiresEmailConfirmation) {
        set({ authLoading: false, justSignedUp: true, authUser: null });
        return;
      }
      await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const me = await apiFetch("/api/auth/me");
      set({ authUser: me.user, authLoading: false, justSignedUp: false });
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    // Flush all pending saves before clearing state
    flushAllPendingSaves(get);
    if (businessSaveTimer) {
      clearTimeout(businessSaveTimer);
      businessSaveTimer = null;
    }
    saveTimers.forEach((t) => clearTimeout(t));
    saveTimers.clear();

    try {
      await apiFetch("/api/auth/signout", { method: "POST" });
    } finally {
      set({
        authUser: null,
        business: { ...DEFAULT_BUSINESS },
        clients: [],
        documents: [],
        justSignedUp: false,
      });
      failedSaves.clear();
      businessSaveFailed = false;
    }
  },

  loadFromServer: async () => {
    set({ dataLoading: true });
    try {
      // Use allSettled so partial success is applied
      const [bizR, clientsR, docsR] = await Promise.allSettled([
        apiFetch("/api/business"),
        apiFetch("/api/clients"),
        apiFetch("/api/documents"),
      ]);
      const updates: Partial<StoreState> = { dataLoading: false };
      if (bizR.status === "fulfilled") updates.business = bizR.value;
      if (clientsR.status === "fulfilled") updates.clients = clientsR.value;
      if (docsR.status === "fulfilled") updates.documents = docsR.value;
      set(updates);
      if (bizR.status === "rejected" || clientsR.status === "rejected" || docsR.status === "rejected") {
        console.error("Partial load failure:", { bizR, clientsR, docsR });
      }
    } catch (e) {
      set({ dataLoading: false });
      console.error("Failed to load data:", e);
    }
  },

  // Business: local update + debounced save (no response replacement)
  updateBusiness: (patch) => {
    const prev = get().business;
    const next: Partial<BusinessProfile> = { ...patch };
    if (patch.currency) {
      next.currencySymbol = symbolForCurrency(patch.currency);
    }
    set({ business: { ...prev, ...next } });
    scheduleBusinessSave(get);
  },

  saveBusiness: async () => {
    if (businessSaveTimer) {
      clearTimeout(businessSaveTimer);
      businessSaveTimer = null;
    }
    const business = get().business;
    try {
      await apiFetch("/api/business", {
        method: "PUT",
        body: JSON.stringify(business),
      });
      businessSaveFailed = false;
    } catch (e) {
      console.error("Business save failed:", e);
      businessSaveFailed = true;
      toast({
        title: "Settings save failed",
        description: "Network error — please try again.",
        variant: "destructive",
      });
      throw e;
    }
  },

  upsertClient: async (client) => {
    const exists = get().clients.some((c) => c.id === client.id);
    if (exists) {
      // Save previous state for revert
      const prevClient = get().clients.find((c) => c.id === client.id);
      // Optimistic update
      set((s) => ({
        clients: s.clients.map((c) => (c.id === client.id ? client : c)),
      }));
      try {
        const updated = await apiFetch(`/api/clients/${client.id}`, {
          method: "PUT",
          body: JSON.stringify(client),
        });
        set((s) => ({
          clients: s.clients.map((c) => (c.id === client.id ? updated : c)),
        }));
        return updated;
      } catch (e) {
        // Revert ONLY this client, not the whole array
        if (prevClient) {
          set((s) => ({
            clients: s.clients.map((c) => (c.id === client.id ? prevClient : c)),
          }));
        }
        throw e;
      }
    } else {
      try {
        const created = await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(client),
        });
        set((s) => ({ clients: [created, ...s.clients] }));
        return created;
      } catch (e) {
        console.error("Failed to create client:", e);
        throw e;
      }
    }
  },

  deleteClient: async (id) => {
    const prevClient = get().clients.find((c) => c.id === id);
    // Optimistic remove
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    try {
      await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
      return true;
    } catch (e) {
      // Re-insert ONLY this client
      if (prevClient) {
        set((s) => ({ clients: [...s.clients, prevClient] }));
      }
      console.error("Failed to delete client:", e);
      return false;
    }
  },

  createDocument: async (type, clientId) => {
    try {
      const doc = await apiFetch("/api/documents", {
        method: "POST",
        body: JSON.stringify({ type, clientId }),
      });
      set((s) => ({ documents: [doc, ...s.documents] }));
      return doc as InvoiceDocument;
    } catch (e) {
      console.error("Failed to create document:", e);
      const err = e as ApiError;
      if (err.code === "NO_CLIENTS") {
        toast({
          title: "Create a client first",
          description: "Go to the Clients tab and add at least one client.",
          variant: "destructive",
        });
      } else if (err.code === "FREE_TIER_LIMIT") {
        toast({
          title: "Free tier limit reached",
          description: err.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Could not create document",
          description: err.message,
          variant: "destructive",
        });
      }
      return null;
    }
  },

  convertQuoteToInvoice: async (quoteId) => {
    try {
      const doc = await apiFetch(`/api/documents/${quoteId}/convert`, {
        method: "POST",
      });
      // Update both the new invoice and the converted quote
      set((s) => ({
        documents: [
          doc,
          ...s.documents.map((d) =>
            d.id === quoteId ? { ...d, status: "converted" as DocumentStatus } : d,
          ),
        ],
      }));
      return doc as InvoiceDocument;
    } catch (e) {
      console.error("Failed to convert quote:", e);
      toast({
        title: "Conversion failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    }
  },

  // Document update: local + debounced save (no response replacement)
  updateDocument: (id, patch) => {
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
    scheduleSave(id, get);
  },

  // Explicit save — clears pending timer, sends immediately
  saveDocument: async (docId) => {
    // Clear any pending debounced save
    if (saveTimers.has(docId)) {
      clearTimeout(saveTimers.get(docId)!);
      saveTimers.delete(docId);
    }
    const doc = get().documents.find((d) => d.id === docId);
    if (!doc) return;
    try {
      await apiFetch(`/api/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify(buildSavePayload(doc)),
      });
      failedSaves.delete(docId);
    } catch (e) {
      console.error("Save failed:", e);
      failedSaves.add(docId);
      toast({
        title: "Save failed",
        description: "Network error — please try again.",
        variant: "destructive",
      });
      throw e;
    }
  },

  // Flush pending debounced save immediately (used before navigation)
  flushPendingSave: async (docId) => {
    if (saveTimers.has(docId)) {
      clearTimeout(saveTimers.get(docId)!);
      saveTimers.delete(docId);
      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;
      try {
        await apiFetch(`/api/documents/${docId}`, {
          method: "PUT",
          body: JSON.stringify(buildSavePayload(doc)),
        });
        failedSaves.delete(docId);
      } catch (e) {
        console.error("Flush save failed:", e);
        failedSaves.add(docId);
      }
    }
  },

  updateDocumentItem: (docId, itemId, patch) => {
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              updatedAt: new Date().toISOString(),
              items: d.items.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it,
              ),
            }
          : d,
      ),
    }));
    scheduleSave(docId, get);
  },

  addDocumentItem: (docId) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
    };
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              updatedAt: new Date().toISOString(),
              items: [...d.items, newItem],
            }
          : d,
      ),
    }));
    scheduleSave(docId, get);
  },

  removeDocumentItem: (docId, itemId) => {
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              updatedAt: new Date().toISOString(),
              items: d.items.filter((it) => it.id !== itemId),
            }
          : d,
      ),
    }));
    scheduleSave(docId, get);
  },

  deleteDocument: async (id) => {
    const prevDoc = get().documents.find((d) => d.id === id);
    // Optimistic remove
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    // Clear any pending save for this doc
    if (saveTimers.has(id)) {
      clearTimeout(saveTimers.get(id)!);
      saveTimers.delete(id);
    }
    failedSaves.delete(id);
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      return true;
    } catch (e) {
      // Re-insert ONLY this document
      if (prevDoc) {
        set((s) => ({ documents: [prevDoc, ...s.documents] }));
      }
      console.error("Failed to delete document:", e);
      return false;
    }
  },

  // Status change: optimistic update + immediate API. Revert ONLY status fields on error.
  markAs: async (id, status) => {
    const prevDoc = get().documents.find((d) => d.id === id);
    if (!prevDoc) return false;

    // Optimistic update — only change status + timestamps
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              updatedAt: new Date().toISOString(),
              sentAt:
                status === "sent" && !d.sentAt
                  ? new Date().toISOString()
                  : status === "draft" || status === "overdue"
                    ? undefined
                    : d.sentAt,
              paidAt:
                status === "paid"
                  ? new Date().toISOString()
                  : undefined, // Clear paidAt when not paid
            }
          : d,
      ),
    }));

    try {
      await apiFetch(`/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return true;
    } catch (e) {
      // Revert ONLY this doc's status + timestamps — don't touch other fields
      set((s) => ({
        documents: s.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                status: prevDoc.status,
                sentAt: prevDoc.sentAt,
                paidAt: prevDoc.paidAt,
                updatedAt: prevDoc.updatedAt,
              }
            : d,
        ),
      }));
      console.error("Failed to update status:", e);
      toast({
        title: "Status update failed",
        description: "Reverted to previous status.",
        variant: "destructive",
      });
      return false;
    }
  },
}));

// Build the save payload from a document (shared by debounced + explicit save)
function buildSavePayload(doc: InvoiceDocument) {
  return {
    items: doc.items,
    taxRate: doc.taxRate,
    globalDiscountPercent: doc.globalDiscountPercent,
    notes: doc.notes,
    paymentTerms: doc.paymentTerms,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    status: doc.status,
    clientId: doc.clientId,
    clientName: doc.clientSnapshot.name,
    clientEmail: doc.clientSnapshot.email ?? null,
    clientPhone: doc.clientSnapshot.phone ?? null,
    clientCompany: doc.clientSnapshot.company ?? null,
    clientAddress: doc.clientSnapshot.address ?? null,
    clientVatNumber: doc.clientSnapshot.vatNumber ?? null,
  };
}

// Flush ALL pending saves (used before sign-out)
function flushAllPendingSaves(get: () => StoreState) {
  const docIds = [...saveTimers.keys()];
  for (const docId of docIds) {
    const timer = saveTimers.get(docId);
    if (timer) clearTimeout(timer);
    saveTimers.delete(docId);
    const doc = get().documents.find((d) => d.id === docId);
    if (doc) {
      // Fire-and-forget — we're signing out
      apiFetch(`/api/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify(buildSavePayload(doc)),
      }).catch((e) => console.error("Final flush save failed:", e));
    }
  }
}

// Debounced document save — 800ms after last edit
function scheduleSave(docId: string, get: () => StoreState) {
  if (saveTimers.has(docId)) {
    clearTimeout(saveTimers.get(docId)!);
  }
  saveTimers.set(
    docId,
    setTimeout(async () => {
      saveTimers.delete(docId);
      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;
      try {
        await apiFetch(`/api/documents/${docId}`, {
          method: "PUT",
          body: JSON.stringify(buildSavePayload(doc)),
        });
        failedSaves.delete(docId);
      } catch (e) {
        console.error("Debounced save failed:", e);
        failedSaves.add(docId);
        toast({
          title: "Save failed",
          description: "Retrying in 3 seconds...",
          variant: "destructive",
        });
        // Auto-retry once after 3 seconds
        setTimeout(async () => {
          const retryDoc = get().documents.find((d) => d.id === docId);
          if (!retryDoc) return;
          try {
            await apiFetch(`/api/documents/${docId}`, {
              method: "PUT",
              body: JSON.stringify(buildSavePayload(retryDoc)),
            });
            failedSaves.delete(docId);
            toast({ title: "Save succeeded", description: "Your changes are synced." });
          } catch (e2) {
            console.error("Retry save failed:", e2);
          }
        }, 3000);
      }
    }, 800),
  );
}

// Debounced business save — mirrors document save pattern
function scheduleBusinessSave(get: () => StoreState) {
  if (businessSaveTimer) {
    clearTimeout(businessSaveTimer);
  }
  businessSaveTimer = setTimeout(async () => {
    businessSaveTimer = null;
    const business = get().business;
    try {
      await apiFetch("/api/business", {
        method: "PUT",
        body: JSON.stringify(business),
      });
      businessSaveFailed = false;
    } catch (e) {
      console.error("Business debounced save failed:", e);
      businessSaveFailed = true;
      toast({
        title: "Settings save failed",
        description: "Retrying in 3 seconds...",
        variant: "destructive",
      });
      // Auto-retry
      setTimeout(async () => {
        const retryBiz = get().business;
        try {
          await apiFetch("/api/business", {
            method: "PUT",
            body: JSON.stringify(retryBiz),
          });
          businessSaveFailed = false;
          toast({ title: "Settings saved", description: "Your changes are synced." });
        } catch (e2) {
          console.error("Business retry failed:", e2);
        }
      }, 3000);
    }
  }, 800);
}

// Export for beforeunload guard
export function hasPendingOrFailedSaves(): boolean {
  return saveTimers.size > 0 || failedSaves.size > 0 || businessSaveTimer !== null || businessSaveFailed;
}
