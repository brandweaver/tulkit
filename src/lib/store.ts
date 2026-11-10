"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type {
  AppData,
  BusinessProfile,
  Client,
  InvoiceDocument,
  LineItem,
  DocumentType,
} from "./types";
import {
  DEFAULT_BUSINESS,
  symbolForCurrency,
  todayISO,
  addDaysISO,
} from "./format";

interface StoreState {
  business: BusinessProfile;
  clients: Client[];
  documents: InvoiceDocument[];

  // Business profile
  updateBusiness: (patch: Partial<BusinessProfile>) => void;

  // Clients
  upsertClient: (client: Client) => void;
  deleteClient: (id: string) => void;

  // Documents
  createDocument: (type: DocumentType, clientId?: string) => InvoiceDocument;
  updateDocument: (id: string, patch: Partial<InvoiceDocument>) => void;
  updateDocumentItem: (docId: string, itemId: string, patch: Partial<LineItem>) => void;
  addDocumentItem: (docId: string) => void;
  removeDocumentItem: (docId: string, itemId: string) => void;
  deleteDocument: (id: string) => void;
  markAs: (id: string, status: InvoiceDocument["status"]) => void;

  // Utility
  resetAll: () => void;
  seedSampleData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      business: { ...DEFAULT_BUSINESS },
      clients: [],
      documents: [],

      updateBusiness: (patch) =>
        set((s) => {
          const next: Partial<BusinessProfile> = { ...patch };
          if (patch.currency) {
            next.currencySymbol = symbolForCurrency(patch.currency);
          }
          return { business: { ...s.business, ...next } };
        }),

      upsertClient: (client) =>
        set((s) => {
          const exists = s.clients.some((c) => c.id === client.id);
          return {
            clients: exists
              ? s.clients.map((c) => (c.id === client.id ? client : c))
              : [...s.clients, client],
          };
        }),

      deleteClient: (id) =>
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      createDocument: (type, clientId) => {
        const state = get();
        const client =
          state.clients.find((c) => c.id === clientId) ??
          state.clients[0] ??
          {
            id: uuid(),
            name: "New Client",
            email: "",
            phone: "",
            company: "",
            address: "",
            vatNumber: "",
          };

        // ensure client is in the list
        if (!state.clients.some((c) => c.id === client.id)) {
          set((s) => ({ clients: [...s.clients, client] }));
        }

        const b = state.business;
        const num = type === "invoice" ? b.nextInvoiceNumber : b.nextQuoteNumber;
        const prefix = type === "invoice" ? b.invoicePrefix : b.quotePrefix;
        const number = `${prefix}-${String(num).padStart(4, "0")}`;

        // advance the counter
        if (type === "invoice") {
          set((s) => ({
            business: { ...s.business, nextInvoiceNumber: s.business.nextInvoiceNumber + 1 },
          }));
        } else {
          set((s) => ({
            business: { ...s.business, nextQuoteNumber: s.business.nextQuoteNumber + 1 },
          }));
        }

        const now = new Date().toISOString();
        const doc: InvoiceDocument = {
          id: uuid(),
          type,
          number,
          status: "draft",
          clientId: client.id,
          clientSnapshot: { ...client },
          issueDate: todayISO(),
          dueDate: addDaysISO(todayISO(), 7),
          items: [
            {
              id: uuid(),
              description: "",
              quantity: 1,
              unitPrice: 0,
              discountPercent: 0,
            },
          ],
          taxRate: b.defaultTaxRate,
          globalDiscountPercent: 0,
          notes: type === "invoice" ? "Thank you for your business." : "",
          paymentTerms: b.defaultPaymentTerms,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ documents: [doc, ...s.documents] }));
        return doc;
      },

      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id
              ? { ...d, ...patch, updatedAt: new Date().toISOString() }
              : d,
          ),
        })),

      updateDocumentItem: (docId, itemId, patch) =>
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
        })),

      addDocumentItem: (docId) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  updatedAt: new Date().toISOString(),
                  items: [
                    ...d.items,
                    {
                      id: uuid(),
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      discountPercent: 0,
                    },
                  ],
                }
              : d,
          ),
        })),

      removeDocumentItem: (docId, itemId) =>
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
        })),

      deleteDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      markAs: (id, status) =>
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
        })),

      resetAll: () =>
        set({
          business: { ...DEFAULT_BUSINESS },
          clients: [],
          documents: [],
        }),

      seedSampleData: () => {
        const state = get();
        const c1: Client = {
          id: uuid(),
          name: "Thabo Mokoena",
          email: "thabo@example.co.za",
          phone: "+27 82 555 0101",
          company: "Mokoena Plumbing Pty Ltd",
          address: "12 Main Road, Sandton, Johannesburg",
          vatNumber: "43212345",
        };
        const c2: Client = {
          id: uuid(),
          name: "Sarah Williams",
          email: "sarah@studio-creative.co.za",
          phone: "+27 71 555 0202",
          company: "Studio Creative",
          address: "5 Long Street, Cape Town",
        };
        const c3: Client = {
          id: uuid(),
          name: "Lerato Nkosi",
          email: "lerato@growhub.co.za",
          phone: "+27 83 555 0303",
          company: "GrowHub Consulting",
          address: "88 Smith Street, Durban",
        };

        const now = new Date().toISOString();
        const mk = (
          type: DocumentType,
          number: string,
          client: Client,
          items: LineItem[],
          status: InvoiceDocument["status"],
          issueDaysAgo: number,
          dueInDays: number,
          taxRate = 15,
        ): InvoiceDocument => {
          const issue = addDaysISO(todayISO(), -issueDaysAgo);
          const due = addDaysISO(issue, dueInDays);
          return {
            id: uuid(),
            type,
            number,
            status,
            clientId: client.id,
            clientSnapshot: { ...client },
            issueDate: issue,
            dueDate: due,
            items,
            taxRate,
            globalDiscountPercent: 0,
            notes: type === "invoice" ? "Thank you for your business." : "",
            paymentTerms: "Payment due within 7 days of issue date.",
            createdAt: now,
            updatedAt: now,
            sentAt: status !== "draft" ? now : undefined,
            paidAt: status === "paid" ? now : undefined,
          };
        };

        const docs: InvoiceDocument[] = [
          mk(
            "invoice",
            "INV-0001",
            c1,
            [
              { id: uuid(), description: "Bathroom tap replacement", quantity: 1, unitPrice: 850, discountPercent: 0 },
              { id: uuid(), description: "Emergency callout fee", quantity: 1, unitPrice: 450, discountPercent: 0 },
              { id: uuid(), description: "PVC pipe fittings", quantity: 4, unitPrice: 95, discountPercent: 0 },
            ],
            "paid",
            12,
            7,
          ),
          mk(
            "invoice",
            "INV-0002",
            c2,
            [
              { id: uuid(), description: "Logo design — 3 concepts", quantity: 1, unitPrice: 3200, discountPercent: 0 },
              { id: uuid(), description: "Brand colour palette", quantity: 1, unitPrice: 1200, discountPercent: 0 },
            ],
            "sent",
            4,
            14,
          ),
          mk(
            "quote",
            "QUO-0001",
            c3,
            [
              { id: uuid(), description: "Website redesign — discovery & UX", quantity: 1, unitPrice: 8500, discountPercent: 0 },
              { id: uuid(), description: "Website redesign — build (per page)", quantity: 8, unitPrice: 1850, discountPercent: 5 },
              { id: uuid(), description: "CMS training session", quantity: 2, unitPrice: 750, discountPercent: 0 },
            ],
            "viewed",
            2,
            30,
          ),
          mk(
            "invoice",
            "INV-0003",
            c1,
            [
              { id: uuid(), description: "Geyser installation", quantity: 1, unitPrice: 4800, discountPercent: 0 },
              { id: uuid(), description: "Old geyser disposal", quantity: 1, unitPrice: 350, discountPercent: 0 },
            ],
            "overdue",
            20,
            7,
          ),
        ];

        set((s) => ({
          clients: [...s.clients.filter((c) => !docs.some((d) => d.clientId === c.id)), c1, c2, c3],
          documents: [...docs, ...s.documents],
          business: {
            ...s.business,
            nextInvoiceNumber: 4,
            nextQuoteNumber: 2,
          },
        }));
      },
    }),
    {
      name: "invoice-maker-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
