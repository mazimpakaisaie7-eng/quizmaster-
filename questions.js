(() => {
  "use strict";

  /* =====================================================
     QUIZ MASTER 🇷🇼
     COMPLETE & COMPATIBLE QUIZ ENGINE
     Supports current and previous index.html IDs
  ===================================================== */

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    PASS_PERCENT: 70,

    STORAGE: {
      progress: "quizmasterProgress",
      used: "quizmasterUsedQuestionIds",
      completed: "quizmasterCompletedRounds",
      review: "quizmasterReviewAnswers",
      best: "quizmasterBestScore",
      total: "quizmasterTotalScore",
      weekly: "quizmasterWeeklyScores",
      settings: "quizmasterSettings",
      session: "quizmasterCurrentSession"
    }
  };

  /* =====================================================
     ELEMENT COMPATIBILITY
     Current and previous index.html IDs are supported.
  ===================================================== */

  const ELEMENTS = {
    homeScreen: ["homeScreen"],
    setupScreen: ["gameSetup", "setupScreen"],
    quizScreen: ["quizScreen"],
    resultScreen: ["resultScreen"],
    reviewScreen: ["reviewScreen"],
    roundsScreen: ["roundsScreen"],
    settingsScreen: ["settingsScreen"],

    startBtn: ["startBtn"],
    continueBtn: ["continueBtn"],
    confirmSetupBtn: ["confirmSetupBtn"],

    homeRound: ["homeRound"],
    homeScore: ["homeScore"],
    homeStars: ["homeStars"],
    homeMessage: ["homeMessage"],

    setupError: ["setupError"],
    selectionSummary: ["selectionSummary"],

    roundsBtn: ["roundsBtn"],
    settingsBtn: ["settingsBtn"],
    shareBtn: ["shareBtn"],
    reviewAnswersBtn: ["reviewAnswersBtn"],

    roundLabel: ["currentRound", "roundLabel", "roundDisplay"],
    questionCounter: ["currentQuestionNumber", "questionCounter", "questionNumber"],
    scoreNumber: ["score", "scoreNumber", "scoreLabel"],
    categoryIndicator: ["categoryIndicator", "category"],
    questionText: ["questionText", "question"],
    optionsContainer: ["optionsContainer", "options"],
    answerFeedback: ["answerFeedback", "message"],
    explanation: ["explanation"],
    timer: ["timer"],
    timerBox: ["timerBox"],
    progressFill: ["progressFill", "progressBar"],

    submitAnswerBtn: ["submitAnswerBtn"],
    nextQuestionBtn: ["nextQuestionBtn", "nextBtn"],

    quizReviewBtn: ["quizReviewBtn", "reviewBtn"],
    quizHomeBtn: ["quizHomeBtn"],

    resultTitle: ["resultTitle"],
    resultMessage: ["resultMessage"],
    resultStars: ["resultStars"],
    resultScore: ["resultScore", "finalScore"],
    resultPercent: ["resultPercent"],
    resultCorrect: ["resultCorrect", "correctCount"],
    resultPassMark: ["resultPassMark"],
    resultNextBtn: ["resultNextBtn", "nextRoundBtn"],
    retryBtn: ["retryBtn", "restartBtn"],
    resultReviewBtn: ["resultReviewBtn", "reviewBtn"],
    resultHomeBtn: ["resultHomeBtn"],

    reviewContainer: ["reviewContainer", "reviewList"],
    reviewSummary: ["reviewSummary"],
    reviewHomeBtn: ["reviewHomeBtn", "reviewBackBtn"],
    reviewRetryBtn: ["reviewRetryBtn"],

    roundList: ["roundList", "roundGrid"],
    roundsCompleted: ["roundsCompleted"],
    roundsTotal: ["roundsTotal"],
    roundsUnlocked: ["roundsUnlocked"],
    roundsHomeBtn: ["roundsHomeBtn", "roundsBackBtn"],

    settingsLanguage: ["settingsLanguage"],
    settingsMode: ["settingsMode"],
    saveSettingsBtn: ["saveSettingsBtn"],
    settingsMessage: ["settingsMessage"],
    settingsHomeBtn: ["settingsHomeBtn", "settingsBackBtn"],
    resetProgressBtn: ["resetProgressBtn"],

    questionImage: ["questionImage"]
  };

  function $(name) {
    const ids = ELEMENTS[name] || [name];

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) return element;
    }

    return null;
  }

  function bind(name, event, callback) {
    const element = $(name);

    if (element) {
      element.addEventListener(event, callback);
    }
  }

  const state = {
    language: "en",
    mode: "general",

    questions: [],
    pool: [],
    roundQuestions: [],

    currentIndex: 0,
    selectedAnswer: null,

    score: 0,
    correct: 0,

    remainingTime: 30,
    timerInterval: null,

    answered: false,
    confirmed: false,
    finished: false,
    loading: false,

    round: 1,
    review: []
  };

  const EVENTS = {
    screen: "quizmaster:show-screen",
    loaded: "quizmaster:questions-loaded",
    error: "quizmaster:error",
    started: "quizmaster:game-started",
    review: "quizmaster:review-data",
    finished: "quizmaster:round-finished"
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      return value === null
        ? fallback
        : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn("Quiz Master storage error:", error);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );
  }

  function getPoolKey() {
    return `${state.language}_${state.mode}`;
  }

  function getTimeLimit() {
    return state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  function showMessage(message) {
    const element = $("homeMessage");

    if (element) {
      element.textContent = message;
    }
  }

  function showSetupError(message) {
    const element = $("setupError");

    if (element) {
      element.textContent = message;
      element.dataset.type = "error";
      element.hidden = false;
    } else {
      showMessage(message);
    }
  }

  function clearSetupError() {
    const element = $("setupError");

    if (element) {
      element.textContent = "";
      element.dataset.type = "";
    }
  }

  function setText(name, value) {
    const element = $(name);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  /* =====================================================
     STORAGE
  ===================================================== */

  function getUsed() {
    const data = read(CONFIG.STORAGE.used, {});

    return Array.isArray(data[getPoolKey()])
      ? data[getPoolKey()]
      : [];
  }

  function saveUsed(ids) {
    const data = read(CONFIG.STORAGE.used, {});

    data[getPoolKey()] = ids;

    write(CONFIG.STORAGE.used, data);
  }

  function getCompleted() {
    const data = read(CONFIG.STORAGE.completed, {});

    return Array.isArray(data[getPoolKey()])
      ? data[getPoolKey()]
      : [];
  }

  function saveCompleted(rounds) {
    const data = read(CONFIG.STORAGE.completed, {});

    data[getPoolKey()] = rounds;

    write(CONFIG.STORAGE.completed, data);
  }

  function getUnlockedRound() {
    const completed = getCompleted();

    let unlocked = 1;

    while (completed.includes(unlocked)) {
      unlocked++;
    }

    return unlocked;
  }

  function saveSession() {
    write(CONFIG.STORAGE.session, {
      language: state.language,
      mode: state.mode,

      round: state.round,
      questions: state.roundQuestions,

      currentIndex: state.currentIndex,
      selectedAnswer: state.selectedAnswer,

      score: state.score,
      correct: state.correct,

      review: state.review,
      answered: state.answered,
      remainingTime: state.remainingTime,

      finished: state.finished
    });
  }

  function getSession() {
    const session = read(
      CONFIG.STORAGE.session,
      null
    );

    if (
      !session ||
      session.language !== state.language ||
      session.mode !== state.mode ||
      !Array.isArray(session.questions) ||
      session.questions.length !== CONFIG.QUESTIONS_PER_ROUND
    ) {
      return null;
    }

    return session;
  }

  /* =====================================================
     QUESTION DATA
  ===================================================== */

  function extractQuestions(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      return [];
    }

    for (const key of ["questions", "data", "items"]) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    const result = [];

    function walk(value) {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }

      if (!value || typeof value !== "object") {
        return;
      }

      if (
        value.question ||
        value.question_en ||
        value.question_rw ||
        value.text ||
        value.text_en ||
        value.text_rw
      ) {
        result.push(value);
        return;
      }

      Object.values(value).forEach(walk);
    }

    walk(data);

    return result;
  }

  function localized(question, fields) {
    const suffix = state.language;

    for (const field of fields) {
      const value = question[`${field}_${suffix}`];

      if (value !== undefined && value !== null) {
        return value;
      }
    }

    for (const field of fields) {
      const value = question[field];

      if (value === undefined || value === null) {
        continue;
      }

      if (
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        return (
          value[suffix] ??
          value.en ??
          value.rw ??
          ""
        );
      }

      return value;
    }

    return "";
  }

  function canonicalCategory(value) {
    const category = normalize(value);

    if (
      [
        "traffic",
        "road",
        "road safety",
        "amategeko y umuhanda",
        "amategeko yumuhanda",
        "umutekano wo mumuhanda",
        "umutekano wumuhanda"
      ].includes(category)
    ) {
      return "traffic";
    }

    if (
      [
        "general",
        "general knowledge",
        "knowledge",
        "ubumenyi rusange"
      ].includes(category)
    ) {
      return "general";
    }

    return category;
  }

  function matchesMode(question) {
    const rawCategory =
      question.category ??
      question.mode ??
      question.type ??
      question.topic ??
      "";

    // If no category is provided, keep the question.
    if (!rawCategory) return true;

    return canonicalCategory(rawCategory) === state.mode;
  }

  function getAnswerValue(question) {
    const fields = state.language === "rw"
      ? [
          "answer_rw",
          "correctAnswer_rw",
          "correct_answer_rw",
          "correct_rw",
          "answer",
          "correctAnswer",
          "correct_answer",
          "correct",
          "answerIndex",
          "correctIndex"
        ]
      : [
          "answer_en",
          "correctAnswer_en",
          "correct_answer_en",
          "correct_en",
          "answer",
          "correctAnswer",
          "correct_answer",
          "correct",
          "answerIndex",
          "correctIndex"
        ];

    for (const field of fields) {
      if (
        question[field] !== undefined &&
        question[field] !== null
      ) {
        return question[field];
      }
    }

    return undefined;
  }

  function normalizeQuestion(question, index) {
    if (!question || typeof question !== "object") {
      return null;
    }

    const text = localized(
      question,
      ["question", "text", "title"]
    );

    let options = localized(
      question,
      ["options", "choices", "answers"]
    );

    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (_) {
        return null;
      }
    }

    if (!Array.isArray(options)) {
      return null;
    }

    options = options.map(option => {
      if (
        option &&
        typeof option === "object"
      ) {
        return String(
          option[state.language] ??
          option.text ??
          option.value ??
          ""
        ).trim();
      }

      return String(option ?? "").trim();
    }).filter(Boolean);

    if (
      !text ||
      options.length < 2
    ) {
      return null;
    }

    const answer = getAnswerValue(question);

    if (answer === undefined || answer === null) {
      return null;
    }

    let correctIndex = -1;

    if (typeof answer === "number") {
      correctIndex = answer;
    } else if (
      typeof answer === "string" &&
      /^\d+$/.test(answer.trim())
    ) {
      correctIndex = Number(answer.trim());
    } else {
      correctIndex = options.findIndex(
        option =>
          normalize(option) === normalize(answer)
      );
    }

    if (
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      return null;
    }

    const explanation = localized(
      question,
      ["explanation", "description", "reason"]
    );

    return {
      id: String(
        question.id ??
        question.questionId ??
        question.question_id ??
        `${state.mode}_${state.language}_${index}`
      ),

      question: String(text),
      options,
      correctIndex,
      answer: options[correctIndex],

      explanation: String(explanation || ""),

      image: String(
        question.image ??
        question.imageUrl ??
        question.image_url ??
        ""
      )
    };
  }

  async function loadQuestions() {
    if (state.loading) return;

    state.loading = true;

    showMessage("Loading questions...");

    try {
      const response = await fetch(
        CONFIG.QUESTIONS_FILE,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `questions.json returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      state.questions = extractQuestions(data);

      if (!state.questions.length) {
        throw new Error(
          "No questions were found in questions.json."
        );
      }

      emit(EVENTS.loaded, {
        total: state.questions.length
      });

      showMessage("Questions loaded successfully.");

    } catch (error) {
      console.error(
        "Quiz Master question loading error:",
        error
      );

      showSetupError(
        "Ibibazo ntibyashoboye gufunguka. Reba questions.json."
      );

      emit(EVENTS.error, {
        message: error.message
      });

    } finally {
      state.loading = false;

      updateHome();
      updateSelection();
    }
  }

  function buildPool() {
    const pool = [];
    const ids = new Set();

    state.questions.forEach((question, index) => {
      if (!matchesMode(question)) return;

      const normalized = normalizeQuestion(
        question,
        index
      );

      if (!normalized) return;

      if (ids.has(normalized.id)) return;

      ids.add(normalized.id);
      pool.push(normalized);
    });

    return pool;
  }

  /* =====================================================
     SCREEN NAVIGATION
  ===================================================== */

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(
      screen => {
        screen.classList.remove("active");
      }
    );

    const screen = document.getElementById(id);

    if (screen) {
      screen.classList.add("active");
    }

    if (id !== "quizScreen") {
      stopTimer();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    emit(EVENTS.screen, {
      screen: id
    });
  }

  function showHome() {
    updateHome();
    showScreen("homeScreen");
  }

  /* =====================================================
     SETUP AND SETTINGS
  ===================================================== */

  function updateSelection() {
    document.querySelectorAll(".language-btn").forEach(
      button => {
        const selected =
          button.dataset.language === state.language;

        button.classList.toggle("selected", selected);

        button.setAttribute(
          "aria-pressed",
          String(selected)
        );
      }
    );

    document.querySelectorAll(".mode-btn").forEach(
      button => {
        const selected =
          button.dataset.mode === state.mode;

        button.classList.toggle("selected", selected);

        button.setAttribute(
          "aria-pressed",
          String(selected)
        );
      }
    );

    const language =
      state.language === "rw"
        ? "Ikinyarwanda"
        : "English";

    const category =
      state.mode === "traffic"
        ? "Road Safety"
        : "General Knowledge";

    setText(
      "selectionSummary",
      `${language} • ${category}`
    );

    const confirmButton = $("confirmSetupBtn");

    if (confirmButton) {
      confirmButton.disabled = false;
    }

    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled =
        !state.confirmed || state.loading;
    }

    clearSetupError();
  }

  function confirmSetup() {
    state.confirmed = true;

    write(CONFIG.STORAGE.settings, {
      language: state.language,
      mode: state.mode
    });

    updateSelection();

    showMessage(
      "Selection confirmed. Start your quiz!"
    );
  }

  function restoreSettings() {
    const settings = read(
      CONFIG.STORAGE.settings,
      {}
    );

    if (["en", "rw"].includes(settings.language)) {
      state.language = settings.language;
    }

    if (
      ["traffic", "general"].includes(settings.mode)
    ) {
      state.mode = settings.mode;
    }

    // Saved settings are valid and can be used immediately.
    state.confirmed = Boolean(
      settings.language && settings.mode
    );

    if ($("settingsLanguage")) {
      $("settingsLanguage").value = state.language;
    }

    if ($("settingsMode")) {
      $("settingsMode").value = state.mode;
    }

    updateSelection();
  }

  function updateHome() {
    const best = read(CONFIG.STORAGE.best, 0);
    const completed = getCompleted();

    setText("homeRound", getUnlockedRound());
    setText("homeScore", best);

    setText(
      "homeStars",
      completed.length
        ? "⭐".repeat(Math.min(completed.length, 5))
        : "⭐"
    );

    const review = read(
      CONFIG.STORAGE.review,
      []
    );

    const reviewButton = $("reviewAnswersBtn");

    if (reviewButton) {
      reviewButton.hidden =
        !Array.isArray(review) || review.length === 0;
    }

    const continueButton = $("continueBtn");

    if (continueButton) {
      continueButton.hidden = !getSession();
    }
  }

  function saveSettings() {
    const language = $("settingsLanguage")?.value;
    const mode = $("settingsMode")?.value;

    if (!["en", "rw"].includes(language)) return;
    if (!["traffic", "general"].includes(mode)) return;

    state.language = language;
    state.mode = mode;
    state.confirmed = true;

    write(CONFIG.STORAGE.settings, {
      language,
      mode
    });

    updateSelection();
    updateHome();

    setText(
      "settingsMessage",
      "Settings saved successfully."
    );
  }

  /* =====================================================
     ROUND MANAGEMENT
  ===================================================== */

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [result[i], result[j]] =
        [result[j], result[i]];
    }

    return result;
  }

  function prepareRound(round, retry = false) {
    state.pool = buildPool();

    if (
      state.pool.length <
      CONFIG.QUESTIONS_PER_ROUND
    ) {
      showSetupError(
        `Ibibazo byemewe bibonetse ni ${state.pool.length}. Hakenewe nibura 10.`
      );

      return false;
    }

    if (
      !retry &&
      round > getUnlockedRound()
    ) {
      showSetupError(
        "Banza urangize round ibanziriza iyi."
      );

      return false;
    }

    const session = getSession();

    if (
      retry &&
      session &&
      session.round === round
    ) {
      state.roundQuestions = session.questions;
    } else {
      const used = new Set(getUsed());

      let available = state.pool.filter(
        question => !used.has(question.id)
      );

      // Start a new question cycle only when necessary.
      if (
        available.length <
        CONFIG.QUESTIONS_PER_ROUND
      ) {
        saveUsed([]);
        available = [...state.pool];
      }

      state.roundQuestions = shuffle(available).slice(
        0,
        CONFIG.QUESTIONS_PER_ROUND
      );
    }

    if (
      state.roundQuestions.length !==
      CONFIG.QUESTIONS_PER_ROUND
    ) {
      showSetupError(
        "Round ntiyashoboye gutegurwa."
      );

      return false;
    }

    state.round = round;
    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.review = [];

    state.selectedAnswer = null;
    state.answered = false;
    state.finished = false;
    state.remainingTime = getTimeLimit();

    saveSession();

    return true;
  }

  function startQuiz() {
    if (!state.confirmed) {
      showSetupError(
        "Banza uhitemo ururimi n'icyiciro, ukande Confirm."
      );

      return;
    }

    if (!prepareRound(getUnlockedRound())) {
      return;
    }

    emit(EVENTS.started, {
      round: state.round,
      language: state.language,
      mode: state.mode
    });

    showScreen("quizScreen");
    renderQuestion();
  }

  function continueQuiz() {
    const session = getSession();

    if (!session) {
      showMessage("Nta mukino wabitswe ubonetse.");
      updateHome();
      return;
    }

    state.round = session.round;
    state.roundQuestions = session.questions;

    state.score = Number(session.score) || 0;
    state.correct = Number(session.correct) || 0;

    state.review = Array.isArray(session.review)
      ? session.review
      : [];

    state.currentIndex = Number(session.currentIndex) || 0;

    // If the last displayed question was already answered,
    // continue with the following question.
    if (session.answered) {
      state.currentIndex++;
    }

    state.selectedAnswer = null;
    state.answered = false;
    state.finished = false;

    if (
      state.currentIndex >=
      CONFIG.QUESTIONS_PER_ROUND
    ) {
      finishRound();
      return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  function retryRound() {
    const session = getSession();

    if (
      !session ||
      session.round !== state.round
    ) {
      if (!prepareRound(state.round)) return;
    } else {
      if (!prepareRound(state.round, true)) return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  /* =====================================================
     QUESTION DISPLAY
  ===================================================== */

  function renderQuestion() {
    stopTimer();

    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answered = false;
    state.remainingTime = getTimeLimit();

    setText("roundLabel", state.round);

    setText(
      "questionCounter",
      `${state.currentIndex + 1}/10`
    );

    setText("scoreNumber", state.score);

    setText(
      "categoryIndicator",
      state.mode === "traffic"
        ? "🚦 Road Safety"
        : "🌍 General Knowledge"
    );

    setText("questionText", question.question);

    const image = $("questionImage");

    if (image) {
      image.onerror = () => {
        image.style.display = "none";
      };

      if (question.image) {
        image.src = question.image;
        image.style.display = "block";
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
      }
    }

    const container = $("optionsContainer");

    if (container) {
      container.innerHTML = "";

      question.options.forEach(
        (option, index) => {
          const button = document.createElement("button");

          button.type = "button";
          button.className = "option-btn";

          const letter = document.createElement("span");
          letter.className = "option-letter";
          letter.textContent = String.fromCharCode(65 + index);

          const text = document.createElement("span");
          text.textContent = option;

          button.append(letter, text);

          button.addEventListener("click", () => {
            selectAnswer(index);
          });

          container.appendChild(button);
        }
      );
    }

    setText("answerFeedback", "");
    setText("explanation", "");

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.style.color = "";
    }

    const submitButton = $("submitAnswerBtn");

    if (submitButton) {
      submitButton.hidden = false;
      submitButton.disabled = true;
    }

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.hidden = true;
    }

    setText("timer", state.remainingTime);

    updateProgress();
    saveSession();
    startTimer();
  }

  function selectAnswer(index) {
    if (state.answered) return;

    const question =
      state.roundQuestions[state.currentIndex];

    if (
      !question ||
      index < 0 ||
      index >= question.options.length
    ) {
      return;
    }

    state.selectedAnswer = index;

    document.querySelectorAll(
      "#optionsContainer .option-btn, #options .option-btn"
    ).forEach((button, buttonIndex) => {
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

  /* =====================================================
     TIMER
  ===================================================== */

  function stopTimer() {
    if (state.timerInterval !== null) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    const timerBox = $("timerBox");

    if (timerBox) {
      timerBox.classList.remove("warning");
    }
  }

  function startTimer() {
    stopTimer();

    state.timerInterval = setInterval(() => {
      if (state.answered) return;

      state.remainingTime--;

      setText(
        "timer",
        Math.max(0, state.remainingTime)
      );

      const timerBox = $("timerBox");

      if (timerBox) {
        timerBox.classList.toggle(
          "warning",
          state.remainingTime <= 10
        );
      }

      if (state.remainingTime <= 0) {
        submitAnswer(true);
      }

      saveSession();

    }, 1000);
  }

  /* =====================================================
     ANSWER SUBMISSION
  ===================================================== */

  function submitAnswer(timedOut = false) {
    if (state.answered) return;

    if (
      state.selectedAnswer === null &&
      !timedOut
    ) {
      return;
    }

    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) return;

    state.answered = true;

    stopTimer();

    const correct =
      state.selectedAnswer === question.correctIndex;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.correct++;
    }

    state.review.push({
      question: question.question,
      options: question.options,

      selectedAnswer:
        state.selectedAnswer === null
          ? null
          : question.options[state.selectedAnswer],

      correctAnswer: question.answer,
      correct,
      explanation: question.explanation
    });

    document.querySelectorAll(
      "#optionsContainer .option-btn, #options .option-btn"
    ).forEach((button, index) => {
      button.disabled = true;

      if (index === question.correctIndex) {
        button.classList.add("correct");
      }

      if (
        index === state.selectedAnswer &&
        !correct
      ) {
        button.classList.add("incorrect");
      }
    });

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent = timedOut
        ? "⏰ Time is up!"
        : correct
          ? "✅ Correct answer!"
          : "❌ Incorrect answer.";

      feedback.style.color = correct
        ? "#20bd78"
        : "#ff7777";
    }

    setText(
      "explanation",
      question.explanation
    );

    const submitButton = $("submitAnswerBtn");

    if (submitButton) {
      submitButton.hidden = true;
    }

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.hidden = false;

      nextButton.textContent =
        state.currentIndex === 9
          ? "View Results →"
          : "Next Question →";
    }

    setText("scoreNumber", state.score);

    saveSession();
    updateProgress();
  }

  function nextQuestion() {
    if (!state.answered) return;

    if (state.currentIndex < 9) {
      state.currentIndex++;
      renderQuestion();
    } else {
      finishRound();
    }
  }

  function updateProgress() {
    const percentage = Math.round(
      (
        state.currentIndex +
        (state.answered ? 1 : 0)
      ) / CONFIG.QUESTIONS_PER_ROUND * 100
    );

    const fill = $("progressFill");

    if (fill) {
      fill.style.width = `${percentage}%`;
    }

    const track = document.querySelector(
      ".progress-track"
    );

    if (track) {
      track.setAttribute(
        "aria-valuenow",
        percentage
      );
    }
  }

  /* =====================================================
     STATISTICS
  ===================================================== */

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ));

    const day = d.getUTCDay() || 7;

    d.setUTCDate(
      d.getUTCDate() + 4 - day
    );

    const start = new Date(
      Date.UTC(d.getUTCFullYear(), 0, 1)
    );

    return Math.ceil(
      (((d - start) / 86400000) + 1) / 7
    );
  }

  function updateStatistics() {
    // Prevent the same completed attempt from being counted twice.
    if (state.statisticsSaved) return;

    state.statisticsSaved = true;

    const best = Number(
      read(CONFIG.STORAGE.best, 0)
    );

    const total = Number(
      read(CONFIG.STORAGE.total, 0)
    );

    write(
      CONFIG.STORAGE.best,
      Math.max(best, state.score)
    );

    write(
      CONFIG.STORAGE.total,
      total + state.score
    );

    const progress = read(
      CONFIG.STORAGE.progress,
      {}
    );

    progress.totalScore =
      (Number(progress.totalScore) || 0) + state.score;

    progress.bestScore = Math.max(
      Number(progress.bestScore) || 0,
      state.score
    );

    progress.completedRounds =
      getCompleted().length;

    write(CONFIG.STORAGE.progress, progress);

    const weekly = read(
      CONFIG.STORAGE.weekly,
      {}
    );

    const now = new Date();

    const weekKey =
      `${now.getFullYear()}-W${getWeekNumber(now)}`;

    weekly[weekKey] =
      (Number(weekly[weekKey]) || 0) + state.score;

    write(CONFIG.STORAGE.weekly, weekly);
  }

  /* =====================================================
     ROUND RESULTS
  ===================================================== */

  function finishRound() {
    if (state.finished) return;

    state.finished = true;

    stopTimer();

    const percentage = Math.round(
      state.correct /
      CONFIG.QUESTIONS_PER_ROUND * 100
    );

    const passed =
      percentage >= CONFIG.PASS_PERCENT;

    if (passed) {
      const completed = getCompleted();

      if (!completed.includes(state.round)) {
        completed.push(state.round);

        completed.sort((a, b) => a - b);

        saveCompleted(completed);
      }

      const used = getUsed();

      saveUsed([
        ...new Set([
          ...used,
          ...state.roundQuestions.map(
            question => question.id
          )
        ])
      ]);
    }

    updateStatistics();

    write(
      CONFIG.STORAGE.review,
      state.review
    );

    if (passed) {
      remove(CONFIG.STORAGE.session);
    } else {
      saveSession();
    }

    setText(
      "resultTitle",
      passed
        ? "Round Passed! 🎉"
        : "Round Not Passed"
    );

    setText(
      "resultMessage",
      passed
        ? "You achieved the required score to unlock the next round."
        : "You need at least 70% to unlock the next round. Try again!"
    );

    const stars =
      percentage >= 90 ? 3 :
      percentage >= 80 ? 2 :
      percentage >= 70 ? 1 : 0;

    setText(
      "resultStars",
      stars
        ? "⭐".repeat(stars)
        : "🌱"
    );

    setText("resultScore", state.score);
    setText("resultPercent", `${percentage}%`);

    setText(
      "resultCorrect",
      `${state.correct}/10`
    );

    setText("resultPassMark", "70%");

    const nextButton = $("resultNextBtn");

    if (nextButton) {
      nextButton.hidden = !passed;
    }

    const retryButton = $("retryBtn");

    if (retryButton) {
      retryButton.hidden = passed;
    }

    emit(EVENTS.finished, {
      round: state.round,
      score: state.score,
      correct: state.correct,
      percentage,
      passed
    });

    updateHome();

    showScreen("resultScreen");
  }

  /* =====================================================
     REVIEW ANSWERS
  ===================================================== */

  function renderReview() {
    const container = $("reviewContainer");

    if (!container) return;

    const reviews = state.review.length
      ? state.review
      : read(CONFIG.STORAGE.review, []);

    container.innerHTML = "";

    if (
      !Array.isArray(reviews) ||
      !reviews.length
    ) {
      container.textContent =
        "No answers available to review yet.";

      setText("reviewSummary", "");

      return;
    }

    const correctCount = reviews.filter(
      item => item.correct
    ).length;

    setText(
      "reviewSummary",
      `${correctCount} correct out of ${reviews.length}`
    );

    reviews.forEach((item, index) => {
      const element = document.createElement("div");

      element.className = "review-item";

      const heading = document.createElement("h3");

      heading.textContent =
        `${index + 1}. ${item.question}`;

      const selected = document.createElement("p");

      selected.className = item.correct
        ? "correct-text"
        : "wrong-text";

      selected.textContent =
        `Your answer: ${item.selectedAnswer ?? "No answer"}`;

      const answer = document.createElement("p");

      answer.className = "correct-text";

      answer.textContent =
        `Correct answer: ${item.correctAnswer}`;

      element.append(
        heading,
        selected,
        answer
      );

      if (item.explanation) {
        const explanation = document.createElement("p");

        explanation.textContent =
          `Explanation: ${item.explanation}`;

        element.appendChild(explanation);
      }

      container.appendChild(element);
    });

    emit(EVENTS.review, {
      answers: reviews
    });
  }

  function openReview() {
    renderReview();
    showScreen("reviewScreen");
  }

  /* =====================================================
     ROUNDS LIST
  ===================================================== */

  function renderRounds() {
    const container = $("roundList");

    if (!container) return;

    const completed = getCompleted();
    const unlocked = getUnlockedRound();

    const total = Math.floor(
      buildPool().length /
      CONFIG.QUESTIONS_PER_ROUND
    );

    setText("roundsCompleted", completed.length);
    setText("roundsTotal", total);
    setText(
      "roundsUnlocked",
      Math.min(unlocked, total)
    );

    container.innerHTML = "";

    if (total === 0) {
      container.textContent =
        "Not enough valid questions for this category.";

      return;
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

      button.disabled = !isUnlocked;

      const label = document.createElement("span");

      const title = document.createElement("strong");

      title.textContent = `Round ${round}`;

      const status = document.createElement("span");

      status.className = "round-status";

      status.textContent =
        isCompleted
          ? "✓ Completed"
          : isUnlocked
            ? "Available"
            : "🔒 Locked";

      label.append(title, status);

      const icon = document.createElement("span");

      icon.textContent =
        isCompleted
          ? "🏆"
          : isUnlocked
            ? "▶"
            : "🔒";

      button.append(label, icon);

      button.addEventListener("click", () => {
        if (prepareRound(round)) {
          showScreen("quizScreen");
          renderQuestion();
        }
      });

      container.appendChild(button);
    }
  }

  /* =====================================================
     RESET PROGRESS
  ===================================================== */

  function resetProgress() {
    const confirmed = window.confirm(
      "Are you sure you want to reset all quiz progress, scores and saved answers?"
    );

    if (!confirmed) return;

    [
      CONFIG.STORAGE.progress,
      CONFIG.STORAGE.used,
      CONFIG.STORAGE.completed,
      CONFIG.STORAGE.review,
      CONFIG.STORAGE.best,
      CONFIG.STORAGE.total,
      CONFIG.STORAGE.weekly,
      CONFIG.STORAGE.session
    ].forEach(remove);

    state.review = [];
    state.score = 0;
    state.correct = 0;
    state.currentIndex = 0;
    state.roundQuestions = [];
    state.finished = false;
    state.statisticsSaved = false;

    updateHome();
    renderRounds();

    setText(
      "settingsMessage",
      "Quiz progress has been reset."
    );
  }

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const data = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${data.text} ${data.url}`
      );

      window.alert("✅ Link Copied!");

    } catch (_) {
      window.prompt(
        "Copy this link:",
        data.url
      );
    }
  }

  /* =====================================================
     EVENT BINDING
  ===================================================== */

  function bindEvents() {
    document.querySelectorAll(".language-btn").forEach(
      button => {
        button.addEventListener("click", () => {
          const next = button.dataset.language;

          if (!["en", "rw"].includes(next)) return;

          if (next !== state.language) {
            state.confirmed = false;
          }

          state.language = next;

          updateSelection();
        });
      }
    );

    document.querySelectorAll(".mode-btn").forEach(
      button => {
        button.addEventListener("click", () => {
          const next = button.dataset.mode;

          if (
            !["traffic", "general"].includes(next)
          ) {
            return;
          }

          if (next !== state.mode) {
            state.confirmed = false;
          }

          state.mode = next;

          updateSelection();
        });
      }
    );

    bind("confirmSetupBtn", "click", confirmSetup);

    bind("startBtn", "click", startQuiz);

    bind("continueBtn", "click", continueQuiz);

    bind("submitAnswerBtn", "click", () => {
      submitAnswer(false);
    });

    bind("nextQuestionBtn", "click", nextQuestion);

    bind("quizReviewBtn", "click", openReview);
    bind("resultReviewBtn", "click", openReview);
    bind("reviewAnswersBtn", "click", openReview);

    bind("reviewHomeBtn", "click", showHome);
    bind("quizHomeBtn", "click", () => {
      saveSession();
      showHome();
    });

    bind("resultHomeBtn", "click", showHome);
    bind("roundsHomeBtn", "click", showHome);
    bind("settingsHomeBtn", "click", showHome);

    bind("resultNextBtn", "click", () => {
      const next = state.round + 1;

      if (
        next <= getUnlockedRound() &&
        prepareRound(next)
      ) {
        showScreen("quizScreen");
        renderQuestion();
      }
    });

    bind("retryBtn", "click", retryRound);

    bind("roundsBtn", "click", () => {
      renderRounds();
      showScreen("roundsScreen");
    });

    bind("settingsBtn", "click", () => {
      if ($("settingsLanguage")) {
        $("settingsLanguage").value =
          state.language;
      }

      if ($("settingsMode")) {
        $("settingsMode").value =
          state.mode;
      }

      showScreen("settingsScreen");
    });

    bind("saveSettingsBtn", "click", saveSettings);

    bind("resetProgressBtn", "click", resetProgress);

    bind("shareBtn", "click", shareQuiz);
  }

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async function init() {
    bindEvents();

    restoreSettings();

    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled = !state.confirmed;
    }

    const continueButton = $("continueBtn");

    if (continueButton) {
      continueButton.hidden = true;
    }

    updateHome();

    await loadQuestions();

    updateHome();
    updateSelection();

    if (startButton) {
      startButton.disabled =
        !state.confirmed || state.loading;
    }

    console.log(
      "Quiz Master 🇷🇼 initialized successfully."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
