
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

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const state = {
    questions: [],
    loaded: false,
    language: localStorage.getItem(CONFIG.STORAGE.language) || "en",
    mode: localStorage.getItem(CONFIG.STORAGE.mode) || "general",
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
      console.warn("Storage read error:", key, error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Storage write error:", key, error);
    }
  }

  function getUsedData() {
    const value = readJSON(CONFIG.STORAGE.used, {});
    return Array.isArray(value) ? { traffic: value, general: [] } : value;
  }

  function getUsedIds() {
    const data = getUsedData();
    return Array.isArray(data[state.mode]) ? data[state.mode] : [];
  }

  function saveUsedIds(ids) {
    const data = getUsedData();
    data[state.mode] = ids;
    writeJSON(CONFIG.STORAGE.used, data);
  }

  function getCompletedData() {
    const value = readJSON(CONFIG.STORAGE.completed, {});
    return Array.isArray(value) ? { traffic: value, general: [] } : value;
  }

  function getCompletedRounds() {
    const data = getCompletedData();
    return Array.isArray(data[state.mode]) ? data[state.mode] : [];
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

    const progress = {
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
      savedAt: Date.now()
    };

    writeJSON(CONFIG.STORAGE.progress, progress);
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
        element.style.display = id === screenId ? "block" : "none";
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
    if (state.language === "rw" && question.question_rw) {
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

    return Array.isArray(question.options) ? question.options : [];
  }

  function getCorrectAnswer(question) {
    if (state.language === "rw" && question.answer_rw) {
      return question.answer_rw;
    }

    return question.answer;
  }

  function getExplanation(question) {
    if (state.language === "rw" && question.explanation_rw) {
      return question.explanation_rw;
    }

    return question.explanation || question.explanation_rw || "";
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
  // QUESTION VALIDATION AND LOADING
  // --------------------------------------------------

  function validQuestion(question) {
    if (!question || typeof question !== "object") return false;

    if (!["traffic", "general"].includes(question.category)) {
      return false;
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return false;
    }

    if (!question.answer || !question.question) {
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
        throw new Error(
          "Could not load questions.json. HTTP " + response.status
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain a JSON array.");
      }

      const valid = data.filter(validQuestion);

      state.questions = valid;
      state.loaded = true;

      const trafficCount = valid.filter(q => q.category === "traffic").length;
      const generalCount = valid.filter(q => q.category === "general").length;

      console.log("Quiz Master questions loaded:", {
        total: valid.length,
        traffic: trafficCount,
        general: generalCount,
        rejected: data.length - valid.length
      });

      if (valid.length === 0) {
        throw new Error(
          "No valid questions found. Check category, answer and options in questions.json."
        );
      }

      hideMessage();
      updateHome();

      document.dispatchEvent(new CustomEvent(
        "quizmaster:questions-loaded",
        {
          detail: {
            total: valid.length,
            traffic: trafficCount,
            general: generalCount
          }
        }
      ));

      return true;

    } catch (error) {
      console.error("Quiz Master loading error:", error);
      state.loaded = false;

      showMessage(
        state.language === "rw"
          ? "Ibibazo ntibyafungutse. Reba niba questions.json iriho kandi itarimo amakosa."
          : "Questions could not load. Check questions.json and try again.",
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
    return state.questions.filter(q => q.category === state.mode);
  }

  // --------------------------------------------------
  // ROUND MANAGEMENT - NO REPEATS UNTIL CYCLE ENDS
  // --------------------------------------------------

  function getTotalRounds() {
    const total = getModeQuestions().length;
    return Math.ceil(total / CONFIG.QUESTIONS_PER_ROUND);
  }

  function getNextRound() {
    const completed = getCompletedRounds();
    const totalRounds = getTotalRounds();

    for (let round = 1; round <= totalRounds; round++) {
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
          : "Complete the earlier rounds first.",
        "error"
      );
      return false;
    }

    const used = new Set(getUsedIds());
    let available = pool.filter(q => !used.has(String(q.id)));

    // Only reset the cycle when every question in this category has been used.
    if (available.length === 0) {
      saveUsedIds([]);
      available = [...pool];
    }

    const selected = shuffle(available).slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    if (!selected.length) return false;

    // Record selected questions immediately to prevent repeats in later rounds.
    const updatedUsed = [
      ...getUsedIds(),
      ...selected.map(q => String(q.id))
    ];

    saveUsedIds([...new Set(updatedUsed)]);

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
  // SETUP
  // --------------------------------------------------

  function selectLanguage(language) {
    if (!["rw", "en"].includes(language)) return;

    state.language = language;

    $$(".language-btn").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.language === language
      );
      button.setAttribute(
        "aria-pressed",
        button.dataset.language === language ? "true" : "false"
      );
    });

    updateSelectionSummary();
  }

  function selectMode(mode) {
    if (!["traffic", "general"].includes(mode)) return;

    state.mode = mode;

    $$(".mode-btn").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.mode === mode
      );
      button.setAttribute(
        "aria-pressed",
        button.dataset.mode === mode ? "true" : "false"
      );
    });

    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const summary = $("selectionSummary");
    if (!summary) return;

    summary.textContent =
      (state.language === "rw" ? "Ururimi: Ikinyarwanda" : "Language: English") +
      " • " +
      getCategoryName();

    const confirm = $("confirmSetupBtn");
    if (confirm) confirm.disabled = false;
  }

  function openSetup() {
    const setup = $("gameSetup");
    if (setup) setup.style.display = "block";

    hideMessage();
    updateSelectionSummary();
  }

  function confirmSetup() {
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

    const next = getNextRound();

    if (!prepareRound(next)) return;

    const setup = $("gameSetup");
    if (setup) setup.style.display = "none";

    startCurrentRound();
  }

  // --------------------------------------------------
  // QUIZ START AND DISPLAY
  // --------------------------------------------------

  function startCurrentRound() {
    if (!state.roundQuestions.length) return;

    showScreen("quizScreen");

    const round = $("currentRound");
    if (round) round.textContent = state.round;

    const category = $("categoryIndicator");
    if (category) category.textContent = getCategoryName();

    renderQuestion();
    startTimer();

    document.dispatchEvent(new CustomEvent(
      "quizmaster:game-started",
      { detail: { round: state.round, mode: state.mode } }
    ));
  }

  function renderQuestion() {
    const question = state.roundQuestions[state.currentIndex];
    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answerSubmitted = false;
    state.timeLeft = getQuestionTime();

    const number = $("currentQuestionNumber");
    if (number) {
      number.textContent =
        (state.currentIndex + 1) + "/" + state.roundQuestions.length;
    }

    const questionText = $("questionText");
    if (questionText) {
      questionText.textContent = getQuestionText(question);
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

    const optionsContainer = $("optionsContainer");

    if (optionsContainer) {
      optionsContainer.innerHTML = "";

      const options = shuffle(getOptions(question));

      options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-btn";
        button.dataset.answer = option;

        const letter = String.fromCharCode(65 + index);
        button.innerHTML =
          "<span class='option-letter'>" + letter + "</span>" +
          "<span class='option-text'>" + escapeHTML(option) + "</span>";

        button.addEventListener("click", () => selectAnswer(option, button));
        optionsContainer.appendChild(button);
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
      submit.style.display = "inline-block";
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
  }

  // --------------------------------------------------
  // ANSWER CHECKING
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
        ? (state.language === "rw" ? "Ni byo! +10 amanota" : "Correct! +10 points")
        : (state.language === "rw" ? "Si byo. Gerageza ubutaha." : "Incorrect. Try again next time.");

      feedback.style.display = "block";
    }

    const explanation = $("explanation");
    const explanationText = getExplanation(question);

    if (explanation && explanationText) {
      explanation.textContent = explanationText;
      explanation.style.display = "block";
    }

    const submit = $("submitAnswerBtn");
    if (submit) submit.style.display = "none";

    const next = $("nextQuestionBtn");
    if (next) {
      next.textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira" : "Next Question");

      next.style.display = "inline-block";
    }

    updateScoreDisplay();
    saveProgress();
  }

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  function startTimer() {
    stopTimer();

    state.timeLeft = getQuestionTime();
    updateTimerDisplay();

    state.timerId = setInterval(() => {
      if (state.paused || state.answerSubmitted) return;

      state.timeLeft--;
      updateTimerDisplay();

      if (state.timeLeft <= 0) {
        stopTimer();
        timeExpired();
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
    const timer = $("timer");
    if (timer) timer.textContent = Math.max(0, state.timeLeft);

    const timerBox = $("timerBox");
    if (timerBox) {
      timerBox.classList.toggle("warning", state.timeLeft <= 10);
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
      selected: state.language === "rw" ? "Nta gisubizo" : "No answer",
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

    const feedback = $("answerFeedback");
    if (feedback) {
      feedback.textContent =
        state.language === "rw" ? "Igihe kirangiye!" : "Time is up!";
      feedback.style.display = "block";
    }

    const explanation = $("explanation");
    const explanationText = getExplanation(question);

    if (explanation && explanationText) {
      explanation.textContent = explanationText;
      explanation.style.display = "block";
    }

    const submit = $("submitAnswerBtn");
    if (submit) submit.style.display = "none";

    const next = $("nextQuestionBtn");
    if (next) {
      next.textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? (state.language === "rw" ? "Reba amanota" : "See Results")
          : (state.language === "rw" ? "Ikibazo gikurikira" : "Next Question");
      next.style.display = "inline-block";
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
      return;
    }

    finishRound();
  }

  // --------------------------------------------------
  // ROUND RESULTS
  // --------------------------------------------------

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;
    const percentage = total
      ? Math.round((state.correct / total) * 100)
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

    const best = Number(localStorage.getItem(CONFIG.STORAGE.best) || 0);
    if (state.score > best) {
      localStorage.setItem(CONFIG.STORAGE.best, String(state.score));
    }

    const totalScore =
      Number(localStorage.getItem(CONFIG.STORAGE.total) || 0) + state.score;

    localStorage.setItem(CONFIG.STORAGE.total, String(totalScore));

    writeJSON(CONFIG.STORAGE.review, state.review);
    clearProgress();

    const title = $("resultTitle");
    if (title) {
      title.textContent = passed
        ? (state.language === "rw" ? "Watsinze!" : "You Passed!")
        : (state.language === "rw" ? "Ongera ugerageze" : "Try Again");
    }

    const message = $("resultMessage");
    if (message) {
      message.textContent = passed
        ? (state.language === "rw"
            ? "Wujuje ibisabwa kugira ngo ukomeze."
            : "You passed this round. You can continue.")
        : (state.language === "rw"
            ? "Ukeneye nibura 70% kugira ngo ukomeze."
            : "You need at least 70% to unlock the next round.");
    }

    if ($("resultScore")) $("resultScore").textContent = state.score;
    if ($("resultPercent")) $("resultPercent").textContent = percentage + "%";
    if ($("resultStars")) {
      $("resultStars").textContent = passed ? "⭐⭐⭐" : "⭐";
    }

    const nextRoundButton = $("resultNextBtn");
    if (nextRoundButton) {
      nextRoundButton.style.display =
        passed && state.round < getTotalRounds() ? "inline-block" : "none";
    }

    const retryButton = $("retryBtn");
    if (retryButton) {
      retryButton.style.display = passed ? "none" : "inline-block";
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
      showScreen("homeScreen");
      updateHome();
      return;
    }

    if (!isRoundUnlocked(next)) {
      return;
    }

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
  // ROUNDS SCREEN
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
    const unlocked = completed.length + 1 > total
      ? total
      : completed.length + 1;

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
          ? "Hitamo round yemerewe gukinwa. Ugomba gutsinda nibura 70% kugira ngo ukomeze."
          : "Choose an unlocked round. You need at least 70% to continue.";
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
          <span class="round-number">
            ${state.language === "rw" ? "Round" : "Round"} ${round}
          </span>
          <span class="round-status">
            ${isCompleted
              ? (state.language === "rw" ? "Byarangiye ✓" : "Completed ✓")
              : isUnlocked
                ? (state.language === "rw" ? "Kina" : "Play")
                : (state.language === "rw" ? "Birafunze 🔒" : "Locked 🔒")}
          </span>
        `;

        button.addEventListener("click", () => {
          if (!isUnlocked) return;

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
  // HOME SCREEN
  // --------------------------------------------------

  function updateHome() {
    const completed = getCompletedRounds();

    if ($("homeRound")) {
      $("homeRound").textContent = getNextRound();
    }

    if ($("homeScore")) {
      $("homeScore").textContent =
        localStorage.getItem(CONFIG.STORAGE.best) || "0";
    }

    if ($("homeStars")) {
      $("homeStars").textContent = "⭐".repeat(
        Math.min(5, completed.length)
      );
    }

    const saved = getProgress();
    const continueButton = $("continueBtn");

    const canContinue =
      saved &&
      saved.mode === state.mode &&
      saved.language === state.language &&
      Array.isArray(saved.questionIds) &&
      saved.questionIds.length > 0;

    if (continueButton) {
      continueButton.style.display = canContinue ? "inline-block" : "none";
    }

    const reviewButton = $("reviewAnswersBtn");
    if (reviewButton) {
      const review = readJSON(CONFIG.STORAGE.review, []);
      reviewButton.style.display = review.length ? "inline-block" : "none";
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
    state.review = Array.isArray(saved.review) ? saved.review : [];
    state.timeLeft = Number(saved.timeLeft) || getQuestionTime();
    state.selectedAnswer = null;
    state.answerSubmitted = false;

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    startCurrentRound();
  }

  // --------------------------------------------------
  // SETTINGS
  // --------------------------------------------------

  function openSettings() {
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
    const language = $("settingsLanguage")?.value || state.language;
    const mode = $("settingsMode")?.value || state.mode;

    if (!["rw", "en"].includes(language)) return;
    if (!["traffic", "general"].includes(mode)) return;

    const changed = language !== state.language || mode !== state.mode;

    state.language = language;
    state.mode = mode;

    localStorage.setItem(CONFIG.STORAGE.language, language);
    localStorage.setItem(CONFIG.STORAGE.mode, mode);

    const message = $("settingsMessage");

    if (message) {
      message.textContent =
        state.language === "rw"
          ? "Ibyahinduwe byabitswe neza."
          : "Settings saved successfully.";
    }

    if (changed) {
      clearProgress();
    }

    updateHome();
    showScreen("homeScreen");
  }

  function resetProgress() {
    const confirmText =
      state.language === "rw"
        ? "Urashaka gusiba amanota n'iterambere byawe?"
        : "Are you sure you want to reset your progress?";

    if (!window.confirm(confirmText)) return;

    [
      CONFIG.STORAGE.used,
      CONFIG.STORAGE.completed,
      CONFIG.STORAGE.review,
      CONFIG.STORAGE.best,
      CONFIG.STORAGE.total,
      CONFIG.STORAGE.progress
    ].forEach(key => localStorage.removeItem(key));

    state.roundQuestions = [];
    state.review = [];
    state.round = 1;
    state.score = 0;
    state.correct = 0;
    state.answered = 0;

    updateHome();

    const message = $("settingsMessage");
    if (message) {
      message.textContent =
        state.language === "rw"
          ? "Iterambere ryasubijwe ku ntangiriro."
          : "Progress has been reset.";
    }
  }

  // --------------------------------------------------
  // MUSIC
  // --------------------------------------------------

  function setMusic(enabled) {
    state.music = Boolean(enabled);

    localStorage.setItem(
      CONFIG.STORAGE.music,
      state.music ? "true" : "false"
    );

    const musicButton = $("musicToggleBtn");
    const settingsMusic = $("settingsMusicBtn");

    if (musicButton) {
      musicButton.textContent = state.music ? "Music: ON" : "Music: OFF";
    }

    if (settingsMusic) {
      settingsMusic.textContent = state.music ? "Music: ON" : "Music: OFF";
    }

    // This setting is saved for the app's existing music controls.
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
      } else {
        await navigator.clipboard.writeText(
          "Test your knowledge with Quiz Master! " + window.location.href
        );
        window.alert("✅ Link Copied!");
      }
    } catch (error) {
      if (error.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(
          "Test your knowledge with Quiz Master! " + window.location.href
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
    stopTimer();
    state.paused = false;
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
    // Start opens the setup choices.
    on("startBtn", "click", openSetup);

    // Confirm setup starts the quiz.
    on("confirmSetupBtn", "click", confirmSetup);

    // Language and category selection.
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

    // Main navigation.
    on("continueBtn", "click", continueQuiz);
    on("roundsBtn", "click", showRounds);
    on("settingsBtn", "click", openSettings);
    on("shareBtn", "click", shareApp);
    on("reviewAnswersBtn", "click", showReview);

    // Quiz controls.
    on("submitAnswerBtn", "click", submitAnswer);
    on("nextQuestionBtn", "click", nextQuestion);
    on("quizReviewBtn", "click", showReview);
    on("quizHomeBtn", "click", goHome);

    // Result controls.
    on("resultNextBtn", "click", nextRound);
    on("retryBtn", "click", retryRound);
    on("resultReviewBtn", "click", showReview);
    on("resultHomeBtn", "click", goHome);

    // Review, rounds and settings navigation.
    on("reviewHomeBtn", "click", goHome);
    on("roundsHomeBtn", "click", goHome);
    on("settingsHomeBtn", "click", goHome);

    on("saveSettingsBtn", "click", saveSettings);
    on("resetProgressBtn", "click", resetProgress);

    // Music controls.
    on("musicToggleBtn", "click", () => setMusic(!state.music));
    on("settingsMusicBtn", "click", () => setMusic(!state.music));

    // Allow Enter to submit an answer when an option is selected.
    document.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        $("quizScreen") &&
        $("quizScreen").style.display !== "none"
      ) {
        if (state.answerSubmitted) {
          nextQuestion();
        } else if (state.selectedAnswer !== null) {
          submitAnswer();
        }
      }
    });
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  async function init() {
    bindEvents();

    // Restore saved setup choices.
    selectLanguage(state.language);
    selectMode(state.mode);
    setMusic(state.music);

    showScreen("homeScreen");
    updateHome();

    await loadQuestions();

    // Refresh the home screen after questions load.
    updateHome();

    document.dispatchEvent(new CustomEvent(
      "quizmaster:show-screen",
      { detail: { screen: "homeScreen" } }
    ));
  }

  // Expose useful functions for compatibility with existing HTML.
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

  document.addEventListener("DOMContentLoaded", init);
})();
