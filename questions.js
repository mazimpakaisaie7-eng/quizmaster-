(() => {
  "use strict";

  // =====================================================
  // QUIZ MASTER RWANDA
  // Complete Quiz Engine
  // Compatible with Quiz Master index.html
  // =====================================================

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",

    QUESTIONS_PER_ROUND: 10,

    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,

    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 70,

    STORAGE: {
      language: "quizmasterLanguage",
      mode: "quizmasterMode",
      used: "quizmasterUsedQuestionIds",
      completed: "quizmasterCompletedRounds",
      review: "quizmasterReviewAnswers",
      best: "quizmasterBestScore",
      total: "quizmasterTotalScore",
      progress: "quizmasterProgress"
    },

    MAX_REVIEW_HISTORY: 500
  };

  // =====================================================
  // ELEMENT HELPERS
  // =====================================================

  const $ = id => document.getElementById(id);

  const $$ = selector => [
    ...document.querySelectorAll(selector)
  ];

  function getElement(...ids) {
    for (const id of ids) {
      const element = $(id);
      if (element) return element;
    }

    return null;
  }

  function setText(ids, value) {
    const element = getElement(...ids);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  function setDisplay(ids, display) {
    const element = getElement(...ids);

    if (element) {
      element.style.display = display;
    }
  }

  function showMessage(message, type = "info") {
    const target = getElement(
      "setupError",
      "homeMessage"
    );

    if (!target) {
      console.log(message);
      return;
    }

    target.textContent = message;
    target.dataset.type = type;
    target.style.display = "block";
  }

  function hideMessage() {
    const target = getElement(
      "setupError",
      "homeMessage"
    );

    if (target) {
      target.style.display = "none";
    }
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

  function dispatch(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  // =====================================================
  // SAFE LOCAL STORAGE
  // =====================================================

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("Storage read error:", error);
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (error) {
      console.warn("Storage write error:", error);
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage remove error:", error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = storageGet(key);

      if (!value) return fallback;

      return JSON.parse(value);
    } catch (error) {
      console.warn("Invalid stored JSON:", key, error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      return storageSet(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn("JSON storage error:", error);
      return false;
    }
  }

  // =====================================================
  // STATE
  // =====================================================

  const state = {
    questions: [],
    loaded: false,

    language: storageGet(CONFIG.STORAGE.language) || "en",
    mode: storageGet(CONFIG.STORAGE.mode) || "general",

    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    round: 1,
    roundQuestions: [],
    currentIndex: 0,

    score: 0,
    correct: 0,
    answered: 0,

    selectedAnswer: null,
    answerSubmitted: false,

    timeLeft: 0,
    timerId: null,
    paused: false,

    review: [],
    roundFinished: false,
    initialized: false
  };

  // =====================================================
  // LANGUAGE
  // =====================================================

  function getQuestionText(question) {
    if (
      state.language === "rw" &&
      question.question_rw
    ) {
      return question.question_rw;
    }

    return question.question || "";
  }

  function getOptions(question) {
    if (
      state.language === "rw" &&
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      return question.options_rw;
    }

    return question.options || [];
  }

  function getCorrectAnswer(question) {
    if (state.language !== "rw") {
      return question.answer;
    }

    if (question.answer_rw) {
      return question.answer_rw;
    }

    // If answer_rw is missing, use the matching
    // option position to find the translated answer.

    const englishOptions = question.options || [];
    const rwOptions = question.options_rw || [];

    const index = englishOptions.indexOf(
      question.answer
    );

    if (
      index >= 0 &&
      index < rwOptions.length
    ) {
      return rwOptions[index];
    }

    return question.answer;
  }

  function getExplanation(question) {
    if (state.language === "rw") {
      return (
        question.explanation_rw ||
        question.explanation ||
        ""
      );
    }

    return question.explanation || "";
  }

  function getCategoryName() {
    if (state.mode === "traffic") {
      return state.language === "rw"
        ? "Amategeko y'umuhanda"
        : "Road Safety";
    }

    return state.language === "rw"
      ? "Ubumenyi rusange"
      : "General Knowledge";
  }

  function getQuestionTime() {
    return state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  // =====================================================
  // STORAGE DATA
  // =====================================================

  function getUsedData() {
    const data = readJSON(
      CONFIG.STORAGE.used,
      {}
    );

    if (Array.isArray(data)) {
      return {
        traffic: data,
        general: []
      };
    }

    return data && typeof data === "object"
      ? data
      : {};
  }

  function getUsedIds() {
    const data = getUsedData();

    return Array.isArray(data[state.mode])
      ? data[state.mode].map(String)
      : [];
  }

  function saveUsedIds(ids) {
    const data = getUsedData();

    data[state.mode] = [
      ...new Set(ids.map(String))
    ];

    writeJSON(CONFIG.STORAGE.used, data);
  }

  function getCompletedData() {
    const data = readJSON(
      CONFIG.STORAGE.completed,
      {}
    );

    if (Array.isArray(data)) {
      return {
        traffic: data,
        general: []
      };
    }

    return data && typeof data === "object"
      ? data
      : {};
  }

  function getCompletedRounds() {
    const data = getCompletedData();

    return Array.isArray(data[state.mode])
      ? data[state.mode]
          .map(Number)
          .filter(Number.isFinite)
      : [];
  }

  function saveCompletedRounds(rounds) {
    const data = getCompletedData();

    data[state.mode] = [
      ...new Set(rounds.map(Number))
    ].sort((a, b) => a - b);

    writeJSON(CONFIG.STORAGE.completed, data);
  }

  function getProgress() {
    return readJSON(
      CONFIG.STORAGE.progress,
      null
    );
  }

  function clearProgress() {
    storageRemove(CONFIG.STORAGE.progress);
    updateHome();
  }

  // =====================================================
  // SAVE GAME PROGRESS
  // =====================================================

  function saveProgress() {
    if (
      !state.roundQuestions.length ||
      state.roundFinished
    ) {
      return;
    }

    writeJSON(CONFIG.STORAGE.progress, {
      version: 2,

      language: state.language,
      mode: state.mode,

      round: state.round,

      questionIds: state.roundQuestions.map(
        question => String(question.id)
      ),

      currentIndex: state.currentIndex,

      score: state.score,
      correct: state.correct,
      answered: state.answered,

      review: state.review,

      timeLeft: state.timeLeft,

      selectedAnswer: state.selectedAnswer,
      answerSubmitted: state.answerSubmitted
    });

    updateHome();
  }

  // =====================================================
  // SCREEN NAVIGATION
  // =====================================================

  function showScreen(screenId) {
    const screens = [
      "homeScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ];

    screens.forEach(id => {
      const element = $(id);

      if (element) {
        element.style.display =
          id === screenId ? "block" : "none";
      }
    });

    closeMoreMenu();

    try {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch {
      window.scrollTo(0, 0);
    }

    dispatch("quizmaster:show-screen", {
      screen: screenId
    });
  }

  // =====================================================
  // MORE MENU
  // =====================================================

  function getMoreMenu() {
    return getElement(
      "moreMenu",
      "moreMenuPanel",
      "moreDropdown"
    );
  }

  function getMoreButton() {
    return getElement(
      "moreMenuBtn",
      "moreBtn",
      "moreToggleBtn"
    );
  }

  function closeMoreMenu() {
    const menu = getMoreMenu();
    const button = getMoreButton();

    if (menu) {
      menu.hidden = true;
      menu.classList.remove("open");
      menu.style.display = "none";
    }

    if (button) {
      button.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }

  function toggleMoreMenu() {
    const menu = getMoreMenu();
    const button = getMoreButton();

    if (!menu) return;

    const isOpen =
      menu.classList.contains("open") ||
      (!menu.hidden && menu.style.display !== "none");

    if (isOpen) {
      closeMoreMenu();
      return;
    }

    menu.hidden = false;
    menu.style.display = "block";
    menu.classList.add("open");

    if (button) {
      button.setAttribute(
        "aria-expanded",
        "true"
      );
    }
  }

  function bindMoreMenu() {
    const button = getMoreButton();
    const menu = getMoreMenu();

    if (button) {
      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();
          toggleMoreMenu();
        }
      );
    }

    document.addEventListener(
      "click",
      event => {
        if (!menu || !button) return;

        if (
          !menu.contains(event.target) &&
          !button.contains(event.target)
        ) {
          closeMoreMenu();
        }
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (event.key === "Escape") {
          closeMoreMenu();
        }
      }
    );

    if (menu) {
      menu.addEventListener("click", event => {
        const item = event.target.closest(
          "button, a"
        );

        if (item) {
          closeMoreMenu();
        }
      });
    }
  }

  // =====================================================
  // SHUFFLE
  // =====================================================

  function shuffle(array) {
    const result = [...array];

    for (
      let index = result.length - 1;
      index > 0;
      index--
    ) {
      const randomIndex = Math.floor(
        Math.random() * (index + 1)
      );

      [
        result[index],
        result[randomIndex]
      ] = [
        result[randomIndex],
        result[index]
      ];
    }

    return result;
  }

  // =====================================================
  // QUESTION VALIDATION
  // =====================================================

  function validQuestion(question) {
    if (
      !question ||
      typeof question !== "object" ||
      Array.isArray(question)
    ) {
      return false;
    }

    if (
      !["traffic", "general"].includes(
        question.category
      )
    ) {
      return false;
    }

    if (
      question.id === undefined ||
      question.id === null ||
      String(question.id).trim() === ""
    ) {
      return false;
    }

    if (
      typeof question.question !== "string" ||
      !question.question.trim()
    ) {
      return false;
    }

    if (
      typeof question.answer !== "string" ||
      !question.answer.trim()
    ) {
      return false;
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      return false;
    }

    if (
      !question.options.every(
        option =>
          typeof option === "string" &&
          option.trim() !== ""
      )
    ) {
      return false;
    }

    if (!question.options.includes(question.answer)) {
      return false;
    }

    if (
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      if (
        question.options_rw.length !==
        question.options.length
      ) {
        return false;
      }

      if (
        !question.options_rw.every(
          option =>
            typeof option === "string" &&
            option.trim() !== ""
        )
      ) {
        return false;
      }

      if (
        question.answer_rw &&
        !question.options_rw.includes(
          question.answer_rw
        )
      ) {
        return false;
      }
    }

    return true;
  }

  // =====================================================
  // OFFLINE CACHE
  // =====================================================

  async function getCachedQuestions() {
    if (!("caches" in window)) {
      return null;
    }

    try {
      const url = new URL(
        CONFIG.QUESTIONS_FILE,
        document.baseURI
      ).href;

      const response = await caches.match(
        url,
        { ignoreSearch: true }
      );

      if (!response || !response.ok) {
        return null;
      }

      const data = await response.json();

      return Array.isArray(data)
        ? data
        : null;

    } catch (error) {
      console.warn(
        "Offline cache error:",
        error
      );

      return null;
    }
  }

  // =====================================================
  // LOAD QUESTIONS
  // =====================================================

  async function loadQuestions() {
    state.loaded = false;

    showMessage(
      state.language === "rw"
        ? "Ibibazo birimo gutegurwa..."
        : "Loading questions..."
    );

    let data = null;
    let source = "network";

    try {
      try {
        const response = await fetch(
          CONFIG.QUESTIONS_FILE,
          { cache: "no-cache" }
        );

        if (!response.ok) {
          throw new Error(
            "HTTP " + response.status
          );
        }

        data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "questions.json must contain an array."
          );
        }

      } catch (networkError) {
        console.warn(
          "Network loading failed. Checking cache:",
          networkError
        );

        data = await getCachedQuestions();
        source = "cache";

        if (!data) {
          throw new Error(
            "Questions unavailable online and offline."
          );
        }
      }

      const valid = data.filter(validQuestion);

      const rejected = data.length - valid.length;

      state.questions = valid;
      state.loaded = valid.length > 0;

      const traffic = valid.filter(
        question =>
          question.category === "traffic"
      ).length;

      const general = valid.filter(
        question =>
          question.category === "general"
      ).length;

      console.log("Quiz Master questions:", {
        source,
        total: valid.length,
        traffic,
        general,
        rejected
      });

      if (!valid.length) {
        throw new Error(
          "No valid questions found in questions.json."
        );
      }

      hideMessage();

      updateHome();
      updateSelectionSummary();

      dispatch(
        "quizmaster:questions-loaded",
        {
          total: valid.length,
          traffic,
          general,
          rejected,
          source
        }
      );

      return true;

    } catch (error) {
      state.loaded = false;

      console.error(
        "Question loading error:",
        error
      );

      showMessage(
        state.language === "rw"
          ? "Ibibazo ntibyafungutse. Reba internet cyangwa questions.json."
          : "Questions could not load. Check your connection or questions.json.",
        "error"
      );

      dispatch("quizmaster:error", {
        message: error.message
      });

      return false;
    }
  }

  // =====================================================
  // CATEGORY QUESTIONS
  // =====================================================

  function getModeQuestions() {
    return state.questions.filter(
      question =>
        question.category === state.mode
    );
  }

  // =====================================================
  // ROUND SYSTEM
  // =====================================================

  function getTotalRounds() {
    return Math.ceil(
      getModeQuestions().length /
      CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getNextRound() {
    const completed = getCompletedRounds();

    for (
      let round = 1;
      round <= getTotalRounds();
      round++
    ) {
      if (!completed.includes(round)) {
        return round;
      }
    }

    return 1;
  }

  function isRoundUnlocked(round) {
    if (round === 1) return true;

    const completed = getCompletedRounds();

    for (
      let previous = 1;
      previous < round;
      previous++
    ) {
      if (!completed.includes(previous)) {
        return false;
      }
    }

    return true;
  }

  function prepareRound(roundNumber) {
    const pool = getModeQuestions();

    if (!pool.length) {
      showMessage(
        state.language === "rw"
          ? "Nta bibazo biri muri iki cyiciro."
          : "No questions available in this category.",
        "error"
      );

      return false;
    }

    const totalRounds = getTotalRounds();

    if (
      roundNumber < 1 ||
      roundNumber > totalRounds
    ) {
      return false;
    }

    if (!isRoundUnlocked(roundNumber)) {
      showMessage(
        state.language === "rw"
          ? "Banza utsinde rounds zibanza."
          : "Complete earlier rounds first."
      );

      return false;
    }

    const used = new Set(getUsedIds());

    let available = pool.filter(
      question =>
        !used.has(String(question.id))
    );

    // Start a new question cycle only when the
    // remaining questions cannot fill another round.

    if (
      available.length <
        Math.min(CONFIG.QUESTIONS_PER_ROUND, pool.length)
    ) {
      saveUsedIds([]);
      available = [...pool];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    if (!selected.length) {
      return false;
    }

    saveUsedIds([
      ...getUsedIds(),
      ...selected.map(
        question => String(question.id)
      )
    ]);

    state.round = roundNumber;
    state.roundQuestions = selected;

    state.currentIndex = 0;

    state.score = 0;
    state.correct = 0;
    state.answered = 0;

    state.selectedAnswer = null;
    state.answerSubmitted = false;

    state.timeLeft = getQuestionTime();

    state.review = [];
    state.roundFinished = false;

    saveProgress();

    return true;
  }

  // =====================================================
  // SETUP
  // =====================================================

  function selectLanguage(language) {
    if (!["rw", "en"].includes(language)) {
      return;
    }

    state.language = language;
    state.languageChosen = true;
    state.setupConfirmed = false;

    storageSet(
      CONFIG.STORAGE.language,
      language
    );

    $$(".language-btn").forEach(button => {
      const active =
        button.dataset.language === language;

      button.classList.toggle(
        "selected",
        active
      );

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    resetConfirmation();
    updateSelectionSummary();
    hideMessage();
  }

  function selectMode(mode) {
    if (!["traffic", "general"].includes(mode)) {
      return;
    }

    state.mode = mode;
    state.modeChosen = true;
    state.setupConfirmed = false;

    storageSet(
      CONFIG.STORAGE.mode,
      mode
    );

    $$(".mode-btn").forEach(button => {
      const active =
        button.dataset.mode === mode;

      button.classList.toggle(
        "selected",
        active
      );

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    resetConfirmation();
    updateSelectionSummary();
    hideMessage();
  }

  function resetConfirmation() {
    setDisplay(
      ["confirmSetupBtn"],
      "block"
    );

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    state.setupConfirmed = false;
  }

  function updateSelectionSummary() {
    const summary = getElement(
      "selectionSummary",
      "setupSummary"
    );

    const ready =
      state.languageChosen &&
      state.modeChosen;

    const confirm = $("confirmSetupBtn");

    if (confirm) {
      confirm.disabled =
        !ready || !state.loaded;
    }

    if (!summary) return;

    if (!ready) {
      summary.textContent =
        state.language === "rw"
          ? "Hitamo ururimi n'icyiciro."
          : "Choose your language and category.";

      return;
    }

    summary.textContent =
      (
        state.language === "rw"
          ? "Ururimi: Ikinyarwanda"
          : "Language: English"
      ) +
      " • " +
      getCategoryName();
  }

  function syncSetupButtons() {
    $$(".language-btn").forEach(button => {
      const active =
        button.dataset.language === state.language;

      button.classList.toggle(
        "selected",
        active
      );

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    $$(".mode-btn").forEach(button => {
      const active =
        button.dataset.mode === state.mode;

      button.classList.toggle(
        "selected",
        active
      );

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    updateSelectionSummary();
  }

  function openSetup() {
    stopTimer();

    state.setupConfirmed = false;

    showScreen("homeScreen");

    setDisplay(["gameSetup"], "block");
    setDisplay(["confirmSetupBtn"], "block");

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    syncSetupButtons();
    hideMessage();
  }

  function confirmSetup() {
    if (
      !state.languageChosen ||
      !state.modeChosen
    ) {
      updateSelectionSummary();
      return;
    }

    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bifunguke."
          : "Please wait for questions to load."
      );

      return;
    }

    if (!getModeQuestions().length) {
      showMessage(
        state.language === "rw"
          ? "Nta bibazo biri muri iki cyiciro."
          : "No questions in this category.",
        "error"
      );

      return;
    }

    state.setupConfirmed = true;

    storageSet(
      CONFIG.STORAGE.language,
      state.language
    );

    storageSet(
      CONFIG.STORAGE.mode,
      state.mode
    );

    setDisplay(
      ["confirmSetupBtn"],
      "none"
    );

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = false;
    }

    const summary = getElement(
      "selectionSummary",
      "setupSummary"
    );

    if (summary) {
      summary.textContent =
        state.language === "rw"
          ? "✓ Ibyo wahisemo byemejwe."
          : "✓ Your selection is confirmed.";
    }

    hideMessage();
  }

  // =====================================================
  // START GAME
  // =====================================================

  function startConfirmedQuiz() {
    if (!state.setupConfirmed) {
      showMessage(
        state.language === "rw"
          ? "Banza wemeze ibyo wahisemo."
          : "Please confirm your selections first."
      );

      return;
    }

    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bifunguke."
          : "Questions are still loading."
      );

      return;
    }

    const nextRound = getNextRound();

    if (!prepareRound(nextRound)) {
      return;
    }

    setDisplay(["gameSetup"], "none");

    hideMessage();

    startCurrentRound();
  }

  function startCurrentRound(resume = false) {
    if (!state.roundQuestions.length) {
      return;
    }

    state.roundFinished = false;

    showScreen("quizScreen");

    setText(
      ["currentRound", "roundLabel"],
      state.round
    );

    setText(
      ["categoryIndicator"],
      getCategoryName()
    );

    renderQuestion(resume);

    if (!state.answerSubmitted) {
      startTimer();
    } else {
      stopTimer();
    }

    dispatch("quizmaster:game-started", {
      round: state.round,
      mode: state.mode
    });
  }

  // =====================================================
  // RENDER QUESTION
  // =====================================================

  function renderQuestion(resume = false) {
    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    if (!resume) {
      state.selectedAnswer = null;
      state.answerSubmitted = false;
      state.timeLeft = getQuestionTime();
    }

    setText(
      [
        "currentQuestionNumber",
        "questionCounter"
      ],
      `${state.currentIndex + 1}/${state.roundQuestions.length}`
    );

    setText(
      ["questionText"],
      getQuestionText(question)
    );

    // Question image

    const image = $("questionImage");

    if (image) {
      const imageURL = question.image || "";

      if (
        typeof imageURL === "string" &&
        imageURL.trim() &&
        /^(https?:|\.{1,2}\/|\/)/i.test(imageURL)
      ) {
        image.src = imageURL;
        image.alt = "Question illustration";
        image.style.display = "block";
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
      }
    }

    // Answer options

    const container = $("optionsContainer");

    if (container) {
      container.innerHTML = "";

      shuffle(getOptions(question)).forEach(
        (option, index) => {
          const button =
            document.createElement("button");

          button.type = "button";
          button.className = "option-btn";

          button.dataset.answer = String(option);

          button.setAttribute(
            "aria-pressed",
            String(
              state.selectedAnswer === option
            )
          );

          button.innerHTML =
            `<span class="option-letter">${String.fromCharCode(65 + index)}</span>` +
            `<span class="option-text">${escapeHTML(option)}</span>`;

          button.addEventListener(
            "click",
            () => selectAnswer(option, button)
          );

          if (state.selectedAnswer === option) {
            button.classList.add("selected");
          }

          if (state.answerSubmitted) {
            button.disabled = true;

            if (
              String(option) ===
              String(getCorrectAnswer(question))
            ) {
              button.classList.add("correct");
            } else if (
              String(option) ===
              String(state.selectedAnswer)
            ) {
              button.classList.add("incorrect");
            }
          }

          container.appendChild(button);
        }
      );
    }

    setDisplay(["answerFeedback"], "none");
    setDisplay(["explanation"], "none");

    if (state.answerSubmitted) {
      showAnswerFeedback(question);
    }

    const submit = $("submitAnswerBtn");

    if (submit) {
      submit.disabled =
        state.selectedAnswer === null ||
        state.answerSubmitted;

      submit.style.display =
        state.answerSubmitted
          ? "none"
          : "block";
    }

    setDisplay(
      ["nextQuestionBtn"],
      state.answerSubmitted
        ? "block"
        : "none"
    );

    updateScoreDisplay();
    updateProgress();
    updateTimerDisplay();

    saveProgress();
  }

  // =====================================================
  // SELECT ANSWER
  // =====================================================

  function selectAnswer(answer, button) {
    if (state.answerSubmitted) return;

    state.selectedAnswer = answer;

    $$("#optionsContainer .option-btn").forEach(
      option => {
        option.classList.remove("selected");

        option.setAttribute(
          "aria-pressed",
          "false"
        );
      }
    );

    if (button) {
      button.classList.add("selected");

      button.setAttribute(
        "aria-pressed",
        "true"
      );
    }

    const submit = $("submitAnswerBtn");

    if (submit) {
      submit.disabled = false;
    }

    saveProgress();
  }

  // =====================================================
  // SCORE AND PROGRESS
  // =====================================================

  function updateScoreDisplay() {
    setText(
      ["scoreNumber", "score"],
      state.score
    );
  }

  function updateProgress() {
    const fill = $("progressFill");

    if (fill) {
      const percentage =
        (
          (state.currentIndex + 1) /
          state.roundQuestions.length
        ) * 100;

      fill.style.width =
        Math.min(100, percentage) + "%";
    }
  }

  // =====================================================
  // ANSWER FEEDBACK
  // =====================================================

  function showAnswerFeedback(question) {
    const correct = getCorrectAnswer(question);

    const isCorrect =
      state.selectedAnswer === correct;

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent = isCorrect
        ? (
            state.language === "rw"
              ? "Ni byo! +10 amanota"
              : "Correct! +10 points"
          )
        : (
            state.language === "rw"
              ? "Si byo. Gerageza ubutaha."
              : "Incorrect. Try again next time."
          );

      feedback.style.display = "block";
    }

    const explanation = $("explanation");
    const explanationText = getExplanation(question);

    if (explanation) {
      if (explanationText) {
        explanation.textContent = explanationText;
        explanation.style.display = "block";
      } else {
        explanation.textContent = "";
        explanation.style.display = "none";
      }
    }
  }

  // =====================================================
  // SUBMIT ANSWER
  // =====================================================

  function submitAnswer() {
    if (state.answerSubmitted) return;

    if (state.selectedAnswer === null) {
      showMessage(
        state.language === "rw"
          ? "Banza uhitemo igisubizo."
          : "Please select an answer."
      );

      return;
    }

    stopTimer();

    state.answerSubmitted = true;
    state.answered++;

    const question =
      state.roundQuestions[state.currentIndex];

    const correct = getCorrectAnswer(question);

    const isCorrect =
      state.selectedAnswer === correct;

    if (isCorrect) {
      state.correct++;

      state.score +=
        CONFIG.POINTS_PER_CORRECT;
    }

    state.review.push({
      id: String(question.id),
      round: state.round,
      mode: state.mode,

      question: getQuestionText(question),

      selected: state.selectedAnswer,
      correct,

      isCorrect,

      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(
      button => {
        button.disabled = true;

        if (
          button.dataset.answer === String(correct)
        ) {
          button.classList.add("correct");
        } else if (
          button.dataset.answer ===
          String(state.selectedAnswer)
        ) {
          button.classList.add("incorrect");
        }
      }
    );

    showAnswerFeedback(question);

    setDisplay(
      ["submitAnswerBtn"],
      "none"
    );

    const next = $("nextQuestionBtn");

    if (next) {
      next.textContent =
        state.currentIndex ===
        state.roundQuestions.length - 1
          ? (
              state.language === "rw"
                ? "Reba amanota"
                : "See Results"
            )
          : (
              state.language === "rw"
                ? "Ikibazo gikurikira"
                : "Next Question"
            );

      next.style.display = "block";
    }

    updateScoreDisplay();
    updateProgress();

    saveProgress();
  }

  // =====================================================
  // TIMER
  // =====================================================

  function startTimer() {
    stopTimer();

    if (state.answerSubmitted) return;

    updateTimerDisplay();

    state.timerId = window.setInterval(() => {
      if (
        state.paused ||
        state.answerSubmitted
      ) {
        return;
      }

      state.timeLeft--;

      updateTimerDisplay();

      if (state.timeLeft <= 0) {
        state.timeLeft = 0;

        stopTimer();
        timeExpired();

        return;
      }

      if (state.timeLeft % 5 === 0) {
        saveProgress();
      }

    }, 1000);
  }

  function stopTimer() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    setText(
      ["timer"],
      Math.max(0, state.timeLeft)
    );

    const timerBox = $("timerBox");

    if (timerBox) {
      timerBox.classList.toggle(
        "warning",
        state.timeLeft <= 10
      );
    }
  }

  // =====================================================
  // TIME EXPIRED
  // =====================================================

  function timeExpired() {
    if (state.answerSubmitted) return;

    state.answerSubmitted = true;
    state.answered++;

    const question =
      state.roundQuestions[state.currentIndex];

    const correct = getCorrectAnswer(question);

    state.review.push({
      id: String(question.id),
      round: state.round,
      mode: state.mode,

      question: getQuestionText(question),

      selected:
        state.language === "rw"
          ? "Nta gisubizo"
          : "No answer",

      correct,
      isCorrect: false,

      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(
      button => {
        button.disabled = true;

        if (
          button.dataset.answer === String(correct)
        ) {
          button.classList.add("correct");
        }
      }
    );

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent =
        state.language === "rw"
          ? "Igihe kirangiye!"
          : "Time is up!";

      feedback.style.display = "block";
    }

    const explanation = $("explanation");

    if (explanation) {
      const text = getExplanation(question);

      explanation.textContent = text;
      explanation.style.display =
        text ? "block" : "none";
    }

    setDisplay(
      ["submitAnswerBtn"],
      "none"
    );

    const next = $("nextQuestionBtn");

    if (next) {
      next.textContent =
        state.currentIndex ===
        state.roundQuestions.length - 1
          ? (
              state.language === "rw"
                ? "Reba amanota"
                : "See Results"
            )
          : (
              state.language === "rw"
                ? "Ikibazo gikurikira"
                : "Next Question"
            );

      next.style.display = "block";
    }

    updateScoreDisplay();
    saveProgress();
  }

  // =====================================================
  // NEXT QUESTION
  // =====================================================

  function nextQuestion() {
    if (!state.answerSubmitted) return;

    if (
      state.currentIndex <
      state.roundQuestions.length - 1
    ) {
      state.currentIndex++;

      state.selectedAnswer = null;
      state.answerSubmitted = false;
      state.timeLeft = getQuestionTime();

      renderQuestion();

      startTimer();

    } else {
      finishRound();
    }
  }

  // =====================================================
  // REVIEW HISTORY
  // =====================================================

  function saveReviewHistory() {
    const previous = readJSON(
      CONFIG.STORAGE.review,
      []
    );

    const history = Array.isArray(previous)
      ? previous
      : [];

    const newRecords = state.review.map(
      item => ({
        ...item,
        date: new Date().toISOString()
      })
    );

    const combined = [
      ...history,
      ...newRecords
    ].slice(-CONFIG.MAX_REVIEW_HISTORY);

    writeJSON(
      CONFIG.STORAGE.review,
      combined
    );
  }

  // =====================================================
  // RESULTS
  // =====================================================

  function finishRound() {
    if (
      state.roundFinished ||
      !state.roundQuestions.length
    ) {
      return;
    }

    stopTimer();

    state.roundFinished = true;

    const total = state.roundQuestions.length;

    const percentage = total
      ? Math.round(
          (state.correct / total) * 100
        )
      : 0;

    const passed =
      percentage >= CONFIG.UNLOCK_PERCENT;

    if (passed) {
      const completed = getCompletedRounds();

      if (!completed.includes(state.round)) {
        completed.push(state.round);

        saveCompletedRounds(completed);
      }
    }

    // Best score

    const best = Number(
      storageGet(CONFIG.STORAGE.best) || 0
    );

    if (state.score > best) {
      storageSet(
        CONFIG.STORAGE.best,
        state.score
      );
    }

    // Total score

    const totalScore =
      Number(
        storageGet(CONFIG.STORAGE.total) || 0
      ) + state.score;

    storageSet(
      CONFIG.STORAGE.total,
      totalScore
    );

    // Keep previous review answers

    saveReviewHistory();

    // Remove unfinished progress

    storageRemove(CONFIG.STORAGE.progress);

    setText(
      ["resultTitle"],
      passed
        ? (
            state.language === "rw"
              ? "Watsinze!"
              : "You Passed!"
          )
        : (
            state.language === "rw"
              ? "Ongera ugerageze"
              : "Try Again"
          )
    );

    setText(
      ["resultMessage"],
      passed
        ? (
            state.language === "rw"
              ? "Wujuje ibisabwa kugira ngo ukomeze."
              : "You passed this round."
          )
        : (
            state.language === "rw"
              ? "Ukeneye nibura 70% kugira ngo ukomeze."
              : "You need at least 70% to unlock the next round."
          )
    );

    setText(
      ["resultScore"],
      state.score
    );

    setText(
      ["resultPercent"],
      percentage + "%"
    );

    setText(
      ["resultStars"],
      passed ? "⭐⭐⭐" : "⭐"
    );

    const nextButton = $("resultNextBtn");

    if (nextButton) {
      nextButton.style.display =
        passed &&
        state.round < getTotalRounds()
          ? "block"
          : "none";
    }

    setDisplay(
      ["retryBtn"],
      passed ? "none" : "block"
    );

    updateHome();

    showScreen("resultScreen");

    dispatch(
      "quizmaster:round-finished",
      {
        round: state.round,
        score: state.score,
        correct: state.correct,
        total,
        percentage,
        passed
      }
    );
  }

  // =====================================================
  // RETRY ROUND
  // =====================================================

  function retryRound() {
    if (!state.roundQuestions.length) {
      return;
    }

    stopTimer();

    state.currentIndex = 0;

    state.score = 0;
    state.correct = 0;
    state.answered = 0;

    state.review = [];

    state.selectedAnswer = null;
    state.answerSubmitted = false;

    state.timeLeft = getQuestionTime();

    state.roundFinished = false;

    saveProgress();

    startCurrentRound();
  }

  // =====================================================
  // NEXT ROUND
  // =====================================================

  function nextRound() {
    const next = state.round + 1;

    if (next > getTotalRounds()) {
      goHome();
      return;
    }

    if (!isRoundUnlocked(next)) {
      showMessage(
        state.language === "rw"
          ? "Banza utsinde round ibanza."
          : "Complete the previous round first."
      );

      return;
    }

    if (prepareRound(next)) {
      startCurrentRound();
    }
  }

  // =====================================================
  // REVIEW ANSWERS SCREEN
  // =====================================================

  function showReview() {
    const saved = readJSON(
      CONFIG.STORAGE.review,
      []
    );

    const reviewData =
      state.review.length && !state.roundFinished
        ? state.review
        : Array.isArray(saved)
          ? saved
          : [];

    const container = getElement(
      "reviewContainer",
      "reviewList"
    );

    if (!container) {
      showScreen("reviewScreen");
      return;
    }

    container.innerHTML = "";

    if (!reviewData.length) {
      container.textContent =
        state.language === "rw"
          ? "Nta bisubizo byo gusubiramo bihari."
          : "There are no answers to review.";

      showScreen("reviewScreen");
      return;
    }

    reviewData.forEach((item, index) => {
      const card = document.createElement("div");

      card.className = "review-item";

      const status = item.isCorrect
        ? (
            state.language === "rw"
              ? "Ni byo ✓"
              : "Correct ✓"
          )
        : (
            state.language === "rw"
              ? "Si byo ✗"
              : "Incorrect ✗"
          );

      const title = document.createElement("h3");

      title.textContent =
        `${index + 1}. ${item.question || ""}`;

      const selected = document.createElement("p");
      const correct = document.createElement("p");
      const statusElement = document.createElement("p");

      const selectedLabel =
        state.language === "rw"
          ? "Igisubizo wahisemo:"
          : "Your answer:";

      const correctLabel =
        state.language === "rw"
          ? "Igisubizo nyacyo:"
          : "Correct answer:";

      selected.textContent =
        `${selectedLabel} ${item.selected || ""}`;

      correct.textContent =
        `${correctLabel} ${item.correct || ""}`;

      statusElement.className = "review-status";
      statusElement.textContent = status;

      statusElement.style.color =
        item.isCorrect ? "#16a34a" : "#dc2626";

      card.appendChild(title);
      card.appendChild(selected);
      card.appendChild(correct);
      card.appendChild(statusElement);

      if (item.explanation) {
        const explanation = document.createElement("p");

        explanation.textContent = item.explanation;

        card.appendChild(explanation);
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");

    dispatch(
      "quizmaster:review-data",
      reviewData
    );
  }

  // =====================================================
  // ROUNDS SCREEN
  // =====================================================

  function showRounds() {
    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bifunguke."
          : "Questions are still loading."
      );

      return;
    }

    const total = getTotalRounds();
    const completed = getCompletedRounds();

    setText(
      ["roundsCompleted"],
      completed.length
    );

    setText(
      ["roundsTotal"],
      total
    );

    setText(
      ["roundsUnlocked"],
      Math.min(total, completed.length + 1)
    );

    setText(
      ["roundsDescription"],
      state.language === "rw"
        ? "Ugomba gutsinda nibura 70% kugira ngo ukomeze."
        : "You need at least 70% to unlock the next round."
    );

    const list = $("roundList");

    if (list) {
      list.innerHTML = "";

      for (
        let round = 1;
        round <= total;
        round++
      ) {
        const isCompleted =
          completed.includes(round);

        const isUnlocked =
          isRoundUnlocked(round);

        const button =
          document.createElement("button");

        button.type = "button";
        button.className = "round-card";

        if (isCompleted) {
          button.classList.add("completed");
        }

        if (!isUnlocked) {
          button.classList.add("locked");
        }

        button.disabled = !isUnlocked;

        const roundName =
          state.language === "rw"
            ? `Ikiciro ${round}`
            : `Round ${round}`;

        const status = isCompleted
          ? (
              state.language === "rw"
                ? "Waragitsinze ✓"
                : "Completed ✓"
            )
          : isUnlocked
            ? (
                state.language === "rw"
                  ? "Kina"
                  : "Play"
              )
            : (
                state.language === "rw"
                  ? "Kirafunze 🔒"
                  : "Locked 🔒"
              );

        const nameElement =
          document.createElement("span");

        nameElement.className = "round-number";
        nameElement.textContent = roundName;

        const statusElement =
          document.createElement("span");

        statusElement.className = "round-status";
        statusElement.textContent = status;

        button.appendChild(nameElement);
        button.appendChild(statusElement);

        button.addEventListener(
          "click",
          () => {
            if (prepareRound(round)) {
              startCurrentRound();
            }
          }
        );

        list.appendChild(button);
      }
    }

    showScreen("roundsScreen");
  }

  // =====================================================
  // HOME SCREEN
  // =====================================================

  function updateHome() {
    setText(
      ["homeRound"],
      getNextRound()
    );

    setText(
      ["homeScore"],
      storageGet(CONFIG.STORAGE.best) || "0"
    );

    const completed = getCompletedRounds();

    setText(
      ["homeStars"],
      "⭐".repeat(
        Math.min(5, completed.length)
      ) || "⭐"
    );

    const saved = getProgress();

    const canContinue = Boolean(
      saved &&
      Array.isArray(saved.questionIds) &&
      saved.questionIds.length
    );

    setDisplay(
      ["continueBtn"],
      canContinue ? "block" : "none"
    );

    const review = readJSON(
      CONFIG.STORAGE.review,
      []
    );

    setDisplay(
      ["reviewAnswersBtn"],
      Array.isArray(review) && review.length
        ? "block"
        : "none"
    );

    updateSelectionSummary();
  }

  // =====================================================
  // CONTINUE QUIZ
  // =====================================================

  function continueQuiz() {
    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bifunguke."
          : "Please wait for questions to load."
      );

      return;
    }

    const saved = getProgress();

    if (
      !saved ||
      !Array.isArray(saved.questionIds) ||
      !saved.questionIds.length
    ) {
      openSetup();
      return;
    }

    const language =
      saved.language === "rw" ? "rw" : "en";

    const mode =
      saved.mode === "traffic"
        ? "traffic"
        : "general";

    state.language = language;
    state.mode = mode;

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    const questionMap = new Map(
      state.questions.map(
        question => [
          String(question.id),
          question
        ]
      )
    );

    const restored = saved.questionIds
      .map(id => questionMap.get(String(id)))
      .filter(
        question =>
          question &&
          question.category === state.mode
      );

    if (!restored.length) {
      storageRemove(CONFIG.STORAGE.progress);

      showMessage(
        state.language === "rw"
          ? "Umukino wabitswe ntushobora gukomeza. Tangira bundi bushya."
          : "The saved game could not be restored. Please start again."
      );

      openSetup();
      return;
    }

    state.round = Math.max(
      1,
      Number(saved.round) || 1
    );

    state.roundQuestions = restored;

    state.currentIndex = Math.min(
      Math.max(
        0,
        Number(saved.currentIndex) || 0
      ),
      restored.length - 1
    );

    state.score = Math.max(
      0,
      Number(saved.score) || 0
    );

    state.correct = Math.max(
      0,
      Number(saved.correct) || 0
    );

    state.answered = Math.max(
      0,
      Number(saved.answered) || 0
    );

    state.review = Array.isArray(saved.review)
      ? saved.review
      : [];

    state.timeLeft = Number.isFinite(
      Number(saved.timeLeft)
    )
      ? Math.max(
          0,
          Number(saved.timeLeft)
        )
      : getQuestionTime();

    state.selectedAnswer =
      saved.selectedAnswer ?? null;

    state.answerSubmitted =
      Boolean(saved.answerSubmitted);

    state.roundFinished = false;

    storageSet(
      CONFIG.STORAGE.language,
      state.language
    );

    storageSet(
      CONFIG.STORAGE.mode,
      state.mode
    );

    syncSetupButtons();

    // If the previous question was already answered,
    // continue with the next question.

    if (state.answerSubmitted) {
      if (
        state.currentIndex <
        restored.length - 1
      ) {
        state.currentIndex++;

        state.selectedAnswer = null;
        state.answerSubmitted = false;

        state.timeLeft = getQuestionTime();

      } else {
        finishRound();
        return;
      }
    }

    setDisplay(
      ["gameSetup"],
      "none"
    );

    startCurrentRound(true);
  }

  // =====================================================
  // SETTINGS
  // =====================================================

  function openSettings() {
    stopTimer();

    // Save the remaining time before leaving the quiz.

    if (
      $("quizScreen") &&
      $("quizScreen").style.display !== "none"
    ) {
      saveProgress();
    }

    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) {
      language.value = state.language;
    }

    if (mode) {
      mode.value = state.mode;
    }

    showScreen("settingsScreen");
  }

  function saveSettings() {
    const language =
      $("settingsLanguage")?.value ||
      state.language;

    const mode =
      $("settingsMode")?.value ||
      state.mode;

    if (!["rw", "en"].includes(language)) {
      return;
    }

    if (!["traffic", "general"].includes(mode)) {
      return;
    }

    const changed =
      language !== state.language ||
      mode !== state.mode;

    state.language = language;
    state.mode = mode;

    state.languageChosen = true;
    state.modeChosen = true;

    state.setupConfirmed = false;

    storageSet(
      CONFIG.STORAGE.language,
      language
    );

    storageSet(
      CONFIG.STORAGE.mode,
      mode
    );

    if (changed) {
      storageRemove(CONFIG.STORAGE.progress);

      state.roundQuestions = [];
      state.review = [];

      state.currentIndex = 0;

      state.score = 0;
      state.correct = 0;
      state.answered = 0;

      state.selectedAnswer = null;
      state.answerSubmitted = false;

      state.roundFinished = false;

      stopTimer();
    }

    syncSetupButtons();
    updateHome();

    const message = $("settingsMessage");

    if (message) {
      message.textContent =
        language === "rw"
          ? "Ibyahinduwe byabitswe neza."
          : "Settings saved successfully.";
    }

    openSetup();
  }

  // =====================================================
  // RESET PROGRESS
  // =====================================================

  function resetProgress() {
    const confirmation =
      state.language === "rw"
        ? "Urashaka gusiba amanota n'iterambere byawe?"
        : "Are you sure you want to reset your progress?";

    if (!window.confirm(confirmation)) {
      return;
    }

    Object.values(CONFIG.STORAGE).forEach(
      key => storageRemove(key)
    );

    stopTimer();

    state.roundQuestions = [];
    state.review = [];

    state.round = 1;
    state.currentIndex = 0;

    state.score = 0;
    state.correct = 0;
    state.answered = 0;

    state.selectedAnswer = null;
    state.answerSubmitted = false;

    state.timeLeft = 0;

    state.setupConfirmed = false;
    state.roundFinished = false;

    state.languageChosen = false;
    state.modeChosen = false;

    state.language = "en";
    state.mode = "general";

    storageSet(
      CONFIG.STORAGE.language,
      "en"
    );

    storageSet(
      CONFIG.STORAGE.mode,
      "general"
    );

    syncSetupButtons();
    updateHome();

    const message = $("settingsMessage");

    if (message) {
      message.textContent =
        state.language === "rw"
          ? "Iterambere ryasubijwe ku ntangiriro."
          : "Progress has been reset.";
    }

    openSetup();
  }

  // =====================================================
  // SHARE
  // =====================================================

  async function shareApp() {
    const shareData = {
      title: "Quiz Master 🇷🇼 - Knowledge Quiz",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (!navigator.clipboard?.writeText) {
        throw new Error(
          "Clipboard is unavailable."
        );
      }

      await navigator.clipboard.writeText(
        shareData.text + " " + shareData.url
      );

      window.alert("✅ Link Copied!");

    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      try {
        if (!navigator.clipboard?.writeText) {
          throw error;
        }

        await navigator.clipboard.writeText(
          shareData.text + " " + shareData.url
        );

        window.alert("✅ Link Copied!");

      } catch (copyError) {
        console.error(
          "Share error:",
          copyError
        );
      }
    }
  }

  // =====================================================
  // HOME NAVIGATION
  // =====================================================

  function goHome() {
    if (
      $("quizScreen") &&
      $("quizScreen").style.display !== "none"
    ) {
      saveProgress();
    }

    stopTimer();

    showScreen("homeScreen");

    updateHome();

    setDisplay(
      ["gameSetup"],
      "block"
    );

    state.setupConfirmed = false;

    setDisplay(
      ["confirmSetupBtn"],
      "block"
    );

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    syncSetupButtons();
  }

  // =====================================================
  // EVENT HELPER
  // =====================================================

  function on(id, event, callback) {
    const element = $(id);

    if (element) {
      element.addEventListener(
        event,
        callback
      );
    }
  }

  // =====================================================
  // EVENTS
  // =====================================================

  function bindEvents() {
    // More menu

    bindMoreMenu();

    // Setup

    on(
      "startBtn",
      "click",
      startConfirmedQuiz
    );

    on(
      "confirmSetupBtn",
      "click",
      confirmSetup
    );

    on(
      "setupBackBtn",
      "click",
      goHome
    );

    $$(".language-btn").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectLanguage(
            button.dataset.language
          );
        }
      );
    });

    $$(".mode-btn").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectMode(
            button.dataset.mode
          );
        }
      );
    });

    // Home

    on(
      "continueBtn",
      "click",
      continueQuiz
    );

    on(
      "roundsBtn",
      "click",
      showRounds
    );

    on(
      "settingsBtn",
      "click",
      openSettings
    );

    on(
      "shareBtn",
      "click",
      shareApp
    );

    on(
      "reviewAnswersBtn",
      "click",
      showReview
    );

    // Quiz

    on(
      "submitAnswerBtn",
      "click",
      submitAnswer
    );

    on(
      "nextQuestionBtn",
      "click",
      nextQuestion
    );

    on(
      "quizReviewBtn",
      "click",
      showReview
    );

    on(
      "quizHomeBtn",
      "click",
      goHome
    );

    // Results

    on(
      "resultNextBtn",
      "click",
      nextRound
    );

    on(
      "retryBtn",
      "click",
      retryRound
    );

    on(
      "resultReviewBtn",
      "click",
      showReview
    );

    on(
      "resultHomeBtn",
      "click",
      goHome
    );

    // Review

    on(
      "reviewHomeBtn",
      "click",
      goHome
    );

    // Rounds

    on(
      "roundsHomeBtn",
      "click",
      goHome
    );

    // Settings

    on(
      "settingsHomeBtn",
      "click",
      goHome
    );

    on(
      "saveSettingsBtn",
      "click",
      saveSettings
    );

    on(
      "resetProgressBtn",
      "click",
      resetProgress
    );

    // Keyboard navigation

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" ||
          !$("quizScreen") ||
          $("quizScreen").style.display === "none"
        ) {
          return;
        }

        const target = event.target;

        if (
          target &&
          target.matches(
            "button, input, select, textarea, a"
          )
        ) {
          return;
        }

        if (state.answerSubmitted) {
          nextQuestion();
        } else if (
          state.selectedAnswer !== null
        ) {
          submitAnswer();
        }
      }
    );

    // Pause timer when the user leaves the tab.
    // Save progress before the tab becomes inactive.

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          if (
            $("quizScreen") &&
            $("quizScreen").style.display !== "none"
          ) {
            saveProgress();
          }

          stopTimer();
        } else if (
          $("quizScreen") &&
          $("quizScreen").style.display !== "none" &&
          !state.answerSubmitted &&
          state.roundQuestions.length
        ) {
          startTimer();
        }
      }
    );

    // Save progress when the page is closed.

    window.addEventListener(
      "pagehide",
      () => {
        if (
          $("quizScreen") &&
          $("quizScreen").style.display !== "none"
        ) {
          saveProgress();
        }

        stopTimer();
      }
    );
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async function init() {
    if (state.initialized) return;

    state.initialized = true;

    bindEvents();

    state.language =
      storageGet(CONFIG.STORAGE.language) || "en";

    state.mode =
      storageGet(CONFIG.STORAGE.mode) || "general";

    if (!["rw", "en"].includes(state.language)) {
      state.language = "en";
    }

    if (!["traffic", "general"].includes(state.mode)) {
      state.mode = "general";
    }

    // User must confirm both choices.

    state.languageChosen = false;
    state.modeChosen = false;

    state.setupConfirmed = false;

    syncSetupButtons();

    showScreen("homeScreen");

    setDisplay(
      ["gameSetup"],
      "block"
    );

    setDisplay(
      ["confirmSetupBtn"],
      "block"
    );

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    closeMoreMenu();

    updateHome();

    await loadQuestions();

    updateHome();
    updateSelectionSummary();
    syncSetupButtons();
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  window.QuizMaster = {
    start: openSetup,

    confirmSetup,
    startConfirmedQuiz,

    continueQuiz,

    nextQuestion,
    submitAnswer,

    showRounds,
    showReview,

    openSettings,
    saveSettings,
    resetProgress,

    goHome,

    loadQuestions,

    openMoreMenu: toggleMoreMenu,
    closeMoreMenu
  };

  // =====================================================
  // START ENGINE
  // =====================================================

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
