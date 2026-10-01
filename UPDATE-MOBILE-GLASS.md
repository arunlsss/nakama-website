# Mobile Management and sign-in update

Mobile navigation now uses a floating glass dock with six labeled icons, generous touch targets and safe-area spacing. Unsupported or reduced-transparency browsers use an opaque surface. Light and dark themes use stronger text contrast, readable supporting text and responsive chart labels. Theme changes are immediate to avoid faded text during a transition.

Sign-in now distinguishes rejected credentials, network errors, configuration problems and missing workspace roles. Firebase Auth prefers session storage and falls back to memory if storage is unavailable. Mobile email input disables capitalization/correction; the password can be revealed and is sent unchanged. Failed attempts keep input available for correction. A workspace retry does not bypass authentication or membership checks. With storage blocked, refreshing the page requires signing in again.

The previous form displayed the same email/password message for every sign-in error. This update fixes that misleading behavior and restricted-browser handling. The specific cause on the user's phone cannot be established without its Firebase error code. No production account credentials were used in validation.

Validation: 19 focused tests; desktop and 320/390px browser layouts; all management views; light/dark/Auto; text contrast checks; real Firebase browser SDK with blocked storage and intercepted credential/network failures. Browser checks use imported report data and simulated authentication. No emulator suite was run.

Frontend changes and bundled browser SDK only. No Cloud Functions redeployment or Firebase account changes are required.
