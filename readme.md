# Quiz Master Rwanda 🇷🇼

**Release:** 4.4.0  
**Live website:** https://quizmaster-liard-five.vercel.app/  
**GitHub:** https://github.com/mazimpakaisaie7-eng/quizmaster-

Quiz Master Rwanda is a bilingual educational website for learning and practising road safety and general knowledge. The public interface and learning content are available in English and Kinyarwanda.

## What the platform provides

### Interactive quizzes
- Road Safety and General Knowledge categories.
- English and Kinyarwanda question and answer text.
- Four answer options per question.
- Randomized question and answer order.
- Timed rounds, immediate feedback and explanations.
- Scores, pass status, round progression and retry.
- Browser-based progress saving, continue and answer review.
- Defensive question-data validation and loading error recovery.

### Learning Centre
- 22 bilingual educational lessons.
- Topics include road safety, pedestrian awareness, signs and markings, speed and following distance, visibility, driver attention, science, water, biodiversity, geography, climate, digital safety, media literacy, critical thinking, energy and basic money skills.
- Each lesson includes a definition, explanatory paragraphs, key learning points, a practical activity, reflection questions and further-reading sources where available.
- Search and category filters.
- Lesson language follows the saved English/Kinyarwanda preference.
- Educational content is original explanatory material and is not a substitute for current laws, official instructions, professional training or expert advice.

### Accessibility and user experience
- Responsive layouts for phones, tablets and desktop.
- Keyboard-visible focus states and semantic page landmarks.
- Readable contrast, scalable typography and reduced-motion support.
- Clear navigation to learning, About, Contact and legal pages.
- Retry controls when question or lesson data cannot be loaded.

### Progressive Web App
- Web app manifest and application icons.
- Service worker with versioned cache.
- Network-first strategy for HTML, JSON, JavaScript and CSS.
- Cache-first handling for suitable static assets.
- Offline fallback page.
- The service worker only clears caches using the Quiz Master cache prefix.

## Release content inventory

| Resource | Current contents |
|---|---:|
| Quiz questions | 625 |
| Road Safety questions | 297 |
| General Knowledge questions | 328 |
| Learning Centre articles | 22 |
| Learning languages | English and Kinyarwanda |
| Quiz categories | Road Safety and General Knowledge |

The question bank is checked for JSON validity, unique IDs, answer-option consistency and required bilingual fields. Structural validation does not independently prove that every factual answer is correct; educational facts and road-law references should continue to be checked against official sources.

## Main project files

| File | Purpose |
|---|---|
| `index.html` | Home page, quiz interface, SEO metadata, AdSense loader and Google Tag Manager container |
| `questions.js` | Quiz engine, validation, progress, scoring and recovery |
| `questions.json` | Bilingual question bank |
| `articles.html` | Learning Centre interface, search, filters and lesson rendering |
| `articles.json` | Bilingual educational lessons and sources |
| `about.html` | Project information |
| `contact.html` | Contact information |
| `privacy-policy.html` | Privacy and third-party service information |
| `terms.html` | Terms of use |
| `offline.html` | Offline fallback |
| `service-worker.js` | Caching and update lifecycle |
| `manifest.webmanifest` | PWA metadata |
| `sitemap.xml` | Public indexable page URLs |
| `robots.txt` | Crawler instructions |
| `ads.txt` | Authorized seller declaration |
| `AUDIT_REPORT.md` | Technical audit notes and validation limits |

Other supplied assets include the site icons, road-sign SVG illustrations, hero image and optional audio file.

## Analytics and advertising — identifiers preserved

This release preserves the existing Google identifiers and implementation:

- Google Tag Manager container: `GTM-KQJCNKFL`
- Intended GA4 measurement ID configured through Tag Manager: `G-3FP8R0NDZN`
- AdSense publisher ID: `ca-pub-2666698676518429`
- AdSense loader: retained on `index.html` only
- `ads.txt`: retains the matching publisher declaration

The GA4 tag configuration and publication must be checked inside Google Tag Manager. This source archive cannot inspect the live GTM workspace, confirm event collection, or guarantee that page views are not duplicated.

AdSense approval, crawler access, ads.txt status, account eligibility and ad serving are controlled by Google. A technically correct codebase does not guarantee approval. Check the AdSense Sites page and Policy Center for the account-specific status before requesting a review.

## Deployment

The project is a static website intended for deployment from the repository root.

1. Upload the contents of this ZIP to the existing GitHub repository, preserving the root-level file structure.
2. Commit the changes to the deployment branch.
3. Wait for the Vercel deployment to finish.
4. Open the deployed website and test it on a phone and desktop.
5. Test the Learning Centre, both quiz categories, language switching, progress, Continue, review and offline fallback.
6. Verify that the new service-worker version is active. If an old page remains visible, close old tabs and reload after the deployment has completed.

Do not place the project folder inside another nested folder when uploading to a static root deployment unless the Vercel project is configured for that root directory.

## Important verification after deployment

- Open `https://quizmaster-liard-five.vercel.app/questions.json` and confirm it returns JSON.
- Open `https://quizmaster-liard-five.vercel.app/articles.json` and confirm it returns the updated article collection.
- Open `https://quizmaster-liard-five.vercel.app/ads.txt` and confirm the publisher record is visible.
- Open `https://quizmaster-liard-five.vercel.app/robots.txt` and `https://quizmaster-liard-five.vercel.app/sitemap.xml`.
- Use browser developer tools or a tag debugger to verify GTM and GA4 without adding duplicate tracking snippets.
- Confirm all pages are reachable without a login and all navigation links work.
- Check the live site in Search Console and AdSense after deployment.

## Educational and policy note

The site aims to provide original learning value, clear navigation and useful explanations. No developer can promise AdSense approval: Google evaluates the live site, account, content, traffic and policy compliance. Avoid artificial traffic, incentivized ad interactions, copied articles, misleading navigation or ad placements that can be mistaken for controls.

## Contact

Email: mazimpakaisaie7@gmail.com  
Website: https://quizmaster-liard-five.vercel.app/

**Learn • Practise • Improve**
