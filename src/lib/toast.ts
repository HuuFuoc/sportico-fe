import { toast } from "sonner";

// ─── Public helpers ────────────────────────────────────────────────────────

export function showSuccess(message?: string) {
  toast.success(message ?? "Thao tác thành công.");
}

export function showError(message?: string) {
  toast.error(message ?? "Đã có lỗi xảy ra. Vui lòng thử lại.");
}

export function showWarning(message?: string) {
  toast.warning(message ?? "Vui lòng kiểm tra lại thông tin.");
}

export function showInfo(message?: string) {
  toast.info(message ?? "Đã cập nhật thông tin.");
}

// ─── Error message mapper (API → Vietnamese) ──────────────────────────────

const STATUS_MAP: Record<number, string> = {
  400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu đã tồn tại hoặc xung đột. Vui lòng thử lại.",
  422: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  429: "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.",
  500: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Máy chủ không phản hồi. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
};

const KEYWORD_MAP: Array<[RegExp, string]> = [
  [/network error/i, "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại."],
  [/failed to fetch/i, "Không thể tải dữ liệu. Vui lòng thử lại."],
  [/unauthorized/i, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."],
  [/forbidden/i, "Bạn không có quyền thực hiện thao tác này."],
  [/not found/i, "Không tìm thấy dữ liệu yêu cầu."],
  [/bad request/i, "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại."],
  [/internal server error/i, "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."],
  [/something went wrong/i, "Đã có lỗi xảy ra. Vui lòng thử lại."],
  [/invalid credentials?/i, "Email hoặc mật khẩu không chính xác."],
  [/validation failed/i, "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại."],
  [/timeout/i, "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."],
  [/insufficient balance/i, "Số dư không đủ để thực hiện giao dịch này."],
  [/slot.*not available|not available.*slot/i, "Khung giờ này không còn khả dụng."],
  [/already booked/i, "Khung giờ này đã được đặt."],
  [/upload.*fail|fail.*upload/i, "Không thể tải tệp lên. Vui lòng thử lại."],
  [/file too large/i, "Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn."],
  [/invalid file type/i, "Định dạng tệp không được hỗ trợ."],
  [/payment.*fail|fail.*payment/i, "Thanh toán thất bại. Vui lòng thử lại."],
];

// Returns true if a string looks like it's Vietnamese (has diacritics or common VI words).
function isVietnamese(s: string): boolean {
  return /[àáảãạăắặẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(s);
}

/**
 * Converts an unknown error value into a user-friendly Vietnamese string.
 * Priority: Vietnamese message from API → keyword mapping → status code → fallback.
 */
export function getVietnameseErrorMessage(err: unknown): string {
  // Structured API error objects (e.g. { message: "...", status: 401 })
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;

    const status =
      typeof obj.status === "number"
        ? obj.status
        : typeof obj.statusCode === "number"
          ? obj.statusCode
          : null;

    const rawMsg =
      typeof obj.message === "string"
        ? obj.message
        : typeof obj.error === "string"
          ? obj.error
          : null;

    if (rawMsg) {
      if (isVietnamese(rawMsg)) return rawMsg;
      const mapped = mapKeyword(rawMsg);
      if (mapped) return mapped;
    }

    if (status && STATUS_MAP[status]) return STATUS_MAP[status];

    if (err instanceof Error) return mapKeyword(err.message) ?? err.message;
  }

  if (typeof err === "string") {
    if (isVietnamese(err)) return err;
    return mapKeyword(err) ?? "Đã có lỗi xảy ra. Vui lòng thử lại.";
  }

  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

function mapKeyword(s: string): string | null {
  for (const [re, vi] of KEYWORD_MAP) {
    if (re.test(s)) return vi;
  }
  return null;
}

/** Convenience: getVietnameseErrorMessage + showError in one call. */
export function showApiError(err: unknown) {
  showError(getVietnameseErrorMessage(err));
}
