
(() => {
  "use strict";

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
      progress: "quizmasterProgress",
      music: "quizmasterMusicEnabled"
    }
  };

  const $ = id => document.getElementById(id);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    questions: [],
    loaded: false,

    language: localStorage.getItem(CONFIG.STORAGE.language) || "en",
    mode: localStorage.getItem(CONFIG.STORAGE.mode) || "general",

    // Require a selection when no previous choice is saved.
    languageChosen: !!localStorage.getItem(CONFIG.STORAGE.language),
    modeChosen: !!localStorage.getItem(CONFIG.STORAGE.mode),

    music: localStorage.getItem(CONFIG.STORAGE.music) !== "false",

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
    paused: false
  };

  // --------------------------------------------------
  // STORAGE
  // --------------------------------------------------

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Storage error:", error);
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
    const value = readJSON(CONFIG.STORAGE.used, {});
    return Array.isArray(value)
      ? { traffic: value, general: [] }
      : value;
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
    const value = readJSON(CONFIG.STORAGE.completed, {});
    return Array.isArray(value)
      ? { traffic: value, general: [] }
      : value;
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
      answerSubmitted: state.answerSubmitted,
      savedAt: Date.now()
    });

    updateHome();
  }

  function clearProgress() {
    localStorage.removeItem(CONFIG.STORAGE.progress);
    updateHome();
  }

  // --------------------------------------------------
  // GENERAL HELPERS
  // --------------------------------------------------

  function showMessage(message, type = "info") {
    const target = $("homeMessage");
    if (!target) return;

    target.textContent = message;
    target.dataset.type = type;
    target.style.display = "block";
  }

  function hideMessage() {
    const target = $("homeMessage");
    if (target) target.style.display = "none";
  }

  function showScreen(screenId) {
    [
      "homeScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ].forEach(id => {
      const element = $(id);
      if (element) {
        element.style.display =
          id === screenId ? "block" : "none";
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getQuestionText(question) {
    return state.language === "rw" && question.question_rw
      ? question.question_rw
      : question.question || "";
  }

  function getOptions(question) {
    return state.language === "rw" &&
      Array.isArray(question.options_rw) &&
      question.options_rw.length
      ? question.options_rw
      : Array.isArray(question.options)
        ? question.options
        : [];
  }

  function getCorrectAnswer(question) {
    return state.language === "rw" && question.answer_rw
      ? question.answer_rw
      : question.answer;
  }

  function getExplanation(question) {
    return state.language === "rw" && question.explanation_rw
      ? question.explanation_rw
      : question.explanation || question.explanation_rw || "";
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

  // --------------------------------------------------
  // VALIDATE QUESTIONS
  // --------------------------------------------------

  function validQuestion(question) {
    if (!question || typeof question !== "object") return false;

    if (!["traffic", "general"].includes(question.category)) {
      return false;
    }

    if (
      question.id === undefined ||
      question.id === null ||
      !question.question ||
      !question.answer ||
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      return false;
    }

    if (!question.options.includes(question.answer)) {
      return false;
    }

    if (
      question.options_rw &&
      question.options_rw.length &&
      question.answer_rw &&
      !question.options_rw.includes(question.answer_rw)
    ) {
      return false;
    }

    return true;
  }

  // --------------------------------------------------
  // LOAD QUESTIONS
  // --------------------------------------------------

  async function loadQuestions() {
    try {
      showMessage(
        state.language === "rw"
          ? "Ibibazo birimo gutegurwa..."
          : "Loading questions..."
      );

      const response = await fetch(
        CONFIG.QUESTIONS_FILE + "?v=" + Date.now(),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Questions HTTP error: " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must be an array.");
      }

      const valid = data.filter(validQuestion);

      state.questions = valid;
      state.loaded = true;

      const traffic = valid.filter(q => q.category === "traffic").length;
      const general = valid.filter(q => q.category === "general").length;

      console.log("Quiz Master loaded:", {
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

      document.dispatchEvent(new CustomEvent(
        "quizmaster:questions-loaded",
        {
          detail: {
            total: valid.length,
            traffic,
            general
          }
        }
      ));

      return true;

    } catch (error) {
      console.error(error);
      state.loaded = false;

      showMessage(
        state.language === "rw"
          ? "Ibibazo ntibyafungutse. Reba questions.json."
          : "Questions could not load. Check questions.json.",
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

  // --------------------------------------------------
  // ROUND MANAGEMENT
  // --------------------------------------------------

  function getTotalRounds() {
    return Math.ceil(
      getModeQuestions().length / CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getNextRound() {
    const completed = getCompletedRounds();
    const total = getTotalRounds();

    for (let round = 1; round <= total; round++) {
      if (!completed.includes(round)) return round;
    }

    return 1;
  }

  function isRoundUnlocked(round) {
    if (round === 1) return true;

    const completed = getCompletedRounds();

    for (let previous = 1; previous < round; previous++) {
      if (!completed.includes(previous)) return false;
    }

    return true;
  }

  function prepareRound(roundNumber) {
    const pool = getModeQuestions();

    if (!pool.length) {
      showMessage(
        state.language === "rw"
          ? "Nta bibazo bihari muri iki cyiciro."
          : "There are no questions in this category.",
        "error"
      );
      return false;
    }

    const totalRounds = getTotalRounds();

    if (roundNumber < 1 || roundNumber > totalRounds) {
      roundNumber = getNextRound();
    }

    if (!isRoundUnlocked(roundNumber)) {
      showMessage(
        state.language === "rw"
          ? "Banza urangize rounds zibanza."
          : "Complete earlier rounds first.",
        "error"
      );
      return false;
    }

    const used = new Set(getUsedIds());

    let available = pool.filter(
      q => !used.has(String(q.id))
    );

    // Start a new cycle only after all questions are used.
    if (available.length === 0) {
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

  // --------------------------------------------------
  // SETUP AND SELECTION
  // --------------------------------------------------

  function selectLanguage(language) {
    if (!["rw", "en"].includes(language)) return;

    state.language = language;
    state.languageChosen = true;

    $$(".language-btn").forEach(button => {
      const active = button.dataset.language === language;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateSelectionSummary();
  }

  function selectMode(mode) {
    if (!["traffic", "general"].includes(mode)) return;

    state.mode = mode;
    state.modeChosen = true;

    $$(".mode-btn").forEach(button => {
      const active = button.dataset.mode === mode;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const summary = $("selectionSummary");
    const confirm = $("confirmSetupBtn");

    const ready = state.languageChosen && state.modeChosen;

    if (confirm) {
      confirm.disabled = !ready;
    }

    if (!summary) return;

    if (!ready) {
      summary.textContent =
        state.language === "rw"
          ? "Banza uhitemo ururimi n'icyiciro."
          : "Please choose your language and category.";

      return;
    }

    summary.textContent =
      (state.language === "rw"
        ? "Ururimi: Ikinyarwanda"
        : "Language: English") +
      " • " +
      getCategoryName();
  }

  function syncSetupButtons() {
    $$(".language-btn").forEach(button => {
      const active =
        state.languageChosen &&
        button.dataset.language === state.language;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    $$(".mode-btn").forEach(button => {
      const active =
        state.modeChosen &&
        button.dataset.mode === state.mode;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateSelectionSummary();
  }

  function openSetup() {
    stopTimer();

    const setup = $("gameSetup");
    if (setup) setup.style.display = "block";

    showScreen("homeScreen");
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
          ? "Tegereza ibibazo bibanze bifunguke."
          : "Please wait for questions to load."
      );
      return;
    }

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    if (!prepareRound(getNextRound())) return;

    const setup = $("gameSetup");
    if (setup) setup.style.display = "none";

    startCurrentRound();
  }

  // --------------------------------------------------
  // START QUIZ
  // --------------------------------------------------

  function startCurrentRound() {
    if (!state.roundQuestions.length) return;

    showScreen("quizScreen");

    if ($("currentRound")) {
      $("currentRound").textContent = state.round;
    }

    if ($("categoryIndicator")) {
      $("categoryIndicator").textContent = getCategoryName();
    }

    renderQuestion();
    startTimer();

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

  // --------------------------------------------------
  // RENDER QUESTION
  // --------------------------------------------------

  function renderQuestion() {
    const question = state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answerSubmitted = false;
    state.timeLeft = getQuestionTime();

    if ($("currentQuestionNumber")) {
      $("currentQuestionNumber").textContent =
        `${state.currentIndex + 1}/${state.roundQuestions.length}`;
    }

    if ($("questionText")) {
      $("questionText").textContent = getQuestionText(question);
    }

    const image = $("questionImage");

    if (image) {
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

      shuffle(getOptions(question)).forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";
        button.dataset.answer = option;

        button.innerHTML =
          `<span class="option-letter">${String.fromCharCode(65 + index)}</span>` +
          `<span class="option-text">${escapeHTML(option)}</span>`;

        button.addEventListener("click", () => {
          selectAnswer(option, button);
        });

        container.appendChild(button);
      });
    }

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.textContent = "";
      feedback.style.display = "none";
    }

    const explanation = $("explanation");

    if (explanation) {
      explanation.textContent = "";
      explanation.style.display = "none";
    }

    const submit = $("submitAnswerBtn");

    if (submit) {
      submit.disabled = true;
      submit.style.display = "block";
    }

    const next = $("nextQuestionBtn");

    if (next) next.style.display = "none";

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

  // --------------------------------------------------
  // SCORE AND PROGRESS
  // --------------------------------------------------

  function updateScoreDisplay() {
    if ($("score")) {
      $("score").textContent = state.score;
    }

    if ($("scoreNumber")) {
      $("scoreNumber").textContent = state.score;
    }
  }

  function updateProgress() {
    const fill = $("progressFill");

    if (fill) {
      fill.style.width =
        ((state.currentIndex + 1) /
          state.roundQuestions.length * 100) + "%";
    }
  }

  // --------------------------------------------------
  // SUBMIT ANSWER
  // --------------------------------------------------

  function submitAnswer() {
    if (state.answerSubmitted) return;

    if (state.selectedAnswer === null) {
      const feedback = $("answerFeedback");

      if (feedback) {
        feedback.textContent =
          state.language === "rw"
            ? "Banza uhitemo igisubizo."
            : "Please select an answer first.";

        feedback.style.display = "block";
      }

      return;
    }

    stopTimer();

    state.answerSubmitted = true;
    state.answered++;

    const question = state.roundQuestions[state.currentIndex];
    const correctAnswer = getCorrectAnswer(question);

    const isCorrect = state.selectedAnswer === correctAnswer;

    if (isCorrect) {
      state.correct++;
      state.score += CONFIG.POINTS_PER_CORRECT;
    }

    state.review.push({
      question: getQuestionText(question),
      selected: state.selectedAnswer,
      correct: correctAnswer,
      isCorrect,
      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(button => {
      button.disabled = true;

      if (button.dataset.answer === correctAnswer) {
        button.classList.add("correct");
      } else if (button.dataset.answer === state.selectedAnswer) {
        button.classList.add("incorrect");
      }
    });

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

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").style.display = "none";
    }

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

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  function startTimer() {
    stopTimer();

    updateTimerDisplay();

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
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    if ($("timer")) {
      $("timer").textContent = Math.max(0, state.timeLeft);
    }

    if ($("timerBox")) {
      $("timerBox").classList.toggle(
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
    const correctAnswer = getCorrectAnswer(question);

    state.review.push({
      question: getQuestionText(question),
      selected: state.language === "rw"
        ? "Nta gisubizo"
        : "No answer",
      correct: correctAnswer,
      isCorrect: false,
      explanation: getExplanation(question)
    });

    $$("#optionsContainer .option-btn").forEach(button => {
      button.disabled = true;

      if (button.dataset.answer === correctAnswer) {
        button.classList.add("correct");
      }
    });

    if ($("answerFeedback")) {
      $("answerFeedback").textContent =
        state.language === "rw"
          ? "Igihe kirangiye!"
          : "Time is up!";

      $("answerFeedback").style.display = "block";
    }

    const explanationText = getExplanation(question);

    if ($("explanation") && explanationText) {
      $("explanation").textContent = explanationText;
      $("explanation").style.display = "block";
    }

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").style.display = "none";
    }

    if ($("nextQuestionBtn")) {
      $("nextQuestionBtn").textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira" : "Next Question");

      $("nextQuestionBtn").style.display = "block";
    }

    saveProgress();
  }

  // --------------------------------------------------
  // NEXT QUESTION
  // --------------------------------------------------

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

  // --------------------------------------------------
  // RESULTS
  // --------------------------------------------------

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

    if ($("resultTitle")) {
      $("resultTitle").textContent = passed
        ? (state.language === "rw" ? "Watsinze!" : "You Passed!")
        : (state.language === "rw" ? "Ongera ugerageze" : "Try Again");
    }

    if ($("resultMessage")) {
      $("resultMessage").textContent = passed
        ? (state.language === "rw"
            ? "Wujuje ibisabwa kugira ngo ukomeze."
            : "You passed this round. You can continue.")
        : (state.language === "rw"
            ? "Ukeneye nibura 70% kugira ngo ukomeze."
            : "You need at least 70% to unlock the next round.");
    }

    if ($("resultScore")) {
      $("resultScore").textContent = state.score;
    }

    if ($("resultPercent")) {
      $("resultPercent").textContent = percentage + "%";
    }

    if ($("resultStars")) {
      $("resultStars").textContent = passed ? "⭐⭐⭐" : "⭐";
    }

    if ($("resultNextBtn")) {
      $("resultNextBtn").style.display =
        passed && state.round < getTotalRounds()
          ? "block"
          : "none";
    }

    if ($("retryBtn")) {
      $("retryBtn").style.display = passed ? "none" : "block";
    }

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

    updateHome();
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

  // --------------------------------------------------
  // REVIEW ANSWERS
  // --------------------------------------------------

  function showReview() {
    const reviewData = state.review.length
      ? state.review
      : readJSON(CONFIG.STORAGE.review, []);

    const container = $("reviewContainer");

    if (!container) {
      showScreen("reviewScreen");
      return;
    }

    container.innerHTML = "";

    if (!reviewData.length) {
      container.textContent =
        state.language === "rw"
          ? "Nta bisubizo byo gusubiramo biraboneka."
          : "There are no answers to review yet.";

      showScreen("reviewScreen");
      return;
    }

    reviewData.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "review-item";

      const status = item.isCorrect
        ? (state.language === "rw" ? "Ni byo" : "Correct")
        : (state.language === "rw" ? "Si byo" : "Incorrect");

      card.innerHTML = `
        <h3>${index + 1}. ${escapeHTML(item.question)}</h3>
        <p><strong>${state.language === "rw" ? "Igisubizo wahisemo:" : "Your answer:"}</strong>
        ${escapeHTML(item.selected)}</p>
        <p><strong>${state.language === "rw" ? "Igisubizo nyacyo:" : "Correct answer:"}</strong>
        ${escapeHTML(item.correct)}</p>
        <p class="review-status">${status}</p>
        ${item.explanation
          ? `<p>${escapeHTML(item.explanation)}</p>`
          : ""}
      `;

      container.appendChild(card);
    });

    showScreen("reviewScreen");

    document.dispatchEvent(new CustomEvent(
      "quizmaster:review-data",
      { detail: reviewData }
    ));
  }

  // --------------------------------------------------
  // ROUNDS
  // --------------------------------------------------

  function showRounds() {
    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bibanze bifunguke."
          : "Please wait for questions to load."
      );
      return;
    }

    const total = getTotalRounds();
    const completed = getCompletedRounds();

    const unlocked = Math.min(
      total,
      completed.length + 1
    );

    if ($("roundsCompleted")) {
      $("roundsCompleted").textContent = completed.length;
    }

    if ($("roundsTotal")) {
      $("roundsTotal").textContent = total;
    }

    if ($("roundsUnlocked")) {
      $("roundsUnlocked").textContent = unlocked;
    }

    if ($("roundsDescription")) {
      $("roundsDescription").textContent =
        state.language === "rw"
          ? "Ugomba gutsinda nibura 70% kugira ngo ukomeze."
          : "You need at least 70% to unlock the next round.";
    }

    const list = $("roundList");

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
              ? (state.language === "rw" ? "Byarangiye ✓" : "Completed ✓")
              : isUnlocked
                ? (state.language === "rw" ? "Kina" : "Play")
                : (state.language === "rw" ? "Birafunze 🔒" : "Locked 🔒")}
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

  // --------------------------------------------------
  // HOME
  // --------------------------------------------------

  function updateHome() {
    if ($("homeRound")) {
      $("homeRound").textContent = getNextRound();
    }

    if ($("homeScore")) {
      $("homeScore").textContent =
        localStorage.getItem(CONFIG.STORAGE.best) || "0";
    }

    if ($("homeStars")) {
      $("homeStars").textContent = "⭐".repeat(
        Math.min(5, getCompletedRounds().length)
      ) || "⭐";
    }

    const saved = getProgress();

    const canContinue = Boolean(
      saved &&
      saved.questionIds &&
      saved.questionIds.length
    );

    if ($("continueBtn")) {
      $("continueBtn").style.display =
        canContinue ? "block" : "none";
    }

    const review = readJSON(CONFIG.STORAGE.review, []);

    if ($("reviewAnswersBtn")) {
      $("reviewAnswersBtn").style.display =
        review.length ? "block" : "none";
    }
  }

  // --------------------------------------------------
  // CONTINUE SAVED GAME
  // --------------------------------------------------

  function continueQuiz() {
    if (!state.loaded) {
      showMessage(
        state.language === "rw"
          ? "Tegereza ibibazo bibanze bifunguke."
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

    const questionMap = new Map(
      state.questions.map(q => [String(q.id), q])
    );

    const restored = saved.questionIds
      .map(id => questionMap.get(String(id)))
      .filter(Boolean);

    if (!restored.length) {
      clearProgress();
      openSetup();
      return;
    }

    state.round = Number(saved.round) || 1;
    state.roundQuestions = restored;
    state.currentIndex = Math.min(
      Number(saved.currentIndex) || 0,
      restored.length - 1
    );

    state.score = Number(saved.score) || 0;
    state.correct = Number(saved.correct) || 0;
    state.answered = Number(saved.answered) || 0;

    state.review = Array.isArray(saved.review)
      ? saved.review
      : [];

    state.timeLeft = Number.isFinite(Number(saved.timeLeft))
      ? Number(saved.timeLeft)
      : getQuestionTime();

    state.selectedAnswer = saved.selectedAnswer ?? null;
    state.answerSubmitted = Boolean(saved.answerSubmitted);

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    syncSetupButtons();

    // If the previous question was already answered,
    // continue with the next unanswered question.
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

    startCurrentRound();
  }

  // --------------------------------------------------
  // SETTINGS
  // --------------------------------------------------

  function openSettings() {
    if (
      $("quizScreen") &&
      $("quizScreen").style.display !== "none"
    ) {
      saveProgress();
    }

    stopTimer();

    if ($("settingsLanguage")) {
      $("settingsLanguage").value = state.language;
    }

    if ($("settingsMode")) {
      $("settingsMode").value = state.mode;
    }

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

    localStorage.setItem(CONFIG.STORAGE.language, language);
    localStorage.setItem(CONFIG.STORAGE.mode, mode);

    if (changed) {
      clearProgress();
    }

    syncSetupButtons();
    updateHome();

    if ($("settingsMessage")) {
      $("settingsMessage").textContent =
        language === "rw"
          ? "Ibyahinduwe byabitswe neza."
          : "Settings saved successfully.";
    }

    showScreen("homeScreen");
  }

  function resetProgress() {
    const message =
      state.language === "rw"
        ? "Urashaka gusiba amanota n'iterambere byawe?"
        : "Are you sure you want to reset your progress?";

    if (!window.confirm(message)) return;

    [
      CONFIG.STORAGE.used,
      CONFIG.STORAGE.completed,
      CONFIG.STORAGE.review,
      CONFIG.STORAGE.best,
      CONFIG.STORAGE.total,
      CONFIG.STORAGE.progress
    ].forEach(key => localStorage.removeItem(key));

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

    updateHome();

    if ($("settingsMessage")) {
      $("settingsMessage").textContent =
        state.language === "rw"
          ? "Iterambere ryasubijwe ku ntangiriro."
          : "Progress has been reset.";
    }
  }

  // --------------------------------------------------
  // MUSIC SETTING
  // --------------------------------------------------

  function setMusic(enabled) {
    state.music = Boolean(enabled);

    localStorage.setItem(
      CONFIG.STORAGE.music,
      state.music ? "true" : "false"
    );

    const label = state.music ? "Music: ON" : "Music: OFF";

    if ($("musicToggleBtn")) {
      $("musicToggleBtn").textContent = label;
    }

    if ($("settingsMusicBtn")) {
      $("settingsMusicBtn").textContent = label;
    }

    document.dispatchEvent(new CustomEvent(
      "quizmaster:music-changed",
      { detail: { enabled: state.music } }
    ));
  }

  // --------------------------------------------------
  // SHARE
  // --------------------------------------------------

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
        console.error("Share failed:", copyError);
      }
    }
  }

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

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
  }

  // --------------------------------------------------
  // EVENT BINDING
  // --------------------------------------------------

  function on(id, event, callback) {
    const element = $(id);
    if (element) element.addEventListener(event, callback);
  }

  function bindEvents() {

    // Compatibility only: the new index does not need startBtn.
    on("startBtn", "click", openSetup);

    // Main setup button.
    on("confirmSetupBtn", "click", confirmSetup);

    // Language selection.
    $$(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectLanguage(button.dataset.language);
      });
    });

    // Category selection.
    $$(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
      });
    });

    // Home navigation.
    on("continueBtn", "click", continueQuiz);
    on("roundsBtn", "click", showRounds);
    on("settingsBtn", "click", openSettings);
    on("shareBtn", "click", shareApp);
    on("reviewAnswersBtn", "click", showReview);

    // Quiz.
    on("submitAnswerBtn", "click", submitAnswer);
    on("nextQuestionBtn", "click", nextQuestion);
    on("quizReviewBtn", "click", showReview);
    on("quizHomeBtn", "click", goHome);

    // Results.
    on("resultNextBtn", "click", nextRound);
    on("retryBtn", "click", retryRound);
    on("resultReviewBtn", "click", showReview);
    on("resultHomeBtn", "click", goHome);

    // Other screens.
    on("reviewHomeBtn", "click", goHome);
    on("roundsHomeBtn", "click", goHome);
    on("settingsHomeBtn", "click", goHome);

    // Settings.
    on("saveSettingsBtn", "click", saveSettings);
    on("resetProgressBtn", "click", resetProgress);

    // Music.
    on("musicToggleBtn", "click", () => {
      setMusic(!state.music);
    });

    on("settingsMusicBtn", "click", () => {
      setMusic(!state.music);
    });

    // Keyboard support.
    document.addEventListener("keydown", event => {
      if (
        event.key !== "Enter" ||
        !$("quizScreen") ||
        $("quizScreen").style.display === "none"
      ) return;

      if (state.answerSubmitted) {
        nextQuestion();
      } else if (state.selectedAnswer !== null) {
        submitAnswer();
      }
    });
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  async function init() {
    bindEvents();

    syncSetupButtons();
    setMusic(state.music);

    // Open directly on the home screen with setup visible.
    showScreen("homeScreen");

    const setup = $("gameSetup");
    if (setup) setup.style.display = "block";

    updateHome();

    await loadQuestions();

    updateHome();

    document.dispatchEvent(new CustomEvent(
      "quizmaster:show-screen",
      { detail: { screen: "homeScreen" } }
    ));
  }

  // --------------------------------------------------
  // PUBLIC FUNCTIONS
  // --------------------------------------------------

  window.QuizMaster = {
    start: openSetup,
    confirmSetup,
    continueQuiz,
    showRounds,
    showReview,
    openSettings,
    saveSettings,
    resetProgress,
    goHome,
    loadQuestions
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
