# Customer Insight

The new `customer-insight.html` page uses the existing Nakama Firebase sign-in and workspace. Management links to it in the sidebar and header, including on mobile. The new page supports light, dark and automatic appearance, date/store/marketplace filters and aggregate CSV export.

## What the page measures

- Main observed buying persona, leading delivery province, marketplace and purchased car fitment.
- Mutually exclusive buying personas: wiper replacement, car care, wipers + car care, bulk signal, other/mixed. Counts use identified buyer identities within the selected period.
- Delivery-province rankings, with Bangkok aliases normalized.
- Car-model and vehicle-type demand from unambiguous variation tokens. Wiper dimensions and broad listing titles never establish a model.
- Core demand (at least 10% of known fitment units), Supporting demand (1% to below 10%), Niche demand (below 1%). These are shares of selected imported Nakama sales, not Thai-market classifications.
- Observed purchase frequency, period repeat rate, bulk-purchase signals and source coverage.
- Age, gender, income, occupation and verified car ownership remain unavailable because the supplied export does not contain those fields.

The default scope is completed orders in Nakama brand stores (`NKM_SHP`, `NKM_LZD`, `NKM_TT`). The page can also review other group stores. One observed order does not mean a newly acquired customer. Repeat rate is limited to the selected period and usable buyer identities.

## Header compatibility

The attached `Order-SKU-all20261001101409972.xlsx` has 100 headers and 1,955 item rows. The existing sales importer already locates required fields by header name. In this export Quantity is column AG (33), Price is AH (34), Merchant SKU is AK (37), and Order Time is BU (73). It must never use the older fixed G/H positions.

The prepared update retains optional Username (Buyer), Customer Code, Province (State), Country and Variation Name fields in private canonical records. The exact 100-column header reference is in `assets/data/customer-export-headers.json` and is displayed under Data coverage on the new page. This reference contains headers only, with no customer data.

Missing optional headers do not block legacy sales imports. Older records remain valid sales records; customer coverage is withheld until the richer export is reimported. Reimport uses the existing complete-order replacement rules, so it enriches matching orders without duplicating sales.

## Enable when ready

The source update does not upload the attached file or deploy Firebase. These steps are required to populate the page:

1. Publish this repository update through your existing GitHub Pages process.
2. In the existing Nakama repository, deploy the two affected functions using your configured `nakama-sales` Firebase account:

   ```bash
   cd backend
   npm --prefix functions ci
   npx firebase deploy --only functions:nkmProcessImport,functions:nkmCustomerInsights --project nakama-sales
   ```

   Keep the existing Firebase configuration and project settings. No rule changes, DNS changes or new sign-in provider are required.

3. Open Management, upload the richer raw export (all numbered parts together when split), review it and confirm the import. Then open Customer Insight.

The new function reads the published private canonical snapshot and calculates only aggregate results for the selected cohort. A large workspace may take longer to calculate. The frontend shows loading and error states. It will explicitly explain when the new backend endpoint has not been deployed.

## Customer identity handling

The backend creates a random 32-byte secret at `private/internal/customer-identity-key` on its first updated import. Existing Storage rules deny client access to the `private` path. Preserve this key across imports. Deleting or rotating it would break identity matching between older and newer records.

The buyer key is HMAC-SHA256 over marketplace, store, identifier type and a usable buyer username, with Customer Code as fallback. Missing, masked, unsafe numeric and placeholder identities are omitted. Raw usernames are not persisted in the canonical order snapshot. Names, telephone numbers and full shipping addresses are not retained for this feature. Uploaded source files still follow the existing private import-storage behavior.

Only aggregates leave `nkmCustomerInsights`; buyer keys stay in the private snapshot. Membership and account status are checked before reading the snapshot and again before returning it. Buyer counts are scoped identities, not verified unique people across stores/platforms. Sign-out and access revocation clear the UI and invalidate responses still loading.

## Verification

The supplied file parses all 1,955 rows and 100 headers. Daily and monthly SKU sales aggregates match the previous importer exactly; 11 Platform Processing rows remain excluded.

For this file’s completed Nakama-brand orders, the sample has 1,560 orders dated 8 September 2026, 20.8% usable buyer-identity coverage and 96.8% recognized delivery-province coverage. These figures are a limited snapshot, not a statement about all Nakama customers. The attached data and these sample aggregates are not embedded in the website.

Focused tests cover reordered headers, secret-key identity handling, masked identities, legacy enrichment, platform/store scope, multi-line order deduplication, ambiguous models, sales-basis exclusions, unauthenticated/revoked access, response privacy and clearing late UI responses. Existing importer, backend, sign-in and Management UI regression tests also pass.

Browser checks use aggregate results from the attachment with a mocked signed-in connection, not live Firebase. Desktop, 390px and 320px mobile layouts have no page overflow or browser errors; sign-out clears results. Actual Firebase deployment and a live import require the configured account above.

Run the focused checks locally:

```bash
node backend/tests/customer.test.cjs
node tests/customer-ui.test.cjs
```

The UI test uses the existing backend `jsdom` development dependency, so run `npm ci` in `backend` if it is not installed.
