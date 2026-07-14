import type { LinkingOptions } from "@react-navigation/native";

const prefixes = [
  "digitalhouse://",
  "https://www.infosensetechnologies.com/digitalhouse",
  "http://www.infosensetechnologies.com/digitalhouse"
];

/** Deep links: digitalhouse://post/123 — do not map "" → Home (fights auth gating). */
export const rootLinking: LinkingOptions<Record<string, unknown>> = {
  prefixes,
  config: {
    screens: {
      PostDetail: {
        path: "post/:postId",
        parse: { postId: (id: string) => Number(id) }
      }
    }
  }
};
