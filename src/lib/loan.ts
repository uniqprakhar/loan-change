// Pure financial math for loan balance transfer — no dependencies.

export type LoanType = "home" | "personal" | "car";

export interface LoanInput {
  amount: number;          // outstanding principal today (₹)
  rate: number;            // annual interest rate (%)
  tenureMonths: number;    // months remaining
}

export interface ScheduleRow {
  month: number;
  emi: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface LoanSummary {
  emi: number;
  totalInterest: number;
  totalOutgo: number;      // principal + interest
  months: number;
  schedule: ScheduleRow[];
}

export interface ScoreBand {
  label: string;
  min: number;
  max: number;
  tone: "excellent" | "good" | "fair" | "poor";
}

/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1). */
export const emi = (principal: number, annualRatePct: number, nMonths: number): number => {
  if (nMonths <= 0) return 0;
  if (principal <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r <= 0) return principal / nMonths;
  const f = Math.pow(1 + r, nMonths);
  return (principal * r * f) / (f - 1);
};

/** Month-by-month amortisation from today's outstanding balance. */
export const amortize = (input: LoanInput): LoanSummary => {
  const { amount, rate, tenureMonths } = input;
  const fixedEmi = emi(amount, rate, tenureMonths);
  const r = rate / 12 / 100;
  const schedule: ScheduleRow[] = [];
  let balance = amount;
  let totalInterest = 0;
  let month = 0;

  while (balance > 0.5 && month < tenureMonths + 120) {
    month += 1;
    const interest = balance * r;
    let principalPart = fixedEmi - interest;
    // Final month: pay off exactly what's left.
    if (principalPart >= balance || month >= tenureMonths) {
      principalPart = balance;
    }
    balance -= principalPart;
    totalInterest += interest;
    schedule.push({
      month,
      emi: interest + principalPart,
      interest,
      principal: principalPart,
      balance: Math.max(balance, 0),
    });
  }

  return {
    emi: fixedEmi,
    totalInterest,
    totalOutgo: amount + totalInterest,
    months: month,
    schedule,
  };
};

export interface TransferResult {
  old: LoanSummary;
  new: LoanSummary;
  newEmi: number;
  monthlySaving: number;          // old EMI − new EMI
  totalInterestSaving: number;    // lifetime interest saved (like-for-like tenure)
  tenureMonths: number;
}

/** Like-for-like comparison: same remaining tenure, new rate. */
export const compare = (input: LoanInput, newRate: number): TransferResult => {
  const oldSummary = amortize(input);
  const newSummary = amortize({ ...input, rate: newRate });
  return {
    old: oldSummary,
    new: newSummary,
    newEmi: newSummary.emi,
    monthlySaving: oldSummary.emi - newSummary.emi,
    totalInterestSaving: oldSummary.totalInterest - newSummary.totalInterest,
    tenureMonths: input.tenureMonths,
  };
};

export interface TenureMode {
  mode: "lower-emi" | "shorter-tenure";
  label: string;
  emi: number;
  months: number;
  totalInterest: number;
  interestSaved: number;
  yearsSaved: number;
}

/**
 * Two ways to enjoy the saving:
 *  - lower-emi: keep the same tenure, pay less monthly.
 *  - shorter-tenure: keep the OLD EMI, finish years earlier.
 */
export const tenureModes = (input: LoanInput, newRate: number): [TenureMode, TenureMode] => {
  const oldSummary = amortize(input);
  const lowerEmi = amortize({ ...input, rate: newRate });

  // Keep old EMI → solve n from EMI: n = −ln(1 − P·r/E) / ln(1+r)
  const r = newRate / 12 / 100;
  const P = input.amount;
  const E = oldSummary.emi;
  let shorterMonths: number;
  if (r <= 0) {
    shorterMonths = Math.ceil(P / E);
  } else if (E <= P * r) {
    shorterMonths = input.tenureMonths; // EMI can't even cover interest — keep tenure
  } else {
    shorterMonths = Math.ceil(-Math.log(1 - (P * r) / E) / Math.log(1 + r));
  }
  shorterMonths = Math.max(1, shorterMonths);
  const shorter = amortize({ ...input, rate: newRate, tenureMonths: shorterMonths });

  const mode = (m: "lower-emi" | "shorter-tenure"): TenureMode => {
    const s = m === "lower-emi" ? lowerEmi : shorter;
    return {
      mode: m,
      label: m === "lower-emi" ? "Lower my EMI" : "Finish years earlier",
      emi: s.emi,
      months: s.months,
      totalInterest: s.totalInterest,
      interestSaved: oldSummary.totalInterest - s.totalInterest,
      yearsSaved: (input.tenureMonths - s.months) / 12,
    };
  };
  return [mode("lower-emi"), mode("shorter-tenure")];
};

export interface BreakEven {
  transferCost: number;
  processingFee: number;
  foreclosure: number;
  breakEvenMonth: number | null; // null → never breaks even
  netLifetimeSaving: number;
}

/** Transfer costs: new bank processing fee + foreclosure on the old loan. */
export const breakEven = (
  result: TransferResult,
  outstanding: number,
  processingFee: number,
  foreclosurePct: number,
): BreakEven => {
  const foreclosure = (outstanding * foreclosurePct) / 100;
  const transferCost = processingFee + foreclosure;
  const monthly = result.monthlySaving;
  if (monthly <= 0) {
    return {
      transferCost,
      processingFee,
      foreclosure,
      breakEvenMonth: transferCost <= 0 ? 1 : null,
      netLifetimeSaving: result.totalInterestSaving - transferCost,
    };
  }
  const m = Math.ceil(transferCost / monthly);
  return {
    transferCost,
    processingFee,
    foreclosure,
    breakEvenMonth: m,
    netLifetimeSaving: result.totalInterestSaving - transferCost,
  };
};

// ── INR formatting ────────────────────────────────────────────────

/** 1234567 → "₹12.35 L" (lakh), 25000000 → "₹2.5 Cr" */
export const formatCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${trim2(n / 1_00_00_000)} Cr`;
  if (abs >= 1_00_000) return `₹${trim2(n / 1_00_000)} L`;
  return formatINR(n);
};

/** 123456 → "₹1,23,456" (Indian grouping). */
export const formatINR = (n: number): string => {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  const s = Math.abs(rounded).toString();
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}₹${grouped},${last3}`;
};

/** Raw string with commas but no ₹ — for input fields. */
export const groupINR = (n: number): string => {
  if (!isFinite(n)) return "";
  const [intPart, decPart] = n.toString().split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = intPart.replace("-", "");
  let grouped: string;
  if (digits.length <= 3) grouped = digits;
  else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return sign + grouped + (decPart !== undefined ? "." + decPart : "");
};

const trim2 = (n: number): string => {
  const s = n.toFixed(2);
  return s.endsWith("00") ? n.toFixed(0) : s.endsWith("0") ? n.toFixed(1) : s;
};

export const monthsToYearsLabel = (m: number): string => {
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} mo`;
  if (rem === 0) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${y}y ${rem}m`;
};

// ── Credit score bands ────────────────────────────────────────────

export const scoreBand = (score: number): ScoreBand => {
  if (score >= 750) return { label: "750+ · Excellent", min: 750, max: 900, tone: "excellent" };
  if (score >= 700) return { label: "700–749 · Good", min: 700, max: 749, tone: "good" };
  if (score >= 650) return { label: "650–699 · Fair", min: 650, max: 699, tone: "fair" };
  return { label: "Below 650 · Needs work", min: 300, max: 649, tone: "poor" };
};

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  home: "Home Loan",
  personal: "Personal Loan",
  car: "Car Loan",
};
