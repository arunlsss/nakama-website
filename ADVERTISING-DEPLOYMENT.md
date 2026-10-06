# Shopee and TikTok advertising imports

Management → Advertising accepts the BigSeller **Marketing → Ads Overview → Shopee → Store Data Details** export in THB, as XLSX or CSV. TikTok GMV Max daily exports in THB are also accepted, including the Thai daily layout. The upload dialog binds TikTok files in a batch to the selected store because those files do not contain a store identifier. Use separate batches for different TikTok stores. Dates, platform and store selections belong to Advertising and do not change sales or product filters. Admins and importers can upload; enabled viewers can read shared reports.

## Deploy before publishing the frontend

Advertising uses the existing authenticated `nkmProcessImport` callable with a separate advertising operation. Its backend update and server-only advertising upload Storage rules require a Firebase deployment. No service IAM or network access setting is changed. From `backend`:

```sh
npm ci
npm ci --prefix functions
npx firebase deploy --only functions:nakama:nkmProcessImport,storage --project nakama-sales
```

Keep the existing private Firestore rules. Advertising documents and snapshots are accessed only through the authenticated service. Advertising uploads pass one original file at a time through this callable (base64, at most 4 MiB before encoding). The service checks the enabled importer/admin, job owner, uploading state, 24-hour expiry, manifest slot and exact original size before a create-only Storage write. Identical upload retries succeed; different bytes cannot overwrite an existing file. Direct browser advertising writes, reads, listing and deletions are denied. This avoids browser-to-Storage authorization failures without changing IAM or network access. Original files are server-validated, and publication checks both membership and the current workspace revision in a transaction.

The existing import service's browser transport remains unchanged. Advertising reads still require an enabled member, and imports require an importer/admin role. Order imports without the advertising source flag follow the original handler.

Publish the frontend through the existing GitHub Pages process, refresh Management, and open Advertising. A backend failure leaves reports unavailable instead of presenting invented zeros.

## Import behavior

- Choose **Yesterday** in BigSeller for daily reporting across selected stores. Longer exports remain complete period totals; daily values are never inferred from them.
- Review the preview before Confirm import. Raw files are uploaded privately and checked again on the server. Limits: 40 files, 4 MiB each, 16 MiB per batch, five new import jobs per minute per importer.
- Identical store/period records are ignored. Revised values for the same store and period replace the previous values. Conflicting values in one batch and two overlapping multi-day totals for the same store/platform are rejected without publishing any changes. Daily rows may coexist with a containing period total. The full-period view uses the period total until all dates for that store are present, then daily rows take priority. A date or subrange uses only available daily rows and fully contained period totals. Daily detail remains visible during incomplete coverage without inflating headline totals.
- Today, Yesterday, Last 7 days, Last 30 days and Custom use Bangkok dates. Last 7 days includes today. Upload daily Shopee files individually or in any order in a batch. A monthly TikTok file with daily rows supports the same filters.
- Date filters include only complete periods within the chosen dates. Partially covered periods are explicitly excluded. Missing store/day reports stay missing.
- ROAS is total attributed sales divided by total spend, recalculated from store rows after excluding BigSeller's Summary row. Cost per conversion follows the same weighted calculation. Zero denominators show Unavailable.
- TikTok gross revenue includes paid and organic orders attributed to GMV Max; its ROI is gross revenue divided by cost. SKU orders are not Shopee conversions. Combined views show the two counts separately. Direct sales, clicks, views and sold units are unavailable when absent from the TikTok export. Its trailing total row is excluded. Original exported ROI and cost-per-order are not trusted as aggregation inputs. See [TikTok reporting definitions](https://ads.tiktok.com/resources/help/article/how-to-see-reporting-for-your-product-gmv-max-campaign).
- Attributed sales and direct sales follow Shopee's advertising reporting; they are not Nakama order GMV, settlements or profit. These sources are not combined into a profit estimate.
- If processing times out, use Retry pending import. Completion is idempotent, and changed concurrent imports cannot silently overwrite one another. The pending identifier is scoped to the signed-in user; no report data is saved in browser storage.

## Verification

```sh
npm test
npm test --prefix backend
npm run test:emulators --prefix backend
```

The emulator check requires Java 21 or newer. Unit and screen tests cover weighted calculations, Shopee Summary and TikTok total exclusion, 30 daily uploads, per-store period fallback, platform isolation, date presets, invalid inputs, duplicates, revisions, overlap rejection, private access, publication races, sign-out, independent filters, daily reporting and restricted browser storage. Never commit real advertising exports or credentials.
