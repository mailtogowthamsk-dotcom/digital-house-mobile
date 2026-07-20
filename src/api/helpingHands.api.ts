import { api } from "./client";

export type HelpingHandsStats = {
  peopleHelped: number;
  activeVolunteers: number;
  requestsCompleted: number;
  livesTouched: number;
};

export type CommunityHero = {
  userId: number;
  name: string;
  profileImage: string | null;
  intro: string | null;
  livesHelped: number;
  categories: string[];
  recentAppreciation: string | null;
};

export type MyHelpRequest = {
  postId: number;
  title: string;
  category: string | null;
  status: string;
  createdAt: string;
  helperCount: number;
};

export type MyHelpContribution = {
  postId: number;
  title: string;
  category: string | null;
  personHelped: string;
  date: string;
  appreciation: string | null;
};

export type HelpHelper = {
  id: number;
  from_user_id: number;
  message: string | null;
  created_at: string;
  author: { id: number; name: string; profile_image: string | null };
};

export type OfferHelpResult = {
  offered: boolean;
  created: boolean;
  offerId: number;
  requesterUserId: number;
  canMessage: boolean;
  contactPhone: string | null;
};

export async function getHelpingHandsStats(): Promise<HelpingHandsStats> {
  const { data } = await api.get<{ ok: boolean } & HelpingHandsStats>("/helping-hands/stats");
  if (!data.ok) throw new Error("Failed to load stats");
  return {
    peopleHelped: data.peopleHelped ?? 0,
    activeVolunteers: data.activeVolunteers ?? 0,
    requestsCompleted: data.requestsCompleted ?? 0,
    livesTouched: data.livesTouched ?? 0
  };
}

export async function getCommunityHeroes(limit = 20): Promise<CommunityHero[]> {
  const { data } = await api.get<{ ok: boolean; items: CommunityHero[] }>(
    "/helping-hands/heroes",
    { params: { limit } }
  );
  if (!data.ok) throw new Error("Failed to load heroes");
  return data.items ?? [];
}

export async function getMyHelpingActivity(): Promise<{
  requests: MyHelpRequest[];
  contributions: MyHelpContribution[];
}> {
  const { data } = await api.get<{
    ok: boolean;
    requests: MyHelpRequest[];
    contributions: MyHelpContribution[];
  }>("/helping-hands/my-activity");
  if (!data.ok) throw new Error("Failed to load activity");
  return {
    requests: data.requests ?? [],
    contributions: data.contributions ?? []
  };
}

export async function offerHelp(
  postId: number,
  message?: string | null
): Promise<OfferHelpResult> {
  const { data } = await api.post<{ ok: boolean } & OfferHelpResult>(
    `/helping-hands/requests/${postId}/offer`,
    { message: message ?? null }
  );
  if (!data.ok) throw new Error("Failed to offer help");
  return data as OfferHelpResult;
}

export async function listHelpHelpers(postId: number): Promise<{
  items: HelpHelper[];
  total: number;
}> {
  const { data } = await api.get<{ ok: boolean; items: HelpHelper[]; total: number }>(
    `/helping-hands/requests/${postId}/helpers`
  );
  if (!data.ok) throw new Error("Failed to load helpers");
  return { items: data.items ?? [], total: data.total ?? 0 };
}

export async function completeHelpRequest(
  postId: number,
  opts?: { helper_user_id?: number; appreciation?: string | null }
): Promise<{ status: string; appreciationSaved: boolean }> {
  const { data } = await api.post<{
    ok: boolean;
    status: string;
    appreciationSaved: boolean;
  }>(`/helping-hands/requests/${postId}/complete`, opts ?? {});
  if (!data.ok) throw new Error("Failed to complete request");
  return { status: data.status, appreciationSaved: data.appreciationSaved };
}

export async function extendHelpRequest(postId: number): Promise<{
  status: string;
  helpExpiresAt: string;
  helpExtendedCount: number;
  maxExtends: number;
}> {
  const { data } = await api.post<{
    ok: boolean;
    status: string;
    helpExpiresAt: string;
    helpExtendedCount: number;
    maxExtends: number;
  }>(`/helping-hands/requests/${postId}/extend`);
  if (!data.ok) throw new Error("Failed to extend request");
  return {
    status: data.status,
    helpExpiresAt: data.helpExpiresAt,
    helpExtendedCount: data.helpExtendedCount,
    maxExtends: data.maxExtends
  };
}
