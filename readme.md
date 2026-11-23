🇷🇼 Quiz Master Rwanda

Responsive Bilingual Educational Quiz Application

Application release: 4.3.6

Quiz Master Rwanda is an educational web application that helps users improve their knowledge through interactive quizzes and learning materials.

The application supports two languages:

- English
- Kinyarwanda

It provides two main quiz categories:

- Road Safety – Learn about road safety rules, selected illustrated signs, and responsible road use.
- General Knowledge – Improve general knowledge through educational questions.

Live Website: https://quizmaster-liard-five.vercel.app/

GitHub Repository: https://github.com/mazimpakaisaie7-eng/quizmaster-

---

1. Main Features

Bilingual Support

- English interface.
- Kinyarwanda interface.
- Translated questions and answer options.
- Educational explanations in both languages.

Interactive Quizzes

- Road Safety and General Knowledge categories.
- Up to 10 questions per round.
- Randomized questions and answer options.
- Countdown timer.
- Automatic score calculation.
- Immediate answer feedback.
- Explanations after answering.
- Results and performance summary.

Scoring System

| Setting | Value |
|---|---|
| Questions per round | Up to 10 |
| Road Safety time | 60 seconds |
| General Knowledge time | 30 seconds |
| Correct answer | 10 points |
| Passing score | 70% |

The final round can contain fewer than 10 questions when fewer questions remain.

Progress Tracking

- Save quiz progress in the browser.
- Continue an unfinished round.
- Track completed rounds.
- Review answers from completed rounds.
- Retry unsuccessful rounds.
- Save best scores and accumulated points.

Progress is stored locally in the browser.

Learning Centre

The Learning Centre provides educational articles in English and Kinyarwanda, covering Road Safety and General Knowledge.

Progressive Web App

The application includes:

- Web app manifest.
- Service worker.
- Application icons.
- Offline fallback page.
- Resource caching and update support.

Offline functionality depends on previously cached resources.

Responsive Design

The application is designed for mobile phones, tablets, and desktop browsers.

---

2. Project Files

The repository contains the following main application files:

| File | Description |
|---|---|
| "index.html" | Main application interface |
| "questions.js" | Quiz engine and application logic |
| "questions.json" | Quiz questions and answers |
| "articles.html" | Learning Centre page |
| "articles.json" | Educational articles |
| "about.html" | About the application |
| "contact.html" | Contact information |
| "privacy-policy.html" | Privacy Policy |
| "terms.html" | Terms and Conditions |
| "offline.html" | Offline fallback page |
| "service-worker.js" | Application caching and updates |
| "manifest.webmanifest" | PWA configuration |
| "icon-192-4.png" | Application icon |
| "icon-512-3.png" | Large application icon |
| "mythica.mp3" | Application audio file |
| "robots.txt" | Search engine crawling instructions |
| "sitemap.xml" | Website sitemap |
| "ads.txt" | Advertising authorization file |
| "CREDITS.TXT" | Credits and acknowledgements |

Other files may be present in the repository.

---

3. Technologies Used

Quiz Master Rwanda is built with:

- HTML5
- CSS3
- JavaScript
- JSON
- Progressive Web App technologies

The application uses browser storage to maintain quiz progress and user preferences.

---

4. Deployment

The website is hosted through Vercel and its source code is maintained on GitHub.

Updating the Website

1. Open the GitHub repository.
2. Select the file that needs updating.
3. Make the required changes.
4. Commit the changes to the "main" branch.
5. Allow Vercel to deploy the updated project.
6. Open the live website and verify the changes.

Keep file names and references consistent when updating the application.

---

5. SEO and Website Information

The project includes:

- Page titles and descriptions.
- Canonical website information.
- "robots.txt".
- "sitemap.xml".
- Public informational pages.
- Mobile-friendly layouts.

Search engine indexing and ranking depend on search engine policies and decisions.

---

6. Analytics and Advertising

Google Tag Manager is loaded on the homepage and public content pages using container `GTM-KQJCNKFL`. The Google Analytics 4 measurement ID intended for the site is `G-3FP8R0NDZN`; confirm inside the Google Tag Manager container that the GA4 tag uses this ID and that page views are not duplicated.

Google AdSense code is intentionally loaded on the homepage (`index.html`) only. Other pages do not load the AdSense script. The homepage ad setup is intended to keep advertising separate from the quiz setup controls; review the live layout on mobile and desktop to ensure ads do not overlap controls or content.

The `ads.txt` file authorizes publisher `pub-2666698676518429`. Confirm the ads.txt status, site ownership, payment setup and review status inside the AdSense account. Code and file correctness do not guarantee approval or ad serving.

---

7. Privacy and Data

Quiz progress and application preferences are stored locally in the user's browser.

Users can read the website's Privacy Policy and Terms and Conditions for additional information.

Clearing browser storage may remove locally saved progress.

---

8. Testing Checklist

Before publishing an update, verify that:

- [ ] The homepage loads correctly.
- [ ] English and Kinyarwanda selections work.
- [ ] Both quiz categories load correctly.
- [ ] Questions display four answer options.
- [ ] Correct answers are evaluated properly.
- [ ] Timers and scoring work correctly.
- [ ] Continue and progress features work.
- [ ] The Learning Centre displays articles.
- [ ] About and Contact pages open.
- [ ] Privacy Policy and Terms pages open.
- [ ] The application works on mobile devices.
- [ ] The deployed website displays the latest version.

---

9. Contact

For questions, corrections, feedback, or suggestions:

Email: mazimpakaisaie7@gmail.com

Website: https://quizmaster-liard-five.vercel.app/

---

10. Our Mission

Quiz Master Rwanda aims to make education more accessible through interactive quizzes and bilingual learning materials.

The project encourages continuous learning, road safety awareness, and the development of general knowledge.

Learn. Practice. Improve.

Made with dedication in Rwanda 🇷🇼


---

11. Audit and release notes

- Preserved the existing quiz engine, question bank, article content, icons, audio, legal pages and PWA features.
- Refreshed the homepage with a light, high-contrast interface and mobile-friendly styling.
- Kept AdSense Auto ads code off the homepage and enabled it on the public content pages; Google controls eligible ad placements there.
- Added the same Google Analytics measurement tag to the public content pages.
- Aligned the Service Worker cache version with the quiz engine version to trigger a clean update.
- Updated the PWA theme colors and explicitly allowed Google's AdSense crawler in robots.txt.
- The offline page remains excluded from indexing and analytics.

Google approval, crawler access, analytics collection and ad serving must be confirmed in the corresponding Google accounts after deployment.


## 4.3.5 Update Notes

- Refreshed the Home page with a responsive, accessible visual layout while preserving the existing quiz-engine element IDs and workflows.
- Expanded the main content layout for desktop and retained a single-column, touch-friendly mobile layout.
- Configured the existing AdSense publisher and Home ad slot on the Home page only, below the language/category selection and game controls.
- Removed AdSense loader scripts from About, Learning Centre, Contact, Privacy Policy and Terms pages.
- Updated Privacy Policy and Terms advertising descriptions to match the current code placement.
- Kept the existing Google Tag Manager container `GTM-KQJCNKFL` on the Home page and the existing Analytics measurement ID `G-3FP8R0NDZN` on informational pages. Confirm that the GA4 tag is correctly published inside the GTM container before relying on Home page analytics.
- Aligned the quiz-engine and service-worker cache versions at 4.3.5 to trigger an update for returning visitors.

## Current Content Scope and Roadmap

The included question bank contains 625 validated bilingual records: 297 Road Safety and 328 General Knowledge. The current question and interface languages are English and Kinyarwanda. Three vector road-sign illustrations (priority road, give way, and stop) are connected to their matching questions. The Learning Centre contains 11 articles. This release does not claim to contain 10,000 questions, seven translated question banks, automatic AI content generation, or a complete international legal database. Those features require verified source material, professional translation/review, and a separate content release process.

Road-sign illustrations are not yet mapped to the current question records; do not treat this release as a complete illustrated road-sign examination bank.


---

## Release 4.3.5 — Home refresh and Google setup notes

- Updated the home screen to a clean white, navy and bright-blue layout.
- Added a lightweight Kigali/Rwanda-flag hero banner with no people.
- Preserved the existing quiz engine, question data, progress, review, settings, menu and music controls.
- Kept the existing AdSense publisher loader on the home page and removed the fixed manual ad unit. If Auto ads are enabled in the AdSense account, Google can decide whether and where eligible ads appear. No ad placement or approval is guaranteed by the source code alone.
- Standardized the existing Google Tag Manager container GTM-KQJCNKFL across the home, Learning Centre, About, Contact, Privacy and Terms pages. Configure/publish a GA4 Google tag for measurement ID G-3FP8R0NDZN inside that GTM container; do not add a separate hard-coded GA4 tag as that can duplicate page_view events.
- Aligned the quiz-engine and Service Worker cache version at 4.3.5 and added the hero image to the app shell.

### AdSense and analytics verification before review

1. Confirm Auto ads are enabled for the verified site in AdSense and review the Ad settings preview on phone and desktop.
2. Exclude the interactive quiz controls and any areas where an ad could be confused with a play, answer, menu or navigation control. Google prohibits placements that may cause accidental clicks.
3. In the existing GTM container GTM-KQJCNKFL, confirm a published Google tag / GA4 configuration for G-3FP8R0NDZN. Then use Tag Assistant and GA4 Realtime/DebugView to verify one page_view per page load across all pages.
4. Never click live ads while testing.
5. Approval, ad serving, and policy status are decided by Google after it reviews the live deployed site.
