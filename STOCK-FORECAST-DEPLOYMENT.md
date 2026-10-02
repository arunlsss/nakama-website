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
3. Set running rates in SKU details or use imported online sales. Imported rates require all calendar months in the trailing 30-day window to be present. Exact stock SKU matches use Completed, Shipped and To Ship order units, excluding Manual orders. Add offline demand separately. Unmatched SKUs retain their existing assumptions; missing rates stay unavailable.
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
