import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)}>
    {children}
  </div>
);

export const CardHead = ({
  icon,
  title,
  sub,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
}) => (
  <div className="flex items-start gap-3 border-b px-5 py-4">
    {icon && <div className="mt-0.5 text-emerald-600">{icon}</div>}
    <div>
      <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  slate: "bg-muted text-muted-foreground ring-border",
};

export const Pill = ({
  tone = "slate",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);
