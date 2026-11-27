# Quiz Master Rwanda — Pi Integration and Source Audit

Release: 4.5.0  
Audit date: 27 November 2026  
Source: user-provided `Quiz_Master_Rwanda_Audited_Updated(4).zip`

## Original archive findings

- 623 quiz questions (297 Road Safety; 326 General Knowledge).
- 22 bilingual Learning Centre articles.
- Existing public pages, PWA manifest, service worker, sitemap and ads.txt.
- The original archive did not contain Pi SDK initialization, Pi authentication code, a Pi identity-verification endpoint, or an `api/` folder.
- The existing app did not contain a Pi payment flow.

## Changes in this release

1. Added the official Pi SDK script to `index.html`.
2. Added optional Pi sign-in requesting only the `username` scope.
3. Added `pi-auth.js` to initialize the Pi SDK and send the short-lived access token to the same-origin verification endpoint.
4. Added `api/pi/verify.js`, which verifies the token against Pi's official `GET /v2/me` endpoint and returns the verified UID and username.
5. Avoided storing the Pi access token in browser storage, cookies or an app database.
6. Kept the existing quiz usable without Pi sign-in.
7. Updated Privacy Policy, Terms of Service and About page to describe the implemented Pi feature accurately.
8. Bumped service-worker cache version to 4.5.0 and precached `pi-auth.js`.
9. Updated README, sitemap date and added `PI_INTEGRATION.md`.

## Intentionally not added

- Pi payments, paid quiz access, wallet connection, Pi rewards or token transfers. The supplied app has no paid product or service. A fake or incomplete payment flow would be unsafe and could misrepresent the app.
- A Pi Server API key in source code. The user-scoped `/v2/me` authentication check uses the Pioneer access token. Any future payment API key must be kept in Vercel environment variables and never committed to Git.
- PiOS compatibility claims or a PiOS license declaration. Those require the developer to review the PiOS terms and deliberately choose the correct licensing/repository arrangement.

## Automated source checks

- `questions.json`: valid JSON.
- `articles.json`: valid JSON.
- `manifest.webmanifest`: valid JSON.
- `sitemap.xml`: valid XML.
- JavaScript syntax: checked for `questions.js`, `pi-auth.js`, `service-worker.js`, and `api/pi/verify.js`.
- Local service-worker precache paths: checked against the archive.
- Existing AdSense publisher ID, ads.txt record, GTM container and quiz/lesson data preserved.

## Required live tests

1. Deploy from the repository root to Vercel.
2. Open the live URL in Pi Browser.
3. Test the Sign in with Pi button and confirm server verification succeeds.
4. Test the quiz in English and Kinyarwanda, both categories, learning articles, progress and offline behavior.
5. Confirm `/api/pi/verify` is deployed as a Vercel Function.
6. Check the Pi Developer Portal app URL and Mainnet/Sandbox settings.
7. Complete Developer KYC and all account-level checklist items.
8. Review the exact meanings of the PiOS and exclusive-transaction/authentication declarations before checking them.

## Approval limitation

A source-code audit cannot see private Developer Portal review notes, complete KYC, verify the app URL inside Pi, approve a wallet, submit account-level declarations or guarantee Ecosystem Listing approval. Pi Core Team review remains independent of this ZIP.
