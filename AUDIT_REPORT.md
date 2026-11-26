# Quiz Master Rwanda — Technical and AdSense Readiness Audit

Audit basis: the supplied `quizmaster--main (2).zip` archive, release 4.4.0.
Audit date: 26 November 2026.

## Executive summary

The supplied project is structurally healthy: the JSON data parses, the quiz records are internally consistent, JavaScript syntax checks pass, and the service-worker precache paths resolve within the archive. The project includes public information pages, bilingual lessons, SEO metadata, and an AdSense loader.

This is a **source-code and archive audit**, not a live browser/device test or an AdSense account review. It cannot guarantee approval, actual ad delivery, analytics collection, or account eligibility.

## Verified inventory

- 623 quiz questions.
  - Road Safety: 297.
  - General Knowledge: 326.
- 22 bilingual Learning Centre articles.
- Languages: English and Kinyarwanda.
- Main public pages: homepage, Learning Centre, About, Contact, Privacy Policy, Terms.
- PWA assets: manifest, service worker, offline page, icons, audio and SVG artwork.

## Checks completed

| Area | Result | Notes |
|---|---|---|
| `questions.json` | Pass | Valid JSON; 623 records |
| Question IDs | Pass | No duplicate IDs found |
| Question fields | Pass | Required fields present in all records |
| English options/answers | Pass | Four options per question; answer matches an option |
| Kinyarwanda options/answers | Pass | Four options per question; answer matches an option |
| `articles.json` | Pass | Valid JSON; 22 articles; unique IDs |
| `manifest.webmanifest` | Pass | Valid JSON |
| `sitemap.xml` | Pass | Valid XML |
| `questions.js` | Pass | Node.js syntax check |
| `service-worker.js` | Pass | Node.js syntax check |
| Inline executable JavaScript | Pass | Node.js syntax checks on HTML inline scripts |
| JSON-LD | Pass | JSON blocks parse; duplicate Learning Centre CollectionPage block removed in this audited package |
| Service-worker precache | Pass | All 21 listed paths resolve to archive files |
| Local page references | Pass | Main local pages and assets exist in the archive |
| Duplicate HTML IDs | Pass | No duplicate IDs found on inspected pages |

These checks establish structural validity, not factual accuracy of every quiz answer, translation quality, accessibility certification, or licensing status of every media asset.

## AdSense findings

### What is present in the archive

- Publisher ID in the homepage AdSense loader: `ca-pub-2666698676518429`.
- `ads.txt` entry: `google.com, pub-2666698676518429, DIRECT, f08c47fec0942fa0`.
- AdSense loader is present in `index.html`.
- No AdSense loader was found in the Learning Centre, About, Contact, Privacy Policy, Terms or Offline pages.
- The homepage does not contain a manual ad unit with a `data-ad-slot` value. Its HTML comment indicates that Auto ads are expected to be controlled from the AdSense account.

### What this means

The publisher ID and `ads.txt` line match each other in the supplied archive. This does **not** prove that the deployed `/ads.txt` returns HTTP 200, that Google's crawler has read it, or that AdSense marks it Authorized.

The AdSense loader alone does not guarantee that an ad will appear. Auto ads must be enabled and configured in the AdSense account, and the site must be approved and eligible for ad serving. If the account uses manual ad units instead, the real ad unit code and slot ID must be copied from the AdSense account; no slot ID has been invented or added here.

Google's site status and `ads.txt` status must be checked in AdSense → Sites. Also check Policy Center and crawler/access issues. Google notes that ads.txt updates may take several days, and sometimes longer, to be reflected.

Official guidance:
- https://support.google.com/adsense/answer/12170222
- https://support.google.com/adsense/answer/7679060
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/adsense/answer/81904
- https://support.google.com/adsense/answer/12176698

## Analytics and Tag Manager

The HTML pages contain the Google Tag Manager container `GTM-KQJCNKFL`. The intended GA4 measurement ID `G-3FP8R0NDZN` appears in project documentation, but not in the website source itself. The actual GA4 tag, trigger, consent configuration and publication status are managed outside this ZIP and cannot be confirmed from source code. Verify the published container in Google Tag Manager and check that page views are not duplicated. Do not add a second direct GA4 tag unless you intentionally replace the Tag Manager setup.

## Changes made in this audited package

1. Corrected the README question inventory from 625 to the verified 623 records (297 Road Safety and 326 General Knowledge).
2. Clarified in the README that the GA4 tag configuration must be verified inside Google Tag Manager; the repository contains the GTM loader, not the full account configuration.
3. Removed a duplicate Learning Centre `CollectionPage` JSON-LD block, retaining the more detailed block with its lesson list.
4. Added this audit report with the actual verified counts and clear boundaries on what the ZIP can and cannot prove.

No quiz questions, translations, publisher IDs, music, images, page content, or working quiz logic were intentionally removed or rewritten.

## Required checks after deployment

1. Upload the contents of this ZIP to the existing GitHub repository without nesting the project folder inside another folder.
2. Wait for Vercel deployment to finish, then open the homepage and all public pages on a phone.
3. Visit `https://quizmaster-liard-five.vercel.app/ads.txt` directly. It should display the publisher line and return HTTP 200.
4. Visit `https://quizmaster-liard-five.vercel.app/robots.txt` and confirm the sitemap line and crawler access.
5. In AdSense → Sites, check that the site status is Ready (or read the exact action required) and that ads.txt status is Authorized.
6. In AdSense → Policy Center, resolve any listed policy or serving restrictions. Confirm Auto ads are enabled if that is the chosen setup.
7. In Google Tag Manager, preview and publish only the intended GA4 tag using `G-3FP8R0NDZN`; check for duplicate page_view events.
8. Test both quiz categories and both languages, question submission, scoring, timers, Continue, saved progress, review and retry.
9. Test Learning Centre search, category filtering, opening lessons, language behavior, browser Back, and offline recovery.
10. Check the live site on Android and desktop, including navigation, text readability, loading, and whether ads (if served) are clearly separated from quiz controls.

## Approval limitations

AdSense approval is decided by Google based on the live site, content value and originality, navigation, policy compliance, account status, crawler access and other factors. A code audit cannot promise approval. Do not click your own ads, ask others to click them, buy artificial traffic, or place ads where they could be mistaken for game controls.
