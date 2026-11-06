import { TrendingDown, Wallet, Landmark, Timer, Info } from "lucide-react";
import { Card, CardHead, Pill } from "./ui";
import {
  amortize,
  compare,
  tenureModes,
  formatINR,
  formatCompact,
  monthsToYearsLabel,
} from "../lib/loan";
import type { LoanState } from "../lib/types";

interface Props {
  state: LoanState;
  newRate: number | null; // best available offer; null → no better rate found
  processingFee: number;  // computed for the best offer
  foreclosurePct: number;
}

export const Results = ({ state, newRate, processingFee, foreclosurePct }: Props) => {
  const tenureMonths = Math.max(1, state.years * 12 + state.months);
  const input = { amount: state.amount, rate: state.rate, tenureMonths };
  const old = amortize(input);
  const hasOffer = newRate !== null && newRate < state.rate;
  const cmp = newRate !== null ? compare(input, newRate) : null;
  const modes = newRate !== null ? tenureModes(input, newRate) : null;
  const [lowerEmi, shorter] = modes ?? [];
  const cost = cmp ? processingFee + (state.amount * foreclosurePct) / 100 : 0;
  const breakEvenMonth =
    cmp && cmp.monthlySaving > 0 && cost > 0 ? Math.ceil(cost / cmp.monthlySaving) : cmp && cmp.monthlySaving > 0 ? 1 : null;

  return (
    <div className="space-y-4">
      {/* Headline savings */}
      <Card className="overflow-hidden border-emerald-600/30 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="px-6 py-6">
          {hasOffer && cmp ? (
            <>
              <p className="text-sm font-medium text-emerald-100">
                Switch at {newRate!.toFixed(2)}% and estimated savings could be
              </p>
              <p className="font-display mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                {formatCompact(Math.max(0, cmp.totalInterestSaving))}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">
                in total interest over the remaining {monthsToYearsLabel(tenureMonths)} — that's{" "}
                <span className="font-semibold text-white">
                  {formatINR(cmp.monthlySaving)}/month
                </span>{" "}
                off your EMI for the same tenure.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat label="Current EMI" value={formatINR(old.emi)} />
                <MiniStat label={`New EMI @ ${newRate!.toFixed(2)}%`} value={formatINR(cmp.newEmi)} highlight />
                <MiniStat label="New bank fee" value={cost > 0 ? formatINR(cost) : "₹0"} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-emerald-100">
                {newRate === null ? "Enter your loan details" : "No better rate found"}
              </p>
              <p className="font-display mt-1 text-2xl font-bold sm:text-3xl">
                {newRate === null
                  ? "Fill the form to see your savings"
                  : "Your current rate already matches the best offers"}
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">
                {newRate === null
                  ? "Savings update instantly as you type."
                  : "Check other loan types or tweak your credit score — banks tier their rates."}
              </p>
            </>
          )}
        </div>
      </Card>

      {hasOffer && cmp && (
        <>
          {/* Side-by-side old vs new */}
          <Card>
            <CardHead
              icon={<Landmark className="h-4 w-4" />}
              title="Your loan, side by side"
              sub="Same outstanding amount and tenure — only the rate changes."
            />
            <div className="grid grid-cols-2 divide-x text-sm">
              <div className="p-5">
                <Pill tone="slate" className="mb-3">
                  {state.bankName ? `${state.bankName} · today` : "Current loan"}
                </Pill>
                <Row label="Interest rate" value={`${state.rate.toFixed(2)}%`} />
                <Row label="Monthly EMI" value={formatINR(old.emi)} />
                <Row label="Total interest left" value={formatCompact(old.totalInterest)} />
                <Row label="Total you'll pay" value={formatCompact(old.totalOutgo)} />
              </div>
              <div className="p-5">
                <Pill tone="emerald" className="mb-3">
                  After transfer · {newRate!.toFixed(2)}%
                </Pill>
                <Row label="Interest rate" value={`${newRate!.toFixed(2)}%`} accent />
                <Row label="Monthly EMI" value={formatINR(cmp.newEmi)} accent />
                <Row label="Total interest left" value={formatCompact(cmp.new.totalInterest)} accent />
                <Row label="Total you'll pay" value={formatCompact(cmp.new.totalOutgo)} accent />
              </div>
            </div>
          </Card>

          {/* Two modes */}
          <Card>
            <CardHead
              icon={<Wallet className="h-4 w-4" />}
              title="Two ways to keep the saving"
              sub="Cut the monthly payment, or keep today's EMI and finish early. Same total benefit, different feel."
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {lowerEmi && (
                <ModeCard
                  title={lowerEmi.label}
                  tagline="Breathe easier every month"
                  rows={[
                    ["New EMI", formatINR(lowerEmi.emi)],
                    ["Tenure", monthsToYearsLabel(lowerEmi.months)],
                    ["Interest saved", formatCompact(lowerEmi.interestSaved)],
                  ]}
                  highlight={formatINR(cmp.old.emi - lowerEmi.emi) + "/mo less"}
                />
              )}
              {shorter && (
                <ModeCard
                  title={shorter.label}
                  tagline="Same EMI as today, debt-free sooner"
                  rows={[
                    ["EMI (unchanged)", formatINR(shorter.emi)],
                    ["Finish in", monthsToYearsLabel(shorter.months)],
                    ["Interest saved", formatCompact(shorter.interestSaved)],
                  ]}
                  highlight={
                    shorter.yearsSaved >= 0.08
                      ? `${monthsToYearsLabel(shorter.months)} vs ${monthsToYearsLabel(tenureMonths)}`
                      : "No early finish at this saving"
                  }
                />
              )}
            </div>
          </Card>

          {/* Break-even */}
          <Card>
            <CardHead
              icon={<Timer className="h-4 w-4" />}
              title="Break-even on switch costs"
              sub="Processing fee at the new bank + foreclosure charge at the old one."
            />
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">One-time cost</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">{formatINR(cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recovered in</p>
                  <p className="font-display text-2xl font-semibold tabular-nums text-emerald-700">
                    {breakEvenMonth !== null ? `${breakEvenMonth} month${breakEvenMonth > 1 ? "s" : ""}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net lifetime saving</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">
                    {formatCompact(Math.max(0, cmp.totalInterestSaving - cost))}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>• New-bank processing fee: {formatINR(processingFee)}</li>
                <li>
                  • Foreclosure on current loan: {formatINR((state.amount * foreclosurePct) / 100)}{" "}
                  {foreclosurePct === 0 && "(0% — RBI bars foreclosure charges on floating-rate loans to individuals)"}
                </li>
                {breakEvenMonth !== null && (
                  <li>• Every month after month {breakEvenMonth}, the saving is pure profit.</li>
                )}
              </ul>
            </div>
          </Card>

          {/* Balance chart */}
          <BalanceChart
            oldSchedule={cmp.old.schedule}
            newSchedule={cmp.new.schedule}
            newRate={newRate!}
          />
        </>
      )}

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Estimates only — verify with the bank. Figures are indicative, computed from standard reducing-balance
        EMI math on the rate you enter. Actual offers depend on the bank's assessment, salary profile and
        property/vehicle category, and are not guaranteed.
      </p>
    </div>
  );
};

const MiniStat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/15">
    <p className="text-[11px] text-emerald-100">{label}</p>
    <p className={`font-display mt-0.5 text-sm font-semibold tabular-nums ${highlight ? "text-white" : ""}`}>
      {value}
    </p>
  </div>
);

const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-baseline justify-between border-b border-border/60 py-1.5 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`tabular-nums font-medium ${accent ? "text-emerald-700" : ""}`}>{value}</span>
  </div>
);

const ModeCard = ({
  title,
  tagline,
  rows,
  highlight,
}: {
  title: string;
  tagline: string;
  rows: [string, string][];
  highlight: string;
}) => (
  <div className="rounded-xl border p-4 transition hover:border-emerald-600/40">
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-display text-sm font-semibold">{title}</h4>
      <Pill tone="emerald">
        <TrendingDown className="h-3 w-3" />
        {highlight}
      </Pill>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
    <div className="mt-3 space-y-1.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between text-sm">
          <span className="text-xs text-muted-foreground">{k}</span>
          <span className="font-medium tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  </div>
);

/** Lightweight SVG chart: outstanding balance over time, old vs new loan. */
const BalanceChart = ({
  oldSchedule,
  newSchedule,
  newRate,
}: {
  oldSchedule: { month: number; balance: number }[];
  newSchedule: { month: number; balance: number }[];
  newRate: number;
}) => {
  const W = 560;
  const H = 200;
  const PAD = { t: 10, r: 10, b: 22, l: 44 };
  const maxY = Math.max(...oldSchedule.map((r) => r.balance), 1);
  const maxM = Math.max(oldSchedule.length, newSchedule.length);
  const x = (m: number) => PAD.l + ((W - PAD.l - PAD.r) * m) / maxM;
  const y = (b: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - b / maxY);

  const path = (s: { month: number; balance: number }[]) =>
    s.map((r, i) => `${i === 0 ? "M" : "L"}${x(r.month).toFixed(1)},${y(r.balance).toFixed(1)}`).join(" ");

  const gridY = [0, 0.5, 1].map((f) => ({ b: maxY * f, y: y(maxY * f) }));

  return (
    <Card>
      <CardHead
        icon={<TrendingDown className="h-4 w-4" />}
        title="Outstanding balance over time"
        sub={`Old loan vs transferred loan at ${newRate.toFixed(2)}% — the shaded gap is interest you never pay.`}
      />
      <div className="p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Loan balance chart">
          {gridY.map((g, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="3 4" />
              <text x={PAD.l - 6} y={g.y + 3} textAnchor="end" className="fill-current text-[9px] text-muted-foreground" fontSize="9">
                {g.b >= 10_00_000 ? `${(g.b / 10_00_000).toFixed(1)}Cr` : g.b >= 1_00_000 ? `${Math.round(g.b / 1_00_000)}L` : `${Math.round(g.b / 1000)}k`}
              </text>
            </g>
          ))}
          <path
            d={`${path(oldSchedule)} L${x(oldSchedule[oldSchedule.length - 1].month)},${y(0)} L${x(0)},${y(0)} Z`}
            fill="currentColor"
            className="text-rose-500/10"
          />
          <path d={path(oldSchedule)} fill="none" stroke="#f43f5e" strokeWidth="2" />
          <path d={path(newSchedule)} fill="none" stroke="#10b981" strokeWidth="2" />
          {[
            { m: 0, label: "Now" },
            { m: Math.floor(maxM / 2), label: `${Math.round(maxM / 2 / 12)}y` },
            { m: maxM, label: `${(maxM / 12).toFixed(0)}y` },
          ].map((t, i) => (
            <text key={i} x={x(t.m)} y={H - 6} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} className="fill-current text-[9px] text-muted-foreground" fontSize="9">
              {t.label}
            </text>
          ))}
        </svg>
        <div className="mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-rose-500" /> Current loan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-emerald-500" /> After transfer
          </span>
        </div>
      </div>
    </Card>
  );
};
