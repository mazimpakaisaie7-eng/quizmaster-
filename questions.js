
(() => {
  "use strict";

  /* =====================================================
     QUIZ MASTER 🇷🇼
     Complete Quiz Engine
     Compatible with the supplied index.html
     Data source: ./questions.json
  ===================================================== */

  const CONFIG = Object.freeze({
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    PASS_PERCENTAGE: 70,
    STORAGE_PREFIX: "quizmaster"
  });

  const KEYS = Object.freeze({
    LANGUAGE: "quizmasterLanguage",
    MODE: "quizmasterMode",
    PROGRESS: "quizmasterProgress",
    CURRENT_SESSION: "quizmasterCurrentSession",
    USED_IDS: "quizmasterUsedQuestionIds",
    COMPLETED: "quizmasterCompletedRounds",
    REVIEW: "quizmasterReviewAnswers",
    BEST_SCORE: "quizmasterBestScore",
    TOTAL_SCORE: "quizmasterTotalScore",
    WEEKLY: "quizmasterWeeklyScores",
    SETTINGS: "quizmasterSettings",
    MUSIC: "quizmasterMusicEnabled"
  });

  const $ = id => document.getElementById(id);

  const elements = {
    homeScreen: $("homeScreen"),
    quizScreen: $("quizScreen"),
    resultScreen: $("resultScreen"),
    reviewScreen: $("reviewScreen"),
    roundsScreen: $("roundsScreen"),
    settingsScreen: $("settingsScreen"),

    languageButtons: document.querySelectorAll(".language-btn"),
    modeButtons: document.querySelectorAll(".mode-btn"),

    selectionSummary: $("selectionSummary"),
    setupError: $("setupError"),
    gameSetup: $("gameSetup"),

    confirmSetupBtn: $("confirmSetupBtn"),
    startBtn: $("startBtn"),
    continueBtn: $("continueBtn"),

    homeRound: $("homeRound"),
    homeScore: $("homeScore"),
    homeStars: $("homeStars"),
    homeMessage: $("homeMessage"),

    roundLabel: $("roundLabel"),
    questionCounter: $("questionCounter"),
    scoreNumber: $("scoreNumber"),
    categoryIndicator: $("categoryIndicator"),
    timer: $("timer"),
    timerBox: $("timerBox"),
    progressFill: $("progressFill"),
    progressBar: $("quizProgressBar"),

    questionImage: $("questionImage"),
    questionText: $("questionText"),
    optionsContainer: $("optionsContainer"),

    submitAnswerBtn: $("submitAnswerBtn"),
    nextQuestionBtn: $("nextQuestionBtn"),
    answerFeedback: $("answerFeedback"),
    explanation: $("explanation"),

    quizReviewBtn: $("quizReviewBtn"),
    quizHomeBtn: $("quizHomeBtn"),

    resultTitle: $("resultTitle"),
    resultMessage: $("resultMessage"),
    resultStars: $("resultStars"),
    resultScore: $("resultScore"),
    resultPercent: $("resultPercent"),
    resultCorrect: $("resultCorrect"),
    resultPassMark: $("resultPassMark"),

    resultNextBtn: $("resultNextBtn"),
    retryBtn: $("retryBtn"),
    resultReviewBtn: $("resultReviewBtn"),
    resultHomeBtn: $("resultHomeBtn"),

    reviewContainer: $("reviewContainer"),
    reviewHomeBtn: $("reviewHomeBtn"),
    reviewAnswersBtn: $("reviewAnswersBtn"),

    roundsCompleted: $("roundsCompleted"),
    roundsTotal: $("roundsTotal"),
    roundsUnlocked: $("roundsUnlocked"),
    roundsDescription: $("roundsDescription"),
    roundList: $("roundList"),
    roundsHomeBtn: $("roundsHomeBtn"),

    settingsLanguage: $("settingsLanguage"),
    settingsMode: $("settingsMode"),
    saveSettingsBtn: $("saveSettingsBtn"),
    resetProgressBtn: $("resetProgressBtn"),
    settingsMessage: $("settingsMessage"),
    settingsHomeBtn: $("settingsHomeBtn"),

    shareBtn: $("shareBtn"),
    roundsBtn: $("roundsBtn"),
    settingsBtn: $("settingsBtn")
  };

  let allQuestions = [];

  let state = {
    language: "en",
    mode: "general",
    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    currentRound: 1,
    unlockedRounds: {
      traffic: 1,
      general: 1
    },

    completedRounds: {
      traffic: [],
      general: []
    },

    usedQuestionIds: {
      traffic: [],
      general: []
    },

    bestScore: 0,
    totalScore: 0,

    session: null,
    latestReview: [],
    lastRoundScore: 0
  };

  let timerInterval = null;
  let timeRemaining = 0;
  let currentSelection = null;
  let isProcessing = false;

  /* =====================================================
     STORAGE HELPERS
  ===================================================== */

  function storageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);

      return value === null
        ? fallback
        : value;

    } catch (error) {
      console.warn("Storage read failed:", key);
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(
        key,
        typeof value === "string"
          ? value
          : JSON.stringify(value)
      );

      return true;

    } catch (error) {
      console.warn("Storage write failed:", key);
      return false;
    }
  }

  function storageJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch (error) {
      return fallback;
    }
  }

  function validObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  /* =====================================================
     GENERAL HELPERS
  ===================================================== */

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
    );
  }

  function getText(en, rw) {
    if (state.language === "rw") {
      return rw || en || "";
    }

    return en || rw || "";
  }

  function getCategoryName(mode) {
    if (state.language === "rw") {
      return mode === "traffic"
        ? "Amategeko y'umuhanda"
        : "Ubumenyi rusange";
    }

    return mode === "traffic"
      ? "Road Safety"
      : "General Knowledge";
  }

  function getTimerDuration() {
    return state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  function getTotalRounds() {
    return Math.max(
      1,
      Math.ceil(
        getModeQuestions().length /
        CONFIG.QUESTIONS_PER_ROUND
      )
    );
  }

  function getModeQuestions() {
    return allQuestions.filter(
      question => question.mode === state.mode
    );
  }

  function getStars(percentage) {
    if (percentage >= 90) return "⭐⭐⭐";
    if (percentage >= 70) return "⭐⭐";
    if (percentage >= 40) return "⭐";

    return "☆☆☆";
  }

  function getCurrentSession() {
    return state.session;
  }

  function announce(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(`quizmaster:${name}`, {
        detail
      })
    );
  }

  /* =====================================================
     QUESTION NORMALIZATION
  ===================================================== */

  function normalizeMode(category) {
    const value = String(category || "")
      .toLowerCase()
      .trim();

    if (
      value === "traffic" ||
      value.includes("road safety") ||
      value.includes("road_safety") ||
      value.includes("amategeko y'umuhanda") ||
      value.includes("amategeko y'umuhanda")
    ) {
      return "traffic";
    }

    return "general";
  }

  function findAnswerIndex(answer, options) {
    if (
      typeof answer === "number" &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer < options.length
    ) {
      return answer;
    }

    if (answer === undefined || answer === null) {
      return -1;
    }

    const normalized = String(answer)
      .trim()
      .toLowerCase();

    if (/^\d+$/.test(normalized)) {
      const index = Number(normalized);

      if (index >= 0 && index < options.length) {
        return index;
      }
    }

    return options.findIndex(
      option =>
        String(option).trim().toLowerCase() === normalized
    );
  }

  function normalizeQuestion(raw, index) {
    if (!validObject(raw)) {
      return null;
    }

    const options = Array.isArray(raw.options)
      ? raw.options
      : [];

    const optionsRW = Array.isArray(raw.options_rw)
      ? raw.options_rw
      : [];

    if (
      typeof raw.question !== "string" ||
      options.length !== 4 ||
      options.some(
        option =>
          typeof option !== "string" ||
          !option.trim()
      )
    ) {
      return null;
    }

    if (
      optionsRW.length > 0 &&
      (
        optionsRW.length !== 4 ||
        optionsRW.some(
          option =>
            typeof option !== "string" ||
            !option.trim()
        )
      )
    ) {
      return null;
    }

    const answerIndexEN = findAnswerIndex(
      raw.answer,
      options
    );

    let answerIndexRW = findAnswerIndex(
      raw.answer_rw,
      optionsRW
    );

    if (answerIndexRW < 0) {
      answerIndexRW = answerIndexEN;
    }

    if (answerIndexEN < 0) {
      const answerFromRW = findAnswerIndex(
        raw.answer_rw,
        options
      );

      if (answerFromRW >= 0) {
        return buildNormalizedQuestion(
          raw,
          index,
          options,
          optionsRW,
          answerFromRW,
          answerFromRW
        );
      }

      return null;
    }

    if (answerIndexRW < 0) {
      answerIndexRW = answerIndexEN;
    }

    return buildNormalizedQuestion(
      raw,
      index,
      options,
      optionsRW,
      answerIndexEN,
      answerIndexRW
    );
  }

  function buildNormalizedQuestion(
    raw,
    index,
    options,
    optionsRW,
    answerIndexEN,
    answerIndexRW
  ) {
    return {
      id: String(
        raw.id || `question_${index + 1}`
      ),

      mode: normalizeMode(raw.category),

      category: raw.category || "General Knowledge",

      question: raw.question,

      question_rw:
        raw.question_rw || raw.question,

      options: [...options],

      options_rw: optionsRW.length === 4
        ? [...optionsRW]
        : [...options],

      answerIndexEN,
      answerIndexRW,

      explanation:
        raw.explanation || "",

      explanation_rw:
        raw.explanation_rw ||
        raw.explanation ||
        "",

      image:
        raw.image ||
        raw.imageUrl ||
        raw.image_url ||
        ""
    };
  }

  /* =====================================================
     LOAD QUESTIONS.JSON
  ===================================================== */

  async function loadQuestions() {
    if (elements.startBtn) {
      elements.startBtn.disabled = true;
      elements.startBtn.textContent = "Loading Questions...";
    }

    try {
      const response = await fetch(
        CONFIG.QUESTIONS_FILE,
        {
          cache: "no-cache"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Could not load questions.json (${response.status})`
        );
      }

      const data = await response.json();

      let rawQuestions = [];

      if (Array.isArray(data)) {
        rawQuestions = data;

      } else if (
        validObject(data) &&
        Array.isArray(data.questions)
      ) {
        rawQuestions = data.questions;

      } else {
        throw new Error(
          "Invalid questions.json format."
        );
      }

      const rejectedQuestions = [];

allQuestions = rawQuestions
  .map((rawQuestion, index) => {
    const question = normalizeQuestion(rawQuestion, index);

    if (!question) {
      rejectedQuestions.push({
        questionNumber: index + 1,
        data: rawQuestion
      });
    }

    return question;
  })
  .filter(Boolean);

console.log("IBIBAZO BYOSE:", rawQuestions.length);
console.log("IBIBAZO BYEMEWE:", allQuestions.length);
console.log("IBIBAZO BYANZWE:", rejectedQuestions);

if (allQuestions.length === 0) {
  throw new Error(
    "No valid questions were found. Check rejectedQuestions in Console."
  );
}
  if (allQuestions.length === 0) {
        throw new Error(
          "No valid questions were found."
        );
      }

      const trafficCount = allQuestions.filter(
        question => question.mode === "traffic"
      ).length;

      const generalCount = allQuestions.filter(
        question => question.mode === "general"
      ).length;

      if (trafficCount < CONFIG.QUESTIONS_PER_ROUND) {
        console.warn(
          "Road Safety has fewer than 10 valid questions."
        );
      }

      if (generalCount < CONFIG.QUESTIONS_PER_ROUND) {
        console.warn(
          "General Knowledge has fewer than 10 valid questions."
        );
      }

      restoreState();

      updateSetupUI();
      updateHomeUI();
      updateContinueButton();

      if (elements.startBtn) {
        elements.startBtn.textContent = "▶ Start Quiz";
      }

      announce("questions-loaded", {
        total: allQuestions.length,
        traffic: trafficCount,
        general: generalCount
      });

      return true;

    } catch (error) {
      console.error("Quiz Master loading error:", error);

      if (elements.startBtn) {
        elements.startBtn.disabled = true;
        elements.startBtn.textContent = "Questions Unavailable";
      }

      if (elements.setupError) {
        elements.setupError.textContent =
          "Could not load questions. Please check questions.json and try again.";
      }

      if (elements.homeMessage) {
        elements.homeMessage.textContent =
          error.message;
      }

      announce("error", {
        message: error.message
      });

      return false;
    }
  }

  /* =====================================================
     RESTORE SAVED PROGRESS
  ===================================================== */

  function restoreState() {
    const savedProgress = storageJSON(
      KEYS.PROGRESS,
      {}
    );

    const savedSettings = storageJSON(
      KEYS.SETTINGS,
      {}
    );

    const completed = storageJSON(
      KEYS.COMPLETED,
      null
    );

    const used = storageJSON(
      KEYS.USED_IDS,
      null
    );

    state.language =
      storageGet(KEYS.LANGUAGE, "en");

    state.mode =
      storageGet(KEYS.MODE, "general");

    if (!["en", "rw"].includes(state.language)) {
      state.language = "en";
    }

    if (!["traffic", "general"].includes(state.mode)) {
      state.mode = "general";
    }

    if (validObject(savedProgress)) {
      state.currentRound = Math.max(
        1,
        Number(savedProgress.currentRound) || 1
      );

      state.unlockedRounds = {
        traffic: Math.max(
          1,
          Number(savedProgress.unlockedRounds?.traffic) || 1
        ),

        general: Math.max(
          1,
          Number(savedProgress.unlockedRounds?.general) || 1
        )
      };

      if (validObject(savedProgress.completedRounds)) {
        state.completedRounds = {
          traffic: Array.isArray(
            savedProgress.completedRounds.traffic
          )
            ? savedProgress.completedRounds.traffic
            : [],

          general: Array.isArray(
            savedProgress.completedRounds.general
          )
            ? savedProgress.completedRounds.general
            : []
        };
      }

      if (validObject(savedProgress.usedQuestionIds)) {
        state.usedQuestionIds = {
          traffic: Array.isArray(
            savedProgress.usedQuestionIds.traffic
          )
            ? savedProgress.usedQuestionIds.traffic
            : [],

          general: Array.isArray(
            savedProgress.usedQuestionIds.general
          )
            ? savedProgress.usedQuestionIds.general
            : []
        };
      }

      state.bestScore = Math.max(
        0,
        Number(savedProgress.bestScore) || 0
      );

      state.totalScore = Math.max(
        0,
        Number(savedProgress.totalScore) || 0
      );

      state.lastRoundScore = Math.max(
        0,
        Number(savedProgress.lastRoundScore) || 0
      );
    }

    if (validObject(savedSettings)) {
      if (["en", "rw"].includes(savedSettings.language)) {
        state.language = savedSettings.language;
      }

      if (["traffic", "general"].includes(savedSettings.mode)) {
        state.mode = savedSettings.mode;
      }
    }

    if (validObject(completed)) {
      if (Array.isArray(completed.traffic)) {
        state.completedRounds.traffic = completed.traffic;
      }

      if (Array.isArray(completed.general)) {
        state.completedRounds.general = completed.general;
      }
    }

    if (validObject(used)) {
      if (Array.isArray(used.traffic)) {
        state.usedQuestionIds.traffic = used.traffic;
      }

      if (Array.isArray(used.general)) {
        state.usedQuestionIds.general = used.general;
      }
    }

    state.latestReview = storageJSON(
      KEYS.REVIEW,
      []
    );

    if (!Array.isArray(state.latestReview)) {
      state.latestReview = [];
    }

    const savedSession = storageJSON(
      KEYS.CURRENT_SESSION,
      null
    );

    const progressSession =
      savedProgress.session || null;

    const candidate = savedSession || progressSession;

    state.session = validateSession(candidate)
      ? candidate
      : null;

    if (state.session) {
      state.language = state.session.language;
      state.mode = state.session.mode;
      state.currentRound = state.session.round;
    }

    elements.settingsLanguage.value = state.language;
    elements.settingsMode.value = state.mode;
  }

  function validateSession(session) {
    if (!validObject(session)) return false;

    if (
      !Array.isArray(session.questions) ||
      session.questions.length === 0
    ) {
      return false;
    }

    if (
      !["traffic", "general"].includes(session.mode) ||
      !["en", "rw"].includes(session.language)
    ) {
      return false;
    }

    if (
      session.questions.some(
        item =>
          !validObject(item) ||
          !item.q ||
          !Array.isArray(item.order)
      )
    ) {
      return false;
    }

    return true;
  }

  /* =====================================================
     SAVE PROGRESS
  ===================================================== */

  function saveProgress() {
    const progress = {
      version: 2,

      language: state.language,
      mode: state.mode,

      currentRound: state.currentRound,

      unlockedRounds: state.unlockedRounds,

      completedRounds: state.completedRounds,

      usedQuestionIds: state.usedQuestionIds,

      bestScore: state.bestScore,
      totalScore: state.totalScore,
      lastRoundScore: state.lastRoundScore,

      session: state.session,

      savedAt: Date.now()
    };

    storageSet(KEYS.PROGRESS, progress);

    storageSet(
      KEYS.CURRENT_SESSION,
      state.session
    );

    storageSet(
      KEYS.COMPLETED,
      state.completedRounds
    );

    storageSet(
      KEYS.USED_IDS,
      state.usedQuestionIds
    );

    storageSet(KEYS.BEST_SCORE, state.bestScore);
    storageSet(KEYS.TOTAL_SCORE, state.totalScore);
    storageSet(KEYS.REVIEW, state.latestReview);
    storageSet(KEYS.LANGUAGE, state.language);
    storageSet(KEYS.MODE, state.mode);

    storageSet(KEYS.SETTINGS, {
      language: state.language,
      mode: state.mode
    });
  }

  /* =====================================================
     SCREEN NAVIGATION
  ===================================================== */

  function showScreen(screenName) {
    stopTimer();

    const screens = [
      "homeScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ];

    screens.forEach(id => {
      const screen = $(id);

      if (!screen) return;

      screen.classList.toggle(
        "active",
        id === screenName
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (screenName === "homeScreen") {
      updateHomeUI();
      updateContinueButton();
    }

    if (screenName === "roundsScreen") {
      renderRounds();
    }

    announce("show-screen", {
      screen: screenName
    });
  }

  /* =====================================================
     LANGUAGE AND CATEGORY SETUP
  ===================================================== */

  function updateSetupUI() {
    elements.languageButtons.forEach(button => {
      const selected =
        button.dataset.language === state.language;

      button.classList.toggle("selected", selected);

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });

    elements.modeButtons.forEach(button => {
      const selected =
        button.dataset.mode === state.mode;

      button.classList.toggle("selected", selected);

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });

    if (elements.selectionSummary) {
      elements.selectionSummary.textContent =
        `${state.language === "rw" ? "Language: Ikinyarwanda" : "Language: English"} · ${getCategoryName(state.mode)}`;
    }

    if (elements.confirmSetupBtn) {
      elements.confirmSetupBtn.disabled =
        !state.languageChosen ||
        !state.modeChosen;
    }

    if (elements.setupError) {
      elements.setupError.textContent = "";
    }
  }

  elements.languageButtons.forEach(button => {
    button.addEventListener("click", () => {
      state.language = button.dataset.language;
      state.languageChosen = true;
      state.setupConfirmed = false;

      updateSetupUI();

      if (elements.startBtn) {
        elements.startBtn.disabled = true;
      }

      saveProgress();
    });
  });

  elements.modeButtons.forEach(button => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.modeChosen = true;
      state.setupConfirmed = false;

      updateSetupUI();

      if (elements.startBtn) {
        elements.startBtn.disabled = true;
      }

      saveProgress();
    });
  });

  if (elements.confirmSetupBtn) {
    elements.confirmSetupBtn.addEventListener(
      "click",
      () => {
        if (!state.languageChosen || !state.modeChosen) {
          return;
        }

        const count = getModeQuestions().length;

        if (count === 0) {
          elements.setupError.textContent =
            "No questions are available in this category.";

          return;
        }

        if (count < CONFIG.QUESTIONS_PER_ROUND) {
          elements.setupError.textContent =
            "This category needs at least 10 valid questions.";

          return;
        }

        state.setupConfirmed = true;

        saveProgress();

        elements.startBtn.disabled = false;

        elements.setupError.textContent = "";

        if (elements.homeMessage) {
          elements.homeMessage.textContent =
            "Selection confirmed. You can now start.";
        }

        updateSetupUI();
      }
    );
  }

  /* =====================================================
     HOME SCREEN
  ===================================================== */

  function updateHomeUI() {
    if (elements.homeRound) {
      elements.homeRound.textContent =
        state.currentRound;
    }

    if (elements.homeScore) {
      elements.homeScore.textContent =
        state.bestScore;
    }

    if (elements.homeStars) {
      const percentage =
        state.bestScore / CONFIG.QUESTIONS_PER_ROUND *
        100;

      elements.homeStars.textContent =
        state.bestScore === 0
          ? "⭐"
          : getStars(percentage);
    }

    if (elements.settingsLanguage) {
      elements.settingsLanguage.value = state.language;
    }

    if (elements.settingsMode) {
      elements.settingsMode.value = state.mode;
    }

    updateReviewButton();
  }

  function updateContinueButton() {
    const active =
      state.session &&
      !state.session.finished &&
      state.session.questions.length > 0;

    if (elements.continueBtn) {
      elements.continueBtn.hidden = !active;
    }

    if (elements.startBtn) {
      elements.startBtn.hidden = Boolean(active);

      elements.startBtn.disabled =
        !state.setupConfirmed ||
        getModeQuestions().length <
          CONFIG.QUESTIONS_PER_ROUND;
    }
  }

  /* =====================================================
     SELECT QUESTIONS FOR A ROUND
  ===================================================== */

  function createRoundQuestions(mode) {
    const pool = allQuestions.filter(
      question => question.mode === mode
    );

    if (pool.length < CONFIG.QUESTIONS_PER_ROUND) {
      throw new Error(
        "At least 10 valid questions are required for this category."
      );
    }

    let used = new Set(
      state.usedQuestionIds[mode] || []
    );

    let available = pool.filter(
      question => !used.has(question.id)
    );

    if (available.length < CONFIG.QUESTIONS_PER_ROUND) {
      used = new Set();
      available = [...pool];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    state.usedQuestionIds[mode] = [
      ...used,
      ...selected.map(question => question.id)
    ];

    return selected.map(question => ({
      q: question,
      order: shuffle([0, 1, 2, 3]),
      selectedIndex: null,
      answered: false,
      correct: false,
      timeTaken: 0
    }));
  }

  /* =====================================================
     START AND CONTINUE QUIZ
  ===================================================== */

  function startNewRound(roundNumber, retry = false) {
    if (isProcessing) return;

    isProcessing = true;

    try {
      if (
        getModeQuestions().length <
        CONFIG.QUESTIONS_PER_ROUND
      ) {
        throw new Error(
          "Not enough questions for this category."
        );
      }

      const unlocked =
        state.unlockedRounds[state.mode] || 1;

      if (!retry && roundNumber > unlocked) {
        throw new Error(
          "This round is locked. Complete the previous round first."
        );
      }

      state.currentRound = roundNumber;

      const questions = createRoundQuestions(state.mode);

      state.session = {
        mode: state.mode,
        language: state.language,
        round: roundNumber,

        questions,

        currentIndex: 0,
        score: 0,
        correctCount: 0,

        startedAt: Date.now(),
        finished: false
      };

      currentSelection = null;

      saveProgress();

      renderQuestion();

      showScreen("quizScreen");

      announce("game-started", {
        round: roundNumber,
        category: state.mode,
        totalQuestions: questions.length
      });

    } catch (error) {
      console.error(error);

      if (elements.homeMessage) {
        elements.homeMessage.textContent =
          error.message;
      }

    } finally {
      isProcessing = false;
    }
  }

  function startQuiz() {
    if (!state.setupConfirmed) {
      if (elements.homeMessage) {
        elements.homeMessage.textContent =
          "Please confirm your selection first.";
      }

      return;
    }

    startNewRound(
      state.unlockedRounds[state.mode] || 1
    );
  }

  function continueQuiz() {
    if (!validateSession(state.session)) {
      updateContinueButton();
      return;
    }

    if (state.session.finished) {
      return;
    }

    state.language = state.session.language;
    state.mode = state.session.mode;
    state.currentRound = state.session.round;

    const current =
      state.session.questions[state.session.currentIndex];

    if (current && current.answered) {
      state.session.currentIndex++;

      if (
        state.session.currentIndex >=
        state.session.questions.length
      ) {
        finishRound();
        return;
      }
    }

    saveProgress();

    renderQuestion();
    showScreen("quizScreen");
  }

  if (elements.startBtn) {
    elements.startBtn.addEventListener(
      "click",
      startQuiz
    );
  }

  if (elements.continueBtn) {
    elements.continueBtn.addEventListener(
      "click",
      continueQuiz
    );
  }

  /* =====================================================
     QUESTION DISPLAY
  ===================================================== */

  function getCurrentQuestionEntry() {
    if (!state.session) return null;

    return state.session.questions[
      state.session.currentIndex
    ] || null;
  }

  function getCorrectIndex(question) {
    return state.language === "rw"
      ? question.answerIndexRW
      : question.answerIndexEN;
  }

  function getDisplayedOptions(entry) {
    const question = entry.q;

    const options = state.language === "rw"
      ? question.options_rw
      : question.options;

    return entry.order.map(
      originalIndex => ({
        originalIndex,
        text: options[originalIndex]
      })
    );
  }

  function renderQuestion() {
    const session = state.session;

    if (!session || session.finished) return;

    const entry = getCurrentQuestionEntry();

    if (!entry) {
      finishRound();
      return;
    }

    currentSelection = null;

    const index = session.currentIndex;

    elements.roundLabel.textContent =
      session.round;

    elements.questionCounter.textContent =
      `${index + 1}/${session.questions.length}`;

    elements.scoreNumber.textContent =
      session.score;

    elements.categoryIndicator.textContent =
      getCategoryName(session.mode);

    elements.questionText.textContent =
      getText(
        entry.q.question,
        entry.q.question_rw
      );

    elements.optionsContainer.innerHTML = "";

    elements.answerFeedback.textContent = "";
    elements.explanation.textContent = "";

    elements.nextQuestionBtn.hidden = true;

    elements.submitAnswerBtn.hidden = false;
    elements.submitAnswerBtn.disabled = true;

    const progress =
      (index / session.questions.length) * 100;

    elements.progressFill.style.width =
      `${progress}%`;

    elements.progressBar.setAttribute(
      "aria-valuenow",
      String(Math.round(progress))
    );

    renderQuestionImage(entry.q);

    const displayedOptions =
      getDisplayedOptions(entry);

    const letters = ["A", "B", "C", "D"];

    displayedOptions.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      button.dataset.index =
        option.originalIndex;

      const letter = document.createElement("span");

      letter.className = "option-letter";
      letter.textContent = letters[index];

      const text = document.createElement("span");

      text.textContent = option.text;

      button.appendChild(letter);
      button.appendChild(text);

      button.addEventListener("click", () => {
        selectAnswer(option.originalIndex);
      });

      elements.optionsContainer.appendChild(button);
    });

    startTimer();

    saveProgress();
  }

  function renderQuestionImage(question) {
    const image = elements.questionImage;

    if (!image) return;

    const source = question.image;

    if (!source) {
      image.removeAttribute("src");
      image.style.display = "none";
      return;
    }

    image.onerror = () => {
      image.style.display = "none";
      image.removeAttribute("src");
    };

    image.onload = () => {
      image.style.display = "block";
    };

    image.src = source;
  }

  /* =====================================================
     SELECT ANSWER
  ===================================================== */

  function selectAnswer(index) {
    if (!state.session || isProcessing) return;

    const entry = getCurrentQuestionEntry();

    if (!entry || entry.answered) return;

    currentSelection = index;

    elements.optionsContainer
      .querySelectorAll(".option-btn")
      .forEach(button => {
        const selected =
          Number(button.dataset.index) === index;

        button.classList.toggle(
          "selected",
          selected
        );
      });

    elements.submitAnswerBtn.disabled = false;
  }

  /* =====================================================
     SUBMIT ANSWER
  ===================================================== */

  function submitAnswer() {
    if (
      !state.session ||
      currentSelection === null ||
      isProcessing
    ) {
      return;
    }

    const entry = getCurrentQuestionEntry();

    if (!entry || entry.answered) return;

    isProcessing = true;

    stopTimer();

    const question = entry.q;

    const correctIndex =
      getCorrectIndex(question);

    const isCorrect =
      currentSelection === correctIndex;

    entry.selectedIndex = currentSelection;
    entry.answered = true;
    entry.correct = isCorrect;

    if (isCorrect) {
      state.session.score +=
        CONFIG.POINTS_PER_CORRECT;

      state.session.correctCount++;
    }

    const options =
      state.language === "rw"
        ? question.options_rw
        : question.options;

    const correctAnswer = options[correctIndex];

    const selectedAnswer =
      options[currentSelection];

    elements.optionsContainer
      .querySelectorAll(".option-btn")
      .forEach(button => {
        const index = Number(button.dataset.index);

        button.disabled = true;

        if (index === correctIndex) {
          button.classList.add("correct");
        }

        if (
          index === currentSelection &&
          !isCorrect
        ) {
          button.classList.add("incorrect");
        }
      });

    if (isCorrect) {
      elements.answerFeedback.textContent =
        state.language === "rw"
          ? "✅ Ni byo! Wabonye amanota 10."
          : "✅ Correct! You earned 10 points.";

      elements.answerFeedback.style.color =
        "var(--green)";

    } else {
      elements.answerFeedback.textContent =
        state.language === "rw"
          ? `❌ Si byo. Igisubizo nyacyo ni: ${correctAnswer}`
          : `❌ Incorrect. Correct answer: ${correctAnswer}`;

      elements.answerFeedback.style.color =
        "var(--red)";
    }

    const explanation = getText(
      question.explanation,
      question.explanation_rw
    );

    elements.explanation.textContent =
      explanation;

    elements.scoreNumber.textContent =
      state.session.score;

    elements.submitAnswerBtn.disabled = true;
    elements.submitAnswerBtn.hidden = true;

    elements.nextQuestionBtn.hidden = false;

    saveProgress();

    announce("answer-submitted", {
      correct: isCorrect,
      score: state.session.score,
      question: question.id
    });

    isProcessing = false;
  }

  if (elements.submitAnswerBtn) {
    elements.submitAnswerBtn.addEventListener(
      "click",
      submitAnswer
    );
  }

  /* =====================================================
     TIMER
  ===================================================== */

  function startTimer() {
    stopTimer();

    timeRemaining = getTimerDuration();

    updateTimerUI();

    timerInterval = setInterval(() => {
      if (!state.session) {
        stopTimer();
        return;
      }

      timeRemaining--;

      updateTimerUI();

      if (timeRemaining <= 0) {
        stopTimer();
        handleTimeUp();
      }

    }, 1000);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerUI() {
    elements.timer.textContent =
      Math.max(0, timeRemaining);

    elements.timerBox.classList.toggle(
      "warning",
      timeRemaining <= 10
    );
  }

  function handleTimeUp() {
    const entry = getCurrentQuestionEntry();

    if (!entry || entry.answered) return;

    const correctIndex =
      getCorrectIndex(entry.q);

    entry.answered = true;
    entry.selectedIndex = null;
    entry.correct = false;

    const options =
      state.language === "rw"
        ? entry.q.options_rw
        : entry.q.options;

    const correctAnswer = options[correctIndex];

    elements.optionsContainer
      .querySelectorAll(".option-btn")
      .forEach(button => {
        button.disabled = true;

        if (
          Number(button.dataset.index) === correctIndex
        ) {
          button.classList.add("correct");
        }
      });

    elements.answerFeedback.textContent =
      state.language === "rw"
        ? `⏰ Igihe kirangiye. Igisubizo ni: ${correctAnswer}`
        : `⏰ Time is up. Correct answer: ${correctAnswer}`;

    elements.answerFeedback.style.color =
      "var(--red)";

    elements.explanation.textContent =
      getText(
        entry.q.explanation,
        entry.q.explanation_rw
      );

    elements.submitAnswerBtn.hidden = true;
    elements.nextQuestionBtn.hidden = false;

    saveProgress();
  }

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  function nextQuestion() {
    if (!state.session || isProcessing) return;

    const entry = getCurrentQuestionEntry();

    if (!entry || !entry.answered) return;

    state.session.currentIndex++;

    if (
      state.session.currentIndex >=
      state.session.questions.length
    ) {
      finishRound();
      return;
    }

    renderQuestion();
  }

  if (elements.nextQuestionBtn) {
    elements.nextQuestionBtn.addEventListener(
      "click",
      nextQuestion
    );
  }

  /* =====================================================
     REVIEW DATA
  ===================================================== */

  function createReviewData() {
    if (!state.session) return [];

    return state.session.questions.map(
      (entry, index) => {
        const question = entry.q;

        const correctIndex =
          getCorrectIndex(question);

        const options =
          state.language === "rw"
            ? question.options_rw
            : question.options;

        return {
          id: question.id,

          number: index + 1,

          question: getText(
            question.question,
            question.question_rw
          ),

          options: [...options],

          correctIndex,

          selectedIndex: entry.selectedIndex,

          correctAnswer: options[correctIndex],

          selectedAnswer:
            entry.selectedIndex === null
              ? null
              : options[entry.selectedIndex],

          correct: entry.correct,

          explanation: getText(
            question.explanation,
            question.explanation_rw
          )
        };
      }
    );
  }

  function saveReviewData() {
    state.latestReview = createReviewData();

    storageSet(
      KEYS.REVIEW,
      state.latestReview
    );

    updateReviewButton();

    announce("review-data", {
      answers: state.latestReview
    });
  }

  function updateReviewButton() {
    const available =
      Array.isArray(state.latestReview) &&
      state.latestReview.length > 0;

    if (elements.reviewAnswersBtn) {
      elements.reviewAnswersBtn.hidden = !available;
    }

    if (elements.quizReviewBtn) {
      elements.quizReviewBtn.disabled = !available;
    }
  }

  function renderReview() {
    const container = elements.reviewContainer;

    if (!container) return;

    container.innerHTML = "";

    if (!state.latestReview.length) {
      container.innerHTML =
        "<p>No answers are available to review yet.</p>";

      return;
    }

    state.latestReview.forEach(item => {
      const article = document.createElement("article");

      article.className = "review-item";

      const heading = document.createElement("h3");

      heading.textContent =
        `${item.number}. ${item.question}`;

      const selected = document.createElement("p");

      selected.className =
        item.correct ? "correct-text" : "wrong-text";

      selected.textContent =
        item.selectedAnswer === null
          ? (
              state.language === "rw"
                ? "Igisubizo cyawe: Nta gisubizo watanze."
                : "Your answer: No answer submitted."
            )
          : (
              state.language === "rw"
                ? `Igisubizo watanze: ${item.selectedAnswer}`
                : `Your answer: ${item.selectedAnswer}`
            );

      const correct = document.createElement("p");

      correct.className = "correct-text";

      correct.textContent =
        state.language === "rw"
          ? `Igisubizo nyacyo: ${item.correctAnswer}`
          : `Correct answer: ${item.correctAnswer}`;

      const explanation = document.createElement("p");

      explanation.textContent =
        item.explanation || (
          state.language === "rw"
            ? "Nta bisobanuro bihari."
            : "No explanation available."
        );

      article.append(
        heading,
        selected,
        correct,
        explanation
      );

      container.appendChild(article);
    });
  }

  function openReview() {
    if (state.session) {
      saveReviewData();
    }

    renderReview();
    showScreen("reviewScreen");
  }

  if (elements.quizReviewBtn) {
    elements.quizReviewBtn.addEventListener(
      "click",
      openReview
    );
  }

  if (elements.resultReviewBtn) {
    elements.resultReviewBtn.addEventListener(
      "click",
      openReview
    );
  }

  if (elements.reviewAnswersBtn) {
    elements.reviewAnswersBtn.addEventListener(
      "click",
      openReview
    );
  }

  /* =====================================================
     FINISH ROUND
  ===================================================== */

  function finishRound() {
    if (!state.session || state.session.finished) {
      return;
    }

    stopTimer();

    state.session.finished = true;

    const score = state.session.score;

    const totalQuestions =
      state.session.questions.length;

    const correctCount =
      state.session.correctCount;

    const percentage = Math.round(
      (correctCount / totalQuestions) * 100
    );

    const passed =
      percentage >= CONFIG.PASS_PERCENTAGE;

    const mode = state.session.mode;
    const round = state.session.round;

    state.lastRoundScore = score;

    state.totalScore += score;

    state.bestScore = Math.max(
      state.bestScore,
      score
    );

    if (
      !state.completedRounds[mode].includes(round)
    ) {
      state.completedRounds[mode].push(round);
    }

    if (passed) {
      const nextRound = round + 1;

      const maximum = Math.ceil(
        allQuestions.filter(
          question => question.mode === mode
        ).length / CONFIG.QUESTIONS_PER_ROUND
      );

      state.unlockedRounds[mode] = Math.min(
        maximum,
        Math.max(
          state.unlockedRounds[mode] || 1,
          nextRound
        )
      );
    }

    saveReviewData();
    saveProgress();

    showResults({
      score,
      correctCount,
      totalQuestions,
      percentage,
      passed,
      round,
      mode
    });

    announce("round-finished", {
      score,
      correctCount,
      percentage,
      passed,
      round,
      category: mode
    });
  }

  /* =====================================================
     RESULTS SCREEN
  ===================================================== */

  function showResults(result) {
    const {
      score,
      correctCount,
      totalQuestions,
      percentage,
      passed,
      round,
      mode
    } = result;

    elements.resultScore.textContent = score;

    elements.resultPercent.textContent =
      `${percentage}%`;

    elements.resultCorrect.textContent =
      `${correctCount}/${totalQuestions}`;

    elements.resultPassMark.textContent =
      `${CONFIG.PASS_PERCENTAGE}%`;

    elements.resultStars.textContent =
      getStars(percentage);

    elements.resultTitle.textContent =
      state.language === "rw"
        ? "Round irarangiye!"
        : "Round Complete!";

    elements.resultMessage.textContent =
      passed
        ? (
            state.language === "rw"
              ? "Wabikoze neza! Wemerewe gukomeza kuri Round ikurikira."
              : "Excellent work! You have unlocked the next round."
          )
        : (
            state.language === "rw"
              ? "Ongera ugerageze kugira ngo ubone nibura 70%."
              : "Keep practicing! You need at least 70% to unlock the next round."
          );

    const maximum = Math.ceil(
      allQuestions.filter(
        question => question.mode === mode
      ).length / CONFIG.QUESTIONS_PER_ROUND
    );

    const hasNextRound =
      passed && round < maximum;

    elements.resultNextBtn.hidden =
      !hasNextRound;

    elements.retryBtn.hidden = false;

    showScreen("resultScreen");
  }

  /* =====================================================
     RETRY ROUND
  ===================================================== */

  function retryRound() {
    if (!state.session) return;

    const round = state.session.round;

    startNewRound(round, true);
  }

  if (elements.retryBtn) {
    elements.retryBtn.addEventListener(
      "click",
      retryRound
    );
  }

  /* =====================================================
     NEXT ROUND
  ===================================================== */

  if (elements.resultNextBtn) {
    elements.resultNextBtn.addEventListener(
      "click",
      () => {
        if (!state.session) return;

        const nextRound =
          state.session.round + 1;

        if (
          nextRound >
          state.unlockedRounds[state.mode]
        ) {
          return;
        }

        startNewRound(nextRound);
      }
    );
  }

  /* =====================================================
     QUIZ ROUNDS SCREEN
  ===================================================== */

  function renderRounds() {
    const container = elements.roundList;

    if (!container) return;

    container.innerHTML = "";

    const total = getTotalRounds();

    const completed =
      state.completedRounds[state.mode] || [];

    const unlocked =
      state.unlockedRounds[state.mode] || 1;

    elements.roundsCompleted.textContent =
      completed.length;

    elements.roundsTotal.textContent =
      total;

    elements.roundsUnlocked.textContent =
      Math.min(unlocked, total);

    elements.roundsDescription.textContent =
      `${getCategoryName(state.mode)} · ${total} rounds · 10 questions per round`;

    for (let round = 1; round <= total; round++) {
      const isCompleted =
        completed.includes(round);

      const isUnlocked =
        round <= unlocked;

      const button = document.createElement("button");

      button.type = "button";

      button.className =
        "round-card" +
        (isCompleted ? " completed" : "") +
        (!isUnlocked ? " locked" : "");

      const title = document.createElement("span");

      title.textContent =
        `${isCompleted ? "🏆" : isUnlocked ? "🔓" : "🔒"} Round ${round}`;

      const status = document.createElement("span");

      status.className = "round-status";

      status.textContent =
        isCompleted
          ? "Completed"
          : isUnlocked
            ? "Unlocked"
            : "Locked";

      button.append(title, status);

      button.disabled = !isUnlocked;

      button.addEventListener("click", () => {
        if (!isUnlocked) return;

        startNewRound(round);
      });

      container.appendChild(button);
    }
  }

  if (elements.roundsBtn) {
    elements.roundsBtn.addEventListener(
      "click",
      () => showScreen("roundsScreen")
    );
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener(
      "click",
      () => {
        elements.settingsLanguage.value =
          state.language;

        elements.settingsMode.value =
          state.mode;

        showScreen("settingsScreen");
      }
    );
  }

  if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener(
      "click",
      () => {
        const language =
          elements.settingsLanguage.value;

        const mode =
          elements.settingsMode.value;

        if (
          !["en", "rw"].includes(language) ||
          !["traffic", "general"].includes(mode)
        ) {
          elements.settingsMessage.textContent =
            "Invalid settings.";

          return;
        }

        state.language = language;
        state.mode = mode;

        state.languageChosen = true;
        state.modeChosen = true;

        state.setupConfirmed = true;

        storageSet(KEYS.LANGUAGE, language);
        storageSet(KEYS.MODE, mode);

        saveProgress();

        updateSetupUI();
        updateHomeUI();
        updateContinueButton();

        elements.settingsMessage.textContent =
          language === "rw"
            ? "Ibyo wahinduye byabitswe neza."
            : "Your settings have been saved.";

        announce("settings-saved", {
          language,
          mode
        });
      }
    );
  }

  /* =====================================================
     MUSIC MENU
     Music controller remains in index.html.
  ===================================================== */

  const musicMenuButton = $("musicMenuBtn");

  if (musicMenuButton) {
    musicMenuButton.addEventListener(
      "click",
      () => {
        elements.settingsLanguage.value =
          state.language;

        elements.settingsMode.value =
          state.mode;

        showScreen("settingsScreen");

        const musicButton = $("musicToggleBtn");

        if (musicButton) {
          setTimeout(() => {
            musicButton.focus();
          }, 100);
        }
      }
    );
  }

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const url = window.location.origin +
      window.location.pathname;

    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url
    };

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);

        if (elements.homeMessage) {
          elements.homeMessage.textContent =
            "Thanks for sharing Quiz Master!";
        }

        return;
      }

      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);

        if (elements.homeMessage) {
          elements.homeMessage.textContent =
            "✅ Link Copied!";
        }

        return;
      }

      fallbackCopy(url);

    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Sharing failed:", error);
      }
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement("textarea");

    input.value = text;

    input.style.position = "fixed";
    input.style.opacity = "0";

    document.body.appendChild(input);

    input.select();

    try {
      const copied =
        document.execCommand("copy");

      if (elements.homeMessage) {
        elements.homeMessage.textContent =
          copied
            ? "✅ Link Copied!"
            : "Please copy the website link manually.";
      }

    } catch (error) {
      console.warn("Copy failed:", error);

    } finally {
      input.remove();
    }
  }

  if (elements.shareBtn) {
    elements.shareBtn.addEventListener(
      "click",
      shareQuiz
    );
  }

  /* =====================================================
     RESET PROGRESS
  ===================================================== */

  if (elements.resetProgressBtn) {
    elements.resetProgressBtn.addEventListener(
      "click",
      () => {
        const confirmed = window.confirm(
          state.language === "rw"
            ? "Urashaka koko gusiba amanota n'amateka yose? Iki gikorwa ntigisubizwa inyuma."
            : "Are you sure you want to reset all quiz progress and history? This cannot be undone."
        );

        if (!confirmed) return;

        stopTimer();

        state.currentRound = 1;

        state.unlockedRounds = {
          traffic: 1,
          general: 1
        };

        state.completedRounds = {
          traffic: [],
          general: []
        };

        state.usedQuestionIds = {
          traffic: [],
          general: []
        };

        state.bestScore = 0;
        state.totalScore = 0;
        state.lastRoundScore = 0;

        state.session = null;
        state.latestReview = [];

        currentSelection = null;

        saveProgress();

        updateHomeUI();
        updateContinueButton();

        elements.settingsMessage.textContent =
          state.language === "rw"
            ? "Amanota n'amateka byasubijwe ku ntangiriro."
            : "Quiz progress has been reset.";

        announce("progress-reset");
      }
    );
  }

  /* =====================================================
     HOME NAVIGATION
  ===================================================== */

  function goHome() {
    stopTimer();

    saveProgress();

    showScreen("homeScreen");
  }

  [
    "quizHomeBtn",
    "resultHomeBtn",
    "reviewHomeBtn",
    "roundsHomeBtn",
    "settingsHomeBtn"
  ].forEach(id => {
    const button = $(id);

    if (button) {
      button.addEventListener("click", goHome);
    }
  });

  /* =====================================================
     PAGE VISIBILITY AND RECOVERY
  ===================================================== */

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stopTimer();

        saveProgress();

      } else if (
        state.session &&
        !state.session.finished
      ) {
        const entry = getCurrentQuestionEntry();

        if (entry && !entry.answered) {
          startTimer();
        }
      }
    }
  );

  window.addEventListener(
    "beforeunload",
    () => {
      stopTimer();
      saveProgress();
    }
  );

  window.addEventListener(
    "pagehide",
    saveProgress
  );

  /* =====================================================
     PUBLIC API
     Useful for debugging and future extensions.
  ===================================================== */

  window.quizMaster = {
    start: startQuiz,
    continue: continueQuiz,
    retry: retryRound,
    next: nextQuestion,
    submit: submitAnswer,
    review: openReview,

    getState() {
      return {
        language: state.language,
        mode: state.mode,
        currentRound: state.currentRound,
        bestScore: state.bestScore,
        totalScore: state.totalScore,
        session: state.session
      };
    },

    getQuestions() {
      return allQuestions;
    },

    getConfig() {
      return CONFIG;
    },

    save: saveProgress
  };

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async function initialize() {
    updateSetupUI();

    updateReviewButton();

    const loaded = await loadQuestions();

    if (!loaded) return;

    state.languageChosen = true;
    state.modeChosen = true;

    /*
      Existing users can start after confirming.
      Their saved settings are preserved.
    */

    state.setupConfirmed = false;

    updateSetupUI();
    updateHomeUI();
    updateContinueButton();

    if (state.session && !state.session.finished) {
      if (elements.homeMessage) {
        elements.homeMessage.textContent =
          "You have an unfinished quiz. Select Continue Quiz to resume.";
      }
    }

    console.info(
      "Quiz Master initialized successfully.",
      {
        questions: allQuestions.length,
        traffic: allQuestions.filter(
          q => q.mode === "traffic"
        ).length,
        general: allQuestions.filter(
          q => q.mode === "general"
        ).length
      }
    );
  }

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
