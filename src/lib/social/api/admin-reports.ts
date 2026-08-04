// ============================================================================
// Admin report queue API.
//
// The backend persists the report as `resolved`/`rejected` BEFORE running the
// moderation action. If the moderation action itself then fails, the report
// row is still updated — so callers must invalidate report queries even on a
// resolve error, never only on success.
// ============================================================================

import { callData, callPage, buildQuery, putJson } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type { AdminReportFilters, PagedResult, ReportResponse, ResolveReportRequest } from "@/lib/social/types";

export function listAdminReports(
  filters: AdminReportFilters = {},
): Promise<PagedResult<ReportResponse>> {
  return callPage<ReportResponse>(
    ep.adminReports +
      buildQuery({
        TargetType: filters.targetType,
        Status: filters.status,
        PageNumber: filters.pageNumber ?? 1,
        // Hard client cap — the backend does not enforce one itself.
        PageSize: Math.min(filters.pageSize ?? 20, 100),
      }),
  );
}

export function resolveReport(
  reportId: string,
  payload: ResolveReportRequest,
): Promise<ReportResponse> {
  return callData<ReportResponse>(ep.adminResolveReport(reportId), putJson(payload));
}
