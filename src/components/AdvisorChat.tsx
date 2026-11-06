import { useEffect, useRef, useState } from "react";
import { ai, createThinkingStripper, type ChatMessage } from "@broodle/ai";
import { Bot, SendHorizonal, Loader2, AlertCircle } from "lucide-react";
import { Card, CardHead } from "./ui";
import { formatCompact, formatINR, monthsToYearsLabel, scoreBand } from "../lib/loan";
import type { LoanState } from "../lib/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
  thinking: string[];
}

interface Props {
  state: LoanState;
  bestOfferSummary: string; // e.g. "State Bank of India @ 8.15%, fee ₹10,500"
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

export const AdvisorChat = ({ state, bestOfferSummary, newRate, monthlySaving, totalSaving, transferCost }: Props) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const tenureMonths = Math.max(1, state.years * 12 + state.months);
  const band = scoreBand(state.score);

  const systemPrompt = `You are the balance-transfer advisor inside LoanSwitch, an India-first loan balance-transfer savings tool. Answer in clear, plain Indian English. Keep replies under 180 words unless the user asks for steps. Use the user's real numbers from the context below. Be honest about when a transfer is NOT worth it.

USER PROFILE (authoritative — use these numbers, don't invent):
- Loan: ${formatCompact(state.amount)} outstanding, ${state.rate.toFixed(2)}% now, ${monthsToYearsLabel(tenureMonths)} remaining, ${state.loanType} loan, rate type ${state.rateType}
- Credit score: ${state.score} (${band.label})
- Current bank: ${state.bankName || "not stated"}
- Best matching offer: ${bestOfferSummary}
- New rate: ${newRate ? newRate.toFixed(2) + "%" : "none better found"}
- Monthly EMI saving: ${monthlySaving !== null ? formatINR(monthlySaving) : "—"}
- Total interest saving (same tenure): ${totalSaving !== null ? formatCompact(totalSaving) : "—"}
- One-time switch cost: ${formatINR(transferCost)}

INDIA / RBI CONTEXT (accurate as of 2024-25):
- RBI bars foreclosure/prepayment charges on floating-rate loans to individuals — switching a floating-rate home/personal/car loan costs the new bank's processing fee only (typically 0.25%–2%, often capped).
- Fixed-rate loans may carry 2–4% foreclosure — flag this if rateType is fixed.
- A balance transfer involves one hard credit inquiry; the small CIBIL dip (~5-10 points) recovers in a few months.
- Process: get foreclosure/acceptance letter + statement of account from current bank → apply with new bank (KYC, income proofs, statements) → new bank disburses to old loan account → collect NOC and updated documents. Typically 2–4 weeks.
- Rule of thumb: worth doing if (rate gap ≥ 0.5pp) AND (months remaining ≥ 5 years for home loans) AND (net saving after fees is clearly positive). For loans with < 2 years left, processing hassle usually outweighs tiny savings.

IMPORTANT: All savings figures you quote are estimates, not offers. Never state a bank will approve a rate; say "you could save approximately" and remind the user to confirm the rate with the bank. This is not financial advice.`;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    setInput("");
    const history: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...turns.map((t): ChatMessage => ({ role: t.role, content: t.content })),
      { role: "user", content: q },
    ];
    setTurns((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "", thinking: [] }]);
    setBusy(true);
    try {
      const stripper = createThinkingStripper();
      let visible = "";
      const thinking: string[] = [];
      for await (const tok of ai.chat(history)) {
        const r = stripper.push(tok);
        visible += r.visible;
        for (const t of r.thinking) thinking.push(t);
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: visible, thinking: [...thinking] };
          return next;
        });
      }
      const tail = stripper.flush();
      visible += tail.visible;
      const allThinking = [...thinking, ...tail.thinking];
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: visible, thinking: allThinking };
        return next;
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const msg =
        code === "BUDGET_EXCEEDED"
          ? "The AI advisor has used up its free quota for now. All the numbers you need are already on this page."
          : code === "RATE_LIMITED"
            ? "Too many questions in a row — give it a few seconds and try again."
            : "The advisor is unavailable right now. Your savings numbers above are unaffected.";
      setError(msg);
      setTurns((prev) => prev.slice(0, -1)); // drop empty assistant turn
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-[560px] flex-col">
      <CardHead
        icon={<Bot className="h-4 w-4" />}
        title="Ask the balance-transfer advisor"
        sub="Answers use your exact numbers and current RBI rules. AI estimates only — verify everything with the bank."
      />
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Try one of these — the advisor knows your loan details and the latest RBI balance-transfer rules:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-emerald-600/30 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {t.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={
                t.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2.5 text-sm text-white"
                  : "max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm"
              }
            >
              {t.role === "assistant" && t.thinking.length > 0 && (
                <details className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none font-medium">💭 Thinking…</summary>
                  <div className="mt-1.5 whitespace-pre-wrap">{t.thinking.join("\n\n")}</div>
                </details>
              )}
              <div className="whitespace-pre-wrap">{t.content}</div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Advisor is thinking…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about charges, timing, whether it's worth it…"
          className="flex-1 rounded-xl border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          <SendHorizonal className="h-4 w-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
      <p className="border-t px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        Estimates only — the advisor's answers are informational and not financial advice. Always verify rates
        and charges directly with the bank before deciding.
      </p>
    </Card>
  );
};
