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
    PASS_PERCENTAGE: 70
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
      return value === null ? fallback : value;
    } catch (error) {
      console.warn("Storage read failed:", key, error);
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      const storedValue =
        typeof value === "string"
          ? value
          : JSON.stringify(value);

      localStorage.setItem(key, storedValue);
      return true;
    } catch (error) {
      console.warn("Storage write failed:", key, error);
      return false;
    }
  }

  function storageJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Invalid saved data:", key);
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

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
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

  function getModeQuestions(mode = state.mode) {
    return allQuestions.filter(
      question => question.mode === mode
    );
  }

  function getTotalRounds(mode = state.mode) {
    return Math.max(
      1,
      Math.ceil(
        getModeQuestions(mode).length /
        CONFIG.QUESTIONS_PER_ROUND
      )
    );
  }

  function getStars(percentage) {
    if (percentage >= 90) return "⭐⭐⭐";
    if (percentage >= 70) return "⭐⭐";
    if (percentage >= 40) return "⭐";

    return "☆☆☆";
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
      .trim()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ");

    if (
      value === "traffic" ||
      value === "road safety" ||
      value === "amategeko y'umuhanda"
    ) {
      return "traffic";
    }

    if (
      value === "general" ||
      value === "general knowledge" ||
      value === "ubumenyi rusange"
    ) {
      return "general";
    }

    return "";
  }

  function findAnswerIndex(answer, options) {
    if (!Array.isArray(options) || options.length === 0) {
      return -1;
    }

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

    if (!normalized) return -1;

    if (/^\d+$/.test(normalized)) {
      const index = Number(normalized);

      if (index >= 0 && index < options.length) {
        return index;
      }
    }

    return options.findIndex(option =>
      String(option).trim().toLowerCase() === normalized
    );
  }

  function normalizeQuestion(raw, index) {
    if (!validObject(raw)) {
      return null;
    }

    const mode = normalizeMode(
      raw.category || raw.mode || raw.type
    );

    if (!mode) {
      return null;
    }

    const questionEN = raw.question;

    const questionRW =
      raw.question_rw || raw.question;

    const optionsEN = Array.isArray(raw.options)
      ? raw.options
      : [];

    const optionsRW = Array.isArray(raw.options_rw)
      ? raw.options_rw
      : [];

    if (
      typeof questionEN !== "string" ||
      !questionEN.trim() ||
      optionsEN.length !== 4 ||
      optionsEN.some(option =>
        typeof option !== "string" || !option.trim()
      )
    ) {
      return null;
    }

    if (
      typeof questionRW !== "string" ||
      !questionRW.trim()
    ) {
      return null;
    }

    if (
      optionsRW.length > 0 &&
      (
        optionsRW.length !== 4 ||
        optionsRW.some(option =>
          typeof option !== "string" || !option.trim()
        )
      )
    ) {
      return null;
    }

    const finalOptionsRW =
      optionsRW.length === 4
        ? [...optionsRW]
        : [...optionsEN];

    const answerIndexEN = findAnswerIndex(
      raw.answer,
      optionsEN
    );

    let answerIndexRW = findAnswerIndex(
      raw.answer_rw,
      finalOptionsRW
    );

    let finalAnswerEN = answerIndexEN;

    /*
      If only the Kinyarwanda answer is supplied,
      use its matching position for English too.
    */

    if (finalAnswerEN < 0 && answerIndexRW >= 0) {
      finalAnswerEN = answerIndexRW;
    }

    /*
      If answer_rw is missing, use the English answer
      position. This assumes both option arrays have
      the same ordering.
    */

    if (answerIndexRW < 0 && finalAnswerEN >= 0) {
      answerIndexRW = finalAnswerEN;
    }

    if (
      finalAnswerEN < 0 ||
      answerIndexRW < 0
    ) {
      return null;
    }

    return {
      id: String(raw.id || `question_${index + 1}`),

      mode,

      category: raw.category || mode,

      question: questionEN,
      question_rw: questionRW,

      options: [...optionsEN],
      options_rw: finalOptionsRW,

      answerIndexEN: finalAnswerEN,
      answerIndexRW: answerIndexRW,

      explanation:
        typeof raw.explanation === "string"
          ? raw.explanation
          : "",

      explanation_rw:
        typeof raw.explanation_rw === "string"
          ? raw.explanation_rw
          : (
              typeof raw.explanation === "string"
                ? raw.explanation
                : ""
            ),

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
          "Invalid questions.json format. Expected an array of questions."
        );
      }

      const rejectedQuestions = [];

      allQuestions = rawQuestions
        .map((rawQuestion, index) => {
          const question = normalizeQuestion(
            rawQuestion,
            index
          );

          if (!question) {
            rejectedQuestions.push(index + 1);
          }

          return question;
        })
        .filter(Boolean);

      const trafficCount = getModeQuestions("traffic").length;
      const generalCount = getModeQuestions("general").length;

      console.log("Total questions:", rawQuestions.length);
      console.log("Valid questions:", allQuestions.length);
      console.log("Rejected question numbers:", rejectedQuestions);
      console.log("Traffic questions:", trafficCount);
      console.log("General questions:", generalCount);

      if (allQuestions.length === 0) {
        throw new Error(
          "No valid questions were found. Check the question format and category values."
        );
      }

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
        general: generalCount,
        rejected: rejectedQuestions.length
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
        elements.homeMessage.textContent = error.message;
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

    state.language = storageGet(KEYS.LANGUAGE, "en");
    state.mode = storageGet(KEYS.MODE, "general");

    if (!["en", "rw"].includes(state.language)) {
      state.language = "en";
    }

    if (!["traffic", "general"].includes(state.mode)) {
      state.mode = "general";
    }

    if (validObject(savedProgress)) {
      state.currentRound = Math.max(
        1,
        safeNumber(savedProgress.currentRound, 1)
      );

      const unlocked = savedProgress.unlockedRounds || {};

      state.unlockedRounds = {
        traffic: Math.max(
          1,
          safeNumber(unlocked.traffic, 1)
        ),

        general: Math.max(
          1,
          safeNumber(unlocked.general, 1)
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
        safeNumber(savedProgress.bestScore)
      );

      state.totalScore = Math.max(
        0,
        safeNumber(savedProgress.totalScore)
      );

      state.lastRoundScore = Math.max(
        0,
        safeNumber(savedProgress.lastRoundScore)
      );
    }

    /*
      Restore older individual score values
      if they exist outside the progress object.
    */

    state.bestScore = Math.max(
      state.bestScore,
      safeNumber(storageGet(KEYS.BEST_SCORE, 0))
    );

    state.totalScore = Math.max(
      state.totalScore,
      safeNumber(storageGet(KEYS.TOTAL_SCORE, 0))
    );

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
      validObject(savedProgress)
        ? savedProgress.session || null
        : null;

    const candidate = savedSession || progressSession;

    state.session = validateSession(candidate)
      ? candidate
      : null;

    if (state.session) {
      state.language = state.session.language;
      state.mode = state.session.mode;
      state.currentRound = state.session.round;
    }

    if (elements.settingsLanguage) {
      elements.settingsLanguage.value = state.language;
    }

    if (elements.settingsMode) {
      elements.settingsMode.value = state.mode;
    }
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
      !Number.isInteger(session.currentIndex) ||
      session.currentIndex < 0 ||
      session.currentIndex > session.questions.length
    ) {
      return false;
    }

    if (
      !Number.isFinite(Number(session.score)) ||
      !Number.isFinite(Number(session.correctCount))
    ) {
      return false;
    }

    return session.questions.every(item => {
      if (
        !validObject(item) ||
        !validObject(item.q) ||
        !Array.isArray(item.order) ||
        item.order.length !== 4
      ) {
        return false;
      }

      const validOrder = item.order.every(
        number =>
          Number.isInteger(number) &&
          number >= 0 &&
          number <= 3
      );

      return (
        validOrder &&
        Array.isArray(item.q.options) &&
        item.q.options.length === 4 &&
        Array.isArray(item.q.options_rw) &&
        item.q.options_rw.length === 4
      );
    });
  }

  /* =====================================================
     SAVE PROGRESS
  ===================================================== */

  function saveProgress() {
    const progress = {
      version: 3,

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
    storageSet(KEYS.CURRENT_SESSION, state.session);
    storageSet(KEYS.COMPLETED, state.completedRounds);
    storageSet(KEYS.USED_IDS, state.usedQuestionIds);

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
      const language = button.dataset.language;

      if (!["en", "rw"].includes(language)) return;

      state.language = language;
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
      const mode = button.dataset.mode;

      if (!["traffic", "general"].includes(mode)) return;

      state.mode = mode;
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
        if (
          !state.languageChosen ||
          !state.modeChosen
        ) {
          return;
        }

        const count = getModeQuestions().length;

        if (count === 0) {
          if (elements.setupError) {
            elements.setupError.textContent =
              "No questions are available in this category.";
          }

          return;
        }

        if (count < CONFIG.QUESTIONS_PER_ROUND) {
          if (elements.setupError) {
            elements.setupError.textContent =
              "This category needs at least 10 valid questions.";
          }

          return;
        }

        state.setupConfirmed = true;

        saveProgress();

        if (elements.startBtn) {
          elements.startBtn.disabled = false;
        }

        if (elements.setupError) {
          elements.setupError.textContent = "";
        }

        if (elements.homeMessage) {
          elements.homeMessage.textContent =
            "Selection confirmed. You can now start.";
        }

        updateSetupUI();
        updateContinueButton();
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
        (state.bestScore /
          (CONFIG.QUESTIONS_PER_ROUND *
            CONFIG.POINTS_PER_CORRECT)) *
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
      state.session.currentIndex <
        state.session.questions.length;

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
    const pool = getModeQuestions(mode);

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

    /*
      Start a new question cycle only when fewer
      than 10 unused questions remain.
    */

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
      timeRemaining = getTimerDuration();

      saveProgress();

      /*
        Show the screen BEFORE rendering the question.
        showScreen stops any previous timer.
      */

      showScreen("quizScreen");
      renderQuestion();

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
      state.session = null;
      saveProgress();
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

    showScreen("quizScreen");
    renderQuestion();
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

    const options =
      state.language === "rw"
        ? question.options_rw
        : question.options;

    return entry.order.map(originalIndex => ({
      originalIndex,
      text: options[originalIndex]
    }));
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

    if (elements.roundLabel) {
      elements.roundLabel.textContent = session.round;
    }

    if (elements.questionCounter) {
      elements.questionCounter.textContent =
        `${index + 1}/${session.questions.length}`;
    }

    if (elements.scoreNumber) {
      elements.scoreNumber.textContent = session.score;
    }

    if (elements.categoryIndicator) {
      elements.categoryIndicator.textContent =
        getCategoryName(session.mode);
    }

    if (elements.questionText) {
      elements.questionText.textContent =
        getText(
          entry.q.question,
          entry.q.question_rw
        );
    }

    if (elements.optionsContainer) {
      elements.optionsContainer.innerHTML = "";
    }

    if (elements.answerFeedback) {
      elements.answerFeedback.textContent = "";
    }

    if (elements.explanation) {
      elements.explanation.textContent = "";
    }

    if (elements.nextQuestionBtn) {
      elements.nextQuestionBtn.hidden = true;
    }

    if (elements.submitAnswerBtn) {
      elements.submitAnswerBtn.hidden = false;
      elements.submitAnswerBtn.disabled = true;
    }

    const progress =
      (index / session.questions.length) * 100;

    if (elements.progressFill) {
      elements.progressFill.style.width =
        `${progress}%`;
    }

    if (elements.progressBar) {
      elements.progressBar.setAttribute(
        "aria-valuenow",
        String(Math.round(progress))
      );
    }

    renderQuestionImage(entry.q);

    const displayedOptions =
      getDisplayedOptions(entry);

    const letters = ["A", "B", "C", "D"];

    displayedOptions.forEach((option, optionIndex) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      button.dataset.index =
        option.originalIndex;

      const letter = document.createElement("span");

      letter.className = "option-letter";
      letter.textContent = letters[optionIndex];

      const text = document.createElement("span");

      text.textContent = option.text;

      button.appendChild(letter);
      button.appendChild(text);

      button.addEventListener("click", () => {
        selectAnswer(option.originalIndex);
      });

      if (elements.optionsContainer) {
        elements.optionsContainer.appendChild(button);
      }
    });

    startTimer(true);
    saveProgress();
  }

  function renderQuestionImage(question) {
    const image = elements.questionImage;

    if (!image) return;

    const source = question.image;

    if (
      typeof source !== "string" ||
      !source.trim()
    ) {
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

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > 3
    ) {
      return;
    }

    currentSelection = index;

    if (elements.optionsContainer) {
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
    }

    if (elements.submitAnswerBtn) {
      elements.submitAnswerBtn.disabled = false;
    }
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
    const selectedAnswer = options[currentSelection];

    if (elements.optionsContainer) {
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
    }

    if (elements.answerFeedback) {
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
    }

    if (elements.explanation) {
      elements.explanation.textContent =
        getText(
          question.explanation,
          question.explanation_rw
        );
    }

    if (elements.scoreNumber) {
      elements.scoreNumber.textContent =
        state.session.score;
    }

    if (elements.submitAnswerBtn) {
      elements.submitAnswerBtn.disabled = true;
      elements.submitAnswerBtn.hidden = true;
    }

    if (elements.nextQuestionBtn) {
      elements.nextQuestionBtn.hidden = false;
    }

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

  function startTimer(reset = true) {
    stopTimer();

    if (reset || timeRemaining <= 0) {
      timeRemaining = getTimerDuration();
    }

    updateTimerUI();

    timerInterval = setInterval(() => {
      if (!state.session) {
        stopTimer();
        return;
      }

      const entry = getCurrentQuestionEntry();

      if (!entry || entry.answered) {
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
    if (elements.timer) {
      elements.timer.textContent =
        Math.max(0, timeRemaining);
    }

    if (elements.timerBox) {
      elements.timerBox.classList.toggle(
        "warning",
        timeRemaining <= 10
      );
    }
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

    if (elements.optionsContainer) {
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
    }

    if (elements.answerFeedback) {
      elements.answerFeedback.textContent =
        state.language === "rw"
          ? `⏰ Igihe kirangiye. Igisubizo ni: ${correctAnswer}`
          : `⏰ Time is up. Correct answer: ${correctAnswer}`;

      elements.answerFeedback.style.color =
        "var(--red)";
    }

    if (elements.explanation) {
      elements.explanation.textContent =
        getText(
          entry.q.explanation,
          entry.q.explanation_rw
        );
    }

    if (elements.submitAnswerBtn) {
      elements.submitAnswerBtn.hidden = true;
    }

    if (elements.nextQuestionBtn) {
      elements.nextQuestionBtn.hidden = false;
    }

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
          state.session.language === "rw"
            ? question.answerIndexRW
            : question.answerIndexEN;

        const options =
          state.session.language === "rw"
            ? question.options_rw
            : question.options;

        return {
          id: question.id,

          number: index + 1,

          question:
            state.session.language === "rw"
              ? question.question_rw
              : question.question,

          options: [...options],

          correctIndex,

          selectedIndex: entry.selectedIndex,

          correctAnswer: options[correctIndex],

          selectedAnswer:
            entry.selectedIndex === null
              ? null
              : options[entry.selectedIndex],

          correct: entry.correct,

          explanation:
            state.session.language === "rw"
              ? question.explanation_rw
              : question.explanation
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
      const message = document.createElement("p");

      message.textContent =
        state.language === "rw"
          ? "Nta bisubizo byo gusuzuma biraboneka."
          : "No answers are available to review yet.";

      container.appendChild(message);
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
                ? "Igisubizo watanze: Nta gisubizo watanze."
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
        item.explanation ||
        (
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
      const maximum = getTotalRounds(mode);

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

    if (elements.resultScore) {
      elements.resultScore.textContent = score;
    }

    if (elements.resultPercent) {
      elements.resultPercent.textContent =
        `${percentage}%`;
    }

    if (elements.resultCorrect) {
      elements.resultCorrect.textContent =
        `${correctCount}/${totalQuestions}`;
    }

    if (elements.resultPassMark) {
      elements.resultPassMark.textContent =
        `${CONFIG.PASS_PERCENTAGE}%`;
    }

    if (elements.resultStars) {
      elements.resultStars.textContent =
        getStars(percentage);
    }

    if (elements.resultTitle) {
      elements.resultTitle.textContent =
        state.language === "rw"
          ? "Round irarangiye!"
          : "Round Complete!";
    }

    if (elements.resultMessage) {
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
    }

    const maximum = getTotalRounds(mode);

    const hasNextRound =
      passed && round < maximum;

    if (elements.resultNextBtn) {
      elements.resultNextBtn.hidden = !hasNextRound;
    }

    if (elements.retryBtn) {
      elements.retryBtn.hidden = false;
    }

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
          (state.unlockedRounds[state.mode] || 1)
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

    if (elements.roundsCompleted) {
      elements.roundsCompleted.textContent =
        completed.length;
    }

    if (elements.roundsTotal) {
      elements.roundsTotal.textContent = total;
    }

    if (elements.roundsUnlocked) {
      elements.roundsUnlocked.textContent =
        Math.min(unlocked, total);
    }

    if (elements.roundsDescription) {
      elements.roundsDescription.textContent =
        `${getCategoryName(state.mode)} · ${total} rounds · 10 questions per round`;
    }

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
        if (elements.settingsLanguage) {
          elements.settingsLanguage.value =
            state.language;
        }

        if (elements.settingsMode) {
          elements.settingsMode.value =
            state.mode;
        }

        showScreen("settingsScreen");
      }
    );
  }

  if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener(
      "click",
      () => {
        if (
          !elements.settingsLanguage ||
          !elements.settingsMode
        ) {
          return;
        }

        const language =
          elements.settingsLanguage.value;

        const mode =
          elements.settingsMode.value;

        if (
          !["en", "rw"].includes(language) ||
          !["traffic", "general"].includes(mode)
        ) {
          if (elements.settingsMessage) {
            elements.settingsMessage.textContent =
              "Invalid settings.";
          }

          return;
        }

        state.language = language;
        state.mode = mode;

        state.languageChosen = true;
        state.modeChosen = true;
        state.setupConfirmed = true;

        saveProgress();

        updateSetupUI();
        updateHomeUI();
        updateContinueButton();

        if (elements.settingsMessage) {
          elements.settingsMessage.textContent =
            language === "rw"
              ? "Ibyo wahinduye byabitswe neza."
              : "Your settings have been saved.";
        }

        announce("settings-saved", {
          language,
          mode
        });
      }
    );
  }

  /*
    Music menu navigation is handled by index.html.
    No duplicate musicMenuBtn listener is added here.
  */

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const url =
      window.location.origin +
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
        timeRemaining = 0;

        saveProgress();

        updateHomeUI();
        updateContinueButton();

        if (elements.settingsMessage) {
          elements.settingsMessage.textContent =
            state.language === "rw"
              ? "Amanota n'amateka byasubijwe ku ntangiriro."
              : "Quiz progress has been reset.";
        }

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
        /*
          Pause the timer without resetting the
          remaining seconds.
        */

        stopTimer();
        saveProgress();

      } else if (
        state.session &&
        !state.session.finished
      ) {
        const entry = getCurrentQuestionEntry();

        if (entry && !entry.answered) {
          startTimer(false);
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
    () => {
      stopTimer();
      saveProgress();
    }
  );

  /* =====================================================
     PUBLIC API
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
      The user must confirm the selection before
      starting a new quiz after loading the page.
      Saved progress and unfinished sessions remain.
    */

    state.setupConfirmed = false;

    updateSetupUI();
    updateHomeUI();
    updateContinueButton();

    if (
      state.session &&
      !state.session.finished &&
      elements.homeMessage
    ) {
      elements.homeMessage.textContent =
        "You have an unfinished quiz. Select Continue Quiz to resume.";
    }

    console.info(
      "Quiz Master initialized successfully.",
      {
        questions: allQuestions.length,
        traffic: getModeQuestions("traffic").length,
        general: getModeQuestions("general").length
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
