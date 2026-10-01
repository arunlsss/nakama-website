# Management insights update

This update improves analysis of the orders already stored in your Nakama cloud workspace. It is compatible with the deployed backend. No DNS changes, npm installation, Firebase redeployment, or emulator run is needed to publish these frontend files.

## What changed

- Sales basis: All order value, Active order value, or Completed only. Active includes Completed, To Ship, Shipped and Unpaid; it excludes canceled, returned and unknown statuses. None of these measures is net revenue or profit.
- Order health: completed share, cancellation rate, return/refund-status rate, lifecycle values, To Ship orders placed more than seven days ago, and per-store health with CSV export. Health rates always use all statuses within the date/store/marketplace filters, independent of the sales basis and order-status filter. Order age does not establish shipping lateness.
- Store comparisons: current/prior value, absolute and percentage movement, AOV, cancellation/return rates, and sorting. Stores with only prior-period orders remain visible when a comparison is available. Zero prior value never produces an invented growth percentage.
- Product insights: top products by value or units, top-five concentration, weighted order value per unit and value share. Monthly SKU identity is kept, and overlapping SKU-order counts are not presented as unique total orders.
- Overview: sales by weekday and lifecycle charts, evidence-based review suggestions, and clearer order-value labels.
- Data coverage: imported months, latest recorded import, missing report months, metric definitions and source availability. Advertising, profit, traffic and stock metrics remain unavailable until their source records are connected.
- Missing current months and failed comparison pages suppress percentage comparisons. An imported month does not establish that every store or date was exported. Dates without imported orders are not confirmed zero-sale days.
- Six views remain available in the mobile bottom navigation. Auto, Light and Dark appearance is retained.

## Product date limits

The deployed backend stores SKU aggregates by month. Exact product figures for Yesterday or partial-month date ranges are unavailable and remain withheld, including exports. Full-month and Year views aggregate available monthly reports. If months are missing, the page explicitly lists them and labels the product coverage as partial.

The update does not connect marketplace APIs or calculate ad ROAS, actual refund amounts, payouts or profit. These require additional source data and backend integration.

## Publish through GitHub Desktop

1. Extract `nakama-management-insights-update.zip` separately.
2. Copy its `management.html` and `assets` files into the matching locations in `~/Downloads/nakama-website`. Add the two new scripts as well as replacing the existing files. Keep your Firebase configuration, repository files, CNAME and backend folder.
3. Commit the frontend changes and Push origin in GitHub Desktop.
4. Wait for GitHub Pages publishing, then reload Management with Command + Shift + R. The GitHub Pages address continues to work; the custom-domain switch is separate.
5. Check the sales-basis selector, Order health, Stores, Products and Data coverage. Product rankings need complete-month date selections.

The patch includes:

```
management.html
assets/management.css
assets/management.js
assets/cloud.js
assets/report.js
assets/charts.js
assets/theme.js
assets/insights.js
assets/insight-ui.js
UPDATE-INSIGHTS.md
```

The complete website ZIP contains the frontend, compatible backend source, tests and deployment instructions. Prefer the frontend patch for this update to avoid disturbing your installed backend dependencies.

## Validation

15 focused date, analytics and UI tests pass, including sales-basis reconciliation, stable health-rate denominators, unknown statuses, warehouse-transfer exclusions, disappeared stores, zero baselines, missing months, failed comparison loads, product aggregation, partial-month protection, viewer restrictions and privacy after sign-out/revocation. Browser checks use the supplied BigSeller export with a mock authenticated connection. They do not access live Firebase records. This package has not been published to your site.
