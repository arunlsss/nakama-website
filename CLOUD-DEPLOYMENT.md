# Nakama cloud deployment

The website now includes a Firebase backend and cloud-connected Management dashboard. It has no runtime dependency on Google Sheets, Apps Script or Google Drive. This package has not been deployed to a live Firebase project.

## Your configured project: nakama-sales

Your public Firebase web configuration is included in `nakama-web-config.json`. The website's `assets/cloud-config.js` and deployment guard's `backend/nakama-project.json` are already configured for this project. These files contain public identifiers, not administrator credentials.

After enabling Email/Password, creating your Authentication user, and creating the default Firestore database and Storage bucket, open a terminal in the extracted website folder and run:

```sh
cd backend
npm ci
npm ci --prefix functions
npx firebase login
npm run deploy -- --project nakama-sales
```

Then install the Google Cloud CLI if needed, authenticate the local administrator terminal and grant your existing Authentication user access:

```sh
gcloud auth application-default login
npm run grant-role -- --project nakama-sales --email YOUR_LOGIN_EMAIL --role admin
```

Replace `YOUR_LOGIN_EMAIL` with the email you created in Firebase Authentication. Sign out and sign in again after the grant. Publish the configured frontend from your own GitHub repository after backend deployment.

You can skip the generic configuration command below. If you need to regenerate the configuration later, use `npm run configure -- --project nakama-sales --config ../nakama-web-config.json` from the backend folder. All remaining generic `YOUR_PROJECT_ID` placeholders refer to `nakama-sales`.

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

The Functions runtime uses the default Compute Engine service account, typically `PROJECT_NUMBER-compute@developer.gserviceaccount.com`. If your project does not automatically grant sufficient runtime permissions, grant **Cloud Datastore User**, **Storage Object Admin** on the dedicated bucket, and **Firebase Authentication Viewer** to this runtime identity. The initial deployer should be a project owner or have the normal Firebase/Cloud Run deployment permissions. Do not grant these runtime roles to website users.

Callable endpoints allow browser SDK invocation, while every handler checks verified Firebase authentication and enabled membership. Keep the callable invocation setting; IAM-only invocation would reject ordinary Firebase browser sign-in tokens.

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

## Limits and tests

Batch limits: 1–40 unique files, 32 MiB per file, 128 MiB total, 600,000 rows. Workspace limits: one million orders and 256 MiB of uncompressed canonical JSON. These are application limits, not a capacity benchmark. Large workbooks can exceed memory/time before reaching them. Processing runs one import at a time with a recovery lease; old reports remain published on failure.

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
