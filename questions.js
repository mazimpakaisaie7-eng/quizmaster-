
(() => {
  "use strict";

  /* =====================================================
     QUIZ MASTER 🇷🇼
     Complete bilingual quiz engine
     Data: ./questions.json
     Categories: traffic, general, both
  ===================================================== */

  const CONFIG = Object.freeze({
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    PASS_PERCENTAGE: 70,
    LANGUAGES: ["en", "rw"],
    CATEGORIES: ["traffic", "general", "both"]
  });

  const KEYS = Object.freeze({
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    progress: "quizmasterProgress",
    session: "quizmasterCurrentSession",
    used: "quizmasterUsedQuestionIds",
    completed: "quizmasterCompletedRounds",
    review: "quizmasterReviewAnswers",
    best: "quizmasterBestScore",
    total: "quizmasterTotalScore",
    weekly: "quizmasterWeeklyScores",
    settings: "quizmasterSettings",
    music: "quizmasterMusicEnabled"
  });

  const $ = id => document.getElementById(id);

  const state = {
    questions: [],
    language: "en",
    mode: "general",

    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    session: null,
    reviewAnswers: [],

    timerInterval: null,
    timeRemaining: 0,

    bestScore: 0,
    totalScore: 0,

    progress: {
      traffic: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      },
      both: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      }
    },

    initialized: false
  };

  const LETTERS = ["A", "B", "C", "D"];

  /* =====================================================
     SAFE HELPERS
  ===================================================== */

  function readStorage(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Quiz Master storage error:", key, error);
      return false;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  function writeString(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn("Quiz Master preference error:", error);
    }
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(array) {
    return [...new Set(array)];
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function on(id, event, callback) {
    const element = $(id);
    if (element) {
      element.addEventListener(event, callback);
    }
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setHidden(id, hidden) {
    const element = $(id);
    if (element) element.hidden = hidden;
  }

  function makeId() {
    return "question_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9);
  }

  /* =====================================================
     LANGUAGE AND CATEGORY
  ===================================================== */

  function normalizeLanguage(language) {
    const value = String(language || "")
      .toLowerCase()
      .trim();

    return ["rw", "kinyarwanda"].includes(value) ? "rw" : "en";
  }

  function normalizeMode(category) {
    const value = String(category || "")
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g, "-");

    if ([
      "traffic",
      "road",
      "roads",
      "road-safety",
      "roadsafety",
      "traffic-rules",
      "road-traffic"
    ].includes(value)) {
      return "traffic";
    }

    if ([
      "general",
      "general-knowledge",
      "generalknowledge",
      "gk",
      "ubumenyi-rusange"
    ].includes(value)) {
      return "general";
    }

    if ([
      "both",
      "all",
      "mixed",
      "all-categories"
    ].includes(value)) {
      return "both";
    }

    return null;
  }

  function normalizeSelectedMode(value) {
    return normalizeMode(value) || "general";
  }

  function getCategoryName(category = state.mode) {
    if (state.language === "rw") {
      if (category === "traffic") return "Amategeko y'umuhanda";
      if (category === "both") return "Ibyiciro byombi";
      return "Ubumenyi rusange";
    }

    if (category === "traffic") return "Road Safety";
    if (category === "both") return "All Categories";
    return "General Knowledge";
  }

  function getText(question, englishField, rwField) {
    if (!question) return "";

    const en = question[englishField];
    const rw = question[rwField];

    return state.language === "rw"
      ? (rw || en || "")
      : (en || rw || "");
  }

  function getQuestionDuration(question) {
    const category = question?.category || state.mode;

    return category === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  function getTimerDuration() {
    const question = getCurrentQuestion();

    return getQuestionDuration(question);
  }

  /* =====================================================
     QUESTION OPTIONS
  ===================================================== */

  function optionText(option, language) {
    if (
      typeof option === "string" ||
      typeof option === "number"
    ) {
      return String(option).trim();
    }

    if (option && typeof option === "object") {
      if (language === "rw") {
        return String(
          option.rw ??
          option.text_rw ??
          option.kinyarwanda ??
          option.en ??
          option.text ??
          ""
        ).trim();
      }

      return String(
        option.en ??
        option.text_en ??
        option.text ??
        option.rw ??
        ""
      ).trim();
    }

    return "";
  }

  function getOptionArrays(raw) {
    const english = safeArray(
      raw.options ??
      raw.options_en ??
      raw.choices ??
      raw.choices_en
    );

    const rw = safeArray(
      raw.options_rw ??
      raw.choices_rw
    );

    return { english, rw };
  }

  function findAnswerIndex(raw, englishOptions, rwOptions) {
    const directIndex =
      raw.answer_index ??
      raw.correct_index ??
      raw.correctAnswerIndex;

    if (
      directIndex !== undefined &&
      directIndex !== null &&
      directIndex !== ""
    ) {
      const index = Number(directIndex);

      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index <= 3
      ) {
        return index;
      }
    }

    const possibleAnswers = [
      raw.answer,
      raw.answer_en,
      raw.answer_rw,
      raw.correct_answer,
      raw.correct_answer_en,
      raw.correct_answer_rw
    ].filter(value =>
      value !== undefined &&
      value !== null &&
      value !== ""
    );

    for (const answer of possibleAnswers) {
      if (typeof answer === "number") {
        if (Number.isInteger(answer) && answer >= 0 && answer <= 3) {
          return answer;
        }

        if (Number.isInteger(answer) && answer >= 1 && answer <= 4) {
          return answer - 1;
        }
      }

      const text = String(answer).trim();

      const letterIndex = LETTERS.indexOf(text.toUpperCase());

      if (letterIndex !== -1) return letterIndex;

      let index = englishOptions.findIndex(option =>
        option.trim().toLowerCase() === text.toLowerCase()
      );

      if (index !== -1) return index;

      index = rwOptions.findIndex(option =>
        option.trim().toLowerCase() === text.toLowerCase()
      );

      if (index !== -1) return index;
    }

    return -1;
  }

  /* =====================================================
     NORMALIZE QUESTION
  ===================================================== */

  function normalizeQuestion(raw, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }

    const category = normalizeMode(
      raw.category ??
      raw.mode ??
      raw.type
    );

    // Do not silently convert an unknown category to general.
    if (!category || category === "both") {
      return null;
    }

    const questionEnglish = String(
      raw.question ??
      raw.question_en ??
      ""
    ).trim();

    const questionRw = String(
      raw.question_rw ??
      raw.question_kinyarwanda ??
      raw.question_rw_text ??
      ""
    ).trim();

    if (!questionEnglish && !questionRw) {
      return null;
    }

    const arrays = getOptionArrays(raw);

    const englishOptions = arrays.english.map(option =>
      optionText(option, "en")
    );

    const rwOptions = arrays.rw.map(option =>
      optionText(option, "rw")
    );

    if (englishOptions.length !== 4) return null;

    if (englishOptions.some(option => !option)) return null;

    // If Kinyarwanda options are supplied, they must contain four.
    if (
      arrays.rw.length > 0 &&
      (
        rwOptions.length !== 4 ||
        rwOptions.some(option => !option)
      )
    ) {
      return null;
    }

    const answerIndex = findAnswerIndex(
      raw,
      englishOptions,
      rwOptions
    );

    if (answerIndex < 0 || answerIndex > 3) return null;

    const finalRwOptions = englishOptions.map((option, i) =>
      rwOptions[i] || option
    );

    const explanationEnglish = String(
      raw.explanation ??
      raw.explanation_en ??
      raw.answer_explanation ??
      ""
    ).trim();

    const explanationRw = String(
      raw.explanation_rw ??
      raw.explanation_kinyarwanda ??
      raw.answer_explanation_rw ??
      ""
    ).trim();

    return {
      id: String(raw.id || `question_${index + 1}`),
      category,

      question: questionEnglish || questionRw,
      question_rw: questionRw || questionEnglish,

      options: englishOptions,
      options_rw: finalRwOptions,

      answer: englishOptions[answerIndex],
      answer_rw: finalRwOptions[answerIndex],

      answerIndex,

      explanation: explanationEnglish || explanationRw,
      explanation_rw: explanationRw || explanationEnglish,

      image: String(
        raw.image ??
        raw.image_url ??
        ""
      ).trim()
    };
  }

  /* =====================================================
     READ DIFFERENT JSON STRUCTURES
  ===================================================== */

  function extractQuestions(data) {
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

    if (Array.isArray(data.traffic) || Array.isArray(data.general)) {
      const traffic = safeArray(data.traffic).map(question => ({
        ...question,
        category: question.category || "traffic"
      }));

      const general = safeArray(data.general).map(question => ({
        ...question,
        category: question.category || "general"
      }));

      return [...traffic, ...general];
    }

    if (
      data.questions &&
      typeof data.questions === "object"
    ) {
      const traffic = safeArray(data.questions.traffic).map(q => ({
        ...q,
        category: q.category || "traffic"
      }));

      const general = safeArray(data.questions.general).map(q => ({
        ...q,
        category: q.category || "general"
      }));

      return [...traffic, ...general];
    }

    return [];
  }

  /* =====================================================
     LOAD QUESTIONS.JSON
  ===================================================== */

  async function loadQuestions() {
    const startButton = $("startBtn");

    if (startButton) startButton.disabled = true;

    setMessage(
      "homeMessage",
      state.language === "rw"
        ? "Turimo gutegura ibibazo..."
        : "Loading questions..."
    );

    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `questions.json could not be loaded. HTTP ${response.status}`
        );
      }

      const data = await response.json();

      const rawQuestions = extractQuestions(data);

      if (!rawQuestions.length) {
        throw new Error(
          "JSON contains no question array. Check its structure."
        );
      }

      const validQuestions = [];
      const invalidQuestions = [];

      rawQuestions.forEach((raw, index) => {
        const question = normalizeQuestion(raw, index);

        if (question) {
          validQuestions.push(question);
        } else {
          invalidQuestions.push({
            index: index + 1,
            id: raw?.id || "unknown",
            category: raw?.category || "missing",
            reason: "Invalid category, question, options or answer"
          });

          console.warn(
            `Quiz Master: Invalid question at item ${index + 1}`,
            raw
          );
        }
      });

      // Prevent duplicate IDs.
      const seenIds = new Set();

      state.questions = validQuestions.filter(question => {
        if (seenIds.has(question.id)) {
          console.warn("Duplicate question ID:", question.id);
          return false;
        }

        seenIds.add(question.id);
        return true;
      });

      const trafficCount = getCategoryQuestions("traffic").length;
      const generalCount = getCategoryQuestions("general").length;

      console.table({
        totalLoaded: state.questions.length,
        trafficQuestions: trafficCount,
        generalQuestions: generalCount,
        invalidQuestions: invalidQuestions.length
      });

      if (invalidQuestions.length) {
        console.warn("Invalid questions:", invalidQuestions);
      }

      if (!state.questions.length) {
        throw new Error(
          "No valid questions found. Check question categories and answers."
        );
      }

      updateSetupUI();
      updateHomeUI();
      updateRoundsUI();
      updateReviewButton();

      const selectedCount = getCategoryQuestions(state.mode).length;

      setMessage(
        "homeMessage",
        state.language === "rw"
          ? `Ibibazo ${state.questions.length} byafungutse. Icyiciro wahisemo gifite ${selectedCount}.`
          : `${state.questions.length} questions loaded. Your selected category has ${selectedCount}.`
      );

      if (state.session && !state.session.finished) {
        setHidden("continueBtn", false);
      }

      if (startButton) {
        startButton.disabled = !state.setupConfirmed || selectedCount === 0;
      }

      document.dispatchEvent(
        new CustomEvent("quizmaster:questions-loaded", {
          detail: {
            count: state.questions.length,
            trafficCount,
            generalCount,
            invalidCount: invalidQuestions.length
          }
        })
      );

      return true;

    } catch (error) {
      console.error("Quiz Master loading error:", error);

      setMessage(
        "homeMessage",
        state.language === "rw"
          ? "Ibibazo ntibyafungutse. Reba questions.json, hanyuma wongere ugerageze."
          : "Questions could not be loaded. Check questions.json and try again."
      );

      setMessage("setupError", error.message);

      document.dispatchEvent(
        new CustomEvent("quizmaster:error", {
          detail: { error }
        })
      );

      return false;
    }
  }

  /* =====================================================
     PROGRESS
  ===================================================== */

  function emptyProgress() {
    return {
      completedRounds: [],
      unlockedRound: 1,
      usedQuestionIds: []
    };
  }

  function normalizeProgress(raw) {
    const result = {
      traffic: emptyProgress(),
      general: emptyProgress(),
      both: emptyProgress()
    };

    if (!raw || typeof raw !== "object") return result;

    CONFIG.CATEGORIES.forEach(category => {
      const source = raw[category] || {};

      result[category] = {
        completedRounds: unique(
          safeArray(
            source.completedRounds ??
            source.completed ??
            []
          )
          .map(Number)
          .filter(number =>
            Number.isInteger(number) && number >= 1
          )
        ),

        unlockedRound: Math.max(
          1,
          safeNumber(source.unlockedRound, 1)
        ),

        usedQuestionIds: unique(
          safeArray(
            source.usedQuestionIds ??
            source.used ??
            []
          ).map(String)
        )
      };
    });

    return result;
  }

  function restoreState() {
    state.language = normalizeLanguage(
      readString(KEYS.language, "en")
    );

    state.mode = normalizeSelectedMode(
      readString(KEYS.mode, "general")
    );

    state.bestScore = safeNumber(
      readString(KEYS.best, "0"),
      0
    );

    state.totalScore = safeNumber(
      readString(KEYS.total, "0"),
      0
    );

    state.progress = normalizeProgress(
      readStorage(KEYS.progress, null)
    );

    state.reviewAnswers = safeArray(
      readStorage(KEYS.review, [])
    );

    const settings = readStorage(KEYS.settings, {});

    if (settings && typeof settings === "object") {
      state.language = normalizeLanguage(
        settings.language || state.language
      );

      state.mode = normalizeSelectedMode(
        settings.mode || state.mode
      );
    }

    const savedSession = readStorage(KEYS.session, null);

    if (
      savedSession &&
      typeof savedSession === "object" &&
      Array.isArray(savedSession.questions) &&
      savedSession.questions.length > 0 &&
      !savedSession.finished
    ) {
      const validSession = savedSession.questions.every(entry =>
        entry &&
        typeof entry.questionId === "string" &&
        Number.isInteger(entry.answerIndex) &&
        entry.answerIndex >= 0 &&
        entry.answerIndex <= 3
      );

      if (validSession) {
        state.session = savedSession;

        state.session.mode = normalizeSelectedMode(
          savedSession.mode || state.mode
        );

        state.session.language = normalizeLanguage(
          savedSession.language || state.language
        );

        state.timeRemaining = Math.max(
          0,
          safeNumber(
            savedSession.timeRemaining,
            CONFIG.GENERAL_TIME
          )
        );
      }
    }

    const legacyUsed = readStorage(KEYS.used, null);
    const legacyCompleted = readStorage(KEYS.completed, null);

    if (Array.isArray(legacyUsed)) {
      state.progress[state.mode].usedQuestionIds = unique([
        ...state.progress[state.mode].usedQuestionIds,
        ...legacyUsed.map(String)
      ]);
    }

    if (Array.isArray(legacyCompleted)) {
      state.progress[state.mode].completedRounds = unique([
        ...state.progress[state.mode].completedRounds,
        ...legacyCompleted.map(Number).filter(Number.isFinite)
      ]);
    }

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    if ($("settingsLanguage")) {
      $("settingsLanguage").value = state.language;
    }

    if ($("settingsMode")) {
      $("settingsMode").value = state.mode;
    }

    updateSetupUI();
    updateMusicStatus();
  }

  function saveProgress() {
    writeStorage(KEYS.progress, state.progress);
    writeStorage(KEYS.session, state.session);
    writeStorage(KEYS.review, state.reviewAnswers);

    writeString(KEYS.language, state.language);
    writeString(KEYS.mode, state.mode);
    writeString(KEYS.best, state.bestScore);
    writeString(KEYS.total, state.totalScore);

    const categoryProgress = state.progress[state.mode];

    if (categoryProgress) {
      writeStorage(KEYS.used, categoryProgress.usedQuestionIds);
      writeStorage(KEYS.completed, categoryProgress.completedRounds);
    }

    writeStorage(KEYS.settings, {
      language: state.language,
      mode: state.mode
    });
  }

  /* =====================================================
     MESSAGES
  ===================================================== */

  function setMessage(id, message, type = "") {
    const element = $(id);
    if (!element) return;

    element.textContent = message;

    if (type) {
      element.dataset.type = type;
    } else {
      delete element.dataset.type;
    }
  }

  function getMessage(english, rw) {
    return state.language === "rw" ? rw : english;
  }

  /* =====================================================
     SCREEN NAVIGATION
  ===================================================== */

  function showScreen(screenId) {
    stopTimer();

    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const target = $(screenId);
    if (!target) return;

    target.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (screenId === "homeScreen") updateHomeUI();
    if (screenId === "roundsScreen") updateRoundsUI();
    if (screenId === "reviewScreen") renderReview();

    saveProgress();
  }

  function goHome() {
    showScreen("homeScreen");
    updateHomeUI();
  }

  /* =====================================================
     SETUP
  ===================================================== */

  function updateSetupUI() {
    document.querySelectorAll(".language-btn").forEach(button => {
      const selected = button.dataset.language === state.language;

      button.classList.toggle("selected", selected);
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      const selected =
        normalizeMode(button.dataset.mode) === state.mode;

      button.classList.toggle("selected", selected);
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const summary = $("selectionSummary");

    if (summary) {
      summary.textContent = state.language === "rw"
        ? `Ururimi: Ikinyarwanda | Icyiciro: ${getCategoryName()}`
        : `Language: English | Category: ${getCategoryName()}`;
    }

    const confirmButton = $("confirmSetupBtn");

    if (confirmButton) {
      confirmButton.disabled = !(
        state.languageChosen &&
        state.modeChosen
      );
    }

    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled = !(
        state.setupConfirmed &&
        getCategoryQuestions().length > 0
      );
    }
  }

  function selectLanguage(language) {
    state.language = normalizeLanguage(language);
    state.languageChosen = true;
    state.setupConfirmed = false;

    updateSetupUI();
    setMessage("setupError", "");
    saveProgress();
  }

  function selectMode(mode) {
    const normalized = normalizeMode(mode);

    if (!normalized) {
      setMessage(
        "setupError",
        getMessage(
          "Invalid category selection.",
          "Icyiciro wahisemo nticyemewe."
        ),
        "error"
      );
      return;
    }

    state.mode = normalized;
    state.modeChosen = true;
    state.setupConfirmed = false;

    updateSetupUI();
    setMessage("setupError", "");
    saveProgress();
  }

  function confirmSetup() {
    if (!state.languageChosen || !state.modeChosen) {
      setMessage(
        "setupError",
        getMessage(
          "Please choose a language and category.",
          "Banza uhitemo ururimi n'icyiciro."
        ),
        "error"
      );
      return;
    }

    const count = getCategoryQuestions().length;

    if (count === 0) {
      setMessage(
        "setupError",
        getMessage(
          "There are no valid questions in this category. Check questions.json.",
          "Nta bibazo byemewe biri muri iki cyiciro. Reba questions.json."
        ),
        "error"
      );
      return;
    }

    state.setupConfirmed = true;

    setMessage(
      "setupError",
      getMessage(
        "Selection confirmed. You can start the quiz.",
        "Ibyo wahisemo byemejwe. Ushobora gutangira gukina."
      )
    );

    saveProgress();
    updateSetupUI();
    updateHomeUI();
  }

  /* =====================================================
     QUESTION POOL
  ===================================================== */

  function getCategoryQuestions(category = state.mode) {
    const selected = normalizeSelectedMode(category);

    if (selected === "both") {
      return state.questions.filter(question =>
        question.category === "traffic" ||
        question.category === "general"
      );
    }

    return state.questions.filter(
      question => question.category === selected
    );
  }

  function getTotalRounds(category = state.mode) {
    return Math.ceil(
      getCategoryQuestions(category).length /
      CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getCategoryProgress(category = state.mode) {
    const selected = normalizeSelectedMode(category);

    return state.progress[selected];
  }

  function getUnlockedRound(category = state.mode) {
    const total = getTotalRounds(category);

    if (!total) return 1;

    return Math.min(
      Math.max(1, getCategoryProgress(category).unlockedRound),
      total
    );
  }

  function getNextQuestionPool(category = state.mode) {
    const questions = getCategoryQuestions(category);
    const progress = getCategoryProgress(category);

    const used = new Set(progress.usedQuestionIds);

    let available = questions.filter(
      question => !used.has(question.id)
    );

    if (available.length === 0) {
      progress.usedQuestionIds = [];
      available = [...questions];
    }

    return shuffle(available);
  }

  function getCurrentRound() {
    return getUnlockedRound(state.mode);
  }

  function createRoundQuestions(roundNumber) {
    const pool = getNextQuestionPool(state.mode);

    const selected = pool.slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    return selected.map(question => ({
      questionId: question.id,
      answerIndex: question.answerIndex,

      optionOrder: shuffle([0, 1, 2, 3]),

      selectedOption: null,
      answered: false,
      correct: false,

      timeTaken: 0,
      timeLimit: getQuestionDuration(question)
    }));
  }

  function getQuestionById(id) {
    return state.questions.find(
      question => question.id === id
    );
  }

  /* =====================================================
     START AND CONTINUE
  ===================================================== */

  function startNewRound(roundNumber = null) {
    if (!state.questions.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "Questions are not loaded yet.",
          "Ibibazo ntibirafunguka."
        )
      );
      return;
    }

    if (!state.setupConfirmed) {
      setMessage(
        "setupError",
        getMessage(
          "Please confirm your selection first.",
          "Banza wemeze ibyo wahisemo."
        ),
        "error"
      );
      return;
    }

    const availableCount = getCategoryQuestions().length;

    if (!availableCount) {
      setMessage(
        "homeMessage",
        getMessage(
          "There are no questions in this category.",
          "Nta bibazo biri muri iki cyiciro."
        )
      );
      return;
    }

    const round = roundNumber || getCurrentRound();

    if (round > getUnlockedRound()) {
      setMessage(
        "homeMessage",
        getMessage(
          "Complete the previous round first.",
          "Banza urangize round ibanza."
        )
      );
      return;
    }

    const questions = createRoundQuestions(round);

    if (!questions.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "No questions are available.",
          "Nta bibazo biboneka."
        )
      );
      return;
    }

    state.session = {
      mode: state.mode,
      language: state.language,

      round,
      questions,

      currentIndex: 0,
      score: 0,
      correctCount: 0,

      startedAt: Date.now(),
      finished: false,

      timeRemaining: questions[0].timeLimit
    };

    state.timeRemaining = questions[0].timeLimit;

    saveProgress();
    renderQuestion(true);
    showScreen("quizScreen");

    document.dispatchEvent(
      new CustomEvent("quizmaster:game-started", {
        detail: {
          category: state.mode,
          round,
          questionCount: questions.length
        }
      })
    );
  }

  function continueQuiz() {
    const session = state.session;

    if (
      !session ||
      session.finished ||
      !Array.isArray(session.questions)
    ) {
      startNewRound();
      return;
    }

    state.mode = normalizeSelectedMode(session.mode);
    state.language = normalizeLanguage(session.language);

    state.timeRemaining = Math.max(
      0,
      safeNumber(session.timeRemaining, CONFIG.GENERAL_TIME)
    );

    const current = session.questions[session.currentIndex];

    if (!current) {
      finishRound();
      return;
    }

    if (current.answered) {
      session.currentIndex++;

      if (session.currentIndex >= session.questions.length) {
        finishRound();
        return;
      }
    }

    renderQuestion(false);
    showScreen("quizScreen");

    if (state.timeRemaining <= 0) {
      handleTimeUp();
    }
  }

  /* =====================================================
     DISPLAY QUESTIONS
  ===================================================== */

  function getCurrentQuestionEntry() {
    if (!state.session) return null;

    return state.session.questions[
      state.session.currentIndex
    ] || null;
  }

  function getCurrentQuestion() {
    const entry = getCurrentQuestionEntry();

    return entry
      ? getQuestionById(entry.questionId)
      : null;
  }

  function getDisplayedOptions(question, entry) {
    return entry.optionOrder.map(index => ({
      originalIndex: index,
      text: state.language === "rw"
        ? question.options_rw[index]
        : question.options[index]
    }));
  }

  function renderQuestion(resetTimer = true) {
    const session = state.session;

    if (!session || session.finished) return;

    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (!entry || !question) {
      finishRound();
      return;
    }

    state.mode = normalizeSelectedMode(session.mode);
    state.language = normalizeLanguage(session.language);

    setText("roundLabel", session.round);

    setText(
      "questionCounter",
      `${session.currentIndex + 1}/${session.questions.length}`
    );

    setText("scoreNumber", session.score);
    setText("categoryIndicator", getCategoryName(question.category));
    setText("questionText", getText(question, "question", "question_rw"));

    const image = $("questionImage");

    if (image) {
      if (question.image) {
        image.src = question.image;
        image.style.display = "block";

        image.onerror = () => {
          image.style.display = "none";
        };
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
      }
    }

    const optionsContainer = $("optionsContainer");

    if (!optionsContainer) {
      console.error("Quiz Master: optionsContainer is missing from index.html.");
      return;
    }

    optionsContainer.replaceChildren();

    getDisplayedOptions(question, entry).forEach((option, displayIndex) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = LETTERS[displayIndex];

      const text = document.createElement("span");
      text.textContent = option.text;

      button.append(letter, text);

      button.addEventListener("click", () => {
        selectAnswer(option.originalIndex);
      });

      optionsContainer.appendChild(button);
    });

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
    }

    setHidden("nextQuestionBtn", true);
    setText("answerFeedback", "");
    setText("explanation", "");

    updateProgressUI();

    const duration = safeNumber(
      entry.timeLimit,
      getQuestionDuration(question)
    );

    entry.timeLimit = duration;

    if (resetTimer) {
      state.timeRemaining = duration;
    } else {
      state.timeRemaining = Math.max(
        0,
        safeNumber(session.timeRemaining, duration)
      );
    }

    session.timeRemaining = state.timeRemaining;

    startTimer(false);

    if (entry.answered) {
      restoreAnsweredQuestion();
    }
  }

  function updateProgressUI() {
    if (!state.session) return;

    const total = state.session.questions.length;

    const percent = total
      ? (state.session.currentIndex / total) * 100
      : 0;

    const fill = $("progressFill");

    if (fill) fill.style.width = `${percent}%`;

    const bar = $("quizProgressBar");

    if (bar) {
      bar.setAttribute(
        "aria-valuenow",
        String(Math.round(percent))
      );
    }
  }

  /* =====================================================
     ANSWER SELECTION
  ===================================================== */

  function selectAnswer(originalIndex) {
    const entry = getCurrentQuestionEntry();

    if (
      !entry ||
      entry.answered ||
      !Number.isInteger(originalIndex) ||
      originalIndex < 0 ||
      originalIndex > 3
    ) {
      return;
    }

    entry.selectedOption = originalIndex;

    const buttons = $("optionsContainer")?.querySelectorAll(
      ".option-btn"
    ) || [];

    buttons.forEach((button, displayIndex) => {
      const original = entry.optionOrder[displayIndex];

      button.classList.toggle(
        "selected",
        original === originalIndex
      );
    });

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = false;
    }

    saveProgress();
  }

  function submitAnswer() {
    const session = state.session;
    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (
      !session ||
      !entry ||
      !question ||
      entry.answered ||
      entry.selectedOption === null
    ) {
      return;
    }

    stopTimer();

    entry.answered = true;
    entry.correct =
      entry.selectedOption === question.answerIndex;

    entry.timeTaken = Math.max(
      0,
      safeNumber(entry.timeLimit, getQuestionDuration(question)) -
      state.timeRemaining
    );

    if (entry.correct) {
      session.score += CONFIG.POINTS_PER_CORRECT;
      session.correctCount++;
    }

    setText("scoreNumber", session.score);

    showAnswerFeedback(question, entry);

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
    }

    setHidden("nextQuestionBtn", false);

    $("optionsContainer")
      ?.querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question.answerIndex) {
          button.classList.add("correct");
        }

        if (
          originalIndex === entry.selectedOption &&
          !entry.correct
        ) {
          button.classList.add("incorrect");
        }
      });

    saveProgress();
    updateReviewButton();
  }

  function showAnswerFeedback(question, entry) {
    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent = entry.correct
        ? getMessage("✓ Correct answer!", "✓ Igisubizo ni cyo!")
        : getMessage("✗ Incorrect answer.", "✗ Igisubizo si cyo.");

      feedback.className = entry.correct
        ? "correct-text"
        : "wrong-text";
    }

    const correctAnswer = getText(
      question,
      "answer",
      "answer_rw"
    );

    const explanation = getText(
      question,
      "explanation",
      "explanation_rw"
    );

    setText(
      "explanation",
      explanation
        ? `${getMessage("Explanation:", "Ibisobanuro:")} ${explanation}`
        : `${getMessage("Correct answer:", "Igisubizo nyacyo:")} ${correctAnswer}`
    );
  }

  function restoreAnsweredQuestion() {
    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (!entry || !question || !entry.answered) return;

    showAnswerFeedback(question, entry);

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
    }

    setHidden("nextQuestionBtn", false);

    $("optionsContainer")
      ?.querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question.answerIndex) {
          button.classList.add("correct");
        }

        if (
          originalIndex === entry.selectedOption &&
          !entry.correct
        ) {
          button.classList.add("incorrect");
        }
      });
  }

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  function nextQuestion() {
    const session = state.session;

    if (!session) return;

    const entry = getCurrentQuestionEntry();

    if (!entry || !entry.answered) return;

    session.currentIndex++;

    if (session.currentIndex >= session.questions.length) {
      finishRound();
      return;
    }

    const nextEntry = getCurrentQuestionEntry();
    const nextQuestionData = getCurrentQuestion();

    state.timeRemaining = safeNumber(
      nextEntry?.timeLimit,
      getQuestionDuration(nextQuestionData)
    );

    session.timeRemaining = state.timeRemaining;

    renderQuestion(true);
    saveProgress();
  }

  /* =====================================================
     TIMER
  ===================================================== */

  function updateTimerUI() {
    setText("timer", state.timeRemaining);

    const timerBox = $("timerBox");

    if (timerBox) {
      timerBox.classList.toggle(
        "warning",
        state.timeRemaining <= 10
      );
    }
  }

  function stopTimer() {
    if (state.timerInterval !== null) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function startTimer(reset = true) {
    stopTimer();

    const question = getCurrentQuestion();
    const entry = getCurrentQuestionEntry();

    const duration = safeNumber(
      entry?.timeLimit,
      getQuestionDuration(question)
    );

    state.timeRemaining = reset
      ? duration
      : Math.max(
          0,
          safeNumber(
            state.session?.timeRemaining,
            state.timeRemaining
          )
        );

    if (state.session) {
      state.session.timeRemaining = state.timeRemaining;
    }

    updateTimerUI();

    if (state.timeRemaining <= 0) {
      handleTimeUp();
      return;
    }

    state.timerInterval = setInterval(() => {
      if (!state.session || state.session.finished) {
        stopTimer();
        return;
      }

      const currentEntry = getCurrentQuestionEntry();

      if (!currentEntry || currentEntry.answered) {
        stopTimer();
        return;
      }

      state.timeRemaining = Math.max(
        0,
        state.timeRemaining - 1
      );

      state.session.timeRemaining = state.timeRemaining;

      updateTimerUI();

      if (state.timeRemaining <= 0) {
        stopTimer();
        handleTimeUp();
      }
    }, 1000);
  }

  function handleTimeUp() {
    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (!entry || entry.answered) return;

    stopTimer();

    state.timeRemaining = 0;

    if (state.session) {
      state.session.timeRemaining = 0;
    }

    entry.answered = true;
    entry.correct = false;
    entry.selectedOption = null;

    entry.timeTaken = safeNumber(
      entry.timeLimit,
      getQuestionDuration(question)
    );

    if (question) {
      showAnswerFeedback(question, entry);
    }

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
    }

    setHidden("nextQuestionBtn", false);

    $("optionsContainer")
      ?.querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question?.answerIndex) {
          button.classList.add("correct");
        }
      });

    setText(
      "answerFeedback",
      getMessage(
        "Time is up! The correct answer is shown above.",
        "Igihe kirangiye! Igisubizo nyacyo kiragaragazwa hejuru."
      )
    );

    saveProgress();
  }

  /* =====================================================
     FINISH ROUND
  ===================================================== */

  function finishRound() {
    const session = state.session;

    if (!session || session.finished) return;

    stopTimer();

    session.finished = true;

    const total = session.questions.length;
    const correct = session.correctCount;

    const percentage = total
      ? Math.round((correct / total) * 100)
      : 0;

    const passed = percentage >= CONFIG.PASS_PERCENTAGE;

    const progress = getCategoryProgress(session.mode);

    if (passed) {
      if (!progress.completedRounds.includes(session.round)) {
        progress.completedRounds.push(session.round);
      }

      progress.completedRounds.sort((a, b) => a - b);

      progress.unlockedRound = Math.max(
        progress.unlockedRound,
        session.round + 1
      );

      progress.usedQuestionIds = unique([
        ...progress.usedQuestionIds,
        ...session.questions.map(entry => entry.questionId)
      ]);
    }

    state.totalScore += session.score;

    state.bestScore = Math.max(
      state.bestScore,
      session.score
    );

    state.reviewAnswers = session.questions.map(entry => {
      const question = getQuestionById(entry.questionId);

      if (!question) return null;

      return {
        questionId: question.id,
        category: question.category,

        question: question.question,
        question_rw: question.question_rw,

        options: question.options,
        options_rw: question.options_rw,

        answer: question.answer,
        answer_rw: question.answer_rw,

        explanation: question.explanation,
        explanation_rw: question.explanation_rw,

        selectedOption: entry.selectedOption,
        correct: entry.correct,
        answered: entry.answered,

        timeTaken: entry.timeTaken
      };
    }).filter(Boolean);

    writeStorage(KEYS.review, state.reviewAnswers);

    saveWeeklyScore(session.score);
    saveProgress();

    renderResults({
      passed,
      percentage,
      correct,
      total,
      score: session.score,
      round: session.round
    });

    showScreen("resultScreen");
    updateReviewButton();

    document.dispatchEvent(
      new CustomEvent("quizmaster:round-finished", {
        detail: {
          passed,
          percentage,
          correct,
          total,
          score: session.score,
          round: session.round
        }
      })
    );
  }

  function saveWeeklyScore(score) {
    const scores = safeArray(
      readStorage(KEYS.weekly, [])
    );

    scores.push({
      date: new Date().toISOString(),
      score: safeNumber(score)
    });

    writeStorage(KEYS.weekly, scores.slice(-100));
  }

  /* =====================================================
     RESULTS
  ===================================================== */

  function resultCategory() {
    return state.session?.mode || state.mode;
  }

  function renderResults(result) {
    const stars = result.percentage >= 90
      ? "⭐⭐⭐"
      : result.percentage >= 70
        ? "⭐⭐"
        : result.percentage >= 40
          ? "⭐"
          : "☆";

    setText(
      "resultTitle",
      result.passed
        ? getMessage("Round Passed!", "Watsinze iyi round!")
        : getMessage("Round Not Passed", "Ntabwo watsinze iyi round.")
    );

    setText(
      "resultMessage",
      result.passed
        ? getMessage(
            "Congratulations! You unlocked the next round.",
            "Urakoze! Wafunguye round ikurikira."
          )
        : getMessage(
            "You need at least 70% to unlock the next round. Try again!",
            "Ukeneye nibura 70% kugira ngo ufungure round ikurikira. Ongera ugerageze!"
          )
    );

    setText("resultStars", stars);
    setText("resultScore", result.score);
    setText("resultPercent", `${result.percentage}%`);
    setText("resultCorrect", `${result.correct}/${result.total}`);
    setText("resultPassMark", `${CONFIG.PASS_PERCENTAGE}%`);

    const nextRoundNumber = result.round + 1;
    const totalRounds = getTotalRounds(resultCategory());

    setHidden(
      "resultNextBtn",
      !(result.passed && nextRoundNumber <= totalRounds)
    );

    setHidden("retryBtn", result.passed);

    if (result.passed && nextRoundNumber > totalRounds) {
      setText(
        "resultMessage",
        getMessage(
          "Excellent! You have completed all available rounds in this category.",
          "Byiza cyane! Warangije rounds zose ziri muri iki cyiciro."
        )
      );
    }
  }

  function retryRound() {
    if (!state.session) return;

    const round = state.session.round;

    state.mode = normalizeSelectedMode(state.session.mode);
    state.language = normalizeLanguage(state.session.language);

    state.session = null;

    startNewRound(round);
  }

  function nextRound() {
    if (!state.session) return;

    const next = state.session.round + 1;

    if (next > getTotalRounds(state.session.mode)) {
      goHome();
      return;
    }

    state.mode = normalizeSelectedMode(state.session.mode);
    state.language = normalizeLanguage(state.session.language);

    state.session = null;

    startNewRound(next);
  }

  /* =====================================================
     REVIEW ANSWERS
  ===================================================== */

  function updateReviewButton() {
    const hasReview = state.reviewAnswers.length > 0;

    setHidden("reviewAnswersBtn", !hasReview);

    const quizButton = $("quizReviewBtn");
    const resultButton = $("resultReviewBtn");

    if (quizButton) quizButton.disabled = !hasReview;
    if (resultButton) resultButton.disabled = !hasReview;
  }

  function openReview() {
    if (!state.reviewAnswers.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "There are no answers to review yet.",
          "Nta bisubizo byo gusubiramo birahari ubu."
        )
      );
      return;
    }

    showScreen("reviewScreen");
    renderReview();
  }

  function renderReview() {
    const container = $("reviewContainer");

    if (!container) return;

    container.replaceChildren();

    if (!state.reviewAnswers.length) {
      const message = document.createElement("p");

      message.textContent = getMessage(
        "No answers available.",
        "Nta bisubizo bihari."
      );

      container.appendChild(message);
      return;
    }

    state.reviewAnswers.forEach((entry, index) => {
      const card = document.createElement("article");
      card.className = "review-item";

      const question = document.createElement("h3");

      question.textContent =
        `${index + 1}. ${getText(entry, "question", "question_rw")}`;

      card.appendChild(question);

      const selected = document.createElement("p");

      const selectedText =
        entry.selectedOption === null ||
        entry.selectedOption === undefined
          ? getMessage("No answer selected", "Nta gisubizo wahisemo")
          : (
              state.language === "rw"
                ? entry.options_rw[entry.selectedOption]
                : entry.options[entry.selectedOption]
            );

      selected.textContent =
        `${getMessage("Your answer:", "Igisubizo wahisemo:")} ${selectedText}`;

      selected.className = entry.correct
        ? "correct-text"
        : "wrong-text";

      card.appendChild(selected);

      const correct = document.createElement("p");
      correct.className = "correct-text";

      correct.textContent =
        `${getMessage("Correct answer:", "Igisubizo nyacyo:")} ${
          getText(entry, "answer", "answer_rw")
        }`;

      card.appendChild(correct);

      const explanation = document.createElement("p");

      explanation.textContent =
        `${getMessage("Explanation:", "Ibisobanuro:")} ${
          getText(entry, "explanation", "explanation_rw")
        }`;

      card.appendChild(explanation);
      container.appendChild(card);
    });

    document.dispatchEvent(
      new CustomEvent("quizmaster:review-data", {
        detail: { answers: state.reviewAnswers }
      })
    );
  }

  /* =====================================================
     HOME SCREEN
  ===================================================== */

  function updateHomeUI() {
    const progress = getCategoryProgress();

    setText("homeRound", getUnlockedRound());
    setText("homeScore", state.bestScore);

    const completed = progress.completedRounds.length;

    setText(
      "homeStars",
      completed >= 10
        ? "⭐⭐⭐"
        : completed >= 5
          ? "⭐⭐"
          : completed >= 1
            ? "⭐"
            : "☆"
    );

    const hasSession = Boolean(
      state.session && !state.session.finished
    );

    setHidden("continueBtn", !hasSession);
    setHidden("startBtn", hasSession);

    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled = !(
        state.setupConfirmed &&
        getCategoryQuestions().length > 0
      );
    }

    updateReviewButton();
  }

  /* =====================================================
     ROUNDS SCREEN
  ===================================================== */

  function updateRoundsUI() {
    const list = $("roundList");

    if (!list) return;

    list.replaceChildren();

    const total = getTotalRounds();
    const progress = getCategoryProgress();
    const unlocked = getUnlockedRound();

    setText("roundsCompleted", progress.completedRounds.length);
    setText("roundsTotal", total);
    setText("roundsUnlocked", Math.min(unlocked, total));

    setText(
      "roundsDescription",
      getMessage(
        `Category: ${getCategoryName()}. Pass each round with at least 70% to unlock the next one.`,
        `Icyiciro: ${getCategoryName()}. Tsinda nibura 70% kugira ngo ufungure round ikurikira.`
      )
    );

    for (let round = 1; round <= total; round++) {
      const completed = progress.completedRounds.includes(round);
      const locked = round > unlocked;

      const button = document.createElement("button");

      button.type = "button";
      button.className = "round-card";

      if (completed) button.classList.add("completed");
      if (locked) button.classList.add("locked");

      button.disabled = locked;

      const title = document.createElement("span");
      title.textContent = `${getMessage("Round", "Round")} ${round}`;

      const status = document.createElement("span");
      status.className = "round-status";

      status.textContent = completed
        ? getMessage("✓ Completed", "✓ Yarangiye")
        : locked
          ? getMessage("🔒 Locked", "🔒 Ifunze")
          : getMessage("▶ Play", "▶ Kina");

      button.append(title, status);

      button.addEventListener("click", () => {
        if (!locked) {
          state.session = null;
          startNewRound(round);
        }
      });

      list.appendChild(button);
    }

    if (total === 0) {
      const message = document.createElement("p");

      message.textContent = getMessage(
        "No questions are available in this category.",
        "Nta bibazo biri muri iki cyiciro."
      );

      list.appendChild(message);
    }
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  function openSettings() {
    if ($("settingsLanguage")) {
      $("settingsLanguage").value = state.language;
    }

    if ($("settingsMode")) {
      $("settingsMode").value = state.mode;
    }

    updateMusicStatus();
    showScreen("settingsScreen");
  }

  function saveSettings() {
    const languageElement = $("settingsLanguage");
    const modeElement = $("settingsMode");

    const newLanguage = normalizeLanguage(
      languageElement?.value || state.language
    );

    const newMode = normalizeSelectedMode(
      modeElement?.value || state.mode
    );

    if (
      state.session &&
      !state.session.finished &&
      (
        newLanguage !== state.session.language ||
        newMode !== state.session.mode
      )
    ) {
      setMessage(
        "settingsMessage",
        getMessage(
          "Finish or leave your current round before changing its language or category.",
          "Banza urangize cyangwa usohoke muri round urimo mbere yo guhindura ururimi cyangwa icyiciro."
        )
      );
      return;
    }

    state.language = newLanguage;
    state.mode = newMode;

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    saveProgress();

    updateSetupUI();
    updateHomeUI();
    updateRoundsUI();

    setMessage(
      "settingsMessage",
      getMessage(
        "Settings saved successfully.",
        "Ibyo wahinduye byabitswe neza."
      )
    );
  }

  function updateMusicStatus() {
    const enabled =
      readString(KEYS.music, "false") === "true";

    const button = $("musicToggleBtn");
    const status = $("musicStatus");

    if (button) {
      button.textContent = enabled
        ? "🔊 Music On"
        : "🔇 Music Off";
    }

    if (status) {
      status.textContent = enabled
        ? getMessage("Music is enabled.", "Umuziki urafunguye.")
        : getMessage("Music is disabled.", "Umuziki urafunze.");
    }
  }

  /* =====================================================
     RESET PROGRESS
  ===================================================== */

  function resetProgress() {
    const confirmed = window.confirm(
      getMessage(
        "Are you sure you want to reset all quiz progress? This cannot be undone.",
        "Urashaka koko gusiba progress yose ya Quiz Master? Ntibishobora gusubizwa."
      )
    );

    if (!confirmed) return;

    stopTimer();

    state.session = null;
    state.reviewAnswers = [];

    state.bestScore = 0;
    state.totalScore = 0;

    state.progress = {
      traffic: emptyProgress(),
      general: emptyProgress(),
      both: emptyProgress()
    };

    Object.values(KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("Could not reset:", key, error);
      }
    });

    state.language = "en";
    state.mode = "general";

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    saveProgress();

    updateSetupUI();
    updateHomeUI();
    updateRoundsUI();
    updateReviewButton();

    setMessage(
      "settingsMessage",
      getMessage(
        "Your quiz progress has been reset.",
        "Progress yawe yasubijwe ku ntangiriro."
      )
    );

    goHome();
  }

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.origin + window.location.pathname
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);

        setMessage(
          "homeMessage",
          getMessage("✓ Link copied!", "✓ Link yakoporowe!")
        );

        return;
      }

      window.prompt(
        getMessage("Copy this link:", "Koporora iyi link:"),
        shareData.url
      );

    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Sharing failed:", error);
      }
    }
  }

  /* =====================================================
     EVENT LISTENERS
  ===================================================== */

  function bindEvents() {
    document.querySelectorAll(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectLanguage(button.dataset.language);
      });
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
      });
    });

    on("confirmSetupBtn", "click", confirmSetup);
    on("startBtn", "click", () => startNewRound());
    on("continueBtn", "click", continueQuiz);

    on("submitAnswerBtn", "click", submitAnswer);
    on("nextQuestionBtn", "click", nextQuestion);

    on("quizReviewBtn", "click", openReview);
    on("quizHomeBtn", "click", goHome);

    on("resultNextBtn", "click", nextRound);
    on("retryBtn", "click", retryRound);
    on("resultReviewBtn", "click", openReview);
    on("resultHomeBtn", "click", goHome);

    on("reviewHomeBtn", "click", goHome);

    on("roundsBtn", "click", () => {
      updateRoundsUI();
      showScreen("roundsScreen");
    });

    on("roundsHomeBtn", "click", goHome);

    on("settingsBtn", "click", openSettings);
    on("saveSettingsBtn", "click", saveSettings);
    on("resetProgressBtn", "click", resetProgress);
    on("settingsHomeBtn", "click", goHome);

    on("reviewAnswersBtn", "click", openReview);
    on("shareBtn", "click", shareQuiz);

    document.addEventListener(
      "quizmaster:music-changed",
      updateMusicStatus
    );
  }

  /* =====================================================
     SAVE ON PAGE HIDDEN / CLOSED
  ===================================================== */

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveProgress();
    }
  });

  window.addEventListener("pagehide", saveProgress);
  window.addEventListener("beforeunload", saveProgress);

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.QuizMaster = {
    getState() {
      return {
        language: state.language,
        mode: state.mode,

        questionsLoaded: state.questions.length,

        trafficQuestions: getCategoryQuestions("traffic").length,
        generalQuestions: getCategoryQuestions("general").length,

        selectedCategoryQuestions: getCategoryQuestions().length,

        session: state.session,

        bestScore: state.bestScore,
        totalScore: state.totalScore
      };
    },

    start: startNewRound,
    continue: continueQuiz,
    home: goHome,
    review: openReview,
    rounds: updateRoundsUI,
    reloadQuestions: loadQuestions
  };

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async function initialize() {
    if (state.initialized) return;

    state.initialized = true;

    restoreState();
    bindEvents();

    updateHomeUI();
    updateRoundsUI();
    updateReviewButton();

    const loaded = await loadQuestions();

    if (!loaded) {
      if ($("startBtn")) {
        $("startBtn").disabled = true;
      }
      return;
    }

    if (state.session && !state.session.finished) {
      setHidden("continueBtn", false);
    }

    updateHomeUI();

    if (
      state.session &&
      state.session.questions.length > 0
    ) {
      setMessage(
        "homeMessage",
        getMessage(
          "You have a quiz in progress. Select Continue Quiz to resume.",
          "Ufite umukino utararangira. Kanda Continue Quiz kugira ngo ukomeze."
        )
      );
    }
  }

  function getQuestionDiagnostics() {
    return {
      total: state.questions.length,
      traffic: getCategoryQuestions("traffic").length,
      general: getCategoryQuestions("general").length,
      both: getCategoryQuestions("both").length,
      selectedCategory: state.mode,
      selectedCategoryCount: getCategoryQuestions().length
    };
  }

  window.QuizMasterDiagnostics = getQuestionDiagnostics;

  initialize();

})();
