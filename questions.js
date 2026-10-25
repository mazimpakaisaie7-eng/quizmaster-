(() => {
  "use strict";

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TIME_PER_QUESTION: 30,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 70
  };

  const $ = id => document.getElementById(id);

  const state = {
    language: localStorage.getItem("quizmasterLanguage") === "en" ? "en" : "rw",
    mode: localStorage.getItem("quizmasterMode") === "general" ? "general" : "traffic",
    questions: [],
    roundQuestions: [],
    currentIndex: 0,
    round: 1,
    score: 0,
    correct: 0,
    wrong: 0,
    timeLeft: CONFIG.TIME_PER_QUESTION,
    timerId: null,
    answered: false,
    loading: false,
    review: [],
    usedIds: [],
    completedRounds: [],
    bestScore: 0,
    totalScore: 0
  };

  const STORAGE = {
    progress: "quizmasterProgress",
    used: "quizmasterUsedQuestionIds",
    completed: "quizmasterCompletedRounds",
    review: "quizmasterReviewAnswers",
    best: "quizmasterBestScore",
    total: "quizmasterTotalScore"
  };

  const text = {
    rw: {
      loading: "Ibibazo birimo gutegurwa...",
      loadError: "Ibibazo ntibyashoboye gufunguka. Reba questions.json.",
      noQuestions: "Nta bibazo bihuye n'icyiciro wahisemo. Reba category muri questions.json.",
      question: "Ikibazo",
      round: "Round",
      score: "Amanota",
      next: "Ikibazo gikurikira",
      finish: "Reba amanota",
      correct: "Igisubizo ni cyo!",
      incorrect: "Igisubizo si cyo.",
      timeout: "Igihe kirangiye!",
      result: "Round irarangiye!",
      correctLabel: "Ibisubizo nyabyo",
      totalLabel: "Ibibazo byose",
      home: "Ahabanza",
      retry: "Ongera ukine iyi round",
      nextRound: "Round ikurikira",
      review: "Subiramo ibisubizo",
      reviewEmpty: "Nta bisubizo byo gusubiramo biraboneka.",
      yourAnswer: "Igisubizo watanze: ",
      correctAnswer: "Igisubizo nyacyo: ",
      explanation: "Ibisobanuro: ",
      locked: "Round irafunze. Banza urangize round ibanziriza iyi.",
      noNext: "Wageze kuri round ya nyuma ishoboka kuri ibi bibazo.",
      saved: "Umukino wawe wabitswe.",
      expired: "Igihe kirangiye!"
    },
    en: {
      loading: "Loading questions...",
      loadError: "Questions could not be loaded. Check questions.json.",
      noQuestions: "No questions match your selected category. Check category in questions.json.",
      question: "Question",
      round: "Round",
      score: "Score",
      next: "Next Question",
      finish: "View Results",
      correct: "Correct answer!",
      incorrect: "Incorrect answer.",
      timeout: "Time is up!",
      result: "Round Complete!",
      correctLabel: "Correct",
      totalLabel: "Total Questions",
      home: "Home",
      retry: "Retry Round",
      nextRound: "Next Round",
      review: "Review Answers",
      reviewEmpty: "No answers are available to review yet.",
      yourAnswer: "Your answer: ",
      correctAnswer: "Correct answer: ",
      explanation: "Explanation: ",
      locked: "This round is locked. Complete the previous round first.",
      noNext: "You have reached the last available round for these questions.",
      saved: "Your game has been saved.",
      expired: "Time is up!"
    }
  };

  const tr = key => text[state.language][key] || text.en[key] || key;

  function dispatch(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("quizmaster:" + name, { detail })
    );
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
      screen.style.display = "none";
    });

    const screen = $(id);
    if (screen) {
      screen.classList.add("active");
      screen.style.display = "block";
    }
  }

  function showError(message) {
    const el = $("quizError");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }

    dispatch("error", { message });
  }

  function clearError() {
    ["quizError", "errorMessage"].forEach(id => {
      if ($(id)) {
        $(id).textContent = "";
        $(id).style.display = "none";
      }
    });
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ");
  }

  function getCategory(question) {
    const raw = question.category ?? question.mode ?? question.type ?? "";
    const category = normalize(raw);

    if (
      /general|knowledge|ubumenyi|rusange/.test(category)
    ) {
      return "general";
    }

    if (
      /traffic|road|safety|umuhanda|amategeko|driving/.test(category)
    ) {
      return "traffic";
    }

    return "";
  }

  function getQuestionText(question) {
    if (state.language === "rw") {
      return question.question_rw ||
        question.question ||
        question.questionText ||
        question.text ||
        "";
    }

    return question.question_en ||
      question.question ||
      question.questionText ||
      question.text ||
      question.question_rw ||
      "";
  }

  function getOptions(question) {
    if (state.language === "rw" && Array.isArray(question.options_rw)) {
      return question.options_rw;
    }

    if (state.language === "en" && Array.isArray(question.options_en)) {
      return question.options_en;
    }

    return question.options || question.answers || question.choices || [];
  }

  function getExplanation(question) {
    if (state.language === "rw") {
      return question.explanation_rw ||
        question.explanation ||
        question.explanation_en ||
        "";
    }

    return question.explanation_en ||
      question.explanation ||
      question.explanation_rw ||
      "";
  }

  function getCorrectIndex(question, options) {
    let answer;

    if (state.language === "rw" && question.answer_rw !== undefined) {
      answer = question.answer_rw;
    } else if (state.language === "en" && question.answer_en !== undefined) {
      answer = question.answer_en;
    } else {
      answer = question.answer ?? question.correctAnswer ?? question.correct_answer;
    }

    if (typeof answer === "number" && Number.isInteger(answer)) {
      return answer >= 0 && answer < options.length ? answer : -1;
    }

    if (typeof answer === "string") {
      const value = answer.trim();

      if (/^[A-D]$/i.test(value)) {
        const index = value.toUpperCase().charCodeAt(0) - 65;
        if (index < options.length) return index;
      }

      if (/^\d+$/.test(value)) {
        const number = Number(value);

        if (number >= 0 && number < options.length) return number;
      }

      const exact = options.findIndex(option =>
        normalize(option) === normalize(value)
      );

      if (exact !== -1) return exact;

      const fallbackAnswer =
        question.answer_rw ??
        question.answer_en ??
        question.answer ??
        question.correctAnswer ??
        question.correct_answer;

      if (typeof fallbackAnswer === "string") {
        const fallback = options.findIndex(option =>
          normalize(option) === normalize(fallbackAnswer)
        );

        if (fallback !== -1) return fallback;
      }
    }

    if (answer && typeof answer === "object") {
      const value = answer.text ?? answer.value ?? answer.answer;

      if (value !== undefined) {
        return getCorrectIndex(
          { answer: value },
          options
        );
      }
    }

    return -1;
  }

  function makeQuestionId(question, index) {
    if (question.id !== undefined) {
      return String(question.id);
    }

    const category = getCategory(question);
    const content = normalize(question.question || question.question_rw || question.questionText);

    return category + ":" + index + ":" + content;
  }

  function validateQuestion(question, index) {
    if (!question || typeof question !== "object") return null;
    if (!getCategory(question)) return null;

    const options = getOptions(question);

    if (!Array.isArray(options) || options.length < 2) return null;
    if (!options.every(option => typeof option === "string" || typeof option === "number")) {
      return null;
    }

    const cleanOptions = options.map(option => String(option));
    const questionText = getQuestionText(question);

    if (!questionText || !questionText.trim()) return null;

    const answerIndex = getCorrectIndex(question, cleanOptions);
    if (answerIndex < 0) return null;

    return {
      ...question,
      _id: makeQuestionId(question, index),
      _category: getCategory(question),
      _options: cleanOptions,
      _answerIndex: answerIndex,
      _displayQuestion: questionText
    };
  }

  async function loadQuestions() {
    if (state.loading) return state.questions;

    state.loading = true;

    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.questions;

      if (!Array.isArray(list)) {
        throw new Error("questions.json must contain an array of questions");
      }

      state.questions = list
        .map((question, index) => validateQuestion(question, index))
        .filter(Boolean);

      if (!state.questions.length) {
        throw new Error("No valid categorized questions found");
      }

      return state.questions;
    } finally {
      state.loading = false;
    }
  }

  function getQuestionsForMode() {
    return state.questions.filter(question =>
      question._category === state.mode
    );
  }

  function loadSavedData() {
    try {
      state.usedIds = JSON.parse(localStorage.getItem(STORAGE.used) || "[]");
      if (!Array.isArray(state.usedIds)) state.usedIds = [];
    } catch (_) {
      state.usedIds = [];
    }

    try {
      state.completedRounds = JSON.parse(
        localStorage.getItem(STORAGE.completed) || "[]"
      );
      if (!Array.isArray(state.completedRounds)) state.completedRounds = [];
    } catch (_) {
      state.completedRounds = [];
    }

    state.bestScore = Number(localStorage.getItem(STORAGE.best) || 0);
    state.totalScore = Number(localStorage.getItem(STORAGE.total) || 0);
  }

  function saveProgress() {
    const progress = {
      language: state.language,
      mode: state.mode,
      round: state.round,
      currentIndex: state.currentIndex,
      score: state.score,
      correct: state.correct,
      wrong: state.wrong,
      roundQuestions: state.roundQuestions.map(question => question._id),
      review: state.review,
      timeLeft: state.timeLeft
    };

    try {
      localStorage.setItem(STORAGE.progress, JSON.stringify(progress));
      localStorage.setItem(STORAGE.used, JSON.stringify(state.usedIds));
      localStorage.setItem(STORAGE.completed, JSON.stringify(state.completedRounds));
      localStorage.setItem(STORAGE.best, String(state.bestScore));
      localStorage.setItem(STORAGE.total, String(state.totalScore));
      localStorage.setItem(STORAGE.review, JSON.stringify(state.review));
    } catch (error) {
      console.warn("Could not save quiz progress:", error);
    }
  }

  function chooseRoundQuestions() {
    const available = getQuestionsForMode();

    if (!available.length) {
      showError(tr("noQuestions"));
      return false;
    }

    const unused = available.filter(question =>
      !state.usedIds.includes(question._id)
    );

    // Start a new cycle only after all questions in this category
    // have been used.
    if (!unused.length) {
      state.usedIds = state.usedIds.filter(id =>
        !available.some(question => question._id === id)
      );
    }

    const remaining = available.filter(question =>
      !state.usedIds.includes(question._id)
    );

    state.roundQuestions = shuffle(remaining.length ? remaining : available)
      .slice(0, CONFIG.QUESTIONS_PER_ROUND);

    state.roundQuestions.forEach(question => {
      if (!state.usedIds.includes(question._id)) {
        state.usedIds.push(question._id);
      }
    });

    saveProgress();
    return state.roundQuestions.length > 0;
  }

  async function startNewQuiz() {
    stopTimer();
    clearError();

    state.language = localStorage.getItem("quizmasterLanguage") === "en" ? "en" : "rw";
    state.mode = localStorage.getItem("quizmasterMode") === "general" ? "general" : "traffic";

    try {
      await loadQuestions();
      loadSavedData();

      state.round = 1;
      state.currentIndex = 0;
      state.score = 0;
      state.correct = 0;
      state.wrong = 0;
      state.review = [];

      if (!chooseRoundQuestions()) return;

      showScreen("quizScreen");
      renderQuestion();
    } catch (error) {
      console.error("Quiz loading failed:", error);
      showError(tr("loadError"));
    }
  }

  function renderQuestion() {
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.answered = false;
    state.timeLeft = CONFIG.TIME_PER_QUESTION;

    if ($("currentRound")) $("currentRound").textContent = state.round;
    if ($("currentQuestionNumber")) {
      $("currentQuestionNumber").textContent =
        (state.currentIndex + 1) + "/" + state.roundQuestions.length;
    }

    if ($("score")) $("score").textContent = state.score;
    if ($("questionLabel")) $("questionLabel").textContent =
      tr("question") + " " + (state.currentIndex + 1);

    if ($("questionText")) $("questionText").textContent = question._displayQuestion;
    if ($("timer")) $("timer").textContent = state.timeLeft;

    if ($("progressBar")) {
      $("progressBar").style.width =
        (state.currentIndex / state.roundQuestions.length * 100) + "%";
    }

    if ($("explanation")) {
      $("explanation").textContent = "";
      $("explanation").style.display = "none";
    }

    if ($("nextQuestionBtn")) {
      $("nextQuestionBtn").style.display = "none";
      $("nextQuestionBtn").textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? tr("finish")
          : tr("next");
    }

    const container = $("optionsContainer");
    if (!container) {
      showError("Missing optionsContainer in index.html");
      return;
    }

    container.replaceChildren();

    const shuffledOptions = shuffle(
      question._options.map((option, index) => ({ option, index }))
    );

    shuffledOptions.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-btn";
      button.textContent = item.option;
      button.addEventListener("click", () => answerQuestion(item.index, button));
      container.appendChild(button);
    });

    saveProgress();
    startTimer();
  }

  function startTimer() {
    stopTimer();

    state.timerId = setInterval(() => {
      if (state.answered) {
        stopTimer();
        return;
      }

      state.timeLeft--;

      if ($("timer")) $("timer").textContent = state.timeLeft;

      if (state.timeLeft <= 0) {
        stopTimer();
        answerQuestion(-1, null, true);
      }
    }, 1000);
  }

  function answerQuestion(selectedIndex, selectedButton, timedOut = false) {
    if (state.answered) return;

    state.answered = true;
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];
    const correct = selectedIndex === question._answerIndex;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.correct++;
      state.totalScore += CONFIG.POINTS_PER_CORRECT;
    } else {
      state.wrong++;
    }

    const buttons = $("optionsContainer")
      ? $("optionsContainer").querySelectorAll("button")
      : [];

    buttons.forEach(button => {
      button.disabled = true;

      const optionIndex = question._options.findIndex(option =>
        option === button.textContent
      );

      if (optionIndex === question._answerIndex) {
        button.classList.add("correct");
      }
    });

    if (selectedButton && !correct) {
      selectedButton.classList.add("incorrect");
    }

    const correctAnswer = question._options[question._answerIndex];
    const chosenAnswer = selectedIndex >= 0
      ? question._options[selectedIndex]
      : (timedOut ? tr("expired") : "—");

    const explanation = getExplanation(question);

    const message = correct
      ? tr("correct")
      : timedOut ? tr("timeout") : tr("incorrect");

    if ($("explanation")) {
      $("explanation").textContent =
        message + " " + tr("correctAnswer") + correctAnswer +
        (explanation ? "\n" + tr("explanation") + explanation : "");
      $("explanation").style.whiteSpace = "pre-line";
      $("explanation").style.display = "block";
    }

    state.review.push({
      question: question._displayQuestion,
      question_rw: question.question_rw || "",
      selectedAnswer: chosenAnswer,
      correctAnswer,
      explanation,
      category: state.mode,
      isCorrect: correct
    });

    if ($("score")) $("score").textContent = state.score;

    if ($("nextQuestionBtn")) {
      $("nextQuestionBtn").style.display = "block";
      $("nextQuestionBtn").textContent =
        state.currentIndex === state.roundQuestions.length - 1
          ? tr("finish")
          : tr("next");
    }

    saveProgress();
    dispatch("review-data", state.review.slice());
  }

  function nextQuestion() {
    if (!state.answered) return;

    if (state.currentIndex < state.roundQuestions.length - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      finishRound();
    }
  }

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;
    const percent = total ? Math.round(state.correct / total * 100) : 0;

    if (!state.completedRounds.includes(state.round)) {
      if (percent >= CONFIG.UNLOCK_PERCENT) {
        state.completedRounds.push(state.round);
      }
    }

    state.bestScore = Math.max(state.bestScore, state.score);

    saveProgress();

    if ($("resultTitle")) $("resultTitle").textContent = tr("result");
    if ($("resultRound")) $("resultRound").textContent = state.round;
    if ($("resultPercent")) $("resultPercent").textContent = percent + "%";
    if ($("resultScore")) $("resultScore").textContent = state.score;
    if ($("correctAnswers")) $("correctAnswers").textContent = state.correct;
    if ($("totalQuestionsResult")) $("totalQuestionsResult").textContent = total;

    if ($("roundStars")) {
      $("roundStars").textContent =
        percent >= 90 ? "★★★" :
        percent >= CONFIG.UNLOCK_PERCENT ? "★★" :
        percent >= 40 ? "★" : "☆";
    }

    if ($("resultMessage")) {
      $("resultMessage").textContent =
        state.language === "en"
          ? `${state.correct} correct out of ${total}. You scored ${percent}%.`
          : `Wasubije neza ${state.correct} kuri ${total}. Amanota yawe ni ${percent}%.`;
    }

    if ($("resultNextBtn")) {
      const canContinue = percent >= CONFIG.UNLOCK_PERCENT &&
        getQuestionsForMode().length > 0;

      $("resultNextBtn").disabled = !canContinue;

      $("resultNextBtn").textContent = canContinue
        ? tr("nextRound")
        : (state.language === "en"
          ? "Get 70% to unlock the next round"
          : "Shaka 70% kugira ngo ufungure round ikurikira");
    }

    if ($("progressBar")) $("progressBar").style.width = "100%";

    dispatch("review-data", state.review.slice());
    dispatch("round-complete", {
      round: state.round,
      score: state.score,
      correct: state.correct,
      total,
      percent
    });

    showScreen("resultScreen");
  }

  async function retryCurrentRound() {
    stopTimer();

    const previousQuestions = state.roundQuestions.slice();

    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.review = [];

    // Retry uses the same questions.
    state.roundQuestions = previousQuestions;

    showScreen("quizScreen");
    renderQuestion();
  }

  async function startNextRound() {
    const lastPercent = state.roundQuestions.length
      ? Math.round(state.correct / state.roundQuestions.length * 100)
      : 0;

    if (lastPercent < CONFIG.UNLOCK_PERCENT) {
      showError(tr("locked"));
      return;
    }

    stopTimer();

    state.round++;
    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.review = [];

    if (!chooseRoundQuestions()) {
      state.round--;
      showError(tr("noQuestions"));
      return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  function renderRounds() {
    const container = $("roundsContainer");
    if (!container) return;

    container.replaceChildren();

    const count = getQuestionsForMode().length;
    const totalRounds = Math.ceil(count / CONFIG.QUESTIONS_PER_ROUND);

    if ($("totalRounds")) $("totalRounds").textContent = totalRounds;

    for (let round = 1; round <= totalRounds; round++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "round-btn";

      const unlocked = round === 1 ||
        state.completedRounds.includes(round - 1);

      button.disabled = !unlocked;
      button.textContent =
        (state.language === "en" ? "Round " : "Round ") + round +
        (state.completedRounds.includes(round) ? " ✓" : unlocked ? "" : " 🔒");

      button.addEventListener("click", () => {
        if (!unlocked) {
          showError(tr("locked"));
          return;
        }

        state.round = round;
        state.currentIndex = 0;
        state.score = 0;
        state.correct = 0;
        state.wrong = 0;
        state.review = [];

        if (chooseRoundQuestions()) {
          showScreen("quizScreen");
          renderQuestion();
        }
      });

      container.appendChild(button);
    }
  }

  function loadSavedProgress() {
    try {
      const progress = JSON.parse(localStorage.getItem(STORAGE.progress) || "null");

      if (!progress) return false;
      if (progress.mode !== state.mode || progress.language !== state.language) return false;

      const ids = Array.isArray(progress.roundQuestions)
        ? progress.roundQuestions
        : [];

      const questions = ids.map(id =>
        state.questions.find(question => question._id === id)
      ).filter(Boolean);

      if (!questions.length) return false;

      state.roundQuestions = questions;
      state.round = Math.max(1, Number(progress.round) || 1);
      state.currentIndex = Math.min(
        Math.max(0, Number(progress.currentIndex) || 0),
        questions.length - 1
      );
      state.score = Number(progress.score) || 0;
      state.correct = Number(progress.correct) || 0;
      state.wrong = Number(progress.wrong) || 0;
      state.review = Array.isArray(progress.review) ? progress.review : [];
      state.timeLeft = Math.max(1, Number(progress.timeLeft) || CONFIG.TIME_PER_QUESTION);

      return true;
    } catch (_) {
      return false;
    }
  }

  async function continueQuiz() {
    stopTimer();

    try {
      await loadQuestions();
      loadSavedData();

      if (!loadSavedProgress()) {
        showError(tr("noSaved"));
        return;
      }

      showScreen("quizScreen");
      renderQuestion();
    } catch (error) {
      console.error(error);
      showError(tr("loadError"));
    }
  }

  // The current index.html sends the setup event when the player
  // confirms the language and category. Listen to this event only
  // to prevent the same quiz from starting multiple times.
  window.addEventListener("quizmaster:setup", event => {
    if (event.detail) {
      state.language = event.detail.language === "en" ? "en" : "rw";
      state.mode = event.detail.mode === "general" ? "general" : "traffic";
    }

    startNewQuiz();
  });

  window.addEventListener("quizmaster:continue", () => continueQuiz());

  window.addEventListener("quizmaster:show-rounds", async () => {
    try {
      await loadQuestions();
      loadSavedData();
      renderRounds();
    } catch (error) {
      console.error(error);
      showError(tr("loadError"));
    }
  });

  window.addEventListener("quizmaster:retry", () => retryCurrentRound());
  window.addEventListener("quizmaster:next-round", () => startNextRound());
  window.addEventListener("quizmaster:next-question", () => nextQuestion());

  // Compatibility functions for other parts of Quiz Master.
  // These do not replace the event-based setup flow above.
  window.continueQuiz = continueQuiz;
  window.saveQuizProgress = saveProgress;
  window.retryCurrentRound = retryCurrentRound;
  window.startNextRound = startNextRound;
  window.renderRounds = renderRounds;

  loadSavedData();
})();
