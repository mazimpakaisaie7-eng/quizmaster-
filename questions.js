
/* =========================================================
   🇷🇼 QUIZ MASTER — COMPLETE QUIZ ENGINE
   Version: 4.0.0

   Compatible with:
   - index.html provided by the user
   - ./questions.json
   - English and Kinyarwanda
   - traffic and general categories

   Features:
   - JSON loading and validation
   - Detailed invalid-question diagnostics
   - Random questions and answer options
   - 10 questions per round
   - Separate category progress
   - 60s Traffic / 30s General timer
   - 10 points per correct answer
   - 70% pass mark
   - Saved progress and active sessions
   - Review answers
   - Retry and continue
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

    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    questions: [],
    loading: false,
    loaded: false,

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

    retryQuestions: null,
    activeSession: null,

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

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  function showElement(id) {
    const element = $(id);

    if (element) {
      element.hidden = false;
    }
  }

  function hideElement(id) {
    const element = $(id);

    if (element) {
      element.hidden = true;
    }
  }

  function setDisabled(id, disabled) {
    const element = $(id);

    if (element) {
      element.disabled = Boolean(disabled);
    }
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

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function showError(message) {
    const element = $("setupError");

    if (!element) return;

    element.textContent = message;
    element.dataset.type = "error";
  }

  function clearError() {
    const element = $("setupError");

    if (!element) return;

    element.textContent = "";
    element.dataset.type = "";
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
      console.warn("Quiz Master storage read failed:", key, error);

      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);

      return true;
    } catch (error) {
      console.warn("Quiz Master storage save failed:", key, error);

      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Quiz Master storage removal failed:", key, error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = storageGet(key);

      if (!value) return fallback;

      return JSON.parse(value);
    } catch (error) {
      console.warn("Invalid saved data:", key, error);

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
    const language = String(value || "").toLowerCase().trim();

    return language === "rw" ? "rw" : "en";
  }

  function normalizeMode(value) {
    const mode = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

    if (
      [
        "traffic",
        "road",
        "roadsafety",
        "trafficrules",
        "roadsafetyrules"
      ].includes(mode)
    ) {
      return "traffic";
    }

    if (
      [
        "general",
        "generalknowledge",
        "knowledge",
        "generalquiz"
      ].includes(mode)
    ) {
      return "general";
    }

    return "";
  }

  function getCategoryName(category) {
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
     5. LOAD SAVED STATE
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

    if (!raw || typeof raw !== "object") {
      return result;
    }

    ["traffic", "general"].forEach(category => {
      const source = raw[category];

      if (!source || typeof source !== "object") return;

      result[category].completedRounds =
        Array.isArray(source.completedRounds)
          ? source.completedRounds
              .map(Number)
              .filter(number =>
                Number.isInteger(number) && number > 0
              )
          : [];

      result[category].bestScore =
        Math.max(0, safeNumber(source.bestScore));

      result[category].totalScore =
        Math.max(0, safeNumber(source.totalScore));

      result[category].usedQuestionIds =
        Array.isArray(source.usedQuestionIds)
          ? source.usedQuestionIds.map(String)
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

    const savedReviews = readJSON(
      CONFIG.STORAGE.REVIEW,
      {}
    );

    if (savedReviews && typeof savedReviews === "object") {
      state.latestReview.traffic =
        Array.isArray(savedReviews.traffic)
          ? savedReviews.traffic
          : [];

      state.latestReview.general =
        Array.isArray(savedReviews.general)
          ? savedReviews.general
          : [];
    }

    /* Legacy data migration */

    const legacyBest = safeNumber(
      storageGet(CONFIG.STORAGE.BEST, "0")
    );

    const legacyTotal = safeNumber(
      storageGet(CONFIG.STORAGE.TOTAL, "0")
    );

    const legacyUsed = readJSON(
      CONFIG.STORAGE.USED,
      []
    );

    const legacyCompleted = readJSON(
      CONFIG.STORAGE.COMPLETED,
      {}
    );

    const category = state.mode;

    if (
      legacyBest > state.progress[category].bestScore
    ) {
      state.progress[category].bestScore = legacyBest;
    }

    if (
      legacyTotal > state.progress[category].totalScore
    ) {
      state.progress[category].totalScore = legacyTotal;
    }

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
      typeof legacyCompleted === "object"
    ) {
      const oldRounds = legacyCompleted[category];

      if (Array.isArray(oldRounds)) {
        state.progress[category].completedRounds = [
          ...new Set([
            ...state.progress[category].completedRounds,
            ...oldRounds.map(Number).filter(Number.isInteger)
          ])
        ];
      }
    }

    saveProgress();
  }

  function saveProgress() {
    saveJSON(
      CONFIG.STORAGE.PROGRESS,
      state.progress
    );

    saveJSON(
      CONFIG.STORAGE.REVIEW,
      state.latestReview
    );

    storageSet(
      CONFIG.STORAGE.LANGUAGE,
      state.language
    );

    storageSet(
      CONFIG.STORAGE.MODE,
      state.mode
    );

    const category = state.mode;
    const progress = state.progress[category];

    storageSet(
      CONFIG.STORAGE.BEST,
      String(progress.bestScore)
    );

    storageSet(
      CONFIG.STORAGE.TOTAL,
      String(progress.totalScore)
    );

    saveJSON(
      CONFIG.STORAGE.USED,
      progress.usedQuestionIds
    );

    saveJSON(
      CONFIG.STORAGE.COMPLETED,
      {
        traffic: state.progress.traffic.completedRounds,
        general: state.progress.general.completedRounds
      }
    );
  }

  /* =====================================================
     6. EXTRACT QUESTION ARRAY
  ===================================================== */

  function extractQuestionArray(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      return [];
    }

    if (Array.isArray(data.questions)) {
      return data.questions;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }

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

  /* =====================================================
     7. QUESTION FIELD HELPERS
  ===================================================== */

  function getQuestionText(raw) {
    return (
      raw.question ??
      raw.question_en ??
      raw.text ??
      ""
    );
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

    if (!options && raw.options && typeof raw.options === "object") {
      options = Object.keys(raw.options)
        .sort()
        .map(key => raw.options[key]);
    }

    if (!Array.isArray(options)) {
      return [];
    }

    return options.map(option => String(option ?? "").trim());
  }

  function getEnglishOptions(raw) {
    return getOptions(raw, "en");
  }

  function getKinyarwandaOptions(raw) {
    return getOptions(raw, "rw");
  }

  /* =====================================================
     8. FIND CORRECT ANSWER
  ===================================================== */

  function findAnswerIndex(raw, englishOptions, rwOptions) {
    const directValues = [
      raw.answerIndex,
      raw.correctIndex,
      raw.answer,
      raw.correctAnswer,
      raw.correct_answer,
      raw.answer_en,
      raw.answer_rw,
      raw.correct
    ];

    for (const value of directValues) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value === "number") {
        if (
          Number.isInteger(value) &&
          value >= 0 &&
          value < 4
        ) {
          return value;
        }

        if (
          Number.isInteger(value) &&
          value >= 1 &&
          value <= 4
        ) {
          return value - 1;
        }
      }

      const text = String(value).trim();

      const letter = text.match(/^([A-D])$/i);

      if (letter) {
        return LETTERS.indexOf(letter[1].toUpperCase());
      }

      const numeric = text.match(/^([1-4])$/);

      if (numeric) {
        return Number(numeric[1]) - 1;
      }

      const englishIndex = englishOptions.findIndex(option =>
        option.toLowerCase() === text.toLowerCase()
      );

      if (englishIndex !== -1) {
        return englishIndex;
      }

      const rwIndex = rwOptions.findIndex(option =>
        option.toLowerCase() === text.toLowerCase()
      );

      if (rwIndex !== -1) {
        return rwIndex;
      }
    }

    return -1;
  }

  /* =====================================================
     9. NORMALIZE AND VALIDATE QUESTIONS
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

    if (!id) {
      errors.push("Missing question ID.");
    }

    const category = normalizeMode(
      raw.category ?? raw.mode ?? raw.type
    );

    if (!category) {
      errors.push(
        "Invalid category. Use traffic or general."
      );
    }

    const questionEn = String(
      getQuestionText(raw)
    ).trim();

    const questionRw = String(
      getKinyarwandaQuestion(raw)
    ).trim();

    if (!questionEn && !questionRw) {
      errors.push("Missing question text.");
    }

    const englishOptions = getEnglishOptions(raw);
    const rwOptions = getKinyarwandaOptions(raw);

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

    if (
      rwOptions.length !== 0 &&
      rwOptions.length !== 4
    ) {
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

    if (
      correctIndex < 0 ||
      correctIndex > 3 ||
      !Number.isInteger(correctIndex)
    ) {
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

        image: String(
          raw.image ?? raw.image_url ?? ""
        )
      },

      errors: []
    };
  }

  /* =====================================================
     10. LOAD QUESTIONS.JSON
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
          `Could not load questions.json. HTTP ${response.status}. Check that the file exists in the project root.`
        );
      }

      const contentType =
        response.headers.get("content-type") || "";

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error("questions.json is empty.");
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error(
          `Invalid JSON syntax in questions.json: ${error.message}`
        );
      }

      if (
        contentType &&
        !contentType.toLowerCase().includes("json")
      ) {
        console.warn(
          "questions.json response has an unexpected content type:",
          contentType
        );
      }

      const rawQuestions = extractQuestionArray(data);

      if (!rawQuestions.length) {
        throw new Error(
          "No question array found. Use a JSON array of question objects."
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
        console.error(
          "Quiz Master: no valid questions.",
          state.diagnostics
        );

        throw new Error(
          `No valid questions found. Invalid: ${invalidCount}. Duplicates: ${duplicateCount}. Check the detailed errors in the browser Console.`
        );
      }

      state.questions = normalized;
      state.loaded = true;

      /* Remove used IDs that no longer exist in JSON */

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
        console.warn(
          "Some questions were skipped:",
          state.diagnostics.errors
        );

        showError(
          `${invalidCount} invalid and ${duplicateCount} duplicate questions were skipped. ${normalized.length} valid questions loaded. Open the browser Console to see details.`
        );
      }

      restoreSession();

      console.info("Quiz Master questions loaded:", {
        total: state.diagnostics.total,
        valid: state.diagnostics.valid,
        invalid: state.diagnostics.invalid,
        duplicates: state.diagnostics.duplicates,
        traffic: state.diagnostics.traffic,
        general: state.diagnostics.general
      });

    } catch (error) {
      console.error(
        "Quiz Master question loading error:",
        error
      );

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
     11. QUESTION COUNTS AND ROUND HELPERS
  ===================================================== */

  function getCategoryQuestions(category = state.mode) {
    return state.questions.filter(
      question => question.category === category
    );
  }

  function getTotalRounds(category = state.mode) {
    const count = getCategoryQuestions(category).length;

    return Math.ceil(
      count / CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getUnlockedRound(category = state.mode) {
    const completed =
      state.progress[category].completedRounds;

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

  function getRoundQuestions(category, round) {
    const all = getCategoryQuestions(category);

    const completedBefore = Math.max(0, round - 1);

    const start = completedBefore *
      CONFIG.QUESTIONS_PER_ROUND;

    return all.slice(
      start,
      start + CONFIG.QUESTIONS_PER_ROUND
    );
  }

  /* =====================================================
     12. SETUP BUTTONS
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

    const categoryName = getCategoryName(state.mode);

    const count = getCategoryQuestions().length;

    summary.textContent =
      `${languageName} • ${categoryName} • ${count} questions available`;
  }

  function updateSetupButtons() {
    const hasLanguage = Boolean(state.language);
    const hasMode = Boolean(state.mode);

    const categoryCount =
      getCategoryQuestions().length;

    const canConfirm =
      state.loaded &&
      hasLanguage &&
      hasMode &&
      categoryCount > 0 &&
      !state.loading;

    setDisabled(
      "confirmSetupBtn",
      !canConfirm
    );

    const canStart =
      state.loaded &&
      state.setupConfirmed &&
      categoryCount > 0 &&
      !state.loading;

    setDisabled(
      "startBtn",
      !canStart
    );

    updateChoiceButtons();
    updateSummary();
  }

  function chooseLanguage(language) {
    state.language = normalizeLanguage(language);

    state.languageChosen = true;
    state.setupConfirmed = false;

    storageSet(
      CONFIG.STORAGE.LANGUAGE,
      state.language
    );

    clearError();

    updateSetupButtons();
  }

  function chooseMode(mode) {
    const normalized = normalizeMode(mode);

    if (!normalized) {
      showError("Please choose a valid category.");

      return;
    }

    state.mode = normalized;

    state.modeChosen = true;
    state.setupConfirmed = false;

    storageSet(
      CONFIG.STORAGE.MODE,
      state.mode
    );

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
        `There are no valid questions in ${getCategoryName(state.mode)}. Check questions.json and its category values.`
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
     13. SCREEN NAVIGATION
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
     14. HOME SCREEN
  ===================================================== */

  function updateHome() {
    const category = state.mode;
    const progress = state.progress[category];

    const round = getUnlockedRound(category);

    setText("homeRound", round);

    setText(
      "homeScore",
      progress.bestScore
    );

    const completedCount =
      progress.completedRounds.length;

    const stars = completedCount > 0
      ? "⭐".repeat(Math.min(5, Math.max(1, Math.ceil(completedCount / 2))))
      : "⭐";

    setText("homeStars", stars);

    const session = readJSON(
      CONFIG.STORAGE.SESSION,
      null
    );

    if (
      session &&
      session.category === category &&
      Array.isArray(session.questions) &&
      session.questions.length
    ) {
      showElement("continueBtn");
    } else {
      hideElement("continueBtn");
    }

    updateSetupButtons();
  }

  /* =====================================================
     15. SESSION SAVE AND RESTORE
  ===================================================== */

  function saveSession() {
    if (
      !state.currentQuestions.length ||
      state.roundFinished
    ) {
      return;
    }

    const session = {
      version: 1,
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

    saveJSON(
      CONFIG.STORAGE.SESSION,
      session
    );
  }

  function clearSession() {
    storageRemove(CONFIG.STORAGE.SESSION);
    state.activeSession = null;

    hideElement("continueBtn");
  }

  function restoreSession() {
    const session = readJSON(
      CONFIG.STORAGE.SESSION,
      null
    );

    if (
      !session ||
      !Array.isArray(session.questions) ||
      !session.questions.length ||
      !["traffic", "general"].includes(session.category)
    ) {
      clearSession();

      return;
    }

    const validIds = new Set(
      state.questions.map(question => question.id)
    );

    const validQuestions = session.questions.every(
      question => question && validIds.has(question.id)
    );

    if (!validQuestions) {
      clearSession();

      return;
    }

    state.activeSession = session;

    showElement("continueBtn");
  }

  function continueQuiz() {
    const session = readJSON(
      CONFIG.STORAGE.SESSION,
      null
    );

    if (
      !session ||
      !Array.isArray(session.questions) ||
      !session.questions.length
    ) {
      clearSession();

      showError("There is no saved quiz to continue.");

      return;
    }

    state.mode = normalizeMode(session.category) || "general";
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

    state.score = safeNumber(session.score);
    state.correctAnswers = safeNumber(session.correctAnswers);

    state.submitted = Boolean(session.submitted);

    state.timer = Math.max(
      1,
      safeNumber(session.timer, getRoundTime())
    );

    state.roundFinished = false;

    state.setupConfirmed = true;

    showScreen("quizScreen");

    renderQuestion();

    if (!state.submitted) {
      startTimer();
    } else {
      stopTimer();
    }
  }

  /* =====================================================
     16. CREATE A NEW ROUND
  ===================================================== */

  function createRoundQuestions() {
    const category = state.mode;

    const allQuestions = getCategoryQuestions(category);

    if (!allQuestions.length) {
      return [];
    }

    let usedIds = new Set(
      state.progress[category].usedQuestionIds
    );

    let available = allQuestions.filter(
      question => !usedIds.has(question.id)
    );

    /* Reset only when the category pool is exhausted */

    if (!available.length) {
      usedIds = new Set();

      state.progress[category].usedQuestionIds = [];

      available = [...allQuestions];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    selected.forEach(question => {
      state.progress[category].usedQuestionIds.push(
        question.id
      );
    });

    state.progress[category].usedQuestionIds = [
      ...new Set(
        state.progress[category].usedQuestionIds
      )
    ];

    saveProgress();

    return selected;
  }

  function startRound(round, retryQuestions = null) {
    if (!state.loaded) {
      showError("Questions have not loaded yet.");

      return;
    }

    if (!state.setupConfirmed && !retryQuestions) {
      showError("Please confirm your language and category first.");

      return;
    }

    const requestedRound = Math.max(1, Number(round) || 1);

    const unlocked = getUnlockedRound(state.mode);

    if (!retryQuestions && requestedRound > unlocked) {
      showError("This round is locked. Complete the previous round first.");

      return;
    }

    const questions = retryQuestions
      ? [...retryQuestions]
      : createRoundQuestions();

    if (!questions.length) {
      showError("No valid questions are available in this category.");

      return;
    }

    state.currentRound = requestedRound;

    state.currentQuestions = questions;

    state.currentQuestionIndex = 0;

    state.selectedOption = null;

    state.answers = [];

    state.score = 0;

    state.correctAnswers = 0;

    state.timer = getRoundTime();

    state.submitted = false;

    state.roundFinished = false;

    state.retryQuestions = retryQuestions
      ? [...retryQuestions]
      : null;

    clearSession();

    saveProgress();

    showScreen("quizScreen");

    renderQuestion();

    startTimer();
  }

  /* =====================================================
     17. RENDER QUESTION
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
    if (!question._displayOptions) {
      question._displayOptions = getDisplayOptions(question);
    }

    return question._displayOptions;
  }

  function renderQuestion() {
    const question = getCurrentQuestion();

    if (!question) {
      finishRound();

      return;
    }

    setText("roundLabel", state.currentRound);

    setText(
      "questionCounter",
      `${state.currentQuestionIndex + 1}/${state.currentQuestions.length}`
    );

    setText("scoreNumber", state.score);

    setText(
      "categoryIndicator",
      getCategoryName(state.mode)
    );

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

    if (!container) return;

    container.innerHTML = "";

    const options = getSavedOptionOrder(question);

    options.forEach((option, displayIndex) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      const letter = document.createElement("span");

      letter.className = "option-letter";
      letter.textContent = LETTERS[displayIndex];

      const text = document.createElement("span");

      text.textContent = getLanguageText(
        option.en,
        option.rw
      );

      button.append(letter, text);

      if (
        state.selectedOption === option.originalIndex
      ) {
        button.classList.add("selected");
      }

      if (state.submitted) {
        button.disabled = true;

        if (
          option.originalIndex === question.answerIndex
        ) {
          button.classList.add("correct");
        }

        if (
          option.originalIndex === state.selectedOption &&
          state.selectedOption !== question.answerIndex
        ) {
          button.classList.add("incorrect");
        }
      } else {
        button.addEventListener("click", () => {
          selectAnswer(option.originalIndex);
        });
      }

      container.appendChild(button);
    });

    const progress = (
      state.currentQuestionIndex /
      state.currentQuestions.length
    ) * 100;

    const fill = $("progressFill");

    if (fill) {
      fill.style.width = `${progress}%`;
    }

    const progressBar = $("quizProgressBar");

    if (progressBar) {
      progressBar.setAttribute(
        "aria-valuenow",
        String(Math.round(progress))
      );
    }

    setText("timer", state.timer);

    updateSubmitButton();

    if (state.submitted) {
      showSubmittedAnswer();
    } else {
      setText("answerFeedback", "");
      setText("explanation", "");

      hideElement("nextQuestionBtn");
    }

    saveSession();
  }

  /* =====================================================
     18. SELECT ANSWER
  ===================================================== */

  function selectAnswer(index) {
    if (state.submitted) return;

    if (!Number.isInteger(index) || index < 0 || index > 3) {
      return;
    }

    state.selectedOption = index;

    renderQuestion();

    updateSubmitButton();

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
     19. SUBMIT ANSWER
  ===================================================== */

  function submitAnswer() {
    if (state.submitted || state.roundFinished) return;

    const question = getCurrentQuestion();

    if (!question) return;

    if (state.selectedOption === null) {
      setText(
        "answerFeedback",
        state.language === "rw"
          ? "Banza uhitemo igisubizo."
          : "Please select an answer first."
      );

      return;
    }

    state.submitted = true;

    const correct =
      state.selectedOption === question.answerIndex;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;

      state.correctAnswers++;
    }

    const selectedOption = state.selectedOption;

    const answerRecord = {
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

    const existingIndex = state.answers.findIndex(
      answer => answer.id === question.id
    );

    if (existingIndex >= 0) {
      state.answers[existingIndex] = answerRecord;
    } else {
      state.answers.push(answerRecord);
    }

    stopTimer();

    setText("scoreNumber", state.score);

    renderQuestion();

    showSubmittedAnswer();

    saveSession();
  }

  function showSubmittedAnswer() {
    const question = getCurrentQuestion();

    if (!question) return;

    const correct =
      state.selectedOption === question.answerIndex;

    let feedback;

    if (state.language === "rw") {
      feedback = correct
        ? "✅ Igisubizo ni cyo! +10 amanota."
        : "❌ Igisubizo si cyo.";
    } else {
      feedback = correct
        ? "✅ Correct answer! +10 points."
        : "❌ Incorrect answer.";
    }

    setText("answerFeedback", feedback);

    const explanation = getLanguageText(
      question.explanation,
      question.explanation_rw
    );

    setText(
      "explanation",
      explanation
        ? `${state.language === "rw" ? "Ibisobanuro" : "Explanation"}: ${explanation}`
        : ""
    );

    setDisabled("submitAnswerBtn", true);

    showElement("nextQuestionBtn");

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.textContent =
        state.currentQuestionIndex + 1 >= state.currentQuestions.length
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira →" : "Next Question →");
    }
  }

  /* =====================================================
     20. NEXT QUESTION
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
     21. TIMER
  ===================================================== */

  function startTimer() {
    stopTimer();

    if (state.submitted || state.roundFinished) return;

    const timerBox = $("timerBox");

    if (timerBox) {
      timerBox.classList.toggle(
        "warning",
        state.timer <= 10
      );
    }

    setText("timer", state.timer);

    state.timerInterval = window.setInterval(() => {
      if (state.submitted || state.roundFinished) {
        stopTimer();

        return;
      }

      state.timer--;

      setText("timer", state.timer);

      if (timerBox) {
        timerBox.classList.toggle(
          "warning",
          state.timer <= 10
        );
      }

      saveSession();

      if (state.timer <= 0) {
        stopTimer();

        if (state.selectedOption === null) {
          state.selectedOption = -1;

          state.submitted = true;

          const question = getCurrentQuestion();

          if (question) {
            state.answers.push({
              id: question.id,
              category: state.mode,

              question: question.question,
              question_rw: question.question_rw,

              options: [...question.options],
              options_rw: [...question.options_rw],

              answerIndex: question.answerIndex,

              selectedOption: -1,

              correct: false,

              explanation: question.explanation,
              explanation_rw: question.explanation_rw
            });
          }

          setText(
            "answerFeedback",
            state.language === "rw"
              ? "Igihe cyarangiye!"
              : "Time is up!"
          );

          setText(
            "explanation",
            getLanguageText(
              question?.explanation,
              question?.explanation_rw
            )
          );

          showElement("nextQuestionBtn");

          setDisabled("submitAnswerBtn", true);

          saveSession();

        } else {
          submitAnswer();
        }
      }

    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);

      state.timerInterval = null;
    }
  }

  /* =====================================================
     22. FINISH ROUND
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
      }
    }

    progress.bestScore = Math.max(
      progress.bestScore,
      state.score
    );

    progress.totalScore += state.score;

    state.latestReview[category] = [
      ...state.answers
    ];

    saveProgress();

    clearSession();

    updateHome();

    updateRounds();

    updateReviewButton();

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
      "resultMessage",
      passed
        ? (
            state.language === "rw"
              ? "Wujuje amanota akenewe. Ushobora gukomeza."
              : "You reached the pass mark. You can continue."
          )
        : (
            state.language === "rw"
              ? "Ongera ugerageze kugira ngo ugere kuri 70%."
              : "Try again to reach the 70% pass mark."
          )
    );

    setText("resultStars", stars);

    setText("resultScore", state.score);

    setText("resultPercent", `${percentage}%`);

    setText(
      "resultCorrect",
      `${state.correctAnswers}/${total}`
    );

    setText(
      "resultPassMark",
      `${CONFIG.PASS_PERCENTAGE}%`
    );

    const nextButton = $("resultNextBtn");

    const hasNextRound =
      state.currentRound < getTotalRounds(category);

    if (passed && hasNextRound) {
      showElement("resultNextBtn");
    } else {
      hideElement("resultNextBtn");
    }

    if (!passed) {
      showElement("retryBtn");
    } else {
      hideElement("retryBtn");
    }

    if (
      passed &&
      !hasNextRound
    ) {
      setText(
        "resultMessage",
        state.language === "rw"
          ? "Watsinze round zose ziri muri iki cyiciro!"
          : "You have completed all available rounds in this category!"
      );
    }

    showScreen("resultScreen");
  }

  /* =====================================================
     23. RETRY ROUND
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

    startRound(
      state.currentRound,
      questions
    );
  }

  /* =====================================================
     24. CONTINUE TO NEXT ROUND
  ===================================================== */

  function continueToNextRound() {
    const nextRound = state.currentRound + 1;

    if (
      !state.progress[state.mode].completedRounds.includes(
        state.currentRound
      )
    ) {
      return;
    }

    if (nextRound > getTotalRounds()) {
      goHome();

      return;
    }

    startRound(nextRound);
  }

  /* =====================================================
     25. REVIEW ANSWERS
  ===================================================== */

  function getReviewAnswers() {
    if (
      state.answers.length &&
      state.mode === state.answers[0].category
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

      message.textContent =
        state.language === "rw"
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

        const optionText = getLanguageText(
          option,
          rwOptions[optionIndex]
        );

        paragraph.textContent =
          `${LETTERS[optionIndex]}. ${optionText}`;

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
        result.textContent =
          state.language === "rw"
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
     26. ROUNDS SCREEN
  ===================================================== */

  function updateRounds() {
    const category = state.mode;

    const total = getTotalRounds(category);

    const completed =
      state.progress[category].completedRounds;

    const unlocked = getUnlockedRound(category);

    setText("roundsCompleted", completed.length);

    setText("roundsTotal", total);

    setText(
      "roundsUnlocked",
      Math.min(unlocked, total)
    );

    setText(
      "roundsDescription",
      `${getCategoryName(category)} • ${total} rounds available`
    );

    const list = $("roundList");

    if (!list) return;

    list.innerHTML = "";

    if (!total) {
      const message = document.createElement("p");

      message.textContent =
        state.language === "rw"
          ? "Nta bibazo biri muri iki cyiciro."
          : "No questions are available in this category.";

      list.appendChild(message);

      return;
    }

    for (let round = 1; round <= total; round++) {
      const isCompleted = completed.includes(round);

      const isUnlocked = round <= unlocked;

      const button = document.createElement("button");

      button.type = "button";

      button.className = "round-card";

      if (isCompleted) {
        button.classList.add("completed");
      }

      if (!isUnlocked) {
        button.classList.add("locked");
      }

      const left = document.createElement("span");

      const title = document.createElement("strong");

      title.textContent =
        `${state.language === "rw" ? "Round" : "Round"} ${round}`;

      const status = document.createElement("span");

      status.className = "round-status";

      status.textContent = isCompleted
        ? (state.language === "rw" ? "Yarangiye ✓" : "Completed ✓")
        : isUnlocked
          ? (state.language === "rw" ? "Ifunguye" : "Unlocked")
          : (state.language === "rw" ? "Ifunze 🔒" : "Locked 🔒");

      left.append(title, document.createElement("br"), status);

      const right = document.createElement("span");

      right.textContent = isCompleted
        ? "🏆"
        : isUnlocked
          ? "▶"
          : "🔒";

      button.append(left, right);

      button.disabled = !isUnlocked;

      if (isUnlocked) {
        button.addEventListener("click", () => {
          if (!state.setupConfirmed) {
            state.setupConfirmed = true;
          }

          startRound(round);
        });
      }

      list.appendChild(button);
    }
  }

  function openRounds() {
    updateRounds();

    showScreen("roundsScreen");
  }

  /* =====================================================
     27. SETTINGS
  ===================================================== */

  function openSettings() {
    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) {
      language.value = state.language;
    }

    if (mode) {
      mode.value = state.mode;
    }

    updateMusicSettings();

    showScreen("settingsScreen");
  }

  function saveSettings() {
    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) {
      state.language = normalizeLanguage(language.value);
    }

    if (mode) {
      state.mode = normalizeMode(mode.value) || "general";
    }

    state.languageChosen = true;
    state.modeChosen = true;

    state.setupConfirmed = false;

    saveProgress();

    setText(
      "settingsMessage",
      state.language === "rw"
        ? "Igenamiterere ryabitswe."
        : "Settings saved successfully."
    );

    updateHome();
    updateRounds();
    updateReviewButton();
    updateSetupButtons();
  }

  function resetProgress() {
    const confirmed = window.confirm(
      state.language === "rw"
        ? "Urashaka gusiba amanota na progress byawe byose?"
        : "Are you sure you want to reset all quiz progress?"
    );

    if (!confirmed) return;

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

    setText(
      "settingsMessage",
      state.language === "rw"
        ? "Progress yasibwe neza."
        : "Progress reset successfully."
    );

    showMessage(
      state.language === "rw"
        ? "Watangiye progress nshya."
        : "Your progress has been reset."
    );
  }

  /* =====================================================
     28. MUSIC SETTINGS
  ===================================================== */

  function updateMusicSettings() {
    const enabled =
      storageGet(CONFIG.STORAGE.MUSIC, "false") === "true";

    const button = $("musicToggleBtn");

    if (button) {
      button.textContent = enabled
        ? "🔊 Music On"
        : "🔇 Music Off";
    }

    setText(
      "musicStatus",
      enabled
        ? "Music is enabled."
        : "Music is disabled."
    );
  }

  /* =====================================================
     29. SHARE QUIZ
  ===================================================== */

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.origin + "/"
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);

        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(
          `${shareData.text} ${shareData.url}`
        );

        window.alert("✅ Link Copied!");

        return;
      }

      window.prompt(
        "Copy Quiz Master link:",
        shareData.url
      );

    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Share failed:", error);

        window.prompt(
          "Copy Quiz Master link:",
          shareData.url
        );
      }
    }
  }

  /* =====================================================
     30. EVENT LISTENERS
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

    $("resultNextBtn")?.addEventListener(
      "click",
      continueToNextRound
    );

    $("retryBtn")?.addEventListener(
      "click",
      retryRound
    );

    $("resultReviewBtn")?.addEventListener(
      "click",
      showReview
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

    $("saveSettingsBtn")?.addEventListener(
      "click",
      saveSettings
    );

    $("resetProgressBtn")?.addEventListener(
      "click",
      resetProgress
    );

    $("shareBtn")?.addEventListener(
      "click",
      shareQuiz
    );

    $("musicMenuBtn")?.addEventListener(
      "click",
      openSettings
    );

    $("musicToggleBtn")?.addEventListener("click", () => {
      const enabled =
        storageGet(CONFIG.STORAGE.MUSIC, "false") === "true";

      if (window.quizMasterMusic) {
        window.quizMasterMusic.setEnabled(!enabled);
      }

      updateMusicSettings();
    });

    document.addEventListener(
      "visibilitychange",
      () => {
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
      }
    );

    window.addEventListener("beforeunload", () => {
      stopTimer();
      saveSession();
    });
  }

  /* =====================================================
     31. INITIALIZE APPLICATION
  ===================================================== */

  function initialize() {
    loadSavedState();

    state.languageChosen = true;
    state.modeChosen = true;

    /*
      Do not automatically confirm setup.
      The user must press Confirm Selection.
    */

    state.setupConfirmed = false;

    bindEvents();

    updateChoiceButtons();
    updateHome();
    updateRounds();
    updateReviewButton();
    updateSetupButtons();

    loadQuestions();
  }

  /* =====================================================
     32. PUBLIC DEBUG API
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
        currentRound: state.currentRound,
        score: state.score
      };
    }
  };

  /* =====================================================
     33. START
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
