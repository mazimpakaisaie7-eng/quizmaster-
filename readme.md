Quiz Master 🇷🇼 — Knowledge Quiz

Quiz Master is a bilingual educational quiz application designed to help users practise their knowledge, discover new information, refresh what they already know and enjoy learning.

- Live application: https://quizmaster-liard-five.vercel.app/
- GitHub repository: https://github.com/mazimpakaisaie7-eng/quizmaster-
- Hosting: Vercel
- Project type: Browser-based educational quiz application
- Languages: English and Kinyarwanda

---

1. About the Project

Quiz Master is a browser-based educational quiz application built with HTML, CSS, JavaScript and JSON question data.

Users can choose a language and question category, answer timed multiple-choice questions, submit their answers, view explanations, check their results, review previous answers and track their quiz progress.

The application is designed to provide:

- English and Kinyarwanda language options.
- Road Safety questions.
- General Knowledge questions.
- Timed multiple-choice quizzes.
- Ten questions per standard round.
- Randomized question selection.
- Score calculation and progress tracking.
- Answer review and explanations.
- Round unlocking based on performance.
- Settings for language and category.
- Optional background music.
- Browser-based offline support through a service worker.
- A Learning Centre for additional educational content.

Quiz Master is intended for educational practice and general knowledge improvement.

2. Languages and Question Categories

Supported languages

Language| Code
English| "en"
Kinyarwanda| "rw"

The selected language determines which question text, answer options and explanations are displayed when the corresponding translations are available.

If a translation is not supplied, the quiz engine may use the available default question information, depending on its implementation.

Question categories

Category key| Category| Description
"traffic"| Road Safety| Traffic signs, road rules and road-safety awareness
"general"| General Knowledge| Geography, science, history, Rwanda, Africa and other educational topics

Each category has its own question-selection cycle and round progression.

3. Quiz Rules

Time per question

Category| Time
Road Safety ("traffic")| 60 seconds
General Knowledge ("general")| 30 seconds

The timer applies separately to each question.

When the timer expires, the unanswered question receives zero points.

Round structure

- A standard round contains 10 questions.
- Questions are selected from the chosen category.
- Question selection is randomized.
- Used question IDs are tracked separately for each category.
- Previously used questions can be reused after the available question cycle has been exhausted.
- The question database should contain at least 10 valid questions in a category for a standard round to start successfully.

Scoring

Result| Points
Correct answer| 10
Incorrect answer| 0
Unanswered question| 0
Timed-out question| 0

Passing requirement

A score of at least 70% is required to pass a standard round and qualify to unlock the next round in that category.

For a standard round of 10 questions:

Correct answers| Score| Result
0–6| 0–60| Not passed
7| 70| Passed
8| 80| Passed
9| 90| Passed
10| 100| Passed

A round should only unlock the next round after the passing requirement has been achieved.

4. How to Play

1. Open the Quiz Master application.
2. Select English or Ikinyarwanda.
3. Select Road Safety or General Knowledge.
4. Confirm your language and category selection.
5. Press Start Quiz.
6. Read the displayed question.
7. Select one of the available answers.
8. Press Submit Answer.
9. Read the feedback and explanation.
10. Press Next Question to continue.
11. At the end of the round, view your score and result.
12. If you achieve at least 70%, continue to the next unlocked round.

Users can also:

- Review answers.
- Return to the home screen.
- Continue a saved quiz session when a valid session is available.
- Change language and category through Settings.
- Enable or disable background music.
- View their round progress.

5. Question Database

Questions are stored in:

questions.json

The application loads the question database through JavaScript using "fetch()".

Question structure

Each question should contain:

- A unique "id".
- A supported "category".
- An English question.
- English answer options.
- A correct English answer matching one of the options.

Kinyarwanda translations can be supplied using:

- "question_rw"
- "options_rw"
- "answer_rw"
- "explanation_rw"

English question fields include:

- "question"
- "options"
- "answer"
- "explanation"

An optional "image" field may be used for a question illustration if supported by the current quiz engine.

Example question

{
  "id": "general_001",
  "category": "general",
  "question": "What is the capital city of Rwanda?",
  "options": [
    "Kigali",
    "Musanze",
    "Huye",
    "Rubavu"
  ],
  "answer": "Kigali",
  "explanation": "Kigali is the capital city of Rwanda.",
  "question_rw": "Umurwa mukuru w'u Rwanda ni uwuhe?",
  "options_rw": [
    "Kigali",
    "Musanze",
    "Huye",
    "Rubavu"
  ],
  "answer_rw": "Kigali",
  "explanation_rw": "Kigali ni umurwa mukuru w'u Rwanda."
}

Question validation

Before publishing changes to "questions.json", check that:

1. The JSON syntax is valid.
2. Every question has a unique ID.
3. Every category is either "traffic" or "general".
4. Every question has valid English question text.
5. English options are present and valid.
6. Every English answer matches one of its options.
7. Kinyarwanda options and answers match when translations are supplied.
8. Options are not missing or duplicated.
9. Question text and explanations are understandable.
10. The question contains no misleading or inappropriate information.

Invalid question data may be skipped by the validation process or may prevent the question database from loading, depending on the error.

Important: A valid JSON file does not automatically mean that every question inside it is valid. Both the JSON syntax and the individual question records must be checked.

6. Scores and Progress Storage

Quiz Master uses browser "localStorage" to store gameplay information, preferences, scores and progress.

This means that saved information belongs to the browser and device being used. It is not automatically synchronized between different devices.

Main storage keys

The current quiz engine configuration uses the following storage keys:

Storage key| Purpose
"quizmasterProgress"| Saved quiz progress
"quizmasterUsedQuestionIds"| Used question IDs tracked by category
"quizmasterCompletedRounds"| Completed rounds tracked by category
"quizmasterReviewAnswers"| Saved answer-review information
"quizmasterBestScore"| Highest individual round score
"quizmasterTotalScore"| Cumulative score information
"quizmasterWeeklyScores"| Weekly score information
"quizmasterSettings"| Saved application settings
"quizmasterCurrentSession"| Current quiz session information

The exact information stored inside each key depends on the implementation of "questions.js".

Best score

The best score represents the highest score achieved in an individual round.

It is different from the cumulative score.

Total score

The total score represents accumulated points recorded by the quiz engine.

For example:

- First round: 70 points.
- Second round: 90 points.
- Cumulative score: 160 points.

The exact calculation depends on which attempts the current engine records.

Saved quiz progress

The Continue Quiz feature is intended to preserve information such as:

- Selected language.
- Selected category.
- Current round.
- Question IDs in the current round.
- Current question position.
- Current score.
- Correct and answered question counts.
- Saved answer-review information.
- Remaining time.
- Selected answer and submission status.

The quiz engine must correctly save and restore session information for the Continue Quiz feature to work reliably.

Resetting progress

The Reset Progress feature is intended to clear saved quiz progress and scores from the current browser.

The exact storage keys cleared or preserved depend on the reset implementation.

Clearing browser website data may also remove locally saved progress and preferences.

Important: Local storage is not a server-based account system, cloud backup or cross-device synchronization service.

7. Answer Review

Quiz Master includes an answer-review feature.

The review page is intended to display information such as:

- The question.
- The selected answer.
- The correct answer.
- Whether the answer was correct.
- The explanation, where available.

The quiz engine must save the review data correctly before it can be displayed.

Users can access answer review through the available Review Answers controls.

8. Round Progression

Completed rounds are tracked separately for Road Safety and General Knowledge.

The intended progression rules are:

1. A round must be completed before its result is recorded.
2. At least 70% is required to pass.
3. Passing a round qualifies the user to unlock the next round in that category.
4. Failing a round allows the user to retry it.
5. Used question IDs are tracked separately for each category.
6. Round progression is stored locally in the browser.

Progress in one category should not automatically unlock rounds in the other category.

9. Settings and Background Music

Quiz Master includes a Settings screen.

The settings interface provides controls for:

- Selecting the application language.
- Selecting the question category.
- Saving settings.
- Enabling or disabling background music.
- Resetting quiz progress.
- Returning to the home screen.

Background music

The application uses an optional audio file:

mythica.mp3

The music controller uses the browser's audio playback functionality and stores the music preference using:

quizmasterMusicEnabled

Music playback may depend on browser autoplay restrictions. Users may need to press the music control before playback begins.

If the music file is unavailable, the quiz should still be usable without background music.

10. Offline Support

Quiz Master uses a service worker to cache application resources.

The service worker may cache files such as:

- "index.html"
- "offline.html"
- "questions.js"
- "questions.json"
- "manifest.webmanifest"
- Configured application icons
- Other configured static resources

How to use the application offline

1. Open Quiz Master while connected to the internet.
2. Allow the homepage and question database to load successfully.
3. Allow the service worker to install and cache the required files.
4. Revisit the application when offline.

Offline functionality depends on:

- Successful service worker installation.
- Successful caching of required resources.
- Browser storage availability.
- The current service worker cache configuration.
- Previously downloaded question data and assets.

The offline page does not independently provide the full quiz experience. The quiz engine and question database must also be available from the cache.

11. Technology Stack

Technology| Purpose
HTML5| Application structure
CSS3| Styling and responsive layout
JavaScript| Quiz engine and interactions
JSON| Question database
LocalStorage| Local preferences, scores and progress
Service Worker| Resource caching and offline support
Web App Manifest| Installable web application metadata
Google Analytics| Website analytics, when enabled
Google AdSense| Advertising, when enabled
GitHub| Source-code repository
Vercel| Hosting and deployment

The core quiz application does not require a JavaScript framework or a build step.

12. Project Structure

The main project files are organized as follows:

quizmaster-/
│
├── index.html
├── questions.js
├── questions.json
│
├── service-worker.js
├── offline.html
├── manifest.webmanifest
│
├── articles.html
├── about.html
├── contact.html
├── privacy-policy.html
├── terms.html
│
├── robots.txt
├── sitemap.xml
│
├── icon-192-4.png
├── icon-512-3.png
├── mythica.mp3
│
└── README.md

Some assets may be optional.

The files referenced by "index.html", "questions.js", "service-worker.js" and "manifest.webmanifest" must exist at the expected paths if those features are to work.

The Learning Centre and public information pages should also exist if they are linked from the application.

Unused legacy files may remain in the repository, but they are not part of the core quiz flow unless they are linked or loaded by the application.

13. Running the Project Locally

Requirements

- Git.
- A modern web browser.
- A local development server.
- An internet connection for downloading dependencies or accessing external services, where required.

Clone the repository

git clone https://github.com/mazimpakaisaie7-eng/quizmaster-.git
cd quizmaster-

Open the project folder using a development environment such as Visual Studio Code.

Run the application through a local web server.

Do not rely on opening "index.html" directly using a "file://" URL. The application uses browser features such as "fetch()" and service workers that require an appropriate web origin.

14. Deployment on Vercel

Quiz Master is hosted on Vercel and connected to its GitHub repository.

When changes are committed to the configured production branch, Vercel can deploy the updated files.

Deployment checklist

- [ ] Homepage loads successfully.
- [ ] The correct production domain is attached to the project.
- [ ] Language selection works.
- [ ] Category selection works.
- [ ] Setup confirmation works.
- [ ] Questions load from "questions.json".
- [ ] English questions display correctly.
- [ ] Kinyarwanda questions display correctly.
- [ ] Road Safety uses 60 seconds per question.
- [ ] General Knowledge uses 30 seconds per question.
- [ ] Answers can be selected and submitted.
- [ ] Correct and incorrect answers are handled correctly.
- [ ] Explanations display correctly.
- [ ] Scores are calculated correctly.
- [ ] The 70% passing requirement works.
- [ ] Round progression works separately for both categories.
- [ ] Failed rounds can be retried.
- [ ] Answer review displays saved information.
- [ ] Progress can be resumed after reloading.
- [ ] Reset Progress works as intended.
- [ ] Settings work correctly.
- [ ] Music controls work correctly.
- [ ] The More menu and navigation buttons work.
- [ ] The Learning Centre opens correctly.
- [ ] The service worker installs successfully.
- [ ] Offline resources load after a successful online visit.
- [ ] Public information pages open correctly.
- [ ] The homepage advertisement area behaves correctly.
- [ ] No important JavaScript errors appear in the browser console.

After deployment, test the production URL using a fresh browser session as well as the regular browser session. This helps identify cached versions of older files.

15. Search Engine Pages

Quiz Master provides public information and educational pages, including:

- "about.html"
- "articles.html"
- "contact.html"
- "privacy-policy.html"
- "terms.html"

The sitemap is intended to help search engines discover public pages.

Sitemap URL:

https://quizmaster-liard-five.vercel.app/sitemap.xml

The "robots.txt" file should identify the sitemap location:

Sitemap: https://quizmaster-liard-five.vercel.app/sitemap.xml

A sitemap does not guarantee that search engines will index every page.

Public pages should contain useful, original, accurate and accessible information.

16. Advertising and Analytics

Quiz Master may use Google AdSense to display advertisements when the website and account are eligible and advertising is enabled.

The homepage includes the configured AdSense integration.

The configured advertising identifiers are:

- AdSense publisher ID: "ca-pub-2666698676518429"
- Homepage display ad slot: "9045712897"

The application also includes Google Analytics integration when enabled.

- Google Analytics measurement ID: "G-2W9SXBBH1P"

Advertising approval, eligibility, ad serving, policy compliance and payments are controlled by Google.

Including advertising code in the application does not guarantee approval or that advertisements will always appear.

The website should provide useful educational content and a good user experience independently of advertising.

Advertising should not interfere with quiz questions, navigation, learning activities or normal application use.

Never click your own advertisements or encourage others to click advertisements.

17. Privacy

Quiz Master uses browser storage for local gameplay information and preferences.

The application may also use third-party services for:

- Website hosting.
- Website analytics.
- Advertising.
- Static resource delivery.

Users should consult:

- "privacy-policy.html"
- "terms.html"

The actual Privacy Policy must accurately describe the services, storage mechanisms, advertising configuration and consent controls used by the deployed application.

Quiz Master does not use browser local storage as a secure account system.

Do not enter passwords, payment details or other sensitive information into quiz fields.

18. Payments, Premium and Referral Features

The core Quiz Master experience is a knowledge quiz.

Payment, premium subscription and referral systems are not part of the current core quiz functionality.

Old payment, premium or referral files may remain in the repository, but their presence does not mean those features are operational.

Real payment processing or referral rewards would require secure server-side implementation, transaction verification, appropriate data protection and fraud prevention.

Browser-only JavaScript and local storage must never be treated as proof that a payment or transaction has been completed.

19. Troubleshooting

Questions do not load

Check that:

- "questions.json" exists in the repository root.
- The file contains valid JSON.
- The file is accessible from the deployed website.
- Question IDs are unique.
- Categories use supported values.
- Options and answers are valid.
- The selected category contains at least 10 valid questions.
- The browser console does not report a fetch or parsing error.

The quiz does not start

Check that:

- Both language and category have been selected.
- The selection confirmation works.
- "questions.js" loads successfully.
- The selected category contains enough valid questions.
- The required HTML element IDs exist.
- The browser has not loaded an incompatible cached version.

Progress does not resume

Check that:

- Browser local storage is available.
- "quizmasterProgress" is being saved correctly.
- "quizmasterCurrentSession" contains a valid session.
- Saved question IDs still exist in "questions.json".
- The quiz engine restores the question position, selected answer, submission state and timer correctly.

The application shows an old version

Check that:

- The latest Vercel production deployment is marked Ready.
- The production domain is attached to the correct Vercel project.
- The latest changes were committed to the configured production branch.
- The browser is not displaying an old cached page.
- The service worker has updated its cached resources.

Testing in a private or incognito browser session can help determine whether the regular browser is displaying an older cached version.

Music does not play

Check that:

- "mythica.mp3" exists in the repository root.
- The audio path is correct.
- The browser allows playback after a user interaction.
- The music setting is enabled.

20. Support and Contact

For questions, feedback, suggestions or bug reports:

Email: mazimpakaisaie7@gmail.com

GitHub repository:

https://github.com/mazimpakaisaie7-eng/quizmaster-

Live application:

https://quizmaster-liard-five.vercel.app/

21. Project Goal

The goal of Quiz Master Rwanda is to provide an accessible bilingual learning experience that helps users:

- Learn things they did not know.
- Refresh information they already know.
- Understand what they have learned.
- Explore and answer educational questions.
- Improve road-safety awareness.
- Practise general knowledge.
- Enjoy learning through interactive quizzes.

---

Quiz Master 🇷🇼 — Learn, Play and Improve.
