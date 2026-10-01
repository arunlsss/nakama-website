# Management dashboard update

## Included

- Readable 16px body text, larger labels/tables/KPIs, 44px touch controls, responsive cards and mobile bottom navigation.
- Auto, Light and Dark themes. Sun, moon and auto icons are available on Management and its sign-in screen. Auto follows the device appearance setting. The chosen mode is saved on that browser.
- Yesterday, Month, Year and Date-to-Date controls using Bangkok calendar dates. Custom ranges include both endpoints.
- Revenue/Orders/Units trend switch, prior-period comparison line when reports exist, order-volume bars, marketplace-share donut and store-ranking bars.
- Business pulse cards: leading marketplace, leading store, strongest sales day, canceled/pending order share, sales momentum and units per order. Insights use your imported orders and the active business filters.
- GMV/order/unit/AOV comparisons with the previous month, previous year, previous day or preceding equal-length custom range. Missing prior reports show an unavailable baseline instead of a fabricated percentage.
- Cross-month loading through the existing secure backend. Current daily-only ranges and comparison reports skip SKU pages. Two report-month requests run concurrently; per-session report caching is cleared on sign-out and revision changes.
- Date-scoped CSV/JSON exports and all existing warehouse-transfer exclusions.

## Product date scope

The existing backend stores products by month. Product totals are displayed for Month, Year and custom ranges covering complete months. For partial-month ranges, product figures and exports are withheld and the page asks you to select full months. Daily GMV, orders, units, store reports and marketplace reports remain available for any date range.

## Publish this frontend update

The backend is compatible with this update. No backend redeployment or dependency installation is needed when applying only the frontend files.

Replace these existing files:

```text
management.html
assets/management.css
assets/management.js
assets/cloud.js
```

Add these new files:

```text
assets/report.js
assets/charts.js
assets/theme.js
```

1. Extract the package separately. Copy the files above into matching paths in your existing GitHub Desktop repository. Keep your repository folder and domain/Firebase configuration.
2. Commit and push origin in GitHub Desktop.
3. Wait for GitHub Pages publishing to finish. Open Management and hard-refresh with Command + Shift + R.
4. Test Month, Yesterday, Year, and a custom range; use the sun/moon/auto buttons to choose appearance.

The complete website ZIP includes the existing backend and all earlier import fixes. The smaller frontend ZIP contains the seven frontend files above and these instructions.

## Checks

PASS: date and comparison logic, leap years, inclusive ranges, cross-month/year totals, partial-month product protection, privacy after revocation/sign-out, saved/system theme behavior, daily-only paging validation and existing import/security/deployment tests. Browser checks used your supplied sales summaries with a mock authenticated connection; no live Firebase data was accessed. Light and Dark were reviewed on desktop and mobile.

This update has not been published to your live site.
