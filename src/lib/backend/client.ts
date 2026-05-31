// ============================================================================
// Typed backend client. Sits on top of `apiFetch` (api-client.ts): every method
// performs a real HTTP call, unwraps the `Result<T>` envelope, and returns the
// inner payload (`data`). List endpoints return the `PagedResult<T>` so callers
// can read `.items` plus pagination. Errors propagate as `ApiError`.
//
// The hybrid mock/live switch lives in `src/lib/api.ts` — this client is only
// invoked when the backend base URL is configured (live mode).
// ============================================================================

import { apiFetch, ApiError } from "@/lib/api-client";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import type {
  AvailabilitySlotResponse,
  BookingResponse,
  ChangePasswordRequest,
  ChatMessageResponse,
  ChatRoomResponse,
  CoachPayoutAccountResponse,
  CoachWalletResponse,
  CoachWalletTransactionResponse,
  ConfirmSessionRequest,
  CreateAvailabilitySlotRequest,
  CreateDayRequest,
  CreateExerciseRequest,
  CreateSessionRequest,
  CreateTrainingPlanRequest,
  CreateWeekRequest,
  CurrentUserResponse,
  LearnerAssessmentResponse,
  NotificationResponse,
  PagedResult,
  PostResponse,
  ProgressCheckInResponse,
  PublicCoachDetailResponse,
  PublicCoachListItemResponse,
  PurchasePayOsResponse,
  Result,
  TrainingPackageResponse,
  TrainingPlanDayResponse,
  TrainingPlanExerciseResponse,
  TrainingPlanResponse,
  TrainingPlanWeekResponse,
  TrainingSessionResponse,
  UpdateExerciseRequest,
  UpdateMeRequest,
  UpdateTrainingPlanRequest,
  WithdrawalRequestResponse,
} from "@/lib/backend/dto";

// ---- envelope + query helpers ----------------------------------------------

function unwrap<T>(result: Result<T>): T {
  if (result?.isSuccess && result.data != null) return result.data;
  throw new ApiError(
    result?.error?.message ?? "Yêu cầu không thành công.",
    0,
    result?.error,
  );
}

const EMPTY_PAGE: PagedResult<never> = {
  items: [],
  pageNumber: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
  hasPrevious: false,
  hasNext: false,
};

/** Unwrap a paged list, tolerating a null `data` (treated as empty page). */
function unwrapPage<T>(result: Result<PagedResult<T>>): PagedResult<T> {
  if (result?.isSuccess) return result.data ?? (EMPTY_PAGE as PagedResult<T>);
  throw new ApiError(
    result?.error?.message ?? "Yêu cầu không thành công.",
    0,
    result?.error,
  );
}

/** Build a `?Key=value` query string from defined params (backend PascalCase). */
function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface AssessmentBody {
  goalType?: string;
  goalDescription?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  currentLevel?: string;
  healthNotes?: string;
  injuryNotes?: string;
  trainingHistory?: string;
  availableDaysPerWeek?: string;
  preferredSessionDurationMinutes?: number;
  equipmentAvailable?: string;
}

export interface ListParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  sportId?: number;
  coachId?: string;
}

export interface PublicCoachListParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  sportId?: number;
  city?: string;
  district?: string;
  isOnlineAvailable?: boolean;
  isOfflineAvailable?: boolean;
  minRating?: number;
}

function listQuery(p: ListParams = {}): string {
  return qs({
    PageNumber: p.pageNumber,
    PageSize: p.pageSize,
    Keyword: p.keyword,
    Status: p.status,
    SportId: p.sportId,
    CoachId: p.coachId,
  });
}

const GET = <T>(path: string) => apiFetch<Result<T>>(path);
const PUT = <T>(path: string, body?: unknown) =>
  apiFetch<Result<T>>(path, {
    method: "PUT",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const POST = <T>(path: string, body?: unknown) =>
  apiFetch<Result<T>>(path, {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

// ---- client ----------------------------------------------------------------

export const backend = {
  // ---- Current user ------------------------------------------------------
  async usersMe() {
    return unwrap(await GET<CurrentUserResponse>(ep.usersMe));
  },
  async updateMe(body: UpdateMeRequest) {
    return unwrap(await PUT<CurrentUserResponse>(ep.usersMe, body));
  },
  async changePassword(body: ChangePasswordRequest) {
    const result = await POST<unknown>(ep.auth.changePassword, body);
    if (!result?.isSuccess) {
      throw new ApiError(
        result?.error?.message ?? "Đổi mật khẩu không thành công.",
        0,
        result?.error,
      );
    }
  },

  // ---- Public coach directory -------------------------------------------
  async publicCoaches(p?: PublicCoachListParams) {
    const query = qs({
      Keyword: p?.keyword,
      SportId: p?.sportId,
      City: p?.city,
      District: p?.district,
      IsOnlineAvailable: p?.isOnlineAvailable,
      IsOfflineAvailable: p?.isOfflineAvailable,
      MinRating: p?.minRating,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<PublicCoachListItemResponse>>(
        ep.publicCoaches + query,
      ),
    );
  },
  async publicCoach(id: string) {
    return unwrap(
      await GET<PublicCoachDetailResponse>(ep.publicCoachById(id)),
    );
  },

  // ---- Training packages (public marketplace + coach's own) -------------
  async publicTrainingPackages(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<TrainingPackageResponse>>(
        ep.publicTrainingPackages + listQuery(p),
      ),
    );
  },
  async publicTrainingPackage(id: string) {
    return unwrap(
      await GET<TrainingPackageResponse>(ep.publicTrainingPackageById(id)),
    );
  },
  async myTrainingPackages(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<TrainingPackageResponse>>(
        ep.myTrainingPackages + listQuery(p),
      ),
    );
  },

  // ---- Bookings ----------------------------------------------------------
  async myBookings(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<BookingResponse>>(ep.myBookings + listQuery(p)),
    );
  },
  async coachBookings(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<BookingResponse>>(ep.coachBookings + listQuery(p)),
    );
  },
  async booking(id: string) {
    return unwrap(await GET<BookingResponse>(ep.bookingById(id)));
  },
  /** Coach-role booking detail — uses /api/bookings/coach/{id}, requires Coach JWT. */
  async bookingByIdCoach(id: string) {
    return unwrap(await GET<BookingResponse>(ep.coachBookingById(id)));
  },
  async purchaseManual(trainingPackageId: string) {
    return unwrap(
      await POST<BookingResponse>(ep.purchaseManual, { trainingPackageId }),
    );
  },
  async purchasePayos(trainingPackageId: string) {
    return unwrap(
      await POST<PurchasePayOsResponse>(ep.purchasePayos, { trainingPackageId }),
    );
  },

  // ---- Sessions / plan / progress (per booking) -------------------------
  async bookingSessions(
    bookingId: string,
    p?: ListParams & { startFrom?: string; startTo?: string },
  ) {
    const query = qs({
      Status: p?.status,
      StartFrom: p?.startFrom,
      StartTo: p?.startTo,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<TrainingSessionResponse>>(
        ep.bookingSessions(bookingId) + query,
      ),
    );
  },
  async bookingTrainingPlan(bookingId: string) {
    return unwrap(
      await GET<TrainingPlanResponse>(ep.bookingTrainingPlan(bookingId)),
    );
  },
  async bookingProgressCheckIns(bookingId: string, p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<ProgressCheckInResponse>>(
        ep.bookingProgressCheckIns(bookingId) + listQuery(p),
      ),
    );
  },
  async createProgressCheckIn(
    bookingId: string,
    body: {
      checkInDate: string;
      weightKg?: number;
      bodyFatPercent?: number;
      waistCm?: number;
      energyLevel?: string;
      sleepQuality?: string;
      learnerNote?: string;
    },
  ) {
    return unwrap(
      await POST<ProgressCheckInResponse>(
        ep.bookingProgressCheckIns(bookingId),
        body,
      ),
    );
  },
  async bookingAssessment(bookingId: string) {
    return unwrap(
      await GET<LearnerAssessmentResponse>(ep.bookingAssessment(bookingId)),
    );
  },
  async createBookingAssessment(bookingId: string, body: AssessmentBody) {
    return unwrap(
      await POST<LearnerAssessmentResponse>(
        ep.bookingAssessment(bookingId),
        body,
      ),
    );
  },
  async updateBookingAssessment(bookingId: string, body: AssessmentBody) {
    return unwrap(
      await PUT<LearnerAssessmentResponse>(
        ep.bookingAssessment(bookingId),
        body,
      ),
    );
  },

  // ---- Chat --------------------------------------------------------------
  async chatRooms() {
    return unwrap(await GET<ChatRoomResponse[]>(ep.chatRooms));
  },
  async roomMessages(roomId: string, p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<ChatMessageResponse>>(
        ep.roomMessages(roomId) + listQuery(p),
      ),
    );
  },
  async sendMessage(roomId: string, content: string) {
    return unwrap(
      await POST<ChatMessageResponse>(ep.roomMessages(roomId), { content }),
    );
  },

  // ---- Notifications -----------------------------------------------------
  async notifications(p?: ListParams & { isRead?: boolean; type?: string }) {
    const query = qs({
      IsRead: p?.isRead,
      Type: p?.type,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<NotificationResponse>>(ep.notifications + query),
    );
  },
  async unreadNotificationCount() {
    return unwrap(await GET<number>(ep.notificationsUnreadCount));
  },
  async markNotificationRead(id: string) {
    await PUT(ep.notificationRead(id));
  },
  async markAllNotificationsRead() {
    await PUT(ep.notificationsReadAll);
  },

  // ---- Coach wallet / payout / withdrawals ------------------------------
  async wallet() {
    return unwrap(await GET<CoachWalletResponse>(ep.coachWallet));
  },
  async walletTransactions(
    p?: ListParams & { type?: string; direction?: string },
  ) {
    const query = qs({
      Type: p?.type,
      Direction: p?.direction,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<CoachWalletTransactionResponse>>(
        ep.coachWalletTransactions + query,
      ),
    );
  },
  async myWithdrawals(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<WithdrawalRequestResponse>>(
        ep.coachWithdrawals + listQuery(p),
      ),
    );
  },
  async createWithdrawal(amount: number) {
    return unwrap(
      await POST<WithdrawalRequestResponse>(ep.coachWithdrawals, { amount }),
    );
  },
  async payoutAccount() {
    return unwrap(
      await GET<CoachPayoutAccountResponse>(ep.coachPayoutAccount),
    );
  },
  async upsertPayoutAccount(body: {
    payoutMethod?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
  }) {
    return unwrap(
      await PUT<CoachPayoutAccountResponse>(ep.coachPayoutAccount, body),
    );
  },

  // ---- Posts (coach) -----------------------------------------------------
  async myPosts(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<PostResponse>>(ep.myPosts + listQuery(p)),
    );
  },

  // ---- Availability slots (coach CRUD) -----------------------------------
  async myAvailabilitySlots(p?: ListParams & { startFrom?: string; startTo?: string; status?: string }) {
    const query = qs({
      Status: p?.status,
      StartFrom: p?.startFrom,
      StartTo: p?.startTo,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<AvailabilitySlotResponse>>(
        ep.myAvailabilitySlots + query,
      ),
    );
  },
  async createAvailabilitySlot(body: CreateAvailabilitySlotRequest) {
    return unwrap(
      await POST<AvailabilitySlotResponse>(ep.myAvailabilitySlots, body),
    );
  },
  async cancelAvailabilitySlot(id: string) {
    return unwrap(
      await PUT<AvailabilitySlotResponse>(ep.myAvailabilitySlotCancel(id)),
    );
  },
  /** Learner: view a coach's available slots */
  async coachAvailabilitySlots(coachId: string, p?: { startFrom?: string; startTo?: string }) {
    const query = qs({ StartFrom: p?.startFrom, StartTo: p?.startTo });
    return unwrapPage(
      await GET<PagedResult<AvailabilitySlotResponse>>(
        ep.coachAvailabilitySlots(coachId) + query,
      ),
    );
  },

  // ---- Training sessions (global) ----------------------------------------
  async myTrainingSessions(p?: ListParams & { startFrom?: string; startTo?: string }) {
    const query = qs({
      Status: p?.status,
      StartFrom: p?.startFrom,
      StartTo: p?.startTo,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<TrainingSessionResponse>>(
        ep.myTrainingSessions + query,
      ),
    );
  },
  async coachTrainingSessions(p?: ListParams & { startFrom?: string; startTo?: string }) {
    const query = qs({
      Status: p?.status,
      StartFrom: p?.startFrom,
      StartTo: p?.startTo,
      PageNumber: p?.pageNumber,
      PageSize: p?.pageSize,
    });
    return unwrapPage(
      await GET<PagedResult<TrainingSessionResponse>>(
        ep.coachTrainingSessions + query,
      ),
    );
  },
  /** Book a session against an availability slot */
  async createSession(bookingId: string, body: CreateSessionRequest) {
    return unwrap(
      await POST<TrainingSessionResponse>(ep.createBookingSession(bookingId), body),
    );
  },
  async confirmSession(id: string, body?: ConfirmSessionRequest) {
    return unwrap(
      await PUT<TrainingSessionResponse>(ep.trainingSessionConfirm(id), body),
    );
  },
  async cancelSession(id: string, reason?: string) {
    return unwrap(
      await PUT<TrainingSessionResponse>(ep.trainingSessionCancel(id), { reason }),
    );
  },
  async completeSession(id: string) {
    return unwrap(
      await PUT<TrainingSessionResponse>(ep.trainingSessionComplete(id)),
    );
  },

  // ---- Training plan CRUD ------------------------------------------------
  async createTrainingPlan(bookingId: string, body: CreateTrainingPlanRequest) {
    return unwrap(
      await POST<TrainingPlanResponse>(ep.bookingTrainingPlan(bookingId), body),
    );
  },
  async updateTrainingPlan(id: string, body: UpdateTrainingPlanRequest) {
    return unwrap(
      await PUT<TrainingPlanResponse>(ep.trainingPlanById(id), body),
    );
  },
  async addPlanWeek(planId: string, body: CreateWeekRequest) {
    return unwrap(
      await POST<TrainingPlanWeekResponse>(ep.trainingPlanWeeks(planId), body),
    );
  },
  async addPlanDay(weekId: string, body: CreateDayRequest) {
    return unwrap(
      await POST<TrainingPlanDayResponse>(ep.trainingPlanWeekDays(weekId), body),
    );
  },
  async addExercise(dayId: string, body: CreateExerciseRequest) {
    return unwrap(
      await POST<TrainingPlanExerciseResponse>(ep.trainingPlanDayExercises(dayId), body),
    );
  },
  async updateExercise(id: string, body: UpdateExerciseRequest) {
    return unwrap(
      await PUT<TrainingPlanExerciseResponse>(ep.trainingPlanExerciseById(id), body),
    );
  },
  async deleteExercise(id: string) {
    await apiFetch(ep.trainingPlanExerciseById(id), { method: "DELETE" });
  },

  // ---- Chat room creation ------------------------------------------------
  async createChatRoom(coachId: string) {
    return unwrap(
      await POST<ChatRoomResponse>(ep.createChatRoom, { coachId }),
    );
  },

  // ---- Admin moderation queues ------------------------------------------
  async pendingPosts(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<PostResponse>>(ep.adminPendingPosts + listQuery(p)),
    );
  },
  async approvePost(id: string) {
    return unwrap(await PUT<PostResponse>(ep.adminApprovePost(id)));
  },
  async rejectPost(id: string, reason: string) {
    return unwrap(await PUT<PostResponse>(ep.adminRejectPost(id), { reason }));
  },
  async pendingTrainingPackages(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<TrainingPackageResponse>>(
        ep.adminPendingTrainingPackages + listQuery(p),
      ),
    );
  },
  async approveTrainingPackage(id: string) {
    return unwrap(
      await PUT<TrainingPackageResponse>(ep.adminApproveTrainingPackage(id)),
    );
  },
  async rejectTrainingPackage(id: string, reason: string) {
    return unwrap(
      await PUT<TrainingPackageResponse>(ep.adminRejectTrainingPackage(id), {
        reason,
      }),
    );
  },
  async pendingPayoutAccounts(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<CoachPayoutAccountResponse>>(
        ep.adminPendingPayoutAccounts + listQuery(p),
      ),
    );
  },
  async verifyPayoutAccount(id: string) {
    return unwrap(
      await PUT<CoachPayoutAccountResponse>(ep.adminVerifyPayoutAccount(id)),
    );
  },
  async rejectPayoutAccount(id: string, note: string) {
    return unwrap(
      await PUT<CoachPayoutAccountResponse>(ep.adminRejectPayoutAccount(id), {
        note,
      }),
    );
  },
  async pendingWithdrawals(p?: ListParams) {
    return unwrapPage(
      await GET<PagedResult<WithdrawalRequestResponse>>(
        ep.adminPendingWithdrawals + listQuery(p),
      ),
    );
  },
  async approveWithdrawal(id: string) {
    return unwrap(
      await PUT<WithdrawalRequestResponse>(ep.adminApproveWithdrawal(id)),
    );
  },
  async rejectWithdrawal(id: string, adminNote: string) {
    return unwrap(
      await PUT<WithdrawalRequestResponse>(ep.adminRejectWithdrawal(id), {
        adminNote,
      }),
    );
  },
};

export default backend;
