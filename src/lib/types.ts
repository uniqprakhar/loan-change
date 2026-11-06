import type { LoanType } from "./loan";

/** Form state lifted to App. */
export interface LoanState {
  loanType: LoanType;
  amount: number;
  rate: number;
  years: number;
  months: number;
  bankName: string;
  score: number;
  rateType: "floating" | "fixed";
}

/** Parsed, app-friendly bank offer. */
export interface BankOffer {
  id: string;
  bankName: string;
  loanType: LoanType;
  rate: number;
  feePct: number;
  feeMin: number;
  feeMax: number | null;
  scoreMin: number;
  scoreMax: number;
  updatedAt: string;
  sourceUrl: string | null;
  verifiedOn: string | null;
}

export interface TransferCostInfo {
  loanType: LoanType;
  foreclosurePct: number;
  foreclosureNote: string;
  otherCharges: string;
}
