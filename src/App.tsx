import { useEffect, useMemo, useState } from "react";
import { db } from "@broodle/data";
import { ArrowLeftRight, ShieldCheck, Calculator, Sparkles } from "lucide-react";
import { LoanForm } from "./components/LoanForm";
import { Results } from "./components/Results";
import { BankTable } from "./components/BankTable";
import { AdvisorChat } from "./components/AdvisorChat";
import { breakEven, compare, emi, formatCompact, monthsToYearsLabel } from "./lib/loan";
import type { LoanState, BankOffer, TransferCostInfo } from "./lib/types";

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
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [costs, setCosts] = useState<TransferCostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);

  const patch = (p: Partial<LoanState>) => setState((s) => ({ ...s, ...p }));

  // Load bank rates + transfer cost norms from the built-in DB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ratesRes, costsRes] = await Promise.all([
          db.query("SELECT * FROM bank_rates ORDER BY loan_type, score_min, rate"),
          db.query("SELECT * FROM transfer_costs"),
        ]);
        if (cancelled) return;
        if (!ratesRes.ok) throw new Error(ratesRes.error?.message ?? "rate table unavailable");
        const costRows = costsRes.ok ? costsRes.rows : [];
        setCosts(
          costRows.map((c) => ({
            loanType: c.loan_type as TransferCostInfo["loanType"],
            foreclosurePct: Number(c.foreclosure_pct),
            foreclosureNote: c.foreclosure_note,
            otherCharges: c.other_charges,
          })),
        );
        const mapped: BankOffer[] = ratesRes.rows.map((r) => ({
          id: r.id,
          bankName: r.bank_name,
          loanType: r.loan_type,
          rate: Number(r.rate),
          feePct: Number(r.processing_fee_pct),
          feeMin: Number(r.processing_fee_min ?? 0),
          feeMax: r.processing_fee_max !== null && r.processing_fee_max !== undefined ? Number(r.processing_fee_max) : null,
          scoreMin: Number(r.score_min),
          scoreMax: Number(r.score_max),
          updatedAt: r.updated_at,
        }));
        setOffers(mapped);
        const stamps = ratesRes.rows.map((r) => r.updated_at).filter(Boolean).sort();
        if (stamps.length > 0) setRatesUpdatedAt(stamps[stamps.length - 1]);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const be =
    cmp !== null
      ? breakEven(cmp, state.amount, feeForBest, foreclosurePct)
      : null;

  const bestOfferSummary = bestOffer
    ? `${bestOffer.o.bankName} @ ${bestOffer.o.rate.toFixed(2)}% (processing fee ≈ ${formatCompact(bestOffer.fee)})`
    : "no better rate in the table for this score band";

  const fallbackNewRate = Math.max(0, state.rate - 0.5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBI bars foreclosure charges on floating-rate loans to individuals — switching is nearly free
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Loan balance transfer, <span className="text-emerald-600">decoded</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Enter what you owe, your current rate and your credit score. We'll show exactly how much you'd
            save by moving your loan to another bank — monthly, lifetime, and after every fee. No sign-up,
            nothing stored.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left column: form */}
          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-display mb-4 flex items-center gap-2 text-base font-semibold">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Your loan details
              </h2>
              <LoanForm state={state} onChange={patch} />
            </section>
          </div>

          {/* Right column: results + banks + advisor */}
          <div className="space-y-6">
            <Results
              state={state}
              newRate={newRate}
              processingFee={feeForBest}
              foreclosurePct={foreclosurePct}
            />

            <BankTable
              offers={bandOffers}
              loading={loading}
              error={error}
              state={state}
              updatedAt={ratesUpdatedAt}
              onPickBank={(o) => patch({ rate: o.rate, bankName: o.bankName })}
            />

            <AdvisorChat
              state={state}
              bestOfferSummary={bestOfferSummary}
              newRate={newRate}
              monthlySaving={cmp?.monthlySaving ?? null}
              totalSaving={cmp?.totalInterestSaving ?? null}
              transferCost={be?.transferCost ?? feeForBest}
            />

            {/* Fallback hint when DB is unavailable */}
            {error && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Bank rate table unavailable ({error}). Tip: if another bank quoted you a rate, reduce your
                "current interest rate" to that rate and the savings above recompute instantly. For the demo
                case — ₹30L at {state.rate.toFixed(2)}% → {(fallbackNewRate).toFixed(2)}% over{" "}
                {monthsToYearsLabel(tenureMonths)} — savings recompute live as you type.
              </p>
            )}
          </div>
        </div>

        {/* How it works */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ArrowLeftRight,
              title: "What is a balance transfer?",
              body: "Your new bank pays off the old loan; you repay the new bank at their (lower) rate. Your outstanding amount stays the same — only the interest math changes.",
            },
            {
              icon: ShieldCheck,
              title: "Why it's cheap in India",
              body: "RBI has barred banks from charging foreclosure or prepayment on floating-rate loans to individual borrowers. Your only real cost is the new bank's processing fee (0.25%–2%, often capped).",
            },
            {
              icon: Sparkles,
              title: "When it's worth it",
              body: "Roughly: a rate gap of 0.5% or more, at least 4–5 years left on the loan, and a net saving that clearly beats the one-time fee. The break-even card above does this math for you.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <c.icon className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display mt-2.5 text-sm font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-10 border-t pt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p className="mx-auto max-w-3xl">
            <strong>Disclaimer:</strong> LoanSwitch is an independent calculator. Rates shown are indicative,
            compiled from public bank rate cards, and change frequently — always confirm the final rate and
            charges with the bank. This tool does not provide financial advice and is not affiliated with any
            bank or the Reserve Bank of India. Nothing you enter is stored or shared.
          </p>
        </footer>
      </div>
    </div>
  );
}
