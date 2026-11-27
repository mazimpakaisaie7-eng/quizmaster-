# Pi Network Integration — Quiz Master Rwanda

Release: 4.5.0

## Implemented in this repository

- Official Pi SDK loaded from `https://sdk.minepi.com/pi-sdk.js`.
- Pi SDK initialization with `version: "2.0"` and `sandbox: false` for the production deployment.
- Optional Pi authentication requesting the `username` scope only.
- Server-side token verification through `GET https://api.minepi.com/v2/me`.
- Vercel function: `POST /api/pi/verify`.
- Access tokens are not intentionally persisted in localStorage, sessionStorage, cookies or the app database.
- The app remains usable for basic quiz learning without a Pi account.
- No Pi payment flow is included because this release does not sell paid access, goods or services.

## Important deployment steps

1. Deploy the repository root to the existing Vercel project.
2. In Pi Developer Portal, ensure the registered app URL exactly matches the deployed HTTPS URL.
3. Open the deployed URL inside Pi Browser and test **Sign in with Pi**.
4. Confirm that the sign-in status changes to “Pi account successfully verified”.
5. If Pi authentication fails, inspect the Vercel Function logs for `/api/pi/verify` without copying or sharing any access tokens.
6. Confirm the Pi Developer Portal app is configured for the intended Mainnet environment. The source uses `sandbox: false`.
7. Ensure Developer KYC and all required Developer Portal checklist items are complete.
8. Submit the updated listing details only after the live Pi Browser test succeeds.

## Credentials and security

- The user access token is passed in an Authorization header to the server endpoint and then to Pi's `/v2/me` endpoint.
- The token must never be added to source code, README examples, screenshots, query strings, analytics events or logs.
- The current `/v2/me` identity check uses the Pioneer access token; it does not require a server API key.
- Do not add a Pi Server API Key to frontend files or commit it to GitHub.
- If payment functionality is added later, it requires a separate secure backend payment lifecycle: server-side approval and completion, secure API-key storage, incomplete-payment handling, and testing in the Pi Sandbox before Mainnet. Do not treat a frontend payment callback as proof of settlement.

## Listing declarations

- Pi SDK Exclusive Authentication: use this declaration only if the Developer Portal's definition matches the implemented login model and the app does not offer another account-login provider. The basic quiz currently remains available without an account.
- Pi Exclusive Transactions: the app currently has no paid transactions. Do not claim to process Pi-only transactions or enable paid functionality that does not exist.
- PiOS Compatible / repository: do not claim PiOS licensing or compatibility unless the developer has reviewed the PiOS terms and intentionally published/registered the source under the applicable license.
- PiOS Repository Link: provide the actual public repository URL only if it is accessible and the developer intends it to be the PiOS source.

## Official documentation

- Mainnet Listing Requirements: https://developers.minepi.com/docs/build-first-app/MainnetListing
- Authentication: https://developers.minepi.com/docs/authenticate-user/Authentication
- Platform API: https://developers.minepi.com/docs/api-reference/Platform
- Getting Started: https://developers.minepi.com/docs/build-first-app/GettingStarted
- Register Your App: https://developers.minepi.com/docs/build-first-app/RegisterApp
- Payments: https://developers.minepi.com/docs/accept-payment/Payments

## Limitations

This repository update cannot complete Developer KYC, verify the Pi Developer Portal app URL, approve a wallet, change a listing status, or submit an application on the developer's behalf. It also cannot guarantee Ecosystem Listing approval. These actions must be completed in the developer's Pi account.
