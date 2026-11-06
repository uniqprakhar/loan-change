import { CalendarClock, TrendingDown, Trophy, Info } from "lucide-react";
import { Card, CardHead } from "./ui";
import { formatINR, formatCompact, monthsToYearsLabel } from "../lib/loan";
import type { BestTimeResult } from "../lib/loan";
import { cn } from "../lib/utils";

interface Props {
  analysis: BestTimeResult | null;
  offeredRate: number | null;
  currentRate: number;
  tenureMonths: number;
  loading: boolean;
}

const VERDICT_STYLE: Record<string, string> = {
  best: "bg-emerald-600 text-white",
  good: "bg-emerald-100 text-emerald-700",
  fair: "bg-amber-50 text-amber-700",
  poor: "bg-rose-50 text-rose-600",
};

export const BestTime = ({ analysis, offeredRate, currentRate, tenureMonths, loading }: Props) => {
  if (loading) {
    return (
      <Card>
        <CardHead
          icon={<CalendarClock className="h-4 w-4" />}
          title="When should you switch?"
          sub="Checking each year of your loan…"
        />
        <div className="p-5 text-sm text-muted-foreground">Analysing switch windows…</div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHead
          icon={<CalendarClock className="h-4 w-4" />}
          title="When should you switch?"
          sub="Year-by-year switch windows."
        />
        <div className="p-5 text-sm text-muted-foreground">
          {offeredRate !== null && offeredRate >= currentRate
            ? "No bank in the table currently beats your rate, so there's no window worth planning for yet. Revisit when a lower offer appears."
            : "Enter your loan details (with at least a year remaining) to see which years are the best windows to switch."}
        </div>
      </Card>
    );
  }

  const maxSaving = Math.max(...analysis.years.map((y) => y.netSavingIfSwitched), 1);

  return (
    <Card>
      <CardHead
        icon={<CalendarClock className="h-4 w-4" />}
        title="When should you switch?"
        sub={`Year-by-year windows across your remaining ${monthsToYearsLabel(tenureMonths)}, assuming the offered rate of ${offeredRate!.toFixed(2)}% (vs your ${currentRate.toFixed(2)}%).`}
      />
      <div className="p-5">
        {/* Headline verdict */}
        <div className="rounded-xl bg-emerald-50/70 p-4 ring-1 ring-inset ring-emerald-600/20">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Best window for you</p>
              <p className="font-display text-xl font-semibold text-emerald-700">{analysis.bestWindowLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated saving if switched then</p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {formatCompact(analysis.years.find((y) => y.year === analysis.bestYear)?.netSavingIfSwitched ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-emerald-900/80">{analysis.whyBest}</p>
        </div>

        {/* Year-by-year bars */}
        <div className="mt-4 space-y-2">
          {analysis.years.map((y) => (
            <div key={y.year} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Year {y.year}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/60">
                <div
                  className={cn(
                    "h-full rounded-md transition-all",
                    y.verdict === "best" ? "bg-emerald-500" : y.verdict === "good" ? "bg-emerald-400/70" : "bg-emerald-200/80",
                  )}
                  style={{ width: `${Math.max(2, (y.netSavingIfSwitched / maxSaving) * 100)}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums">
                {formatCompact(y.netSavingIfSwitched)}
              </span>
              <span
                className={cn(
                  "w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold",
                  VERDICT_STYLE[y.verdict],
                )}
              >
                {y.verdict === "best" ? "Best" : y.verdict === "good" ? "Good" : y.verdict === "fair" ? "Fair" : "Weak"}
              </span>
            </div>
          ))}
        </div>

        {/* Balance trajectory hint */}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingDown className="h-3 w-3" />
          Balance falls from {formatCompact(analysis.years[0]?.balanceAtYear ?? 0)} now to{" "}
          {formatCompact(analysis.years[analysis.years.length - 1]?.balanceAtYear ?? 0)} in the final window —
          less balance left means less interest left to save.
        </p>

        {/* Rule of thumb */}
        <div className="mt-4 rounded-xl border p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Trophy className="h-3.5 w-3.5 text-emerald-600" />
            So when exactly?
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{analysis.ruleOfThumb}</p>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Windows assume today's offered rate stays available and are estimates from standard EMI math —
          not predictions. Rates move with the RBI repo cycle; if you expect them to fall, weigh waiting
          against the saving lost each year of delay.
        </p>
      </div>
    </Card>
  );
};
