"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { PostForm, type PostFormSubmitPayload } from "@/components/social/community/PostForm";
import { useCommunityPost, useUpdateCommunityPost } from "@/lib/social/hooks/useCommunity";
import { isScheduledPostType } from "@/lib/social/labels";
import { mediaFieldForUpdate } from "@/lib/social/media-policy";
import { showApiError, showSuccess } from "@/lib/toast";

export function EditPostClient({ postId }: { postId: string }) {
  return (
    <AuthGuard>
      <EditPostForm postId={postId} />
    </AuthGuard>
  );
}

function EditPostForm({ postId }: { postId: string }) {
  const router = useRouter();
  const { data: post, isLoading, isError, refetch } = useCommunityPost(postId);
  const updatePost = useUpdateCommunityPost(postId);

  useEffect(() => {
    if (post && !post.canEdit) {
      showApiError(new Error("Bạn chỉ có thể chỉnh sửa bài đăng của chính mình."));
      router.replace(`/community/posts/${postId}`);
    }
  }, [post, postId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <LoadingState label="Đang tải bài đăng…" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <ErrorState title="Không tải được bài đăng" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!post.canEdit) return null;

  async function handleSubmit({ values, media, mediaTouched }: PostFormSubmitPayload) {
    const scheduled = isScheduledPostType(values.postType);
    try {
      await updatePost.mutateAsync({
        title: values.title,
        content: values.content,
        locationName: values.locationName || null,
        address: values.address || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        startAt: scheduled ? values.startAt : undefined,
        endAt: scheduled ? values.endAt : undefined,
        maxParticipants: scheduled ? values.maxParticipants : undefined,
        level: scheduled ? values.level : undefined,
        feePerPerson: scheduled ? values.feePerPerson : undefined,
        allowComments: values.allowComments,
        // Omit the field entirely unless the user touched the media picker —
        // sending `[]` here would wipe the post's gallery.
        media: mediaFieldForUpdate(mediaTouched, media),
      });
      showSuccess("Đã lưu thay đổi.");
      router.push(`/community/posts/${postId}`);
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[22px] font-bold text-on-surface">Chỉnh sửa bài đăng</h1>
      <div className="mt-6 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
        <PostForm
          mode="edit"
          initialPost={post}
          submitting={updatePost.isPending}
          submitLabel="Lưu thay đổi"
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      </div>
    </div>
  );
}
