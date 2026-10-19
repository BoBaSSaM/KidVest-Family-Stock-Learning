---
name: Funded approval safety
description: Rationale for holding reviewed prices through test checkout and retaining deposits when approval must be deferred.
---

An insufficient-balance checkout must use the parent's reviewed quantity and a bounded price snapshot, not silently buy at a different price after payment.

**Why:** The checkout charges an exact missing amount. Repricing after payment could require an unapproved second charge or spend a different amount than the parent reviewed. KidVest is a paper-trading learning product, not a brokerage execution service.

**How to apply:** Recheck spending limits, ownership, request state and available balance at confirmation. If the review is expired or no longer eligible, retain the verified deposit in the wallet and explain the deferred approval instead of forcing a purchase or discarding confirmed funds.
