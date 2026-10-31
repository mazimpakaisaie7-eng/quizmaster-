
# Quiz Master 🇷🇼 — Knowledge Quiz

**Quiz Master** is a bilingual knowledge quiz application designed to help users test and improve their knowledge through road-safety and general-knowledge questions.

🌐 **Live application:** https://quizmaster-liard-five.vercel.app/  
📦 **GitHub repository:** https://github.com/mazimpakaisaie7-eng/quizmaster-

---

## 1. About the Project

Quiz Master is a browser-based quiz application built with HTML, CSS, JavaScript and JSON question data.

Users can choose their preferred language and question category, answer timed multiple-choice questions, view their results, review their answers and track progress.

The application supports:

- English and Kinyarwanda.
- Road-safety questions.
- General-knowledge questions.
- Timed questions.
- Ten questions per round.
- Score tracking and progress saving.
- Review of previous answers.
- Round progression.
- Browser-based offline support through a service worker.

## 2. Main Features

### Language selection

Users can choose:

- English
- Ikinyarwanda

The selected language is saved in the browser.

### Question categories

The application provides two categories:

| Category | Description |
|---|---|
| Road Safety (`traffic`) | Road signs, traffic rules and road safety |
| General Knowledge (`general`) | General knowledge and educational topics |

### Quiz timing

Each question has its own countdown timer.

| Category | Time per question |
|---|---:|
| Road Safety | 60 seconds |
| General Knowledge | 30 seconds |

### Rounds

- Each round contains up to 10 questions.
- Questions are selected randomly from the selected category.
- Previously used question IDs are tracked separately for each category.
- Questions are reused only after the available question cycle is exhausted.
- The next round requires at least 70% to pass the current round.
- A round is recorded as completed only when the required score is achieved.

### Scoring system

- Each correct answer earns 10 points.
- Incorrect answers earn 0 points.
- A round's score is calculated from the correct answers.
- The passing requirement is 70% or higher.

For a full round of 10 questions:

| Correct answers | Score | Result |
|---:|---:|---|
| 7 | 70 points | Pass |
| 8 | 80 points | Pass |
| 9 | 90 points | Pass |
| 10 | 100 points | Pass |
| 0–6 | 0–60 points | Try again |

The number of questions in a round may be lower than 10 if fewer questions remain in the selected category.

## 3. How Scores and Progress Are Saved

Quiz Master currently uses the browser's `localStorage` to save quiz progress and scores.

This means saved information belongs to the browser and device being used. It is not automatically synchronized between different devices or stored in a user account on a server.

The application uses these storage keys:

| Storage key | Purpose |
|---|---|
| `quizmasterLanguage` | Saves the selected language |
| `quizmasterMode` | Saves the selected category |
| `quizmasterUsedQuestionIds` | Tracks used question IDs separately for each category |
| `quizmasterCompletedRounds` | Stores successfully completed rounds separately for each category |
| `quizmasterReviewAnswers` | Stores the most recently completed round's answer review |
| `quizmasterBestScore` | Stores the highest score achieved in a single round |
| `quizmasterTotalScore` | Stores the cumulative score from completed rounds |
| `quizmasterProgress` | Saves the current round and unfinished quiz progress |

### Best score

`quizmasterBestScore` stores the highest score achieved in one round.

It is not the cumulative score.

### Total score

`quizmasterTotalScore` adds the score earned each time a round is completed.

For example:

- First completed round: 70 points.
- Second completed round: 90 points.
- Total score: 160 points.

The total score is cumulative and is separate from the best score.

### Saved progress

The application can save information about an unfinished round, including:

- Selected language.
- Selected category.
- Round number.
- Question IDs in the round.
- Current question position.
- Current round score.
- Correct and answered question counts.
- Answer-review data.
- Remaining time.
- Selected answer and submission status.

The saved progress is used by the application's continue-quiz functionality.

### Answer review

The application saves the answer review for the most recently completed round. It does not currently provide a server-based account history.

### Resetting progress

The reset option removes saved quiz progress and scores from the current browser while preserving the saved language and category preferences.

**Important:** Clearing browser data or using a different browser/device can make locally saved progress unavailable.

## 4. Question Data

Questions are loaded from:

`questions.json`

The quiz engine validates question data before using it.

A question must contain:

- A unique question ID.
- A supported category (`traffic` or `general`).
- An English question.
- English answer options.
- A correct English answer included in the options.

Kinyarwanda fields can include:

- `question_rw`
- `options_rw`
- `answer_rw`
- `explanation_rw`

English fields can include:

- `question`
- `options`
- `answer`
- `explanation`

Optional question illustrations can use the `image` field.

Example question structure:

```json
{
  "id": 1,
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
```

The correct answer must match one of the options exactly.

## 5. Offline Support

The application uses a service worker to support offline access to cached resources.

The service worker can cache important application files, including:

- Main application page.
- Offline page.
- Quiz JavaScript.
- Question data.
- Other configured static resources.

For offline questions to be available, the user should first open the application while connected to the internet and allow the question data to load successfully.

Offline availability depends on successful caching and the browser's storage policies.

## 6. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Layout and styling |
| JavaScript | Quiz logic and interactions |
| JSON | Question database |
| LocalStorage | Local scores and progress |
| Service Worker | Caching and offline support |
| Vercel | Application hosting |
| GitHub | Source-code repository |

The quiz frontend does not require a framework or a build step.

## 7. Project Files

Important application files include:

```text
quizmaster-/
│
├── index.html
├── questions.js
├── questions.json
├── service-worker.js
├── offline.html
├── manifest.webmanifest
├── sitemap.xml
├── robots.txt
│
├── about.html
├── contact.html
├── privacy-policy.html
├── terms.html
│
├── premium.html
├── referral.html
├── payment.html
│
├── payment.js
├── referral.js
│
└── README.md
```

Some optional assets and additional files may also exist in the repository.

## 8. Running the Project

### Run locally

1. Download or clone the repository.
2. Open the project folder.
3. Run it using a local web server.
4. Open the local application URL in a browser.

Example:

```bash
git clone https://github.com/mazimpakaisaie7-eng/quizmaster-.git
cd quizmaster-
```

You can use a local development server such as VS Code Live Server.

Do not rely on opening `index.html` directly using a `file://` URL because browser fetch and service-worker features require an appropriate web origin.

### Live application

https://quizmaster-liard-five.vercel.app/

## 9. Deployment

The project is hosted on Vercel and connected to its GitHub source repository.

A deployment can be triggered by pushing or committing changes to the configured production branch.

After deployment, test the application on both mobile and desktop browsers.

Check that:

- The homepage loads.
- Language selection works.
- Category selection works.
- Questions load correctly.
- Timers work for both categories.
- Answers can be submitted.
- Scores are calculated correctly.
- The 70% passing requirement works.
- Review answers are displayed.
- Saved progress can be resumed.
- Offline caching works after an online visit.

## 10. Search Engine and Legal Pages

The project includes public information pages such as:

- About Quiz Master.
- Contact.
- Privacy Policy.
- Terms and Conditions.

The sitemap is intended to list public pages that should be discovered by search engines.

Private, temporary, transactional or unfinished pages should not automatically be submitted for indexing.

The presence of a sitemap does not guarantee that a search engine will index every listed page.

## 11. Advertising

The application may display Google AdSense advertisements where configured.

Advertising availability and approval are controlled by Google and are not guaranteed by this project.

The application should continue to provide useful quiz content and a good user experience independently of advertising.

## 12. Payments and Referrals

The repository includes premium, referral and payment-related frontend files.

The presence of these files does not by itself mean that real payments, verified transactions or server-side referral rewards are operational.

Any real payment or reward feature requires a secure backend, transaction verification and appropriate protection against fraud.

Do not treat browser-only storage as proof that a payment has been completed.

## 13. Privacy and Data

The quiz engine stores quiz preferences, scores and progress in the user's browser.

Users should consult the Privacy Policy for information about analytics, advertising and any other data processing used by the deployed application.

Do not enter passwords, payment details or other sensitive information into quiz fields.

## 14. Support and Contact

For questions, feedback or bug reports:

**Email:** mazimpakaisaie7@gmail.com

**GitHub repository:**  
https://github.com/mazimpakaisaie7-eng/quizmaster-

**Live application:**  
https://quizmaster-liard-five.vercel.app/

---

## 15. Project Goal

The goal of Quiz Master Rwanda is to provide an accessible bilingual learning experience that encourages users to improve their road-safety awareness and general knowledge through interactive quizzes.

**Quiz Master 🇷🇼 — Learn, Play and Improve.**
