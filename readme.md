🧠 Quiz Master 🇷🇼 - Knowledge Quiz

Learn • Play • Improve

Quiz Master is a bilingual educational web application designed to help users improve their knowledge through interactive quizzes and educational lessons.

The application supports English and Kinyarwanda and focuses on Road Safety and General Knowledge.

🌐 Live Application

- Website: https://quizmaster-liard-five.vercel.app/
- GitHub Repository: https://github.com/mazimpakaisaie7-eng/quizmaster-
- Hosting: Vercel
- Project Type: Educational Web Application
- Languages: English and Kinyarwanda

---

1. About Quiz Master

Quiz Master Rwanda is a browser-based educational application built with HTML, CSS, JavaScript and JSON.

It provides an interactive learning experience through:

- Road Safety quizzes.
- General Knowledge quizzes.
- English and Kinyarwanda language support.
- Multiple-choice questions.
- Randomized question selection.
- Timed quiz questions.
- Score calculation.
- Quiz round progression.
- Answer explanations.
- Answer review.
- Saved quiz progress using browser storage.
- Background music controls.
- Learning Centre articles.
- Progressive Web App (PWA) support.

The application is designed for educational practice and knowledge improvement.

---

2. Main Features

🌍 Bilingual Language Support

Quiz Master supports:

- English ("en")
- Kinyarwanda ("rw")

Users can select their preferred language before starting a quiz.

Question and answer translations are provided through the question database.

📚 Quiz Categories

The application provides two main quiz categories.

Category| Internal Key| Description
Road Safety| "traffic"| Road signs, traffic rules and road safety
General Knowledge| "general"| Rwanda, Africa, geography, science, history and other subjects

Each category maintains its own question usage and round progression.

🎯 Quiz Rules

The quiz configuration is designed around the following rules:

Feature| Configuration
Questions per round| 10
Road Safety timer| 60 seconds per question
General Knowledge timer| 30 seconds per question
Correct answer| 10 points
Incorrect answer| 0 points
Unanswered question| 0 points
Passing score| 70%

A user must achieve at least 70% to pass a standard 10-question round and qualify to unlock the next round.

For a standard 10-question round:

Correct Answers| Score| Result
0–6| 0–60| Not passed
7| 70| Passed
8| 80| Passed
9| 90| Passed
10| 100| Passed

Questions are selected randomly.

Previously used question IDs are tracked separately for quiz categories. Questions may be reused after the available question pool has been exhausted.

📝 Answer Feedback

After submitting an answer, users can receive feedback and read an explanation to help understand the correct answer.

Users select an answer and submit it using the quiz controls. Selecting an option does not automatically submit the answer.

---

3. How to Play

1. Open Quiz Master.
2. Select English or Kinyarwanda.
3. Select Road Safety or General Knowledge.
4. Confirm your selection.
5. Press Start Quiz.
6. Read the question.
7. Select one answer.
8. Press Submit Answer.
9. Read the feedback and explanation.
10. Press Next Question to continue.
11. Complete all 10 questions.
12. View your score and results.

Depending on the current quiz state, users can also access:

- Continue Quiz.
- Quiz Rounds.
- Review Answers.
- Settings.
- Background Music controls.
- Share.
- Home navigation.

---

4. Learning Centre

Quiz Master includes a separate Learning Centre for educational articles.

Main files:

- "articles.html"
- "articles.json"

The Learning Centre provides educational lessons in English and Kinyarwanda.

Learning Centre Features

- Search lessons.
- Filter lessons by category.
- General Knowledge lessons.
- Road Safety lessons.
- Switch between English and Kinyarwanda.
- Read individual lessons.
- Return to the lesson list.
- Navigate back to Quiz Master.

Article Database Structure

Articles are stored in "articles.json".

The main JSON structure contains:

- "version"
- "articles"

Each article contains the following main fields:

- "id"
- "category"
- "title"
- "description"
- "content"

Supported categories:

- "general"
- "traffic"

The title, description and content use English and Kinyarwanda values.

Example:

{
  "id": "general-example",
  "category": "general",
  "title": {
    "en": "Introduction to Science",
    "rw": "Intangiriro kuri Siyansi"
  },
  "description": {
    "en": "Learn about science.",
    "rw": "Menya ibyerekeye siyansi."
  },
  "content": {
    "en": "Science helps us understand the world.",
    "rw": "Siyansi idufasha gusobanukirwa isi."
  }
}

This is an illustrative example of the article structure. New articles should follow the structure expected by the current Learning Centre code.

---

5. Question Database

Quiz questions are stored in:

- "questions.json"
- "questions.js"

"questions.json" contains the quiz question data, while "questions.js" handles the question-loading and quiz-related logic.

Main Question Categories

- "traffic"
- "general"

Question Content

The question database supports bilingual educational content, including:

- Question text.
- Four answer options.
- Correct answer.
- Answer explanation.
- Question category.
- Question identification.
- Optional image information where supported.

English and Kinyarwanda content should be supplied using the field structure expected by the current quiz engine.

Adding New Questions

When adding questions:

1. Use a unique question ID.
2. Use a valid category.
3. Provide four answer options.
4. Ensure the correct answer matches one of the options.
5. Provide English and Kinyarwanda content.
6. Include explanations in both languages.
7. Check JSON syntax before committing.
8. Confirm that the question works in the application.

Avoid duplicate IDs, missing translations and invalid answer values.

---

6. Saved Progress and Browser Storage

Quiz Master uses browser storage to retain supported quiz information.

Examples of storage keys used by the application include:

- "quizmasterLanguage"
- "quizmasterMode"
- "quizmasterUsedQuestionIds"
- "quizmasterCompletedRounds"
- "quizmasterReviewAnswers"
- "quizmasterBestScore"
- "quizmasterTotalScore"
- "quizmasterProgress"
- "quizmasterMusicEnabled"

Saved information is stored in the user's browser.

Clearing browser storage or site data may remove saved quiz progress and preferences.

Saved browser data is not the same as an online user account or cloud synchronization.

---

7. Progressive Web App (PWA)

Quiz Master includes Progressive Web App support.

Main PWA files:

- "manifest.webmanifest"
- "service-worker.js"
- "offline.html"
- "icon-192-4.png"
- "icon-512-3.png"

PWA Features

- Web app manifest.
- Application icons.
- Standalone display support.
- Service worker registration.
- Caching of supported application resources.
- Offline fallback page.

Some previously cached application resources may remain accessible when the network is unavailable.

Offline availability depends on which resources have already been successfully cached by the browser.

---

8. Website Pages

The application includes the following public pages:

File| Purpose
"index.html"| Main Quiz Master application
"about.html"| Information about the application
"articles.html"| Learning Centre
"contact.html"| Contact information
"privacy-policy.html"| Privacy information
"terms.html"| Terms and conditions
"offline.html"| Offline fallback page

These pages provide information and navigation for users.

---

9. Project Structure

The main project files include:

quizmaster-/
│
├── index.html
├── questions.js
├── questions.json
│
├── articles.html
├── articles.json
│
├── about.html
├── contact.html
├── privacy-policy.html
├── terms.html
│
├── offline.html
├── service-worker.js
├── manifest.webmanifest
│
├── icon-192-4.png
├── icon-512-3.png
│
├── ads.txt
├── robots.txt
├── sitemap.xml
│
├── readme.md
├── CREDITS.TXT
├── validation-key.txt
├── mythica.mp3
│
└── api/

The project may contain additional supporting files and folders.

---

10. Technologies Used

Quiz Master uses:

- HTML5 — application structure.
- CSS3 — layout and visual styling.
- JavaScript — quiz functionality and user interactions.
- JSON — question and article data.
- Service Workers — supported caching and offline fallback.
- Web App Manifest — PWA configuration.
- Vercel — website hosting.
- Google Analytics — website traffic measurement.
- Google AdSense — website advertising integration.

Third-party services operate according to their own policies and availability.

---

11. Deployment

Quiz Master is hosted on Vercel and connected to its GitHub repository.

The live application is available at:

https://quizmaster-liard-five.vercel.app/

For updates:

1. Open the GitHub repository.
2. Select the file to update.
3. Make the required changes.
4. Check the code or JSON syntax.
5. Commit the changes.
6. Allow Vercel to deploy the updated version.
7. Test the live application after deployment.

Changes to the question database should be tested in the quiz application. Changes to Learning Centre data should be tested on the Learning Centre page.

---

12. Educational Purpose

Quiz Master is intended for educational practice and general knowledge improvement.

Road Safety information is provided for learning purposes. Users should always follow current official traffic laws, road signs and instructions from authorized road safety authorities.

The application does not replace official driver training, professional instruction or government guidance.

---

13. Contact

For questions, feedback or application-related inquiries:

Email: mazimpakaisa7@gmail.com

Website: https://quizmaster-liard-five.vercel.app/

---

14. Project Information

Project Name: Quiz Master 🇷🇼 - Knowledge Quiz

Project Type: Bilingual Educational Web Application

Main Languages: English and Kinyarwanda

Main Categories: Road Safety and General Knowledge

Hosting Platform: Vercel

Repository: https://github.com/mazimpakaisaie7-eng/quizmaster-

Mission: Learn • Play • Improve

---

© Quiz Master 🇷🇼. All rights reserved.
