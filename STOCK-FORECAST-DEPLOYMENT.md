# Stock Forecast v1

The page is `stock-forecast.html`. Stock and POs are saved in the private `stockForecast/main` Firestore document through authenticated functions. Viewer members can read; importer and admin members can edit. Saves use a revision check so a second device cannot silently overwrite another user's changes.

## Deploy the backend after pulling this update

From the repository root:

```sh
cd backend
npm ci
npm ci --prefix functions
npx firebase deploy --only functions:nakama:nkmStockForecast,functions:nakama:nkmStockDemand --project nakama-sales
```

If Firebase reports that no function matches the filter, confirm the export names in `functions/index.js`, then deploy the Nakama codebase:

```sh
npx firebase deploy --only functions:nakama --project nakama-sales
```

If you are already inside `backend`, do not run `cd backend` again. These functions use the same callable transport and membership checks as the existing reports. If deployment creates the services but fails to set their invoker policy, apply the same Cloud Run invoker configuration used for `nkmCustomerInsights` to `nkmStockForecast` and `nkmStockDemand`, then retry. Membership authorization still runs inside both handlers.

No Firestore or Storage rule changes are required. Existing catch-all rules keep the new stock document inaccessible to direct browser reads and writes.

Publish the frontend through the existing GitHub Pages workflow. Hard-refresh the page, sign in, and select Refresh after the functions are deployed. Do not commit stock files or exported forecast drafts to the public repository.

## First use

1. Set the stock snapshot as-of date and upload the complete BigSeller inventory export (XLSX or CSV). On Hand is the starting balance. Allocations and reservations are not subtracted. English and Thai inventory headers are supported.
2. Review warehouse selection. New workspaces include exported warehouses other than Return by default; all warehouse choices are visible and editable. The complete upload replaces the prior snapshot, including warehouses absent from the new export.
3. Online running rates now sync automatically when opening Stock Forecast, refreshing it, or receiving a new sales-report revision. The default is a 30-day average; switch to 7 days if desired. Rates are calculated from shared sales reports for every member and do not require Save workspace. Matched online rates are read-only; offline demand remains editable. Unmatched stock SKUs can use a manual fallback in SKU details. Imported rates require all calendar months in the trailing 30-day window to be present. The averaging window ends on the latest imported online order date; cancelled and returned orders contribute zero demand. Exact stock SKU matches use Completed, Shipped and To Ship order units, excluding Manual orders. Add offline demand separately. Previously sold exact SKUs with no units in the latest complete window get a zero rate. Unknown SKU matches require a manual fallback or bundle mapping. Incomplete sales coverage keeps automated rates unavailable.
4. Review suggested category mappings. Defaults are Wiper 45 days, Spray 60 days and Others 45 days, including production. Each PO line has an editable warehouse-ready ETA.
5. Create one PO with one or more SKU lines. Ordered quantities are fixed values. Draft and cancelled remaining quantities do not enter the main forecast. Apply updates your draft; Save workspace shares it.
6. Record partial or full receipts per line. Receipt dates on or before the snapshot date are assumed included in that snapshot and are not added again. Later receipts enter the forecast on their actual dates. Refresh the stock snapshot regularly. Overdue outstanding quantities do not become stock automatically.
7. Compare BigSeller On The Way with registered open PO quantities in SKU details. The BigSeller aggregate is never added on top of registered POs.

The stock snapshot is treated as a closing balance on its as-of date; daily projections start the next day. Unreceived ETAs on or before today stay overdue, even when the snapshot is older. Suggested new orders use today's date for lead time. Forecast settings include horizon, safety days, target coverage after a new order arrives, and lost-sales versus backorder handling. Suggestions account for already scheduled arrivals and future demand, but cannot solve shortages before a new order arrives. Snapshots older than a year require a replacement before forecasting.

## Current scope

Single-stock-SKU forecasting and individual PO receipts are supported. The first version does not infer bundle component consumption, automatically synchronize warehouse stock, infer missing PO ETAs from BigSeller aggregate incoming, or use a monthly GMV chart as a demand source. Bundle/component rates can be entered manually. MOQ, carton rounding and supplier-specific holiday calendars are not applied in this version.

## Verification

```sh
npm test
node --test backend/tests/ui.test.cjs tests/stock-ui.test.cjs
```

Tests cover fixed PO quantities, gaps between arrivals, zero and missing demand, partial receipts, snapshot replacement, warehouse scope, draft/cancelled/overdue supply, lost sales/backorders, purchase recommendations, online demand coverage, edit roles, conflicting revisions, and sign-out/revocation cleanup.

## Upgrade automatic running rates

After pulling this update, deploy the updated demand function from the backend directory:

```sh
npx firebase deploy --only functions:nakama:nkmStockDemand --project nakama-sales
```

No new function or database rule is needed. The demand response now includes historically matched sales SKUs with zero units in the latest window. Stock Forecast has moved into Management navigation; public navigation exposes Management only. Sidebar controls select and scroll to their section, maintain active states and support section URLs.


## Max / Min / Average and the `internal [0]` transport error

Deploy the updated daily demand statistics after merging and pulling this update. From `backend`:

```sh
npx firebase deploy --only functions:nakama:nkmStockDemand --project nakama-sales
```

Average divides each SKU's eligible online units by all 7 or 30 calendar days. Max and Min take the highest and lowest daily totals after combining orders across stores and marketplaces. Zero-sales days count as zero, so Min may be zero. Cancelled, returned, excluded and Manual orders remain excluded. The existing month-coverage requirement remains; missing months do not become zero-sales months. Offline demand and growth are applied separately, and ordered PO quantities and ETAs never change when switching modes. All members can compare modes immediately without saving; the selection is a temporary view, not a shared planning change. Older demand responses support Average only; Max/Min forecasts remain unavailable until the updated service returns their statistics.

A live OPTIONS check on 2 October 2026 returned 204 with CORS headers for `nkmStockForecast`, but 403 without CORS headers for `nkmStockDemand`. This prevents the browser reaching the demand callable and can appear as `functions/internal` / `internal [0]`. The frontend now explains the failed operation and keeps a successfully loaded stock/PO workspace usable. It does not invent a zero rate, bypass permissions, or overwrite a workspace that failed to load.

After deploying, restore the demand service's browser invocation access using your Google Cloud account. Find its actual Cloud Run service name and disable the transport IAM check:

```sh
stock_demand_service=$(gcloud functions describe nkmStockDemand --gen2 --region=asia-southeast1 --project=nakama-sales --format='value(serviceConfig.service)')
gcloud run services update "${stock_demand_service##*/}" --region=asia-southeast1 --project=nakama-sales --no-invoker-iam-check
```

Alternatively, in [Google Cloud Run](https://console.cloud.google.com/run?project=nakama-sales), open the service for `nkmStockDemand`, choose Security, Allow public access, then deploy the change. This controls transport access only: Firebase ID tokens, enabled membership and role checks remain mandatory inside the callable. Google documents this method in [Allowing public access](https://docs.cloud.google.com/run/docs/authenticating/public). It requires Cloud Run Admin permissions and must be allowed by the organization policy. If the organization requires invoker IAM, ask its administrator to configure supported browser invocation access instead.

If Firebase reports an invoker-policy error after creating/updating the service, apply the access setting above. A code edit cannot change the live IAM configuration without project credentials. Hard-refresh Stock Forecast, then select Sync sales now. The note should show the sales window and selected logic, and Max/Min/Average should immediately update rates, risk counts, suggestions and any open SKU chart.
