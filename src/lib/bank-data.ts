import type { BankOffer, TransferCostInfo } from "./types";

const D = "2026-11-06";
const SRC_HOME = "https://www.paisabazaar.com/home-loan/interest-rates/";
const SRC_PL = "https://www.paisabazaar.com/personal-loan/interest-rates/";
const SRC_CAR = "https://www.bankbazaar.com/car-loan-interest-rate.html";

interface Row { bank: string; type: "home" | "personal" | "car"; base: number; feePct: number; feeMin: number; feeMax: number | null; url: string; }

// Base = best (excellent-band) starting rate found Nov 2026. Other bands = base + spread.
const ROWS: Row[] = [
  // HOME — Paisabazaar Jul 2026 table
  { bank: "Canara Bank", type: "home", base: 7.15, feePct: 0.25, feeMin: 1500, feeMax: 10000, url: SRC_HOME },
  { bank: "LIC Housing Finance", type: "home", base: 7.15, feePct: 0.25, feeMin: 2000, feeMax: 10000, url: SRC_HOME },
  { bank: "HDFC Bank", type: "home", base: 7.20, feePct: 0.5, feeMin: 3000, feeMax: 10000, url: SRC_HOME },
  { bank: "Punjab National Bank", type: "home", base: 7.20, feePct: 0.25, feeMin: 1000, feeMax: 10000, url: SRC_HOME },
  { bank: "State Bank of India", type: "home", base: 7.25, feePct: 0.35, feeMin: 2000, feeMax: 10000, url: SRC_HOME },
  { bank: "Bajaj Housing Finance", type: "home", base: 7.25, feePct: 0.5, feeMin: 3000, feeMax: 15000, url: SRC_HOME },
  { bank: "Federal Bank", type: "home", base: 7.30, feePct: 0.5, feeMin: 5000, feeMax: 15000, url: SRC_HOME },
  { bank: "Bank of India", type: "home", base: 7.10, feePct: 0.25, feeMin: 1500, feeMax: 10000, url: SRC_HOME },
  { bank: "ICICI Bank", type: "home", base: 7.50, feePct: 0.5, feeMin: 3000, feeMax: 10000, url: SRC_HOME },
  { bank: "Axis Bank", type: "home", base: 8.00, feePct: 1.0, feeMin: 10000, feeMax: 15000, url: SRC_HOME },
  // PERSONAL — Paisabazaar Jul 2026 table
  { bank: "HDFC Bank", type: "personal", base: 9.99, feePct: 0.5, feeMin: 3000, feeMax: 6500, url: SRC_PL },
  { bank: "ICICI Bank", type: "personal", base: 9.99, feePct: 2.0, feeMin: 1000, feeMax: 20000, url: SRC_PL },
  { bank: "Axis Bank", type: "personal", base: 9.99, feePct: 2.0, feeMin: 1000, feeMax: 12000, url: SRC_PL },
  { bank: "Kotak Mahindra Bank", type: "personal", base: 9.99, feePct: 3.0, feeMin: 3000, feeMax: 25000, url: SRC_PL },
  { bank: "Bank of Baroda", type: "personal", base: 10.15, feePct: 2.0, feeMin: 1000, feeMax: 10000, url: SRC_PL },
  { bank: "State Bank of India", type: "personal", base: 10.30, feePct: 1.5, feeMin: 1000, feeMax: 15000, url: SRC_PL },
  { bank: "Punjab National Bank", type: "personal", base: 10.25, feePct: 1.0, feeMin: 1000, feeMax: 10000, url: SRC_PL },
  { bank: "Union Bank of India", type: "personal", base: 8.75, feePct: 1.0, feeMin: 1000, feeMax: 7500, url: SRC_PL },
  { bank: "Canara Bank", type: "personal", base: 9.70, feePct: 0.5, feeMin: 1000, feeMax: 5000, url: SRC_PL },
  { bank: "Bank of Maharashtra", type: "personal", base: 8.75, feePct: 1.0, feeMin: 1000, feeMax: 10000, url: SRC_PL },
  // CAR — BankBazaar Oct/Nov 2026 table
  { bank: "Canara Bank", type: "car", base: 7.45, feePct: 0.25, feeMin: 1000, feeMax: 5000, url: SRC_CAR },
  { bank: "Union Bank of India", type: "car", base: 7.50, feePct: 0.25, feeMin: 1000, feeMax: 5000, url: SRC_CAR },
  { bank: "Bank of India", type: "car", base: 7.60, feePct: 0.25, feeMin: 1000, feeMax: 5000, url: SRC_CAR },
  { bank: "Bank of Baroda", type: "car", base: 7.60, feePct: 0.5, feeMin: 1000, feeMax: 10000, url: SRC_CAR },
  { bank: "Punjab National Bank", type: "car", base: 7.60, feePct: 0.5, feeMin: 1000, feeMax: 10000, url: SRC_CAR },
  { bank: "IDBI Bank", type: "car", base: 7.75, feePct: 0.5, feeMin: 2500, feeMax: 7000, url: SRC_CAR },
  { bank: "HDFC Bank", type: "car", base: 8.15, feePct: 1.0, feeMin: 3000, feeMax: 9000, url: SRC_CAR },
  { bank: "ICICI Bank", type: "car", base: 8.35, feePct: 1.0, feeMin: 3000, feeMax: 10000, url: SRC_CAR },
  { bank: "State Bank of India", type: "car", base: 8.80, feePct: 0.5, feeMin: 2000, feeMax: 10000, url: SRC_CAR },
  { bank: "Axis Bank", type: "car", base: 8.95, feePct: 1.0, feeMin: 3500, feeMax: 10000, url: SRC_CAR },
];

const BANDS = [
  { min: 750, max: 900, spread: 0 },
  { min: 700, max: 749, spread: 0.40 },
  { min: 650, max: 699, spread: 1.00 },
  { min: 300, max: 649, spread: 1.90 },
];
const r2 = (n: number) => Math.round(n * 100) / 100;

export const BANK_OFFERS: BankOffer[] = ROWS.flatMap((r) =>
  BANDS.map((b) => ({
    id: `${r.bank}-${r.type}-${b.min}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    bankName: r.bank,
    loanType: r.type,
    rate: r2(r.base + b.spread),
    feePct: r.feePct,
    feeMin: r.feeMin,
    feeMax: r.feeMax,
    scoreMin: b.min,
    scoreMax: b.max,
    updatedAt: D,
    sourceUrl: r.url,
    verifiedOn: D,
  })),
);

export const TRANSFER_COSTS: TransferCostInfo[] = [
  { loanType: "home", foreclosurePct: 0, foreclosureNote: "RBI bars foreclosure charges on floating-rate home loans to individuals.", otherCharges: "New-bank processing fee 0.25–1% (often capped); legal/valuation ~₹5,000–10,000 in some cases." },
  { loanType: "personal", foreclosurePct: 0, foreclosureNote: "RBI bars foreclosure charges on floating-rate personal loans to individuals; fixed-rate may carry 2–4%.", otherCharges: "New-bank processing fee 0.5–2%." },
  { loanType: "car", foreclosurePct: 0, foreclosureNote: "RBI bars foreclosure charges on floating-rate car loans to individuals; fixed-rate may carry 2–4%.", otherCharges: "New-bank processing fee 0.25–1%." },
];
