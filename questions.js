
/* =========================================================
   🇷🇼 QUIZ MASTER — COMPLETE QUIZ ENGINE
   Version: 4.1.1

   Compatible with the provided index.html

   Files:
   - ./questions.js
   - ./questions.json
   - ./mythica.mp3
   - ./service-worker.js

   Categories:
   - traffic
   - general

   Features:
   - English and Kinyarwanda
   - JSON loading and validation
   - Detailed question diagnostics
   - Random questions and options
   - 10 questions per round (or fewer if remaining)
   - No question repeats until category pool is exhausted
   - Separate category progress
   - 60 seconds for Traffic
   - 30 seconds for General Knowledge
   - 10 points per correct answer
   - 70% pass mark
   - Saved sessions and progress
   - Review answers
   - Retry and next round
   - Correct sequential round unlocking
   ========================================================= */

(() => {
  "use strict";

  /* =====================================================
     1. CONFIGURATION
  ===================================================== */

  const CONFIG = Object.freeze({
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    PASS_PERCENTAGE: 70,

    STORAGE: {
      LANGUAGE: "quizmasterLanguage",
      MODE: "quizmasterMode",
      PROGRESS: "quizmasterProgress",
      SESSION: "quizmasterCurrentSession",
      USED: "quizmasterUsedQuestionIds",
      COMPLETED: "quizmasterCompletedRounds",
      REVIEW: "quizmasterReviewAnswers",
      BEST: "quizmasterBestScore",
      TOTAL: "quizmasterTotalScore",
      MUSIC: "quizmasterMusicEnabled"
    }
  });

  const LETTERS = ["A", "B", "C", "D"];

  const state = {
    language: "en",
    mode: "general",
    setupConfirmed: false,
    questions: [],
    loaded: false,
    loading: false,
    currentRound: 1,
    currentQuestions: [],
    currentQuestionIndex: 0,
    selectedOption: null,
    answers: [],
    score: 0,
    correctAnswers: 0,
    timer: 0,
    timerInterval: null,
    submitted: false,
    roundFinished: false,

    progress: {
      traffic: {
        completedRounds: [],
        bestScore: 0,
        totalScore: 0,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        bestScore: 0,
        totalScore: 0,
        usedQuestionIds: []
      }
    },

    latestReview: {
      traffic: [],
      general: []
    },

    diagnostics: {
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      traffic: 0,
      general: 0,
      errors: []
    }
  };

  /* =====================================================
     2. DOM HELPERS
  ===================================================== */

  const $ = id => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value ?? "");
  }

  function showElement(id, display = "") {
    const element = $(id);
    if (!element) return;

    element.hidden = false;

    if (element.style.display === "none") {
      element.style.display = display || "block";
    }
  }

  function hideElement(id) {
    const element = $(id);
    if (!element) return;

    element.hidden = true;
    element.style.display = "none";
  }

  function setDisabled(id, disabled) {
    const element = $(id);
    if (element) element.disabled = Boolean(disabled);
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function showError(message) {
    const element = $("setupError");

    if (element) {
      element.textContent = String(message || "");
      element.dataset.type = "error";
    }
  }

  function clearError() {
    const element = $("setupError");

    if (element) {
      element.textContent = "";
      element.dataset.type = "";
    }
  }

  function showMessage(message) {
    setText("homeMessage", message);
  }

  /* =====================================================
     3. SAFE LOCAL STORAGE
  ===================================================== */

  function storageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      console.warn("Storage read failed:", key, error);
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (error) {
      console.warn("Storage save failed:", key, error);
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage removal failed:", key, error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = storageGet(key);
      if (!value) return fallback;
      return JSON.parse(value);
    } catch (error) {
      console.warn("Invalid saved JSON:", key, error);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    return storageSet(key, JSON.stringify(value));
  }

  /* =====================================================
     4. LANGUAGE AND CATEGORY
  ===================================================== */

  function normalizeLanguage(value) {
    return String(value || "").toLowerCase().trim() === "rw"
      ? "rw"
      : "en";
  }

  function normalizeMode(value) {
    const mode = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

    const trafficValues = [
      "traffic",
      "road",
      "roadsafety",
      "trafficrules",
      "roadsafetyrules"
    ];

    const generalValues = [
      "general",
      "generalknowledge",
      "knowledge",
      "generalquiz"
    ];

    if (trafficValues.includes(mode)) return "traffic";
    if (generalValues.includes(mode)) return "general";

    return "";
  }

  function getCategoryName(category = state.mode) {
    if (state.language === "rw") {
      return category === "traffic"
        ? "Amategeko y'umuhanda"
        : "Ubumenyi rusange";
    }

    return category === "traffic"
      ? "Road Safety"
      : "General Knowledge";
  }

  function getLanguageText(english, kinyarwanda) {
    return state.language === "rw"
      ? (kinyarwanda || english || "")
      : (english || kinyarwanda || "");
  }

  /* =====================================================
     5. PROGRESS DATA
  ===================================================== */

  function createEmptyProgress() {
    return {
      traffic: {
        completedRounds: [],
        bestScore: 0,
        totalScore: 0,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        bestScore: 0,
        totalScore: 0,
        usedQuestionIds: []
      }
    };
  }

  function normalizeSavedProgress(raw) {
    const result = createEmptyProgress();

    if (!raw || typeof raw !== "object") return result;

    ["traffic", "general"].forEach(category => {
      const source = raw[category];
      if (!source || typeof source !== "object") return;

      result[category].completedRounds =
        Array.isArray(source.completedRounds)
          ? [...new Set(
              source.completedRounds
                .map(Number)
                .filter(number =>
                  Number.isInteger(number) && number > 0
                )
            )]
          : [];

      result[category].bestScore =
        Math.max(0, safeNumber(source.bestScore));

      result[category].totalScore =
        Math.max(0, safeNumber(source.totalScore));

      result[category].usedQuestionIds =
        Array.isArray(source.usedQuestionIds)
          ? [...new Set(source.usedQuestionIds.map(String))]
          : [];
    });

    return result;
  }

  function loadSavedState() {
    state.language = normalizeLanguage(
      storageGet(CONFIG.STORAGE.LANGUAGE, "en")
    );

    state.mode = normalizeMode(
      storageGet(CONFIG.STORAGE.MODE, "general")
    ) || "general";

    state.progress = normalizeSavedProgress(
      readJSON(CONFIG.STORAGE.PROGRESS, null)
    );

    const reviews = readJSON(CONFIG.STORAGE.REVIEW, {});

    if (reviews && typeof reviews === "object") {
      state.latestReview.traffic =
        Array.isArray(reviews.traffic) ? reviews.traffic : [];

      state.latestReview.general =
        Array.isArray(reviews.general) ? reviews.general : [];
    }

    const legacyBest = safeNumber(
      storageGet(CONFIG.STORAGE.BEST, "0")
    );

    const legacyTotal = safeNumber(
      storageGet(CONFIG.STORAGE.TOTAL, "0")
    );

    const legacyUsed = readJSON(CONFIG.STORAGE.USED, []);

    const legacyCompleted = readJSON(
      CONFIG.STORAGE.COMPLETED,
      {}
    );

    const category = state.mode;

    state.progress[category].bestScore = Math.max(
      state.progress[category].bestScore,
      legacyBest
    );

    state.progress[category].totalScore = Math.max(
      state.progress[category].totalScore,
      legacyTotal
    );

    if (Array.isArray(legacyUsed)) {
      state.progress[category].usedQuestionIds = [
        ...new Set([
          ...state.progress[category].usedQuestionIds,
          ...legacyUsed.map(String)
        ])
      ];
    }

    if (
      legacyCompleted &&
      typeof legacyCompleted === "object" &&
      Array.isArray(legacyCompleted[category])
    ) {
      state.progress[category].completedRounds = [
        ...new Set([
          ...state.progress[category].completedRounds,
          ...legacyCompleted[category]
            .map(Number)
            .filter(number => Number.isInteger(number) && number > 0)
        ])
      ];
    }

    saveProgress();
  }

  function saveProgress() {
    saveJSON(CONFIG.STORAGE.PROGRESS, state.progress);
    saveJSON(CONFIG.STORAGE.REVIEW, state.latestReview);

    storageSet(CONFIG.STORAGE.LANGUAGE, state.language);
    storageSet(CONFIG.STORAGE.MODE, state.mode);

    const progress = state.progress[state.mode];

    storageSet(CONFIG.STORAGE.BEST, progress.bestScore);
    storageSet(CONFIG.STORAGE.TOTAL, progress.totalScore);

    saveJSON(CONFIG.STORAGE.USED, progress.usedQuestionIds);

    saveJSON(CONFIG.STORAGE.COMPLETED, {
      traffic: state.progress.traffic.completedRounds,
      general: state.progress.general.completedRounds
    });
  }

  /* =====================================================
     6. QUESTION DATA EXTRACTION
  ===================================================== */

  function extractQuestionArray(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    if (Array.isArray(data.questions)) return data.questions;
    if (Array.isArray(data.data)) return data.data;

    if (
      Array.isArray(data.traffic) ||
      Array.isArray(data.general)
    ) {
      return [
        ...(Array.isArray(data.traffic) ? data.traffic : []),
        ...(Array.isArray(data.general) ? data.general : [])
      ];
    }

    return [];
  }

  function getQuestionText(raw) {
    return raw.question ?? raw.question_en ?? raw.text ?? "";
  }

  function getKinyarwandaQuestion(raw) {
    return (
      raw.question_rw ??
      raw.question_kinyarwanda ??
      raw.text_rw ??
      ""
    );
  }

  function getOptions(raw, language) {
    const candidates = language === "rw"
      ? [
          raw.options_rw,
          raw.options_kinyarwanda,
          raw.options
        ]
      : [
          raw.options,
          raw.options_en
        ];

    let options = candidates.find(Array.isArray);

    if (
      !options &&
      raw.options &&
      typeof raw.options === "object" &&
      !Array.isArray(raw.options)
    ) {
      options = Object.keys(raw.options)
        .sort()
        .map(key => raw.options[key]);
    }

    if (!Array.isArray(options)) return [];

    return options.map(option => String(option ?? "").trim());
  }

  /* =====================================================
     7. FIND CORRECT ANSWER
  ===================================================== */

  function findAnswerIndex(raw, englishOptions, rwOptions) {
    const zeroBasedFields = [
      raw.answerIndex,
      raw.correctIndex
    ];

    for (const value of zeroBasedFields) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      const number = Number(value);

      if (
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 3
      ) {
        return number;
      }
    }

    const answerFields = [
      raw.answer,
      raw.correctAnswer,
      raw.correct_answer,
      raw.answer_en,
      raw.answer_rw,
      raw.correct
    ];

    for (const value of answerFields) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value === "number") {
        if (Number.isInteger(value) && value === 0) return 0;
        if (Number.isInteger(value) && value >= 1 && value <= 4) {
          return value - 1;
        }
      }

      const text = String(value).trim();

      const letter = text.match(/^([A-D])$/i);

      if (letter) {
        return LETTERS.indexOf(letter[1].toUpperCase());
      }

      const numeric = text.match(/^([1-4])$/);

      if (numeric) return Number(numeric[1]) - 1;

      const englishIndex = englishOptions.findIndex(option =>
        option.toLowerCase() === text.toLowerCase()
      );

      if (englishIndex !== -1) return englishIndex;

      const rwIndex = rwOptions.findIndex(option =>
        option.toLowerCase() === text.toLowerCase()
      );

      if (rwIndex !== -1) return rwIndex;
    }

    return -1;
  }

  /* =====================================================
     8. NORMALIZE AND VALIDATE QUESTIONS
  ===================================================== */

  function normalizeQuestion(raw, index) {
    const errors = [];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        question: null,
        errors: ["Question must be a JSON object."]
      };
    }

    const id = String(
      raw.id ?? `question_${index + 1}`
    ).trim();

    if (!id) errors.push("Missing question ID.");

    const category = normalizeMode(
      raw.category ?? raw.mode ?? raw.type
    );

    if (!category) {
      errors.push("Category must be traffic or general.");
    }

    const questionEn = String(getQuestionText(raw)).trim();
    const questionRw = String(getKinyarwandaQuestion(raw)).trim();

    if (!questionEn && !questionRw) {
      errors.push("Missing question text.");
    }

    const englishOptions = getOptions(raw, "en");
    const rwOptions = getOptions(raw, "rw");

    if (englishOptions.length !== 4) {
      errors.push(
        `English options must contain exactly 4 choices; found ${englishOptions.length}.`
      );
    }

    if (
      englishOptions.length === 4 &&
      englishOptions.some(option => !option)
    ) {
      errors.push("English options contain an empty choice.");
    }

    if (
      englishOptions.length === 4 &&
      new Set(englishOptions.map(option => option.toLowerCase())).size !== 4
    ) {
      errors.push("English options contain duplicate choices.");
    }

    if (rwOptions.length !== 0 && rwOptions.length !== 4) {
      errors.push(
        "Kinyarwanda options must contain exactly 4 choices, or be omitted."
      );
    }

    if (
      rwOptions.length === 4 &&
      rwOptions.some(option => !option)
    ) {
      errors.push("Kinyarwanda options contain an empty choice.");
    }

    if (
      rwOptions.length === 4 &&
      new Set(rwOptions.map(option => option.toLowerCase())).size !== 4
    ) {
      errors.push("Kinyarwanda options contain duplicate choices.");
    }

    const usableRwOptions = rwOptions.length === 4
      ? rwOptions
      : englishOptions;

    const correctIndex = findAnswerIndex(
      raw,
      englishOptions,
      usableRwOptions
    );

    if (correctIndex < 0 || correctIndex > 3) {
      errors.push(
        "Correct answer does not match any of the four options."
      );
    }

    if (errors.length) {
      return {
        question: null,
        errors
      };
    }

    return {
      question: {
        id,
        category,
        question: questionEn || questionRw,
        question_rw: questionRw || questionEn,
        options: englishOptions,
        options_rw: usableRwOptions,
        answerIndex: correctIndex,
        answer: englishOptions[correctIndex],
        answer_rw: usableRwOptions[correctIndex],

        explanation: String(
          raw.explanation ?? raw.explanation_en ?? ""
        ),

        explanation_rw: String(
          raw.explanation_rw ??
          raw.explanation_kinyarwanda ??
          raw.explanation ??
          ""
        ),

        image: String(raw.image ?? raw.image_url ?? "")
      },

      errors: []
    };
  }

  /* =====================================================
     9. LOAD QUESTIONS.JSON
  ===================================================== */

  async function loadQuestions() {
    if (state.loading) return;

    state.loading = true;
    state.loaded = false;

    showMessage("Loading questions...");
    clearError();

    setDisabled("startBtn", true);
    setDisabled("confirmSetupBtn", true);

    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Could not load questions.json. HTTP ${response.status}. Check that questions.json is in the project root.`
        );
      }

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error("questions.json is empty.");
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error(
          `Invalid JSON syntax: ${error.message}`
        );
      }

      const rawQuestions = extractQuestionArray(data);

      if (!rawQuestions.length) {
        throw new Error(
          "No question array found. Check the structure of questions.json."
        );
      }

      const normalized = [];
      const seenIds = new Set();

      let invalidCount = 0;
      let duplicateCount = 0;

      const errors = [];

      rawQuestions.forEach((raw, index) => {
        const result = normalizeQuestion(raw, index);

        if (!result.question) {
          invalidCount++;

          errors.push({
            index: index + 1,
            id: raw && raw.id ? String(raw.id) : "Unknown ID",
            reasons: result.errors
          });

          return;
        }

        if (seenIds.has(result.question.id)) {
          duplicateCount++;

          errors.push({
            index: index + 1,
            id: result.question.id,
            reasons: ["Duplicate question ID."]
          });

          return;
        }

        seenIds.add(result.question.id);
        normalized.push(result.question);
      });

      const trafficCount = normalized.filter(
        question => question.category === "traffic"
      ).length;

      const generalCount = normalized.filter(
        question => question.category === "general"
      ).length;

      state.diagnostics = {
        total: rawQuestions.length,
        valid: normalized.length,
        invalid: invalidCount,
        duplicates: duplicateCount,
        traffic: trafficCount,
        general: generalCount,
        errors
      };

      if (!normalized.length) {
        console.error("No valid questions:", state.diagnostics);

        throw new Error(
          `No valid questions found. Invalid: ${invalidCount}. Duplicates: ${duplicateCount}. Check the browser Console for details.`
        );
      }

      state.questions = normalized;
      state.loaded = true;

      ["traffic", "general"].forEach(category => {
        const availableIds = new Set(
          normalized
            .filter(question => question.category === category)
            .map(question => question.id)
        );

        state.progress[category].usedQuestionIds =
          state.progress[category].usedQuestionIds.filter(
            id => availableIds.has(id)
          );
      });

      saveProgress();

      updateHome();
      updateRounds();
      updateReviewButton();
      updateSetupButtons();

      showMessage(
        `Loaded ${normalized.length} questions successfully. Traffic: ${trafficCount}. General: ${generalCount}.`
      );

      if (invalidCount || duplicateCount) {
        showError(
          `${invalidCount} invalid and ${duplicateCount} duplicate questions were skipped. ${normalized.length} valid questions loaded. See browser Console for details.`
        );

        console.warn(
          "Skipped questions:",
          state.diagnostics.errors
        );
      }

      restoreSession();

      console.info(
        "Quiz Master question diagnostics:",
        state.diagnostics
      );

    } catch (error) {
      console.error("Question loading failed:", error);

      state.questions = [];
      state.loaded = false;

      showMessage("Questions could not be loaded.");
      showError(error.message || "Unknown question loading error.");

      updateHome();
      updateSetupButtons();

      document.dispatchEvent(
        new CustomEvent("quizmaster:error", {
          detail: {
            message: error.message || "Question loading failed."
          }
        })
      );

    } finally {
      state.loading = false;

      updateSetupButtons();
      updateHome();
    }
  }

  /* =====================================================
     10. CATEGORY AND ROUND HELPERS
  ===================================================== */

  function getCategoryQuestions(category = state.mode) {
    return state.questions.filter(
      question => question.category === category
    );
  }

  function getTotalRounds(category = state.mode) {
    const count = getCategoryQuestions(category).length;

    return Math.ceil(count / CONFIG.QUESTIONS_PER_ROUND);
  }

  // Return the first round that has not been completed.
  // Do not restart at Round 1 when all rounds are complete.
  function getUnlockedRound(category = state.mode) {
    const completed = state.progress[category].completedRounds;

    let round = 1;

    while (completed.includes(round)) {
      round++;
    }

    return round;
  }

  function getRoundTime() {
    return state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  /* =====================================================
     11. SETUP AND SELECTION
  ===================================================== */

  function updateChoiceButtons() {
    document.querySelectorAll(".language-btn").forEach(button => {
      const selected =
        button.dataset.language === state.language;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      const selected =
        button.dataset.mode === state.mode;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateSummary() {
    const summary = $("selectionSummary");
    if (!summary) return;

    const languageName = state.language === "rw"
      ? "Ikinyarwanda"
      : "English";

    const count = getCategoryQuestions().length;

    summary.textContent =
      `${languageName} • ${getCategoryName()} • ${count} questions available`;
  }

  function updateSetupButtons() {
    const count = getCategoryQuestions().length;
    const totalRounds = getTotalRounds();
    const unlockedRound = getUnlockedRound();

    const canConfirm =
      state.loaded &&
      count > 0 &&
      !state.loading;

    const canStart =
      state.loaded &&
      state.setupConfirmed &&
      count > 0 &&
      !state.loading &&
      unlockedRound <= totalRounds;

    setDisabled("confirmSetupBtn", !canConfirm);
    setDisabled("startBtn", !canStart);

    updateChoiceButtons();
    updateSummary();
  }

  function chooseLanguage(language) {
    state.language = normalizeLanguage(language);
    state.setupConfirmed = false;

    storageSet(CONFIG.STORAGE.LANGUAGE, state.language);

    clearError();

    updateSetupButtons();
    updateHome();
    updateRounds();
  }

  function chooseMode(mode) {
    const normalized = normalizeMode(mode);

    if (!normalized) {
      showError("Please choose a valid category.");
      return;
    }

    state.mode = normalized;
    state.setupConfirmed = false;

    storageSet(CONFIG.STORAGE.MODE, state.mode);

    clearError();

    updateHome();
    updateRounds();
    updateReviewButton();
    updateSetupButtons();
  }

  function confirmSetup() {
    if (!state.loaded) {
      showError("Questions are still loading. Please wait.");
      return;
    }

    const count = getCategoryQuestions().length;

    if (!count) {
      state.setupConfirmed = false;

      showError(
        `There are no valid questions in ${getCategoryName()}. Check the category values in questions.json.`
      );

      updateSetupButtons();
      return;
    }

    if (getUnlockedRound() > getTotalRounds()) {
      showMessage(
        state.language === "rw"
          ? "Warangije rounds zose zo muri iki cyiciro."
          : "You have completed all rounds in this category."
      );

      updateSetupButtons();
      return;
    }

    state.setupConfirmed = true;

    clearError();
    saveProgress();

    showMessage(
      `${count} questions are ready. You can start the quiz.`
    );

    updateSetupButtons();
  }

  /* =====================================================
     12. SCREEN NAVIGATION
  ===================================================== */

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const target = $(screenId);

    if (target) {
      target.classList.add("active");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function goHome() {
    stopTimer();

    if (
      state.currentQuestions.length &&
      !state.roundFinished
    ) {
      saveSession();
    }

    showScreen("homeScreen");

    updateHome();
    updateSetupButtons();
  }

  /* =====================================================
     13. HOME SCREEN
  ===================================================== */

  function updateHome() {
    const category = state.mode;
    const progress = state.progress[category];

    const unlocked = getUnlockedRound(category);
    const total = getTotalRounds(category);

    setText(
      "homeRound",
      total > 0 ? Math.min(unlocked, total) : 0
    );

    setText("homeScore", progress.bestScore);

    const completedCount = progress.completedRounds.length;

    const stars = completedCount > 0
      ? "⭐".repeat(
          Math.min(5, Math.max(1, Math.ceil(completedCount / 2)))
        )
      : "⭐";

    setText("homeStars", stars);

    const session = readJSON(CONFIG.STORAGE.SESSION, null);

    const hasSession =
      session &&
      session.category === category &&
      Array.isArray(session.questions) &&
      session.questions.length > 0;

    if (hasSession) {
      showElement("continueBtn", "block");
    } else {
      hideElement("continueBtn");
    }

    updateSetupButtons();
  }

  /* =====================================================
     14. SAVE AND RESTORE SESSION
  ===================================================== */

  function saveSession() {
    if (
      !state.currentQuestions.length ||
      state.roundFinished
    ) {
      return;
    }

    const session = {
      version: 2,
      category: state.mode,
      language: state.language,
      round: state.currentRound,
      questions: state.currentQuestions,
      currentQuestionIndex: state.currentQuestionIndex,
      selectedOption: state.selectedOption,
      answers: state.answers,
      score: state.score,
      correctAnswers: state.correctAnswers,
      submitted: state.submitted,
      timer: state.timer
    };

    saveJSON(CONFIG.STORAGE.SESSION, session);
  }

  function clearSession() {
    storageRemove(CONFIG.STORAGE.SESSION);
  }

  function restoreSession() {
    const session = readJSON(CONFIG.STORAGE.SESSION, null);

    if (
      !session ||
      !Array.isArray(session.questions) ||
      !session.questions.length ||
      !["traffic", "general"].includes(session.category)
    ) {
      clearSession();
      updateHome();
      return;
    }

    const validIds = new Set(
      state.questions.map(question => question.id)
    );

    const validQuestions = session.questions.every(
      question =>
        question &&
        validIds.has(question.id) &&
        Array.isArray(question.options) &&
        question.options.length === 4
    );

    if (!validQuestions) {
      clearSession();
      updateHome();
      return;
    }

    updateHome();
  }

  function continueQuiz() {
    if (!state.loaded) {
      showError("Questions are still loading.");
      return;
    }

    const session = readJSON(CONFIG.STORAGE.SESSION, null);

    if (
      !session ||
      !Array.isArray(session.questions) ||
      !session.questions.length ||
      !["traffic", "general"].includes(session.category)
    ) {
      clearSession();
      showError("There is no valid saved quiz to continue.");
      updateHome();
      return;
    }

    const validIds = new Set(
      state.questions.map(question => question.id)
    );

    if (
      !session.questions.every(question =>
        question && validIds.has(question.id)
      )
    ) {
      clearSession();

      showError(
        "The saved quiz is no longer compatible with questions.json."
      );

      updateHome();
      return;
    }

    state.mode = session.category;
    state.language = normalizeLanguage(session.language);

    state.currentRound = Math.max(
      1,
      safeNumber(session.round, 1)
    );

    state.currentQuestions = session.questions;

    state.currentQuestionIndex = Math.max(
      0,
      Math.min(
        safeNumber(session.currentQuestionIndex),
        state.currentQuestions.length - 1
      )
    );

    state.selectedOption =
      Number.isInteger(session.selectedOption)
        ? session.selectedOption
        : null;

    state.answers = Array.isArray(session.answers)
      ? session.answers
      : [];

    state.score = Math.max(0, safeNumber(session.score));

    state.correctAnswers = Math.max(
      0,
      safeNumber(session.correctAnswers)
    );

    state.submitted = Boolean(session.submitted);

    state.timer = Math.max(
      0,
      safeNumber(session.timer, getRoundTime())
    );

    state.roundFinished = false;
    state.setupConfirmed = true;

    updateChoiceButtons();
    updateHome();

    showScreen("quizScreen");
    renderQuestion();

    if (!state.submitted && state.timer > 0) {
      startTimer();
    } else if (!state.submitted && state.timer <= 0) {
      handleTimeExpired();
    }
  }

  /* =====================================================
     15. CREATE ROUND QUESTIONS
  ===================================================== */

  function createRoundQuestions() {
    const category = state.mode;
    const allQuestions = getCategoryQuestions(category);

    if (!allQuestions.length) return [];

    const progress = state.progress[category];

    const usedIds = new Set(progress.usedQuestionIds);

    const available = allQuestions.filter(
      question => !usedIds.has(question.id)
    );

    // Do not repeat questions before the pool is exhausted.
    // A completed cycle is reset only when a new cycle is needed.
    if (!available.length) {
      return [];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    selected.forEach(question => {
      progress.usedQuestionIds.push(question.id);
    });

    progress.usedQuestionIds = [
      ...new Set(progress.usedQuestionIds)
    ];

    saveProgress();

    return selected;
  }

  /* =====================================================
     16. START ROUND
  ===================================================== */

  function startRound(round, retryQuestions = null) {
    if (!state.loaded) {
      showError("Questions have not loaded yet.");
      return;
    }

    if (!state.setupConfirmed && !retryQuestions) {
      showError("Please confirm your language and category first.");
      return;
    }

    const requestedRound = Math.max(
      1,
      safeNumber(round, 1)
    );

    const totalRounds = getTotalRounds(state.mode);

    if (!retryQuestions && requestedRound > totalRounds) {
      showMessage(
        state.language === "rw"
          ? "Warangije rounds zose z'iki cyiciro."
          : "You have completed all rounds in this category."
      );

      updateHome();
      updateRounds();
      return;
    }

    const unlocked = getUnlockedRound(state.mode);

    if (
      !retryQuestions &&
      requestedRound !== unlocked
    ) {
      showError(
        "This round is locked or has already been completed."
      );

      return;
    }

    const questions = retryQuestions
      ? [...retryQuestions]
      : createRoundQuestions();

    if (!questions.length) {
      showError(
        "No unused questions are available. Check the question pool."
      );

      return;
    }

    state.currentRound = requestedRound;

    state.currentQuestions = questions.map(question => ({
      ...question
    }));

    state.currentQuestionIndex = 0;
    state.selectedOption = null;
    state.answers = [];
    state.score = 0;
    state.correctAnswers = 0;
    state.timer = getRoundTime();
    state.submitted = false;
    state.roundFinished = false;

    clearSession();
    saveProgress();

    updateNextRoundButton(false);

    showScreen("quizScreen");
    renderQuestion();
    startTimer();
  }

  /* =====================================================
     17. CURRENT QUESTION AND OPTIONS
  ===================================================== */

  function getCurrentQuestion() {
    return state.currentQuestions[
      state.currentQuestionIndex
    ] || null;
  }

  function getDisplayOptions(question) {
    const options = question.options.map((english, index) => ({
      en: english,
      rw: question.options_rw[index] || english,
      originalIndex: index
    }));

    return shuffle(options);
  }

  function getSavedOptionOrder(question) {
    if (!Array.isArray(question._displayOptions)) {
      question._displayOptions = getDisplayOptions(question);
    }

    return question._displayOptions;
  }

  /* =====================================================
     18. RENDER QUESTION
  ===================================================== */

  function renderQuestion() {
    const question = getCurrentQuestion();

    if (!question) {
      finishRound();
      return;
    }

    setText("roundLabel", `Round ${state.currentRound}`);

    setText(
      "questionCounter",
      `Question ${state.currentQuestionIndex + 1}/${state.currentQuestions.length}`
    );

    setText("scoreNumber", state.score);
    setText("categoryIndicator", getCategoryName());

    const questionText = getLanguageText(
      question.question,
      question.question_rw
    );

    setText("questionText", questionText);

    const image = $("questionImage");

    if (image) {
      if (question.image) {
        image.src = question.image;
        image.alt = questionText;
        image.style.display = "block";

        image.onerror = () => {
          image.style.display = "none";
          image.removeAttribute("src");
        };
      } else {
        image.style.display = "none";
        image.removeAttribute("src");
      }
    }

    const container = $("optionsContainer");

    if (!container) {
      console.error("Missing #optionsContainer in index.html.");
      return;
    }

    container.innerHTML = "";

    const options = getSavedOptionOrder(question);

    options.forEach((option, displayIndex) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option";

      const label = document.createElement("strong");
      label.textContent = `${LETTERS[displayIndex]}. `;

      const text = document.createElement("span");
      text.textContent = getLanguageText(option.en, option.rw);

      button.append(label, text);

      if (state.selectedOption === option.originalIndex) {
        button.classList.add("selected");
      }

      if (state.submitted) {
        button.disabled = true;

        if (option.originalIndex === question.answerIndex) {
          button.classList.add("correct");
        }

        if (
          option.originalIndex === state.selectedOption &&
          state.selectedOption !== question.answerIndex
        ) {
          button.classList.add("wrong");
        }
      } else {
        button.addEventListener("click", () => {
          selectAnswer(option.originalIndex);
        });
      }

      container.appendChild(button);
    });

    const progress = (
      (state.currentQuestionIndex + 1) /
      state.currentQuestions.length
    ) * 100;

    const fill = $("progressFill");

    if (fill) {
      fill.style.width = `${progress}%`;
    }

    setText("timer", state.timer);

    updateSubmitButton();

    if (state.submitted) {
      showSubmittedAnswer();
    } else {
      hideElement("answerFeedback");
      hideElement("explanation");
      hideElement("nextQuestionBtn");

      setText("answerFeedback", "");
      setText("explanation", "");
    }

    saveSession();
  }

  /* =====================================================
     19. SELECT ANSWER
  ===================================================== */

  function selectAnswer(index) {
    if (state.submitted || state.roundFinished) return;

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > 3
    ) {
      return;
    }

    state.selectedOption = index;

    renderQuestion();
    saveSession();
  }

  function updateSubmitButton() {
    const button = $("submitAnswerBtn");
    if (!button) return;

    button.disabled =
      state.submitted ||
      state.selectedOption === null;

    button.textContent = state.language === "rw"
      ? "Ohereza igisubizo"
      : "Submit Answer";
  }

  /* =====================================================
     20. ANSWER RECORD
  ===================================================== */

  function createAnswerRecord(question, selectedOption, correct) {
    return {
      id: question.id,
      category: state.mode,
      question: question.question,
      question_rw: question.question_rw,
      options: [...question.options],
      options_rw: [...question.options_rw],
      answerIndex: question.answerIndex,
      selectedOption,
      correct,
      explanation: question.explanation,
      explanation_rw: question.explanation_rw
    };
  }

  /* =====================================================
     21. SUBMIT ANSWER
  ===================================================== */

  function submitAnswer() {
    if (state.submitted || state.roundFinished) return;

    const question = getCurrentQuestion();
    if (!question) return;

    if (state.selectedOption === null) {
      const message = state.language === "rw"
        ? "Banza uhitemo igisubizo."
        : "Please select an answer first.";

      const feedback = $("answerFeedback");

      if (feedback) {
        feedback.textContent = message;
        feedback.style.display = "block";
      }

      return;
    }

    state.submitted = true;

    const correct =
      state.selectedOption === question.answerIndex;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.correctAnswers++;
    }

    const record = createAnswerRecord(
      question,
      state.selectedOption,
      correct
    );

    const existingIndex = state.answers.findIndex(
      answer => answer.id === question.id
    );

    if (existingIndex >= 0) {
      state.answers[existingIndex] = record;
    } else {
      state.answers.push(record);
    }

    stopTimer();
    renderQuestion();
    showSubmittedAnswer();
    saveSession();
  }

  /* =====================================================
     22. SHOW ANSWER FEEDBACK
  ===================================================== */

  function showSubmittedAnswer() {
    const question = getCurrentQuestion();
    if (!question) return;

    const correct =
      state.selectedOption === question.answerIndex;

    const feedback = $("answerFeedback");

    if (feedback) {
      if (state.selectedOption === -1) {
        feedback.textContent = state.language === "rw"
          ? "Igihe cyarangiye! Nta gisubizo wahisemo."
          : "Time is up! No answer was selected.";
      } else if (state.language === "rw") {
        feedback.textContent = correct
          ? "✅ Igisubizo ni cyo! +10 amanota."
          : "❌ Igisubizo si cyo.";
      } else {
        feedback.textContent = correct
          ? "✅ Correct answer! +10 points."
          : "❌ Incorrect answer.";
      }

      feedback.style.display = "block";
    }

    const explanation = getLanguageText(
      question.explanation,
      question.explanation_rw
    );

    const explanationElement = $("explanation");

    if (explanationElement) {
      explanationElement.textContent = explanation
        ? `${state.language === "rw" ? "Ibisobanuro" : "Explanation"}: ${explanation}`
        : "";

      explanationElement.style.display = explanation
        ? "block"
        : "none";
    }

    setDisabled("submitAnswerBtn", true);
    showElement("nextQuestionBtn", "inline-block");

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.textContent =
        state.currentQuestionIndex + 1 >= state.currentQuestions.length
          ? (
              state.language === "rw"
                ? "Reba amanota"
                : "See Results"
            )
          : (
              state.language === "rw"
                ? "Ikibazo gikurikira →"
                : "Next Question →"
            );
    }
  }

  /* =====================================================
     23. NEXT QUESTION
  ===================================================== */

  function nextQuestion() {
    if (!state.submitted) return;

    if (
      state.currentQuestionIndex + 1 >=
      state.currentQuestions.length
    ) {
      finishRound();
      return;
    }

    state.currentQuestionIndex++;
    state.selectedOption = null;
    state.submitted = false;
    state.timer = getRoundTime();

    renderQuestion();
    startTimer();
  }

  /* =====================================================
     24. TIMER
  ===================================================== */

  function startTimer() {
    stopTimer();

    if (state.submitted || state.roundFinished) return;

    if (state.timer <= 0) {
      handleTimeExpired();
      return;
    }

    setText("timer", state.timer);

    state.timerInterval = window.setInterval(() => {
      if (state.submitted || state.roundFinished) {
        stopTimer();
        return;
      }

      state.timer--;

      setText("timer", state.timer);

      const timerBox = $("timerBox");

      if (timerBox) {
        timerBox.classList.toggle(
          "warning",
          state.timer <= 10
        );
      }

      saveSession();

      if (state.timer <= 0) {
        stopTimer();
        handleTimeExpired();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function handleTimeExpired() {
    if (state.submitted || state.roundFinished) return;

    const question = getCurrentQuestion();

    if (!question) {
      finishRound();
      return;
    }

    state.selectedOption = -1;
    state.submitted = true;

    const record = createAnswerRecord(
      question,
      -1,
      false
    );

    const existingIndex = state.answers.findIndex(
      answer => answer.id === question.id
    );

    if (existingIndex >= 0) {
      state.answers[existingIndex] = record;
    } else {
      state.answers.push(record);
    }

    renderQuestion();
    showSubmittedAnswer();
    saveSession();
  }

  /* =====================================================
     25. NEXT ROUND BUTTON
  ===================================================== */

  function updateNextRoundButton(passed) {
    let button =
      $("nextRoundBtn") ||
      $("continueToNextRoundBtn") ||
      $("nextRoundButton");

    if (!button) {
      const resultScreen = $("resultScreen");
      if (!resultScreen) return;

      button = document.createElement("button");
      button.type = "button";
      button.id = "nextRoundBtn";
      button.className = "option";

      const retryButton = $("retryRoundBtn");

      if (retryButton && retryButton.parentNode) {
        retryButton.parentNode.insertBefore(
          button,
          retryButton.nextSibling
        );
      } else {
        resultScreen.appendChild(button);
      }
    }

    const totalRounds = getTotalRounds(state.mode);

    const hasNextRound =
      passed &&
      state.currentRound < totalRounds;

    button.hidden = !hasNextRound;

    if (!hasNextRound) return;

    button.textContent = state.language === "rw"
      ? `Komeza kuri Round ${state.currentRound + 1} →`
      : `Continue to Round ${state.currentRound + 1} →`;

    if (button.dataset.nextRoundBound !== "true") {
      button.addEventListener("click", continueToNextRound);
      button.dataset.nextRoundBound = "true";
    }
  }

  /* =====================================================
     26. FINISH ROUND
  ===================================================== */

  function finishRound() {
    if (state.roundFinished) return;

    state.roundFinished = true;
    stopTimer();

    const total = state.currentQuestions.length;

    if (!total) {
      goHome();
      return;
    }

    const percentage = Math.round(
      (state.correctAnswers / total) * 100
    );

    const passed =
      percentage >= CONFIG.PASS_PERCENTAGE;

    const category = state.mode;
    const progress = state.progress[category];

    if (passed) {
      if (!progress.completedRounds.includes(state.currentRound)) {
        progress.completedRounds.push(state.currentRound);
        progress.completedRounds.sort((a, b) => a - b);
      }
    }

    progress.bestScore = Math.max(
      progress.bestScore,
      state.score
    );

    progress.totalScore += state.score;

    state.latestReview[category] = [...state.answers];

    saveProgress();
    clearSession();

    updateHome();
    updateRounds();
    updateReviewButton();
    updateNextRoundButton(passed);

    const stars = percentage >= 90
      ? "⭐⭐⭐"
      : percentage >= 70
        ? "⭐⭐"
        : percentage >= 40
          ? "⭐"
          : "☆";

    setText(
      "resultTitle",
      passed
        ? (
            state.language === "rw"
              ? "Urakoze! Watsinze!"
              : "Congratulations! You Passed!"
          )
        : (
            state.language === "rw"
              ? "Round irarangiye"
              : "Round Complete"
          )
    );

    setText(
      "resultScore",
      state.language === "rw"
        ? `Amanota yawe: ${state.score}`
        : `Your score: ${state.score}`
    );

    setText("resultPercentage", `${percentage}%`);

    setText(
      "resultMessage",
      passed
        ? (
            state.language === "rw"
              ? `Wujuje amanota akenewe. ${stars} Ushobora gukomeza.`
              : `You reached the pass mark. ${stars} You can continue.`
          )
        : (
            state.language === "rw"
              ? `Ongera ugerageze kugira ngo ugere kuri 70%. ${stars}`
              : `Try again to reach the 70% pass mark. ${stars}`
          )
    );

    const retryButton = $("retryRoundBtn");

    if (retryButton) {
      retryButton.textContent = state.language === "rw"
        ? "Ongera ukine"
        : "Play Again";

      showElement("retryRoundBtn", "inline-block");
    }

    updateReviewButton();
    showScreen("resultScreen");
  }

  /* =====================================================
     27. RETRY ROUND
  ===================================================== */

  function retryRound() {
    const questions = state.currentQuestions.map(question => {
      const copy = { ...question };
      delete copy._displayOptions;
      return copy;
    });

    if (!questions.length) {
      showError("There is no round available to retry.");
      goHome();
      return;
    }

    state.setupConfirmed = true;
    startRound(state.currentRound, questions);
  }

  /* =====================================================
     28. NEXT ROUND
  ===================================================== */

  function continueToNextRound() {
    if (!state.roundFinished) return;

    const total = getTotalRounds(state.mode);

    const percentage = state.currentQuestions.length
      ? Math.round(
          (state.correctAnswers / state.currentQuestions.length) * 100
        )
      : 0;

    if (percentage < CONFIG.PASS_PERCENTAGE) {
      showError(
        state.language === "rw"
          ? "Ugomba kubona nibura 70% kugira ngo ukomeze."
          : "You must score at least 70% to continue."
      );
      return;
    }

    const completed = state.progress[state.mode].completedRounds;

    if (!completed.includes(state.currentRound)) {
      showError("Complete the current round first.");
      return;
    }

    if (state.currentRound >= total) {
      showMessage(
        state.language === "rw"
          ? "Warangije rounds zose zo muri iki cyiciro!"
          : "Congratulations! You have completed all rounds in this category."
      );

      updateHome();
      updateRounds();
      goHome();
      return;
    }

    const nextRound = state.currentRound + 1;

    state.setupConfirmed = true;
    startRound(nextRound);
  }

  /* =====================================================
     29. REVIEW ANSWERS
  ===================================================== */

  function getReviewAnswers() {
    if (
      state.answers.length &&
      state.answers[0].category === state.mode
    ) {
      return state.answers;
    }

    return state.latestReview[state.mode] || [];
  }

  function showReview() {
    stopTimer();

    const container = $("reviewContainer");
    if (!container) return;

    container.innerHTML = "";

    const answers = getReviewAnswers();

    if (!answers.length) {
      const message = document.createElement("p");

      message.textContent = state.language === "rw"
        ? "Nta bisubizo byo gusubiramo biraboneka. Banza ukine round."
        : "No answers to review yet. Complete a quiz round first.";

      container.appendChild(message);
      showScreen("reviewScreen");
      return;
    }

    answers.forEach((answer, index) => {
      const item = document.createElement("article");
      item.className = "review-item";

      const title = document.createElement("h3");

      title.textContent =
        `${index + 1}. ${getLanguageText(
          answer.question,
          answer.question_rw
        )}`;

      item.appendChild(title);

      const options = Array.isArray(answer.options)
        ? answer.options
        : [];

      const rwOptions = Array.isArray(answer.options_rw)
        ? answer.options_rw
        : options;

      options.forEach((option, optionIndex) => {
        const paragraph = document.createElement("p");

        paragraph.textContent =
          `${LETTERS[optionIndex]}. ${getLanguageText(
            option,
            rwOptions[optionIndex]
          )}`;

        if (optionIndex === answer.answerIndex) {
          paragraph.classList.add("correct-text");
          paragraph.textContent += " ✓";
        }

        if (
          optionIndex === answer.selectedOption &&
          !answer.correct
        ) {
          paragraph.classList.add("wrong-text");

          paragraph.textContent +=
            state.language === "rw"
              ? " — Igisubizo wahisemo"
              : " — Your answer";
        }

        item.appendChild(paragraph);
      });

      const result = document.createElement("p");

      result.className = answer.correct
        ? "correct-text"
        : "wrong-text";

      if (answer.selectedOption === -1) {
        result.textContent = state.language === "rw"
          ? "Igihe cyarangiye; nta gisubizo wahisemo."
          : "Time expired; no answer was selected.";
      } else {
        result.textContent = answer.correct
          ? (
              state.language === "rw"
                ? "Igisubizo cyawe ni cyo."
                : "Your answer was correct."
            )
          : (
              state.language === "rw"
                ? "Igisubizo cyawe si cyo."
                : "Your answer was incorrect."
            );
      }

      item.appendChild(result);

      const explanationText = getLanguageText(
        answer.explanation,
        answer.explanation_rw
      );

      if (explanationText) {
        const explanation = document.createElement("p");

        explanation.textContent =
          `${state.language === "rw" ? "Ibisobanuro" : "Explanation"}: ${explanationText}`;

        item.appendChild(explanation);
      }

      container.appendChild(item);
    });

    showScreen("reviewScreen");
  }

  function updateReviewButton() {
    const button = $("reviewAnswersBtn");
    if (!button) return;

    const hasAnswers =
      state.answers.length > 0 ||
      (state.latestReview[state.mode] || []).length > 0;

    button.hidden = !hasAnswers;
  }

  /* =====================================================
     30. ROUNDS SCREEN
  ===================================================== */

  function updateRounds() {
    const category = state.mode;
    const total = getTotalRounds(category);
    const progress = state.progress[category];
    const completed = progress.completedRounds;
    const unlocked = getUnlockedRound(category);

    const container = $("roundsContainer");
    if (!container) return;

    container.innerHTML = "";

    const description = document.createElement("p");

    description.textContent =
      `${getCategoryName(category)} • ${total} rounds available`;

    container.appendChild(description);

    const summary = document.createElement("div");
    summary.className = "summary";

    summary.textContent =
      state.language === "rw"
        ? `Round warangije: ${completed.length} / ${total} • Round ifunguye: ${Math.min(unlocked, total)}`
        : `Completed rounds: ${completed.length} / ${total} • Unlocked round: ${Math.min(unlocked, total)}`;

    container.appendChild(summary);

    if (!total) {
      const message = document.createElement("p");

      message.textContent = state.language === "rw"
        ? "Nta bibazo biri muri iki cyiciro."
        : "No questions are available in this category.";

      container.appendChild(message);
      return;
    }

    if (unlocked > total) {
      const completedMessage = document.createElement("p");

      completedMessage.textContent = state.language === "rw"
        ? "🎉 Warangije rounds zose zo muri iki cyiciro!"
        : "🎉 You have completed all rounds in this category!";

      container.appendChild(completedMessage);
    }

    for (let round = 1; round <= total; round++) {
      const isCompleted = completed.includes(round);
      const isUnlocked = round === unlocked;

      const button = document.createElement("button");

      button.type = "button";
      button.className = "option";

      if (isCompleted) {
        button.classList.add("correct");
      }

      if (!isUnlocked || isCompleted) {
        button.disabled = true;
        button.style.opacity = "0.5";
      }

      const title = document.createElement("strong");
      title.textContent = `Round ${round}`;

      const status = document.createElement("span");

      status.textContent = isCompleted
        ? (
            state.language === "rw"
              ? " — Yarangiye ✓"
              : " — Completed ✓"
          )
        : isUnlocked
          ? (
              state.language === "rw"
                ? " — Ifunguye ▶"
                : " — Unlocked ▶"
            )
          : (
              state.language === "rw"
                ? " — Ifunze 🔒"
                : " — Locked 🔒"
            );

      button.append(title, status);

      if (isUnlocked) {
        button.addEventListener("click", () => {
          state.setupConfirmed = true;
          startRound(round);
        });
      }

      container.appendChild(button);
    }
  }

  function openRounds() {
    updateRounds();
    showScreen("roundsScreen");
  }

  /* =====================================================
     31. SETTINGS AND MUSIC
  ===================================================== */

  function openSettings() {
    updateMusicSettings();
    showScreen("settingsScreen");
  }

  function updateMusicSettings() {
    const enabled = window.quizMasterMusic
      ? window.quizMasterMusic.isEnabled()
      : storageGet(CONFIG.STORAGE.MUSIC, "false") === "true";

    const button = $("musicToggleBtn");

    if (button) {
      button.textContent = enabled
        ? "🔊 Music On"
        : "🔇 Music Off";
    }
  }

  /* =====================================================
     32. RESET PROGRESS
  ===================================================== */

  function resetProgress() {
    const confirmed = window.confirm(
      state.language === "rw"
        ? "Urashaka gusiba amanota na progress byawe byose?"
        : "Are you sure you want to reset all quiz progress?"
    );

    if (!confirmed) return;

    stopTimer();

    state.progress = createEmptyProgress();

    state.latestReview = {
      traffic: [],
      general: []
    };

    state.answers = [];
    state.score = 0;
    state.correctAnswers = 0;
    state.currentQuestions = [];
    state.currentQuestionIndex = 0;
    state.selectedOption = null;
    state.submitted = false;
    state.roundFinished = false;

    clearSession();
    saveProgress();

    updateHome();
    updateRounds();
    updateReviewButton();

    showMessage(
      state.language === "rw"
        ? "Watangiye progress nshya."
        : "Your progress has been reset."
    );
  }

  /* =====================================================
     33. EVENT LISTENERS
  ===================================================== */

  function bindEvents() {
    document.querySelectorAll(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        chooseLanguage(button.dataset.language);
      });
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        chooseMode(button.dataset.mode);
      });
    });

    $("confirmSetupBtn")?.addEventListener(
      "click",
      confirmSetup
    );

    $("startBtn")?.addEventListener("click", () => {
      if (!state.setupConfirmed) {
        showError("Please confirm your selection first.");
        return;
      }

      startRound(getUnlockedRound());
    });

    $("continueBtn")?.addEventListener(
      "click",
      continueQuiz
    );

    $("submitAnswerBtn")?.addEventListener(
      "click",
      submitAnswer
    );

    $("nextQuestionBtn")?.addEventListener(
      "click",
      nextQuestion
    );

    $("quizHomeBtn")?.addEventListener(
      "click",
      goHome
    );

    $("resultHomeBtn")?.addEventListener(
      "click",
      goHome
    );

    $("reviewHomeBtn")?.addEventListener(
      "click",
      goHome
    );

    $("roundsHomeBtn")?.addEventListener(
      "click",
      goHome
    );

    $("settingsHomeBtn")?.addEventListener(
      "click",
      goHome
    );

    $("retryRoundBtn")?.addEventListener(
      "click",
      retryRound
    );

    $("quizReviewBtn")?.addEventListener(
      "click",
      showReview
    );

    $("reviewAnswersBtn")?.addEventListener(
      "click",
      showReview
    );

    $("roundsBtn")?.addEventListener(
      "click",
      openRounds
    );

    $("settingsBtn")?.addEventListener(
      "click",
      openSettings
    );

    $("musicMenuBtn")?.addEventListener(
      "click",
      openSettings
    );

    // Share and music controls are handled by index.html.

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopTimer();
        saveSession();
      } else if (
        $("quizScreen")?.classList.contains("active") &&
        !state.submitted &&
        !state.roundFinished
      ) {
        startTimer();
      }
    });

    window.addEventListener("beforeunload", () => {
      stopTimer();
      saveSession();
    });
  }

  /* =====================================================
     34. INITIALIZE
  ===================================================== */

  function initialize() {
    loadSavedState();

    state.setupConfirmed = false;

    bindEvents();

    updateChoiceButtons();
    updateHome();
    updateRounds();
    updateReviewButton();
    updateSetupButtons();
    updateMusicSettings();

    loadQuestions();
  }

  /* =====================================================
     35. PUBLIC DEBUG API
  ===================================================== */

  window.QuizMaster = {
    reloadQuestions: loadQuestions,

    getDiagnostics() {
      return JSON.parse(
        JSON.stringify(state.diagnostics)
      );
    },

    getQuestions() {
      return [...state.questions];
    },

    getState() {
      return {
        language: state.language,
        mode: state.mode,
        loaded: state.loaded,
        loading: state.loading,
        questionCount: state.questions.length,
        trafficCount: getCategoryQuestions("traffic").length,
        generalCount: getCategoryQuestions("general").length,
        currentRound: state.currentRound,
        currentQuestionIndex: state.currentQuestionIndex,
        score: state.score,
        correctAnswers: state.correctAnswers,
        setupConfirmed: state.setupConfirmed,
        roundFinished: state.roundFinished,
        completedTrafficRounds:
          [...state.progress.traffic.completedRounds],
        completedGeneralRounds:
          [...state.progress.general.completedRounds]
      };
    }
  };

  /* =====================================================
     36. START APPLICATION
  ===================================================== */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
