(() => {
  "use strict";

  // ==========================================
  // QUIZ MASTER RWANDA
  // Compatible Quiz Engine
  // ==========================================

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
    }
  };

  const $ = id => document.getElementById(id);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    questions: [],
    loaded: false,

    language: localStorage.getItem(CONFIG.STORAGE.language) || "en",
    mode: localStorage.getItem(CONFIG.STORAGE.mode) || "general",

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

    review: [],
    paused: false,
    initialized: false
  };

  // ==========================================
  // STORAGE
  // ==========================================

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Storage error:", error);
    }
  }

  function getUsedData() {
    const data = readJSON(CONFIG.STORAGE.used, {});
    return Array.isArray(data)
      ? { traffic: data, general: [] }
      : data;
  }

  function getUsedIds() {
    const data = getUsedData();
    return Array.isArray(data[state.mode])
      ? data[state.mode]
      : [];
  }

  function saveUsedIds(ids) {
    const data = getUsedData();
    data[state.mode] = ids;
    writeJSON(CONFIG.STORAGE.used, data);
  }

  function getCompletedData() {
    const data = readJSON(CONFIG.STORAGE.completed, {});
    return Array.isArray(data)
      ? { traffic: data, general: [] }
      : data;
  }

  function getCompletedRounds() {
    const data = getCompletedData();
    return Array.isArray(data[state.mode])
      ? data[state.mode]
      : [];
  }

  function saveCompletedRounds(rounds) {
    const data = getCompletedData();
    data[state.mode] = rounds;
    writeJSON(CONFIG.STORAGE.completed, data);
  }

  function getProgress() {
    return readJSON(CONFIG.STORAGE.progress, null);
  }

  function saveProgress() {
    if (!state.roundQuestions.length) return;

    writeJSON(CONFIG.STORAGE.progress, {
      language: state.language,
      mode: state.mode,
      round: state.round,
      questionIds: state.roundQuestions.map(q => String(q.id)),
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

  function clearProgress() {
    localStorage.removeItem(CONFIG.STORAGE.progress);
    updateHome();
  }

  // ==========================================
  // HTML HELPERS
  // ==========================================

  function getElement(...ids) {
    for (const id of ids) {
      const element = $(id);
      if (element) return element;
    }
    return null;
  }

  function setText(ids, value) {
    const element = getElement(...ids);
    if (element) element.textContent = value;
  }

  function setDisplay(ids, display) {
    const element = getElement(...ids);
    if (element) element.style.display = display;
  }

  function showMessage(message, type = "info") {
    const target = getElement("setupError", "homeMessage");

    if (!target) {
      console.log(message);
      return;
    }

    target.textContent = message;
    target.dataset.type = type;
    target.style.display = "block";
  }

  function hideMessage() {
    const target = getElement("setupError", "homeMessage");
    if (target) target.style.display = "none";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

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

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    document.dispatchEvent(new CustomEvent(
      "quizmaster:show-screen",
      { detail: { screen: screenId } }
    ));
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // ==========================================
  // LANGUAGE AND QUESTION HELPERS
  // ==========================================

  function getQuestionText(q) {
    return state.language === "rw" && q.question_rw
      ? q.question_rw
      : q.question || "";
  }

  function getOptions(q) {
    return state.language === "rw" &&
      Array.isArray(q.options_rw) &&
      q.options_rw.length
      ? q.options_rw
      : q.options || [];
  }

  function getCorrectAnswer(q) {
    return state.language === "rw" && q.answer_rw
      ? q.answer_rw
      : q.answer;
  }

  function getExplanation(q) {
    return state.language === "rw"
      ? q.explanation_rw || q.explanation || ""
      : q.explanation || "";
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

  // ==========================================
  // QUESTION VALIDATION
  // ==========================================

  function validQuestion(q) {
    if (!q || typeof q !== "object") return false;

    if (!["traffic", "general"].includes(q.category)) {
      return false;
    }

    if (
      q.id === undefined ||
      q.id === null ||
      !q.question ||
      !q.answer ||
      !Array.isArray(q.options) ||
      q.options.length < 2
    ) {
      return false;
    }

    if (!q.options.includes(q.answer)) {
      return false;
    }

    if (
      Array.isArray(q.options_rw) &&
      q.options_rw.length &&
      q.answer_rw &&
      !q.options_rw.includes(q.answer_rw)
    ) {
      return false;
    }

    return true;
  }

  // ==========================================
  // OFFLINE CACHE FALLBACK
  // ==========================================

  async function getCachedQuestions() {
    if (!("caches" in window)) {
      return null;
    }

    try {
      const questionsURL = new URL(
        CONFIG.QUESTIONS_FILE,
        document.baseURI
      ).href;

      // Search all available caches, including the
      // cache created by the Service Worker.

      const cachedResponse = await caches.match(
        questionsURL,
        { ignoreSearch: true }
      );

      if (!cachedResponse || !cachedResponse.ok) {
        return null;
      }

      const data = await cachedResponse.json();

      return Array.isArray(data) ? data : null;

    } catch (error) {
      console.warn("Offline cache lookup failed:", error);
      return null;
    }
  }

  // ==========================================
  // LOAD QUESTIONS
  // ==========================================

  async function loadQuestions() {
    try {
      showMessage(
        state.language === "rw"
          ? "Ibibazo birimo gutegurwa..."
          : "Loading questions..."
      );

      let data = null;
      let source = "network";

      try {
        // IMPORTANT:
        // Use a stable URL without Date.now().
        // This allows the Service Worker to find
        // the same questions.json when offline.

        const response = await fetch(
          CONFIG.QUESTIONS_FILE,
          { cache: "no-cache" }
        );

        if (!response.ok) {
          throw new Error("HTTP error: " + response.status);
        }

        data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("questions.json must contain an array.");
        }

      } catch (networkError) {
        console.warn(
          "Network question loading failed. Trying offline cache:",
          networkError
        );

        data = await getCachedQuestions();
        source = "cache";

        if (!data) {
          throw new Error(
            "Questions are unavailable online and in offline cache."
          );
        }
      }

      const valid = data.filter(validQuestion);

      state.questions = valid;
      state.loaded = valid.length > 0;

      const traffic = valid.filter(
        q => q.category === "traffic"
      ).length;

      const general = valid.filter(
        q => q.category === "general"
      ).length;

      console.log("Quiz Master:", {
        source,
        total: valid.length,
        traffic,
        general,
        rejected: data.length - valid.length
      });

      if (!valid.length) {
        throw new Error("No valid questions found.");
      }

      hideMessage();
      updateHome();
      updateSelectionSummary();

      document.dispatchEvent(new CustomEvent(
        "quizmaster:questions-loaded",
        {
          detail: {
            total: valid.length,
            traffic,
            general,
            rejected: data.length - valid.length,
            source
          }
        }
      ));

      return true;

    } catch (error) {
      state.loaded = false;

      console.error("Question loading error:", error);

      showMessage(
        state.language === "rw"
          ? "Ibibazo ntibyafungutse. Genza internet cyangwa questions.json yabitswe muri cache."
          : "Questions could not load. Check your connection or the cached questions.json file.",
        "error"
      );

      document.dispatchEvent(new CustomEvent(
        "quizmaster:error",
        { detail: error.message }
      ));

      return false;
    }
  }

  function getModeQuestions() {
    return state.questions.filter(
      q => q.category === state.mode
    );
  }

  // ==========================================
  // ROUND SYSTEM
  // ==========================================

  function getTotalRounds() {
    return Math.ceil(
      getModeQuestions().length /
      CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getNextRound() {
    const completed = getCompletedRounds();

    for (let round = 1; round <= getTotalRounds(); round++) {
      if (!completed.includes(round)) return round;
    }

    return 1;
  }

  function isRoundUnlocked(round) {
    if (round === 1) return true;

    const completed = getCompletedRounds();

    for (let i = 1; i < round; i++) {
      if (!completed.includes(i)) return false;
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

    if (
      roundNumber < 1 ||
      roundNumber > getTotalRounds()
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
      q => !used.has(String(q.id))
    );

    if (
      available.length < CONFIG.QUESTIONS_PER_ROUND &&
      pool.length >= CONFIG.QUESTIONS_PER_ROUND
    ) {
      saveUsedIds([]);
      available = [...pool];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    if (!selected.length) return false;

    saveUsedIds([
      ...new Set([
        ...getUsedIds(),
        ...selected.map(q => String(q.id))
      ])
    ]);

    state.round = roundNumber;
    state.roundQuestions = selected;
    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.answered = 0;
    state.selectedAnswer = null;
    state.answerSubmitted = false;
    state.review = [];
    state.timeLeft = getQuestionTime();

    saveProgress();

    return true;
  }

  // ==========================================
  // SETUP
  // ==========================================

  function selectLanguage(language) {
    if (!["rw", "en"].includes(language)) return;

    state.language = language;
    state.languageChosen = true;
    state.setupConfirmed = false;

    localStorage.setItem(
      CONFIG.STORAGE.language,
      language
    );

    $$(".language-btn").forEach(button => {
      const active = button.dataset.language === language;

      button.classList.toggle("selected", active);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    resetConfirmation();
    updateSelectionSummary();
  }

  function selectMode(mode) {
    if (!["traffic", "general"].includes(mode)) return;

    state.mode = mode;
    state.modeChosen = true;
    state.setupConfirmed = false;

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      mode
    );

    $$(".mode-btn").forEach(button => {
      const active = button.dataset.mode === mode;

      button.classList.toggle("selected", active);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    resetConfirmation();
    updateSelectionSummary();
  }

  function resetConfirmation() {
    setDisplay(["confirmSetupBtn"], "block");

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    state.setupConfirmed = false;
  }

  function updateSelectionSummary() {
    const summary = getElement(
      "setupSummary",
      "selectionSummary"
    );

    const ready =
      state.languageChosen && state.modeChosen;

    const confirm = $("confirmSetupBtn");

    if (confirm) {
      confirm.disabled = !ready || !state.loaded;
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
      (state.language === "rw"
        ? "Ururimi: Ikinyarwanda"
        : "Language: English") +
      " • " + getCategoryName();
  }

  function syncSetupButtons() {
    $$(".language-btn").forEach(button => {
      const active =
        button.dataset.language === state.language;

      button.classList.toggle("selected", active);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    $$(".mode-btn").forEach(button => {
      const active =
        button.dataset.mode === state.mode;

      button.classList.toggle("selected", active);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
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
    if (!state.languageChosen || !state.modeChosen) {
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

    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    setDisplay(["confirmSetupBtn"], "none");

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = false;
    }

    const summary = getElement(
      "setupSummary",
      "selectionSummary"
    );

    if (summary) {
      summary.textContent =
        state.language === "rw"
          ? "✓ Ibyo wahisemo byemejwe."
          : "✓ Your selection is confirmed.";
    }

    hideMessage();
  }

  // ==========================================
  // START GAME
  // ==========================================

  function startConfirmedQuiz() {
    if (!state.setupConfirmed) {
      showMessage(
        state.language === "rw"
          ? "Banza wemeze ibyo wahisemo."
          : "Please confirm your selections first."
      );
      return;
    }

    if (!state.loaded) return;

    if (!prepareRound(getNextRound())) return;

    setDisplay(["gameSetup"], "none");

    hideMessage();
    startCurrentRound();
  }

  function startCurrentRound(resume = false) {
    if (!state.roundQuestions.length) return;

    showScreen("quizScreen");

    setText(["currentRound", "roundLabel"], state.round);

    setText(
      ["categoryIndicator"],
      getCategoryName()
    );

    renderQuestion(resume);

    if (!state.answerSubmitted) {
      startTimer();
    }

    document.dispatchEvent(new CustomEvent(
      "quizmaster:game-started",
      {
        detail: {
          round: state.round,
          mode: state.mode
        }
      }
    ));
  }

  // ==========================================
  // RENDER QUESTION
  // ==========================================

  function renderQuestion(resume = false) {
    const question = state.roundQuestions[state.currentIndex];

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
      ["currentQuestionNumber", "questionCounter"],
      `${state.currentIndex + 1}/${state.roundQuestions.length}`
    );

    setText(
      ["questionText"],
      getQuestionText(question)
    );

    const image = $("questionImage");

    if (image) {
      if (question.image) {
        image.src = question.image;
        image.alt = "Question illustration";
        image.style.display = "block";
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
      }
    }

    const container = getElement("optionsContainer");

    if (container) {
      container.innerHTML = "";

      shuffle(getOptions(question)).forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";
        button.dataset.answer = option;

        button.innerHTML =
          `<span class="option-letter">${String.fromCharCode(65 + index)}</span> ` +
          `<span class="option-text">${escapeHTML(option)}</span>`;

        button.addEventListener("click", () => {
          selectAnswer(option, button);
        });

        if (state.selectedAnswer === option) {
          button.classList.add("selected");
          button.setAttribute("aria-pressed", "true");
        }

        if (state.answerSubmitted) {
          button.disabled = true;

          if (button.dataset.answer === getCorrectAnswer(question)) {
            button.classList.add("correct");
          } else if (button.dataset.answer === state.selectedAnswer) {
            button.classList.add("incorrect");
          }
        }

        container.appendChild(button);
      });
    }

    setDisplay(["answerFeedback"], "none");
    setDisplay(["explanation"], "none");

    if (state.answerSubmitted) {
      showAnswerFeedback(question);
    }

    const submit = $("submitAnswerBtn");

    if (submit) {
      submit.disabled =
        !state.selectedAnswer || state.answerSubmitted;

      submit.style.display =
        state.answerSubmitted ? "none" : "block";
    }

    setDisplay(
      ["nextQuestionBtn"],
      state.answerSubmitted ? "block" : "none"
    );

    updateScoreDisplay();
    updateProgress();
    updateTimerDisplay();

    saveProgress();
  }

  function selectAnswer(answer, button) {
    if (state.answerSubmitted) return;

    state.selectedAnswer = answer;

    $$("#optionsContainer .option-btn").forEach(option => {
      option.classList.remove("selected");
      option.setAttribute("aria-pressed", "false");
    });

    if (button) {
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    }

    const submit = $("submitAnswerBtn");

    if (submit) submit.disabled = false;

    saveProgress();
  }

  // ==========================================
  // SCORE AND PROGRESS
  // ==========================================

  function updateScoreDisplay() {
    setText(["score", "scoreNumber"], state.score);
  }

  function updateProgress() {
    const fill = getElement(
      "progressFill",
      "progressBar"
    );

    if (fill) {
      fill.style.width =
        ((state.currentIndex + 1) /
          state.roundQuestions.length * 100) + "%";
    }
  }

  // ==========================================
  // ANSWER FEEDBACK
  // ==========================================

  function showAnswerFeedback(question) {
    const correct = getCorrectAnswer(question);
    const isCorrect = state.selectedAnswer === correct;

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent = isCorrect
        ? (state.language === "rw"
            ? "Ni byo! +10 amanota"
            : "Correct! +10 points")
        : (state.language === "rw"
            ? "Si byo. Gerageza ubutaha."
            : "Incorrect. Try again next time.");

      feedback.style.display = "block";
    }

    const explanation = $("explanation");
    const explanationText = getExplanation(question);

    if (explanation && explanationText) {
      explanation.textContent = explanationText;
      explanation.style.display = "block";
    }
  }

  // ==========================================
  // SUBMIT ANSWER
  // ==========================================

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

    const question = state.roundQuestions[state.currentIndex];
    const correct = getCorrectAnswer(question);
    const isCorrect = state.selectedAnswer === correct;

    if (isCorrect) {
      state.correct++;
      state.score += CONFIG.POINTS_PER_CORRECT;
    }

    state.review.push({
      question: getQuestionText(question),
      selected: state.selectedAnswer,
      correct,
      isCorrect,
      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(button => {
      button.disabled = true;

      if (button.dataset.answer === correct) {
        button.classList.add("correct");
      } else if (button.dataset.answer === state.selectedAnswer) {
        button.classList.add("incorrect");
      }
    });

    showAnswerFeedback(question);

    setDisplay(["submitAnswerBtn"], "none");

    const next = $("nextQuestionBtn");

    if (next) {
      next.textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira" : "Next Question");

      next.style.display = "block";
    }

    updateScoreDisplay();
    saveProgress();
  }

  // ==========================================
  // TIMER
  // ==========================================

  function startTimer() {
    stopTimer();

    updateTimerDisplay();

    if (state.answerSubmitted) return;

    state.timerId = setInterval(() => {
      if (state.paused || state.answerSubmitted) return;

      state.timeLeft--;

      updateTimerDisplay();

      if (state.timeLeft <= 0) {
        stopTimer();
        timeExpired();
      } else if (state.timeLeft % 5 === 0) {
        saveProgress();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
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

  function timeExpired() {
    if (state.answerSubmitted) return;

    state.answerSubmitted = true;
    state.answered++;

    const question = state.roundQuestions[state.currentIndex];
    const correct = getCorrectAnswer(question);

    state.review.push({
      question: getQuestionText(question),
      selected: state.language === "rw"
        ? "Nta gisubizo"
        : "No answer",
      correct,
      isCorrect: false,
      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(button => {
      button.disabled = true;

      if (button.dataset.answer === correct) {
        button.classList.add("correct");
      }
    });

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent =
        state.language === "rw"
          ? "Igihe kirangiye!"
          : "Time is up!";

      feedback.style.display = "block";
    }

    const explanation = $("explanation");

    if (explanation && getExplanation(question)) {
      explanation.textContent = getExplanation(question);
      explanation.style.display = "block";
    }

    setDisplay(["submitAnswerBtn"], "none");

    const next = $("nextQuestionBtn");

    if (next) {
      next.textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira" : "Next Question");

      next.style.display = "block";
    }

    saveProgress();
  }

  // ==========================================
  // NEXT QUESTION
  // ==========================================

  function nextQuestion() {
    if (!state.answerSubmitted) return;

    if (state.currentIndex < state.roundQuestions.length - 1) {
      state.currentIndex++;
      renderQuestion();
      startTimer();
    } else {
      finishRound();
    }
  }

  // ==========================================
  // RESULTS
  // ==========================================

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;

    const percentage = total
      ? Math.round(state.correct / total * 100)
      : 0;

    const passed = percentage >= CONFIG.UNLOCK_PERCENT;

    if (passed) {
      const completed = getCompletedRounds();

      if (!completed.includes(state.round)) {
        completed.push(state.round);
        completed.sort((a, b) => a - b);
        saveCompletedRounds(completed);
      }
    }

    const best = Number(
      localStorage.getItem(CONFIG.STORAGE.best) || 0
    );

    if (state.score > best) {
      localStorage.setItem(
        CONFIG.STORAGE.best,
        String(state.score)
      );
    }

    const totalScore =
      Number(localStorage.getItem(CONFIG.STORAGE.total) || 0) +
      state.score;

    localStorage.setItem(
      CONFIG.STORAGE.total,
      String(totalScore)
    );

    writeJSON(CONFIG.STORAGE.review, state.review);

    clearProgress();

    setText(
      ["resultTitle"],
      passed
        ? (state.language === "rw" ? "Watsinze!" : "You Passed!")
        : (state.language === "rw" ? "Ongera ugerageze" : "Try Again")
    );

    setText(
      ["resultMessage"],
      passed
        ? (state.language === "rw"
            ? "Wujuje ibisabwa kugira ngo ukomeze."
            : "You passed this round.")
        : (state.language === "rw"
            ? "Ukeneye nibura 70% kugira ngo ukomeze."
            : "You need at least 70% to unlock the next round.")
    );

    setText(["resultScore"], state.score);
    setText(["resultPercent"], percentage + "%");

    setText(
      ["resultStars"],
      passed ? "⭐⭐⭐" : "⭐"
    );

    const nextButton = $("resultNextBtn");

    if (nextButton) {
      nextButton.style.display =
        passed && state.round < getTotalRounds()
          ? "block"
          : "none";
    }

    setDisplay(
      ["retryBtn"],
      passed ? "none" : "block"
    );

    updateHome();
    showScreen("resultScreen");

    document.dispatchEvent(new CustomEvent(
      "quizmaster:round-finished",
      {
        detail: {
          round: state.round,
          score: state.score,
          correct: state.correct,
          total,
          percentage,
          passed
        }
      }
    ));
  }

  function retryRound() {
    if (!state.roundQuestions.length) return;

    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.answered = 0;
    state.review = [];
    state.selectedAnswer = null;
    state.answerSubmitted = false;
    state.timeLeft = getQuestionTime();

    saveProgress();
    startCurrentRound();
  }

  function nextRound() {
    const next = state.round + 1;

    if (next > getTotalRounds()) {
      goHome();
      return;
    }

    if (!isRoundUnlocked(next)) return;

    if (prepareRound(next)) {
      startCurrentRound();
    }
  }

  // ==========================================
  // REVIEW ANSWERS
  // ==========================================

  function showReview() {
    const reviewData = state.review.length
      ? state.review
      : readJSON(CONFIG.STORAGE.review, []);

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
        ? (state.language === "rw" ? "Ni byo ✓" : "Correct ✓")
        : (state.language === "rw" ? "Si byo ✗" : "Incorrect ✗");

      card.innerHTML = `
        <h3>${index + 1}. ${escapeHTML(item.question)}</h3>

        <p>
          <strong>${state.language === "rw"
            ? "Igisubizo wahisemo:"
            : "Your answer:"}</strong>
          ${escapeHTML(item.selected)}
        </p>

        <p>
          <strong>${state.language === "rw"
            ? "Igisubizo nyacyo:"
            : "Correct answer:"}</strong>
          ${escapeHTML(item.correct)}
        </p>

        <p class="review-status">${status}</p>

        ${item.explanation
          ? `<p>${escapeHTML(item.explanation)}</p>`
          : ""}
      `;

      const statusElement = card.querySelector(".review-status");

      if (statusElement) {
        statusElement.style.color =
          item.isCorrect ? "#16a34a" : "#dc2626";
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");

    document.dispatchEvent(new CustomEvent(
      "quizmaster:review-data",
      { detail: reviewData }
    ));
  }

  // ==========================================
  // ROUNDS
  // ==========================================

  function showRounds() {
    if (!state.loaded) {
      showMessage("Questions are still loading.");
      return;
    }

    const total = getTotalRounds();
    const completed = getCompletedRounds();

    setText(["roundsCompleted"], completed.length);
    setText(["roundsTotal"], total);

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

    const list = getElement("roundList");

    if (list) {
      list.innerHTML = "";

      for (let round = 1; round <= total; round++) {
        const isCompleted = completed.includes(round);
        const isUnlocked = isRoundUnlocked(round);

        const button = document.createElement("button");

        button.type = "button";
        button.className = "round-card";

        if (isCompleted) button.classList.add("completed");
        if (!isUnlocked) button.classList.add("locked");

        button.disabled = !isUnlocked;

        button.innerHTML = `
          <span class="round-number">Round ${round}</span>
          <span class="round-status">
            ${isCompleted
              ? "Completed ✓"
              : isUnlocked
                ? "Play"
                : "Locked 🔒"}
          </span>
        `;

        button.addEventListener("click", () => {
          if (prepareRound(round)) {
            startCurrentRound();
          }
        });

        list.appendChild(button);
      }
    }

    showScreen("roundsScreen");
  }

  // ==========================================
  // HOME
  // ==========================================

  function updateHome() {
    setText(["homeRound"], getNextRound());

    setText(
      ["homeScore"],
      localStorage.getItem(CONFIG.STORAGE.best) || "0"
    );

    const completed = getCompletedRounds();

    setText(
      ["homeStars"],
      "⭐".repeat(Math.min(5, completed.length)) || "⭐"
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

    const review = readJSON(CONFIG.STORAGE.review, []);

    setDisplay(
      ["reviewAnswersBtn"],
      review.length ? "block" : "none"
    );

    updateSelectionSummary();
  }

  // ==========================================
  // CONTINUE QUIZ
  // ==========================================

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

    if (!saved || !Array.isArray(saved.questionIds)) {
      openSetup();
      return;
    }

    state.language = saved.language || state.language;
    state.mode = saved.mode || state.mode;

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    const questionMap = new Map(
      state.questions.map(q => [String(q.id), q])
    );

    const restored = saved.questionIds
      .map(id => questionMap.get(String(id)))
      .filter(q => q && q.category === state.mode);

    if (!restored.length) {
      clearProgress();
      openSetup();
      return;
    }

    state.round = Number(saved.round) || 1;
    state.roundQuestions = restored;

    state.currentIndex = Math.min(
      Math.max(0, Number(saved.currentIndex) || 0),
      restored.length - 1
    );

    state.score = Number(saved.score) || 0;
    state.correct = Number(saved.correct) || 0;
    state.answered = Number(saved.answered) || 0;

    state.review = Array.isArray(saved.review)
      ? saved.review
      : [];

    state.timeLeft = Number.isFinite(Number(saved.timeLeft))
      ? Math.max(0, Number(saved.timeLeft))
      : getQuestionTime();

    state.selectedAnswer = saved.selectedAnswer ?? null;
    state.answerSubmitted = Boolean(saved.answerSubmitted);

    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    syncSetupButtons();

    if (state.answerSubmitted) {
      if (state.currentIndex < restored.length - 1) {
        state.currentIndex++;
        state.selectedAnswer = null;
        state.answerSubmitted = false;
        state.timeLeft = getQuestionTime();
      } else {
        finishRound();
        return;
      }
    }

    setDisplay(["gameSetup"], "none");

    startCurrentRound(true);
  }

  // ==========================================
  // SETTINGS
  // ==========================================

  function openSettings() {
    stopTimer();

    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) language.value = state.language;
    if (mode) mode.value = state.mode;

    showScreen("settingsScreen");
  }

  function saveSettings() {
    const language =
      $("settingsLanguage")?.value || state.language;

    const mode =
      $("settingsMode")?.value || state.mode;

    if (!["rw", "en"].includes(language)) return;
    if (!["traffic", "general"].includes(mode)) return;

    const changed =
      language !== state.language ||
      mode !== state.mode;

    state.language = language;
    state.mode = mode;

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = false;

    localStorage.setItem(
      CONFIG.STORAGE.language,
      language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      mode
    );

    if (changed) {
      clearProgress();

      state.roundQuestions = [];
      state.review = [];
      state.currentIndex = 0;
      state.score = 0;
      state.correct = 0;
      state.answered = 0;

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

  function resetProgress() {
    const message =
      state.language === "rw"
        ? "Urashaka gusiba amanota n'iterambere byawe?"
        : "Are you sure you want to reset your progress?";

    if (!window.confirm(message)) return;

    Object.values(CONFIG.STORAGE).forEach(key => {
      if (key !== CONFIG.STORAGE.language &&
          key !== CONFIG.STORAGE.mode) {
        localStorage.removeItem(key);
      }
    });

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
    state.setupConfirmed = false;

    updateHome();

    const messageElement = $("settingsMessage");

    if (messageElement) {
      messageElement.textContent =
        state.language === "rw"
          ? "Iterambere ryasubijwe ku ntangiriro."
          : "Progress has been reset.";
    }
  }

  // ==========================================
  // SHARE
  // ==========================================

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

      await navigator.clipboard.writeText(
        shareData.text + " " + shareData.url
      );

      window.alert("✅ Link Copied!");

    } catch (error) {
      if (error.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(
          shareData.text + " " + shareData.url
        );

        window.alert("✅ Link Copied!");
      } catch (copyError) {
        console.error("Share error:", copyError);
      }
    }
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

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

    setDisplay(["gameSetup"], "block");

    state.setupConfirmed = false;

    setDisplay(["confirmSetupBtn"], "block");

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    syncSetupButtons();
  }

  // ==========================================
  // EVENT HELPERS
  // ==========================================

  function on(id, event, callback) {
    const element = $(id);

    if (element) {
      element.addEventListener(event, callback);
    }
  }

  function bindEvents() {
    on("startBtn", "click", startConfirmedQuiz);
    on("confirmSetupBtn", "click", confirmSetup);
    on("setupBackBtn", "click", goHome);

    $$(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectLanguage(button.dataset.language);
      });
    });

    $$(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
      });
    });

    on("continueBtn", "click", continueQuiz);
    on("roundsBtn", "click", showRounds);
    on("settingsBtn", "click", openSettings);
    on("shareBtn", "click", shareApp);
    on("reviewAnswersBtn", "click", showReview);

    on("submitAnswerBtn", "click", submitAnswer);
    on("nextQuestionBtn", "click", nextQuestion);
    on("quizReviewBtn", "click", showReview);
    on("quizHomeBtn", "click", goHome);

    on("resultNextBtn", "click", nextRound);
    on("retryBtn", "click", retryRound);
    on("resultReviewBtn", "click", showReview);
    on("resultHomeBtn", "click", goHome);

    on("reviewHomeBtn", "click", goHome);
    on("roundsHomeBtn", "click", goHome);
    on("settingsHomeBtn", "click", goHome);

    on("saveSettingsBtn", "click", saveSettings);
    on("resetProgressBtn", "click", resetProgress);

    document.addEventListener("keydown", event => {
      if (
        event.key !== "Enter" ||
        !$("quizScreen") ||
        $("quizScreen").style.display === "none"
      ) return;

      if (event.target?.tagName === "BUTTON") return;

      if (state.answerSubmitted) {
        nextQuestion();
      } else if (state.selectedAnswer !== null) {
        submitAnswer();
      }
    });
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async function init() {
    if (state.initialized) return;

    state.initialized = true;

    bindEvents();

    state.language = localStorage.getItem(
      CONFIG.STORAGE.language
    ) || "en";

    state.mode = localStorage.getItem(
      CONFIG.STORAGE.mode
    ) || "general";

    state.languageChosen = false;
    state.modeChosen = false;

    syncSetupButtons();

    showScreen("homeScreen");

    setDisplay(["gameSetup"], "block");
    setDisplay(["confirmSetupBtn"], "block");

    const start = $("startBtn");

    if (start) {
      start.style.display = "block";
      start.disabled = true;
    }

    updateHome();

    await loadQuestions();

    updateHome();
    updateSelectionSummary();
    syncSetupButtons();
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

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
    loadQuestions
  };

  // ==========================================
  // START
  // ==========================================

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
