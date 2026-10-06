# Nakama website with cloud Management

Independent Nakama website source with a responsive Management dashboard and Firebase backend. The original site and Sheets are unchanged. Management has no runtime dependency on Sheets, Apps Script or Drive.

**Start with CLOUD-DEPLOYMENT.md.** It explains how to create your Firebase project, configure the website, enable access, deploy the backend and publish from your own GitHub repository. This package is configured for your `nakama-sales` project. The backend still needs deployment and user-role setup.

Features:

- Email/password login with administrator-assigned viewer/importer/admin access.
- Raw BigSeller XLSX/CSV uploads with browser preview and authoritative server calculations.
- Price × Quantity GMV, unique orders, complete-order replacement, duplicate export handling and Bangkok dates.
- Daily trends, store performance, product insights, marketplace/status filters and your requested store labels.
- Shopee advertising imports with independent date/store filters, weighted ROAS and daily reporting from one-day exports. See [ADVERTISING-DEPLOYMENT.md](ADVERTISING-DEPLOYMENT.md) for the required backend update.
- Private source storage, compact monthly report pages and atomic publication.
- Mobile glass bottom navigation and the attendance site's Euclid Circular A and DB Ozone fonts.
- Filtered CSV exports and selected-month summarized JSON reports.

Report workbooks and local JSON backups cannot be used as raw cloud imports. Upload original BigSeller orders and select all split parts of an export together.

## Local preview

```sh
npm run dev -- --port 4173
npm test
```

Open `http://localhost:4173/management.html`. Cloud configuration for `nakama-sales` is included; deploy the backend and grant access before signing in. Backend setup and tests are in CLOUD-DEPLOYMENT.md.

The archive includes images referenced by the website. It excludes unused source photography, raw customer exports, node_modules, credentials, original-domain CNAME and the legacy Apps Script backend.

### Partially canceled export orders

A single order can contain different completed and canceled SKUs. Raw imports preserve the status on each item. Completed or active sales and stock demand exclude canceled items. All order value includes both item values. The daily order total counts a partially canceled order once as completed; the canceled order count covers fully canceled orders. Product order counts describe orders containing each SKU. Conflicting dates, contradictory statuses for the same SKU, or other mixed lifecycle statuses still block import for review.

After updating the backend, deploy the three consumers before importing such orders:

```bash
cd backend
npx firebase deploy --only functions:nakama:nkmProcessImport,functions:nakama:nkmCustomerInsights,functions:nakama:nkmStockDemand --project nakama-sales
```
