"use client";

import { useMutation } from "@tanstack/react-query";
import { createReport } from "@/lib/social/api/reports";
import type { CreateReportRequest } from "@/lib/social/types";

export function useCreateReport() {
  return useMutation({
    mutationFn: (payload: CreateReportRequest) => createReport(payload),
  });
}
