import { api } from "./client";

export type ProminentCategory = {
  id: number;
  code: string;
  label: string;
  color: string;
  sortOrder: number;
};

export type ProminentPersonCard = {
  id: number;
  fullName: string;
  occupation: string | null;
  currentDesignation: string | null;
  shortDescription: string | null;
  category: ProminentCategory | null;
  profileImageUrl: string | null;
  heroImageUrl: string | null;
  isFeatured: boolean;
  verified: boolean;
};

export type ProminentGalleryItem = {
  id: number;
  imageUrl: string | null;
  caption: string | null;
};

export type ProminentTimelineEntry = {
  id: number;
  year: string;
  title: string;
  description: string | null;
};

export type ProminentPersonDetail = ProminentPersonCard & {
  biography: string | null;
  education: string | null;
  achievements: string | null;
  awards: string | null;
  communityContribution: string | null;
  gallery: ProminentGalleryItem[];
  timeline: ProminentTimelineEntry[];
};

export type ProminentSort = "latest" | "alphabetical";

export type ProminentPeopleListResult = {
  items: ProminentPersonCard[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function getProminentCategories(): Promise<ProminentCategory[]> {
  const { data } = await api.get<{ ok?: boolean; categories: ProminentCategory[] }>(
    "/prominent-people/categories"
  );
  return data.categories ?? [];
}

export async function getFeaturedProminentPeople(limit = 8): Promise<ProminentPersonCard[]> {
  const { data } = await api.get<{ ok?: boolean; items: ProminentPersonCard[] }>(
    "/prominent-people/featured",
    { params: { limit } }
  );
  return data.items ?? [];
}

export async function listProminentPeople(params: {
  q?: string;
  category?: string;
  sort?: ProminentSort;
  page?: number;
  limit?: number;
}): Promise<ProminentPeopleListResult> {
  const { data } = await api.get<{ ok?: boolean } & ProminentPeopleListResult>(
    "/prominent-people",
    {
      params: {
        ...(params.q ? { q: params.q } : {}),
        ...(params.category && params.category !== "all" ? { category: params.category } : {}),
        sort: params.sort ?? "latest",
        page: params.page ?? 1,
        limit: params.limit ?? 20
      }
    }
  );
  return {
    items: data.items ?? [],
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? 20,
    total: data.total ?? 0,
    hasMore: !!data.hasMore
  };
}

export async function getProminentPerson(id: number): Promise<ProminentPersonDetail> {
  const { data } = await api.get<{ ok?: boolean; person: ProminentPersonDetail }>(
    `/prominent-people/${id}`
  );
  if (!data.person) throw new Error("Person not found");
  return data.person;
}
