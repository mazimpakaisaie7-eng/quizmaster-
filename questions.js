
(() => {
  "use strict";

  // ==========================================
  // QUIZ MASTER 🇷🇼 — QUESTIONS ENGINE
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
    current: "quizmasterCurrentRound",
    completed: "quizmasterCompleted",
    stars: "quizmasterRoundStars",
    totalScore: "quizmasterTotalScore",
    best: "quizmasterPersonalBest",
    used: "quizmasterUsedQuestions",
    streak: "quizmasterCorrectStreak",
    sound: "quizmasterSound",
    music: "quizmasterMusic"
  };

  const $ = (id) => document.getElementById(id);

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
    completed: false,
    language: getLanguage(),
    mode: getMode()
  };

  function getLanguage() {
    return localStorage.getItem(KEYS.language) === "en" ? "en" : "rw";
  }

  function getMode() {
    const value = (localStorage.getItem(KEYS.mode) || "traffic")
      .toLowerCase();

    return ["general", "knowledge", "rusange"].includes(value)
      ? "general"
      : "traffic";
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
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function normaliseText(value) {
    return String(value ?? "").trim();
  }

  function getLocalisedValue(question, base, language) {
    const candidates = language === "en"
      ? [`${base}_en`, `${base}En`, `en_${base}`]
      : [`${base}_rw`, `${base}_kin`, `${base}Rw`, `rw_${base}`];

    for (const key of candidates) {
      if (question[key] !== undefined && question[key] !== null) {
        return question[key];
      }
    }

    return question[base];
  }

  function getAnswer(question, language) {
    const candidates = language === "en"
      ? ["answer_en", "answerEn", "en_answer"]
      : ["answer_rw", "answer_kin", "answerRw", "rw_answer"];

    for (const key of candidates) {
      if (question[key] !== undefined && question[key] !== null) {
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
    ).toLowerCase().trim();
  }

  function matchesMode(question, mode) {
    const category = getCategory(question);

    // Ibibazo bitashyiriweho category biraboneka muri mode zombi.
    if (!category) return true;

    const trafficWords = [
      "traffic", "road", "driving", "road rules",
      "amategeko y'umuhanda", "amategeko y'umuhanda",
      "umuhanda", "amategeko", "ibinyabiziga"
    ];

    const generalWords = [
      "general", "general knowledge", "knowledge",
      "rusange", "ubumenyi rusange"
    ];

    const words = mode === "traffic" ? trafficWords : generalWords;

    return words.some((word) => category.includes(word));
  }

  function normaliseQuestion(raw, index, language) {
    if (!raw || typeof raw !== "object") return null;

    const questionText = normaliseText(
      getLocalisedValue(raw, "question", language)
    );

    const rawOptions = getLocalisedValue(raw, "options", language);

    if (!questionText || !Array.isArray(rawOptions)) return null;

    const options = rawOptions
      .map(normaliseText)
      .filter(Boolean);

    if (options.length < 2) return null;

    const answer = normaliseText(getAnswer(raw, language));
    if (!answer) return null;

    // Igisubizo kigomba guhura neza n'imwe muri options.
    const matchedAnswer = options.find((option) => option === answer);
    if (!matchedAnswer) {
      console.warn(
        `Quiz Master: ikibazo ${index + 1} cyasibwe kuko answer idahuye na options.`,
        raw
      );
      return null;
    }

    const explanation = normaliseText(
      getLocalisedValue(raw, "explanation", language) || ""
    );

    return {
      id: raw.id ?? raw.question_id ?? index + 1,
      question: questionText,
      options,
      answer: matchedAnswer,
      explanation,
      category: getCategory(raw),
      originalIndex: index
    };
  }

  function showError(message) {
    console.error("Quiz Master:", message);

    const errorElement = $("quizError") || $("errorMessage");

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = "block";
    } else {
      alert(message);
    }
  }

  function clearError() {
    ["quizError", "errorMessage"].forEach((id) => {
      const element = $(id);
      if (element) {
        element.textContent = "";
        element.style.display = "none";
      }
    });
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
        throw new Error(`JSON ntiyafungutse: HTTP ${response.status}`);
      }

      const data = await response.json();

      let rawQuestions;

      if (Array.isArray(data)) {
        rawQuestions = data;
      } else if (data && Array.isArray(data.questions)) {
        rawQuestions = data.questions;
      } else if (data && Array.isArray(data.data)) {
        rawQuestions = data.data;
      } else {
        throw new Error(
          "questions.json igomba kuba array cyangwa object irimo questions array."
        );
      }

      state.allQuestions = rawQuestions;
      state.language = getLanguage();
      state.mode = getMode();

      const normalised = rawQuestions
        .map((question, index) =>
          normaliseQuestion(question, index, state.language)
        )
        .filter(Boolean);

      state.questions = normalised.filter((question) =>
        matchesMode(question, state.mode)
      );

      state.totalRounds = Math.ceil(
        state.questions.length / CONFIG.QUESTIONS_PER_ROUND
      );

      if (state.questions.length === 0) {
        throw new Error(
          state.language === "en"
            ? "No valid questions found for this category and language. Check questions.json."
            : "Nta bibazo byemewe byabonetse muri iki cyiciro. Reba questions.json."
        );
      }

      console.info(
        `Quiz Master: ${state.questions.length} questions loaded; ${state.totalRounds} rounds.`
      );

      updateRoundsDisplay();
      return true;
    } catch (error) {
      showError(
        error.message ||
        "Habaye ikibazo mu gufungura questions.json."
      );
      return false;
    } finally {
      state.loading = false;
    }
  }

  function updateRoundsDisplay() {
    const elements = [
      $("totalRounds"),
      $("roundsCount"),
      $("availableRounds")
    ];

    elements.forEach((element) => {
      if (element) element.textContent = String(state.totalRounds);
    });
  }

  function getUnlockedRound() {
    const value = Number(localStorage.getItem(KEYS.unlocked) || 1);
    return Math.max(1, Math.min(value, Math.max(state.totalRounds, 1)));
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

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
      screen.style.display = "none";
    });

    const screen = screenId ? $(screenId) : null;

    if (screen) {
      screen.style.display = "";
      screen.classList.add("active");
    }
  }

  function updateText(ids, value) {
    ids.forEach((id) => {
      const element = $(id);
      if (element) element.textContent = String(value);
    });
  }

  function updateProgress() {
    const total = state.currentQuestions.length || 1;
    const current = Math.min(state.questionIndex + 1, total);
    const percent = Math.round((state.questionIndex / total) * 100);

    updateText(["currentQuestionNumber", "questionNumber"], current);
    updateText(["questionCount", "totalQuestions"], total);
    updateText(["currentRound", "roundNumber"], state.round);
    updateText(["score", "currentScore"], state.score);

    const progress = $("progressBar");
    if (progress) progress.style.width = `${percent}%`;
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

    const optionsContainer =
      $("optionsContainer") ||
      $("answersContainer") ||
      $("options");

    if (!optionsContainer) {
      showError(
        "Index.html ibura element yerekana ibisubizo: optionsContainer, answersContainer cyangwa options."
      );
      return;
    }

    optionsContainer.innerHTML = "";

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-btn";
      button.dataset.optionIndex = String(index);
      button.textContent = option;

      button.addEventListener("click", () => chooseAnswer(option, button));

      optionsContainer.appendChild(button);
    });

    const explanation = $("explanation");
    if (explanation) {
      explanation.textContent = "";
      explanation.style.display = "none";
    }

    startTimer();
  }

  function startTimer() {
    stopTimer();
    updateText(["timer", "timeLeft", "countdown"], state.timeLeft);

    state.timer = setInterval(() => {
      if (state.answered) return;

      state.timeLeft -= 1;
      updateText(["timer", "timeLeft", "countdown"], state.timeLeft);

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
    const correct = selectedOption === question.answer;

    document.querySelectorAll(".answer-btn").forEach((button) => {
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

      saveNumber(KEYS.totalScore, Number(localStorage.getItem(KEYS.totalScore) || 0) + CONFIG.POINTS_PER_CORRECT);
      saveNumber(KEYS.streak, state.streak);
    } else {
      state.streak = 0;
      saveNumber(KEYS.streak, 0);
    }

    updateText(["score", "currentScore"], state.score);

    const explanation = $("explanation");
    if (explanation) {
      const prefix = correct
        ? (state.language === "en" ? "Correct! " : "Ni byo! ")
        : (state.language === "en" ? "Correct answer: " : "Igisubizo nyacyo: ");

      explanation.textContent =
        prefix + question.answer +
        (question.explanation ? ` — ${question.explanation}` : "");
      explanation.style.display = "block";
    }

    const nextButton = $("nextQuestionBtn") || $("nextBtn");

    if (nextButton) {
      nextButton.style.display = "";
      nextButton.disabled = false;
    } else {
      // Niba index.html idafite next button, komeza nyuma y'akanya gato.
      setTimeout(nextQuestion, 1200);
    }
  }

  function nextQuestion() {
    if (!state.answered) return;

    const nextButton = $("nextQuestionBtn") || $("nextBtn");
    if (nextButton) nextButton.style.display = "none";

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

    const roundStars = readObject(KEYS.stars);
    roundStars[state.round] = Math.max(
      Number(roundStars[state.round] || 0),
      stars
    );
    localStorage.setItem(KEYS.stars, JSON.stringify(roundStars));

    const completed = readArray(KEYS.completed);
    if (!completed.includes(state.round)) {
      completed.push(state.round);
      localStorage.setItem(KEYS.completed, JSON.stringify(completed));
    }

    const progress = readObject(KEYS.progress);
    progress[state.round] = {
      score: state.score,
      correct: state.roundCorrect,
      total,
      percent
    };
    localStorage.setItem(KEYS.progress, JSON.stringify(progress));

    let unlocked = getUnlockedRound();
    if (percent >= CONFIG.UNLOCK_PERCENT && state.round < state.totalRounds) {
      unlocked = Math.max(unlocked, state.round + 1);
      saveNumber(KEYS.unlocked, unlocked);
    }

    const oldBest = Number(localStorage.getItem(KEYS.best) || 0);
    if (state.score > oldBest) saveNumber(KEYS.best, state.score);

    updateText(["resultScore", "finalScore"], state.score);
    updateText(["correctAnswers", "roundCorrect"], state.roundCorrect);
    updateText(["roundPercent", "resultPercent"], `${percent}%`);
    updateText(["roundStars", "resultStars"], "★".repeat(stars));
    updateText(["resultRound", "finishedRound"], state.round);

    const resultMessage = $("resultMessage");
    if (resultMessage) {
      resultMessage.textContent = percent >= CONFIG.UNLOCK_PERCENT
        ? (state.language === "en"
          ? "Well done! You unlocked progress where available."
          : "Wakoze neza! Wujuje amanota akenewe yo gufungura round ikurikira.")
        : (state.language === "en"
          ? "Keep practising. You need at least 60% to unlock the next round."
          : "Komeza witoze. Ukeneye nibura 60% kugira ngo ufungure round ikurikira.");
    }

    showScreen("resultScreen");
  }

  async function startQuiz(round = 1) {
    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    const maxRound = state.totalRounds;
    if (!maxRound) return;

    const unlocked = getUnlockedRound();
    const chosenRound = Math.max(1, Math.min(Number(round) || 1, maxRound));

    if (chosenRound > unlocked) {
      showError(
        state.language === "en"
          ? "Complete the previous round with at least 60% to unlock this round."
          : "Banza urangize round ibanziriza iyi ufite nibura 60% kugira ngo uyifungure."
      );
      return;
    }

    state.round = chosenRound;
    state.currentQuestions = getRoundQuestions(chosenRound);
    state.questionIndex = 0;
    state.score = 0;
    state.roundCorrect = 0;
    state.completed = false;
    state.started = true;

    if (!state.currentQuestions.length) {
      showError("Nta bibazo biboneka muri iyi round.");
      return;
    }

    showScreen("quizScreen");
    renderQuestion();
  }

  async function beginSelectedSetup(detail = {}) {
    stopTimer();

    if (detail.language === "en" || detail.language === "rw") {
      localStorage.setItem(KEYS.language, detail.language);
    }

    if (["traffic", "general"].includes(detail.mode)) {
      localStorage.setItem(KEYS.mode, detail.mode);
    }

    state.language = getLanguage();
    state.mode = getMode();

    // Gusubiramo ibibazo ni ngombwa kuko language/mode bishobora kuba byarahindutse.
    state.questions = [];
    state.currentQuestions = [];
    state.questionIndex = 0;

    const loaded = await loadQuestions();
    if (!loaded) return;

    saveNumber(KEYS.unlocked, 1);
    await startQuiz(1);
  }

  function bindButtons() {
    const startButton = $("startBtn");
    if (startButton) {
      startButton.addEventListener("click", async (event) => {
        event.preventDefault();

        if (localStorage.getItem(KEYS.setup) !== "true") {
          showScreen("gameSetup");
          return;
        }

        if (!state.questions.length) {
          const loaded = await loadQuestions();
          if (!loaded) return;
        }

        await startQuiz(1);
      });
    }

    const continueButton = $("continueBtn");
    if (continueButton) {
      continueButton.addEventListener("click", async (event) => {
        event.preventDefault();

        if (!state.questions.length) {
          const loaded = await loadQuestions();
          if (!loaded) return;
        }

        const unlocked = getUnlockedRound();
        const progress = readArray(KEYS.completed);
        const next = progress.length
          ? Math.min(Math.max(...progress) + 1, unlocked)
          : 1;

        await startQuiz(next);
      });
    }

    const nextButton = $("nextQuestionBtn") || $("nextBtn");
    if (nextButton) {
      nextButton.addEventListener("click", nextQuestion);
      nextButton.style.display = "none";
    }

    const homeButtons = [
      $("homeBtn"),
      $("homeButton"),
      $("backHomeBtn")
    ].filter(Boolean);

    homeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        stopTimer();
        state.started = false;
        showScreen("homeScreen");
      });
    });

    const retryButton = $("retryBtn") || $("playAgainBtn");
    if (retryButton) {
      retryButton.addEventListener("click", () => startQuiz(state.round));
    }

    const roundsButton = $("roundsBtn");
    if (roundsButton) {
      roundsButton.addEventListener("click", () => {
        renderRounds();
        showScreen("roundsScreen");
      });
    }
  }

  function renderRounds() {
    const container = $("roundsContainer") || $("roundsList");
    if (!container) return;

    container.innerHTML = "";

    const unlocked = getUnlockedRound();
    const stars = readObject(KEYS.stars);

    for (let round = 1; round <= state.totalRounds; round++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "round-btn";
      button.textContent =
        `${round} — ${"★".repeat(Number(stars[round] || 0))}` +
        (round > unlocked ? " 🔒" : "");

      button.disabled = round > unlocked;
      button.addEventListener("click", () => startQuiz(round));

      container.appendChild(button);
    }
  }

  // HTML setup script igomba kohereza event kuri window.
  window.addEventListener("quizmaster:setup", (event) => {
    beginSelectedSetup(event.detail || {});
  });

  document.addEventListener("DOMContentLoaded", () => {
    bindButtons();

    // Niba setup yarabitswe mbere, fungura ibibazo byayo.
    loadQuestions();
  });
})();
