import { api } from "./client";

export type AdCatalog = {
  types: Array<{ code: string; label: string; mediaKind: string }>;
  pricing: Array<{
    id: number;
    typeCode: string;
    durationDays: number;
    pricePaise: number;
    priceInr: number;
    currency: string;
    refundOnReject: boolean;
  }>;
  payments: { razorpayEnabled: boolean; keyId: string | null; currency: string };
  ctaTypes?: Array<{ code: string; label: string }>;
  businessCategories?: Array<{ code: string; label: string }>;
};

export type AdvertisementCreative = {
  type?: "ADVERTISEMENT";
  business?: { name: string | null; category: string | null };
  content?: { title: string; shortDescription: string | null; description: string };
  contact?: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
  };
  location?: {
    address: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  cta?: { type: string; label: string; target: string | null };
};

export type FeedAdvertisement = AdvertisementCreative & {
  id: number;
  title: string;
  description: string;
  shortDescription?: string | null;
  ctaLabel: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaKind: string | null;
  typeCode: string;
  sponsoredLabel: string;
  destinationUrl?: string | null;
  validUntil?: string | null;
  businessName?: string | null;
  businessCategory?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  contactEmail?: string | null;
};

export type AdvertisementListItem = {
  id: number;
  title: string;
  businessName?: string | null;
  thumbnailUrl: string | null;
  mediaKind?: string | null;
  typeCode: string;
  status: string;
  durationDays: number | null;
  amountPaise: number | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  impressions: number;
  uniqueReach: number;
  clicks: number;
  ctr: number;
  remainingDays: number | null;
  invoiceAvailable?: boolean;
};

export type AdvertisementInvoice = {
  invoiceNumber: string;
  amountInr: number;
  gstPercent: number;
  gstAmountPaise: number;
  issuedAt?: string | null;
};

export async function getAdvertisementCatalog() {
  const { data } = await api.get("/advertisements/catalog");
  return data as AdCatalog;
}

export async function listMyAdvertisements(page = 1) {
  const { data } = await api.get("/advertisements/my", { params: { page, limit: 20 } });
  return data as { items: AdvertisementListItem[]; total: number; page: number };
}

export async function createAdvertisement(body: Record<string, unknown>) {
  const { data } = await api.post("/advertisements", body);
  return data.advertisement as { id: number };
}

export async function updateAdvertisement(id: number, body: Record<string, unknown>) {
  const { data } = await api.put(`/advertisements/${id}`, body);
  return data.advertisement;
}

export async function deleteAdvertisement(id: number) {
  const { data } = await api.delete(`/advertisements/${id}`);
  return data as { deleted: boolean };
}

export async function getAdvertisementDetail(id: number) {
  const { data } = await api.get(`/advertisements/${id}`);
  return data;
}

export async function quoteAdvertisement(id: number, pricingId: number) {
  const { data } = await api.post(`/advertisements/${id}/quote`, { pricingId });
  return data.quote as {
    amountPaise: number;
    amountInr: number;
    durationDays: number;
    gstPercent: number;
    gstAmountPaise: number;
    amountBeforeGstPaise: number;
    currency: string;
  };
}

export async function createAdvertisementPayment(id: number, pricingId: number, scheduledStartAt?: string) {
  const { data } = await api.post(`/advertisements/${id}/payment`, { pricingId, scheduledStartAt });
  return data as {
    order: {
      orderId: number;
      razorpayOrderId: string;
      amountPaise: number;
      currency: string;
      keyId: string;
      description: string;
    };
    quote: { amountPaise: number; amountInr: number; durationDays: number; gstPercent: number };
  };
}

export async function verifyAdvertisementPayment(body: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { data } = await api.post("/advertisements/payments/verify", body);
  return data;
}

export async function getAdvertisementAnalytics(id: number) {
  const { data } = await api.get(`/advertisements/${id}/analytics`);
  return data.analytics;
}

export async function getAdvertisementInvoice(id: number) {
  const { data } = await api.get(`/advertisements/${id}/invoice`);
  return data.invoice as AdvertisementInvoice;
}

export async function getAdvertisementFeed(
  placement: "home" | "explore" | "browse" = "home",
  excludeId?: number
) {
  const { data } = await api.get("/advertisements/feed", {
    params: { placement, ...(excludeId ? { excludeId } : {}) }
  });
  return data.advertisement as FeedAdvertisement | null;
}

export async function trackAdvertisementImpression(id: number, placement: string, eventId?: string) {
  await api.post(`/advertisements/${id}/impression`, { placement, eventId });
}

export async function trackAdvertisementClick(
  id: number,
  placement: string,
  eventId?: string,
  action?: string
) {
  const { data } = await api.post(`/advertisements/${id}/click`, { placement, eventId, action });
  return data as { destinationUrl?: string | null };
}

export async function reportAdvertisement(id: number, reason: string, details?: string) {
  const { data } = await api.post(`/advertisements/${id}/report`, { reason, details });
  return data as { reported?: boolean; duplicate?: boolean; message?: string };
}
