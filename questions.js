
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

  const STORAGE = {
    progress: "quizmasterProgress",
    used: "quizmasterUsedQuestionIds",
    completed: "quizmasterCompletedRounds",
    review: "quizmasterReviewAnswers",
    best: "quizmasterBestScore",
    total: "quizmasterTotalScore",
    language: "quizmasterLanguage",
    mode: "quizmasterMode"
  };

  const messages = {
    rw: {
      loading: "Ibibazo birimo gutegurwa...",
      loadError: "Ibibazo ntibyashoboye gufunguka. Reba questions.json.",
      noQuestions: "Nta bibazo bihuye n'icyiciro wahisemo. Reba category muri questions.json.",
      question: "Ikibazo",
      correct: "Igisubizo ni cyo!",
      incorrect: "Igisubizo si cyo.",
      timeout: "Igihe kirangiye!",
      result: "Round irarangiye!",
      correctAnswer: "Igisubizo nyacyo: ",
      explanation: "Ibisobanuro: ",
      locked: "Banza ubone nibura 70% kugira ngo ukomeze.",
      noSaved: "Nta mukino wabitswe ushobora gukomeza.",
      next: "Ikibazo gikurikira",
      finish: "Reba amanota",
      nextRound: "Round ikurikira",
      home: "Ahabanza",
      retry: "Ongera ukine iyi round",
      saved: "Umukino wawe wabitswe."
    },
    en: {
      loading: "Loading questions...",
      loadError: "Questions could not be loaded. Check questions.json.",
      noQuestions: "No questions match your selected category. Check category in questions.json.",
      question: "Question",
      correct: "Correct answer!",
      incorrect: "Incorrect answer.",
      timeout: "Time is up!",
      result: "Round Complete!",
      correctAnswer: "Correct answer: ",
      explanation: "Explanation: ",
      locked: "Get at least 70% to continue.",
      noSaved: "There is no saved game to continue.",
      next: "Next Question",
      finish: "View Results",
      nextRound: "Next Round",
      home: "Home",
      retry: "Retry Round",
      saved: "Your game has been saved."
    }
  };

  const state = {
    language: localStorage.getItem(STORAGE.language) === "en" ? "en" : "rw",
    mode: localStorage.getItem(STORAGE.mode) === "general" ? "general" : "traffic",
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

  const tr = key =>
    messages[state.language]?.[key] ||
    messages.en[key] ||
    key;

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
    const error = $("quizError") || $("errorMessage");

    if (error) {
      error.textContent = message;
      error.style.display = "block";
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

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ");
  }

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function getCategory(question) {
    const category = normalize(
      question.category ?? question.mode ?? question.type ?? ""
    );

    if (/general|knowledge|ubumenyi|rusange/.test(category)) {
      return "general";
    }

    if (/traffic|road|safety|umuhanda|amategeko|driving/.test(category)) {
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
    if (
      state.language === "rw" &&
      Array.isArray(question.options_rw)
    ) {
      return question.options_rw;
    }

    if (
      state.language === "en" &&
      Array.isArray(question.options_en)
    ) {
      return question.options_en;
    }

    return question.options ||
      question.answers ||
      question.choices ||
      [];
  }

  function getAnswer(question) {
    if (
      state.language === "rw" &&
      question.answer_rw !== undefined
    ) {
      return question.answer_rw;
    }

    if (
      state.language === "en" &&
      question.answer_en !== undefined
    ) {
      return question.answer_en;
    }

    return question.answer ??
      question.correctAnswer ??
      question.correct_answer;
  }

  function getCorrectIndex(question, options) {
    const answer = getAnswer(question);

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
        const index = Number(value);

        if (index >= 0 && index < options.length) return index;
      }

      const exact = options.findIndex(option =>
        normalize(option) === normalize(value)
      );

      if (exact !== -1) return exact;

      // Try the default answer when a translated answer is missing
      // from the translated options.
      const fallback = [
        question.answer,
        question.correctAnswer,
        question.correct_answer,
        question.answer_rw,
        question.answer_en
      ];

      for (const candidate of fallback) {
        if (typeof candidate === "string") {
          const index = options.findIndex(option =>
            normalize(option) === normalize(candidate)
          );

          if (index !== -1) return index;
        }
      }
    }

    if (answer && typeof answer === "object") {
      const value = answer.text ?? answer.value ?? answer.answer;

      if (value !== undefined) {
        return getCorrectIndex({ answer: value }, options);
      }
    }

    return -1;
  }

  function getExplanation(question) {
    return state.language === "rw"
      ? question.explanation_rw ||
        question.explanation ||
        question.explanation_en ||
        ""
      : question.explanation_en ||
        question.explanation ||
        question.explanation_rw ||
        "";
  }

  function makeQuestionId(question, index) {
    if (question.id !== undefined) return String(question.id);

    return getCategory(question) + ":" + index + ":" +
      normalize(
        question.question ||
        question.question_rw ||
        question.questionText ||
        question.text
      );
  }

  function validateQuestion(question, index) {
    if (!question || typeof question !== "object") return null;

    const category = getCategory(question);
    if (!category) return null;

    const rawOptions = getOptions(question);

    if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
      return null;
    }

    if (!rawOptions.every(option =>
      typeof option === "string" || typeof option === "number"
    )) {
      return null;
    }

    const options = rawOptions.map(option => String(option));
    const questionText = getQuestionText(question);

    if (!questionText || !questionText.trim()) return null;

    const answerIndex = getCorrectIndex(question, options);

    if (answerIndex < 0) {
      console.warn(
        "Skipping question with invalid answer:",
        question.id ?? index,
        questionText
      );
      return null;
    }

    return {
      ...question,
      _id: makeQuestionId(question, index),
      _category: category,
      _options: options,
      _answerIndex: answerIndex,
      _displayQuestion: questionText
    };
  }

  async function loadQuestions() {
    if (state.loading) {
      while (state.loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (state.questions.length) return state.questions;
    }

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
        throw new Error("questions.json must contain an array");
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
    function readArray(key) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
      } catch (_) {
        return [];
      }
    }

    state.usedIds = readArray(STORAGE.used);
    state.completedRounds = readArray(STORAGE.completed);
    state.bestScore = Number(localStorage.getItem(STORAGE.best)) || 0;
    state.totalScore = Number(localStorage.getItem(STORAGE.total)) || 0;
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
      timeLeft: state.timeLeft,
      answered: state.answered
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

    let unused = available.filter(question =>
      !state.usedIds.includes(question._id)
    );

    // Reset this category's cycle only when all its questions were used.
    if (!unused.length) {
      const categoryIds = new Set(available.map(question => question._id));

      state.usedIds = state.usedIds.filter(id => !categoryIds.has(id));
      unused = available.slice();
    }

    state.roundQuestions = shuffle(unused)
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

    state.language =
      localStorage.getItem(STORAGE.language) === "en" ? "en" : "rw";

    state.mode =
      localStorage.getItem(STORAGE.mode) === "general" ? "general" : "traffic";

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

    if (!Number.isFinite(state.timeLeft) ||
        state.timeLeft < 1 ||
        state.timeLeft > CONFIG.TIME_PER_QUESTION) {
      state.timeLeft = CONFIG.TIME_PER_QUESTION;
    }

    if ($("currentRound")) $("currentRound").textContent = state.round;

    if ($("currentQuestionNumber")) {
      $("currentQuestionNumber").textContent =
        (state.currentIndex + 1) + "/" + state.roundQuestions.length;
    }

    if ($("score")) $("score").textContent = state.score;

    if ($("questionLabel")) {
      $("questionLabel").textContent =
        tr("question") + " " + (state.currentIndex + 1);
    }

    if ($("questionText")) {
      $("questionText").textContent = question._displayQuestion;
    }

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

    // Keep the original option indexes when shuffling, so the answer
    // remains correct even when two options contain identical text.
    const options = shuffle(
      question._options.map((option, index) => ({ option, index }))
    );

    options.forEach(item => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-btn";
      button.textContent = item.option;

      button.addEventListener("click", () => {
        answerQuestion(item.index, button);
      });

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

      state.timeLeft = Math.max(0, state.timeLeft - 1);

      if ($("timer")) $("timer").textContent = state.timeLeft;

      if (state.timeLeft <= 0) {
        stopTimer();
        answerQuestion(-1, null, true);
      } else {
        saveProgress();
      }
    }, 1000);
  }

  function answerQuestion(selectedIndex, selectedButton, timedOut = false) {
    if (state.answered) return;

    state.answered = true;
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];
    if (!question) return;

    const correct = selectedIndex === question._answerIndex;

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.correct++;
      state.totalScore += CONFIG.POINTS_PER_CORRECT;
    } else {
      state.wrong++;
    }

    const container = $("optionsContainer");

    if (container) {
      container.querySelectorAll("button").forEach(button => {
        button.disabled = true;

        // Buttons retain their source index to avoid text-match errors.
        const optionIndex = Number(button.dataset.optionIndex);

        if (optionIndex === question._answerIndex) {
          button.classList.add("correct");
        }
      });
    }

    if (selectedButton && !correct) {
      selectedButton.classList.add("incorrect");
    }

    const correctAnswer = question._options[question._answerIndex];
    const chosenAnswer = selectedIndex >= 0
      ? question._options[selectedIndex]
      : (timedOut ? tr("timeout") : "—");

    const explanation = getExplanation(question);

    const message = correct
      ? tr("correct")
      : timedOut
        ? tr("timeout")
        : tr("incorrect");

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
      state.timeLeft = CONFIG.TIME_PER_QUESTION;
      renderQuestion();
    } else {
      finishRound();
    }
  }

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;
    const percent = total
      ? Math.round(state.correct / total * 100)
      : 0;

    if (percent >= CONFIG.UNLOCK_PERCENT &&
        !state.completedRounds.includes(state.round)) {
      state.completedRounds.push(state.round);
    }

    state.bestScore = Math.max(state.bestScore, state.score);
    saveProgress();

    if ($("resultTitle")) $("resultTitle").textContent = tr("result");
    if ($("resultRound")) $("resultRound").textContent = state.round;
    if ($("resultPercent")) $("resultPercent").textContent = percent + "%";
    if ($("resultScore")) $("resultScore").textContent = state.score;
    if ($("correctAnswers")) $("correctAnswers").textContent = state.correct;
    if ($("totalQuestionsResult")) {
      $("totalQuestionsResult").textContent = total;
    }

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
      const canContinue = percent >= CONFIG.UNLOCK_PERCENT;

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

    if (!state.roundQuestions.length) {
      showError(tr("noQuestions"));
      return;
    }

    // Reuse the same questions, but start the round from zero.
    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.review = [];
    state.timeLeft = CONFIG.TIME_PER_QUESTION;
    state.answered = false;

    showScreen("quizScreen");
    renderQuestion();
  }

  async function startNextRound() {
    const percent = state.roundQuestions.length
      ? Math.round(state.correct / state.roundQuestions.length * 100)
      : 0;

    if (percent < CONFIG.UNLOCK_PERCENT) {
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
    state.timeLeft = CONFIG.TIME_PER_QUESTION;

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
        "Round " + round +
        (state.completedRounds.includes(round) ? " ✓" :
          unlocked ? "" : " 🔒");

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
        state.timeLeft = CONFIG.TIME_PER_QUESTION;

        if (chooseRoundQuestions()) {
          showScreen("quizScreen");
          renderQuestion();
        }
      });

      container.appendChild(button);
    }
  }

  function loadSavedProgress() {
    let progress;

    try {
      progress = JSON.parse(
        localStorage.getItem(STORAGE.progress) || "null"
      );
    } catch (_) {
      return false;
    }

    if (!progress) return false;

    if (progress.mode !== state.mode ||
        progress.language !== state.language) {
      return false;
    }

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
    state.timeLeft = Math.min(
      CONFIG.TIME_PER_QUESTION,
      Math.max(1, Number(progress.timeLeft) || CONFIG.TIME_PER_QUESTION)
    );

    // An already answered question should not be scored twice.
    state.answered = Boolean(progress.answered);

    return true;
  }

  async function continueQuiz() {
    stopTimer();
    clearError();

    try {
      await loadQuestions();
      loadSavedData();

      if (!loadSavedProgress()) {
        showError(tr("noSaved"));
        return;
      }

      showScreen("quizScreen");

      if (state.answered) {
        state.answered = false;
        state.timeLeft = CONFIG.TIME_PER_QUESTION;
      }

      renderQuestion();
    } catch (error) {
      console.error("Continue quiz failed:", error);
      showError(tr("loadError"));
    }
  }

  window.addEventListener("quizmaster:setup", event => {
    if (event.detail) {
      state.language = event.detail.language === "en" ? "en" : "rw";
      state.mode = event.detail.mode === "general" ? "general" : "traffic";

      localStorage.setItem(STORAGE.language, state.language);
      localStorage.setItem(STORAGE.mode, state.mode);
    }

    startNewQuiz();
  });

  window.addEventListener("quizmaster:continue", continueQuiz);

  window.addEventListener("quizmaster:show-rounds", async () => {
    try {
      await loadQuestions();
      loadSavedData();
      renderRounds();
    } catch (error) {
      console.error("Could not load rounds:", error);
      showError(tr("loadError"));
    }
  });

  window.addEventListener("quizmaster:retry", retryCurrentRound);
  window.addEventListener("quizmaster:next-round", startNextRound);
  window.addEventListener("quizmaster:next-question", nextQuestion);

  // Compatibility with the current HTML and other existing scripts.
  window.continueQuiz = continueQuiz;
  window.startNewQuiz = startNewQuiz;
  window.saveQuizProgress = saveProgress;
  window.retryCurrentRound = retryCurrentRound;
  window.startNextRound = startNextRound;
  window.renderRounds = renderRounds;

  loadSavedData();
})();
