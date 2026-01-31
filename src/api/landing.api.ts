import { api } from "./client";

export async function getLandingContent() {
  const { data } = await api.get("/landing");
  return data as { headline: string };
}
