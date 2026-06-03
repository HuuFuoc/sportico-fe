// ============================================================================
// Admin user management service — wraps /api/admin/users via the Result<T>
// envelope helper. Components never call apiFetch directly.
// ============================================================================

import { callData, callVoid, jsonBody } from "@/lib/api-result";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import type {
  AdminUserDetail,
  AdminUserListResponse,
  AdminUserQuery,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/lib/types/admin-user";

export function getUsers(
  query: AdminUserQuery = {},
): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  if (query.pageNumber != null) params.set("pageNumber", String(query.pageNumber));
  if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return callData<AdminUserListResponse>(
    `${ep.adminUsers}${qs ? "?" + qs : ""}`,
  );
}

export function getUserById(id: string): Promise<AdminUserDetail> {
  return callData<AdminUserDetail>(ep.adminUserById(id));
}

export function createUser(
  payload: CreateUserRequest,
): Promise<AdminUserDetail> {
  return callData<AdminUserDetail>(ep.adminUsers, {
    method: "POST",
    ...jsonBody(payload),
  });
}

export function updateUser(
  id: string,
  payload: UpdateUserRequest,
): Promise<AdminUserDetail> {
  return callData<AdminUserDetail>(ep.adminUserById(id), {
    method: "PUT",
    ...jsonBody(payload),
  });
}

export function deactivateUser(id: string): Promise<void> {
  return callVoid(ep.adminUserById(id), { method: "DELETE" });
}
