import { useState } from "react";
import { Home, User, Car, CreditCard, IndianRupee, Percent, CalendarClock, Building2 } from "lucide-react";
import type { LoanState, } from "../lib/types";
import type { LoanType } from "../lib/loan";
import { LOAN_TYPE_LABEL, scoreBand, groupINR } from "../lib/loan";
import { cn } from "../lib/utils";

const TYPES: { value: LoanType; icon: typeof Home }[] = [
  { value: "home", icon: Home },
  { value: "personal", icon: User },
  { value: "car", icon: Car },
];

interface Props {
  state: LoanState;
  onChange: (patch: Partial<LoanState>) => void;
}

export const LoanForm = ({ state, onChange }: Props) => {
  const band = scoreBand(state.score);
  const tenureTotal = state.years * 12 + state.months;

  // Draft text for the rate box so typing "8.7" works keystroke by keystroke.
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const rateShown = rateDraft ?? (state.rate ? String(state.rate) : "");

  const amountText = (raw: string) => {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    onChange({ amount: isNaN(n) ? 0 : n });
  };

  const rateText = (raw: string) => {
    // Keep only digits and one decimal point, e.g. "8." or "8.7".
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
    if (cleaned.length > 6) cleaned = cleaned.slice(0, 6);
    setRateDraft(cleaned);
    const n = Number(cleaned);
    if (cleaned !== "" && cleaned !== "." && !isNaN(n)) {
      onChange({ rate: Math.min(n, 30) });
    } else if (cleaned === "") {
      onChange({ rate: 0 });
    }
  };

  const commitRate = () => {
    const n = Number(rateShown);
    if (rateShown === "" || rateShown === "." || isNaN(n) || n === 0) {
      setRateDraft(null);
      onChange({ rate: 8.7 });
    } else {
      setRateDraft(null);
      onChange({ rate: Math.min(n, 30) });
    }
  };

  return (
    <div className="space-y-5">
      {/* Loan type */}
      <div>
        <Label icon={<Home className="h-3.5 w-3.5" />}>Loan type</Label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = state.loanType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ loanType: t.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-all",
                  active
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/30"
                    : "border-border bg-card text-muted-foreground hover:border-emerald-600/40 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {LOAN_TYPE_LABEL[t.value].replace(" Loan", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Outstanding amount */}
      <div>
        <Label icon={<IndianRupee className="h-3.5 w-3.5" />}>
          Outstanding loan amount <span className="text-muted-foreground">(what you still owe)</span>
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          <input
            inputMode="decimal"
            value={groupINR(state.amount)}
            onChange={(e) => amountText(e.target.value)}
            onBlur={(e) => {
              if (!state.amount) onChange({ amount: 3000000 });
            }}
            placeholder="30,00,000"
            className="w-full rounded-xl border bg-card py-2.5 pl-8 pr-3 text-sm font-medium tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        <QuickRow
          options={[
            { label: "₹10 L", v: 1_000_000 },
            { label: "₹30 L", v: 3_000_000 },
            { label: "₹50 L", v: 5_000_000 },
            { label: "₹1 Cr", v: 10_000_000 },
          ]}
          onPick={(v) => onChange({ amount: v })}
          current={state.amount}
        />
      </div>

      {/* Current rate + current bank */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label icon={<Percent className="h-3.5 w-3.5" />}>Current interest rate</Label>
          <div className="relative">
            <input
              inputMode="decimal"
              value={rateShown}
              onChange={(e) => rateText(e.target.value)}
              onBlur={commitRate}
              placeholder="8.7"
              className="w-full rounded-xl border bg-card py-2.5 pl-3 pr-8 text-sm font-medium tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label icon={<Building2 className="h-3.5 w-3.5" />}>Current bank <span className="text-muted-foreground">(optional)</span></Label>
          <input
            value={state.bankName}
            onChange={(e) => onChange({ bankName: e.target.value })}
            placeholder="e.g. HDFC Bank"
            className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
      </div>

      {/* Remaining tenure */}
      <div>
        <Label icon={<CalendarClock className="h-3.5 w-3.5" />}>
          Remaining tenure
          <span className="ml-2 text-xs font-normal text-muted-foreground">{tenureTotal} months left</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="relative">
              <input
                inputMode="numeric"
                value={state.years || ""}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                  onChange({ years: isNaN(n) ? 0 : Math.min(n, 30) });
                }}
                placeholder="10"
                className="w-full rounded-xl border bg-card py-2.5 pl-3 pr-12 text-sm font-medium tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">years</span>
            </div>
          </div>
          <div>
            <div className="relative">
              <input
                inputMode="numeric"
                value={state.months || ""}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                  onChange({ months: isNaN(n) ? 0 : Math.min(n, 11) });
                }}
                placeholder="0"
                className="w-full rounded-xl border bg-card py-2.5 pl-3 pr-14 text-sm font-medium tabular-nums outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">months</span>
            </div>
          </div>
        </div>
        <QuickRow
          options={[
            { label: "2 yrs", v: 2 },
            { label: "5 yrs", v: 5 },
            { label: "10 yrs", v: 10 },
            { label: "15 yrs", v: 15 },
          ]}
          onPick={(v) => onChange({ years: v, months: 0 })}
          current={tenureTotal === state.years * 12 && state.months === 0 ? state.years : -1}
        />
      </div>

      {/* Credit score */}
      <div>
        <Label icon={<CreditCard className="h-3.5 w-3.5" />}>CIBIL / credit score</Label>
        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-semibold tabular-nums">{state.score}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                band.tone === "excellent" && "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
                band.tone === "good" && "bg-teal-50 text-teal-700 ring-teal-600/20",
                band.tone === "fair" && "bg-amber-50 text-amber-700 ring-amber-600/20",
                band.tone === "poor" && "bg-rose-50 text-rose-700 ring-rose-600/20",
              )}
            >
              {band.label}
            </span>
          </div>
          <input
            type="range"
            min={300}
            max={900}
            step={1}
            value={state.score}
            onChange={(e) => onChange({ score: Number(e.target.value) })}
            className="mt-3 w-full accent-emerald-600"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>300</span>
            <span>650</span>
            <span>750</span>
            <span>900</span>
          </div>
        </div>
      </div>

      {/* Rate type */}
      <div>
        <Label icon={<Percent className="h-3.5 w-3.5" />}>Current rate type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["floating", "fixed"] as const).map((rt) => (
            <button
              key={rt}
              type="button"
              onClick={() => onChange({ rateType: rt })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition",
                state.rateType === rt
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/30"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {rt}
              <span className="block text-[10px] font-normal opacity-70">
                {rt === "floating" ? "0% foreclosure (RBI)" : "foreclosure may apply"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Label = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
    <span className="text-emerald-600">{icon}</span>
    {children}
  </p>
);

const QuickRow = ({
  options,
  onPick,
  current,
}: {
  options: { label: string; v: number }[];
  onPick: (v: number) => void;
  current: number;
}) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o.label}
        type="button"
        onClick={() => onPick(o.v)}
        className={cn(
          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
          current === o.v
            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
            : "border-border text-muted-foreground hover:border-emerald-600/40 hover:text-foreground",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
