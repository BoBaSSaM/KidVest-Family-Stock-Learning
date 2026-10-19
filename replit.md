# KidVest

Family stock-learning web app with separate parent and kid portals. All investing is virtual paper trading; no brokerage connection. Show “Educational use only. Not financial advice.”

## Run & operate

- Managed workflow: `artifacts/kidvest: web` runs Next.js on its artifact-assigned PORT.
- `pnpm --filter @workspace/kidvest run typecheck`
- `pnpm --filter @workspace/kidvest run build`
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/kidvest run export` creates a standalone npm-compatible ZIP under ignored `generated-artifacts/`.
- `pnpm --filter @workspace/kidvest run seed` creates synthetic demo accounts with a randomly generated password printed once locally.

## Stack & layout

- Next.js App Router, TypeScript, Tailwind4, shadcn/Radix, Framer Motion, Recharts.
- Frontend and APIs: `artifacts/kidvest/src/app`.
- Shared UI: `artifacts/kidvest/src/components`.
- Backend services: `artifacts/kidvest/src/lib`.
- Mongoose models: `artifacts/kidvest/src/models`.
- API source contract: `lib/api-spec/openapi.yaml`; generated client/validation libraries are consumed by KidVest.
- Credentials auth was explicitly requested: NextAuth, bcrypt, JWT sessions. Requires `NEXTAUTH_SECRET` or existing `SESSION_SECRET`.
- MongoDB Atlas via `MONGODB_URI`; transactions require replica-set support. Do not migrate to Postgres.
- The shared Express scaffold is unused for this product. Its proxy path is `/internal-api`; Next owns `/api/*`.

## Product & constraints

- Arabic RTL / English LTR, light/dark modes.
- Kids can only request buys/sells. Parents approve, reject, edit quantities and set per-child limits.
- USD virtual wallets; non-USD stocks may be explored but cannot be requested without an explicit future FX implementation.
- Spending limits use UTC calendar day/month. Zero prevents spending.
- Actual quotes are server-only Yahoo Finance calls cached 60s. Do not silently substitute demo prices on live errors.
- Popular stocks are curated learning choices, not a market-ranked trending list.
- Demo visitors get isolated random-key families. Sample prices/charts and credits must be labeled demo. No real payment occurs.
- Portfolio dashboard history is invested cost from transaction records, not historical market performance.

## Pending production work

Stripe is NOT connected. Non-demo checkout and webhook fail closed. Real-account funding, signed/idempotent webhooks, receipts and automatic insufficient-balance approval resumption require setup and implementation. Do not say payments or the complete funded flow work end to end.

Before a public launch: finish Stripe test integration, shared rate limiting, JWT revocation, privacy/parental consent review, security/accessibility testing, provider terms review. Read the app README for current limitations.
