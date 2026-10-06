# Nakama cloud deployment

The website includes a Firebase backend and cloud-connected Management dashboard. It has no runtime dependency on Google Sheets, Apps Script or Google Drive. GitHub Pages publishes the frontend; backend changes require a separate Firebase deployment.

## Your configured project: nakama-sales

Your public Firebase web configuration is included in `nakama-web-config.json`. The website's `assets/cloud-config.js` and deployment guard's `backend/nakama-project.json` are already configured for this project. These files contain public identifiers, not administrator credentials.

After enabling Email/Password, creating your Authentication user, and creating the default Firestore database and Storage bucket, install the Google Cloud CLI if needed, open a terminal in the extracted website folder and run:

```sh
cd backend
npm ci
npm ci --prefix functions
npx firebase login
gcloud auth login
npm run deploy -- --project nakama-sales
```

Then install the Google Cloud CLI if needed, authenticate the local administrator terminal and grant your existing Authentication user access:

```sh
gcloud auth application-default login
npm run grant-role -- --project nakama-sales --email YOUR_LOGIN_EMAIL --role admin
```

Replace `YOUR_LOGIN_EMAIL` with the email you created in Firebase Authentication. Sign out and sign in again after the grant. Publish the configured frontend from your own GitHub repository after backend deployment.

You can skip the generic configuration command below. If you need to regenerate the configuration later, use `npm run configure -- --project nakama-sales --config ../nakama-web-config.json` from the backend folder. All remaining generic `YOUR_PROJECT_ID` placeholders refer to `nakama-sales`.

## User ID login and registration update

Pull the latest GitHub changes, open a terminal in the repository's `backend` folder, and run:

```sh
npm run deploy -- --project nakama-sales
```

The deploy script configures browser transport for the six account services after Firebase finishes. It uses Cloud Run's `--no-invoker-iam-check` setting, which Google documents for projects with domain-restricted sharing. It does not modify organization policies or grant `allUsers` an IAM role. Firebase's callable handler continues to validate tokens; the account endpoints continue to require sign-in and enabled admin roles where applicable. Registration stays pending with no workspace access until verification and approval.

If the initial creation of these six functions reports **Failed to set invoker**, or an `allUsers` binding reports **FAILED_PRECONDITION: users do not belong to a permitted customer**, the function code may already be deployed. From the `backend` folder run:

```sh
npm run browser-access -- --project nakama-sales
npm run deploy -- --project nakama-sales
```

The recovery command discovers the actual Cloud Run service for each of `nkmAccountProfile`, `nkmAccounts`, `nkmLinkUserId`, `nkmRegister`, `nkmReviewAccount` and `nkmUserLogin`, and applies the supported transport setting only to those services. It stops on the first failure. The Firebase CLI does not reapply public IAM bindings when updating these already-created callable functions; the deploy script reapplies the service setting after each successful update.

This service change requires **Cloud Run Admin** permission on the relevant services. If your organization enforces `run.managed.requireInvokerIam` or another rule requiring the IAM invoker check, the update will be rejected. Contact the organization administrator to approve a supported access design; the script does not change or override that policy. Reference: [Google Cloud public-access guidance](https://docs.cloud.google.com/run/docs/authenticating/public#invoker_check).

The account endpoints create Firebase users and assign claims after approval. Their runtime service account needs **Firebase Authentication Admin**, replacing the read-only Authentication Viewer permission if that was used earlier. After deployment, grant that permission to the actual deployed runtime identity once:

```sh
NKM_AUTH_RUNTIME=$(gcloud functions describe nkmRegister --gen2 --region asia-southeast1 --project nakama-sales --format='value(serviceConfig.serviceAccountEmail)')
test -n "$NKM_AUTH_RUNTIME" && gcloud projects add-iam-policy-binding nakama-sales --member="serviceAccount:$NKM_AUTH_RUNTIME" --role="roles/firebaseauth.admin"
```

Run `gcloud auth login` first if the Google Cloud CLI is not signed in. Grant the role only to the runtime service account, never to website users. Existing Firestore and bucket runtime permissions remain necessary.

In Firebase Console → Authentication → Settings → Authorized domains, include `nakamaauto.com` and `www.nakamaauto.com` if both serve the site. Email/Password sign-in must remain enabled. Verification and reset emails use Firebase's Authentication templates and can be branded there.

Registration is available on Management, Stock Forecast and Customer Insight. It accepts a User ID, password and valid email from any provider. User IDs have 3–32 ASCII letters/numbers/periods/underscores/hyphens and are case-insensitive. Passwords have 8–128 characters and are never trimmed or stored in Firestore. The private User ID lookup checks the password with Firebase before revealing the account email, then the browser signs into the original Firebase account. `functions/auth-config.json` contains the same public web API key as the frontend; `npm run configure` regenerates both configurations. That web API key must permit the Identity Toolkit API from the backend as well as the website; browser-referrer-only restrictions would block User ID sign-in.

New accounts follow **Register → Verify email → Pending admin review → Active**. Registration creates no membership or role. An existing admin signs in and uses **Account requests** to approve verified accounts as Viewer, Importer or Admin, reject requests, or disable access. Role choices are never shown during registration. Approvals only take effect after the enabled membership and Firebase role claim agree. Pending users tap **Try again** after verification or approval to refresh their token. Existing accounts keep their current membership and may sign in with email, open **My account**, and choose a unique User ID for future logins with the same password.

Verify with a fresh non-company email: confirm it cannot load shared data while pending, verify its inbox link, approve it as Viewer, and check User ID login on another device. A Viewer must not be able to upload orders, save stock or approve accounts. Also test incorrect credentials, a duplicate User ID, password recovery, and disabling the test account. Run `npm run test:accounts` for account-specific tests.

## 1. Create a dedicated Firebase project

In [Firebase Console](https://console.firebase.google.com/), create a **new Nakama sales project**, separate from attendance or another existing production app. Enable the Blaze billing plan, required for Functions and Storage.

Enable:

- **Authentication → Email/Password.** Create your administrator user in the console. The website has no public sign-up form.
- **Firestore → default database, Standard edition / Native mode**, initially in production mode. Select `asia-southeast1` (Singapore).
- **Storage → default bucket**, preferably Singapore. Copy its exact name, usually `PROJECT_ID.firebasestorage.app` for new buckets.
- Register a **Web app**. Copy its Firebase web configuration. Add your own domain and GitHub Pages hostname to Authentication → Authorized domains. For local previews add `localhost` if needed.

Save the public web configuration in a local JSON file:

```json
{
  "apiKey": "YOUR_WEB_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
  "appId": "YOUR_WEB_APP_ID",
  "messagingSenderId": "YOUR_SENDER_ID"
}
```

These are public web app identifiers. Do not put service-account keys, passwords or private credentials in the website or repository.

## 2. Install and configure

Install **Node.js 22.12 or newer in the Node 22 LTS line**. Open a terminal in the extracted `nakama-website` folder:

```sh
cd backend
npm ci
npm ci --prefix functions
npm run configure -- --project YOUR_PROJECT_ID --config /absolute/path/nakama-web-config.json
npm test
```

Use your actual JSON path, quoted if it contains spaces. The command writes `assets/cloud-config.js` and `backend/nakama-project.json`. Commit both with your website. The browser SDK is already bundled; `npm run build:sdk` rebuilds it after dependency changes.

## 3. Deploy backend

From `backend`:

```sh
npx firebase login
npm run deploy -- --project YOUR_PROJECT_ID
```

The script checks that the project matches your Nakama configuration. Every deployment target's predeploy check also verifies the Firebase CLI's actual project ID. Project IDs containing `attendance` are rejected. Functions, Firestore rules/indexes and Storage rules deploy together.

Complete Firebase CLI setup prompts for the dedicated project. Storage rules read membership/import documents from Firestore; Firebase may ask to grant its Storage service identity this cross-service permission. If prompted for Artifact Registry cleanup, choose a retention period such as 7 days.

The Functions runtime uses the default Compute Engine service account, typically `PROJECT_NUMBER-compute@developer.gserviceaccount.com`. If your project does not automatically grant sufficient runtime permissions, grant **Cloud Datastore User**, **Storage Object Admin** on the dedicated bucket, and **Firebase Authentication Admin** to this runtime identity for the registration and account-approval features. The initial deployer should be a project owner or have the normal Firebase/Cloud Run deployment permissions. Do not grant these runtime roles to website users.

Callable endpoints allow browser SDK invocation. Every report and stock handler checks verified Firebase authentication and enabled membership. Registration and credential verification are public but rate-limited; account profiles require sign-in, and role changes require an enabled admin. Keep the callable invocation setting; IAM-only invocation would reject ordinary Firebase browser sign-in tokens.

## 4. Grant administrator/member access

An Authentication account alone cannot open Management. The role script sets both a private membership document and the `nakamaRole` custom claim.

Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install). Authenticate your local terminal as the Nakama project owner/admin:

```sh
gcloud auth application-default login
npm run grant-role -- --project YOUR_PROJECT_ID --email you@example.com --role admin
```

Firebase CLI login and application-default credentials are separate. The second login is for the local Admin SDK role script. Keep its local credential files private; never send them in chat or commit them.

| Role | Read shared reports | Upload orders |
| --- | --- | --- |
| viewer | Yes | No |
| importer | Yes | Yes |
| admin | Yes | Yes |
| none | Access revoked | No |

Create additional users in Authentication and run the role command with their emails. Users must sign out and back in after role changes. `--role none` disables membership and revokes refresh tokens. Stale claims do not bypass the membership check. User administration remains in your terminal/console.

## 5. Publish the frontend in your own repository

Create a new GitHub repository in your account. Use GitHub Desktop to add the extracted website folder, commit and push. This copy is independent of the original owner's repository.

For GitHub Pages, open **Settings → Pages**, choose deployment from your branch's root folder and save. `.nojekyll` is included. Keep `CNAME.original` out of Git; add a new `CNAME` only for a domain you own/configure. You will initially have your own GitHub Pages URL. This does not modify `www.nakamaauto.com`.

For later updates, **Pull origin** brings repository updates to your computer. Commit/push your intentional local changes to publish the frontend. GitHub Desktop does not deploy Firebase Functions; after backend changes rerun the backend deploy command.

Open Management, sign in, select every split part of a raw BigSeller export together, review and confirm. Reports become available across authorized devices. Tap Refresh after another device imports.

If the connection drops after upload, open Imports and use **Check pending import** before starting another batch. Completed imports are idempotent. If upload bytes were interrupted before completion, sign out and back in, then upload every original part again. Abandoned jobs do not publish reports.

## 6. Verify the live deployment

1. Anonymous browsers see sign-in and cannot access report/source records.
2. Authentication users without enabled memberships cannot access Management.
3. An importer uploads raw XLSX/CSV orders. Daily GMV, units and orders appear for the selected month.
4. A viewer on another device sees the same totals after Refresh and cannot upload or read source files.
5. A duplicate export does not inflate totals. A malformed quantity blocks publication and leaves the previous report intact.
6. Revoke a test member with `--role none`: new requests fail, and an open dashboard clears its records when its authorized workspace listener loses permission.

## Storage and data flow

| Location | Data | Browser access |
| --- | --- | --- |
| Cloud Storage `uploads/…` | Original XLSX/CSV uploads | Owner/importer can create a declared file; no rule-authorized read, list, replace or delete |
| Cloud Storage `private/revisions/…` | Compressed canonical orders for deduplication | Backend only |
| Firestore `members/…` | Role and enabled flag | Backend/admin only |
| Firestore `imports/…` | Manifest and processing status | Callable status access for owner/admin |
| Firestore `reports/…` | Immutable monthly summary chunks | Report pages through authenticated callable functions |
| Firestore `workspace/main` | Active revision and available months | Enabled members can read |

The backend removes Firebase download tokens from originals during processing and does not issue public download links. Do not manually create bearer links or alter bucket IAM to make these objects public.

The frontend holds summaries in memory. It does not read or write raw orders to IndexedDB. Sign-out clears rendered reports and session state. Only a pending import ID and Firebase session sign-in state are kept in browser session storage. Report downloads are explicit exports of selected monthly summaries, not raw cloud backups.

Source files and revisions are retained. No automatic deletion/lifecycle policy is included. Failed staging objects can remain, but cannot become active reports. Configure retention after deciding your business retention period; do not delete the active canonical snapshot. Set a Google Cloud budget alert to monitor usage. Alerts are not spending caps.

## Updating canonical history storage

If an import reports `Canonical data exceeds 256 MiB`, update the local repository through GitHub Desktop or `git pull origin main`, then deploy all three snapshot consumers from `backend` before importing again:

```sh
npx firebase deploy --only functions:nakama:nkmProcessImport,functions:nakama:nkmCustomerInsights,functions:nakama:nkmStockDemand --project nakama-sales
```

A failed import did not replace the active report. After deployment, refresh Management and upload every part of the original export together as a new import. If a pending job is still shown, use Imports → Check pending import to clear its failed status before uploading. Do not delete previous reports or raw exports to work around this limit. No separate manual data migration is needed.

## Limits and tests

Batch limits: 1–40 unique files, 32 MiB per file, 128 MiB total, 600,000 rows. Workspace limits: one million orders and 1 GiB of uncompressed canonical JSON. New revisions store canonical history in gzip parts of at most 16 MiB of uncompressed JSON each, with a small manifest saved last. Every part is checked for integrity and record counts on read. Existing single-file snapshots remain readable up to their original 256 MiB limit; a successful import writes a new revision using the parts format without deleting older revisions. These are application limits, not a capacity benchmark. Large workbooks can exceed memory/time before reaching them. Processing runs one import at a time with a recovery lease; old reports remain published on failure.

Firestore summary chunks stay below 160 KiB. Report responses use at most 112 KiB for row payload plus a small response envelope and 500 rows. The browser loads one month. It currently loads all SKU summary pages for that month, so very large months still need multiple megabytes. Future server-side SKU filtering can reduce this further.

```sh
# From website root, without installed backend SDKs:
npm test
# From backend, after npm ci:
npm test
# Java 21+ for the bundled Firebase CLI:
npm run test:emulators
```

The emulator command uses `demo-nakama`, stops after three minutes by default, and does not access a real project. Set `NKM_EMULATOR_TIMEOUT_MS` locally only if intentional first-run emulator downloads need more time. Read `VALIDATION.md` for actual checks completed on this package. Emulator tests cannot prove production IAM or replace the live checks above.

Official references: [callable functions](https://firebase.google.com/docs/functions/callable), [Firebase CLI](https://firebase.google.com/docs/cli), [Storage setup](https://firebase.google.com/docs/storage/web/start), [Storage rule conditions](https://firebase.google.com/docs/storage/security/rules-conditions), [Admin SDK setup](https://firebase.google.com/docs/admin/setup).


## Separate section dates and exact-date Product Insight

Executive Summary, Overview, Store Performance, Product Insight, Order Health and Data Coverage each remember their own selected dates while the workspace stays open. Customer Insight keeps its own date picker. Navigating to Customer Insight, inventory or purchase orders hides the sales date picker. Monthly GMV continues to cover all imported months independently of section dates.

Product Insight supports single days, partial months and ranges spanning months. The chart, summary, product table and CSV export use the same selected dates and business filters. Partial-month totals are calculated from the existing private order snapshot; only aggregate product totals reach the browser. No reimport is required for existing raw order imports.

After pulling this update in GitHub Desktop, run from `backend`:

```bash
npm run deploy -- --project nakama-sales
```

This extends the existing `nkmCustomerInsights` function with the product calculation. It does not create another function. Before the backend update is deployed, partial-date Product Insight shows an unavailable notice instead of presenting full-month totals as filtered results.


## Multiple store selections

Management and Customer Insight use a searchable store picker with checkboxes, Select all, Clear, Cancel and Apply stores. Selections are drafts until Apply, which refreshes the section once. Customer Insight also keeps the Nakama stores shortcut. Selecting specific stores filters sales totals, comparisons, order health, products and exports. Stores missing from a selected reporting period stay selected and produce zero matching sales rather than switching to all stores. Monthly GMV remains independent of the selection.

After pulling this update, deploy from `backend` to enable multiple-store Customer Insight requests:

```bash
npm run deploy -- --project nakama-sales
```

Existing single-store and brand/group requests remain supported. No order reimport is required.
