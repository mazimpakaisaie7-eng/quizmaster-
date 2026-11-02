# 🧠 Quiz Master 🇷🇼 - Knowledge Quiz

**Learn • Play • Improve**

Quiz Master is a bilingual educational quiz application
designed to help users improve their knowledge through
interactive quizzes and educational lessons.

The application supports English and Kinyarwanda and
focuses on Road Safety and General Knowledge.

## 🌐 Live Application

- Website: https://quizmaster-liard-five.vercel.app/
- GitHub: https://github.com/mazimpakaisaie7-eng/quizmaster-
- Hosting: Vercel
- Project Type: Educational Web Application
- Languages: English and Kinyarwanda

---

## 1. About Quiz Master

Quiz Master Rwanda is a browser-based educational
application built using HTML, CSS, JavaScript and JSON.

It provides an interactive learning experience through:

- Road Safety quizzes.
- General Knowledge quizzes.
- English and Kinyarwanda language support.
- Randomized multiple-choice questions.
- Timed quiz questions.
- Score calculation.
- Round progression.
- Answer explanations.
- Answer review.
- Saved quiz progress.
- Background music controls.
- Learning Centre articles.
- Progressive Web App support.

The application is designed for educational practice
and knowledge improvement.

---

## 2. Main Features

### 🌍 Bilingual Language Support

Quiz Master supports:

- English (`en`)
- Kinyarwanda (`rw`)

Users can select their preferred language before
starting a quiz.

Question translations are supplied through the
question database where available.

### 📚 Quiz Categories

The application has two main categories.

| Category | Internal Key | Description |
|---|---|---|
| Road Safety | traffic | Road signs, traffic rules and road safety |
| General Knowledge | general | Rwanda, Africa, geography, science, history and other subjects |

Each category maintains its own question usage
and round progression.

### 🎯 Quiz Rules

The current quiz engine configuration is:

| Feature | Configuration |
|---|---|
| Questions per round | 10 |
| Road Safety timer | 60 seconds per question |
| General Knowledge timer | 30 seconds per question |
| Correct answer | 10 points |
| Incorrect answer | 0 points |
| Unanswered question | 0 points |
| Passing score | 70% |

A user must achieve at least 70% to pass a round
and qualify to unlock the next round.

For a standard 10-question round:

| Correct Answers | Score | Result |
|---|---:|---|
| 0–6 | 0–60 | Not passed |
| 7 | 70 | Passed |
| 8 | 80 | Passed |
| 9 | 90 | Passed |
| 10 | 100 | Passed |

Questions are selected randomly.

Previously used question IDs are tracked separately
for each language and category.

Questions may be reused after the available question
pool has been exhausted.

---

## 3. How to Play

1. Open Quiz Master.
2. Select English or Kinyarwanda.
3. Select Road Safety or General Knowledge.
4. Confirm your selection.
5. Press Start Quiz.
6. Read the question.
7. Select an answer.
8. Press Submit Answer.
9. Read the feedback and explanation.
10. Press Next Question to continue.
11. Complete all 10 questions.
12. View your score and results.

Users can also access:

- Continue Quiz.
- Quiz Rounds.
- Review Answers.
- Settings.
- Background Music.
- Share.
- Home navigation.

Available controls depend on the current quiz state.

---

## 4. Learning Centre

Quiz Master includes a separate Learning Centre.

Main files:

- `articles.html`
- `articles.json`

The Learning Centre provides educational lessons
in English and Kinyarwanda.

### Learning Centre Features

- Search lessons.
- Filter by category.
- General Knowledge lessons.
- Road Safety lessons.
- Switch between English and Kinyarwanda.
- Read individual lessons.
- Return to the lesson list.
- Navigate back to Quiz Master.

### Article Database Structure

Articles are stored in `articles.json`.

The main JSON structure contains:

- `version`
- `articles`

Each article should contain:

- `id`
- `category`
- `title`
- `description`
- `content`

Supported categories:

- `general`
- `traffic`

The title, description and content support
English and Kinyarwanda values.

Example:

```json
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
