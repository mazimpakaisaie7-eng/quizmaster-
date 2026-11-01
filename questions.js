(() => {
  "use strict";

  /* ==========================================
     QUIZ MASTER 🇷🇼
     COMPLETE QUIZ ENGINE
     Compatible with supplied index.html
  ========================================== */

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

  const $ = id => document.getElementById(id);

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
    round: 1,
    review: [],
    loading: false
  };

  const EVENTS = {
    screen: "quizmaster:show-screen",
    loaded: "quizmaster:questions-loaded",
    error: "quizmaster:error",
    started: "quizmaster:game-started",
    review: "quizmaster:review-data",
    finished: "quizmaster:round-finished"
  };

  /* ==========================================
     HELPERS
  ========================================== */

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Storage error:", error);
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
      .replace(/\s+/g, " ");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
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
    if ($("homeMessage")) {
      $("homeMessage").textContent = message;
    }
  }

  function showSetupError(message) {
    const element = $("setupError");

    if (element) {
      element.textContent = message;
      element.dataset.type = "error";
    }
  }

  function clearSetupError() {
    if ($("setupError")) {
      $("setupError").textContent = "";
      $("setupError").dataset.type = "";
    }
  }

  /* ==========================================
     STORAGE
  ========================================== */

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
      score: state.score,
      correct: state.correct,
      review: state.review
    });
  }

  function getSession() {
    const session = read(CONFIG.STORAGE.session, null);

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

  /* ==========================================
     QUESTION LOADING
  ========================================== */

  function extractQuestions(data) {
    if (Array.isArray(data)) return data;

    if (!data || typeof data !== "object") {
      return [];
    }

    for (const key of [
      "questions",
      "data",
      "items"
    ]) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    const result = [];

    function walk(value) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === "object") {
            if (
              item.question ||
              item.question_en ||
              item.question_rw ||
              item.text
            ) {
              result.push(item);
            } else {
              walk(item);
            }
          }
        });
      } else if (
        value &&
        typeof value === "object"
      ) {
        Object.values(value).forEach(walk);
      }
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

      if (value !== undefined && value !== null) {
        if (typeof value === "object" && !Array.isArray(value)) {
          return value[suffix] ?? value.en ?? value.rw ?? "";
        }

        return value;
      }
    }

    return "";
  }

  function matchesMode(question) {
    const category = normalize(
      question.category ??
      question.mode ??
      question.type ??
      question.topic ??
      ""
    );

    if (!category) return true;

    if (state.mode === "traffic") {
      return [
        "traffic",
        "road",
        "road safety",
        "road_safety",
        "amategeko y'umuhanda"
      ].includes(category);
    }

    return [
      "general",
      "general knowledge",
      "ubumenyi rusange",
      "knowledge"
    ].includes(category);
  }

  function normalizeQuestion(question, index) {
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

    if (!Array.isArray(options)) return null;

    options = options.map(option => {
      if (option && typeof option === "object") {
        return String(
          option[state.language] ??
          option.text ??
          option.value ??
          ""
        );
      }

      return String(option);
    });

    options = options.filter(option => option.trim());

    if (!text || options.length < 2) return null;

    const answer =
      question.answer ??
      question.correctAnswer ??
      question.correct_answer ??
      question.correct ??
      question.answerIndex ??
      question.correctIndex;

    let correctIndex = -1;

    if (typeof answer === "number") {
      correctIndex = answer;
    } else if (
      typeof answer === "string" &&
      /^\d+$/.test(answer.trim())
    ) {
      correctIndex = Number(answer);
    } else {
      correctIndex = options.findIndex(
        option => normalize(option) === normalize(answer)
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
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `questions.json returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      state.questions = extractQuestions(data);

      if (!state.questions.length) {
        throw new Error("No questions found.");
      }

      emit(EVENTS.loaded, {
        total: state.questions.length
      });

      showMessage("Questions loaded successfully.");

    } catch (error) {
      console.error(error);

      showSetupError(
        "Questions failed to load. Check questions.json."
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

      const normalized = normalizeQuestion(question, index);

      if (!normalized || ids.has(normalized.id)) return;

      ids.add(normalized.id);
      pool.push(normalized);
    });

    return pool;
  }

  /* ==========================================
     NAVIGATION
  ========================================== */

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const screen = $(id);

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

    emit(EVENTS.screen, { screen: id });
  }

  /* ==========================================
     HOME AND SETUP
  ========================================== */

  function updateSelection() {
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

    if ($("selectionSummary")) {
      const language =
        state.language === "rw"
          ? "Ikinyarwanda"
          : "English";

      const category =
        state.mode === "traffic"
          ? "Road Safety"
          : "General Knowledge";

      $("selectionSummary").textContent =
        `${language} • ${category}`;
    }

    if ($("confirmSetupBtn")) {
      $("confirmSetupBtn").disabled = false;
    }

    if ($("startBtn")) {
      $("startBtn").disabled =
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

    showMessage("Selection confirmed. Start your quiz!");
  }

  function restoreSettings() {
    const settings = read(
      CONFIG.STORAGE.settings,
      {}
    );

    if (["en", "rw"].includes(settings.language)) {
      state.language = settings.language;
    }

    if (["traffic", "general"].includes(settings.mode)) {
      state.mode = settings.mode;
    }

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

    if ($("homeRound")) {
      $("homeRound").textContent = getUnlockedRound();
    }

    if ($("homeScore")) {
      $("homeScore").textContent = best;
    }

    if ($("homeStars")) {
      $("homeStars").textContent =
        completed.length
          ? "⭐".repeat(Math.min(completed.length, 5))
          : "⭐";
    }

    if ($("reviewAnswersBtn")) {
      const review = read(CONFIG.STORAGE.review, []);
      $("reviewAnswersBtn").hidden = !review.length;
    }

    const session = getSession();

    if ($("continueBtn")) {
      $("continueBtn").hidden = !session;
    }
  }

  /* ==========================================
     ROUND MANAGEMENT
  ========================================== */

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] =
        [result[j], result[i]];
    }

    return result;
  }

  function prepareRound(round, retry = false) {
    state.pool = buildPool();

    if (state.pool.length < CONFIG.QUESTIONS_PER_ROUND) {
      showSetupError(
        `Only ${state.pool.length} valid questions found. At least 10 are required.`
      );
      return false;
    }

    const completed = getCompleted();

    if (
      !retry &&
      round > getUnlockedRound()
    ) {
      showSetupError("Complete the previous round first.");
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

      if (available.length < CONFIG.QUESTIONS_PER_ROUND) {
        saveUsed([]);
        available = [...state.pool];
      }

      state.roundQuestions = shuffle(available)
        .slice(0, CONFIG.QUESTIONS_PER_ROUND);
    }

    if (state.roundQuestions.length !== 10) {
      showSetupError("Could not prepare the round.");
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

    saveSession();

    return true;
  }

  function startQuiz() {
    if (!state.confirmed) {
      showSetupError("Confirm your language and category first.");
      return;
    }

    if (!prepareRound(getUnlockedRound())) return;

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
      showMessage("No saved quiz is available.");
      updateHome();
      return;
    }

    state.round = session.round;
    state.roundQuestions = session.questions;
    state.currentIndex = Math.min(
      session.currentIndex || 0,
      session.questions.length - 1
    );
    state.score = session.score || 0;
    state.correct = session.correct || 0;
    state.review = session.review || [];
    state.answered = false;
    state.finished = false;

    showScreen("quizScreen");
    renderQuestion();
  }

  function retryRound() {
    if (!prepareRound(state.round, true)) {
      // If no saved session exists, recreate the round.
      if (!prepareRound(state.round)) return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  /* ==========================================
     QUESTION DISPLAY
  ========================================== */

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

    if ($("roundLabel")) {
      $("roundLabel").textContent = state.round;
    }

    if ($("questionCounter")) {
      $("questionCounter").textContent =
        `${state.currentIndex + 1}/10`;
    }

    if ($("scoreNumber")) {
      $("scoreNumber").textContent = state.score;
    }

    if ($("categoryIndicator")) {
      $("categoryIndicator").textContent =
        state.mode === "traffic"
          ? "🚦 Road Safety"
          : "🌍 General Knowledge";
    }

    if ($("questionText")) {
      $("questionText").textContent = question.question;
    }

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

      question.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";

        button.innerHTML = `
          <span class="option-letter">
            ${String.fromCharCode(65 + index)}
          </span>
          <span>${escapeHTML(option)}</span>
        `;

        button.addEventListener("click", () => {
          selectAnswer(index);
        });

        container.appendChild(button);
      });
    }

    if ($("answerFeedback")) {
      $("answerFeedback").textContent = "";
    }

    if ($("explanation")) {
      $("explanation").textContent = "";
    }

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").hidden = false;
      $("submitAnswerBtn").disabled = true;
    }

    if ($("nextQuestionBtn")) {
      $("nextQuestionBtn").hidden = true;
    }

    if ($("timer")) {
      $("timer").textContent = state.remainingTime;
    }

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
    ) return;

    state.selectedAnswer = index;

    document.querySelectorAll(
      "#optionsContainer .option-btn"
    ).forEach((button, buttonIndex) => {
      button.classList.toggle(
        "selected",
        buttonIndex === index
      );
    });

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = false;
    }
  }

  /* ==========================================
     TIMER
  ========================================== */

  function stopTimer() {
    if (state.timerInterval !== null) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    if ($("timerBox")) {
      $("timerBox").classList.remove("warning");
    }
  }

  function startTimer() {
    stopTimer();

    state.timerInterval = setInterval(() => {
      if (state.answered) return;

      state.remainingTime--;

      if ($("timer")) {
        $("timer").textContent =
          Math.max(0, state.remainingTime);
      }

      if ($("timerBox")) {
        $("timerBox").classList.toggle(
          "warning",
          state.remainingTime <= 10
        );
      }

      if (state.remainingTime <= 0) {
        submitAnswer(true);
      }
    }, 1000);
  }

  /* ==========================================
     ANSWERS
  ========================================== */

  function submitAnswer(timedOut = false) {
    if (state.answered) return;

    if (
      state.selectedAnswer === null &&
      !timedOut
    ) return;

    state.answered = true;
    stopTimer();

    const question =
      state.roundQuestions[state.currentIndex];

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
      "#optionsContainer .option-btn"
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

    if ($("answerFeedback")) {
      $("answerFeedback").textContent = timedOut
        ? "⏰ Time is up!"
        : correct
          ? "✅ Correct answer!"
          : "❌ Incorrect answer.";

      $("answerFeedback").style.color =
        correct ? "#20bd78" : "#ff7777";
    }

    if ($("explanation")) {
      $("explanation").textContent =
        question.explanation;
    }

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").hidden = true;
    }

    if ($("nextQuestionBtn")) {
      $("nextQuestionBtn").hidden = false;

      $("nextQuestionBtn").textContent =
        state.currentIndex === 9
          ? "View Results →"
          : "Next Question →";
    }

    if ($("scoreNumber")) {
      $("scoreNumber").textContent = state.score;
    }

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
      ) / 10 * 100
    );

    if ($("progressFill")) {
      $("progressFill").style.width =
        `${percentage}%`;
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

  /* ==========================================
     SCORE STATISTICS
  ========================================== */

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ));

    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);

    const start = new Date(
      Date.UTC(d.getUTCFullYear(), 0, 1)
    );

    return Math.ceil(
      (((d - start) / 86400000) + 1) / 7
    );
  }

  function updateStatistics() {
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
      (progress.totalScore || 0) + state.score;

    progress.bestScore = Math.max(
      progress.bestScore || 0,
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
      (weekly[weekKey] || 0) + state.score;

    write(CONFIG.STORAGE.weekly, weekly);
  }

  /* ==========================================
     FINISH ROUND
  ========================================== */

  function finishRound() {
    if (state.finished) return;

    state.finished = true;
    stopTimer();

    const percentage = Math.round(
      state.correct / 10 * 100
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
          ...state.roundQuestions.map(q => q.id)
        ])
      ]);
    }

    updateStatistics();

    write(CONFIG.STORAGE.review, state.review);

    // Keep failed round available for retry.
    // Remove the session only after a passed round.
    if (passed) {
      remove(CONFIG.STORAGE.session);
    } else {
      saveSession();
    }

    if ($("resultTitle")) {
      $("resultTitle").textContent = passed
        ? "Round Passed! 🎉"
        : "Round Not Passed";
    }

    if ($("resultMessage")) {
      $("resultMessage").textContent = passed
        ? "You achieved the required score to unlock the next round."
        : "You need at least 70% to unlock the next round. Try again!";
    }

    if ($("resultStars")) {
      const stars =
        percentage >= 90 ? 3 :
        percentage >= 80 ? 2 :
        percentage >= 70 ? 1 : 0;

      $("resultStars").textContent =
        stars ? "⭐".repeat(stars) : "🌱";
    }

    if ($("resultScore")) {
      $("resultScore").textContent = state.score;
    }

    if ($("resultPercent")) {
      $("resultPercent").textContent =
        `${percentage}%`;
    }

    if ($("resultCorrect")) {
      $("resultCorrect").textContent =
        `${state.correct}/10`;
    }

    if ($("resultPassMark")) {
      $("resultPassMark").textContent = "70%";
    }

    if ($("resultNextBtn")) {
      $("resultNextBtn").hidden = !passed;
    }

    if ($("retryBtn")) {
      $("retryBtn").hidden = passed;
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

  /* ==========================================
     REVIEW ANSWERS
  ========================================== */

  function renderReview() {
    const container = $("reviewContainer");

    if (!container) return;

    const reviews = state.review.length
      ? state.review
      : read(CONFIG.STORAGE.review, []);

    container.innerHTML = "";

    if (!reviews.length) {
      container.textContent =
        "No answers available to review yet.";
      return;
    }

    reviews.forEach((item, index) => {
      const element = document.createElement("div");

      element.className = "review-item";

      const selected =
        item.selectedAnswer ?? "No answer";

      element.innerHTML = `
        <h3>
          ${index + 1}. ${escapeHTML(item.question)}
        </h3>

        <p class="${
          item.correct ? "correct-text" : "wrong-text"
        }">
          Your answer: ${escapeHTML(selected)}
        </p>

        <p class="correct-text">
          Correct answer: ${escapeHTML(item.correctAnswer)}
        </p>

        ${
          item.explanation
            ? `<p>Explanation: ${escapeHTML(item.explanation)}</p>`
            : ""
        }
      `;

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

  /* ==========================================
     ROUNDS
  ========================================== */

  function renderRounds() {
    const container = $("roundList");

    if (!container) return;

    const completed = getCompleted();
    const unlocked = getUnlockedRound();

    const total = Math.floor(
      buildPool().length / 10
    );

    if ($("roundsCompleted")) {
      $("roundsCompleted").textContent =
        completed.length;
    }

    if ($("roundsTotal")) {
      $("roundsTotal").textContent = total;
    }

    if ($("roundsUnlocked")) {
      $("roundsUnlocked").textContent =
        Math.min(unlocked, total);
    }

    container.innerHTML = "";

    if (total === 0) {
      container.textContent =
        "Not enough questions available for this category.";
      return;
    }

    for (let round = 1; round <= total; round++) {
      const isCompleted = completed.includes(round);
      const isUnlocked = round <= unlocked;

      const button = document.createElement("button");

      button.type = "button";

      button.className =
        "round-card" +
        (isCompleted ? " completed" : "") +
        (!isUnlocked ? " locked" : "");

      button.disabled = !isUnlocked;

      button.innerHTML = `
        <span>
          <strong>Round ${round}</strong>
          <br>
          <span class="round-status">
            ${
              isCompleted
                ? "✓ Completed"
                : isUnlocked
                  ? "Available"
                  : "🔒 Locked"
            }
          </span>
        </span>
        <span>
          ${isCompleted ? "🏆" : isUnlocked ? "▶" : "🔒"}
        </span>
      `;

      button.addEventListener("click", () => {
        if (prepareRound(round)) {
          showScreen("quizScreen");
          renderQuestion();
        }
      });

      container.appendChild(button);
    }
  }

  /* ==========================================
     SETTINGS
  ========================================== */

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

    if ($("settingsMessage")) {
      $("settingsMessage").textContent =
        "Settings saved successfully.";
    }
  }

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

    updateHome();
    renderRounds();

    if ($("settingsMessage")) {
      $("settingsMessage").textContent =
        "Quiz progress has been reset.";
    }
  }

  /* ==========================================
     SHARE
  ========================================== */

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
        if (error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${data.text} ${data.url}`
      );

      window.alert("✅ Link Copied!");
    } catch (_) {
      window.prompt("Copy this link:", data.url);
    }
  }

  /* ==========================================
     EVENTS
  ========================================== */

  function bind(id, event, callback) {
    const element = $(id);

    if (element) {
      element.addEventListener(event, callback);
    }
  }

  function bindEvents() {
    document.querySelectorAll(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        const next = button.dataset.language;

        if (next !== state.language) {
          state.confirmed = false;
        }

        state.language = next;
        updateSelection();
      });
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        const next = button.dataset.mode;

        if (next !== state.mode) {
          state.confirmed = false;
        }

        state.mode = next;
        updateSelection();
      });
    });

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

    bind("reviewHomeBtn", "click", () => {
      updateHome();
      showScreen("homeScreen");
    });

    bind("quizHomeBtn", "click", () => {
      saveSession();
      updateHome();
      showScreen("homeScreen");
    });

    bind("resultHomeBtn", "click", () => {
      updateHome();
      showScreen("homeScreen");
    });

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

    bind("roundsHomeBtn", "click", () => {
      updateHome();
      showScreen("homeScreen");
    });

    bind("settingsBtn", "click", () => {
      if ($("settingsLanguage")) {
        $("settingsLanguage").value = state.language;
      }

      if ($("settingsMode")) {
        $("settingsMode").value = state.mode;
      }

      showScreen("settingsScreen");
    });

    bind("saveSettingsBtn", "click", saveSettings);

    bind("settingsHomeBtn", "click", () => {
      updateSelection();
      updateHome();
      showScreen("homeScreen");
    });

    bind("resetProgressBtn", "click", resetProgress);

    bind("shareBtn", "click", shareQuiz);
  }

  /* ==========================================
     INITIALIZATION
  ========================================== */

  async function init() {
    bindEvents();
    restoreSettings();

    if ($("startBtn")) {
      $("startBtn").disabled = true;
    }

    if ($("continueBtn")) {
      $("continueBtn").hidden = true;
    }

    updateHome();

    await loadQuestions();

    updateHome();
    updateSelection();

    if ($("startBtn")) {
      $("startBtn").disabled =
        !state.confirmed || state.loading;
    }

    console.log(
      "Quiz Master initialized successfully."
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
