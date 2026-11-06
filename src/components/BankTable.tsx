import { Trophy, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardHead, Pill } from "./ui";
import { emi, formatINR, formatCompact } from "../lib/loan";
import type { BankOffer, LoanState } from "../lib/types";
import { cn } from "../lib/utils";

interface Props {
  offers: BankOffer[];
  loading: boolean;
  error: string | null;
  state: LoanState;
  onPickBank: (offer: BankOffer) => void;
}

interface RankedOffer extends BankOffer {
  newEmi: number;
  monthlySaving: number;
  totalSaving: number;
  feeAmount: number;
  netSaving: number;
  isCurrent: boolean;
}

export const BankTable = ({ offers, loading, error, state, onPickBank }: Props) => {
  const tenureMonths = Math.max(1, state.years * 12 + state.months);
  const currentEmi = emi(state.amount, state.rate, tenureMonths);

  const ranked: RankedOffer[] = offers
    .map((o) => {
      const newEmi = emi(state.amount, o.rate, tenureMonths);
      const monthlySaving = currentEmi - newEmi;
      const totalSaving = monthlySaving * tenureMonths; // approximation for ranking
      const feeAmount = Math.min(
        Math.max((state.amount * o.feePct) / 100, o.feeMin),
        o.feeMax ?? Number.MAX_SAFE_INTEGER,
      );
      return {
        ...o,
        newEmi,
        monthlySaving,
        totalSaving,
        feeAmount,
        netSaving: totalSaving - feeAmount,
        isCurrent:
          state.bankName.trim().length > 0 &&
          o.bankName.toLowerCase().includes(state.bankName.trim().toLowerCase()),
      };
    })
    .sort((a, b) => b.netSaving - a.netSaving);

  const best = ranked.length > 0 && ranked[0].netSaving > 0 ? ranked[0] : null;

  return (
    <Card>
      <CardHead
        icon={<Trophy className="h-4 w-4" />}
        title={`Bank offers for you · ${state.loanType === "home" ? "Home" : state.loanType === "personal" ? "Personal" : "Car"} loan`}
        sub={
          offers.length > 0
            ? `Ranked by net saving for a ${formatCompact(state.amount)} balance, ${tenureMonths} months left, score ${state.score}. Always verify the rate with the bank before deciding.`
            : "Matching banks against your profile."
        }
      />
      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Fetching live rate table…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Couldn't load the bank rate table. {error} — you can still use the calculator above by typing
              an offered rate into the form.
            </span>
          </div>
        ) : ranked.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            No banks in the table for this loan type and credit-score band yet. Rates can be added anytime
            from the Database tab.
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Bank</th>
                  <th className="py-2 pr-3 text-right font-medium">Rate</th>
                  <th className="py-2 pr-3 text-right font-medium">New EMI</th>
                  <th className="py-2 pr-3 text-right font-medium">Monthly saving</th>
                  <th className="py-2 pr-3 text-right font-medium">Total interest saved*</th>
                  <th className="py-2 pr-3 text-right font-medium">Processing fee</th>
                  <th className="py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((o, i) => (
                  <tr
                    key={o.id}
                    className={cn(
                      "border-b last:border-0",
                      best?.bankName === o.bankName && "bg-emerald-50/60",
                    )}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            i === 0 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium leading-tight">{o.bankName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {i === 0 && o.netSaving > 0 && <Pill tone="emerald" className="!px-1.5 !py-0 !text-[10px]">Best offer</Pill>}
                            {o.isCurrent && <Pill tone="amber" className="!px-1.5 !py-0 !text-[10px]">Your bank</Pill>}
                          </div>
                          <p className="mt-1 text-[10px] leading-none text-muted-foreground">
                            {o.verifiedOn
                              ? `Rate checked ${new Date(o.verifiedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                              : o.updatedAt
                                ? `Last edited ${new Date(o.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                : null}
                            {o.sourceUrl && (
                              <>
                                {" · "}
                                <a
                                  href={o.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-600"
                                >
                                  Official rate page ↗
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-medium tabular-nums">
                      {o.rate.toFixed(2)}%
                      {o.rate < state.rate && (
                        <span className="ml-1 text-[10px] font-semibold text-emerald-600">
                          −{(state.rate - o.rate).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{formatINR(o.newEmi)}</td>
                    <td className={cn("py-3 pr-3 text-right font-medium tabular-nums", o.monthlySaving > 0 ? "text-emerald-700" : "text-rose-600")}>
                      {o.monthlySaving > 0 ? "+" : ""}
                      {formatINR(o.monthlySaving)}
                    </td>
                    <td className={cn("py-3 pr-3 text-right font-medium tabular-nums", o.monthlySaving > 0 ? "text-emerald-700" : "text-rose-600")}>
                      {o.monthlySaving > 0 ? formatCompact(o.totalSaving) : "—"}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                      {o.feePct}%{o.feeMax !== null ? " (capped)" : ""}
                      <span className="block text-[10px]">{formatINR(o.feeAmount)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        data-bank={o.bankName}
                        onClick={() => onPickBank(o)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                          o.isCurrent
                            ? "border-border text-muted-foreground"
                            : "border-emerald-600/40 text-emerald-700 hover:bg-emerald-50",
                        )}
                      >
                        {o.isCurrent ? "Current" : "Use this rate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          *Same remaining tenure. These are illustrative reference rates maintained by us — not live quotes from
          any bank. Each row shows when it was last checked or edited; where we've verified a rate against the
          bank's own page, a link is shown. Rates change frequently — always confirm the final rate, fees and
          charges directly with the bank before deciding. Edit any rate from the Database tab.
        </p>
      </div>
    </Card>
  );
};
