# loan-change

A loan balance-transfer calculator — enter your current loan details and instantly see whether switching banks saves you money, how much, and when you'd break even on the switch costs.

Supports **home**, **personal**, and **car** loans, with bank offers tiered by credit-score band.

> Built with React + Vite + TypeScript + Tailwind CSS.

## What it does

- **Loan input form** (`src/components/LoanForm.tsx`)
  - Loan type: home / personal / car
  - Outstanding principal (₹), current interest rate (%), current bank (optional)
  - Remaining tenure (years + months)
  - CIBIL score (300–900) with score-band indicator (excellent / good / fair / poor)
  - Rate type: floating / fixed (fixed adds a foreclosure charge assumption)
- **Savings results** (`src/components/Results.tsx`)
  - Headline: total interest saved + per-month EMI reduction
  - Side-by-side: current loan vs. best offer at same tenure
  - Two modes: **Lower my EMI** (same tenure, smaller EMI) vs. **Finish years earlier** (keep old EMI, close early)
  - Break-even: one-time switch cost (new-bank processing fee + old-bank foreclosure) ÷ monthly saving
  - Balance-over-time SVG chart
- **Bank comparison table** (`src/components/BankTable.tsx`)
  - All offers in your loan-type + score band, ranked by net saving
  - EMI, monthly/total saving, fee, and net saving per bank
  - Highlights your current bank; click any offer to select it
- **Best-time-to-switch hint** (`src/components/BestTime.tsx`)
- **Advisor chat** (`src/components/AdvisorChat.tsx`) — Q&A over your current inputs

## How the math works (`src/lib/loan.ts`)

Pure functions, no dependencies:

- **EMI (reducing balance):** `P·r·(1+r)^n / ((1+r)^n − 1)`, where `r = annualRate / 12 / 100`
- **`amortize(input)`** — month-by-month schedule from today's outstanding balance
- **`compare(input, newRate)`** — like-for-like comparison on the same remaining tenure
- **`tenureModes(input, newRate)`** — returns both `lower-emi` and `shorter-tenure` options (shorter tenure solved via `n = −ln(1 − P·r/E) / ln(1+r)`)
- **`breakEven(...)` / `bestTimeToSwitch(...)`** — cost-recovery helpers
- Formatting: `formatINR`, `formatCompact`, `monthsToYearsLabel`, `groupINR`

Score bands used to filter offers:

| Score | Band |
| --- | --- |
| 750–900 | Excellent |
| 700–749 | Good |
| 650–699 | Fair |
| < 650 | Poor |

> Estimates only. Figures are indicative reducing-balance math on the rate you enter. Actual offers depend on the bank's assessment and are not guaranteed.

## Data source

Bank rates and transfer-cost norms are loaded at runtime from the built-in database (`@broodle/data`):

```sql
SELECT * FROM bank_rates ORDER BY loan_type, score_min, rate;
SELECT * FROM transfer_costs;
```

Parsed into `BankOffer` / `TransferCostInfo` (see `src/lib/types.ts`). If the rate table is unavailable, the app shows an error state instead of silent zeros.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4, `tailwind-merge`, `clsx`, `class-variance-authority` |
| Icons | `lucide-react` |
| Storage / PWA | `idb-keyval`, `vite-plugin-pwa` |

## Project structure

```
loan-change/
├── index.html              # Vite entry, fonts (Leyend + Sora)
├── vite.config.ts          # React + Tailwind plugins, `@` → ./src
├── tsconfig.json
├── package.json
└── src/
    ├── App.tsx             # State, DB load, best-offer + break-even wiring, layout
    ├── main.tsx            # React root + error boundary + editor-preview guard
    ├── index.css           # Tailwind + global styles
    ├── lib/
    │   ├── loan.ts         # EMI / amortisation / comparison math
    │   ├── types.ts        # LoanState, BankOffer, TransferCostInfo
    │   └── utils.ts        # `cn()` class helper
    └── components/
        ├── LoanForm.tsx    # Inputs + score band UI
        ├── Results.tsx     # Savings, modes, break-even, chart
        ├── BankTable.tsx   # Ranked offers table
        ├── BestTime.tsx    # Switch-timing hint
        ├── AdvisorChat.tsx # Chat over current loan inputs
        └── ui.tsx          # Card / Pill primitives
```

## Getting started

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Clone
 git clone https://github.com/uniqprakhar/loan-change.git
 cd loan-change

# 2. Install
 npm install

# 3. Run locally
 npm run dev

# 4. Production build
 npm run build

# 5. Preview the build
 npm run preview
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + Vite production build |
| `npm run preview` | Preview the production build |

## Configuration notes

- Path alias `@` → `./src` (see `vite.config.ts` + `tsconfig.json`).
- `vite-plugin-pwa` is configured for installable/offline-capable builds.
- Dev server runs with `host: true` and permissive hosts for container/preview environments — tighten for production if needed.
- Default demo state in `App.tsx`: ₹30,00,000 home loan @ 8.7% for 10 years, score 780, floating rate.

## Contributing

1. Fork the repo and create a feature branch (`git checkout -b feature/my-change`).
2. Make your change with a focused commit.
3. Open a pull request against `main`.

## License

No license specified yet. Add a `LICENSE` file if you want to open-source it (e.g. MIT).
