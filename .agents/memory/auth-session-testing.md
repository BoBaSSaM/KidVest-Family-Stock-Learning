---
name: Authentication test runtime
description: Why authentication regressions must use Next-compatible module interop and isolated storage.
---

Exercise authentication using the same CommonJS interop as Next's bundler, not native ESM default-import assumptions.

**Why:** NextAuth v4's credentials provider can expose a nested default under native Node ESM even though the bundled app works. This caused the test harness to fail before exercising any authentication behavior.

**How to apply:** Keep authentication integration tests representative of the bundled runtime. Run them against isolated temporary storage rather than the workspace's real family database.
