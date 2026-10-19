---
name: Stripe connection boundary
description: Generic Stripe API authorization versus native server credentials needed for managed checkout and webhooks.
---

Do not assume the generic Stripe API connector supplies a native Stripe server key. Do not repeatedly reconnect it to fix this difference.

**Why:** The connection authorized the generic API proxy, but the native connection-credential lookup did not expose the server key required by the managed Stripe sync SDK.

**How to apply:** Use the secure secrets flow for the test-mode server key when implementing managed Stripe checkout/webhooks in this project. Keep all financial setup test-only; reject live-mode credentials. Preserve MongoDB as the application database; any PostgreSQL Stripe sync is ancillary, not a migration of family data.
