# Quiz Master Rwanda — Deep Technical and Content Audit

**Input archive:** `quizmaster--main.zip`  
**Updated release:** `4.4.0`  
**Audit/update date:** 26 November 2026

## Executive summary

The supplied archive contains a static bilingual learning and quiz website. This update preserves the existing quiz bank, quiz scoring/progress logic, existing public pages, audio and artwork, Google Tag Manager container, AdSense publisher ID, and the homepage-only AdSense loader. It adds a substantial set of bilingual Learning Centre lessons and improves data-loading recovery and public-page content visibility.

This is a code and content-structure audit of the supplied ZIP. It is not a live Google account audit and cannot guarantee AdSense approval.

## Verified project inventory

- 625 quiz records: 297 Road Safety and 328 General Knowledge.
- 22 bilingual Learning Centre articles: 9 Road Safety and 13 General Knowledge.
- Learning Centre content now includes definitions, explanatory paragraphs, key learning points, learning objectives, practical activities, reflection questions, conclusions and further-reading sources.
- Main languages: English and Kinyarwanda.
- Quiz categories: Road Safety and General Knowledge.

## Changes made in release 4.4.0

### 1. Learning Centre
- Expanded the article collection from 11 to 22 original bilingual lessons.
- Added detailed lessons on speed and following distance, blind spots, poor visibility, driver attention, energy, digital safety, critical thinking, climate adaptation, water quality, Rwanda's geography and basic financial literacy.
- Added structured learning objectives, practical activities and reflection questions to the new lessons.
- Added those learning sections to the article renderer.
- Added estimated reading-time labels to lesson cards.
- Added a light, high-contrast visual theme to improve reading on mobile and desktop.
- Added server-rendered English lesson summaries to the HTML as an initial content fallback. This reduces dependence on a successful JavaScript data request for the first visible lesson list.
- Added a retry control and a 12-second request timeout for failed Learning Centre data loading.
- Kept source links for further reading. Road-law content is framed as general education and directs readers to official sources for current requirements.

### 2. Quiz loading and recovery
- Added a 15-second timeout to the `questions.json` request.
- Added a visible retry button after question-data loading fails.
- Added clearer loading and timeout messages.
- Replaced the initial hidden-screen placeholder “Loading question...” with a neutral message explaining that a question appears when a round begins.
- Preserved question IDs, quiz options, answer data, category logic, scoring, round timing, local progress, Continue and answer-review behavior.

### 3. Home page and navigation
- Added quick links from the homepage to the Learning Centre and About page.
- Improved the explanatory text spacing and mobile layout for the homepage.
- Preserved the existing home screen controls and their IDs so the quiz engine continues to bind to the same elements.
- Added social metadata and website structured data.

### 4. SEO, PWA and documentation
- Added CollectionPage/ItemList structured data for the Learning Centre.
- Added static lesson summaries to the Learning Centre HTML.
- Updated the web app manifest description and theme colours.
- Updated sitemap dates and priorities for the six public pages.
- Bumped the service-worker cache version to `4.4.0` so returning visitors can receive the updated files.
- Updated About, Privacy Policy and Terms dates and corrected advertising wording so it reflects the current homepage-only loader implementation.
- Rewrote README to document the actual current project rather than contradictory earlier release notes.
- Preserved `robots.txt`, `ads.txt`, artwork, music and credits.

## Google identifiers and advertising code preserved

The following values were checked against the input archive and retained:

- Google Tag Manager container: `GTM-KQJCNKFL`.
- Intended GA4 measurement ID documented for the GTM configuration: `G-3FP8R0NDZN`.
- AdSense publisher ID: `ca-pub-2666698676518429`.
- AdSense loader remains in `index.html` only.
- No AdSense loader was added to Learning Centre, About, Contact, Privacy Policy, Terms or Offline.
- `ads.txt` retains: `google.com, pub-2666698676518429, DIRECT, f08c47fec0942fa0`.

The archive cannot inspect the private Google Tag Manager workspace, so the actual GA4 tag, trigger configuration, consent settings and publication status must be checked inside that account. The archive also cannot confirm whether Auto ads or particular ad formats are enabled in the AdSense account.

## Automated checks run

- `questions.json`, `articles.json` and `manifest.webmanifest` parse as valid JSON.
- `sitemap.xml` parses as valid XML.
- `questions.js` and `service-worker.js` pass Node.js syntax checks.
- Inline executable JavaScript on the HTML pages passes syntax checks.
- JSON-LD blocks parse as valid JSON.
- The quiz bank has 625 records, no duplicate IDs, four English and four Kinyarwanda options per record, and answer values matching their respective option arrays.
- All 22 articles have unique IDs, supported categories, English/Kinyarwanda titles, descriptions, definitions and lesson bodies.
- All service-worker precache paths resolve to files in the supplied project.
- Local HTML references were checked; one templated URL inside JavaScript was excluded from the local-file check because it is generated at runtime.
- The AdSense publisher ID and GTM container IDs were compared with the input archive and retained.

These are automated structural checks. They do not replace manual browser testing on real Android devices, screen readers, or live deployment.

## Remaining work outside the ZIP

1. Deploy the archive to the existing GitHub repository and wait for Vercel to finish.
2. Open the live `questions.json` and `articles.json` URLs and confirm the deployed responses show the new content.
3. Test both quiz categories, both languages, answer submission, timers, Continue, progress, review and retry.
4. Test the Learning Centre search, category filters, lesson detail, language switch, browser Back button and retry state.
5. Check the new service worker is active and old cached versions are replaced.
6. Verify the live `ads.txt` URL and the AdSense Sites status.
7. In Google Tag Manager, confirm the published GA4 tag uses `G-3FP8R0NDZN` and check that page views are not duplicated.
8. Check consent requirements and Google-certified consent-management configuration if the site serves visitors in regions where Google requires it.
9. Review the AdSense Policy Center and Search Console for account-specific, crawler, indexing or policy issues.

## AdSense readiness — important limits

Google assesses the live site, its original value, completeness, navigation, user experience, traffic quality, account setup and policy compliance. A larger article count alone does not guarantee approval. The new lessons are written as original educational explanations, but factual accuracy, translations and future updates should continue to be reviewed against authoritative sources. The Rwanda road-safety lessons do not replace the current Official Gazette, Rwanda National Police instructions or professional driver training.

The application contains interactive quiz features. Google must decide whether the public content and the site's overall experience meet its monetization requirements. In particular, ensure advertising is not confused with quiz controls, navigation, buttons or lesson content. Do not encourage ad clicks, purchase traffic, use traffic-exchange schemes or create artificial engagement.

The AdSense account message said review attempts are available again from **26 November 2026**. The ZIP cannot lift that account-side limit. After deployment and live testing, use the AdSense Sites page when the review action becomes available. Google makes the final decision.

## Official Google guidance

- https://support.google.com/adsense/answer/12176698
- https://support.google.com/adsense/answer/81904
- https://support.google.com/adsense/answer/7299563
- https://support.google.com/publisherpolicies/answer/48182
- https://support.google.com/adsense/answer/12170222

## Files intentionally preserved

The existing 625 question records and their translations, music, artwork, road-sign SVG files and attribution file were preserved rather than rewritten without a separate factual and licensing review. Structural validity does not by itself prove every answer is factually correct or every asset licence has been independently re-confirmed.
