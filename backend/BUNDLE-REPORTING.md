# What to bundle

The Management sidebar and mobile menu open `management.html#bundles`. The same authenticated view is available at `bundles.html`.

The existing `nkmCustomerInsights` callable supports `op: bundles` and `op: bundle-ai`. No customer identifiers or order IDs are returned or sent to AI. All private reads, including cached responses, require an enabled member before and after processing.

## Evidence

Orders are filtered by inclusive dates, store, marketplace and sales basis. Completed orders are the default. Platform Processing and excluded orders never participate. Repeated SKU lines count once per basket; nonpositive quantities and missing SKUs are excluded. Support uses all eligible baskets, confidence uses orders containing each SKU, and lift compares the observed pair with independent purchasing. These metrics describe orders, not unique people or guaranteed uplift.

Pair analysis covers the 200 most-ordered SKUs and returns the 300 highest-count pairs. Coverage and truncation are visible. Category suggestions use wipers and car care sold in the same store. Compatibility is unverified. Pricing assumes one unit of each SKU using quantity-weighted observed average unit prices; margin, stock and fees are unknown.

## Activate reporting

Deploy the reporting service before publishing the frontend. This release needs no new database rules, authentication services or public access changes.

From `backend/`, with the Firebase CLI available:

```sh
firebase login --reauth
firebase deploy --project nakama-sales --only functions:nakama:nkmCustomerInsights
```

The dedicated-project predeploy guard must pass. An old backend produces an explicit activation message rather than a fabricated report. Firebase credentials were refreshed and the targeted `nakama:nkmCustomerInsights` deployment completed successfully on 7 October 2026. AI remains disabled until its Secret Manager key and enablement flag are configured.

## Optional AI connection

AI generation is off by default. Purchase-pattern and category ideas work without AI. Configure a paid OpenAI API connection using Firebase Secret Manager, never in a browser file or a committed environment file:

```sh
firebase functions:secrets:set NKM_BUNDLE_OPENAI_API_KEY --project nakama-sales
```

Enter the key only into the CLI's secret prompt. Add the nonsecret flag `NKM_BUNDLE_AI_ENABLED=true` to the ignored local `functions/.env.nakama-sales`, then deploy the same reporting function again. A different Responses-compatible model can be selected with the nonsecret variable `NKM_BUNDLE_OPENAI_MODEL`. The default is `gpt-4o-mini`. Do not put the API key into that environment file.

Only enabled administrators and importers can generate paid ideas. A server transaction limits the workspace to one attempt per minute and ten attempts per hour. Generated ideas use the top 60 catalog SKUs and aggregate pair counts; responses are schema-constrained and validated against existing SKUs and shared-store availability. AI ideas are hypotheses, clearly labeled separately from observed evidence. API failures preserve the purchase-pattern report. Key/model configuration and a real paid generation still require live verification.

Implementation follows the [Responses structured-output guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [GPT-4o mini model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini).

## Validation

`npm test` from `backend/` includes bundle calculation, privacy, authentication, AI transport/schema, UI, navigation and existing regression tests. No live customer data is embedded in tests or the frontend. A live visual browser review could not run because the app's browser access was unavailable.
