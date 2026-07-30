# App Issues & Backlog

Last reviewed: 2026-07-30

---

## Missing Features

### SMS Auto-import (Backlog)
- [ ] **Companion Android app** — native app with READ_SMS permission that runs as a background service, parses bank SMS on-device, writes directly to Firestore via Firebase Android SDK. No third-party apps, no data leaves the device except the Firestore write. iOS not feasible (Apple blocks SMS access for all third-party apps). Requires: separate Android codebase, Play Store deployment, BroadcastReceiver + Firebase SDK (~150 lines Kotlin).



### Finance Core
- [ ] Edit transaction (delete-only right now)
- [ ] Recurring transactions (rent, salary — repeat monthly automatically)
- [ ] Multi-currency support (hardcoded USD)
- [ ] Transfer between accounts (cash → bank)
- [ ] Savings goals
- [ ] Net worth tracking (assets vs liabilities)
- [ ] Charts / analytics — category donut + monthly trend bar (planned v3)
- [ ] Export to CSV / PDF

### Budgets
- [ ] Budgets don't carry over — must manually re-create every month
- [ ] "Copy last month's budgets" shortcut
- [ ] Alert / notification when approaching budget limit (e.g. 80% used)

### Household & Members
- [ ] Per-member spending breakdown (who spent what)
- [ ] Transaction ownership — show which member added each entry
- [ ] Shared savings goals between family members

### Onboarding
- [ ] Demo / sample data mode to explore app before entering real data

---

## UX Problems

- [x] **No delete confirmation** — added ConfirmDialog on all delete actions
- [ ] **No edit transaction** — only fix is delete + re-add (listed above but UX impact is high)
- [ ] **Month filter desync** — Dashboard month navigator and Transactions page month picker are visually separate, can confuse users
- [x] **Budgets stuck on current month** — added month navigator (‹ ›) to Budgets page
- [ ] **QuickAdd date always today** — logging yesterday's expense requires manual date change every time
- [x] **No save feedback in QuickAdd** — added toast.success on save
- [x] **FAB overlaps last list item** — added pb-32 to all page containers
- [x] **Sign out has no confirm dialog** — added ConfirmDialog before sign out
- [x] **No loading skeletons** — added Skeleton loading states to all pages
- [ ] **Invite code is unreadable** — long Firestore document ID, hard to share verbally or type manually
- [ ] **No pull-to-refresh** on mobile
- [x] **Budgets page shows no month context** — month navigator added with "MMMM yyyy" label

---

## Technical Problems

### Performance
- [ ] **Bundle size** — 1.15MB JS, no code splitting. All routes load upfront. Should lazy-load pages
- [ ] **Missing Firestore composite index** — `firestore.indexes.json` is empty. Date range queries on transactions will degrade without an index on `(date ASC)` per household
- [ ] **Past month cache is memory-only** — cleared on every page refresh, re-fetches all previously viewed months

### Firebase / Firestore
- [ ] **`enableIndexedDbPersistence` is deprecated** in Firebase modular SDK — replace with `initializeFirestore({ localCache: persistentLocalCache() })`
- [ ] **Orphaned subcollections on household delete** — transactions and budgets remain in Firestore after household doc is deleted (no cascade delete). Needs Cloud Function or client-side cleanup
- [ ] **Re-joining household doesn't update `displayName`/`email`** on the user doc if they changed since last join

### Stability
- [ ] **No error boundaries** — runtime error in any page crashes entire app to blank screen
- [ ] **`useHousehold` re-fetches on auth flicker** — auth state briefly null on page load triggers duplicate Firestore reads
- [ ] **No optimistic UI** — on slow connections, delay between tapping Save and seeing the transaction appear (waiting for `onSnapshot` round-trip)

### Security / Infrastructure
- [ ] **No rate limiting** — authenticated users can spam unlimited transactions into a household
- [ ] **No staging environment** — CI deploys straight to production on every merge to `main`
- [ ] **No abuse protection on invite codes** — anyone with a valid code can join any household
