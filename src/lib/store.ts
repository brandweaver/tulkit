"use client";

import { create } from "zustand";
import type {
  BusinessProfile,
  Client,
  InvoiceDocument,
  LineItem,
  DocumentType,
  DocumentStatus,
} from "./types";
import { DEFAULT_BUSINESS, symbolForCurrency } from "./format";

interface AuthUser {
  id: string;
  email: string;
}

interface StoreState {
  // Auth
  authUser: AuthUser | null;
  authLoading: boolean;
  authError: string | null;

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
  resetData: () => void;

  // Business
  updateBusiness: (patch: Partial<BusinessProfile>) => Promise<void>;

  // Clients
  upsertClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Documents
  createDocument: (type: DocumentType, clientId?: string) => Promise<InvoiceDocument | null>;
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => Promise<void>;
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

  business: { ...DEFAULT_BUSINESS },
  clients: [],
  documents: [],
  dataLoading: false,

  fetchAuthUser: async () => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiFetch("/api/auth/me");
      set({ authUser: data.user, authLoading: false });
    } catch (e) {
      set({ authUser: null, authLoading: false, authError: String(e) });
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
      set({ authUser: me.user, authLoading: false });
    } catch (e) {
      set({ authLoading: false, authError: String(e) });
      throw e;
    }
  },

  signUp: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Auto-sign-in after signup
      await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const me = await apiFetch("/api/auth/me");
      set({ authUser: me.user, authLoading: false });
    } catch (e) {
      set({ authLoading: false, authError: String(e) });
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

  resetData: () => {
    set({
      business: { ...DEFAULT_BUSINESS },
      clients: [],
      documents: [],
    });
  },

  updateBusiness: async (patch) => {
    // Optimistic update
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
      } catch (e) {
        console.error("Failed to update client:", e);
        throw e;
      }
    } else {
      // Create new
      try {
        const created = await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(client),
        });
        set((s) => ({ clients: [created, ...s.clients] }));
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

  updateDocument: async (id, patch) => {
    // Optimistic update
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));

    try {
      // Get the current document state to send full items
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

  // For line items, we update locally and debounced-sync via updateDocument.
  // To keep things simple, we update locally and queue a sync.
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
    // Schedule a debounced save
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

// Debounced save helper — saves the document to the server after 800ms of no edits.
// This prevents excessive API calls when typing in line items.
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSave(
  docId: string,
  get: () => StoreState,
) {
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
