
/* =========================================================
   QUIZ MASTER 🇷🇼
   Game engine for index.html + questions.json
   ========================================================= */

(function () {
  "use strict";

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TOTAL_ROUNDS: 10,
    TIME_PER_QUESTION: 20,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 60,
    MUSIC_FILE: "./mythica.mp3"
  };

  const KEYS = {
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    round: "quizmasterCurrentRound",
    unlocked: "quizmasterUnlockedRounds",
    progress: "quizmasterProgress",
    difficulty: "quizmasterDifficulty",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    completed: "quizmasterCompleted",
    stars: "quizmasterRoundStars",
    best: "quizmasterPersonalBest",
    total: "quizmasterTotalScore",
    used: "quizmasterUsedQuestions"
  };

  const $ = (id) => document.getElementById(id);

  const state = {
    questions: [],
    roundQuestions: [],
    currentIndex: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    selectedAnswer: null,
    answered: false,
    paused: false,
    timeLeft: CONFIG.TIME_PER_QUESTION,
    timerId: null,
    language: "rw",
    mode: "general",
    round: 1,
    review: [],
    previousScreen: "homeScreen",
    audio: null,
    audioUnlocked: false
  };

  const text = {
    rw: {
      question: "Ikibazo",
      round: "Icyiciro",
      score: "Amanota",
      time: "Igihe",
      next: "Ikindi kibazo",
      finish: "Reba amanota",
      pause: "Hagarika gato",
      resume: "Komeza",
      choose: "Hitamo igisubizo kimwe.",
      correct: "Ni byo! Igisubizo ni cyo.",
      incorrect: "Si byo. Igisubizo nyacyo: ",
      timeout: "Igihe kirangiye!",
      noQuestions: "Nta bibazo bihagije byabonetse muri iki cyiciro.",
      loadError: "Ibibazo ntibyashoboye gufunguka. Reba niba questions.json iri kuri GitHub kandi ifite JSON nyayo.",
      result: "Warangije gukina!",
      excellent: "Ni byiza cyane! Komeza utyo.",
      good: "Urakoze gukina. Komeza witoze.",
      retry: "Ongera ukine",
      nextRound: "Ikindi cyiciro",
      locked: "Iki cyiciro kirafunze. Banza urangize icyabanjirije.",
      home: "Ahabanza",
      review: "Reba ibisubizo",
      correctLabel: "Ibisubizo nyabyo",
      wrongLabel: "Ibisubizo bitari byo",
      explanation: "Ibisobanuro",
      yourAnswer: "Igisubizo wahisemo",
      unanswered: "Nta gisubizo watanze",
      correctAnswer: "Igisubizo nyacyo",
      noExplanation: "Nta bisobanuro byatanzwe.",
      paused: "Umukino wahagaritswe by'agateganyo.",
      loading: "Tegereza, ibibazo birafunguka...",
      music: "Umuziki",
      sound: "Amajwi",
      category: "Icyiciro",
      error: "Habaye ikibazo",
      passed: "Wafunguye icyiciro gikurikira!",
      lockedAgain: "Ugomba kubona nibura 60% kugira ngo ufungure ikindi cyiciro."
    },
    en: {
      question: "Question",
      round: "Round",
      score: "Score",
      time: "Time",
      next: "Next Question",
      finish: "View Results",
      pause: "Pause",
      resume: "Resume",
      choose: "Choose one answer.",
      correct: "Correct! Well done.",
      incorrect: "Incorrect. Correct answer: ",
      timeout: "Time is up!",
      noQuestions: "No suitable questions were found for this category.",
      loadError: "Questions could not load. Check that questions.json exists and contains valid JSON.",
      result: "Quiz completed!",
      excellent: "Excellent work! Keep it up.",
      good: "Thanks for playing. Keep practicing.",
      retry: "Try Again",
      nextRound: "Next Round",
      locked: "This round is locked. Complete the previous round first.",
      home: "Home",
      review: "Review Answers",
      correctLabel: "Correct Answers",
      wrongLabel: "Wrong Answers",
      explanation: "Explanation",
      yourAnswer: "Your answer",
      unanswered: "Not answered",
      correctAnswer: "Correct answer",
      noExplanation: "No explanation provided.",
      paused: "The quiz is paused.",
      loading: "Loading questions...",
      music: "Music",
      sound: "Sound Effects",
      category: "Category",
      error: "An error occurred",
      passed: "You unlocked the next round!",
      lockedAgain: "Score at least 60% to unlock the next round."
    }
  };

  function t(key) {
    return text[state.language][key] || key;
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value)
      );
    } catch (error) {
      console.warn("Quiz Master: Could not save progress.", error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.toggle("active", screen.id === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function getFirst(obj, names, fallback = undefined) {
    for (const name of names) {
      if (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, name) &&
        obj[name] !== null &&
        obj[name] !== ""
      ) {
        return obj[name];
      }
    }
    return fallback;
  }

  function normalizeLanguage(value) {
    const language = String(value || "").toLowerCase();

    if (
      ["rw", "kinyarwanda", "kin", "rw-rw"].includes(language)
    ) return "rw";

    if (
      ["en", "english", "eng", "en-us", "en-gb"].includes(language)
    ) return "en";

    return "";
  }

  function normalizeMode(value) {
    const mode = String(value || "").toLowerCase();

    if (
      /traffic|road|driving|driving.?rules|amategeko|umuhanda/.test(mode)
    ) return "traffic";

    if (
      /general|knowledge|rusange|general.?knowledge/.test(mode)
    ) return "general";

    return "";
  }

  function questionId(question, index) {
    const id = getFirst(question, ["id", "questionId", "question_id"]);
    return id !== undefined ? String(id) : String(index);
  }

  function getCategory(question) {
    return String(getFirst(question, [
      "category", "mode", "type", "topic", "subject"
    ], "")).trim();
  }

  function detectMode(question) {
    const explicit = normalizeMode(getCategory(question));
    if (explicit) return explicit;

    const values = [
      question.question,
      question.question_rw,
      question.question_en,
      question.question_kinyarwanda,
      question.question_english,
      question.explanation,
      question.category
    ].filter(Boolean).join(" ").toLowerCase();

    if (
      /traffic|road sign|road rules|driving|speed limit|seat belt|pedestrian|intersection|roundabout|traffic light|amategeko y.umuhanda|umuhanda|ikimenyetso cy.umuhanda|itara ritukura|umuvuduko ntarengwa|abanyamaguru/.test(values)
    ) return "traffic";

    return "general";
  }

  function getQuestionText(question) {
    if (state.language === "rw") {
      return getFirst(question, [
        "question_rw",
        "question_kinyarwanda",
        "questionKinyarwanda",
        "kinyarwanda_question",
        "rw_question",
        "question"
      ], "");
    }

    return getFirst(question, [
      "question_en",
      "question_english",
      "questionEnglish",
      "english_question",
      "en_question",
      "question"
    ], "");
  }

  function getOptions(question) {
    let options = getFirst(question, [
      state.language === "rw" ? "options_rw" : "options_en",
      state.language === "rw" ? "options_kinyarwanda" : "options_english",
      "options",
      "answers",
      "choices"
    ], []);

    if (!Array.isArray(options)) return [];

    // Support options stored as objects such as { A: "...", B: "..." }.
    return options.map((option) => {
      if (typeof option === "string" || typeof option === "number") {
        return String(option);
      }

      if (option && typeof option === "object") {
        return String(getFirst(option, [
          state.language === "rw" ? "rw" : "en",
          state.language === "rw" ? "kinyarwanda" : "english",
          "text", "label", "value"
        ], ""));
      }

      return "";
    });
  }

  function getExplanation(question) {
    return String(getFirst(question, [
      state.language === "rw" ? "explanation_rw" : "explanation_en",
      state.language === "rw" ? "explanation_kinyarwanda" : "explanation_english",
      "explanation",
      "description",
      "fact"
    ], ""));
  }

  function getCorrectIndex(question, options) {
    const indexValue = getFirst(question, [
      "answerIndex",
      "correctIndex",
      "correct_index",
      "correctOptionIndex",
      "correct_option_index",
      "correctAnswerIndex"
    ]);

    if (indexValue !== undefined) {
      const index = Number(indexValue);
      if (Number.isInteger(index) && index >= 0 && index < options.length) {
        return index;
      }
    }

    let answer = getFirst(question, [
      state.language === "rw" ? "answer_rw" : "answer_en",
      state.language === "rw" ? "correct_answer_rw" : "correct_answer_en",
      "correctAnswer",
      "correct_answer",
      "correctOption",
      "correct_option",
      "answer",
      "correct"
    ]);

    if (answer === undefined || answer === null) return -1;

    if (typeof answer === "object") {
      answer = getFirst(answer, [
        state.language === "rw" ? "rw" : "en",
        state.language === "rw" ? "kinyarwanda" : "english",
        "text", "value", "index"
      ], answer);
    }

    if (typeof answer === "number") {
      if (Number.isInteger(answer) && answer >= 0 && answer < options.length) {
        return answer;
      }
      return -1;
    }

    const answerText = String(answer).trim();

    // Accept A/B/C/D as option labels.
    if (/^[a-d]$/i.test(answerText)) {
      return answerText.toUpperCase().charCodeAt(0) - 65;
    }

    // Match the correct answer against the displayed options.
    const exactIndex = options.findIndex(
      (option) => option.trim().toLowerCase() === answerText.toLowerCase()
    );

    if (exactIndex >= 0) return exactIndex;

    // Support numbered answer strings, e.g. "1", "2", "3", "4".
    if (/^[1-4]$/.test(answerText)) {
      return Number(answerText) - 1;
    }

    return -1;
  }

  function prepareQuestion(question, index) {
    const options = getOptions(question);
    const answerIndex = getCorrectIndex(question, options);

    return {
      id: questionId(question, index),
      original: question,
      question: String(getQuestionText(question)),
      options,
      answerIndex,
      explanation: getExplanation(question),
      category: getCategory(question) || (
        state.mode === "traffic" ? "Traffic Rules" : "General Knowledge"
      ),
      valid:
        Boolean(getQuestionText(question)) &&
        options.length === 4 &&
        answerIndex >= 0
    };
  }

  function getAvailableQuestions() {
    const all = state.questions
      .map((question, index) => prepareQuestion(question, index))
      .filter((question) => question.valid);

    // If the JSON contains separate language-specific records,
    // use records matching the selected language.
    const languageSpecific = all.filter((question) => {
      const lang = normalizeLanguage(getFirst(question.original, [
        "language", "lang", "locale"
      ], ""));

      return Boolean(lang);
    });

    let pool = all;

    if (languageSpecific.length) {
      const matching = languageSpecific.filter((question) => {
        const lang = normalizeLanguage(getFirst(question.original, [
          "language", "lang", "locale"
        ], ""));
        return lang === state.language;
      });

      if (matching.length) {
        pool = matching;
      } else {
        pool = all.filter((question) => {
          const lang = normalizeLanguage(getFirst(question.original, [
            "language", "lang", "locale"
          ], ""));
          return !lang;
        });
      }
    }

    return pool.filter((question) => detectMode(question.original) === state.mode);
  }

  function getUsedKey() {
    return `${KEYS.used}_${state.language}_${state.mode}`;
  }

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function selectRoundQuestions() {
    let pool = getAvailableQuestions();

    if (!pool.length) return [];

    let used = readJSON(getUsedKey(), []);
    if (!Array.isArray(used)) used = [];

    let unused = pool.filter((question) => !used.includes(question.id));

    // Start a new question cycle after every question has been used.
    if (unused.length < Math.min(CONFIG.QUESTIONS_PER_ROUND, pool.length)) {
      used = [];
      unused = pool.slice();
    }

    const selected = shuffle(unused).slice(
      0,
      Math.min(CONFIG.QUESTIONS_PER_ROUND, pool.length)
    );

    const updatedUsed = [...new Set([
      ...used,
      ...selected.map((question) => question.id)
    ])];

    write(getUsedKey(), updatedUsed);

    return selected;
  }

  function getProgressKey() {
    return `${KEYS.progress}_${state.language}_${state.mode}`;
  }

  function getUnlockedRound() {
    const data = readJSON(KEYS.unlocked, {});
    const key = `${state.language}_${state.mode}`;
    const saved = Number(data[key] || 1);
    return Math.max(1, Math.min(CONFIG.TOTAL_ROUNDS, saved));
  }

  function saveUnlockedRound(round) {
    const data = readJSON(KEYS.unlocked, {});
    const key = `${state.language}_${state.mode}`;
    data[key] = Math.max(Number(data[key] || 1), round);
    write(KEYS.unlocked, data);
  }

  function updateHomeButtons() {
    const progress = readJSON(getProgressKey(), null);

    const continueBtn = $("continueBtn");
    if (continueBtn) {
      continueBtn.style.display = progress ? "" : "none";
    }

    const startBtn = $("startBtn");
    if (startBtn) startBtn.textContent = "🎮 Start Quiz";
  }

  function updateLabels() {
    const lang = state.language;
    document.documentElement.lang = lang === "rw" ? "rw" : "en";

    const nextBtn = $("nextBtn");
    const pauseBtn = $("pauseBtn");

    if (nextBtn) nextBtn.textContent = t("next");
    if (pauseBtn) pauseBtn.textContent = state.paused ? t("resume") : t("pause");

    const musicSwitch = $("musicSwitch");
    const soundSwitch = $("soundSwitch");

    if (musicSwitch) {
      musicSwitch.checked = read(KEYS.music, "false") === "true";
    }

    if (soundSwitch) {
      soundSwitch.checked = read(KEYS.sound, "true") === "true";
    }
  }

  function startRound(round, restore = false) {
    state.round = Math.max(1, Math.min(CONFIG.TOTAL_ROUNDS, round));
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.currentIndex = 0;
    state.selectedAnswer = null;
    state.answered = false;
    state.paused = false;
    state.review = [];

    const unlocked = getUnlockedRound();

    if (state.round > unlocked) {
      showMessage(t("locked"));
      showScreen("roundsScreen");
      renderRounds();
      return;
    }

    if (restore) {
      const saved = readJSON(getProgressKey(), null);

      if (
        saved &&
        saved.round === state.round &&
        Array.isArray(saved.questions) &&
        saved.questions.length
      ) {
        state.roundQuestions = saved.questions
          .map((item) => prepareQuestion(item.original, 0))
          .filter((item) => item.valid);

        state.currentIndex = Math.min(
          Number(saved.currentIndex || 0),
          state.roundQuestions.length - 1
        );

        state.score = Number(saved.score || 0);
        state.correct = Number(saved.correct || 0);
        state.wrong = Number(saved.wrong || 0);
        state.review = Array.isArray(saved.review) ? saved.review : [];
      } else {
        state.roundQuestions = selectRoundQuestions();
      }
    } else {
      state.roundQuestions = selectRoundQuestions();
    }

    if (!state.roundQuestions.length) {
      showError(t("noQuestions"));
      return;
    }

    if (restore) {
      const saved = readJSON(getProgressKey(), null);
      if (saved) state.timeLeft = Number(saved.timeLeft || CONFIG.TIME_PER_QUESTION);
    } else {
      state.timeLeft = CONFIG.TIME_PER_QUESTION;
    }

    saveProgress();
    updateLabels();
    renderQuestion();
    showScreen("quizScreen");
    startMusic();
  }

  function saveProgress() {
    write(getProgressKey(), {
      round: state.round,
      currentIndex: state.currentIndex,
      score: state.score,
      correct: state.correct,
      wrong: state.wrong,
      timeLeft: state.timeLeft,
      review: state.review,
      questions: state.roundQuestions.map((question) => question.original)
    });

    write(KEYS.round, state.round);
  }

  function renderQuestion() {
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answered = false;
    state.paused = false;
    state.timeLeft = CONFIG.TIME_PER_QUESTION;

    $("questionNumber").textContent =
      `${state.currentIndex + 1}/${state.roundQuestions.length}`;

    $("roundDisplay").textContent = String(state.round);
    $("score").textContent = String(state.score);
    $("timer").textContent = String(state.timeLeft);
    $("category").textContent = question.category;
    $("question").textContent = question.question;
    $("message").textContent = t("choose");
    $("progressBar").style.width =
      `${(state.currentIndex / state.roundQuestions.length) * 100}%`;

    const optionsContainer = $("options");
    optionsContainer.replaceChildren();

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
      button.dataset.index = String(index);

      button.addEventListener("click", () => selectAnswer(index));

      optionsContainer.appendChild(button);
    });

    $("nextBtn").disabled = true;
    $("nextBtn").textContent =
      state.currentIndex === state.roundQuestions.length - 1
        ? t("finish")
        : t("next");

    $("pauseBtn").textContent = t("pause");

    saveProgress();
    startTimer();
  }

  function selectAnswer(index) {
    if (state.answered || state.paused) return;

    const question = state.roundQuestions[state.currentIndex];
    if (!question) return;

    state.answered = true;
    state.selectedAnswer = index;
    stopTimer();

    const correct = index === question.answerIndex;

    if (correct) {
      state.correct++;
      state.score += CONFIG.POINTS_PER_CORRECT;
      $("message").textContent = t("correct");
      playTone(true);
    } else {
      state.wrong++;
      $("message").textContent =
        t("incorrect") + question.options[question.answerIndex];
      playTone(false);
    }

    Array.from($("options").children).forEach((button, i) => {
      button.disabled = true;
      button.style.cursor = "default";

      if (i === question.answerIndex) {
        button.style.border = "2px solid #10b981";
        button.style.background = "#064e3b";
      } else if (i === index) {
        button.style.border = "2px solid #ef4444";
        button.style.background = "#7f1d1d";
      }
    });

    const explanation = question.explanation;
    if (explanation) {
      $("message").textContent += " " + explanation;
    }

    $("score").textContent = String(state.score);
    $("nextBtn").disabled = false;

    state.review.push({
      id: question.id,
      question: question.question,
      options: question.options,
      answerIndex: question.answerIndex,
      selectedAnswer: index,
      correct,
      explanation: question.explanation
    });

    saveProgress();
  }

  function skipQuestion() {
    if (state.answered || state.paused) return;

    const question = state.roundQuestions[state.currentIndex];
    if (!question) return;

    state.answered = true;
    state.wrong++;

    $("message").textContent =
      t("timeout") + " " + t("correctAnswer") + ": " +
      question.options[question.answerIndex];

    Array.from($("options").children).forEach((button, index) => {
      button.disabled = true;

      if (index === question.answerIndex) {
        button.style.border = "2px solid #10b981";
        button.style.background = "#064e3b";
      }
    });

    state.review.push({
      id: question.id,
      question: question.question,
      options: question.options,
      answerIndex: question.answerIndex,
      selectedAnswer: null,
      correct: false,
      explanation: question.explanation
    });

    $("nextBtn").disabled = false;
    saveProgress();
  }

  function nextQuestion() {
    if (!state.answered || state.paused) return;

    if (state.currentIndex < state.roundQuestions.length - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      finishRound();
    }
  }

  function startTimer() {
    stopTimer();

    state.timerId = window.setInterval(() => {
      if (state.paused || state.answered) return;

      state.timeLeft--;
      $("timer").textContent = String(state.timeLeft);

      if (state.timeLeft <= 0) {
        stopTimer();
        skipQuestion();
      }

      saveProgress();
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function togglePause() {
    if (state.answered) return;

    state.paused = !state.paused;
    $("pauseBtn").textContent = state.paused ? t("resume") : t("pause");

    $("message").textContent = state.paused ? t("paused") : t("choose");

    if (state.paused) {
      stopTimer();
    } else {
      startTimer();
    }
  }

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;
    const percent = total ? Math.round((state.correct / total) * 100) : 0;

    const stars = percent >= 80 ? 3 : percent >= 60 ? 2 : 1;

    const allStars = readJSON(KEYS.stars, {});
    const key = `${state.language}_${state.mode}_${state.round}`;
    allStars[key] = Math.max(Number(allStars[key] || 0), stars);
    write(KEYS.stars, allStars);

    const completed = readJSON(KEYS.completed, {});
    const progressKey = `${state.language}_${state.mode}`;
    completed[progressKey] = Math.max(
      Number(completed[progressKey] || 0),
      state.round
    );
    write(KEYS.completed, completed);

    const unlocked = getUnlockedRound();
    const passed = percent >= CONFIG.UNLOCK_PERCENT;

    if (passed && state.round < CONFIG.TOTAL_ROUNDS) {
      saveUnlockedRound(Math.max(unlocked, state.round + 1));
    }

    const best = readJSON(KEYS.best, {});
    best[progressKey] = Math.max(Number(best[progressKey] || 0), state.score);
    write(KEYS.best, best);

    const totalScores = readJSON(KEYS.total, {});
    totalScores[progressKey] =
      Number(totalScores[progressKey] || 0) + state.score;
    write(KEYS.total, totalScores);

    try {
      localStorage.removeItem(getProgressKey());
    } catch (_) {}

    $("finalScore").textContent = String(state.score);
    $("resultPercent").textContent = `${percent}%`;
    $("finishedRound").textContent = String(state.round);
    $("correctCount").textContent = String(state.correct);
    $("wrongCount").textContent = String(state.wrong);

    $("resultMessage").textContent =
      percent >= 80 ? t("excellent") :
      percent >= 60 ? t("passed") :
      t("lockedAgain");

    $("nextRoundBtn").style.display =
      passed && state.round < CONFIG.TOTAL_ROUNDS ? "" : "none";

    $("nextRoundBtn").textContent = t("nextRound");
    $("restartBtn").textContent = t("retry");
    $("reviewBtn").textContent = t("review");
    $("resultHomeBtn").textContent = t("home");

    $("progressBar").style.width = "100%";

    renderRounds();
    updateHomeButtons();
    showScreen("resultScreen");
  }

  function renderRounds() {
    const grid = $("roundGrid");
    if (!grid) return;

    grid.replaceChildren();

    const unlocked = getUnlockedRound();
    const stars = readJSON(KEYS.stars, {});

    for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "round-card";

      const key = `${state.language}_${state.mode}_${round}`;
      const earned = Number(stars[key] || 0);
      const locked = round > unlocked;

      button.textContent =
        `${locked ? "🔒" : "🏆"} ${t("round")} ${round}\n` +
        (locked ? "Locked" : "⭐".repeat(earned || 0));

      button.disabled = locked;
      button.style.opacity = locked ? "0.45" : "1";

      button.addEventListener("click", () => {
        if (!locked) startRound(round);
      });

      grid.appendChild(button);
    }
  }

  function renderReview() {
    const list = $("reviewList");
    list.replaceChildren();

    $("reviewSummary").textContent =
      `${t("correctLabel")}: ${state.correct} | ${t("wrongLabel")}: ${state.wrong}`;

    state.review.forEach((item, index) => {
      const article = document.createElement("article");
      article.className = "review-item";

      const selectedText =
        item.selectedAnswer === null || item.selectedAnswer === undefined
          ? t("unanswered")
          : item.options[item.selectedAnswer];

      article.innerHTML = `
        <h3>${index + 1}. ${escapeHTML(item.question)}</h3>
        <p><strong>${escapeHTML(t("yourAnswer"))}:</strong>
          ${escapeHTML(selectedText)}</p>
        <p><strong>${escapeHTML(t("correctAnswer"))}:</strong>
          ${escapeHTML(item.options[item.answerIndex])}</p>
        <p><strong>${escapeHTML(t("explanation"))}:</strong>
          ${escapeHTML(item.explanation || t("noExplanation"))}</p>
        <p>${item.correct ? "✅" : "❌"}</p>
      `;

      list.appendChild(article);
    });

    showScreen("reviewScreen");
  }

  function showMessage(message) {
    const element = $("message");
    if (element) element.textContent = message;
  }

  function showError(message) {
    $("errorMessage").textContent = message;
    showScreen("errorScreen");
  }

  function startMusic() {
    if (read(KEYS.music, "false") !== "true") return;

    try {
      if (!state.audio) {
        state.audio = new Audio(CONFIG.MUSIC_FILE);
        state.audio.loop = true;
        state.audio.volume = 0.25;
      }

      state.audio.play().catch(() => {
        // Browsers may require a user interaction before playing audio.
      });
    } catch (error) {
      console.warn("Music could not start.", error);
    }
  }

  function stopMusic() {
    if (state.audio) state.audio.pause();
  }

  function playTone(correct) {
    if (read(KEYS.sound, "true") !== "true") return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = correct ? 660 : 220;
      gain.gain.value = 0.06;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      oscillator.onended = () => context.close();
    } catch (_) {
      // Sound effects are optional.
    }
  }

  async function loadQuestions() {
    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      state.questions = Array.isArray(data)
        ? data
        : Array.isArray(data.questions)
          ? data.questions
          : [];

      if (!state.questions.length) {
        throw new Error("questions.json is empty or has an unsupported format.");
      }

      state.language = normalizeLanguage(read(KEYS.language, "rw")) || "rw";
      state.mode = normalizeMode(read(KEYS.mode, "general")) || "general";

      updateLabels();
      updateHomeButtons();
      renderRounds();

      const musicSwitch = $("musicSwitch");
      if (musicSwitch) {
        musicSwitch.addEventListener("change", () => {
          write(KEYS.music, String(musicSwitch.checked));
          if (musicSwitch.checked) startMusic();
          else stopMusic();
        });
      }

      const soundSwitch = $("soundSwitch");
      if (soundSwitch) {
        soundSwitch.addEventListener("change", () => {
          write(KEYS.sound, String(soundSwitch.checked));
        });
      }

      const savedLanguage = read(KEYS.language, "");
      const savedMode = read(KEYS.mode, "");

      if (
        normalizeLanguage(savedLanguage) &&
        normalizeMode(savedMode)
      ) {
        state.language = normalizeLanguage(savedLanguage);
        state.mode = normalizeMode(savedMode);
      }

      updateLabels();
      renderRounds();
      updateHomeButtons();

      const available = getAvailableQuestions();

      if (!available.length) {
        console.warn(
          "Quiz Master: No questions match the selected language and category. Check question fields in questions.json."
        );
      }

    } catch (error) {
      console.error("Quiz Master loading error:", error);
      showError(t("loadError"));
    }
  }

  // Main navigation
  $("startBtn").addEventListener("click", () => {
    state.language = normalizeLanguage(read(KEYS.language, "rw")) || "rw";
    state.mode = normalizeMode(read(KEYS.mode, "general")) || "general";
    startRound(1);
  });

  $("continueBtn").addEventListener("click", () => {
    state.language = normalizeLanguage(read(KEYS.language, "rw")) || "rw";
    state.mode = normalizeMode(read(KEYS.mode, "general")) || "general";

    const progress = readJSON(getProgressKey(), null);

    if (progress) startRound(progress.round || 1, true);
    else startRound(1);
  });

  $("confirmSetupBtn").addEventListener("click", () => {
    // The existing inline setup script also handles this button.
    // Preferences are read from localStorage when Start is clicked.
  });

  $("roundsBtn").addEventListener("click", () => {
    renderRounds();
    showScreen("roundsScreen");
  });

  $("roundsBackBtn").addEventListener("click", () => showScreen("homeScreen"));

  $("settingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
  $("settingsBackBtn").addEventListener("click", () => showScreen("homeScreen"));

  $("nextBtn").addEventListener("click", nextQuestion);
  $("pauseBtn").addEventListener("click", togglePause);

  $("quizHomeBtn").addEventListener("click", () => {
    stopTimer();
    saveProgress();
    showScreen("homeScreen");
    updateHomeButtons();
  });

  $("nextRoundBtn").addEventListener("click", () => {
    const next = state.round + 1;

    if (next <= getUnlockedRound() && next <= CONFIG.TOTAL_ROUNDS) {
      startRound(next);
    }
  });

  $("restartBtn").addEventListener("click", () => startRound(state.round));

  $("reviewBtn").addEventListener("click", renderReview);

  $("resultHomeBtn").addEventListener("click", () => {
    showScreen("homeScreen");
    updateHomeButtons();
  });

  $("reviewRetryBtn").addEventListener("click", () => startRound(state.round));

  $("reviewBackBtn").addEventListener("click", () => {
    showScreen(state.previousScreen || "resultScreen");
  });

  $("errorRestartBtn").addEventListener("click", () => location.reload());

  $("errorHomeBtn").addEventListener("click", () => showScreen("homeScreen"));

  $("shareBtn").addEventListener("click", async () => {
    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        alert("✅ Link Copied!");
      } else {
        window.prompt("Copy this link:", shareData.url);
      }
    } catch (error) {
      if (error && error.name === "AbortError") return;

      try {
        window.prompt("Copy this link:", shareData.url);
      } catch (_) {}
    }
  });

  // Save current game state when the page is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTimer();
      saveProgress();
      stopMusic();
    } else {
      if (
        $("quizScreen").classList.contains("active") &&
        !state.paused &&
        !state.answered
      ) {
        startTimer();
      }

      startMusic();
    }
  });

  window.addEventListener("quizmaster:setup", (event) => {
    const detail = event.detail || {};

    state.language = normalizeLanguage(detail.language) || state.language;
    state.mode = normalizeMode(detail.mode) || state.mode;

    updateLabels();
    renderRounds();
    updateHomeButtons();
  });

  // Load questions only after the HTML elements exist.
  loadQuestions();
})();
