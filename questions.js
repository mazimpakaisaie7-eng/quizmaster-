
(() => {
  "use strict";

  // ==========================================
  // QUIZ MASTER 🇷🇼 — QUESTIONS ENGINE
  // Compatible with the supplied index.html
  // ==========================================

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TIME_PER_QUESTION: 30,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 60,
    BONUS_EVERY_CORRECT: 3,
    BONUS_POINTS: 5
  };

  const KEYS = {
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    setup: "quizmasterSetupComplete",
    progress: "quizmasterProgress",
    unlocked: "quizmasterUnlocked",
    completed: "quizmasterCompleted",
    stars: "quizmasterRoundStars",
    totalScore: "quizmasterTotalScore",
    best: "quizmasterPersonalBest",
    streak: "quizmasterCorrectStreak",
    session: "quizmasterSavedSession"
  };

  const $ = id => document.getElementById(id);

  const state = {
    allQuestions: [],
    questions: [],
    currentQuestions: [],
    round: 1,
    totalRounds: 0,
    questionIndex: 0,
    score: 0,
    roundCorrect: 0,
    streak: Number(localStorage.getItem(KEYS.streak) || 0),
    timeLeft: CONFIG.TIME_PER_QUESTION,
    timer: null,
    answered: false,
    loading: false,
    started: false,
    language: getLanguage(),
    mode: getMode(),
    sessionScore: 0,
    sessionCorrect: 0,
    sessionIndex: 0,
    sessionRound: 1
  };

  function getLanguage() {
    return localStorage.getItem(KEYS.language) === "en"
      ? "en"
      : "rw";
  }

  function getMode() {
    const value = (
      localStorage.getItem(KEYS.mode) || "traffic"
    ).toLowerCase();

    return ["general", "knowledge", "rusange"].includes(value)
      ? "general"
      : "traffic";
  }

  function t(rw, en) {
    return state.language === "en" ? en : rw;
  }

  function saveNumber(key, value) {
    localStorage.setItem(key, String(value));
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      return value &&
        typeof value === "object" &&
        !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  }

  function getLocalisedValue(question, base, language) {
    const keys = language === "en"
      ? [`${base}_en`, `${base}En`, `en_${base}`]
      : [
          `${base}_rw`,
          `${base}_kin`,
          `${base}Rw`,
          `rw_${base}`
        ];

    for (const key of keys) {
      if (
        question[key] !== undefined &&
        question[key] !== null
      ) {
        return question[key];
      }
    }

    return question[base];
  }

  function getAnswer(question, language) {
    const keys = language === "en"
      ? ["answer_en", "answerEn", "en_answer"]
      : ["answer_rw", "answer_kin", "answerRw", "rw_answer"];

    for (const key of keys) {
      if (
        question[key] !== undefined &&
        question[key] !== null
      ) {
        return question[key];
      }
    }

    return question.answer;
  }

  function getCategory(question) {
    return String(
      question.category ??
      question.mode ??
      question.type ??
      question.topic ??
      ""
    ).trim().toLowerCase();
  }

  function matchesMode(question, mode) {
    const category = getCategory(question);

    // Do not accidentally put uncategorised questions in both modes.
    if (!category) return true;

    const traffic = [
      "traffic",
      "road",
      "driving",
      "road safety",
      "road rules",
      "amategeko y'umuhanda",
      "amategeko yumuhanda",
      "umuhanda",
      "ibinyabiziga",
      "traffic rules"
    ];

    const general = [
      "general",
      "general knowledge",
      "knowledge",
      "rusange",
      "ubumenyi rusange"
    ];

    const words = mode === "general" ? general : traffic;

    return words.some(word => category.includes(word));
  }

  function normaliseQuestion(raw, index, language) {
    if (!raw || typeof raw !== "object") return null;

    const question = String(
      getLocalisedValue(raw, "question", language) ?? ""
    ).trim();

    const rawOptions = getLocalisedValue(raw, "options", language);

    if (!question || !Array.isArray(rawOptions)) return null;

    const options = rawOptions
      .map(value => String(value ?? "").trim())
      .filter(Boolean);

    if (options.length < 2) return null;

    const answer = String(
      getAnswer(raw, language) ?? ""
    ).trim();

    // The answer must match an option exactly.
    const correctOption = options.find(option => option === answer);

    if (!correctOption) {
      console.warn(
        `Quiz Master: Invalid answer in question ${index + 1}`,
        raw
      );
      return null;
    }

    return {
      id: raw.id ?? raw.question_id ?? index + 1,
      question,
      options,
      answer: correctOption,
      explanation: String(
        getLocalisedValue(raw, "explanation", language) ?? ""
      ).trim(),
      category: getCategory(raw),
      originalIndex: index
    };
  }

  function showError(message) {
    console.error("Quiz Master:", message);

    const element = $("quizError") || $("errorMessage");

    if (element) {
      element.textContent = message;
      element.style.display = "block";
    } else {
      alert(message);
    }
  }

  function clearError() {
    ["quizError", "errorMessage"].forEach(id => {
      const element = $(id);

      if (element) {
        element.textContent = "";
        element.style.display = "none";
      }
    });
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
      screen.style.display = "none";
    });

    const screen = $(id);

    if (screen) {
      screen.style.display = "block";
      screen.classList.add("active");
    }

    clearError();
  }

  async function loadQuestions() {
    if (state.loading) return false;

    state.loading = true;
    clearError();

    try {
      const response = await fetch(
        `${CONFIG.QUESTIONS_FILE}?v=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load questions.json (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      let rawQuestions;

      if (Array.isArray(data)) {
        rawQuestions = data;
      } else if (Array.isArray(data?.questions)) {
        rawQuestions = data.questions;
      } else if (Array.isArray(data?.data)) {
        rawQuestions = data.data;
      } else {
        throw new Error(
          "questions.json must be an array or contain a questions array."
        );
      }

      state.allQuestions = rawQuestions;
      state.language = getLanguage();
      state.mode = getMode();

      const validQuestions = rawQuestions
        .map((raw, index) =>
          normaliseQuestion(raw, index, state.language)
        )
        .filter(Boolean);

      state.questions = validQuestions.filter(question =>
        matchesMode(question, state.mode)
      );

      state.totalRounds = Math.ceil(
        state.questions.length / CONFIG.QUESTIONS_PER_ROUND
      );

      if (!state.questions.length) {
        throw new Error(
          t(
            "Nta bibazo byemewe bihuye n'ururimi n'icyiciro wahisemo. Reba questions.json.",
            "No valid questions match your selected language and category. Check questions.json."
          )
        );
      }

      // Keep unlocked progress inside the available round range.
      const unlocked = getUnlockedRound();
      saveNumber(
        KEYS.unlocked,
        Math.min(unlocked, state.totalRounds)
      );

      updateRoundsDisplay();

      console.info(
        `Quiz Master: ${state.questions.length} valid questions; ` +
        `${state.totalRounds} rounds available.`
      );

      return true;
    } catch (error) {
      showError(
        error.message ||
        t(
          "Habaye ikibazo mu gufungura ibibazo.",
          "There was a problem loading questions."
        )
      );
      return false;
    } finally {
      state.loading = false;
    }
  }

  function updateRoundsDisplay() {
    ["totalRounds", "roundsCount", "availableRounds"].forEach(id => {
      const element = $(id);
      if (element) {
        element.textContent = String(state.totalRounds);
      }
    });
  }

  function getUnlockedRound() {
    const value = Number(localStorage.getItem(KEYS.unlocked) || 1);

    return Math.max(
      1,
      Math.min(
        Number.isFinite(value) ? value : 1,
        Math.max(state.totalRounds, 1)
      )
    );
  }

  function getRoundQuestions(round) {
    const start = (round - 1) * CONFIG.QUESTIONS_PER_ROUND;

    return state.questions.slice(
      start,
      start + CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function stopTimer() {
    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function updateText(ids, value) {
    ids.forEach(id => {
      const element = $(id);
      if (element) element.textContent = String(value);
    });
  }

  function updateProgress() {
    const total = state.currentQuestions.length || 1;
    const current = Math.min(state.questionIndex + 1, total);
    const percent = Math.round(
      (state.questionIndex / total) * 100
    );

    updateText(["currentQuestionNumber", "questionNumber"], current);
    updateText(["questionCount", "totalQuestions"], total);
    updateText(["currentRound", "roundNumber"], state.round);
    updateText(["score", "currentScore"], state.score);

    const progress = $("progressBar");
    if (progress) progress.style.width = `${percent}%`;
  }

  function saveSession() {
    if (!state.started) return;

    const session = {
      language: state.language,
      mode: state.mode,
      round: state.round,
      questionIndex: state.questionIndex,
      score: state.score,
      roundCorrect: state.roundCorrect,
      streak: state.streak,
      timeLeft: state.timeLeft
    };

    localStorage.setItem(KEYS.session, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(KEYS.session);
  }

  function renderQuestion() {
    if (state.questionIndex >= state.currentQuestions.length) {
      finishRound();
      return;
    }

    state.answered = false;
    state.timeLeft = CONFIG.TIME_PER_QUESTION;

    const question = state.currentQuestions[state.questionIndex];

    updateProgress();
    updateText(["questionText", "question"], question.question);
    updateText(["timer", "timeLeft", "countdown"], state.timeLeft);

    const container = $("optionsContainer");

    if (!container) {
      showError("Index.html is missing #optionsContainer.");
      stopTimer();
      return;
    }

    container.innerHTML = "";

    question.options.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-btn";
      button.dataset.optionIndex = String(index);
      button.textContent = option;

      button.addEventListener("click", () => {
        chooseAnswer(option, button);
      });

      container.appendChild(button);
    });

    const explanation = $("explanation");

    if (explanation) {
      explanation.textContent = "";
      explanation.style.display = "none";
    }

    const nextButton = $("nextQuestionBtn");
    if (nextButton) {
      nextButton.style.display = "none";
      nextButton.disabled = false;
    }

    saveSession();
    startTimer();
  }

  function startTimer() {
    stopTimer();

    updateText(["timer", "timeLeft", "countdown"], state.timeLeft);

    state.timer = setInterval(() => {
      if (state.answered) return;

      state.timeLeft -= 1;

      updateText(["timer", "timeLeft", "countdown"], state.timeLeft);
      saveSession();

      if (state.timeLeft <= 0) {
        stopTimer();
        chooseAnswer(null, null);
      }
    }, 1000);
  }

  function chooseAnswer(selectedOption, selectedButton) {
    if (state.answered) return;

    state.answered = true;
    stopTimer();

    const question = state.currentQuestions[state.questionIndex];
    if (!question) return;

    const correct = selectedOption === question.answer;

    document.querySelectorAll("#optionsContainer .answer-btn").forEach(button => {
      button.disabled = true;

      if (button.textContent === question.answer) {
        button.classList.add("correct");
      } else if (button === selectedButton && !correct) {
        button.classList.add("incorrect");
      }
    });

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.roundCorrect += 1;
      state.streak += 1;

      if (state.streak % CONFIG.BONUS_EVERY_CORRECT === 0) {
        state.score += CONFIG.BONUS_POINTS;
      }

      saveNumber(
        KEYS.totalScore,
        Number(localStorage.getItem(KEYS.totalScore) || 0) +
          CONFIG.POINTS_PER_CORRECT
      );

      saveNumber(KEYS.streak, state.streak);
    } else {
      state.streak = 0;
      saveNumber(KEYS.streak, 0);
    }

    updateText(["score", "currentScore"], state.score);

    const explanation = $("explanation");

    if (explanation) {
      const prefix = correct
        ? t("Ni byo! ", "Correct! ")
        : t("Igisubizo nyacyo: ", "Correct answer: ");

      const timedOut = selectedOption === null;

      explanation.textContent =
        (timedOut ? t("Igihe kirangiye. ", "Time is up. ") : "") +
        prefix +
        question.answer +
        (question.explanation ? ` — ${question.explanation}` : "");

      explanation.style.display = "block";
    }

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.textContent =
        state.questionIndex + 1 >= state.currentQuestions.length
          ? t("Reba amanota", "View Results")
          : t("Ikibazo gikurikira", "Next Question");

      nextButton.style.display = "block";
      nextButton.disabled = false;
    }

    saveSession();
  }

  function nextQuestion() {
    if (!state.answered) return;

    state.questionIndex += 1;
    renderQuestion();
  }

  function finishRound() {
    stopTimer();
    state.started = false;

    const total = state.currentQuestions.length;

    const percent = total
      ? Math.round((state.roundCorrect / total) * 100)
      : 0;

    const stars = percent >= 80 ? 3 : percent >= 60 ? 2 : 1;

    const starsData = readObject(KEYS.stars);

    starsData[state.round] = Math.max(
      Number(starsData[state.round] || 0),
      stars
    );

    localStorage.setItem(KEYS.stars, JSON.stringify(starsData));

    const completed = readArray(KEYS.completed);

    if (!completed.includes(state.round)) {
      completed.push(state.round);
      localStorage.setItem(KEYS.completed, JSON.stringify(completed));
    }

    const progress = readObject(KEYS.progress);

    progress[`${state.mode}_${state.round}`] = {
      score: state.score,
      correct: state.roundCorrect,
      total,
      percent
    };

    localStorage.setItem(KEYS.progress, JSON.stringify(progress));

    if (percent >= CONFIG.UNLOCK_PERCENT &&
        state.round < state.totalRounds) {
      const nextUnlocked = Math.max(
        getUnlockedRound(),
        state.round + 1
      );

      saveNumber(KEYS.unlocked, nextUnlocked);
    }

    const oldBest = Number(localStorage.getItem(KEYS.best) || 0);

    if (state.score > oldBest) {
      saveNumber(KEYS.best, state.score);
    }

    updateText(["resultScore", "finalScore"], state.score);
    updateText(["correctAnswers", "roundCorrect"], state.roundCorrect);
    updateText(["totalQuestionsResult"], total);
    updateText(["resultPercent", "roundPercent"], `${percent}%`);
    updateText(["roundStars", "resultStars"], "★".repeat(stars));
    updateText(["resultRound", "finishedRound"], state.round);

    const message = $("resultMessage");

    if (message) {
      message.textContent = percent >= CONFIG.UNLOCK_PERCENT
        ? t(
            "Wakoze neza! Round ikurikira irafungutse niba ihari.",
            "Well done! The next round is unlocked if available."
          )
        : t(
            "Komeza witoze. Ukeneye nibura 60% kugira ngo ufungure round ikurikira.",
            "Keep practising. You need at least 60% to unlock the next round."
          );
    }

    const nextRoundButton = $("resultNextBtn");

    if (nextRoundButton) {
      const canContinue =
        percent >= CONFIG.UNLOCK_PERCENT &&
        state.round < state.totalRounds;

      nextRoundButton.disabled = !canContinue;
      nextRoundButton.style.display =
        state.round < state.totalRounds ? "block" : "none";
    }

    clearSession();
    renderRounds();
    showScreen("resultScreen");
  }

  async function startQuiz(round = 1) {
    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    if (!state.totalRounds) return;

    const chosenRound = Math.max(
      1,
      Math.min(Number(round) || 1, state.totalRounds)
    );

    if (chosenRound > getUnlockedRound()) {
      showError(
        t(
          "Banza urangize round ibanziriza iyi ufite nibura 60%.",
          "Complete the previous round with at least 60% first."
        )
      );
      return;
    }

    stopTimer();

    state.round = chosenRound;
    state.currentQuestions = getRoundQuestions(chosenRound);
    state.questionIndex = 0;
    state.score = 0;
    state.roundCorrect = 0;
    state.started = true;
    state.answered = false;

    if (!state.currentQuestions.length) {
      showError(t("Nta bibazo biri muri iyi round.", "This round has no questions."));
      state.started = false;
      return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  async function beginSelectedSetup(detail = {}) {
    stopTimer();

    const language = detail.language === "en" ? "en" : "rw";
    const mode = detail.mode === "general" ? "general" : "traffic";

    localStorage.setItem(KEYS.language, language);
    localStorage.setItem(KEYS.mode, mode);
    localStorage.setItem(KEYS.setup, "true");

    state.language = language;
    state.mode = mode;

    state.questions = [];
    state.currentQuestions = [];
    state.started = false;
    clearSession();

    const loaded = await loadQuestions();
    if (!loaded) return;

    // Progress is kept separately for each category.
    const unlockedByMode = readObject(KEYS.progress);
    const savedUnlocked = Number(
      localStorage.getItem(`${KEYS.unlocked}_${mode}`) || 1
    );

    saveNumber(
      KEYS.unlocked,
      Math.min(Math.max(1, savedUnlocked), state.totalRounds)
    );

    await startQuiz(1);
  }

  function renderRounds() {
    const container = $("roundsContainer");
    if (!container) return;

    container.innerHTML = "";

    const unlocked = getUnlockedRound();
    const stars = readObject(KEYS.stars);

    for (let round = 1; round <= state.totalRounds; round++) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "round-btn";

      const roundStars = Number(stars[`${state.mode}_${round}`] || stars[round] || 0);

      button.textContent =
        `${round} — ${"★".repeat(roundStars)}` +
        (round > unlocked ? " 🔒" : "");

      button.disabled = round > unlocked;
      button.addEventListener("click", () => startQuiz(round));

      container.appendChild(button);
    }

    updateRoundsDisplay();
  }

  function continueQuiz() {
    const saved = localStorage.getItem(KEYS.session);

    if (saved) {
      try {
        const session = JSON.parse(saved);

        if (
          session.language === getLanguage() &&
          session.mode === getMode()
        ) {
          resumeSession(session);
          return;
        }
      } catch {
        clearSession();
      }
    }

    showError(
      t(
        "Nta mukino wabitswe wo gukomeza. Tangira umukino mushya.",
        "No saved game found. Start a new quiz."
      )
    );
    showScreen("homeScreen");
  }

  async function resumeSession(session) {
    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    const round = Number(session.round) || 1;

    if (round > getUnlockedRound()) {
      clearSession();
      showError(t("Round yabitswe ntifunguye.", "The saved round is locked."));
      return;
    }

    state.round = round;
    state.currentQuestions = getRoundQuestions(round);
    state.questionIndex = Math.max(
      0,
      Math.min(Number(session.questionIndex) || 0, state.currentQuestions.length - 1)
    );
    state.score = Number(session.score) || 0;
    state.roundCorrect = Number(session.roundCorrect) || 0;
    state.streak = Number(session.streak) || 0;
    state.timeLeft = Math.max(
      1,
      Math.min(CONFIG.TIME_PER_QUESTION, Number(session.timeLeft) || CONFIG.TIME_PER_QUESTION)
    );
    state.started = true;

    showScreen("quizScreen");
    renderQuestion();
  }

  function bindButtons() {
    // The index.html already has click handlers for these events.
    // Do not attach duplicate handlers to Start, Continue, Rounds,
    // Retry or Next Round here.

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.style.display = "none";
    }

    const quizHomeButton = $("quizHomeBtn");

    if (quizHomeButton) {
      quizHomeButton.addEventListener("click", () => {
        stopTimer();
        saveSession();
        state.started = false;
        showScreen("homeScreen");
      });
    }

    const retryButton = $("retryBtn");

    if (retryButton) {
      // index.html dispatches quizmaster:retry.
      // Its event handler below owns this action.
    }

    const resultHomeButton = $("resultHomeBtn");

    if (resultHomeButton) {
      // Navigation is already handled by index.html.
    }
  }

  window.addEventListener("quizmaster:setup", event => {
    beginSelectedSetup(event.detail || {});
  });

  window.addEventListener("quizmaster:continue", () => {
    continueQuiz();
  });

  window.addEventListener("quizmaster:show-rounds", async () => {
    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    renderRounds();
    showScreen("roundsScreen");
  });

  window.addEventListener("quizmaster:retry", () => {
    startQuiz(state.round);
  });

  window.addEventListener("quizmaster:next-round", () => {
    if (state.round < state.totalRounds &&
        state.round + 1 <= getUnlockedRound()) {
      startQuiz(state.round + 1);
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    bindButtons();

    const loaded = await loadQuestions();

    if (loaded) {
      renderRounds();
    }
  });
})();
