import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { api } from "./client";

export type SupportTicketType = "BUG" | "FEATURE" | "QUESTION" | "CONTACT" | "GENERAL";
export type SupportBugCategory =
  | "LOGIN"
  | "FEED"
  | "CHAT"
  | "MATRIMONY"
  | "MARKETPLACE"
  | "JOBS"
  | "PAYMENTS"
  | "NOTIFICATIONS"
  | "OTHER";

export type SupportTicketStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "IN_PROGRESS"
  | "PLANNED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESOLVED"
  | "RELEASED"
  | "CLOSED";

export type SupportTicket = {
  id: number;
  ref: string;
  type: SupportTicketType;
  category: SupportBugCategory | null;
  title: string;
  description: string;
  status: SupportTicketStatus;
  priority: string;
  screenshotUrl: string | null;
  recordingUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages?: Array<{
    id: number;
    authorType: "USER" | "ADMIN";
    authorUserId: number | null;
    body: string;
    createdAt: string;
  }>;
};

export type SupportFaq = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

export type SupportGuide = {
  id: number;
  title: string;
  summary: string | null;
};

export type SupportGuideDetail = SupportGuide & {
  steps: Array<{
    id: number;
    sortOrder: number;
    title: string;
    body: string;
    imageUrl: string | null;
  }>;
};

export type SupportContact = {
  email: string | null;
  whatsappNumber: string | null;
  phoneNumber: string | null;
  chatEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  callEnabled: boolean;
  supportNote: string | null;
};

export const BUG_CATEGORIES: Array<{ value: SupportBugCategory; label: string }> = [
  { value: "LOGIN", label: "Login" },
  { value: "FEED", label: "Feed" },
  { value: "CHAT", label: "Chat" },
  { value: "MATRIMONY", label: "Matrimony" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "JOBS", label: "Jobs" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "NOTIFICATIONS", label: "Notifications" },
  { value: "OTHER", label: "Other" }
];

export function collectSupportMetadata(extra?: {
  screen?: string;
  community?: string | null;
  userId?: number;
}): Record<string, unknown> {
  let appVersion = "1.0.0";
  try {
    appVersion =
      Constants.expoConfig?.version ||
      (Constants as any).nativeAppVersion ||
      "1.0.0";
  } catch {
    /* ignore */
  }
  const deviceModel =
    [Device.brand, Device.modelName].filter(Boolean).join(" ") ||
    Device.deviceName ||
    Platform.OS;

  return {
    appVersion,
    apiVersion: "v1",
    platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
    osVersion: String(Device.osVersion ?? Platform.Version ?? ""),
    deviceModel,
    networkStatus: "unknown",
    submittedAt: new Date().toISOString(),
    screen: extra?.screen ?? "HelpSupport",
    community: extra?.community ?? null,
    userId: extra?.userId
  };
}

export async function getSupportHome() {
  const res = await api.get<{
    ok: true;
    openTicketCount: number;
    sections: Array<{ id: string; title: string; subtitle: string }>;
  }>("/support/home");
  return res.data;
}

export async function listSupportFaqs(): Promise<SupportFaq[]> {
  const res = await api.get<{ ok: true; faqs: SupportFaq[] }>("/support/faqs");
  return res.data.faqs ?? [];
}

export async function listSupportGuides(): Promise<SupportGuide[]> {
  const res = await api.get<{ ok: true; guides: SupportGuide[] }>("/support/guides");
  return res.data.guides ?? [];
}

export async function getSupportGuide(guideId: number): Promise<SupportGuideDetail> {
  const res = await api.get<{ ok: true; guide: SupportGuideDetail }>(`/support/guides/${guideId}`);
  return res.data.guide;
}

export async function getSupportContact(): Promise<SupportContact> {
  const res = await api.get<{ ok: true; contact: SupportContact }>("/support/contact");
  return res.data.contact;
}

export async function createSupportTicket(payload: {
  type: SupportTicketType;
  category?: SupportBugCategory | null;
  title: string;
  description: string;
  screenshotUrl?: string | null;
  recordingUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<SupportTicket> {
  const res = await api.post<{ ok: true; ticket: SupportTicket }>("/support/tickets", payload);
  return res.data.ticket;
}

export async function listMySupportTickets(): Promise<SupportTicket[]> {
  const res = await api.get<{ ok: true; tickets: SupportTicket[] }>("/support/tickets");
  return res.data.tickets ?? [];
}

export async function getMySupportTicket(ticketId: number): Promise<SupportTicket> {
  const res = await api.get<{ ok: true; ticket: SupportTicket }>(`/support/tickets/${ticketId}`);
  return res.data.ticket;
}

export async function replySupportTicket(ticketId: number, body: string): Promise<SupportTicket> {
  const res = await api.post<{ ok: true; ticket: SupportTicket }>(
    `/support/tickets/${ticketId}/messages`,
    { body }
  );
  return res.data.ticket;
}
