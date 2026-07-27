import type { ProfilePostItem } from "../api/profile.api";
import type { PostDetailResponse } from "../api/posts.api";
import type { MemberPostItem } from "../api/users.api";
import type { FeedItem } from "../api/home.api";
import type { PostCardData } from "../components/home/PostCard";
import { timeAgo } from "./timeAgo";
import { getImageUrl } from "../api/client";
import { preferFeedImageUrl, preferThumbUrl, feedImageFallbackUrls } from "./mediaVariantUrls";

const POST_TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Announcement",
  JOB: "Job",
  MARKETPLACE: "Marketplace",
  MATRIMONY: "Matrimony",
  ACHIEVEMENT: "Achievement",
  MEETUP: "Meetup",
  HELP_REQUEST: "Help Request",
  ENTERTAINMENT: "Entertainment"
};

export function formatPostType(postType: string): string {
  const key = postType.trim().toUpperCase();
  return POST_TYPE_LABELS[key] ?? postType;
}

export function postDetailToProfileItem(post: PostDetailResponse): ProfilePostItem {
  const typeLabel = formatPostType(post.post_type);
  return {
    postId: post.id,
    postType: typeLabel,
    title: post.title,
    description: post.description,
    mediaUrl: post.media_url,
    createdAt: post.created_at,
    visibility: "Community",
    status: post.job_status === "CLOSED" ? "Closed" : "Active",
    counts: {
      likes: post.like_count,
      comments: post.comment_count,
      views: 0
    },
    likedByMe: post.liked_by_me,
    savedByMe: post.saved_by_me ?? false
  };
}

export function profilePostToCardData(
  post: ProfilePostItem,
  userName: string,
  userAvatarUri?: string | null
): PostCardData {
  return {
    id: String(post.postId),
    userName,
    userAvatarUri: userAvatarUri ?? null,
    timeAgo: timeAgo(post.createdAt),
    postType: post.postType,
    title: post.title,
    description: post.description ?? "",
    imageUri: preferFeedImageUrl({ mediaUrl: post.mediaUrl }),
    likeCount: post.counts.likes,
    commentCount: post.counts.comments,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    isTrending: false
  };
}

export function memberPostToCardData(
  post: MemberPostItem,
  userName: string,
  userAvatarUri?: string | null
): PostCardData {
  return {
    id: String(post.postId),
    userName,
    userAvatarUri: userAvatarUri ?? null,
    timeAgo: timeAgo(post.createdAt),
    postType: formatPostType(post.postType),
    title: post.title,
    description: post.description ?? "",
    imageUri: preferFeedImageUrl({
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType ?? null
    }),
    mediaType: post.mediaType ?? null,
    thumbnailUrl: preferThumbUrl({
      thumbnailUrl: post.thumbnailUrl ?? null,
      mediaUrl: post.mediaUrl
    }),
    videoDuration: post.videoDuration ?? null,
    likeCount: post.counts.likes,
    commentCount: post.counts.comments,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    isTrending: false,
    isRepost: post.isRepost ?? false,
    originalAuthorName: post.originalAuthorName ?? null,
    originalPostId: post.originalPostId ?? null
  };
}

/** Map feed/explore API items into PostCard props. */
export function feedItemToPostCard(item: FeedItem): PostCardData {
  return {
    id: String(item.postId),
    userName: item.author.name,
    authorUserId: item.author.userId,
    authorUsername: item.author.username ?? null,
    userAvatarUri: getImageUrl(item.author.profileImage),
    timeAgo: timeAgo(item.createdAt),
    postType: formatPostType(item.postType),
    title: item.title,
    description: item.description ?? "",
    imageUri: preferFeedImageUrl({
      mediaUrl: item.mediaUrl,
      mediaUrlMedium: item.mediaUrlMedium,
      mediaUrlFull: item.mediaUrlFull,
      mediaUrlThumb: item.mediaUrlThumb,
      mediaType: item.mediaType ?? null
    }),
    imageUriFallbacks: feedImageFallbackUrls({
      mediaUrl: item.mediaUrl,
      mediaUrlMedium: item.mediaUrlMedium,
      mediaUrlFull: item.mediaUrlFull,
      mediaUrlThumb: item.mediaUrlThumb,
      mediaType: item.mediaType ?? null
    }),
    mediaType: item.mediaType ?? null,
    thumbnailUrl: preferThumbUrl({
      thumbnailUrl: item.thumbnailUrl ?? null,
      mediaUrlThumb: item.mediaUrlThumb ?? null,
      mediaUrl: item.mediaUrl
    }),
    videoDuration: item.videoDuration ?? null,
    likeCount: item.counts.likes,
    commentCount: item.counts.comments,
    likedByMe: item.likedByMe ?? item.liked_by_me ?? false,
    savedByMe: item.savedByMe ?? false,
    isTrending: item.isTrending ?? false,
    engagementScore: item.engagementScore,
    isRepost: item.isRepost ?? false,
    originalAuthorName: item.originalAuthor?.name ?? null,
    originalPostId: item.originalPostId ?? null
  };
}
