"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  activateVoucherCampaign,
  createVoucherCampaign,
  endVoucherCampaign,
  getVoucherCampaign,
  listVoucherCampaigns,
  listVoucherRedemptions,
  pauseVoucherCampaign,
  updateVoucherCampaign,
  type AdminVoucherCampaignFilters,
  type AdminVoucherRedemptionFilters,
} from "@/lib/social/api/admin-vouchers";
import type { CreateVoucherCampaignRequest, UpdateVoucherCampaignRequest } from "@/lib/social/types";

export function useVoucherCampaigns(filters: AdminVoucherCampaignFilters) {
  return useQuery({
    queryKey: qk.adminVoucherCampaigns.list(filters),
    queryFn: () => listVoucherCampaigns(filters),
    placeholderData: keepPreviousData,
  });
}

export function useVoucherCampaign(campaignId: string) {
  return useQuery({
    queryKey: qk.adminVoucherCampaign(campaignId),
    queryFn: () => getVoucherCampaign(campaignId),
    enabled: Boolean(campaignId),
  });
}

export function useVoucherRedemptions(campaignId: string, filters: AdminVoucherRedemptionFilters) {
  return useQuery({
    queryKey: qk.adminVoucherRedemptions.list(campaignId, filters),
    queryFn: () => listVoucherRedemptions(campaignId, filters),
    enabled: Boolean(campaignId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateVoucherCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVoucherCampaignRequest) => createVoucherCampaign(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.adminVoucherCampaigns.all }),
  });
}

export function useUpdateVoucherCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVoucherCampaignRequest) => updateVoucherCampaign(campaignId, payload),
    // Refetch on both outcomes: a 409 VOUCHER_CAMPAIGN_HAS_REDEMPTIONS still
    // needs a fresh campaign so the UI can re-lock the financial fields.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.adminVoucherCampaign(campaignId) });
      void queryClient.invalidateQueries({ queryKey: qk.adminVoucherCampaigns.all });
    },
  });
}

function useTransition(campaignId: string, fn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fn(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.adminVoucherCampaign(campaignId) });
      void queryClient.invalidateQueries({ queryKey: qk.adminVoucherCampaigns.all });
    },
  });
}

export function useActivateVoucherCampaign(campaignId: string) {
  return useTransition(campaignId, activateVoucherCampaign);
}
export function usePauseVoucherCampaign(campaignId: string) {
  return useTransition(campaignId, pauseVoucherCampaign);
}
export function useEndVoucherCampaign(campaignId: string) {
  return useTransition(campaignId, endVoucherCampaign);
}
