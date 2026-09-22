import { api } from "./client";

export type HelpingHandsStats = {
  peopleHelped: number;
  activeVolunteers: number;
  requestsCompleted: number;
  livesTouched: number;
  /** OPEN + IN_PROGRESS requests in the community (not expired filter is feed-side). */
  activeRequests: number;
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

export type PaginatedResult<T> = {
  items: T[];
  nextOffset: number | null;
};

export async function getHelpingHandsStats(): Promise<HelpingHandsStats> {
  const { data } = await api.get<{ ok: boolean } & HelpingHandsStats>("/helping-hands/stats");
  if (!data.ok) throw new Error("Failed to load stats");
  return {
    peopleHelped: data.peopleHelped ?? 0,
    activeVolunteers: data.activeVolunteers ?? 0,
    requestsCompleted: data.requestsCompleted ?? 0,
    livesTouched: data.livesTouched ?? 0,
    activeRequests: data.activeRequests ?? 0
  };
}

export async function getCommunityHeroes(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<CommunityHero>> {
  const { data } = await api.get<{
    ok: boolean;
    items: CommunityHero[];
    nextOffset?: number | null;
  }>("/helping-hands/heroes", {
    params: {
      limit: opts?.limit ?? 10,
      offset: opts?.offset ?? 0
    }
  });
  if (!data.ok) throw new Error("Failed to load heroes");
  return {
    items: data.items ?? [],
    nextOffset: data.nextOffset ?? null
  };
}

export async function getMyHelpRequestsPage(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<MyHelpRequest>> {
  const { data } = await api.get<{
    ok: boolean;
    items: MyHelpRequest[];
    nextOffset?: number | null;
  }>("/helping-hands/my-activity", {
    params: {
      section: "requests",
      limit: opts?.limit ?? 10,
      offset: opts?.offset ?? 0
    }
  });
  if (!data.ok) throw new Error("Failed to load requests");
  return {
    items: data.items ?? [],
    nextOffset: data.nextOffset ?? null
  };
}

export async function getMyHelpContributionsPage(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<MyHelpContribution>> {
  const { data } = await api.get<{
    ok: boolean;
    items: MyHelpContribution[];
    nextOffset?: number | null;
  }>("/helping-hands/my-activity", {
    params: {
      section: "contributions",
      limit: opts?.limit ?? 10,
      offset: opts?.offset ?? 0
    }
  });
  if (!data.ok) throw new Error("Failed to load contributions");
  return {
    items: data.items ?? [],
    nextOffset: data.nextOffset ?? null
  };
}

/** First page of both activity sections (10 each). Prefer section pages for scroll. */
export async function getMyHelpingActivity(): Promise<{
  requests: MyHelpRequest[];
  contributions: MyHelpContribution[];
  nextRequestsOffset: number | null;
  nextContributionsOffset: number | null;
}> {
  const { data } = await api.get<{
    ok: boolean;
    requests: MyHelpRequest[];
    contributions: MyHelpContribution[];
    nextRequestsOffset?: number | null;
    nextContributionsOffset?: number | null;
  }>("/helping-hands/my-activity");
  if (!data.ok) throw new Error("Failed to load activity");
  return {
    requests: data.requests ?? [],
    contributions: data.contributions ?? [],
    nextRequestsOffset: data.nextRequestsOffset ?? null,
    nextContributionsOffset: data.nextContributionsOffset ?? null
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
  opts?: {
    resolved_by_user_ids?: number[];
    helper_user_id?: number;
    appreciation?: string | null;
  }
): Promise<{ status: string; creditedCount: number; appreciationSaved: boolean }> {
  const { data } = await api.post<{
    ok: boolean;
    status: string;
    creditedCount?: number;
    appreciationSaved: boolean;
  }>(`/helping-hands/requests/${postId}/complete`, opts ?? {});
  if (!data.ok) throw new Error("Failed to complete request");
  return {
    status: data.status,
    creditedCount: data.creditedCount ?? 0,
    appreciationSaved: data.appreciationSaved
  };
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
