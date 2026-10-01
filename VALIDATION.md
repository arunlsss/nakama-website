# Validation completed

Completed on 30 September 2026. No live Firebase project was accessed or deployed.

| Check | Result |
| --- | --- |
| Existing orders engine | PASS: header mapping, zero quantity/price, unique orders, repeated SKU lines, duplicate exports, full-order updates, Bangkok dates, split batches, conflict rejection and 100,000-row aggregation |
| Cloud core, 6 tests | PASS: membership/roles, dedicated-project guard, bounded file manifests, CSV/XLSX parsing with long IDs, invalid-record rejection, order replacement/older exports, compact report chunks/pages without omissions, stale/competing lease rejection |
| Frontend DOM, 2 tests | PASS: only selected month loads, viewer upload disabled, reset retains month, sign-out clears rendered records, late report response cannot expose data after access revocation |
| Deployment guard, 1 test | PASS: public web config writes correctly; mismatched deployment project, attendance project and service-account config are rejected |
| Real Firebase security rules + production handlers | PASS: Auth, Firestore and Storage emulator integration scenario, approximately 2.9 seconds for assertions after startup |

The emulator scenario exercised the actual Storage/Firestore rules and exported production handler bodies through their callable `.run` methods. It checked denied anonymous/viewer/wrong-owner uploads, wrong size and MIME type, immutable originals, denied source reads/list/delete, denied direct report reads/client writes, valid import publication, matching authorized reports across two clients, duplicate job idempotency, owner-only status, malformed records and missing uploads leaving active reports intact, competing import leases, and membership revocation.

Environment: Node 24.19.0; Firebase web SDK 12.19.0; Admin SDK 14.5.0; Functions SDK 7.4.0; rules-unit-testing 5.0.2. Java 21 downloads were unavailable in this environment, so the successful emulator run used the official Firebase CLI **14.22.0**, Java **17.0.20**, Firestore emulator **1.19.8**, and Storage rules runtime **1.1.3**. The delivered deployment CLI remains **15.32.0** and targets Node **22**. Its normal emulator command requires Java 21+. The compatible test CLI was installed only temporarily and is not included in the package.

Limits of verification: no live deployment/IAM/billing check, no real production token transport or browser sign-in against a configured project, no Node 22 execution in this environment, and no refreshed browser screenshot. Frontend behavior was checked in jsdom; the existing mobile layout was retained. Runtime limits are application ceilings, not a tested production capacity guarantee. Follow CLOUD-DEPLOYMENT.md's live verification after deployment.

The emulator wrapper now stops the complete process group after three minutes by default. This validation used a two-minute ceiling and finished successfully, with all emulators stopped. The earlier hour-long stall was a browser preview call lasting about 56 minutes, compounded by initial Java and test import setup problems.

## Configuration update

Configured the frontend and deployment target for the user-provided `nakama-sales` web app. Public JSON parsed correctly; the deployment project check and actual-project predeploy guard both passed for `nakama-sales`. No live deployment, sign-in or cloud access was performed as part of this configuration update.

## Platform Processing exclusion update (1 October 2026)

- Browser and backend engines match byte for byte. Platform Processing rows bypass price, quantity and SKU validation, but retain order identity/date validation. They contribute nothing to daily/store/marketplace/status/SKU GMV, units or orders. Other statuses retain their existing behavior.
- An identity/status marker with no item lines is retained privately to prevent older exports restoring an excluded order. Newer included statuses can restore the order. Import history and browser preview count only included orders. Original uploaded files remain archived unchanged.
- Existing published report rows are also filtered from frontend views, filters and downloads. Reimport after deployment to regenerate cloud summaries under the new rule.
- PASS: engine regression suite, 100,000-row aggregation, seven cloud-core tests, three frontend DOM tests, and one deployment-guard test. Exclusion-only updates can publish an empty workspace; malformed included rows still block publication. The emulator suite was not rerun for this calculation/UI update.
- PASS: the supplied 20,000-row BigSeller export produced 64 excluded rows/64 excluded orders, zero invalid rows, 19,318 included orders, 21,262 units and THB 1,478,379.94 GMV. Frontend and server results matched exactly. This validates the attached part, not unprovided parts of the larger batch.
- No live project was accessed or deployed for this update.
