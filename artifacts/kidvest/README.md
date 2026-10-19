# KidVest

A family stock-learning web application with separate parent and kid portals. All holdings and transactions are paper trading. No brokerage is connected.

**Educational use only. Not financial advice.**

## Current delivery status

Implemented: parent registration, credentials login with bcrypt/JWT sessions, role-guarded portals, family ownership checks, kid creation/edit/deletion/password reset, daily/monthly limits, buy/sell requests, approve/reject/quantity edits, virtual holdings and transaction history, market search/quotes/charts, lessons/quizzes/badges, activity log, and profile settings.

**Stripe is not connected in this build.** Real-account funding deliberately fails with a clear error. Demo accounts can receive clearly labeled virtual demo credits; no payment is taken. The webhook endpoint returns 503 and processes no events. Stripe Checkout, signature-verified idempotent webhooks, receipts, and automatic post-payment approvals still require integration setup and implementation. Do not describe the payment flow as verified.

## Stack

- Next.js App Router + TypeScript. The requested Next.js 14 package was rejected by the security registry; this project uses supported Next.js 16.
- React, Tailwind CSS, shadcn/Radix components, Framer Motion, Recharts, TanStack Query.
- MongoDB + Mongoose, six separate indexed collections.
- NextAuth credentials provider, bcrypt password hashing, JWT session cookies.
- yahoo-finance2, server-side only, 60-second cache.

## Run the downloaded standalone ZIP

Requirements: Node.js 22 or newer, npm, and a MongoDB Atlas replica set.

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

Connect and finish Stripe **test mode**, configure a signature-verifying webhook and idempotent wallet credits, test failure/retry cases and exact-missing-amount approval resumption. Complete a MongoDB-backed multi-session functional check, shared rate limiting, JWT revocation, privacy/parental-consent review, child safety review, legal/provider terms review, accessibility testing and production security review. The first build is not a certification of production readiness.

The requested end-to-end Stripe-funded purchase flow has **not** been verified. Do not process real money or treat this as financial advice.
