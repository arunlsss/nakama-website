# Platform Processing update

Platform Processing orders are excluded from GMV, orders, units and product totals, whether their price is missing or numeric. Preview shows excluded orders and rows. Other order statuses keep their current behavior.

## Install in your existing repository

1. Extract the update ZIP. Copy its `nakama-website` contents into your existing `~/Downloads/nakama-website` folder. Merge matching folders and replace matching files. Do not delete or replace your whole repository folder. This patch contains no Firebase configuration, domain configuration or credentials.
2. In GitHub Desktop, review the changes, commit, and push to publish the frontend. Wait for the GitHub Pages deployment to finish.
3. Deploy the backend in Terminal:

```sh
cd ~/Downloads/nakama-website/backend
npm run deploy -- --project nakama-sales
```

Dependencies have not changed. No npm install or emulator tests are needed for this update.

4. Hard-refresh the Management page (Command + Shift + R), then upload all parts of your BigSeller export together. Reimporting updates cloud summaries with this exclusion rule.

## Verification

The supplied 20,000-row part now has 64 excluded orders, zero invalid rows, 19,318 included orders, 21,262 units and THB 1,478,379.94 GMV. The frontend and backend match. All engine, cloud-core, frontend DOM and deployment-guard checks passed. Other parts were not supplied for this check.

Excluded orders keep only an identity/status marker privately for export chronology. They have no sales lines or contribution to totals. Original uploads stay archived unchanged. Older exports cannot restore a newer excluded order; a newer included status can.
