# العب و اكسب

A family stock-learning web application with separate parent and kid portals. All holdings and transactions are paper trading. No brokerage is connected.

**Educational use only. Not financial advice.**

## Current delivery status

Implemented: parent registration, credentials login with bcrypt/JWT sessions, role-guarded portals, family ownership checks, kid creation/edit/deletion/password reset, daily/monthly limits, buy/sell requests, approve/reject/quantity edits, virtual holdings and transaction history, market search/quotes/charts, lessons/quizzes/badges, activity log, and profile settings.

**Stripe test mode only.** Hosted Checkout supports wallet top-ups and the exact missing amount for parent-approved purchases. Stripe-managed webhooks verify raw-body signatures before processing; repeated events cannot duplicate wallet credits or approvals. Demo credits remain a separate, explicit option. Live-mode keys/events are rejected. No real money or real stock trades are supported.

## Stack

- Next.js App Router + TypeScript. The requested Next.js 14 package was rejected by the security registry; this project uses supported Next.js 16.
- React, Tailwind CSS, shadcn/Radix components, Framer Motion, Recharts, TanStack Query.
- MongoDB + Mongoose for family data, financial ledgers and payment/approval intents. PostgreSQL is used only by Stripe-managed sync.
- NextAuth credentials provider, bcrypt password hashing, JWT session cookies.
- yahoo-finance2, server-side only, 60-second cache.

## Run the downloaded standalone ZIP

Requirements: Node.js 22 or newer, npm, and a MongoDB Atlas replica set. Family data is stored in the `kids_project` MongoDB database.

```sh
cd KidVest
npm install
cp .env.example .env.local
# Fill MONGODB_URI and NEXTAUTH_SECRET in .env.local.
npm run dev
```

Open http://localhost:3000. For a secure session secret, generate a random value locally (`openssl rand -base64 48`) and save it directly in `.env.local`. Do not send credentials in chat. Set `NEXTAUTH_URL` to the app's actual origin when running outside localhost.

```sh
npm run typecheck
npm run build
npm start
```

The ZIP vendors generated client and validation packages, so no pnpm workspace is needed to run it.

## Run inside this workspace

The managed KidVest workflow serves the Next.js app. The shared Express scaffold is not used for KidVest APIs; Next route handlers own `/api/*`.

```sh
pnpm --filter @workspace/kidvest run typecheck
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/kidvest run export
```

The source contract is `lib/api-spec/openapi.yaml`. Regenerate after API contract changes.

## Authentication and access

- Parents: `/parent/register`, `/parent/login`.
- Kids: `/kid/login`. Only a parent can create a kid account.
- User identity and parent ownership are derived on the server, never trusted from request bodies.
- Middleware guards portal routes; every API repeats session/role/ownership checks.
- Login, registration, demo creation, market reads and request writes have process-local rate limits. Use a shared Redis-backed limiter and a trusted ingress IP policy before scaling to multiple instances.
- Mutation endpoints enforce same-origin checks; NextAuth uses its own CSRF flow.
- Deleted kids cannot use an old session: APIs re-check account existence. History is retained for the parent audit log.
- Password changes do not currently revoke already-issued JWT sessions; session expiry is 24 hours. Add server-side session versioning before a public launch.

## Database and atomic trading

MongoDB collections: User, Wallet, StockRequest, Holding, Transaction, ActivityLog. Indexes cover identifiers, kid/parent relationships, request status, holdings by kid/symbol and payment session IDs.

Approvals use Atlas transactions and a parent revision write to serialize family changes. The transaction validates current pending status, holdings, wallet balance and spending limits before updating the request, wallet, holdings, transaction and log atomically.

Spending limits are in USD and use UTC calendar days/months. Zero means no spending, not unlimited. Purchase cost is rounded once to cents; fractional shares allow up to six decimals. Holdings average price retains precision. Sales return virtual proceeds to the wallet and always require parent approval.

## Demo and seed

The landing-page demo creates an isolated sample family with one parent, two kids, sample holdings and pending requests. Its secret demo key is generated randomly per visitor and is never a hardcoded shared account.

Demo market fixtures are dated sample prices, not live quotes; charts are explicitly sample data. Unknown symbols use Yahoo Finance and fail explicitly if unavailable. Regular accounts use Yahoo prices and never silently substitute sample values.

```sh
npm run seed
```

The seed script creates `parent@kidvest.example`, `demo_oliver` and `demo_sophie`. It generates a random password at runtime and displays it once in the local terminal; it never overwrites existing accounts.

If MongoDB is absent in development, a **development-only** local JSON learning store is used and clearly reported by the dashboard. This is not a payment database. Production refuses local storage. A configured but unreachable MongoDB never silently falls back. Demo accounts are not a security boundary against their own visitor; keep public demo mode disabled for real family use.

## Market limitations and disclosures

- Popular stocks are a curated learning list, not a claim of market-wide trending rankings.
- Any supported Yahoo ticker may be searched; a stock's currency is displayed.
- The current wallet supports USD. Non-USD tickers can be explored but requests are blocked with an explicit currency message; there is no hidden FX conversion.
- Prices can be delayed. A closed market shows the latest available price and market state.
- API failures are shown explicitly. Yahoo data availability and terms must be reviewed before public use.
- Dashboard history is invested cost derived from the transaction ledger, not reconstructed historical portfolio performance.
- Company explanations are short curated educational text, not AI-generated recommendations.

## Before a public launch

Complete shared rate limiting, privacy/parental-consent review, child safety review, legal/provider terms review, accessibility testing and production security review. This build is not a certification of production readiness.

Password changes revoke all existing sessions for that account, including the session changing a parent's password. Parent-driven kid resets revoke only that child's sessions. Passwords and per-user authentication versions are saved in the same family transaction, independently of the financial family revision. Protected APIs and session refreshes check persisted versions without a revocation cache; deleted accounts and old tokens without a version must sign in again. On the first rollout, all pre-versioning sessions require a fresh login, while existing accounts need no data migration. Normal sign-out clears only the current browser cookie, not other devices' sessions. Middleware redirects are routing hints; database-backed API/session checks enforce access. Demo login keys for an account are removed on password change/reset.

Do not process real money or treat this as financial advice. Use Stripe test cards only.

## Stripe test checkout

Provide `STRIPE_SECRET_KEY` with an `sk_test_` key, `DATABASE_URL` for Stripe-managed PostgreSQL sync, and `MONGODB_URI` for application data. Application data uses the `kids_project` database even if the URI names a different default database. On startup the server runs Stripe sync migrations, registers/reuses a managed webhook at the runtime HTTPS app origin, and backfills Stripe objects. `NEXTAUTH_URL` should be your application's trusted public origin; it is also used for auth. Locally, use an HTTPS tunnel or `stripe listen --forward-to localhost:3000/api/stripe/webhook` with its signing secret in `STRIPE_WEBHOOK_SECRET`.

The server creates a Stripe Product and immutable Prices through Stripe's API, never through SQL or Checkout `price_data`. Products, Prices, customers and Checkout Sessions are synced to the managed `stripe` schema. Application payment intents in MongoDB contain ownership, expected amount and parental approval instructions; they are not a parallel Stripe catalog.

Parents can top up from Payments. Demo families default to instant sample credits; explicitly switch on **Stripe TEST Checkout** to exercise the actual hosted test flow. A successful return is rechecked with Stripe server-side: URL parameters alone cannot credit a wallet. Cancellation expires the session. The test receipt and amount appear in payment history; pending returns are retried for up to a minute.

For an insufficient-balance buy, parent approval opens Checkout for exactly the missing amount (demo accounts first offer an explicit Stripe button). The reviewed price/quantity/comment are held for 35 minutes. Confirmation atomically credits the wallet and rechecks pending status, spending limits, shares and balance before approval. If the request was rejected, funds were spent, limits changed, or the quote expired, the deposit remains in the wallet and the UI explains why manual review is needed. No second charge is initiated automatically.

Stripe's USD minimum is $0.50. When the exact missing amount is lower, checkout is blocked rather than silently charging more; top up at least $1 manually and approve again. Amounts are limited to $10,000. All amounts are stored in integer cents for payment validation. Multiple or out-of-order notifications are safe because the wallet deposit is unique by Stripe session and serialized with the parent/family transaction.

Test card: `4242 4242 4242 4242`, any future expiry, any three-digit CVC. Decline test card: `4000 0000 0000 0002`.

Run `npm test` for settlement, duplicate notification, ownership, altered amount/currency/mode, spending-limit, rejected-request and expired-quote checks. A successful build or unit test is not proof of a hosted Checkout payment: the browser-funded flow additionally requires working MongoDB credentials.

Development verification completed with Stripe test cards: hosted wallet top-up, return-page confirmation, duplicate confirmations, child request → exact-missing-amount Checkout → automatic approval → updated holdings/balance, cancellation without credit, child payment denial, invalid webhook signature rejection, and repeated valid signed paid-event delivery without duplicate funds or holdings. The nine automated settlement/authorization regression checks and the production build also pass. Live payments, multi-server deployment behavior and a full accessibility/security audit were not tested.
