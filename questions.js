/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   ---------------------------------------------------------
   Compatible with existing index.html
   ---------------------------------------------------------
   - Start Quiz
   - Continue Quiz
   - Quiz Rounds
   - 10 rounds
   - 10 questions per round
   - 20 seconds per question
   - Score system
   - Unlock rounds
   - Retry Round
   - Review Answers
   - Next Question
   - Settings
   - Music
   - Sound effects
   - Share
   - Daily Challenge
   - Achievements
   - Progress saving
   - Safe questions.json loading
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CONFIGURATION
     ========================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 10;
  const UNLOCK_PERCENT = 60;

  const QUESTIONS_FILE = "./questions.json";

  /* =========================================================
     STORAGE KEYS
     ========================================================= */

  const STORAGE = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    selectedRound: "quizmasterSelectedRound",
    completedRounds: "quizmasterCompletedRounds",
    usedQuestions: "quizmasterUsedQuestions",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    premium: "quizmasterPremium",
    daily: "quizmasterDailyChallenge",
    achievements: "quizmasterAchievements"
  };

  /* =========================================================
     STATE
     ========================================================= */

  let allQuestions = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let roundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let streak = 0;
  let bestStreak = 0;

  let timer = null;
  let timeLeft = TIME_PER_QUESTION;

  let quizFinished = false;
  let answerSelected = false;
  let quizStarted = false;

  let reviewData = [];

  let musicEnabled = true;
  let soundEnabled = true;

  let backgroundMusic = null;

  let questionsLoaded = false;
  let initializing = false;

  /* =========================================================
     SHORT DOM HELPERS
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function getElement() {
    const ids = Array.from(arguments);

    for (const id of ids) {
      const element = $(id);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function showElement(element) {
    if (!element) return;

    element.style.display = "";
    element.hidden = false;
  }

  function hideElement(element) {
    if (!element) return;

    element.style.display = "none";
    element.hidden = true;
  }

  function safeParse(value, fallback) {
    try {
      if (!value) return fallback;

      const parsed = JSON.parse(value);

      return parsed;
    } catch (error) {
      return fallback;
    }
  }

  /* =========================================================
     ARRAY HELPERS
     ========================================================= */

  function shuffle(array) {
    const result = Array.isArray(array) ? array.slice() : [];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }

    return result;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  /* =========================================================
     STORAGE HELPERS
     ========================================================= */

  function storageGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return value;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Quiz Master storage error:", error);
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Quiz Master storage remove error:", error);
    }
  }

  function saveJSON(key, value) {
    try {
      storageSet(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save:", key, error);
    }
  }

  function readJSON(key, fallback) {
    return safeParse(storageGet(key, ""), fallback);
  }

  /* =========================================================
     QUESTIONS VALIDATION
     ========================================================= */

  function isValidQuestion(question) {
    if (!question || typeof question !== "object") {
      return false;
    }

    if (typeof question.question !== "string") {
      return false;
    }

    if (!Array.isArray(question.options)) {
      return false;
    }

    if (question.options.length < 2) {
      return false;
    }

    if (question.answer === undefined || question.answer === null) {
      return false;
    }

    return true;
  }

  /* =========================================================
     NORMALIZE QUESTIONS
     ========================================================= */

  function normalizeQuestion(question, index) {
    if (!isValidQuestion(question)) {
      return null;
    }

    const options = question.options
      .map(function (option) {
        return String(option).trim();
      })
      .filter(function (option) {
        return option.length > 0;
      });

    if (options.length < 2) {
      return null;
    }

    let answer = question.answer;

    /*
      Support both:

      "answer": "Kigali"

      and

      "answer": 0
    */

    if (typeof answer === "number") {
      if (answer >= 0 && answer < options.length) {
        answer = options[answer];
      }
    }

    answer = String(answer).trim();

    /*
      Some JSON files may contain an answer that differs
      only by capitalization or spaces.
    */

    const matchingOption = options.find(function (option) {
      return normalizeText(option) === normalizeText(answer);
    });

    if (matchingOption) {
      answer = matchingOption;
    }

    /*
      If answer is still not one of the options,
      try numeric string index.
    */

    if (!options.some(function (option) {
      return normalizeText(option) === normalizeText(answer);
    })) {
      const possibleIndex = Number(answer);

      if (
        Number.isInteger(possibleIndex) &&
        possibleIndex >= 0 &&
        possibleIndex < options.length
      ) {
        answer = options[possibleIndex];
      }
    }

    /*
      Final validation.
    */

    const answerExists = options.some(function (option) {
      return normalizeText(option) === normalizeText(answer);
    });

    if (!answerExists) {
      return null;
    }

    return {
      id: question.id || ("question-" + index),
      question: String(question.question).trim(),
      question_rw:
        typeof question.question_rw === "string"
          ? question.question_rw.trim()
          : "",
      options: options,
      answer: answer,
      category:
        typeof question.category === "string" && question.category.trim()
          ? question.category.trim()
          : "General Knowledge"
    };
  }

  function normalizeQuestions(data) {
    let source = data;

    /*
      Support:

      [
        {...},
        {...}
      ]

      and:

      {
        "questions": [...]
      }
    */

    if (
      source &&
      !Array.isArray(source) &&
      Array.isArray(source.questions)
    ) {
      source = source.questions;
    }

    if (!Array.isArray(source)) {
      throw new Error(
        "questions.json must contain an array of questions."
      );
    }

    const normalized = [];

    source.forEach(function (question, index) {
      const cleanQuestion = normalizeQuestion(question, index);

      if (cleanQuestion) {
        normalized.push(cleanQuestion);
      }
    });

    if (normalized.length === 0) {
      throw new Error(
        "No valid questions were found in questions.json."
      );
    }

    return normalized;
  }

  /* =========================================================
     ERROR SCREEN
     ========================================================= */

  function showError(message) {
    stopTimer();

    const errorMessage = getElement(
      "errorMessage"
    );

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    showScreen("errorScreen");
  }

  /* =========================================================
     SCREEN MANAGEMENT
     ========================================================= */

  function getScreens() {
    return [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "settingsScreen",
      "errorScreen"
    ];
  }

  function showScreen(screenId) {
    const screens = getScreens();

    screens.forEach(function (id) {
      const screen = $(id);

      if (!screen) return;

      if (id === screenId) {
        showElement(screen);
      } else {
        hideElement(screen);
      }
    });

    window.scrollTo(0, 0);
  }

  /* =========================================================
     ROUND PROGRESS
     ========================================================= */

  function getUnlockedRounds() {
    let unlocked = Number(
      storageGet(STORAGE.unlockedRounds, "1")
    );

    if (!Number.isFinite(unlocked)) {
      unlocked = 1;
    }

    unlocked = Math.max(
      1,
      Math.min(TOTAL_ROUNDS, Math.floor(unlocked))
    );

    return unlocked;
  }

  function setUnlockedRounds(value) {
    const safeValue = Math.max(
      1,
      Math.min(TOTAL_ROUNDS, Number(value) || 1)
    );

    storageSet(
      STORAGE.unlockedRounds,
      String(Math.floor(safeValue))
    );
  }

  function getCompletedRounds() {
    return readJSON(
      STORAGE.completedRounds,
      []
    );
  }

  function setCompletedRounds(rounds) {
    const cleanRounds = Array.from(
      new Set(
        rounds
          .map(Number)
          .filter(function (round) {
            return (
              Number.isInteger(round) &&
              round >= 1 &&
              round <= TOTAL_ROUNDS
            );
          })
      )
    ).sort(function (a, b) {
      return a - b;
    });

    saveJSON(
      STORAGE.completedRounds,
      cleanRounds
    );
  }

  function markRoundCompleted(round) {
    const completed = getCompletedRounds();

    if (!completed.includes(round)) {
      completed.push(round);
    }

    setCompletedRounds(completed);

    /*
      Unlock the next round after successful completion.
    */

    if (round < TOTAL_ROUNDS) {
      const nextRound = round + 1;

      if (nextRound > getUnlockedRounds()) {
        setUnlockedRounds(nextRound);
      }
    }
  }

  function getRoundPercentage(correct) {
    return Math.round(
      (correct / QUESTIONS_PER_ROUND) * 100
    );
  }

  /* =========================================================
     USED QUESTIONS
     ========================================================= */

  function getUsedQuestions() {
    return readJSON(
      STORAGE.usedQuestions,
      []
    );
  }

  function saveUsedQuestions(used) {
    saveJSON(
      STORAGE.usedQuestions,
      used
    );
  }

  function questionIdentity(question) {
    if (!question) return "";

    return (
      question.id ||
      normalizeText(question.question)
    );
  }

  function addUsedQuestions(questions) {
    const used = getUsedQuestions();

    questions.forEach(function (question) {
      const id = questionIdentity(question);

      if (id && !used.includes(id)) {
        used.push(id);
      }
    });

    /*
      If the list becomes unnecessarily huge,
      keep only IDs currently relevant.
    */

    if (used.length > allQuestions.length * 2) {
      saveUsedQuestions([]);
    } else {
      saveUsedQuestions(used);
    }
  }

  /* =========================================================
     SELECT QUESTIONS FOR ROUND
     ========================================================= */

  function selectQuestionsForRound(round) {
    if (!allQuestions.length) {
      return [];
    }

    let used = getUsedQuestions();

    let available = allQuestions.filter(function (question) {
      return !used.includes
