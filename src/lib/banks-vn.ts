// ============================================================================
// Vietnamese banks + their 6-digit Napas/VietQR BIN codes.
//
// The payout backend requires `bankBin` (exactly 6 digits, e.g. 970415) when a
// coach saves a payout account. Coaches don't know their bank's BIN, so the UI
// offers a bank picker that fills both the display name and the BIN.
//
// Source: Napas / VietQR official BIN registry. Ordered roughly by popularity.
// ============================================================================

export interface VnBank {
  /** 6-digit Napas BIN. */
  bin: string;
  /** Short code shown in the picker (e.g. "VCB"). */
  code: string;
  /** Full Vietnamese name. */
  name: string;
}

export const VN_BANKS: VnBank[] = [
  { bin: "970436", code: "VCB", name: "Vietcombank" },
  { bin: "970415", code: "CTG", name: "VietinBank" },
  { bin: "970418", code: "BIDV", name: "BIDV" },
  { bin: "970405", code: "AGR", name: "Agribank" },
  { bin: "970407", code: "TCB", name: "Techcombank" },
  { bin: "970422", code: "MB", name: "MB Bank" },
  { bin: "970416", code: "ACB", name: "ACB" },
  { bin: "970432", code: "VPB", name: "VPBank" },
  { bin: "970423", code: "TPB", name: "TPBank" },
  { bin: "970403", code: "STB", name: "Sacombank" },
  { bin: "970437", code: "HDB", name: "HDBank" },
  { bin: "970441", code: "VIB", name: "VIB" },
  { bin: "970443", code: "SHB", name: "SHB" },
  { bin: "970431", code: "EIB", name: "Eximbank" },
  { bin: "970426", code: "MSB", name: "MSB" },
  { bin: "970448", code: "OCB", name: "OCB" },
  { bin: "970440", code: "SEAB", name: "SeABank" },
  { bin: "970449", code: "LPB", name: "LPBank" },
  { bin: "970409", code: "BAB", name: "Bac A Bank" },
  { bin: "970412", code: "PVCB", name: "PVcomBank" },
  { bin: "970400", code: "SGICB", name: "Saigonbank" },
  { bin: "970406", code: "DOB", name: "DongA Bank" },
  { bin: "970408", code: "GPB", name: "GPBank" },
  { bin: "970428", code: "NAB", name: "Nam A Bank" },
  { bin: "970419", code: "NCB", name: "NCB" },
  { bin: "970427", code: "VAB", name: "VietABank" },
  { bin: "970433", code: "VIETBANK", name: "VietBank" },
  { bin: "970438", code: "BVB", name: "BaoViet Bank" },
  { bin: "970452", code: "KLB", name: "KienLongBank" },
  { bin: "970430", code: "PGB", name: "PGBank" },
  { bin: "970425", code: "ABB", name: "ABBANK" },
  { bin: "970429", code: "SCB", name: "SCB" },
  { bin: "970454", code: "BVBANK", name: "BVBank (Bản Việt)" },
  { bin: "970421", code: "VRB", name: "VRB" },
  { bin: "970457", code: "WVN", name: "Woori Bank" },
  { bin: "970439", code: "PBVN", name: "Public Bank" },
  { bin: "970424", code: "SHBVN", name: "Shinhan Bank" },
  { bin: "970442", code: "HLBVN", name: "Hong Leong Bank" },
  { bin: "970434", code: "IVB", name: "Indovina Bank" },
  { bin: "970444", code: "CBB", name: "CBBank" },
  { bin: "970446", code: "COOPBANK", name: "Co-opBank" },
];

/** Look up a bank by its 6-digit BIN. */
export function findBankByBin(bin?: string | null): VnBank | undefined {
  if (!bin) return undefined;
  return VN_BANKS.find((b) => b.bin === bin);
}

/** Best-effort match of a free-text bank name to a known bank (for legacy
 *  accounts saved before the BIN field existed). */
export function findBankByName(name?: string | null): VnBank | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return VN_BANKS.find(
    (b) =>
      b.name.toLowerCase() === n ||
      b.code.toLowerCase() === n ||
      b.name.toLowerCase().replace(/\s+/g, "") === n.replace(/\s+/g, ""),
  );
}

/** True when the value is a valid Napas BIN (exactly 6 digits). */
export function isValidBankBin(bin: string): boolean {
  return /^\d{6}$/.test(bin);
}
