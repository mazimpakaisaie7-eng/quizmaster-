🧠 Quiz Master 🇷🇼 - Knowledge Quiz

Learn • Play • Improve

Quiz Master is a bilingual educational web application designed to help users improve their knowledge through interactive quizzes and educational lessons.

The application supports English and Kinyarwanda and focuses on two main learning areas:

- Road Safety
- General Knowledge

🌐 Live Application: https://quizmaster-liard-five.vercel.app/

---

1. Project Overview

Quiz Master Rwanda is a browser-based educational application built using HTML5, CSS3, JavaScript and JSON.

It provides an interactive learning environment where users can answer multiple-choice questions, review their answers, track supported quiz progress and read educational articles.

The application is designed to work on desktop and mobile browsers, with Progressive Web App (PWA) support.

Main objectives

- Improve general knowledge.
- Promote road safety awareness.
- Provide bilingual educational content.
- Encourage interactive learning.
- Make educational resources accessible through a web application.

---

2. Live Application and Repository

Information| Details
Project Name| Quiz Master 🇷🇼 - Knowledge Quiz
Live Website| https://quizmaster-liard-five.vercel.app/
GitHub Repository| https://github.com/mazimpakaisaie7-eng/quizmaster-
Hosting Platform| Vercel
Project Type| Educational Web Application
Main Languages| English and Kinyarwanda
Main Categories| Road Safety and General Knowledge

---

3. Main Features

🌍 Bilingual Language Support

Quiz Master supports two languages:

- English ("en")
- Kinyarwanda ("rw")

Users can select their preferred language before starting a quiz.

Question translations, answer options, explanations and educational articles use the bilingual data structure supported by the application.

📚 Quiz Categories

The application provides two main categories.

Category| Internal Key| Description
Road Safety| "traffic"| Road signs, traffic lights, road markings, traffic regulations and road safety
General Knowledge| "general"| Rwanda, Africa, geography, science, history and other educational subjects

Each category has its own quiz progression and question usage tracking.

🎯 Quiz Configuration

The quiz engine is designed around the following configuration:

Feature| Configuration
Questions per standard round| 10
Road Safety time| 60 seconds per question
General Knowledge time| 30 seconds per question
Correct answer| 10 points
Incorrect answer| 0 points
Unanswered question| 0 points
Passing percentage| 70%

For a standard 10-question round:

Correct Answers| Score| Result
0–6| 0–60| Not passed
7| 70| Passed
8| 80| Passed
9| 90| Passed
10| 100| Passed

A score of at least 70% is required to pass a standard round.

🔀 Question Selection

The quiz system is designed to:

- Select questions randomly.
- Randomize answer-option order.
- Track previously used question IDs.
- Keep question usage separate between categories.
- Avoid unnecessary repetition while unused questions remain.
- Reuse questions when the available question pool has been exhausted.

The actual number of questions available depends on the valid records in "questions.json".

📝 Answer Feedback and Review

The application supports:

- Multiple-choice answer selection.
- Answer submission.
- Correct and incorrect answer feedback.
- Educational explanations.
- Final score display.
- Review of submitted answers.

Selecting an answer and submitting it are separate actions.

---

4. How to Play

1. Open the Quiz Master website.
2. Select English or Kinyarwanda.
3. Choose Road Safety or General Knowledge.
4. Confirm the selected options.
5. Press Start Quiz.
6. Read the displayed question.
7. Select one answer.
8. Press Submit Answer.
9. Read the feedback and explanation.
10. Press Next Question.
11. Continue until the round is completed.
12. View the final score and result.

Depending on the current application state, users can also access available navigation features such as:

- Continue Quiz
- Quiz Rounds
- Review Answers
- Settings
- Music Settings
- Learning Centre
- About
- Contact and Help
- Share Quiz Master

---

5. Learning Centre

Quiz Master includes a separate Learning Centre for educational articles.

Main files

- "articles.html"
- "articles.json"

Learning Centre features

- Browse educational articles.
- Search available lessons.
- Filter articles by category.
- Read General Knowledge lessons.
- Read Road Safety lessons.
- Switch between English and Kinyarwanda.
- Open individual articles.
- Navigate back to the main application.

Supported article categories

- "general"
- "traffic"

Article database structure

The article database is stored in "articles.json".

The main data structure contains:

- "version"
- "articles"

Each article should contain:

- "id"
- "category"
- "title"
- "description"
- "content"

The bilingual fields use English ("en") and Kinyarwanda ("rw") values.

Illustrative article example

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

This is an illustrative example. New articles must follow the exact data structure expected by the current "articles.html" implementation.

---

6. Question Database

Quiz questions are stored in:

- "questions.json"
- "questions.js"

"questions.json"

This file contains the quiz question data.

It stores the questions, categories, answer options, correct answers and supported translations.

"questions.js"

This file contains the quiz engine and application logic responsible for handling tasks such as:

- Loading question data.
- Validating and preparing questions.
- Selecting questions for rounds.
- Managing quiz state.
- Displaying questions and options.
- Processing submitted answers.
- Calculating scores.
- Managing round progression.
- Saving supported quiz information.
- Handling answer review.

Main question categories

- "traffic"
- "general"

Question data requirements

Each question should have:

- A unique "id".
- A valid "category".
- A question statement.
- Exactly four answer options.
- A valid correct answer.
- English and Kinyarwanda content where required.
- An explanation where supported.

Optional image fields may be used where supported by the current quiz engine.

Adding new questions

Before adding questions:

1. Give each question a unique ID.
2. Use "traffic" or "general" as the category.
3. Provide exactly four answer options.
4. Make sure the correct answer matches one of the options.
5. Provide the required English and Kinyarwanda translations.
6. Include accurate explanations.
7. Validate the JSON syntax.
8. Check for duplicate IDs.
9. Test the questions in the live application after deployment.

Invalid JSON, missing fields, duplicate IDs or incorrect answer values may prevent questions from loading correctly.

---

7. Saved Progress and Browser Storage

Quiz Master uses browser storage to retain supported application preferences and quiz information.

Storage keys used by the application include:

- "quizmasterLanguage"
- "quizmasterMode"
- "quizmasterProgress"
- "quizmasterCurrentSession"
- "quizmasterUsedQuestionIds"
- "quizmasterCompletedRounds"
- "quizmasterReviewAnswers"
- "quizmasterBestScore"
- "quizmasterTotalScore"
- "quizmasterWeeklyScores"
- "quizmasterSettings"
- "quizmasterMusicEnabled"

The exact saved information depends on the current application implementation.

Important storage information

- Saved information is stored in the user's browser.
- Browser storage is not an online account.
- Progress is not automatically synchronized between different devices.
- Clearing site data or browser storage may remove saved progress and preferences.
- Private browsing may not retain data in the same way as normal browsing.

---

8. Progressive Web App (PWA)

Quiz Master includes Progressive Web App support.

Main PWA files

- "manifest.webmanifest"
- "service-worker.js"
- "offline.html"
- "icon-192-4.png"
- "icon-512-3.png"

PWA configuration

The web app manifest defines:

- Application name.
- Short application name.
- Application description.
- Start URL.
- Application scope.
- Display mode.
- Orientation.
- Theme color.
- Background color.
- Application icons.

Service Worker features

The service worker is responsible for supported caching and offline behavior.

The current caching strategy includes:

- Network First for HTML navigation.
- Network First for important quiz and article data.
- Cache First for supported static resources.
- Removal of older application caches when a new cache version activates.
- Offline fallback support.
- Service Worker messaging.

Offline limitations

Offline access depends on which resources have already been successfully cached by the browser.

Some features may require an internet connection, especially when their data has not previously been cached.

After changing important application resources, the service worker cache version should be updated when necessary.

---

9. Website Pages

The project includes the following main pages:

File| Purpose
"index.html"| Main Quiz Master application
"articles.html"| Learning Centre
"about.html"| Application information
"contact.html"| Contact information
"privacy-policy.html"| Privacy information
"terms.html"| Terms and conditions
"offline.html"| Offline fallback page

The pages provide application navigation, educational information and supporting website content.

---

10. Project Structure

The main project structure is organized as follows:

quizmaster-/
│
├── api/
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
├── mythica.mp3
│
├── ads.txt
├── robots.txt
├── sitemap.xml
│
├── readme.md
├── CREDITS.TXT
├── validation-key.txt
│
└── supporting files and folders

The "api/" directory and other supporting files may contain additional project functionality.

---

11. Technologies Used

Technology| Purpose
HTML5| Application structure
CSS3| Layout and visual styling
JavaScript| Quiz engine and interactions
JSON| Quiz questions and article data
Service Workers| Caching and offline fallback
Web App Manifest| PWA configuration
Browser Storage| Supported local preferences and progress
Vercel| Website hosting
GitHub| Source code repository
Google Analytics| Website traffic measurement, where configured

Advertising information

The project contains an "ads.txt" file.

However, the presence of "ads.txt" does not mean advertisements are currently displayed.

The main "index.html" has been prepared without the previous advertisement placements and AdSense display code as part of the advertising-related cleanup.

Any future advertising integration must be reviewed separately and must not interfere with quiz functionality, navigation or educational content.

---

12. Deployment

Quiz Master is hosted on Vercel and its source code is maintained in GitHub.

Live website

https://quizmaster-liard-five.vercel.app/

GitHub repository

https://github.com/mazimpakaisaie7-eng/quizmaster-

Updating the application

1. Open the GitHub repository.
2. Select the file that needs updating.
3. Edit the file carefully.
4. Check the code or JSON syntax.
5. Commit the changes.
6. Allow Vercel to deploy the new version.
7. Open the live website.
8. Test the updated feature.

Important testing after deployment

After updating "questions.json" or "questions.js":

- Open the application.
- Confirm that questions load.
- Check both quiz categories.
- Check English and Kinyarwanda.
- Test answer selection and submission.
- Check score calculation.
- Check the next-question button.
- Check round completion.

After updating "articles.json" or "articles.html":

- Open the Learning Centre.
- Confirm that articles load.
- Test search and category filters.
- Check both languages.
- Open individual articles.

After updating PWA files:

- Check the manifest.
- Check that both icons load.
- Check service worker registration.
- Test online and offline behavior.

---

13. Search Engine and Website Files

The project includes supporting files for website discovery and verification.

File| Purpose
"robots.txt"| Provides crawler access instructions
"sitemap.xml"| Lists website URLs for search engine discovery
"ads.txt"| Advertising authorization information
"validation-key.txt"| Supporting verification file, depending on its configured purpose

These files should contain accurate information and should be kept consistent with the live website.

The presence of a sitemap or verification file does not guarantee search engine indexing or approval by third-party services.

---

14. Privacy and Data

Quiz Master uses browser storage for supported local application information.

Users should understand that:

- Local quiz progress is stored in their browser.
- Clearing browser data may remove saved progress.
- Local progress is not automatically cloud-synchronized.
- Website analytics, when enabled, are subject to the relevant service configuration and privacy policy.

For more information, see:

- "privacy-policy.html"
- "terms.html"

---

15. Educational Purpose and Road Safety Disclaimer

Quiz Master is designed for educational practice and general knowledge improvement.

Road Safety lessons and questions are intended to improve awareness of road signs, traffic rules and responsible road use.

The educational content does not replace:

- Official traffic laws.
- Government publications.
- Professional driving instruction.
- Authorized road safety guidance.

Users should always follow current official regulations and instructions from authorized authorities.

---

16. Contact and Support

For questions, feedback or application-related inquiries:

Email: mazimpakaisaie7@gmail.com

Website: https://quizmaster-liard-five.vercel.app/

---

17. Project Information

Item| Details
Project| Quiz Master 🇷🇼 - Knowledge Quiz
Project Type| Bilingual Educational Web Application
Main Languages| English and Kinyarwanda
Main Categories| Road Safety and General Knowledge
Main Data Files| "questions.json", "articles.json"
Main Engine| "questions.js"
Hosting| Vercel
Source Code| GitHub
Mission| Learn • Play • Improve

---

18. Important Maintenance Guidelines

To keep Quiz Master maintainable:

1. Keep filenames consistent with the files referenced by the application.
2. Do not rename important files without updating their references.
3. Maintain valid JSON syntax.
4. Use unique question and article IDs.
5. Keep the question categories consistent.
6. Maintain English and Kinyarwanda translations.
7. Test changes before considering them complete.
8. Update the service worker cache version when required.
9. Keep the manifest icons and paths accurate.
10. Keep website links and contact information up to date.
11. Avoid adding scripts or external services that interfere with quiz functionality.
12. Review privacy and advertising changes before deployment.

---

19. License and Credits

Quiz Master is an educational project.

Third-party assets, libraries, music and other resources, where used, should be credited according to their respective licenses and permissions.

See "CREDITS.TXT" for project credits.

Do not assume that third-party resources are free to redistribute or reuse without checking their applicable licenses.

---

© Quiz Master 🇷🇼. All rights reserved.

Learn • Play • Improve
