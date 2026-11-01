Quiz Master 🇷🇼 — Knowledge Quiz

Quiz Master is a bilingual educational quiz application designed to help users practise what they know, discover new information, refresh their knowledge and enjoy learning.

- Live application: https://quizmaster-liard-five.vercel.app/
- GitHub repository: https://github.com/mazimpakaisaie7-eng/quizmaster-
- Hosting: Vercel

---

1. About the Project

Quiz Master is a browser-based quiz application built with HTML, CSS, JavaScript and JSON question data.

Users can select a language and question category, answer timed multiple-choice questions, submit their answers, view their results, review answers and track their progress.

The application is designed to support:

- English and Kinyarwanda.
- Road-safety questions.
- General-knowledge questions.
- Timed multiple-choice quizzes.
- Ten questions per full round.
- Score calculation and progress tracking.
- Answer review.
- Round unlocking.
- Browser-based offline support through a service worker.

2. Languages and Categories

Supported languages

- English ("en")
- Kinyarwanda ("rw")

The selected language determines which question text, answer options and explanations are displayed when the corresponding translations are available.

Question categories

Category key| Category| Description
"traffic"| Road Safety| Traffic signs, road rules and road safety awareness
"general"| General Knowledge| Educational topics, geography, science, history and other general subjects

Each category has its own question-selection cycle and round progression.

3. Quiz Rules

Time per question

Category| Time
Road Safety ("traffic")| 60 seconds
General Knowledge ("general")| 30 seconds

The timer applies to each question.

Round structure

- A full round contains 10 questions.
- Questions are selected from the chosen category.
- Question selection is randomized.
- Used question IDs are tracked separately for each category.
- Questions are reused after the available question cycle has been exhausted.
- The final round may contain fewer than 10 questions if fewer valid unused questions remain.

Scoring

- Correct answer: 10 points.
- Incorrect answer: 0 points.
- Unanswered or timed-out question: 0 points.
- Passing requirement: at least 70%.

For a full round of 10 questions:

Correct answers| Score| Result
0–6| 0–60| Not passed
7| 70| Passed
8| 80| Passed
9| 90| Passed
10| 100| Passed

The next round should only be unlocked after the current round meets the passing requirement.

4. How to Play

1. Open the Quiz Master application.
2. Select English or Ikinyarwanda.
3. Select Road Safety or General Knowledge.
4. Confirm the selection.
5. Press Start Quiz.
6. Read the question and select an answer.
7. Press Submit Answer to submit the selected answer.
8. Read the feedback and explanation.
9. Press Next Question to continue.
10. At the end of the round, view the score and result.
11. If the passing requirement is achieved, continue to the next unlocked round.

Users can also review answers and return to the home screen using the available navigation buttons.

5. Question Database

Questions are stored in:

"questions.json"

The application loads this file using JavaScript "fetch()".

Each question should have:

- A unique "id".
- A supported "category".
- An English question.
- English answer options.
- A correct English answer that matches one of the options.

Kinyarwanda translations can be provided using:

- "question_rw"
- "options_rw"
- "answer_rw"
- "explanation_rw"

English fields include:

- "question"
- "options"
- "answer"
- "explanation"

An optional "image" field may be used for a question illustration if the quiz engine supports it.

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

1. The JSON is valid.
2. Every question has a unique ID.
3. Every category is either "traffic" or "general".
4. Every English question has valid English options.
5. Every English answer matches one of its options exactly.
6. Kinyarwanda options and answers match when translations are supplied.
7. No question has missing or duplicated options.
8. Question text and explanations are appropriate and understandable.

Invalid question data can cause questions to be skipped or the question database to fail to load, depending on the validation implemented in the quiz engine.

6. Scores and Progress Storage

Quiz Master is designed to use browser "localStorage" for preferences, scores, question history and quiz progress.

This means that saved progress belongs to the browser and device being used. It is not automatically synchronized between different devices.

Main storage keys

Storage key| Purpose
"quizmasterLanguage"| Selected language
"quizmasterMode"| Selected category
"quizmasterUsedQuestionIds"| Used question IDs, separated by category
"quizmasterCompletedRounds"| Completed rounds, separated by category
"quizmasterReviewAnswers"| Saved answer-review information
"quizmasterBestScore"| Highest score from a round
"quizmasterTotalScore"| Cumulative score
"quizmasterProgress"| Saved quiz progress

The exact fields stored inside each key depend on the implementation of "questions.js".

Best score

The best score represents the highest score achieved in an individual round.

It is not the cumulative score.

Total score

The total score represents the points accumulated from completed rounds.

For example:

- First completed round: 70 points.
- Second completed round: 90 points.
- Cumulative score: 160 points.

Saved progress

The intended continue-quiz feature can preserve information such as:

- Selected language.
- Selected category.
- Current round.
- Question IDs in the current round.
- Current question position.
- Current score.
- Correct and answered question counts.
- Answer-review information.
- Remaining time.
- Selected answer and submission status.

The quiz engine must correctly save and restore these values for the Continue Quiz feature to work reliably.

Resetting progress

The reset feature is intended to clear saved game progress and scores from the current browser.

Language and category preferences may be preserved, depending on the reset implementation.

Clearing browser website data may also remove locally saved progress.

Important: Local storage is not a server-based account system or a backup service.

7. Answer Review

Quiz Master includes an answer-review feature.

The review page is intended to show information such as:

- The question.
- The selected answer.
- The correct answer.
- Whether the answer was correct.
- The explanation, where available.

The review feature depends on the quiz engine correctly saving and rendering the review data.

8. Round Progression

Completed rounds are tracked separately for the two question categories.

The intended progression rules are:

- A round must be completed before its result is recorded.
- At least 70% is required to pass.
- Passing a round unlocks the next round in that category.
- Failing a round allows the user to try again.
- Used questions are tracked separately for Road Safety and General Knowledge.

Round progression is stored locally in the user's browser.

9. Offline Support

Quiz Master uses a service worker to cache application resources.

The service worker can cache files such as:

- "index.html"
- "offline.html"
- "questions.js"
- "questions.json"
- "manifest.webmanifest"
- Configured icons and other static resources

For offline use:

1. Open the application while connected to the internet.
2. Allow the application and question database to load successfully.
3. Allow the service worker to install and cache the required files.
4. Revisit the application when offline.

Offline functionality depends on successful caching, browser storage availability and the service worker configuration.

The offline page does not independently provide quiz functionality. The quiz engine and question data must also be available from the cache.

10. Technology Stack

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

11. Project Structure

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

Some assets may be optional. The actual files referenced by "index.html", "questions.js", "service-worker.js" and the manifest must exist at the expected paths.

Unused legacy files may remain in the repository, but they are not part of the core quiz flow unless they are linked or loaded by the application.

12. Running the Project Locally

Requirements

- Git
- A modern web browser
- A local development server

Clone the repository

git clone https://github.com/mazimpakaisaie7-eng/quizmaster-.git
cd quizmaster-

Open the project folder using a local development environment such as Visual Studio Code and run it with a local web server.

Do not rely on opening "index.html" directly using a "file://" URL. The application uses browser features such as "fetch()" and service workers that require an appropriate web origin.

13. Deployment on Vercel

The application is hosted on Vercel and connected to the GitHub repository.

When changes are committed to the configured production branch, Vercel can build and deploy the updated files.

After deployment, test the live application.

Deployment checklist

- [ ] Homepage loads successfully.
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
- [ ] Scores are calculated correctly.
- [ ] The 70% passing requirement works.
- [ ] Round progression works separately for both categories.
- [ ] Answer review displays the saved information.
- [ ] Progress can be resumed after reloading.
- [ ] Reset progress works as intended.
- [ ] Settings and music controls work.
- [ ] The menu and navigation buttons work.
- [ ] The service worker installs successfully.
- [ ] Offline resources load after a successful online visit.
- [ ] Public information pages open correctly.
- [ ] The home-page advertisement area behaves correctly.

14. Search Engine Pages

Quiz Master provides public information pages:

- "about.html"
- "contact.html"
- "privacy-policy.html"
- "terms.html"

The sitemap is intended to help search engines discover public pages.

The sitemap is available at:

https://quizmaster-liard-five.vercel.app/sitemap.xml

The robots file should identify the sitemap location:

Sitemap: https://quizmaster-liard-five.vercel.app/sitemap.xml

A sitemap does not guarantee that search engines will index every page.

15. Advertising

Quiz Master may display Google AdSense advertisements where advertising code is configured.

The application includes Google Analytics and AdSense integration in its homepage code.

Advertising approval, eligibility, ad serving and payment are controlled by Google and are not guaranteed by the application code.

The presence of an AdSense script does not mean that a website has been approved or that advertisements will always appear.

The application should provide useful educational content and a good user experience independently of advertising.

16. Privacy

Quiz Master uses browser storage for local gameplay information and may use third-party services for analytics, advertising and hosting.

Users should consult:

- "privacy-policy.html"
- "terms.html"

The actual privacy policy must accurately describe the services, storage mechanisms, advertising configuration and consent controls used by the deployed application.

Do not enter passwords, payment details or other sensitive information into quiz fields.

17. Payments and Referral Features

The core Quiz Master experience is a knowledge quiz.

The existence of old payment, premium or referral files in the repository does not mean that those features are operational.

Real payment processing or referral rewards would require secure server-side implementation, transaction verification and appropriate protection against fraud.

Browser-only JavaScript and local storage must not be treated as proof that a payment or transaction has been completed.

18. Troubleshooting

Questions do not load

Check:

- "questions.json" exists in the repository root.
- The file contains valid JSON.
- The file is accessible from the deployed website.
- Question IDs, categories, options and answers are valid.
- The browser console does not report a fetch or parsing error.

The quiz does not start

Check:

- Both language and category have been selected.
- The selection confirmation works.
- "questions.js" loads successfully.
- The selected category contains valid questions.
- The required HTML element IDs exist.

Progress does not resume

Check:

- Browser local storage is available.
- "quizmasterProgress" is being saved correctly.
- The saved question IDs still exist in "questions.json".
- The quiz engine restores the selected answer, submission state and timer correctly.

The application shows an old version

Check:

- The latest Vercel deployment is marked Ready.
- The production domain is attached to the correct project.
- The browser is not displaying an old cached page.
- The service worker has updated its cached resources.

19. Support and Contact

For questions, feedback, suggestions or bug reports:

Email: mazimpakaisaie7@gmail.com

GitHub repository:
https://github.com/mazimpakaisaie7-eng/quizmaster-

Live application:
https://quizmaster-liard-five.vercel.app/

20. Project Goal

The goal of Quiz Master Rwanda is to provide an accessible bilingual learning experience that helps users:

- Learn things they did not know.
- Refresh information they already know.
- Understand what they have learned.
- Explore and answer questions.
- Improve road-safety awareness.
- Relax their minds through enjoyable learning.

Quiz Master 🇷🇼 — Learn, Play and Improve.
