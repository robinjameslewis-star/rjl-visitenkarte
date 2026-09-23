# Member policy prototype

An isolated, dependency-free design draft for the planned members' area. Nothing imports this module into the live website or Worker.

Run: `node tests/member_policy_test.mjs`.

The module models prepaid periods, bounded pilot access, account access after service suspension, project-only invoice approval, optional informal German address, a separately authorized CAIO affiliation and audience-based article selection.

Inputs must come from authenticated, organization-scoped server records. Browser claims, raw Stripe subscription status and raw webhook bodies are not trusted inputs. `revoked: false` is explicit: missing or ambiguous coverage fails closed. A settled record must be invalidated by the payment reconciler when refunded or reversed.

Still required before use: customer identity, persistence, invitation redemption transactions, private content authorization, signed/idempotent and order-independent payment reconciliation, per-organization atomic AI budget reservation, monitoring, contracts, protected storage, booking entitlements and operational acceptance tests. The policy is not a payment system, confidentiality boundary or security certification.

Trial ends at 1 February 2027, 00:00 Europe/Berlin. Paid coverage cannot start before 22 January 2027, 00:00 Europe/Berlin. Audience tags control recommendations only; callers must authorize articles before filtering. Suggested future segments: accounting, business, startup, culture, events, hospitality, public-sector, personal. Only the accounting track is in the initial product scope.
