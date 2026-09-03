import { api } from "./client";

export type LegalCatalogItem = {
  documentKey: string;
  title: string;
  slug: string;
  description: string | null;
  version: string;
  publishedAt: string | null;
  requiredAtRegistration: boolean;
  requiresReacceptance: boolean;
  sortOrder: number;
};

export type LegalDocumentTypeDto = {
  id: number;
  documentKey: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  requiredAtRegistration: boolean;
  requiresReacceptance: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LegalDocumentDto = {
  id: number;
  documentKey: string;
  title: string;
  slug: string;
  contentFormat: "html" | "markdown" | string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  status: string;
  isPublished: boolean;
  publishedAt: string | null;
  changeSummary: string | null;
  content?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegalPublishedPayload = {
  type: LegalDocumentTypeDto | null;
  document: LegalDocumentDto;
};

export type LegalStatusItem = {
  documentKey: string;
  title: string;
  slug: string;
  requiredAtRegistration: boolean;
  requiresReacceptance: boolean;
  publishedVersion: string | null;
  publishedDocumentId: number | null;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  acceptedCurrent: boolean;
  needsAcceptance: boolean;
};

export type LegalAcceptanceStatus = {
  mustAccept: boolean;
  pending: LegalStatusItem[];
  registrationRequired: LegalStatusItem[];
  items: LegalStatusItem[];
};

export type LegalAcceptanceSource = "registration" | "reacceptance" | "settings";

export type LegalAcceptance = {
  documentKey: string;
  version: string;
};

/** Fallback labels when catalog is unavailable (no body text — still fetch on open). */
export const LEGAL_FALLBACK_LINKS: Array<{
  documentKey: string;
  title: string;
  slug: string;
}> = [
  { documentKey: "privacy_policy", title: "Privacy Policy", slug: "privacy-policy" },
  { documentKey: "terms", title: "Terms & Conditions", slug: "terms" },
  {
    documentKey: "community_guidelines",
    title: "Community Guidelines",
    slug: "community-guidelines"
  },
  { documentKey: "refund_policy", title: "Refund & Cancellation Policy", slug: "refund-policy" },
  {
    documentKey: "account_deletion",
    title: "Account Deletion & Data Retention",
    slug: "account-deletion"
  },
  { documentKey: "safety", title: "Safety & Abuse Reporting", slug: "safety" },
  { documentKey: "about", title: "About Us", slug: "about" },
  { documentKey: "cookie_policy", title: "Cookie Policy", slug: "cookie-policy" },
  { documentKey: "disclaimer", title: "Disclaimer", slug: "disclaimer" },
  { documentKey: "content_policy", title: "Content Moderation Policy", slug: "content-policy" }
];

export const LEGAL_REGISTRATION_KEYS = [
  "privacy_policy",
  "terms",
  "community_guidelines"
] as const;

/** GET /legal — published catalog. */
export async function listLegalCatalog(): Promise<LegalCatalogItem[]> {
  const { data } = await api.get<{ ok: boolean; documents?: LegalCatalogItem[] }>("/legal");
  if (!data?.ok) throw new Error("Failed to load legal documents");
  return Array.isArray(data.documents) ? data.documents : [];
}

/** GET /legal/:slugOrKey — published document body. */
export async function getLegalDocument(slugOrKey: string): Promise<LegalPublishedPayload> {
  const key = encodeURIComponent(String(slugOrKey || "").trim());
  const { data } = await api.get<{
    ok: boolean;
    type?: LegalDocumentTypeDto | null;
    document?: LegalDocumentDto;
    message?: string;
  }>(`/legal/${key}`);
  if (!data?.ok || !data.document) {
    throw new Error(data?.message || "Legal document not found");
  }
  return { type: data.type ?? null, document: data.document };
}

/** GET /legal/status — auth required. */
export async function getLegalStatus(): Promise<LegalAcceptanceStatus> {
  const { data } = await api.get<{ ok: boolean } & LegalAcceptanceStatus>("/legal/status");
  if (!data?.ok) throw new Error("Failed to load legal acceptance status");
  return {
    mustAccept: Boolean(data.mustAccept),
    pending: Array.isArray(data.pending) ? data.pending : [],
    registrationRequired: Array.isArray(data.registrationRequired)
      ? data.registrationRequired
      : [],
    items: Array.isArray(data.items) ? data.items : []
  };
}

/** POST /legal/accept — auth required. */
export async function acceptLegalDocuments(opts: {
  documentKeys: string[];
  source?: LegalAcceptanceSource;
}): Promise<{
  accepted: Array<{ documentKey: string; version: string; documentId: number }>;
  status: LegalAcceptanceStatus;
}> {
  const { data } = await api.post<{
    ok: boolean;
    accepted?: Array<{ documentKey: string; version: string; documentId: number }>;
    status?: LegalAcceptanceStatus;
    message?: string;
  }>("/legal/accept", {
    documentKeys: opts.documentKeys,
    source: opts.source ?? "reacceptance"
  });
  if (!data?.ok || !data.status) {
    throw new Error(data?.message || "Could not record acceptance");
  }
  return {
    accepted: data.accepted ?? [],
    status: data.status
  };
}
