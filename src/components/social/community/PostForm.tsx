"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Calendar, Group, MapPin, Coins } from "iconoir-react";
import { MediaPicker } from "@/components/social/community/MediaPicker";
import { zodResolver } from "@/lib/validation/auth";
import { communityPostSchema, type CommunityPostFormValues, COMMUNITY_LEVELS } from "@/lib/social/validation/community";
import { isoUtcToLocalInput, localInputToIsoUtc } from "@/lib/social/datetime";
import { LEVEL_LABELS, POST_TYPE_LABELS } from "@/lib/social/labels";
import { STABLE_SPORTS } from "@/lib/sports-api";
import { cn } from "@/lib/utils";
import type { CommunityPostMediaRequest, CommunityPostResponse } from "@/lib/social/types";

export interface PostFormSubmitPayload {
  values: CommunityPostFormValues;
  media: CommunityPostMediaRequest[];
  mediaTouched: boolean;
}

interface PostFormProps {
  mode: "create" | "edit";
  initialPost?: CommunityPostResponse | null;
  submitting?: boolean;
  onSubmit: (payload: PostFormSubmitPayload) => void;
  submitLabel: string;
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
}

function fieldToMediaRequest(m: CommunityPostResponse["media"][number]): CommunityPostMediaRequest {
  return {
    mediaType: (m.mediaType as "image" | "video") ?? "image",
    url: m.url ?? "",
    thumbnailUrl: m.thumbnailUrl,
  };
}

const INPUT_CLASS =
  "w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3.5 py-2.5 text-[13.5px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function PostForm({ mode, initialPost, submitting, onSubmit, submitLabel, secondaryAction }: PostFormProps) {
  const [media, setMedia] = useState<CommunityPostMediaRequest[]>(
    initialPost?.media.map(fieldToMediaRequest) ?? [],
  );
  const [mediaTouched, setMediaTouched] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<CommunityPostFormValues>({
    resolver: zodResolver(communityPostSchema),
    mode: "onBlur",
    defaultValues: {
      postType: (initialPost?.postType as "recruitment" | "sharing") ?? "sharing",
      sportId: initialPost?.sportId ?? null,
      title: initialPost?.title ?? "",
      content: initialPost?.content ?? "",
      locationName: initialPost?.locationName ?? "",
      address: initialPost?.address ?? "",
      latitude: initialPost?.latitude ?? null,
      longitude: initialPost?.longitude ?? null,
      startAt: initialPost?.startAt ?? null,
      endAt: initialPost?.endAt ?? null,
      maxParticipants: initialPost?.maxParticipants ?? 2,
      level: (initialPost?.level as CommunityPostFormValues["level"]) ?? "all",
      feePerPerson: initialPost?.feePerPerson ?? null,
      allowComments: initialPost?.allowComments ?? true,
      publish: mode === "edit" ? Boolean(initialPost?.publishedAt) : true,
    },
  });

  const postType = watch("postType");
  const isRecruitment = postType === "recruitment";

  function submit(values: CommunityPostFormValues, publish: boolean) {
    onSubmit({ values: { ...values, publish }, media, mediaTouched });
  }

  return (
    <form
      onSubmit={handleSubmit((values) => submit(values, values.publish))}
      className="space-y-5"
    >
      {mode === "create" && (
        <div className="flex gap-2 rounded-[10px] bg-surface-container-high p-1">
          {(["sharing", "recruitment"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex-1 cursor-pointer rounded-[8px] px-3 py-2 text-center text-[13px] font-semibold transition-colors",
                postType === type ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant",
              )}
            >
              <input type="radio" value={type} {...register("postType")} className="hidden" />
              {POST_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-on-surface">
          Tiêu đề <span className="text-primary">*</span>
        </label>
        <input {...register("title")} className={INPUT_CLASS} placeholder="VD: Tìm bạn tập cầu lông cuối tuần" />
        {errors.title && <p className="mt-1 text-[11.5px] text-error">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-on-surface">
          Nội dung <span className="text-primary">*</span>
        </label>
        <textarea {...register("content")} rows={5} className={cn(INPUT_CLASS, "resize-none")} placeholder="Chia sẻ chi tiết…" />
        {errors.content && <p className="mt-1 text-[11.5px] text-error">{errors.content.message}</p>}
      </div>

      {isRecruitment && (
        <div className="grid grid-cols-1 gap-4 rounded-[12px] border border-[var(--color-border-soft)] p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
              Môn thể thao <span className="text-primary">*</span>
            </label>
            <Controller
              control={control}
              name="sportId"
              render={({ field }) => (
                <select
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  className={INPUT_CLASS}
                >
                  <option value="">Chọn môn</option>
                  {STABLE_SPORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.sportId && <p className="mt-1 text-[11.5px] text-error">{errors.sportId.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
              <Group width={14} height={14} /> Số người tối đa <span className="text-primary">*</span>
            </label>
            <input
              type="number"
              min={2}
              {...register("maxParticipants", { valueAsNumber: true })}
              className={INPUT_CLASS}
            />
            {errors.maxParticipants && (
              <p className="mt-1 text-[11.5px] text-error">{errors.maxParticipants.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
              <Calendar width={14} height={14} /> Bắt đầu <span className="text-primary">*</span>
            </label>
            <Controller
              control={control}
              name="startAt"
              render={({ field }) => (
                <input
                  type="datetime-local"
                  value={isoUtcToLocalInput(field.value)}
                  onChange={(e) => field.onChange(localInputToIsoUtc(e.target.value))}
                  className={INPUT_CLASS}
                />
              )}
            />
            {errors.startAt && <p className="mt-1 text-[11.5px] text-error">{errors.startAt.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
              <Calendar width={14} height={14} /> Kết thúc
            </label>
            <Controller
              control={control}
              name="endAt"
              render={({ field }) => (
                <input
                  type="datetime-local"
                  value={isoUtcToLocalInput(field.value)}
                  onChange={(e) => field.onChange(localInputToIsoUtc(e.target.value))}
                  className={INPUT_CLASS}
                />
              )}
            />
            {errors.endAt && <p className="mt-1 text-[11.5px] text-error">{errors.endAt.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
              <Coins width={14} height={14} /> Chi phí / người
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              {...register("feePerPerson", { valueAsNumber: true })}
              className={INPUT_CLASS}
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-on-surface">Trình độ</label>
            <select {...register("level")} className={INPUT_CLASS}>
              {COMMUNITY_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {LEVEL_LABELS[lvl]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
            <MapPin width={14} height={14} /> Tên địa điểm
          </label>
          <input {...register("locationName")} className={INPUT_CLASS} placeholder="VD: Sân cầu lông ABC" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-on-surface">Địa chỉ</label>
          <input {...register("address")} className={INPUT_CLASS} placeholder="Số nhà, đường, quận…" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-on-surface">Hình ảnh / video</label>
        <MediaPicker value={media} onChange={setMedia} onTouched={() => setMediaTouched(true)} />
      </div>

      <label className="flex items-center gap-2 text-[13px] text-on-surface">
        <input type="checkbox" {...register("allowComments")} className="h-4 w-4 accent-primary" />
        Cho phép bình luận
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-soft)] pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[10px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
        >
          {submitting ? "Đang lưu…" : submitLabel}
        </button>
        {mode === "create" && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit((values) => submit(values, false))}
            className="rounded-[10px] border border-[var(--color-border-soft)] px-5 py-2.5 text-[13.5px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            Lưu nháp
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            className="ml-auto text-[13px] font-medium text-on-surface-variant hover:text-error disabled:opacity-50"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </form>
  );
}
