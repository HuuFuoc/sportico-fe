// ============================================================================
// Admin voucher campaign API.
//
// Every derived status label (scheduled, expired, out-of-uses, out-of-budget)
// is computed on the frontend from the raw fields — never sent as a filter
// value, since the backend only knows draft/active/paused/ended.
// ============================================================================

import { callData, callPage, buildQuery, postJson, putJson } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  CreateVoucherCampaignRequest,
  PagedResult,
  UpdateVoucherCampaignRequest,
  VoucherCampaignResponse,
  VoucherRedemptionResponse,
} from "@/lib/social/types";

export interface AdminVoucherCampaignFilters {
  status?: string | null;
  keyword?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

export function listVoucherCampaigns(
  filters: AdminVoucherCampaignFilters = {},
): Promise<PagedResult<VoucherCampaignResponse>> {
  return callPage<VoucherCampaignResponse>(
    ep.adminVoucherCampaigns +
      buildQuery({
        Status: filters.status,
        Keyword: filters.keyword,
        PageNumber: filters.pageNumber ?? 1,
        PageSize: filters.pageSize ?? 20,
      }),
  );
}

export function getVoucherCampaign(campaignId: string): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaignById(campaignId));
}

/** Always created as `draft` — the backend decides, never assume `active`. */
export function createVoucherCampaign(
  payload: CreateVoucherCampaignRequest,
): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaigns, postJson(payload));
}

export function updateVoucherCampaign(
  campaignId: string,
  payload: UpdateVoucherCampaignRequest,
): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaignById(campaignId), putJson(payload));
}

export function activateVoucherCampaign(campaignId: string): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaignActivate(campaignId), putJson());
}

export function pauseVoucherCampaign(campaignId: string): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaignPause(campaignId), putJson());
}

export function endVoucherCampaign(campaignId: string): Promise<VoucherCampaignResponse> {
  return callData<VoucherCampaignResponse>(ep.adminVoucherCampaignEnd(campaignId), putJson());
}

export interface AdminVoucherRedemptionFilters {
  status?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

export function listVoucherRedemptions(
  campaignId: string,
  filters: AdminVoucherRedemptionFilters = {},
): Promise<PagedResult<VoucherRedemptionResponse>> {
  return callPage<VoucherRedemptionResponse>(
    ep.adminVoucherRedemptions(campaignId) +
      buildQuery({
        Status: filters.status,
        PageNumber: filters.pageNumber ?? 1,
        PageSize: filters.pageSize ?? 20,
      }),
  );
}
