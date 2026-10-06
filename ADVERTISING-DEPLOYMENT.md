# Shopee advertising imports

Management → Advertising accepts the BigSeller **Marketing → Ads Overview → Shopee → Store Data Details** export in THB, as XLSX or CSV. Dates and store selections belong to Advertising and do not change sales or product filters. Admins and importers can upload; enabled viewers can read shared reports.

## Deploy before publishing the frontend

The new `nkmAds` callable and the advertising upload Storage rules require a Firebase deployment. From `backend`:

```sh
npm ci
npm ci --prefix functions
npx firebase deploy --only functions:nakama:nkmAds,storage --project nakama-sales
```

Keep the existing private Firestore rules. Advertising documents and snapshots are accessed only through the authenticated service. The Storage addition permits an importer to create only their own manifest-matched upload, with a 24-hour expiry. Browser reads, listing, overwrites, and deletions remain denied. Original files are server-validated, and publication checks both membership and the current workspace revision in a transaction.

If this domain-restricted project creates the service but reports **Failed to set invoker**, use the same supported browser transport configuration documented for the existing Nakama services. Find the actual service first:

```sh
gcloud functions describe nkmAds --gen2 --region asia-southeast1 --project nakama-sales --format='value(serviceConfig.service)'
```

For that service only, configure browser invocation in Cloud Run according to [Google's public-access guidance](https://docs.cloud.google.com/run/docs/authenticating/public#invoker_check), then retry the scoped deployment. Firebase token verification, enabled membership and importer/admin checks remain mandatory inside `nkmAds`. Do not change organization policy, workspace membership or unrelated services. The existing account browser-access script targets account services only.

Publish the frontend through the existing GitHub Pages process, refresh Management, and open Advertising. A backend failure leaves reports unavailable instead of presenting invented zeros.

## Import behavior

- Choose **Yesterday** in BigSeller for daily reporting across selected stores. Longer exports remain complete period totals; daily values are never inferred from them.
- Review the preview before Confirm import. Raw files are uploaded privately and checked again on the server. Limits: 40 files, 4 MiB each, 16 MiB per batch, five new import jobs per minute per importer.
- Identical store/period records are ignored. Revised values for the same store and period replace the previous values. Conflicting values in one batch and overlapping periods for one store are rejected without publishing any changes. Use consistent one-day exports for a daily history; weekly totals cannot overlap those daily records.
- Date filters include only complete periods within the chosen dates. Partially covered periods are explicitly excluded. Missing store/day reports stay missing.
- ROAS is total attributed sales divided by total spend, recalculated from store rows after excluding BigSeller's Summary row. Cost per conversion follows the same weighted calculation. Zero denominators show Unavailable.
- Attributed sales and direct sales follow Shopee's advertising reporting; they are not Nakama order GMV, settlements or profit. These sources are not combined into a profit estimate.
- If processing times out, use Retry pending import. Completion is idempotent, and changed concurrent imports cannot silently overwrite one another. The pending identifier is scoped to the signed-in user; no report data is saved in browser storage.

## Verification

```sh
npm test
npm test --prefix backend
npm run test:emulators --prefix backend
```

The emulator check requires Java 21 or newer. Unit and screen tests cover weighted calculations, Summary exclusion, invalid inputs, duplicates, revisions, overlap rejection, private access, publication races, sign-out, independent filters, daily reporting and restricted browser storage. Never commit real advertising exports or credentials.
