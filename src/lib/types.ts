import type { LoanType } from "./loan";

/** Form state lifted to App. */
export interface LoanState {
  loanType: LoanType;
  amount: number;        // outstanding principal today (₹)
  rate: number;          // current annual rate (%)
  years: number;         // remaining tenure
  months: number;        // remaining tenure (months part)
  bankName: string;      // current bank (optional)
  score: number;         // CIBIL 300–900
  rateType: "floating" | "fixed";
}

/** Row of bank_rates as returned by the DB (numerics arrive as strings). */
export interface BankRateRow {
  id: string;
  bank_name: string;
  loan_type: string;
  score_min: number;
  score_max: number;
  rate: string;
  processing_fee_pct: string;
  processing_fee_min: string;
  processing_fee_max: string | null;
  updated_at: string;
}

/** Row of transfer_costs as returned by the DB. */
export interface TransferCostRow {
  loan_type: string;
  foreclosure_pct: string;
  foreclosure_note: string;
  other_charges: string;
}

/** Parsed, app-friendly bank offer. */
export interface BankOffer {
  bankName: string;
  loanType: LoanType;
  rate: number;
  feePct: number;
  feeMin: number;
  feeMax: number | null;
  scoreMin: number;
  scoreMax: number;
  updatedAt: string;
}

export interface TransferCostInfo {
  loanType: LoanType;
  foreclosurePct: number;
  foreclosureNote: string;
  otherCharges: string;
}
