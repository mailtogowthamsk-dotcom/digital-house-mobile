import { api } from "./client";
import type { FeedItem } from "./home.api";

export type ExploreSearchResponse = {
  items: FeedItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  query: string;
};

export type ExploreDiscoveryResponse = {
  trendingHashtags: Array<{ tag: string; usageCount: number }>;
  suggestedTopics: Array<{ id: string; label: string }>;
};

export async function searchExplore(params: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<ExploreSearchResponse> {
  const res = await api.get<{ ok: true } & ExploreSearchResponse>("/explore/search", {
    params: {
      q: params.q,
      page: params.page ?? 1,
      limit: params.limit ?? 20
    }
  });
  return {
    items: res.data.items ?? [],
    page: res.data.page,
    limit: res.data.limit,
    total: res.data.total,
    hasMore: res.data.hasMore,
    query: res.data.query
  };
}

export async function getExploreDiscovery(): Promise<ExploreDiscoveryResponse> {
  const res = await api.get<{ ok: true } & ExploreDiscoveryResponse>("/explore/discovery");
  return {
    trendingHashtags: res.data.trendingHashtags ?? [],
    suggestedTopics: res.data.suggestedTopics ?? []
  };
}
