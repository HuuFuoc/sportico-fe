"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import { listAdminReports, resolveReport } from "@/lib/social/api/admin-reports";
import type { AdminReportFilters, ResolveReportRequest } from "@/lib/social/types";

export function useAdminReports(filters: AdminReportFilters) {
  return useQuery({
    queryKey: qk.adminReports.list(filters),
    queryFn: () => listAdminReports(filters),
    placeholderData: keepPreviousData,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: ResolveReportRequest }) =>
      resolveReport(reportId, payload),
    // The backend saves the report as resolved BEFORE running the moderation
    // action, so even a FAILED resolve can have changed report state —
    // invalidate on both outcomes, per the brief.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.adminReports.all });
      void queryClient.invalidateQueries({ queryKey: qk.adminCommunityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
    },
  });
}
