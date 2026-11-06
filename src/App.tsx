import { useMemo, useState } from "react";
import { BANK_OFFERS, TRANSFER_COSTS } from "./lib/bank-data";
import { ArrowLeftRight, ShieldCheck, Calculator, Sparkles } from "lucide-react";
import { LoanForm } from "./components/LoanForm";
import { Results } from "./components/Results";
import { BankTable } from "./components/BankTable";
import { BestTime } from "./components/BestTime";
import { AdvisorChat } from "./components/AdvisorChat";
import { breakEven, bestTimeToSwitch, compare, emi, formatCompact, monthsToYearsLabel } from "./lib/loan";
import type { LoanState } from "./lib/types";

const DEFAULT_STATE: LoanState = {
  loanType: "home",
  amount: 3_000_000,
  rate: 8.7,
  years: 10,
  months: 0,
  bankName: "HDFC Bank",
  score: 780,
  rateType: "floating",
};

export default function App() {
  const [state, setState] = useState<LoanState>(DEFAULT_STATE);
  const patch = (p: Partial<LoanState>) => setState((s) => ({ ...s, ...p }));
  const offers = BANK_OFFERS;
  const costs = TRANSFER_COSTS;
  const loading = false;
  const error: string | null = null;
  const scoreMin = state.score >= 750 ? 750 : state.score >= 700 ? 700 : state.score >= 650 ? 650 : 0;
  const scoreMax = state.score >= 750 ? 900 : state.score >= 700 ? 749 : state.score >= 650 ? 699 : 649;
  const bandOffers = useMemo(
    () => offers.filter((o) => o.loanType === state.loanType && o.scoreMin === scoreMin && o.scoreMax === scoreMax),
    [offers, state.loanType, scoreMin, scoreMax],
  );
  const costInfo = costs.find((c) => c.loanType === state.loanType);
  const foreclosurePct = state.rateType === "fixed" ? 2 : (costInfo?.foreclosurePct ?? 0);
  const tenureMonths = Math.max(1, state.years * 12 + state.months);
  const bestOffer = useMemo(() => {
    if (bandOffers.length === 0) return null;
    const currentEmi = emi(state.amount, state.rate, tenureMonths);
    return (
      bandOffers
        .map((o) => {
          const newEmi = emi(state.amount, o.rate, tenureMonths);
          const fee = Math.min(Math.max((state.amount * o.feePct) / 100, o.feeMin), o.feeMax ?? Infinity);
          return { o, net: (currentEmi - newEmi) * tenureMonths - fee, newEmi, fee };
        })
        .sort((a, b) => b.net - a.net)[0] ?? null
    );
  }, [bandOffers, state.amount, state.rate, tenureMonths]);
  const newRate = bestOffer && bestOffer.newEmi < emi(state.amount, state.rate, tenureMonths) ? bestOffer.o.rate : null;
  const feeForBest = bestOffer?.fee ?? 0;
  const cmp = newRate !== null ? compare({ amount: state.amount, rate: state.rate, tenureMonths }, newRate) : null;
  const be = cmp !== null ? breakEven(cmp, state.amount, feeForBest, foreclosurePct) : null;
  const bestTime = useMemo(
    () => (newRate !== null ? bestTimeToSwitch({ amount: state.amount, rate: state.rate, tenureMonths }, newRate, feeForBest) : null),
    [state.amount, state.rate, tenureMonths, newRate, feeForBest],
  );
  const bestOfferSummary = bestOffer
    ? `${bestOffer.o.bankName} @ ${bestOffer.o.rate.toFixed(2)}% (processing fee)`
    : "no better rate in the table for this score band";
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBI bars foreclosure charges on floating-rate loans to individuals
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Loan balance transfer, <span className="text-emerald-600">decoded</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Enter what you owe, your current rate and your credit score. Estimates only; always verify with the bank.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-display mb-4 flex items-center gap-2 text-base font-semibold">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Your loan details
              </h2>
              <LoanForm state={state} onChange={patch} />
            </section>
          </div>
          <div className="space-y-6">
            <Results state={state} newRate={newRate} processingFee={feeForBest} foreclosurePct={foreclosurePct} />
            <BankTable offers={bandOffers} loading={loading} error={error} state={state} onPickBank={(o) => patch({ rate: o.rate, bankName: o.bankName })} />
            <BestTime analysis={bestTime} offeredRate={newRate} currentRate={state.rate} tenureMonths={tenureMonths} loading={loading} />
            <AdvisorChat state={state} bestOfferSummary={bestOfferSummary} newRate={newRate} monthlySaving={cmp?.monthlySaving ?? null} totalSaving={cmp?.totalInterestSaving ?? null} transferCost={be?.transferCost ?? feeForBest} />
          </div>
        </div>
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ArrowLeftRight, title: "What is a balance transfer?", body: "Your new bank pays off the old loan; you repay the new bank at their (lower) rate." },
            { icon: ShieldCheck, title: "Why it's cheap in India", body: "RBI has barred foreclosure charges on floating-rate loans to individuals. Main cost is the new bank processing fee." },
            { icon: Sparkles, title: "When it's worth it", body: "Roughly: rate gap of 0.5% or more, 4-5 years left, and net saving clearly beats the fee." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <c.icon className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display mt-2.5 text-sm font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
