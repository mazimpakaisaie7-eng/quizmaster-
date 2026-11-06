(() => {
  "use strict";

  /* =====================================================
     QUIZ MASTER 🇷🇼
     Quiz engine compatible with the supplied index.html
     Data file: ./questions.json
     Supported categories: traffic, general
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

  const $ = id => document.getElementById(id);

  const state = {
    questions: [],
    language: "en",
    mode: "general",
    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    currentRound: 1,
    roundQuestions: [],
    questionIndex: 0,
    selectedOption: null,
    score: 0,
    correctAnswers: 0,
    answers: [],

    timer: null,
    secondsLeft: 0,
    submitted: false,
    loading: false,

    completed: {
      traffic: [],
      general: []
    },

    used: {
      traffic: [],
      general: []
    },

    bestScore: 0,
    totalScore: 0,
    latestReview: [],
    currentSession: null
  };

  /* =====================================================
     STORAGE HELPERS
  ===================================================== */

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Could not save:", key, error);
      return false;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveString(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn("Could not save preference:", key);
    }
  }

  function normalizeMode(value) {
    const mode = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

    if (
      mode === "traffic" ||
      mode === "road" ||
      mode === "roadsafety" ||
      mode === "trafficrules"
    ) {
      return "traffic";
    }

    if (
      mode === "general" ||
      mode === "generalknowledge" ||
      mode === "knowledge"
    ) {
      return "general";
    }

    return "";
  }

  function normalizeLanguage(value) {
    return String(value || "").toLowerCase() === "rw"
      ? "rw"
      : "en";
  }

  function loadSavedState() {
    state.language = normalizeLanguage(
      readString(CONFIG.STORAGE.LANGUAGE, "en")
    );

    state.mode = normalizeMode(
      readString(CONFIG.STORAGE.MODE, "general")
    ) || "general";

    state.bestScore = Number(
      readString(CONFIG.STORAGE.BEST, "0")
    ) || 0;

    state.totalScore = Number(
      readString(CONFIG.STORAGE.TOTAL, "0")
    ) || 0;

    const progress = readStorage(CONFIG.STORAGE.PROGRESS, {});

    if (progress && typeof progress === "object") {
      state.completed.traffic = Array.isArray(progress.traffic)
        ? progress.traffic.map(Number).filter(Number.isFinite)
        : [];

      state.completed.general = Array.isArray(progress.general)
        ? progress.general.map(Number).filter(Number.isFinite)
        : [];
    }

    const oldCompleted = readStorage(
      CONFIG.STORAGE.COMPLETED,
      null
    );

    if (
      oldCompleted &&
      typeof oldCompleted === "object" &&
      !Array.isArray(oldCompleted)
    ) {
      ["traffic", "general"].forEach(category => {
        if (Array.isArray(oldCompleted[category])) {
          state.completed[category] = [
            ...new Set([
              ...state.completed[category],
              ...oldCompleted[category].map(Number)
            ])
          ].filter(Number.isFinite);
        }
      });
    }

    const used = readStorage(CONFIG.STORAGE.USED, {});

    if (used && typeof used === "object") {
      state.used.traffic = Array.isArray(used.traffic)
        ? used.traffic
        : [];

      state.used.general = Array.isArray(used.general)
        ? used.general
        : [];
    }

    const review = readStorage(CONFIG.STORAGE.REVIEW, []);
    state.latestReview = Array.isArray(review) ? review : [];
  }

  function saveProgress() {
    writeStorage(CONFIG.STORAGE.PROGRESS, state.completed);
    writeStorage(CONFIG.STORAGE.COMPLETED, state.completed);
    writeStorage(CONFIG.STORAGE.USED, state.used);

    saveString(CONFIG.STORAGE.BEST, state.bestScore);
    saveString(CONFIG.STORAGE.TOTAL, state.totalScore);
    saveString(CONFIG.STORAGE.LANGUAGE, state.language);
    saveString(CONFIG.STORAGE.MODE, state.mode);
  }

  /* =====================================================
     QUESTION NORMALIZATION
     Does not modify questions.json.
  ===================================================== */

  function cleanText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function getOptions(raw, language) {
    let options;

    if (language === "rw") {
      options =
        raw.options_rw ||
        raw.choices_rw ||
        raw.optionsKinyarwanda;
    } else {
      options =
        raw.options ||
        raw.options_en ||
        raw.choices ||
        raw.options_en;
    }

    if (Array.isArray(options)) {
      return options.map(cleanText);
    }

    if (options && typeof options === "object") {
      return Object.keys(options)
        .sort()
        .map(key => cleanText(options[key]));
    }

    return [];
  }

  function findAnswerIndex(raw, englishOptions, rwOptions) {
    const answerCandidates = [
      raw.answer,
      raw.correctAnswer,
      raw.correct_answer,
      raw.answer_en,
      raw.answer_rw,
      raw.correct
    ];

    for (const candidate of answerCandidates) {
      if (candidate === null || candidate === undefined) continue;

      if (typeof candidate === "number") {
        if (
          Number.isInteger(candidate) &&
          candidate >= 0 &&
          candidate <= 3
        ) {
          return candidate;
        }

        if (
          Number.isInteger(candidate) &&
          candidate >= 1 &&
          candidate <= 4
        ) {
          return candidate - 1;
        }
      }

      const value = cleanText(candidate).toLowerCase();

      if (!value) continue;

      const englishIndex = englishOptions.findIndex(
        option => option.toLowerCase() === value
      );

      if (englishIndex !== -1) return englishIndex;

      const rwIndex = rwOptions.findIndex(
        option => option.toLowerCase() === value
      );

      if (rwIndex !== -1) return rwIndex;

      const letter = value.match(/^(a|b|c|d)$/);

      if (letter) {
        return "abcd".indexOf(letter[1]);
      }
    }

    return -1;
  }

  function normalizeQuestion(raw, index) {
    if (!raw || typeof raw !== "object") return null;

    const category = normalizeMode(
      raw.category || raw.mode || raw.type
    );

    if (!category) return null;

    const question = cleanText(
      raw.question ||
      raw.question_en ||
      raw.text
    );

    const questionRw = cleanText(
      raw.question_rw ||
      raw.question_kinyarwanda ||
      raw.questionKinyarwanda ||
      question
    );

    const englishOptions = getOptions(raw, "en");
    const rwOptions = getOptions(raw, "rw");

    if (
      !question ||
      englishOptions.length !== 4 ||
      englishOptions.some(option => !option)
    ) {
      return null;
    }

    const finalRwOptions =
      rwOptions.length === 4 && rwOptions.every(Boolean)
        ? rwOptions
        : englishOptions.slice();

    const answerIndex = findAnswerIndex(
      raw,
      englishOptions,
      finalRwOptions
    );

    if (answerIndex < 0 || answerIndex > 3) {
      return null;
    }

    const explanation = cleanText(
      raw.explanation ||
      raw.explanation_en ||
      raw.reason
    );

    const explanationRw = cleanText(
      raw.explanation_rw ||
      raw.explanation_kinyarwanda ||
      explanation
    );

    return {
      id: cleanText(raw.id) || `${category}_${index + 1}`,
      category,
      question,
      question_rw: questionRw,
      options: englishOptions,
      options_rw: finalRwOptions,
      answerIndex,
      answer: englishOptions[answerIndex],
      answer_rw: finalRwOptions[answerIndex],
      explanation,
      explanation_rw: explanationRw,
      image: cleanText(raw.image || raw.image_url || "")
    };
  }

  function extractQuestionArray(data) {
    if (Array.isArray(data)) return data;

    if (!data || typeof data !== "object") return [];

    if (Array.isArray(data.questions)) return data.questions;
    if (Array.isArray(data.data)) return data.data;

    const combined = [];

    if (Array.isArray(data.traffic)) {
      combined.push(...data.traffic);
    }

    if (Array.isArray(data.general)) {
      combined.push(...data.general);
    }

    return combined;
  }

  /* =====================================================
     LOAD QUESTIONS
  ===================================================== */

  async function loadQuestions() {
    if (state.loading) return;

    state.loading = true;
    setText("homeMessage", "Loading questions...");
    setText("setupError", "");

    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Could not load questions.json (HTTP ${response.status}).`
        );
      }

      const data = await response.json();
      const rawQuestions = extractQuestionArray(data);

      if (!rawQuestions.length) {
        throw new Error(
          "questions.json does not contain a valid question array."
        );
      }

      const normalized = [];
      const seenIds = new Set();

      rawQuestions.forEach((raw, index) => {
        const question = normalizeQuestion(raw, index);

        if (!question) return;
        if (seenIds.has(question.id)) return;

        seenIds.add(question.id);
        normalized.push(question);
      });

      state.questions = normalized;

      const trafficCount = getCategoryQuestions("traffic").length;
      const generalCount = getCategoryQuestions("general").length;

      if (!trafficCount && !generalCount) {
        throw new Error(
          "No valid traffic or general questions were found. Check question categories, four options and answer values in questions.json."
        );
      }

      updateHome();
      updateRounds();
      updateReviewButton();

      setText(
        "homeMessage",
        `Loaded ${state.questions.length} questions successfully.`
      );

      document.dispatchEvent(
        new CustomEvent("quizmaster:questions-loaded", {
          detail: {
            total: state.questions.length,
            traffic: trafficCount,
            general: generalCount
          }
        })
      );

      restoreSession();

    } catch (error) {
      console.error("Quiz Master question loading error:", error);

      setText(
        "homeMessage",
        "Questions could not be loaded."
      );

      setText("setupError", error.message);
      const errorElement = $("setupError");

      if (errorElement) {
        errorElement.dataset.type = "error";
      }

      document.dispatchEvent(
        new CustomEvent("quizmaster:error", {
          detail: { message: error.message }
        })
      );

    } finally {
      state.loading = false;
      updateSetupButtons();
    }
  }

  function getCategoryQuestions(category) {
    return state.questions.filter(
      question => question.category === category
    );
  }

  /* =====================================================
     GENERAL UI HELPERS
  ===================================================== */

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value ?? "");
  }

  function setHidden(id, hidden) {
    const element = $(id);
    if (element) element.hidden = Boolean(hidden);
  }

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.toggle(
        "active",
        screen.id === screenId
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (
      screenId === "homeScreen" &&
      window.quizMasterMusic
    ) {
      // Music is controlled by the separate music controller.
    }
  }

  function updateHome() {
    const categoryQuestions = getCategoryQuestions(state.mode);
    const totalRounds = Math.max(
      1,
      Math.ceil(
        categoryQuestions.length / CONFIG.QUESTIONS_PER_ROUND
      )
    );

    const completed = state.completed[state.mode] || [];

    setText(
      "homeRound",
      Math.min(
        totalRounds,
        Math.max(1, getHighestCompleted(state.mode) + 1)
      )
    );

    setText("homeScore", state.bestScore);

    const stars = Math.min(
      3,
      Math.floor(state.bestScore / 40)
    );

    setText(
      "homeStars",
      stars > 0 ? "⭐".repeat(stars) : "☆"
    );

    const reviewAvailable =
      state.latestReview.length > 0;

    setHidden("reviewAnswersBtn", !reviewAvailable);

    updateSetupButtons();
  }

  function updateSetupButtons() {
    const languageButtons = document.querySelectorAll(
      ".language-btn"
    );

    languageButtons.forEach(button => {
      const selected =
        button.dataset.language === state.language;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const modeButtons = document.querySelectorAll(".mode-btn");

    modeButtons.forEach(button => {
      const selected =
        button.dataset.mode === state.mode;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const ready =
      state.languageChosen &&
      state.modeChosen &&
      !state.loading;

    const confirmButton = $("confirmSetupBtn");

    if (confirmButton) {
      confirmButton.disabled = !ready;
    }

    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled =
        !state.setupConfirmed ||
        state.loading ||
        getCategoryQuestions(state.mode).length === 0;
    }

    const summary = $("selectionSummary");

    if (summary) {
      const languageName =
        state.language === "rw" ? "Ikinyarwanda" : "English";

      const categoryName =
        state.mode === "traffic"
          ? "Road Safety"
          : "General Knowledge";

      summary.textContent =
        `Language: ${languageName} | Category: ${categoryName}`;
    }
  }

  function updateReviewButton() {
    const hasReview = state.latestReview.length > 0;
    setHidden("reviewAnswersBtn", !hasReview);
  }

  /* =====================================================
     SETUP
  ===================================================== */

  function chooseLanguage(language) {
    state.language = normalizeLanguage(language);
    state.languageChosen = true;
    state.setupConfirmed = false;

    saveString(CONFIG.STORAGE.LANGUAGE, state.language);

    setText("setupError", "");
    updateSetupButtons();
  }

  function chooseMode(mode) {
    const normalized = normalizeMode(mode);

    if (!normalized) return;

    state.mode = normalized;
    state.modeChosen = true;
    state.setupConfirmed = false;

    saveString(CONFIG.STORAGE.MODE, state.mode);

    setText("setupError", "");
    updateSetupButtons();
    updateHome();
  }

  function confirmSetup() {
    if (!state.languageChosen || !state.modeChosen) {
      setText(
        "setupError",
        "Please choose a language and category."
      );
      return;
    }

    if (!getCategoryQuestions(state.mode).length) {
      setText(
        "setupError",
        "There are no questions in this category."
      );
      return;
    }

    state.setupConfirmed = true;
    saveProgress();

    setText(
      "homeMessage",
      "Selection confirmed. You can now start the quiz."
    );

    setText("setupError", "");
    updateSetupButtons();
  }

  /* =====================================================
     ROUND AND PROGRESS HELPERS
  ===================================================== */

  function getTotalRounds(category) {
    return Math.max(
      1,
      Math.ceil(
        getCategoryQuestions(category).length /
        CONFIG.QUESTIONS_PER_ROUND
      )
    );
  }

  function getHighestCompleted(category) {
    const completed = state.completed[category] || [];

    return completed.length
      ? Math.max(...completed.map(Number).filter(Number.isFinite))
      : 0;
  }

  function getUnlockedRounds(category) {
    return Math.min(
      getTotalRounds(category),
      Math.max(1, getHighestCompleted(category) + 1)
    );
  }

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  function createRoundQuestions(category, roundNumber) {
    const all = getCategoryQuestions(category);

    if (!all.length) return [];

    const usedIds = new Set(state.used[category] || []);

    let available = all.filter(
      question => !usedIds.has(question.id)
    );

    // When the category pool is exhausted, allow questions
    // to be used again.
    if (available.length < Math.min(
      CONFIG.QUESTIONS_PER_ROUND,
      all.length
    )) {
      state.used[category] = [];
      available = all.slice();
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    selected.forEach(question => {
      if (!state.used[category].includes(question.id)) {
        state.used[category].push(question.id);
      }
    });

    saveProgress();

    return selected;
  }

  function updateRounds() {
    const category = state.mode;
    const total = getTotalRounds(category);
    const completed = state.completed[category] || [];
    const unlocked = getUnlockedRounds(category);

    setText("roundsCompleted", completed.length);
    setText("roundsTotal", total);
    setText("roundsUnlocked", unlocked);

    setText(
      "roundsDescription",
      `${category === "traffic" ? "Road Safety" : "General Knowledge"}: complete a round with at least ${CONFIG.PASS_PERCENTAGE}% to unlock the next one.`
    );

    const list = $("roundList");
    if (!list) return;

    list.replaceChildren();

    for (let round = 1; round <= total; round++) {
      const isCompleted = completed.includes(round);
      const isUnlocked = round <= unlocked;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "round-card";

      if (isCompleted) button.classList.add("completed");
      if (!isUnlocked) button.classList.add("locked");

      const left = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = `Round ${round}`;

      const status = document.createElement("span");
      status.className = "round-status";

      status.textContent = isCompleted
        ? "✓ Completed"
        : isUnlocked
          ? "▶ Available"
          : "🔒 Locked";

      left.append(title, document.createElement("br"), status);

      const right = document.createElement("span");
      right.textContent = isCompleted
        ? "⭐"
        : isUnlocked
          ? "Start →"
          : "🔒";

      button.append(left, right);
      button.disabled = !isUnlocked;

      button.addEventListener("click", () => {
        startRound(round);
      });

      list.appendChild(button);
    }
  }

  /* =====================================================
     SESSION SAVE AND RESTORE
  ===================================================== */

  function saveSession() {
    if (!state.roundQuestions.length) return;

    const session = {
      category: state.mode,
      language: state.language,
      round: state.currentRound,
      questionIds: state.roundQuestions.map(q => q.id),
      questionIndex: state.questionIndex,
      score: state.score,
      correctAnswers: state.correctAnswers,
      answers: state.answers,
      selectedOption: state.selectedOption,
      submitted: state.submitted,
      secondsLeft: state.secondsLeft
    };

    state.currentSession = session;

    writeStorage(CONFIG.STORAGE.SESSION, session);
  }

  function clearSession() {
    state.currentSession = null;

    try {
      localStorage.removeItem(CONFIG.STORAGE.SESSION);
    } catch (error) {
      // Ignore unavailable storage.
    }
  }

  function restoreSession() {
    const session = readStorage(
      CONFIG.STORAGE.SESSION,
      null
    );

    if (
      !session ||
      !Array.isArray(session.questionIds) ||
      !session.questionIds.length
    ) {
      setHidden("continueBtn", true);
      return;
    }

    const category = normalizeMode(session.category);

    if (!category) {
      clearSession();
      return;
    }

    const restoredQuestions = session.questionIds
      .map(id => state.questions.find(q => q.id === id))
      .filter(Boolean);

    if (!restoredQuestions.length) {
      clearSession();
      return;
    }

    state.currentSession = session;
    setHidden("continueBtn", false);

    setText(
      "homeMessage",
      "You have an unfinished quiz. Select Continue Quiz to resume."
    );
  }

  function continueQuiz() {
    const session = state.currentSession ||
      readStorage(CONFIG.STORAGE.SESSION, null);

    if (!session) {
      setText("homeMessage", "There is no unfinished quiz.");
      setHidden("continueBtn", true);
      return;
    }

    const category = normalizeMode(session.category);

    const questions = (session.questionIds || [])
      .map(id => state.questions.find(q => q.id === id))
      .filter(Boolean);

    if (!questions.length || !category) {
      clearSession();
      setHidden("continueBtn", true);
      setText("homeMessage", "The saved quiz is no longer available.");
      return;
    }

    state.mode = category;
    state.language = normalizeLanguage(session.language);
    state.currentRound = Number(session.round) || 1;
    state.roundQuestions = questions;
    state.questionIndex = Math.min(
      Math.max(0, Number(session.questionIndex) || 0),
      questions.length - 1
    );
    state.score = Number(session.score) || 0;
    state.correctAnswers = Number(session.correctAnswers) || 0;
    state.answers = Array.isArray(session.answers)
      ? session.answers
      : [];
    state.selectedOption =
      Number.isInteger(session.selectedOption)
        ? session.selectedOption
        : null;
    state.submitted = Boolean(session.submitted);
    state.secondsLeft = Number(session.secondsLeft) || 0;

    showScreen("quizScreen");

    if (state.submitted) {
      renderQuestion();
      showSubmittedAnswer();
    } else {
      renderQuestion();
      startTimer(
        state.secondsLeft > 0
          ? state.secondsLeft
          : getQuestionTime(currentQuestion())
      );
    }

    updateHome();
  }

  /* =====================================================
     START QUIZ
  ===================================================== */

  function startQuiz() {
    if (!state.setupConfirmed) {
      setText(
        "setupError",
        "Please confirm your language and category first."
      );
      return;
    }

    startRound(1);
  }

  function startRound(roundNumber, retryQuestions = null) {
    stopTimer();

    const category = state.mode;
    const unlocked = getUnlockedRounds(category);

    if (roundNumber > unlocked) {
      setText(
        "homeMessage",
        "Complete the previous round with at least 70% first."
      );
      return;
    }

    const questions = retryQuestions ||
      createRoundQuestions(category, roundNumber);

    if (!questions.length) {
      setText(
        "setupError",
        "No valid questions are available in this category."
      );
      showScreen("homeScreen");
      return;
    }

    state.currentRound = roundNumber;
    state.roundQuestions = questions;
    state.questionIndex = 0;
    state.selectedOption = null;
    state.score = 0;
    state.correctAnswers = 0;
    state.answers = [];
    state.submitted = false;
    state.secondsLeft = 0;

    clearSession();
    setHidden("continueBtn", false);

    saveSession();

    showScreen("quizScreen");
    renderQuestion();
    startTimer(getQuestionTime(currentQuestion()));

    document.dispatchEvent(
      new CustomEvent("quizmaster:game-started", {
        detail: {
          category,
          round: roundNumber,
          totalQuestions: questions.length
        }
      })
    );
  }

  function currentQuestion() {
    return state.roundQuestions[state.questionIndex] || null;
  }

  function getQuestionTime(question) {
    if (!question) return CONFIG.GENERAL_TIME;

    return question.category === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  /* =====================================================
     DISPLAY QUESTION
  ===================================================== */

  function getLocalizedQuestion(question) {
    if (!question) return "";

    return state.language === "rw"
      ? question.question_rw || question.question
      : question.question;
  }

  function getLocalizedOptions(question) {
    if (!question) return [];

    return state.language === "rw"
      ? question.options_rw || question.options
      : question.options;
  }

  function getLocalizedExplanation(question) {
    if (!question) return "";

    return state.language === "rw"
      ? question.explanation_rw || question.explanation
      : question.explanation;
  }

  function renderQuestion() {
    const question = currentQuestion();

    if (!question) {
      finishRound();
      return;
    }

    state.submitted = false;
    state.selectedOption = null;

    setText("roundLabel", state.currentRound);
    setText(
      "questionCounter",
      `${state.questionIndex + 1}/${state.roundQuestions.length}`
    );
    setText("scoreNumber", state.score);

    setText(
      "categoryIndicator",
      question.category === "traffic"
        ? "🚦 Road Safety"
        : "🌍 General Knowledge"
    );

    setText("questionText", getLocalizedQuestion(question));

    const image = $("questionImage");

    if (image) {
      const imageUrl = question.image;

      if (
        imageUrl &&
        !/^\s*javascript:/i.test(imageUrl)
      ) {
        image.src = imageUrl;
        image.alt = getLocalizedQuestion(question);
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

    const optionsContainer = $("optionsContainer");

    if (optionsContainer) {
      optionsContainer.replaceChildren();

      const options = getLocalizedOptions(question);
      const letters = ["A", "B", "C", "D"];

      options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-btn";

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = letters[index];

        const text = document.createElement("span");
        text.textContent = option;

        button.append(letter, text);

        button.addEventListener("click", () => {
          selectOption(index);
        });

        optionsContainer.appendChild(button);
      });
    }

    setText("answerFeedback", "");
    setText("explanation", "");

    const submitButton = $("submitAnswerBtn");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.hidden = false;
    }

    setHidden("nextQuestionBtn", true);

    updateQuestionProgress();
    saveSession();
  }

  function selectOption(index) {
    if (state.submitted) return;

    const question = currentQuestion();
    if (!question) return;

    const options = getLocalizedOptions(question);

    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
      return;
    }

    state.selectedOption = index;

    const buttons = document.querySelectorAll(
      "#optionsContainer .option-btn"
    );

    buttons.forEach((button, buttonIndex) => {
      button.classList.toggle(
        "selected",
        buttonIndex === index
      );
    });

    const submitButton = $("submitAnswerBtn");

    if (submitButton) {
      submitButton.disabled = false;
    }

    saveSession();
  }

  function updateQuestionProgress() {
    const total = state.roundQuestions.length || 1;

    const percentage =
      (state.questionIndex / total) * 100;

    const fill = $("progressFill");
    const bar = $("quizProgressBar");

    if (fill) {
      fill.style.width = `${percentage}%`;
    }

    if (bar) {
      bar.setAttribute(
        "aria-valuenow",
        String(Math.round(percentage))
      );
    }
  }

  /* =====================================================
     ANSWER SUBMISSION
  ===================================================== */

  function submitAnswer(isTimeout = false) {
    if (state.submitted) return;

    const question = currentQuestion();
    if (!question) return;

    if (state.selectedOption === null && !isTimeout) {
      setText(
        "answerFeedback",
        state.language === "rw"
          ? "Banza uhitemo igisubizo."
          : "Please select an answer first."
      );
      return;
    }

    stopTimer();

    const selected = state.selectedOption;
    const correct = selected === question.answerIndex;

    state.submitted = true;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.correctAnswers += 1;
    }

    const options = getLocalizedOptions(question);
    const selectedText =
      selected === null
        ? (state.language === "rw" ? "Nta gisubizo" : "No answer")
        : options[selected];

    const correctText = state.language === "rw"
      ? question.answer_rw
      : question.answer;

    const explanation = getLocalizedExplanation(question);

    const answerRecord = {
      id: question.id,
      category: question.category,
      question: question.question,
      question_rw: question.question_rw,
      options: question.options,
      options_rw: question.options_rw,
      selectedIndex: selected,
      selectedAnswer: selectedText,
      correctAnswer: correctText,
      correctIndex: question.answerIndex,
      isCorrect: correct,
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

    setText(
      "answerFeedback",
      isTimeout
        ? (
            state.language === "rw"
              ? "⏰ Igihe kirangiye!"
              : "⏰ Time is up!"
          )
        : correct
          ? (
              state.language === "rw"
                ? "✅ Igisubizo ni cyo!"
                : "✅ Correct answer!"
            )
          : (
              state.language === "rw"
                ? "❌ Igisubizo si cyo."
                : "❌ Incorrect answer."
            )
    );

    const explanationText = explanation
      ? `${state.language === "rw" ? "Ibisobanuro: " : "Explanation: "}${explanation}`
      : `${state.language === "rw" ? "Igisubizo nyacyo: " : "Correct answer: "}${correctText}`;

    setText("explanation", explanationText);

    const buttons = document.querySelectorAll(
      "#optionsContainer .option-btn"
    );

    buttons.forEach((button, index) => {
      button.disabled = true;
      button.classList.remove("selected");

      if (index === question.answerIndex) {
        button.classList.add("correct");
      } else if (index === selected && !correct) {
        button.classList.add("incorrect");
      }
    });

    setText("scoreNumber", state.score);

    const submitButton = $("submitAnswerBtn");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.hidden = true;
    }

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.hidden = false;

      nextButton.textContent =
        state.questionIndex + 1 >= state.roundQuestions.length
          ? (
              state.language === "rw"
                ? "Soza Round →"
                : "Finish Round →"
            )
          : (
              state.language === "rw"
                ? "Ikibazo gikurikira →"
                : "Next Question →"
            );
    }

    saveSession();

    document.dispatchEvent(
      new CustomEvent("quizmaster:answer-submitted", {
        detail: {
          questionId: question.id,
          correct,
          score: state.score
        }
      })
    );
  }

  function showSubmittedAnswer() {
    const question = currentQuestion();
    if (!question) return;

    const record = state.answers.find(
      answer => answer.id === question.id
    );

    if (!record) {
      state.submitted = false;
      startTimer(getQuestionTime(question));
      return;
    }

    state.submitted = true;

    const buttons = document.querySelectorAll(
      "#optionsContainer .option-btn"
    );

    buttons.forEach((button, index) => {
      button.disabled = true;

      if (index === question.answerIndex) {
        button.classList.add("correct");
      } else if (
        index === record.selectedIndex &&
        !record.isCorrect
      ) {
        button.classList.add("incorrect");
      }
    });

    setText(
      "answerFeedback",
      record.isCorrect
        ? "✅ Correct answer!"
        : "❌ Incorrect answer."
    );

    setText(
      "explanation",
      getLocalizedExplanation(question)
    );

    setHidden("submitAnswerBtn", true);
    setHidden("nextQuestionBtn", false);
  }

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  function nextQuestion() {
    if (!state.submitted) return;

    if (state.questionIndex + 1 < state.roundQuestions.length) {
      state.questionIndex += 1;
      state.selectedOption = null;
      state.submitted = false;

      renderQuestion();
      startTimer(getQuestionTime(currentQuestion()));
      return;
    }

    finishRound();
  }

  /* =====================================================
     TIMER
  ===================================================== */

  function startTimer(seconds) {
    stopTimer();

    state.secondsLeft = Math.max(1, Number(seconds) || 1);

    updateTimerDisplay();

    state.timer = window.setInterval(() => {
      state.secondsLeft -= 1;

      updateTimerDisplay();
      saveSession();

      if (state.secondsLeft <= 0) {
        stopTimer();
        submitAnswer(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timer !== null) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function updateTimerDisplay() {
    setText("timer", Math.max(0, state.secondsLeft));

    const timerBox = $("timerBox");

    if (timerBox) {
      timerBox.classList.toggle(
        "warning",
        state.secondsLeft <= 10
      );
    }
  }

  /* =====================================================
     FINISH ROUND AND RESULTS
  ===================================================== */

  function finishRound() {
    stopTimer();

    const totalQuestions = state.roundQuestions.length;
    const percentage = totalQuestions
      ? Math.round(
          (state.correctAnswers / totalQuestions) * 100
        )
      : 0;

    const passed = percentage >= CONFIG.PASS_PERCENTAGE;

    state.bestScore = Math.max(
      state.bestScore,
      state.score
    );

    state.totalScore += state.score;

    if (passed) {
      const completed = state.completed[state.mode];

      if (!completed.includes(state.currentRound)) {
        completed.push(state.currentRound);
      }
    }

    state.latestReview = state.answers.slice();

    writeStorage(
      CONFIG.STORAGE.REVIEW,
      state.latestReview
    );

    saveProgress();
    clearSession();

    setText(
      "resultTitle",
      passed
        ? (
            state.language === "rw"
              ? "🎉 Waratsinze!"
              : "🎉 Round Passed!"
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
              ? "Wakoze neza! Ushobora gukomeza kuri Round ikurikira."
              : "Well done! You can continue to the next round."
          )
        : (
            state.language === "rw"
              ? "Ongera ugerageze kugira ngo ubone nibura 70%."
              : "Try again to reach at least 70%."
          )
    );

    const stars = percentage >= 90
      ? "⭐⭐⭐"
      : percentage >= 70
        ? "⭐⭐"
        : percentage >= 40
          ? "⭐"
          : "☆";

    setText("resultStars", stars);
    setText("resultScore", state.score);
    setText("resultPercent", `${percentage}%`);
    setText(
      "resultCorrect",
      `${state.correctAnswers}/${totalQuestions}`
    );
    setText(
      "resultPassMark",
      `${CONFIG.PASS_PERCENTAGE}%`
    );

    const nextRound = state.currentRound + 1;
    const hasNextRound =
      passed &&
      nextRound <= getTotalRounds(state.mode);

    setHidden("resultNextBtn", !hasNextRound);
    setHidden("retryBtn", passed);

    updateHome();
    updateRounds();
    updateReviewButton();

    showScreen("resultScreen");

    document.dispatchEvent(
      new CustomEvent("quizmaster:round-finished", {
        detail: {
          category: state.mode,
          round: state.currentRound,
          score: state.score,
          correct: state.correctAnswers,
          total: totalQuestions,
          percentage,
          passed
        }
      })
    );
  }

  function retryRound() {
    if (!state.roundQuestions.length) return;

    const retryQuestions = state.roundQuestions.slice();

    startRound(
      state.currentRound,
      retryQuestions
    );
  }

  function goToNextRound() {
    if (
      !state.completed[state.mode].includes(state.currentRound)
    ) {
      return;
    }

    const nextRound = state.currentRound + 1;

    if (nextRound > getTotalRounds(state.mode)) {
      setText(
        "homeMessage",
        "You have completed all available rounds in this category!"
      );

      showScreen("homeScreen");
      return;
    }

    startRound(nextRound);
  }

  /* =====================================================
     REVIEW ANSWERS
  ===================================================== */

  function showReview() {
    stopTimer();

    const container = $("reviewContainer");
    if (!container) return;

    container.replaceChildren();

    const records = state.answers.length
      ? state.answers
      : state.latestReview;

    if (!records.length) {
      const message = document.createElement("p");

      message.textContent =
        state.language === "rw"
          ? "Nta bisubizo byo gusubiramo biraboneka."
          : "There are no answers to review yet.";

      container.appendChild(message);
      showScreen("reviewScreen");
      return;
    }

    records.forEach((record, index) => {
      const item = document.createElement("div");
      item.className = "review-item";

      const question = document.createElement("h3");
      question.textContent =
        `${index + 1}. ${
          state.language === "rw"
            ? record.question_rw || record.question
            : record.question
        }`;

      const selected = document.createElement("p");
      selected.className = record.isCorrect
        ? "correct-text"
        : "wrong-text";

      selected.textContent =
        `${state.language === "rw" ? "Igisubizo wahisemo: " : "Your answer: "}${
          record.selectedAnswer || (
            state.language === "rw" ? "Nta gisubizo" : "No answer"
          )
        }`;

      const correct = document.createElement("p");
      correct.className = "correct-text";

      correct.textContent =
        `${state.language === "rw" ? "Igisubizo nyacyo: " : "Correct answer: "}${
          record.correctAnswer || ""
        }`;

      const explanation = document.createElement("p");

      explanation.textContent =
        state.language === "rw"
          ? record.explanation_rw || record.explanation || ""
          : record.explanation || "";

      item.append(
        question,
        selected,
        correct,
        explanation
      );

      container.appendChild(item);
    });

    document.dispatchEvent(
      new CustomEvent("quizmaster:review-data", {
        detail: { answers: records }
      })
    );

    showScreen("reviewScreen");
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  function openSettings() {
    const languageSelect = $("settingsLanguage");
    const modeSelect = $("settingsMode");

    if (languageSelect) {
      languageSelect.value = state.language;
    }

    if (modeSelect) {
      modeSelect.value = state.mode;
    }

    showScreen("settingsScreen");
  }

  function saveSettings() {
    const languageSelect = $("settingsLanguage");
    const modeSelect = $("settingsMode");

    const language = normalizeLanguage(
      languageSelect ? languageSelect.value : state.language
    );

    const mode = normalizeMode(
      modeSelect ? modeSelect.value : state.mode
    );

    if (!mode) {
      setText("settingsMessage", "Please choose a valid category.");
      return;
    }

    if (!getCategoryQuestions(mode).length) {
      setText(
        "settingsMessage",
        "There are no questions in the selected category."
      );
      return;
    }

    state.language = language;
    state.mode = mode;
    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    saveProgress();

    setText(
      "settingsMessage",
      "Settings saved successfully."
    );

    updateSetupButtons();
    updateHome();
    updateRounds();
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Are you sure you want to reset your quiz progress, scores and saved quiz?"
    );

    if (!confirmed) return;

    stopTimer();

    state.completed = {
      traffic: [],
      general: []
    };

    state.used = {
      traffic: [],
      general: []
    };

    state.bestScore = 0;
    state.totalScore = 0;
    state.latestReview = [];
    state.answers = [];

    clearSession();

    [
      CONFIG.STORAGE.PROGRESS,
      CONFIG.STORAGE.COMPLETED,
      CONFIG.STORAGE.USED,
      CONFIG.STORAGE.REVIEW,
      CONFIG.STORAGE.BEST,
      CONFIG.STORAGE.TOTAL
    ].forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore storage errors.
      }
    });

    saveProgress();

    setText(
      "settingsMessage",
      "Progress has been reset."
    );

    updateHome();
    updateRounds();
    updateReviewButton();
  }

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setText("homeMessage", "✅ Link copied!");
        return;
      }

      window.prompt("Copy this Quiz Master link:", shareData.url);

    } catch (error) {
      if (error.name !== "AbortError") {
        setText(
          "homeMessage",
          "Unable to share the link on this device."
        );
      }
    }
  }

  /* =====================================================
     HOME NAVIGATION
  ===================================================== */

  function goHome() {
    stopTimer();

    if (state.roundQuestions.length && !state.submitted) {
      saveSession();
      setHidden("continueBtn", false);
    }

    updateHome();
    showScreen("homeScreen");
  }

  function openRounds() {
    updateRounds();
    showScreen("roundsScreen");
  }

  /* =====================================================
     EVENT LISTENERS
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

    $("startBtn")?.addEventListener(
      "click",
      startQuiz
    );

    $("continueBtn")?.addEventListener(
      "click",
      continueQuiz
    );

    $("submitAnswerBtn")?.addEventListener(
      "click",
      () => submitAnswer(false)
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
      goToNextRound
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

    $("shareBtn")?.addEventListener(
      "click",
      shareQuiz
    );

    $("saveSettingsBtn")?.addEventListener(
      "click",
      saveSettings
    );

    $("resetProgressBtn")?.addEventListener(
      "click",
      resetProgress
    );

    document.addEventListener(
      "quizmaster:music-changed",
      event => {
        const status = $("musicStatus");

        if (status && event.detail) {
          status.textContent = event.detail.enabled
            ? "Music is enabled."
            : "Music is disabled.";
        }
      }
    );

    window.addEventListener("beforeunload", () => {
      if (state.roundQuestions.length) {
        saveSession();
      }

      stopTimer();
    });
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {
    loadSavedState();

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    bindEvents();

    const languageSelect = $("settingsLanguage");
    const modeSelect = $("settingsMode");

    if (languageSelect) {
      languageSelect.value = state.language;
    }

    if (modeSelect) {
      modeSelect.value = state.mode;
    }

    updateSetupButtons();
    updateHome();

    loadQuestions();
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
