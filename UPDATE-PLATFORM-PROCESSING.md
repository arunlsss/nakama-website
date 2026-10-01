# Corrected warehouse-transfer exclusion update

This update replaces the previous patch. BigSeller can export warehouse transfer rows and actual sales under the same Order No, with different dates/statuses. Warehouse rows are ignored before checking sales conflicts. Actual sale items retain their own date/status and count once.

Exclusions:
- All Platform Processing rows, regardless of price.
- Shopee To Ship rows with Price exactly `--`, as confirmed by the user.

Priced To Ship rows remain sales and retain the To Ship status. Other missing/invalid prices still block imports with a specific field error. Genuine conflicts between sales rows remain blocked. Download copy suffixes such as `(1)(1)` are recognized as part (1), while selecting duplicate copies is still rejected.

## Update your existing website

1. Extract this ZIP. Copy matching files into your existing `~/Downloads/nakama-website` repository, merging folders and replacing matching files. Keep your repository folder, domain settings and Firebase configuration.
2. Commit and push through GitHub Desktop.
3. Deploy the backend:

```sh
cd ~/Downloads/nakama-website/backend
npm run deploy -- --project nakama-sales
```

Dependencies have not changed; no installation or emulator tests are needed.

4. Wait for GitHub Pages publishing, hard-refresh Management with Command + Shift + R, and upload every part of the desired export together. Select one export timestamp at a time for a simple preview.

## Verified results

| Export timestamp | Source rows | Processing rows ignored | Unpriced Shopee To Ship rows ignored | Included sales orders | Units | GMV (THB) | Invalid rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20261001043643116 | 74,049 | 171 | 0 | 71,244 | 81,187 | 5,530,577.72 | 0 |
| 20261001071340985 | 75,106 | 215 | 8 | 72,181 | 90,301 | 5,674,491.35 | 0 |

Both complete exports match independent eligible-row totals and agree between frontend/backend. Repeat uploads and reversed part selection preserve totals. Importing an older export after the newer merged workspace preserves newer versions. The original reported order `260805H1CJDF7T` retains its 5 August Completed sale for THB 59; its 2 August processing row contributes nothing.

Engine, nine cloud-core tests, three frontend DOM tests and one deployment-guard test passed. No emulator suite or live deployment was performed for this correction. Uploaded workbooks were not modified.

Private identity markers remain only for excluded-only orders to preserve export chronology. They contain no sales items. Original uploads remain archived unchanged.
