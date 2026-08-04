"use client";

import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostForm, type PostFormSubmitPayload } from "@/components/social/community/PostForm";
import { useCreateCommunityPost } from "@/lib/social/hooks/useCommunity";
import { isScheduledPostType } from "@/lib/social/labels";
import { showApiError, showSuccess } from "@/lib/toast";

export function CreatePostClient() {
  return (
    <AuthGuard>
      <CreatePostForm />
    </AuthGuard>
  );
}

function CreatePostForm() {
  const router = useRouter();
  const createPost = useCreateCommunityPost();

  async function handleSubmit({ values, media }: PostFormSubmitPayload) {
    const scheduled = isScheduledPostType(values.postType);
    try {
      const post = await createPost.mutateAsync({
        postType: values.postType,
        sportId: scheduled ? values.sportId : null,
        title: values.title,
        content: values.content,
        locationName: values.locationName || null,
        address: values.address || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        startAt: scheduled ? values.startAt : null,
        endAt: scheduled ? values.endAt : null,
        maxParticipants: scheduled ? values.maxParticipants : null,
        level: scheduled ? values.level : null,
        feePerPerson: scheduled ? values.feePerPerson : null,
        allowComments: values.allowComments,
        publish: values.publish,
        // Create always sends the full media list — there is no "keep existing"
        // ambiguity on a brand-new post.
        media,
      });
      showSuccess(values.publish ? "Đã đăng bài." : "Đã lưu bản nháp.");
      router.push(values.publish ? `/community/posts/${post.id}` : "/community/my-posts");
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[22px] font-bold text-on-surface">Đăng bài mới</h1>
      <p className="mt-1 text-[13.5px] text-on-surface-variant">
        Chia sẻ trải nghiệm hoặc tìm bạn tập cùng cộng đồng Sportico.
      </p>
      <div className="mt-6 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
        <PostForm
          mode="create"
          submitting={createPost.isPending}
          submitLabel="Đăng bài"
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      </div>
    </div>
  );
}
