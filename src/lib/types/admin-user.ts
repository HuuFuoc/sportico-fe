// ============================================================================
// Admin user management DTOs — mirrors GET/POST/PUT/DELETE /api/admin/users.
// ============================================================================

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  /** Singular role string (spec). Some backend versions return roles[] instead. */
  role?: string;
  /** Plural roles array — returned by some backend versions. */
  roles?: string[];
  status: string; // "active" | "inactive" | "pending"
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserItem {
  updatedAt: string;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AdminUserQuery {
  search?: string;
  role?: string;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
}
