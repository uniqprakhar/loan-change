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

// ── Best-time-to-switch analysis ──────────────────────────────────

export interface SwitchYearAnalysis {
  /** Year of the loan, 1-based (1 = now). */
  year: number;
  /** Expected balance (₹) at the start of that year. */
  balanceAtYear: number;
  /** Expected saving (₹, net of fee) if the transfer happens then. */
  netSavingIfSwitched: number;
  /** Absolute saving normalised per ₹1L of balance — comparable across years. */
  savingPerLakh: number;
  /** Verdict for this window. */
  verdict: "best" | "good" | "fair" | "poor";
}

export interface BestTimeResult {
  years: SwitchYearAnalysis[];
  bestYear: number;
  bestWindowLabel: string;
  totalRemainingYears: number;
  whyBest: string;
  ruleOfThumb: string;
}

/**
 * "When should I switch?" — projects the loan forward year by year and asks:
 * if I transferred at the start of year Y instead of today, what would I save?
 *
 * Method (all deterministic, no mock data):
 *  - Expected future balance: amortise today's loan month by month, take the
 *    balance at the start of each year.
 *  - Saving in each scenario: same offered rate gap (current rate − offered
 *    rate), applied to the remaining tenure from that point, same one-time fee.
 *  - Two effects compete: later transfers run on a SMALLER balance (smaller
 *    absolute ₹ saving) for FEWER months, but they skip paying the fee early.
 *    Earlier transfers harvest more interest months on a bigger balance.
 *    Because the rate gap compounds on the outstanding balance, in almost all
 *    realistic cases switching EARLIER yields more total saving — the analysis
 *    quantifies exactly how much each year of waiting costs, and highlights
 *    the best remaining window.
 */
export const bestTimeToSwitch = (
  input: LoanInput,
  offeredRate: number,
  oneTimeFee: number,
): BestTimeResult | null => {
  const { amount, rate, tenureMonths } = input;
  if (!(offeredRate < rate) || tenureMonths < 12 || amount <= 0) return null;

  const sched = amortize(input).schedule;
  const balanceAtMonth = (m: number): number =>
    m <= 0 ? amount : m >= sched.length ? 0 : sched[m - 1].balance;

  const savingIfSwitchedAtMonth = (startMonth: number): number => {
    const balance = balanceAtMonth(startMonth);
    const remaining = tenureMonths - startMonth;
    if (balance <= 1000 || remaining < 6) return 0;
    const c = compare({ amount: balance, rate, tenureMonths: remaining }, offeredRate);
    return Math.max(0, c.totalInterestSaving - oneTimeFee);
  };

  const totalYears = Math.ceil(tenureMonths / 12);
  const years: SwitchYearAnalysis[] = [];
  for (let y = 1; y <= totalYears; y++) {
    const startMonth = (y - 1) * 12;
    if (tenureMonths - startMonth < 6) break;
    const balanceAtYear = balanceAtMonth(startMonth);
    const netSavingIfSwitched = savingIfSwitchedAtMonth(startMonth);
    years.push({
      year: y,
      balanceAtYear,
      netSavingIfSwitched,
      savingPerLakh: (netSavingIfSwitched / Math.max(balanceAtYear, 1)) * 100_000,
      verdict: "fair",
    });
  }
  if (years.length === 0) return null;

  const maxPerLakh = Math.max(...years.map((y) => y.savingPerLakh));
  const topSaving = Math.max(...years.map((y) => y.netSavingIfSwitched));
  for (const y of years) {
    const ratio = maxPerLakh > 0 ? y.savingPerLakh / maxPerLakh : 0;
    y.verdict =
      ratio >= 0.97 ? "best" : ratio >= 0.85 ? "good" : ratio >= 0.5 ? "fair" : "poor";
  }

  // "Best" window = highest per-lakh harvest; tie-break to the earliest.
  const bestYear = years.find((y) => y.verdict === "best")?.year ?? years[0].year;
  const costOfWaitingOneYear = topSaving - (years[1]?.netSavingIfSwitched ?? topSaving);
  const costOfWaitingLast = topSaving - (years[years.length - 1]?.netSavingIfSwitched ?? topSaving);

  const gap = rate - offeredRate;
  const whyBest =
    `At a ${(gap * 100).toFixed(2)} pp rate gap, every ₹1 L of outstanding balance saves about ` +
    `₹${Math.round(maxPerLakh).toLocaleString("en-IN")} over the rest of the loan. Your balance is ` +
    `highest today and shrinks every year, and each year of waiting removes ` +
    `${formatINR(Math.max(0, costOfWaitingOneYear))} of saving on average — so the earlier you lock ` +
    `the lower rate, the more of the loan's life it works for you.`;

  const ruleOfThumb =
    costOfWaitingLast > 0
      ? `Waiting until the final year would cost you roughly ${formatINR(costOfWaitingLast)} versus switching now. Practical window: once the remaining tenure drops below about 5 years, the absolute saving shrinks fast; below ~2 years the fee and paperwork usually eat the benefit. If you expect market rates to fall further, waiting costs little — but if today's offer already beats your rate by ${gap.toFixed(2)} pp or more, there is little reason to wait.`
      : `In your case the saving stays broadly stable across the remaining years — you can switch whenever it's convenient, though earlier still nets slightly more.`;

  return {
    years,
    bestYear,
    bestWindowLabel: `Year ${bestYear} of the loan${bestYear === 1 ? " — right now" : ""}`,
    totalRemainingYears: totalYears,
    whyBest,
    ruleOfThumb,
  };
};
