🇷🇼 Quiz Master Rwanda

Bilingual Educational Quiz Application

Quiz Master Rwanda is an educational web application that helps users improve their knowledge through interactive quizzes and learning materials.

The application supports two languages:

- English
- Kinyarwanda

It provides two main quiz categories:

- Road Safety – Learn about road safety rules, traffic signs, and responsible road use.
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

Setting| Value
Questions per round| Up to 10
Road Safety time| 60 seconds
General Knowledge time| 30 seconds
Correct answer| 10 points
Passing score| 70%

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

File| Description
"index.html"| Main application interface
"questions.js"| Quiz engine and application logic
"questions.json"| Quiz questions and answers
"articles.html"| Learning Centre page
"articles.json"| Educational articles
"about.html"| About the application
"contact.html"| Contact information
"privacy-policy.html"| Privacy Policy
"terms.html"| Terms and Conditions
"offline.html"| Offline fallback page
"service-worker.js"| Application caching and updates
"manifest.webmanifest"| PWA configuration
"icon-192-4.png"| Application icon
"icon-512-3.png"| Large application icon
"mythica.mp3"| Application audio file
"robots.txt"| Search engine crawling instructions
"sitemap.xml"| Website sitemap
"ads.txt"| Advertising authorization file
"CREDITS.TXT"| Credits and acknowledgements

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

Google Analytics is installed on the homepage and the public content pages.

Measurement ID: "G-3FP8R0NDZN"

Google AdSense Auto ads code is enabled on these pages: `about.html`, `articles.html`, `contact.html`, `privacy-policy.html` and `terms.html`. The homepage (`index.html`) intentionally does not load the AdSense script, keeping the quiz setup screen clear.

The website does not intentionally use manually created ad units or fixed manual ad placements. Google determines whether eligible Auto ads appear and where they are placed on pages where the AdSense script is enabled.

The AdSense publisher file is `ads.txt`. The publisher ID and account/site approval must still be verified in the AdSense account. Adding code does not guarantee approval or ad serving.

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
