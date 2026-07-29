# Changelog

## v2.1.0 — Firestore Read/Write Optimisation

### Problem
Each page (Dashboard, Transactions, Budgets) opened its own `onSnapshot` listener for the same month's transactions. Navigating between pages tore down and re-opened listeners, billing unnecessary Firestore reads. Budgets page opened two listeners simultaneously (transactions + budgets) for data Dashboard already had.

### Changes
- **Lifted listeners to Layout level** — single `listenTransactions` + `listenBudgets` for the selected month, shared via React context (`DataProvider`). All pages read from context, zero duplicate listeners.
- **Month cache** — past month data stored in a `Map` keyed by month string. Navigating back to a previously loaded past month skips re-fetch. Current month always re-subscribes (live data).
- **Removed per-page listeners** — Dashboard, Transactions, Budgets no longer call `listenTransactions` / `listenBudgets` directly.

### Files changed
- `src/hooks/useData.ts` — new context + provider with shared listeners and month cache
- `src/App.tsx` — wrap Layout in `DataProvider`
- `src/pages/Dashboard.tsx` — reads from `useData()`
- `src/pages/Transactions.tsx` — reads from `useData()`
- `src/pages/Budgets.tsx` — reads from `useData()`

---

## v2.0.0 — Auth + Firestore

### Stack
- Vite + React 19 + TypeScript + SWC
- Tailwind CSS v4 + shadcn/ui
- Zustand with `persist` middleware (localStorage)
- react-router-dom v7
- date-fns v4
- Firebase SDK (initialized, not yet used for data)

### Features

#### Dashboard
- Monthly balance hero card
- Income / expenses summary row
- Month navigator (‹ ›) — browse any past month, disabled future
- "Back to today" shortcut when viewing past month
- Full transaction list for selected month

#### Transactions
- List view (mobile-friendly cards)
- Filter by type (income/expense/all), month, search
- Delete transaction

#### Budgets
- Set monthly spending limit per expense category
- Progress bar — turns red when over budget
- Shows spent / limit / remaining
- Add + edit + delete budgets

#### Quick Add (FAB)
- Floating + button fixed bottom-right, visible on all pages
- Step 1: pick Expense or Income (large tap targets)
- Step 2: amount (required) + description, category, date (all optional)
- Defaults category to "Other" if not picked

#### Layout
- Mobile: bottom tab bar (Home / History / Budgets)
- Desktop: left sidebar
- Theme toggle in top bar — system default, persists via class on `<html>`

### Infrastructure
- Firebase Hosting configured
- GitHub Actions workflows for deploy on merge + PR preview
- Bun as package manager and runtime (`oven-sh/setup-bun@v2` in CI)
- Firebase config hardcoded (public by design)
