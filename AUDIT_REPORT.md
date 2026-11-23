# Quiz Master Rwanda — Technical Audit Report

**Audited archive:** `quizmaster--main (4).zip`  
**Corrected release:** 4.3.6  
**Audit date:** 2026-11-23

## Summary

The archive contains the complete static website and quiz application. The main data files parsed successfully. The 625 quiz records passed structural checks: unique IDs, four English and four Kinyarwanda options, and both answer fields matching an option. The 11 Learning Centre articles have bilingual fields and source entries.

## Defects found and corrected

1. **Homepage hero image path was broken.** `index.html` referred to `./images/quizmaster-kigali-hero.webp`, but the image is stored in the project root. Updated the reference to `./quizmaster-kigali-hero.webp`.
2. **Three road-sign image paths were broken.** The relevant records in `questions.json` pointed into a non-existent `images/traffic-signs/` directory. Updated them to the existing root-level SVG files: `priority-road.svg`, `give-way.svg`, and `stop.svg`.
3. **Service-worker precache paths were broken.** `service-worker.js` referenced the same non-existent image directories. Corrected all four asset paths so the real files can be precached.
4. **Service-worker cache version was not updated for the asset-path correction.** Bumped the app/engine and service-worker release labels to `4.3.6`, and the cache name now changes to `quizmaster-cache-4.3.6`, prompting clients to replace the old cache.
5. **README advertising description contradicted the actual code.** It claimed AdSense was enabled on several secondary pages and disabled on the homepage. Corrected it: the AdSense script is in `index.html` only; the other audited pages do not load it.
6. **README tables and analytics notes were clarified.** The README now documents the installed GTM container and the intended GA4 measurement ID, while explicitly noting that the GA4 tag must be verified inside Tag Manager.

## Validation results

- `questions.json`, `articles.json`, and `manifest.webmanifest`: valid JSON.
- `sitemap.xml`: valid XML.
- `questions.js` and `service-worker.js`: passed Node.js syntax checks.
- Inline JavaScript on all seven HTML pages: passed syntax checks.
- JSON-LD structured data on the applicable pages: valid JSON.
- Local asset references in HTML, quiz data, and service-worker precache list: no missing local files after corrections.
- Quiz records: 625 total; 297 Road Safety and 328 General Knowledge; no duplicate IDs or structural answer/option mismatches.
- Learning Centre: 11 bilingual articles; no duplicate article IDs or missing required bilingual fields detected.
- `ads.txt`: contains the publisher record `google.com, pub-2666698676518429, DIRECT, f08c47fec0942fa0`.

## AdSense assessment — important limitations

The archive can be checked for implementation and content signals, but it cannot reveal the exact reason shown in the private AdSense account. The ZIP does not contain the AdSense Policy Center, site-review result, payment profile, account verification, crawler diagnostics, or Search Console data.

The code-level review confirms:
- AdSense code is present on the homepage only.
- The `ads.txt` publisher record matches the publisher ID used by the homepage AdSense script.
- Public About, Contact, Privacy Policy, Terms, and Learning Centre pages exist.
- The Learning Centre has 11 bilingual articles, and the quiz bank has 625 bilingual records.

**Remaining approval risk:** Google evaluates whether the website provides enough original, useful content and a good user experience. A quiz application can still be judged as having insufficient or low-value content if the public pages do not offer enough substantial, distinctive material. The quiz bank is useful to visitors, but it is not a guarantee that Google will count it as sufficient publicly accessible editorial content. Continue expanding the Learning Centre with genuinely useful, carefully checked lessons, and ensure users can reach them easily. Do not add mass-generated or repetitive articles merely to increase word count.

Also verify in the AdSense account:
1. Complete any outstanding payment/profile and identity tasks shown in the account.
2. Open **Sites** and read the exact issue shown for the domain.
3. Open **Policy Center** and check for policy, crawler, or ad-serving issues.
4. Check the site's `ads.txt` status in AdSense.
5. Confirm the site is reachable publicly over HTTPS and that Google can crawl it.
6. After making the account/site changes, request another review from the Sites page if AdSense offers that action.

Google's review decision is made by Google. This ZIP cannot guarantee approval or remove an account-level "Needs attention" status by itself.

## Official Google guidance

- AdSense site not ready / insufficient unique content and user experience: https://support.google.com/adsense/answer/12176698
- Common site content and navigation issues: https://support.google.com/adsense/answer/81904
- Preparing site pages for AdSense: https://support.google.com/adsense/answer/7299563
- Publisher policies: https://support.google.com/publisherpolicies/answer/10502938
- AdSense site status definitions: https://support.google.com/adsense/answer/12170222

## Files intentionally not rewritten

The quiz questions, translations, article text, policy text, legal wording, music, icons, and credits were not wholesale rewritten. They passed the structural checks available in this audit, and changing substantive content without verifying the underlying legal/educational sources could introduce new errors. Copyright ownership and the factual accuracy of every educational claim still require human/source verification.
