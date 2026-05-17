import type { ProfilePostItem } from "../api/profile.api";
import type { PostDetailResponse } from "../api/posts.api";
import type { PostCardData } from "../components/home/PostCard";

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

export function postDetailToProfileItem(post: PostDetailResponse): ProfilePostItem {
  const typeLabel = POST_TYPE_LABELS[post.post_type] ?? post.post_type;
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

export function profilePostToCardData(post: ProfilePostItem, userName: string): PostCardData {
  return {
    id: String(post.postId),
    userName,
    userAvatarUri: null,
    timeAgo: "",
    postType: post.postType,
    title: post.title,
    description: post.description ?? "",
    imageUri: post.mediaUrl,
    likeCount: post.counts.likes,
    commentCount: post.counts.comments,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    isTrending: false
  };
}
