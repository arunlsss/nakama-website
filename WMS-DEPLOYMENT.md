# WMS & Orders — BigSeller integration

Management → Inventory Management → **WMS & Orders** opens `/management/#wms`. Stock Forecast, Purchase Orders and Shipment Check retain their current behavior. The new section reads BigSeller through the Nakama backend; it does not write orders or stock to BigSeller and does not change imported sales reports or PO/forecast balances.

## Set up and deploy

From `backend`, install the pinned dependencies if needed:

```sh
npm ci
npm ci --prefix functions
```

Save the original supplied BigSeller HTML outside the public repository. Provision its credential card directly into the existing project's Secret Manager, without putting key values in command arguments:

```sh
node scripts/configure-bigseller.cjs --document "/absolute/path/2026-10-19 BigSeller API Interface Document - SSS x BigSeller.html" --project nakama-sales
```

Alternatively use `--credentials /private/path/config.json` with `appId`, `appKey` and optional `host`. Only the documented `.com` and `.pro` API hosts are allowed. Never commit this file. Temporary setup files are private, ignored by Git, and removed after provisioning.

Deploy only the two new services first:

```sh
npx firebase deploy --only functions:nakama:nkmWms,functions:nakama:nkmWmsSchedule --project nakama-sales
```

Publish the frontend through the existing GitHub Pages workflow after its matching backend is available. Run `npm run build:urls` from the repository root after editing page templates. No Firestore or Storage rule change is needed: the existing deny-by-default rules already protect WMS records and tokens from direct browser access.

Sign in to Management as an existing enabled **Admin**, open **WMS & Orders → Connection settings**, choose the history start and the BigSeller account's actual time zone, then select **Connect BigSeller** and **Sync now**. No API key is entered in the website. Viewers and Importers can read the section; only Admins may connect, sync, pause or change warehouse selection. Automatic sync runs every ten minutes and can be paused from the section.

Only the callable `nkmWms` is a browser endpoint. The scheduled function must retain its scheduler invocation protection. If browser invocation of `nkmWms` is blocked by an organization IAM rule, apply the same approved transport configuration used for the other Nakama callables. The callable still requires Firebase membership on every operation; never remove that check or expose the scheduler publicly.

## Data handling

- Credentials use the `NKM_BIGSELLER_CONFIG` managed secret. Tokens stay in private Firestore. Authorization redirects are inspected server-side, their state is checked, and they are not followed to the public website.
- A shared lease prevents overlapping scheduled/manual syncs and competing token refreshes. Per-interface reservations maintain at least 1.1 seconds between requests, including retries.
- Orders are upserted by unique ERP package, not by a potentially repeated marketplace order number. Quantities and bundle components remain distinct. The new section does not invent selling prices or cancellation reasons absent from the documented response.
- Inventory, warehouses and products are staged privately and published only after every page completes. The last successful snapshot stays visible on failure. Inventory totals describe that snapshot and its warehouse scope, not guaranteed real-time stock.
- Orders, returns, settlements, movements and wallets upsert stable records. A time checkpoint advances only after a complete window and its detail batches succeed. Page progress is persisted for safe retries. Recent orders, return receipts and settlements use separate checkpoints so they continue updating during older backfills. Larger backfills continue in subsequent bounded sync passes; per-feed progress and errors are visible.
- Orders/settlements/wallets use update-time windows with an overlap. Returns use both original-order and receipt-date windows, plus rotating rechecks of known open inbound returns. Stock movements use the BigSeller account's query timezone.
- Large numeric identifiers and decimal amounts are preserved as text before JSON parsing can round them. Different currencies are never silently summed together. Settlement income, product sales and wallet cash movements have separate labels.
- Recipient names, phone numbers, addresses and extra buyer/location fields are excluded from stored order records. WMS data is not written to local storage. Revocation/sign-out clears rows, details and pending responses.
- The table has 100-record server pages, explicit search/sort of the loaded page, safe CSV export of that page, and expandable record details. It does not claim to search the entire account.
- WMS collections are `wmsInternal`, `wmsFeeds`, `wmsKnownWarehouses`, `wmsSnapshots` and `wmsRecords`. Keep any future Firestore rules deny-by-default for these paths. Full snapshots retain their immediately previous publication; older full snapshots are pruned only after successful replacement.

## Live verification on 20 October 2026

The supplied account authenticated successfully. Small reads verified products, orders and package details, a shipping warehouse's inventory, unified settlements, return receipts, and all three marketplace wallets. Read-only synchronization was exercised using temporary in-memory persistence, without writing Firebase business data.

Observed differences from the HTML:

- Order-list responses can have `success: null` and `code: 0`; the client accepts that combination but rejects explicit failures.
- Product pagination uses **`current_maxid`**, not the parameter table's `current_max_id`. Live calls with the latter repeated the first page; the connector uses the verified spelling and rejects stalled cursors.
- `getWarehouseList` returns **40101020: no permission** for this account. Inventory reads work for a known warehouse. The connector can discover warehouse IDs from synced orders/returns, or an Admin can enter explicit IDs. The screen labels this limited scope; it never claims those are all warehouses in the account. Request warehouse-list access from BigSeller for complete automatic discovery.
- Inventory reads accepted 100 rows/page; the example's 1000 was rejected. Stock-movement queries accepted date-only `YYYY-MM-DD` and rejected timestamps. Movement pagination remains guarded by stalled-cursor validation.
- Additional undocumented order fields were present live. They are not used to silently change Nakama's existing metrics.

The HTML's 1000-row inventory example and movement timestamp/cursor formats are not reliable. Use the live-verified settings in the adapter, and retain visible feed errors if BigSeller changes its contract. Historical retention, every connected store's completeness, the upstream update delay and expired-token recovery after extended downtime still require vendor confirmation.

## Verification

```sh
npm test
npm run test:wms
npm test --prefix backend
```

WMS tests cover signing vectors, int64/decimal precision, nullable success, token rotation, callback state checks, rate-limit retries, membership/role restrictions, failed-page recovery, previous snapshot retention, ambiguous settlement identities, source escaping, revoked-session cleanup and navigation.
