import {
  formatEmploymentType,
  formatJobSalary,
  formatWorkMode
} from "../constants/jobs";
import {
  formatMarketplaceCategory,
  formatMarketplacePrice
} from "../constants/marketplace";
import { formatHelpCategory, formatHelpUrgency } from "../constants/helpingHands";

export type ChatSharePreview = {
  title: string;
  postType?: string | null;
  jobCompany?: string | null;
  jobLocation?: string | null;
  jobSalaryMin?: number | null;
  jobSalaryMax?: number | null;
  jobEmploymentType?: string | null;
  jobWorkMode?: string | null;
  marketplaceIntent?: string | null;
  marketplacePrice?: number | null;
  marketplaceNegotiable?: boolean | null;
  marketplaceCategory?: string | null;
  marketplaceDistrict?: string | null;
  helpCategory?: string | null;
  helpUrgency?: string | null;
  helpLocation?: string | null;
};

export type ChatShareDraft = {
  postId: number;
  preview: ChatSharePreview;
};

export type ChatSharePostSource = {
  id: number;
  title: string;
  post_type?: string | null;
  job_company?: string | null;
  job_location?: string | null;
  job_salary_min?: number | null;
  job_salary_max?: number | null;
  job_employment_type?: string | null;
  job_work_mode?: string | null;
  marketplace_intent?: string | null;
  marketplace_price?: number | null;
  marketplace_negotiable?: boolean | null;
  marketplace_category?: string | null;
  marketplace_district?: string | null;
  help_category?: string | null;
  help_urgency?: string | null;
  help_location?: string | null;
};

export type ChatShareFeedSource = {
  postId: number;
  title: string;
  postType?: string | null;
  jobCompany?: string | null;
  jobLocation?: string | null;
  jobSalaryMin?: number | null;
  jobSalaryMax?: number | null;
  jobEmploymentType?: string | null;
  jobWorkMode?: string | null;
  marketplaceIntent?: string | null;
  marketplacePrice?: number | null;
  marketplaceNegotiable?: boolean | null;
  marketplaceCategory?: string | null;
  marketplaceDistrict?: string | null;
  helpCategory?: string | null;
  helpUrgency?: string | null;
  helpLocation?: string | null;
};

export type SharePreviewIcon =
  | "briefcase-outline"
  | "storefront-outline"
  | "heart-outline"
  | "document-text-outline";

export function describeSharePreview(preview: ChatSharePreview): {
  kicker: string;
  icon: SharePreviewIcon;
  meta: string;
} {
  const type = preview.postType;
  if (type === "JOB") {
    const salary = formatJobSalary(preview.jobSalaryMin, preview.jobSalaryMax);
    const employment = formatEmploymentType(preview.jobEmploymentType);
    const workMode = formatWorkMode(preview.jobWorkMode);
    return {
      kicker: "Job",
      icon: "briefcase-outline",
      meta: [
        preview.jobCompany?.trim(),
        preview.jobLocation?.trim(),
        employment,
        workMode,
        salary
      ]
        .filter(Boolean)
        .join(" · ")
    };
  }
  if (type === "MARKETPLACE") {
    const price = formatMarketplacePrice(
      preview.marketplaceIntent,
      preview.marketplacePrice,
      preview.marketplaceNegotiable ?? undefined
    );
    const category = formatMarketplaceCategory(preview.marketplaceCategory);
    return {
      kicker: "Listing",
      icon: "storefront-outline",
      meta: [price, category, preview.marketplaceDistrict?.trim()].filter(Boolean).join(" · ")
    };
  }
  if (type === "HELP_REQUEST") {
    const category = preview.helpCategory ? formatHelpCategory(preview.helpCategory) : null;
    const urgency =
      preview.helpUrgency && preview.helpUrgency !== "NORMAL"
        ? formatHelpUrgency(preview.helpUrgency)
        : null;
    return {
      kicker: "Help request",
      icon: "heart-outline",
      meta: [category, preview.helpLocation?.trim(), urgency].filter(Boolean).join(" · ")
    };
  }
  return {
    kicker: "Post",
    icon: "document-text-outline",
    meta: ""
  };
}

export function sharedPostFromDraft(draft: ChatShareDraft): ChatSharePreview & { id: number } {
  return { id: draft.postId, ...draft.preview };
}

export function chatShareDraftFromPost(post: ChatSharePostSource): ChatShareDraft {
  return {
    postId: post.id,
    preview: {
      title: post.title,
      postType: post.post_type ?? null,
      jobCompany: post.job_company ?? null,
      jobLocation: post.job_location ?? null,
      jobSalaryMin: post.job_salary_min ?? null,
      jobSalaryMax: post.job_salary_max ?? null,
      jobEmploymentType: post.job_employment_type ?? null,
      jobWorkMode: post.job_work_mode ?? null,
      marketplaceIntent: post.marketplace_intent ?? null,
      marketplacePrice: post.marketplace_price ?? null,
      marketplaceNegotiable: post.marketplace_negotiable ?? null,
      marketplaceCategory: post.marketplace_category ?? null,
      marketplaceDistrict: post.marketplace_district ?? null,
      helpCategory: post.help_category ?? null,
      helpUrgency: post.help_urgency ?? null,
      helpLocation: post.help_location ?? null
    }
  };
}

export function chatShareDraftFromFeedItem(item: ChatShareFeedSource): ChatShareDraft {
  return {
    postId: item.postId,
    preview: {
      title: item.title,
      postType: item.postType ?? null,
      jobCompany: item.jobCompany ?? null,
      jobLocation: item.jobLocation ?? null,
      jobSalaryMin: item.jobSalaryMin ?? null,
      jobSalaryMax: item.jobSalaryMax ?? null,
      jobEmploymentType: item.jobEmploymentType ?? null,
      jobWorkMode: item.jobWorkMode ?? null,
      marketplaceIntent: item.marketplaceIntent ?? null,
      marketplacePrice: item.marketplacePrice ?? null,
      marketplaceNegotiable: item.marketplaceNegotiable ?? null,
      marketplaceCategory: item.marketplaceCategory ?? null,
      marketplaceDistrict: item.marketplaceDistrict ?? null,
      helpCategory: item.helpCategory ?? null,
      helpUrgency: item.helpUrgency ?? null,
      helpLocation: item.helpLocation ?? null
    }
  };
}

export function chatParamsForShare(
  other: { userId: number; name: string; profileImage?: string | null },
  draft: ChatShareDraft,
  extra?: { initialMessage?: string }
) {
  return {
    otherUserId: other.userId,
    name: other.name,
    profileImage: other.profileImage,
    sharePostId: draft.postId,
    shareForUserId: other.userId,
    shareNonce: Date.now(),
    sharePreview: draft.preview,
    ...(extra?.initialMessage ? { initialMessage: extra.initialMessage } : {})
  };
}
