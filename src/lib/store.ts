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
import { DEFAULT_BUSINESS, symbolForCurrency, addDaysISO, todayISO } from "./format";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  allocatedFeatures: FeatureKey[];
}

interface StoreState {
  // Auth
  authUser: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  justSignedUp: boolean; // for showing "check email" message

  // Data
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
  updateBusiness: (patch: Partial<BusinessProfile>) => Promise<void>;

  // Clients
  upsertClient: (client: Client) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<void>;

  // Documents
  createDocument: (type: DocumentType, clientId?: string) => Promise<InvoiceDocument | null>;
  convertQuoteToInvoice: (quoteId: string) => Promise<InvoiceDocument | null>;
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => Promise<void>;
  saveDocument: (docId: string) => Promise<void>; // explicit save
  updateDocumentItem: (docId: string, itemId: string, patch: Partial<LineItem>) => void;
  addDocumentItem: (docId: string) => void;
  removeDocumentItem: (docId: string, itemId: string) => void;
  deleteDocument: (id: string) => Promise<void>;
  markAs: (id: string, status: DocumentStatus) => Promise<void>;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

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
      // If Supabase requires email confirmation, we won't auto-sign-in.
      // Set justSignedUp = true to show "check email" message.
      if (result.requiresEmailConfirmation) {
        set({ authLoading: false, justSignedUp: true, authUser: null });
        return;
      }
      // Auto sign-in after signup (when email confirmation is disabled)
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
    }
  },

  loadFromServer: async () => {
    set({ dataLoading: true });
    try {
      const [business, clients, documents] = await Promise.all([
        apiFetch("/api/business"),
        apiFetch("/api/clients"),
        apiFetch("/api/documents"),
      ]);
      set({ business, clients, documents, dataLoading: false });
    } catch (e) {
      set({ dataLoading: false });
      console.error("Failed to load data:", e);
    }
  },

  updateBusiness: async (patch) => {
    const prev = get().business;
    const next: Partial<BusinessProfile> = { ...patch };
    if (patch.currency) {
      next.currencySymbol = symbolForCurrency(patch.currency);
    }
    set({ business: { ...prev, ...next } });

    try {
      const updated = await apiFetch("/api/business", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      set({ business: updated });
    } catch (e) {
      console.error("Failed to update business:", e);
      set({ business: prev });
      throw e;
    }
  },

  upsertClient: async (client) => {
    const exists = get().clients.some((c) => c.id === client.id);
    if (exists) {
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
        console.error("Failed to update client:", e);
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
    const prev = get().clients;
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    try {
      await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete client:", e);
      set({ clients: prev });
      throw e;
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
      return null;
    }
  },

  convertQuoteToInvoice: async (quoteId) => {
    try {
      const doc = await apiFetch(`/api/documents/${quoteId}/convert`, {
        method: "POST",
      });
      set((s) => ({
        documents: [doc, ...s.documents.map((d) =>
          d.id === quoteId ? { ...d, status: "converted" as DocumentStatus } : d
        )],
      }));
      return doc as InvoiceDocument;
    } catch (e) {
      console.error("Failed to convert quote:", e);
      return null;
    }
  },

  updateDocument: async (id, patch) => {
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));

    try {
      const doc = get().documents.find((d) => d.id === id);
      const body: Record<string, unknown> = { ...patch };
      if (doc) {
        body.items = doc.items;
      }
      const updated = await apiFetch(`/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      set((s) => ({
        documents: s.documents.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (e) {
      console.error("Failed to update document:", e);
      throw e;
    }
  },

  saveDocument: async (docId) => {
    const doc = get().documents.find((d) => d.id === docId);
    if (!doc) return;
    try {
      const updated = await apiFetch(`/api/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify({
          items: doc.items,
          taxRate: doc.taxRate,
          globalDiscountPercent: doc.globalDiscountPercent,
          notes: doc.notes,
          paymentTerms: doc.paymentTerms,
          issueDate: doc.issueDate,
          dueDate: doc.dueDate,
          status: doc.status,
        }),
      });
      set((s) => ({
        documents: s.documents.map((d) => (d.id === docId ? updated : d)),
      }));
    } catch (e) {
      console.error("Save failed:", e);
      throw e;
    }
  },

  // For line items — local update + debounced save
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
    const prev = get().documents;
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete document:", e);
      set({ documents: prev });
      throw e;
    }
  },

  markAs: async (id, status) => {
    const prev = get().documents;
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
                  : d.sentAt,
              paidAt:
                status === "paid" ? new Date().toISOString() : d.paidAt,
            }
          : d,
      ),
    }));

    try {
      await apiFetch(`/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error("Failed to update status:", e);
      set({ documents: prev });
      throw e;
    }
  },
}));

// Debounced save — fires after 800ms of no edits to prevent excessive API calls
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
          body: JSON.stringify({
            items: doc.items,
            taxRate: doc.taxRate,
            globalDiscountPercent: doc.globalDiscountPercent,
            notes: doc.notes,
            paymentTerms: doc.paymentTerms,
            issueDate: doc.issueDate,
            dueDate: doc.dueDate,
          }),
        });
      } catch (e) {
        console.error("Debounced save failed:", e);
      }
    }, 800),
  );
}
