import { useState } from "react";
import { Bot, SendHorizonal } from "lucide-react";
import { Card, CardHead } from "./ui";
import { formatCompact, formatINR, monthsToYearsLabel, scoreBand } from "../lib/loan";
import type { LoanState } from "../lib/types";

interface Props {
  state: LoanState;
  bestOfferSummary: string;
  newRate: number | null;
  monthlySaving: number | null;
  totalSaving: number | null;
  transferCost: number;
}

const SUGGESTIONS = [
  "Should I transfer if only 2 years are left?",
  "What will the switch cost me in total?",
  "Is 0.5% rate reduction worth it?",
  "How does the process work, step by step?",
];

const ANSWERS: { match: RegExp; reply: (ctx: Props & { tenureMonths: number }) => string }[] = [
  {
    match: /2 years|two years|left|timing|when|best time/i,
    reply: (c) => c.tenureMonths <= 30
      ? `With only ${monthsToYearsLabel(c.tenureMonths)} left, a transfer rarely pays off.`
      : `Switching earlier wins — every year you wait shrinks the total saving. Check the "best time to switch" card above.`,
  },
  {
    match: /cost|fee|charge|switch cost|total/i,
    reply: (c) => `Your one-time switch cost is about ${formatINR(c.transferCost)}: the new bank's processing fee plus any foreclosure charge. RBI bars foreclosure charges on floating-rate loans to individuals, so for floating-rate loans this is usually just the processing fee.`,
  },
  {
    match: /0\.5|worth|gap|difference/i,
    reply: (c) => c.newRate !== null && c.monthlySaving !== null && c.monthlySaving > 0
      ? `At ${c.newRate.toFixed(2)}% vs your current ${c.state.rate.toFixed(2)}%, you'd save about ${formatINR(c.monthlySaving)}/month and ${formatCompact(c.totalSaving ?? 0)} in total interest — minus the ${formatINR(c.transferCost)} switch cost.`
      : `A 0.5pp gap is roughly the threshold where switching starts to make sense — but only with enough tenure left (4-5+ years) and a net saving that clearly beats the one-time fee.`,
  },
  {
    match: /process|step|how|documents|apply/i,
    reply: () => `Typical process (2-4 weeks): 1) Get a foreclosure letter + statement from your current bank. 2) Apply with the new bank (KYC, income proofs, statements). 3) The new bank disburses to your old loan account. 4) Collect your NOC.`,
  },
];

const fallback = (c: Props & { tenureMonths: number }) =>
  c.newRate !== null && c.monthlySaving !== null && c.monthlySaving > 0
    ? `Based on your numbers — ${formatCompact(c.state.amount)} at ${c.state.rate.toFixed(2)}% with ${monthsToYearsLabel(c.tenureMonths)} left, score ${c.state.score} (${scoreBand(c.state.score).label}) — the best match is ${c.bestOfferSummary}, saving ~${formatINR(c.monthlySaving)}/month.`
    : `Based on your numbers — ${formatCompact(c.state.amount)} at ${c.state.rate.toFixed(2)}% with ${monthsToYearsLabel(c.tenureMonths)} left, score ${c.state.score} (${scoreBand(c.state.score).label}) — no better offer was found in this score band.`;

export const AdvisorChat = (props: Props) => {
  const [turns, setTurns] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const tenureMonths = Math.max(1, props.state.years * 12 + props.state.months);
  const ctx = { ...props, tenureMonths };
  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const hit = ANSWERS.find((a) => a.match.test(q));
    const reply = hit ? hit.reply(ctx) : fallback(ctx);
    setTurns((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: reply }]);
    setInput("");
  };
  return (
    <Card className="flex h-[560px] flex-col">
      <CardHead icon={<Bot className="h-4 w-4" />} title="Balance-transfer guide" sub="Instant answers from your numbers. Estimates only." />
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-emerald-600/30 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={t.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2.5 text-sm text-white" : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm"}>
              <div className="whitespace-pre-wrap">{t.content}</div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about charges, timing, whether it's worth it" className="flex-1 rounded-xl border bg-card px-3.5 py-2.5 text-sm outline-none" />
        <button type="submit" disabled={!input.trim()} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-40"><SendHorizonal className="h-4 w-4" /><span className="hidden sm:inline">Ask</span></button>
      </form>
    </Card>
  );
};
