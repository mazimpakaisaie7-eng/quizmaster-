🧠 Quiz Master 🇷🇼 — Knowledge Quiz

Learn • Play • Improve

Quiz Master Rwanda is a bilingual educational web application designed to help users improve their knowledge through interactive quizzes, road safety education, and general learning articles.

The application supports English and Kinyarwanda and focuses on two main learning categories:

- 🚦 Road Safety
- 🌍 General Knowledge

Quiz Master combines multiple-choice quizzes, answer feedback, educational explanations, learning articles, local progress storage, and Progressive Web App (PWA) capabilities.

- Live Application: https://quizmaster-liard-five.vercel.app/
- GitHub Repository: https://github.com/mazimpakaisaie7-eng/quizmaster-

---

1. Project Overview

Quiz Master Rwanda is a browser-based educational application built using HTML5, CSS3, JavaScript, and JSON.

The application provides an accessible learning environment where users can:

- Practice general knowledge.
- Learn about road signs and road safety.
- Answer interactive multiple-choice questions.
- Receive feedback on submitted answers.
- Read educational explanations.
- Review supported previous quiz answers.
- Track supported quiz progress.
- Explore bilingual educational articles.
- Use supported application features on mobile and desktop browsers.

The project is designed to provide a responsive web experience and includes PWA functionality for supported installation and offline access.

Main Objectives

1. Improve general knowledge through interactive learning.
2. Promote road safety awareness.
3. Provide educational resources in English and Kinyarwanda.
4. Encourage continuous learning and practice.
5. Make educational content accessible through a web application.
6. Provide a user-friendly experience on mobile and desktop devices.
7. Support offline access to previously cached application resources.

---

2. Project Information

Item| Details
Project Name| Quiz Master 🇷🇼 — Knowledge Quiz
Project Type| Bilingual Educational Web Application
Live Website| https://quizmaster-liard-five.vercel.app/
GitHub Repository| https://github.com/mazimpakaisaie7-eng/quizmaster-
Hosting Platform| Vercel
Main Languages| English and Kinyarwanda
Main Categories| Road Safety and General Knowledge
Quiz Engine| "questions.js"
Question Database| "questions.json"
Learning Centre| "articles.html"
Article Database| "articles.json"
PWA Manifest| "manifest.webmanifest"
Service Worker| "service-worker.js"

---

3. Main Application Features

3.1 Bilingual Language Support

Quiz Master supports two languages:

- English ("en")
- Kinyarwanda ("rw")

Users can select their preferred language through the application interface.

The bilingual structure supports the presentation of:

- Quiz questions.
- Answer options.
- Answer feedback.
- Educational explanations.
- Learning Centre articles.
- Supported application messages and labels.

The availability of a translation depends on the language fields provided in the relevant question or article data.

3.2 Quiz Categories

The application provides two main quiz categories.

Category| Internal Key| Main Topics
Road Safety| "traffic"| Road signs, traffic lights, road markings, traffic regulations and safe road use
General Knowledge| "general"| Rwanda, Africa, geography, science, history and other educational subjects

Each category uses the question-selection and progression logic supported by the quiz engine.

3.3 Quiz Configuration

The standard quiz configuration is:

Feature| Configuration
Questions per standard round| 10
Road Safety question time| 60 seconds
General Knowledge question time| 30 seconds
Correct answer| 10 points
Incorrect answer| 0 points
Unanswered question| 0 points
Passing percentage| 70%

For a standard round of 10 questions:

Correct Answers| Score| Result
0| 0%| Not passed
1| 10%| Not passed
2| 20%| Not passed
3| 30%| Not passed
4| 40%| Not passed
5| 50%| Not passed
6| 60%| Not passed
7| 70%| Passed
8| 80%| Passed
9| 90%| Passed
10| 100%| Passed

A score of at least 70% is required to pass a standard 10-question round.

3.4 Question Selection and Randomization

The quiz engine supports question-selection features such as:

- Random question selection.
- Randomized answer-option order.
- Tracking previously used question IDs.
- Category-based question selection.
- Avoiding unnecessary repetition while unused valid questions remain.
- Reusing questions when the available question pool has been exhausted.

The number of available questions depends on the valid records stored in "questions.json".

3.5 Answer Submission and Feedback

The quiz workflow includes:

1. Displaying a question.
2. Selecting an answer.
3. Submitting the selected answer.
4. Processing the answer.
5. Displaying supported feedback.
6. Showing an educational explanation where available.
7. Moving to the next question.

Selecting an answer and submitting it are separate actions.

3.6 Results and Answer Review

The quiz system supports result and review functionality, including:

- Final round score.
- Correct-answer count.
- Incorrect-answer count.
- Passing or non-passing result.
- Review of supported submitted answers.
- Correct-answer information.
- Educational explanations where available.

The information displayed depends on the current quiz session and the available question data.

---

4. How to Play

1. Open the Quiz Master website.
2. Select English or Kinyarwanda.
3. Choose Road Safety or General Knowledge.
4. Confirm the selected language and category.
5. Press Start Quiz.
6. Read the displayed question.
7. Select one answer from the available options.
8. Press Submit Answer.
9. Read the answer feedback and explanation.
10. Press Next Question.
11. Continue until the round is completed.
12. View the final result and score.

Depending on the current application state, users may also access additional features such as:

- Continue Quiz.
- Quiz Rounds.
- My Progress.
- Review Answers.
- Settings.
- Music Settings.
- Learning Centre.
- About.
- Contact and Help.
- Share Quiz Master.

The availability of individual actions depends on the current application implementation and saved session state.

---

5. Application Navigation and User Features

My Progress and Quiz Rounds

The progress system is designed to display supported information about quiz activity, such as:

- Current round.
- Completed rounds.
- Best score.
- Total score.
- Category progression.
- Available quiz rounds.
- Saved progress information.

Continue Quiz

Where a resumable quiz session has been saved, users can continue from the supported saved session state.

Review Answers

Users can access supported answer-review information from previous quiz activity.

Settings

The settings section provides access to application preferences supported by the current implementation.

Music Settings

Quiz Master includes a music resource named "mythica.mp3".

The application supports music-related controls and a saved music preference where configured.

Share Quiz Master

The application includes a sharing feature intended to help users share the website.

Supported sharing behavior may include native browser sharing or copying the application link, depending on browser capabilities.

About and Contact

The project includes supporting information and contact pages.

---

6. Learning Centre

Quiz Master includes a separate educational section called the Learning Centre.

Main files:

- "articles.html"
- "articles.json"

The Learning Centre provides educational content in English and Kinyarwanda.

Learning Centre Features

The article system is designed to support:

- Browsing educational articles.
- Searching available lessons.
- Filtering articles by category where implemented.
- Reading General Knowledge lessons.
- Reading Road Safety lessons.
- Displaying supported English and Kinyarwanda content.
- Opening individual articles.
- Navigating back to the main application.

Supported Article Categories

Category| Internal Key
General Knowledge| "general"
Road Safety| "traffic"

Article Database

Educational article data is stored in "articles.json".

The database contains a version field and an articles collection. Article records use the structure expected by the current Learning Centre implementation.

Common article information includes:

- Article ID.
- Category.
- Title.
- Description.
- Content.
- English and Kinyarwanda translations.

The exact accepted structure must remain consistent with the rendering logic in "articles.html".

Illustrative Article Example

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

This is an illustrative example. New articles must follow the exact data structure and rendering requirements of the current "articles.html" implementation.

---

7. Question Database and Quiz Engine

The quiz system uses two main files:

- "questions.json"
- "questions.js"

7.1 questions.json

This file stores the quiz question database.

It contains information needed by the quiz engine, including:

- Question IDs.
- Question categories.
- English question statements.
- Kinyarwanda question statements.
- Answer options.
- Correct answers.
- Supported translations.
- Educational explanations.
- Optional image information where supported.

7.2 questions.js

This file contains the JavaScript quiz engine and application logic.

Its responsibilities include supported operations for:

- Loading question data.
- Reading JSON question records.
- Validating question information.
- Preparing valid questions.
- Selecting questions for quiz rounds.
- Randomizing question and answer-option order.
- Managing quiz state.
- Displaying questions and answer options.
- Handling answer selection.
- Processing submitted answers.
- Calculating scores.
- Managing question progression.
- Managing supported round progression.
- Saving supported quiz information.
- Managing answer-review information.
- Supporting English and Kinyarwanda.
- Handling quiz timers.
- Managing supported music preferences and application interactions.

7.3 Main Question Categories

Question records use these internal category values:

[
  "traffic",
  "general"
]

7.4 Question Data Requirements

Question records should follow the fields and validation rules expected by the current quiz engine.

Field| Requirement
"id"| Unique question identifier
"category"| "traffic" or "general"
"question"| English question statement
"options"| Four answer options
"answer"| Correct answer matching one of the options
"question_rw"| Kinyarwanda question where supported
"options_rw"| Kinyarwanda answer options where supported
Explanation fields| Educational explanations where supported
Image fields| Optional, where supported by the engine

The exact accepted field names and validation rules are determined by the current "questions.js" implementation.

7.5 Adding New Questions

Before adding questions:

1. Give every question a unique ID.
2. Use the correct category key.
3. Provide four answer options.
4. Make sure the correct answer matches one of the options.
5. Provide accurate English and Kinyarwanda content.
6. Include educational explanations where supported.
7. Check JSON syntax.
8. Check for duplicate IDs.
9. Confirm that required fields are present.
10. Test the questions after deployment.

Invalid JSON syntax, missing fields, duplicate IDs, unsupported categories, or incorrect answer values may cause questions to be rejected or fail to load.

---

8. Browser Storage and Saved Progress

Quiz Master uses browser storage to retain supported application preferences and quiz information.

The application has used storage keys including:

Storage Key| Purpose
"quizmasterLanguage"| Selected language
"quizmasterMode"| Selected quiz category or mode
"quizmasterProgress"| Supported progress information
"quizmasterCurrentSession"| Current quiz session
"quizmasterUsedQuestionIds"| Previously used question IDs
"quizmasterCompletedRounds"| Completed round information
"quizmasterReviewAnswers"| Answer-review information
"quizmasterBestScore"| Best score information
"quizmasterTotalScore"| Total score information
"quizmasterMusicEnabled"| Music preference

The exact information stored depends on the current quiz engine implementation.

Important Storage Information

- Saved information is stored in the user's browser.
- Browser storage is not the same as an online user account.
- Progress is not automatically synchronized between different devices.
- Clearing browser site data may remove saved progress and preferences.
- Private browsing may handle saved data differently.
- Different browsers may maintain separate storage.

Users should avoid clearing application storage unless they understand that saved progress may be lost.

---

9. Progressive Web App (PWA)

Quiz Master includes Progressive Web App functionality.

Main PWA files:

- "manifest.webmanifest"
- "service-worker.js"
- "offline.html"
- "icon-192-4.png"
- "icon-512-3.png"

9.1 Web App Manifest

The "manifest.webmanifest" file provides application information used by compatible browsers.

It defines settings such as:

- Application name.
- Short application name.
- Application description.
- Language and text direction.
- Start URL.
- Application scope.
- Display mode.
- Orientation.
- Theme color.
- Background color.
- Application icons.
- Application categories.

The manifest references the application icons:

- "icon-192-4.png"
- "icon-512-3.png"

9.2 Service Worker

The "service-worker.js" file manages supported caching and offline behavior.

Its responsibilities include:

- Caching important application resources.
- Supporting offline access to previously cached pages.
- Providing an offline fallback.
- Managing HTML navigation requests.
- Managing quiz and article data caching.
- Caching the JavaScript quiz engine.
- Caching supported static resources.
- Updating application caches when the cache version changes.
- Removing older Quiz Master caches.
- Handling supported Service Worker messages.

9.3 Caching Strategies

The Service Worker is configured to use strategies such as:

Resource Type| Strategy| Purpose
HTML navigation| Network First| Prefer the latest page from the server
"questions.json"| Network First| Prefer updated quiz questions
"questions.js"| Network First| Prefer the latest quiz engine
"articles.json"| Network First| Prefer updated article data
Static resources| Cache First| Reuse previously cached resources
Offline page| Cached fallback| Provide an offline navigation fallback

The exact behavior depends on the deployed Service Worker version and the browser's cache state.

9.4 Offline Limitations

Offline functionality depends on resources that were successfully cached by the browser.

This means:

- Previously cached pages may remain available offline.
- Previously cached question data may be available offline.
- Previously cached article data may be available offline.
- Resources that were never cached may require an internet connection.
- External services and analytics may not work offline.
- Clearing browser storage may remove cached resources.

A successful offline experience should be tested on the deployed website.

9.5 Cache Version Maintenance

When important application resources change, the Service Worker cache version should be updated when necessary.

This helps the browser recognize a new application cache and replace older cached resources.

---

10. Website Pages

The project includes the following main website pages:

File| Purpose
"index.html"| Main Quiz Master application
"articles.html"| Learning Centre
"about.html"| Application information
"contact.html"| Contact and support information
"privacy-policy.html"| Privacy information
"terms.html"| Terms and conditions
"offline.html"| Offline fallback page

These pages provide the main application interface, educational content, and supporting website information.

---

11. Project Structure

The main project structure is organized as follows:

quizmaster-/
│
├── api/
│   └── Additional API-related functionality, where configured
│
├── index.html
│   └── Main Quiz Master application
│
├── questions.js
│   └── Quiz engine and application logic
│
├── questions.json
│   └── Quiz question database
│
├── articles.html
│   └── Learning Centre interface
│
├── articles.json
│   └── Educational article database
│
├── about.html
│   └── About the application
│
├── contact.html
│   └── Contact and support information
│
├── privacy-policy.html
│   └── Privacy information
│
├── terms.html
│   └── Terms and conditions
│
├── offline.html
│   └── Offline fallback page
│
├── service-worker.js
│   └── PWA caching and offline management
│
├── manifest.webmanifest
│   └── PWA application configuration
│
├── icon-192-4.png
│   └── 192 × 192 application icon
│
├── icon-512-3.png
│   └── 512 × 512 application icon
│
├── mythica.mp3
│   └── Application music resource
│
├── ads.txt
│   └── Advertising authorization information
│
├── robots.txt
│   └── Search engine crawler instructions
│
├── sitemap.xml
│   └── Website URL sitemap
│
├── readme.md
│   └── Project documentation
│
├── CREDITS.TXT
│   └── Third-party resource credits
│
├── validation-key.txt
│   └── Supporting verification file, where configured
│
└── Additional supporting files and folders

The "api/" directory and other supporting files may contain additional functionality depending on the current project configuration.

---

12. Technologies Used

Technology| Purpose
HTML5| Application page structure
CSS3| Layout, styling and responsive design
JavaScript| Quiz engine and application interactions
JSON| Quiz questions and educational article data
Browser Storage| Local preferences and supported progress
Service Workers| Resource caching and offline support
Web App Manifest| PWA configuration
Progressive Web App| Installable web application capabilities
GitHub| Source code management
Vercel| Website hosting and deployment
Google Analytics| Website traffic measurement, where configured

---

13. Advertising and Analytics

13.1 Advertising Information

The project includes an "ads.txt" file for advertising authorization information.

The intended advertising configuration is:

- AdSense display placement on the main homepage only.
- No AdSense display placements in the Learning Centre.
- No advertising placements inside quiz questions or answer controls.
- Advertising should not interfere with quiz functionality or educational content.

The presence of "ads.txt" does not mean that advertisements are currently being displayed or that an advertising account has been approved.

Advertising display depends on the actual deployed code, account configuration, and the advertising provider's policies.

Google makes the final decision on account and website approval. This project documentation does not guarantee approval.

13.2 Google Analytics

The reported Google Analytics measurement ID is:

"G-3FP8R0NDZN"

Analytics reporting depends on whether the tracking code is currently configured, deployed, and operating correctly.

The presence of an Analytics ID in project documentation does not independently confirm that data is being collected.

---

14. Search Engine and Website Verification Files

Quiz Master includes supporting files for search engine discovery and website verification.

File| Purpose
"robots.txt"| Provides crawler access instructions
"sitemap.xml"| Lists website URLs for search engine discovery
"ads.txt"| Provides advertising authorization information
"validation-key.txt"| Supports verification where configured

These files should contain accurate information that matches the live website.

A sitemap, robots file, or verification file does not guarantee indexing, ranking, verification, or approval by an external service.

---

15. Deployment and Hosting

Quiz Master is maintained in GitHub and hosted on Vercel.

Live Website

https://quizmaster-liard-five.vercel.app/

GitHub Repository

https://github.com/mazimpakaisaie7-eng/quizmaster-

Updating the Application

1. Open the GitHub repository.
2. Find the file that needs updating.
3. Open the file editor.
4. Make the required changes.
5. Check the code or JSON syntax.
6. Commit the changes.
7. Allow Vercel to process the deployment.
8. Open the live application.
9. Test the updated functionality.

Deployment Testing

After updating "questions.json" or "questions.js":

- Confirm that the question database loads.
- Check Road Safety questions.
- Check General Knowledge questions.
- Test English and Kinyarwanda.
- Test answer selection.
- Test answer submission.
- Check answer feedback.
- Check score calculation.
- Test the next-question action.
- Check round completion.
- Test supported progress saving.

After updating "articles.json" or "articles.html":

- Open the Learning Centre.
- Confirm that articles load.
- Test article search where implemented.
- Test category filters where implemented.
- Check English and Kinyarwanda.
- Open individual articles.
- Check navigation back to the main application.

After updating PWA files:

- Check "manifest.webmanifest".
- Confirm that both icons load.
- Check Service Worker registration.
- Check the active cache version.
- Test online behavior.
- Test offline behavior.
- Confirm that the offline fallback is available.

---

16. Privacy and Data Handling

Quiz Master uses browser storage for supported local application preferences and quiz information.

Users should understand that:

- Quiz progress may be stored locally in their browser.
- Local progress is not automatically synchronized to an online account.
- Clearing browser data may remove saved progress.
- Different devices and browsers may have separate saved data.
- Website analytics, when enabled, depend on the relevant service configuration.
- External services may have their own privacy and data-handling policies.

For further information, users should consult:

- "privacy-policy.html"
- "terms.html"

The published Privacy Policy should accurately describe the services and data collection mechanisms actually used by the deployed application.

---

17. Educational Purpose and Road Safety Disclaimer

Quiz Master is intended for educational practice and general knowledge improvement.

Road Safety questions and articles are designed to improve awareness of:

- Road signs.
- Traffic lights.
- Road markings.
- Traffic regulations.
- Pedestrian safety.
- Responsible road use.
- General road safety practices.

The educational information provided by the application does not replace:

- Official traffic laws.
- Government publications.
- Professional driving instruction.
- Authorized road safety guidance.
- Current instructions from relevant authorities.

Users should always follow applicable laws and official instructions.

---

18. Contact and Support

For application-related questions, feedback, or support:

Email: mazimpakaisaie7@gmail.com

Website: https://quizmaster-liard-five.vercel.app/

GitHub: https://github.com/mazimpakaisaie7-eng/quizmaster-

---

19. Maintenance Guidelines

To keep Quiz Master reliable and maintainable:

1. Keep filenames consistent with application references.
2. Do not rename important files without updating their references.
3. Maintain valid JSON syntax.
4. Use unique question IDs.
5. Use unique article IDs.
6. Keep question categories consistent.
7. Maintain accurate English and Kinyarwanda translations.
8. Ensure every question has four answer options.
9. Ensure correct answers match the available options.
10. Test question loading after database changes.
11. Test Learning Centre functionality after article changes.
12. Keep PWA manifest paths accurate.
13. Keep application icons available at their referenced paths.
14. Update the Service Worker cache version when necessary.
15. Test offline functionality after PWA changes.
16. Keep website links and contact information up to date.
17. Review privacy changes when introducing new services.
18. Review advertising changes separately.
19. Avoid scripts that interfere with quiz functionality.
20. Test important features after every production deployment.

---

20. License and Credits

Quiz Master is an educational project.

Third-party libraries, images, music, fonts, and other resources used in the project should be credited according to their applicable licenses and permissions.

Refer to:

"CREDITS.TXT"

for project credits and relevant third-party resource information.

Do not assume that third-party resources are free to redistribute, modify, or reuse without checking their applicable licenses.

---

21. Project Summary

Item| Details
Project| Quiz Master 🇷🇼 — Knowledge Quiz
Main Purpose| Educational learning and quiz practice
Project Type| Bilingual Web Application
Supported Languages| English and Kinyarwanda
Main Categories| Road Safety and General Knowledge
Standard Round| 10 questions
Road Safety Timer| 60 seconds
General Knowledge Timer| 30 seconds
Correct Answer| 10 points
Passing Score| 70%
Question Database| "questions.json"
Quiz Engine| "questions.js"
Learning Centre| "articles.html"
Article Database| "articles.json"
PWA Manifest| "manifest.webmanifest"
Service Worker| "service-worker.js"
Offline Page| "offline.html"
Hosting| Vercel
Source Code| GitHub
Main Mission| Learn • Play • Improve

---

22. Project Mission

Quiz Master 🇷🇼 aims to make learning more accessible through interactive quizzes and bilingual educational resources.

By combining Road Safety education, General Knowledge, answer feedback, learning articles, and supported offline capabilities, the project seeks to encourage continuous learning and responsible knowledge sharing.

Learn • Play • Improve

---

© Quiz Master 🇷🇼. All rights reserved.
