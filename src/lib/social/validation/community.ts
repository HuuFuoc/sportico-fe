import { z } from "zod";

// ============================================================================
// Community post form schema.
//
// Frontend is allowed to be STRICTER than the backend at the points the brief
// calls out explicitly: lat/lng bounds, the level enum, and the recruitment
// requirements (sportId, startAt, maxParticipants >= 2). It must never be
// LOOSER than the backend on a field the backend requires.
// ============================================================================

export const COMMUNITY_LEVELS = ["beginner", "intermediate", "advanced", "all"] as const;
export const COMMUNITY_POST_TYPES = ["recruitment", "sharing"] as const;

const baseSchema = z.object({
  postType: z.enum(COMMUNITY_POST_TYPES, { message: "Vui lòng chọn loại bài đăng." }),
  sportId: z.number().int().positive().nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tiêu đề.")
    .max(200, "Tiêu đề tối đa 200 ký tự."),
  content: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung.")
    .max(5000, "Nội dung tối đa 5000 ký tự."),
  locationName: z.string().trim().max(200).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  latitude: z.number().min(-90, "Vĩ độ không hợp lệ.").max(90, "Vĩ độ không hợp lệ.").nullable().optional(),
  longitude: z.number().min(-180, "Kinh độ không hợp lệ.").max(180, "Kinh độ không hợp lệ.").nullable().optional(),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  maxParticipants: z.number().int().nullable().optional(),
  level: z.enum(COMMUNITY_LEVELS).nullable().optional(),
  feePerPerson: z.number().min(0, "Chi phí không thể âm.").nullable().optional(),
  allowComments: z.boolean(),
  publish: z.boolean(),
});

export const communityPostSchema = baseSchema.superRefine((data, ctx) => {
  if (data.postType !== "recruitment") return;

  if (data.sportId == null) {
    ctx.addIssue({ code: "custom", path: ["sportId"], message: "Bài tìm bạn tập cần chọn môn thể thao." });
  }
  if (!data.startAt) {
    ctx.addIssue({ code: "custom", path: ["startAt"], message: "Bài tìm bạn tập cần thời gian bắt đầu." });
  }
  if (data.maxParticipants == null || data.maxParticipants < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["maxParticipants"],
      message: "Số người tham gia tối đa phải từ 2 trở lên.",
    });
  }
  if (data.startAt && data.endAt && new Date(data.endAt) <= new Date(data.startAt)) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "Thời gian kết thúc phải sau thời gian bắt đầu." });
  }
});

export type CommunityPostFormValues = z.infer<typeof baseSchema>;
