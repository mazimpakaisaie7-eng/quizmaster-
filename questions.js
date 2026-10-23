
(() => {
  "use strict";

  // ==========================================
  // QUIZ MASTER 🇷🇼 — QUESTIONS.JS
  // Compatible with the supplied index.html
  // ==========================================

  const QUESTIONS_FILE = "./questions.json";
  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 30;
  const POINTS_PER_CORRECT = 10;
  const UNLOCK_PERCENT = 60;

  const KEYS = {
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    setup: "quizmasterSetupComplete",
    progress: "quizmasterProgress",
    unlocked: "quizmasterUnlockedRounds",
    current: "quizmasterCurrentRound",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    completed: "quizmasterCompletedRounds",
    stars: "quizmasterRoundStars",
    totalScore: "quizmasterTotalScore",
    personalBest: "quizmasterPersonalBest",
    used: "quizmasterUsedQuestions"
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    start: $("startBtn"),
    continue: $("continueBtn"),
    roundsBtn: $("roundsBtn"),
    settingsBtn: $("settingsBtn"),
    shareBtn: $("shareBtn"),

    roundsScreen: $("roundsScreen"),
    roundGrid: $("roundGrid"),
    roundsBack: $("roundsBackBtn"),

    quizScreen: $("quizScreen"),
    questionNumber: $("questionNumber"),
    roundDisplay: $("roundDisplay"),
    score: $("score"),
    timer: $("timer"),
    progressBar: $("progressBar"),
    category: $("category"),
    question: $("question"),
    options: $("options"),
    message: $("message"),
    nextBtn: $("nextBtn"),
    pauseBtn: $("pauseBtn"),
    quizHomeBtn: $("quizHomeBtn"),

    resultScreen: $("resultScreen"),
    finalScore: $("finalScore"),
    resultPercent: $("resultPercent"),
    resultMessage: $("resultMessage"),
    finishedRound: $("finishedRound"),
    correctCount: $("correctCount"),
    wrongCount: $("wrongCount"),
    nextRoundBtn: $("nextRoundBtn"),
    restartBtn: $("restartBtn"),
    reviewBtn: $("reviewBtn"),
    resultHomeBtn: $("resultHomeBtn"),

    reviewScreen: $("reviewScreen"),
    reviewSummary: $("reviewSummary"),
    reviewList: $("reviewList"),
    reviewRetryBtn: $("reviewRetryBtn"),
    reviewBackBtn: $("reviewBackBtn"),

    settingsScreen: $("settingsScreen"),
    musicSwitch: $("musicSwitch"),
    soundSwitch: $("soundSwitch"),
    settingsBackBtn: $("settingsBackBtn"),

    errorScreen: $("errorScreen"),
    errorMessage: $("errorMessage"),
    errorRestartBtn: $("errorRestartBtn"),
    errorHomeBtn: $("errorHomeBtn")
  };

  const state = {
    allQuestions: [],
    questions: [],
    roundQuestions: [],
    round: 1,
    totalRounds: 0,
    questionIndex: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    selected: false,
    paused: false,
    seconds: TIME_PER_QUESTION,
    timerId: null,
    loading: false,
    roundResults: [],
    completed: new Set(),
    unlocked: 1,
    roundScores: {},
    language: "rw",
    mode: "traffic",
    musicEnabled: true,
    soundEnabled: true,
    audioContext: null,
    audio: null,
    started: false
  };

  const normalise = (value) =>
    String(value ?? "")
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save quiz progress:", error);
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  function writeString(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }

  function getLanguage() {
    const value = readString(KEYS.language, "rw").toLowerCase();
    return ["en", "english"].includes(value) ? "en" : "rw";
  }

  function getMode() {
    const value = readString(KEYS.mode, "traffic").toLowerCase();

    if (
      value.includes("general") ||
      value.includes("knowledge") ||
      value.includes("rusange")
    ) {
      return "general";
    }

    return "traffic";
  }

  function getText(value) {
    if (typeof value === "string") return value;

    if (value && typeof value === "object") {
      return value[state.language] ??
        value[state.language === "en" ? "english" : "kinyarwanda"] ??
        value.en ??
        value.rw ??
        value.english ??
        value.kinyarwanda ??
        "";
    }

    return "";
  }

  function getLocalizedField(q, names) {
    for (const name of names) {
      if (q[name] !== undefined && q[name] !== null) {
        const value = getText(q[name]);
        if (value !== "") return value;
      }
    }

    const translations = q.translations;
    if (translations && typeof translations === "object") {
      const languageData =
        translations[state.language] ??
        translations[state.language === "en" ? "english" : "kinyarwanda"];

      if (languageData && typeof languageData === "object") {
        for (const name of names) {
          const shortName = name
            .replace(/_(rw|en|kinyarwanda|english)$/i, "")
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase();

          if (languageData[shortName] !== undefined) {
            const value = getText(languageData[shortName]);
            if (value !== "") return value;
          }
        }
      }
    }

    return "";
  }

  function getQuestionText(q) {
    const languageNames = state.language === "en"
      ? [
          "question_en",
          "questionEn",
          "question_english",
          "questionEnglish"
        ]
      : [
          "question_rw",
          "questionRw",
          "question_kinyarwanda",
          "questionKinyarwanda"
        ];

    return getLocalizedField(q, languageNames) ||
      getText(q.question) ||
      getText(q.text) ||
      "";
  }

  function getOptions(q) {
    const languageNames = state.language === "en"
      ? ["options_en", "optionsEn", "options_english", "optionsEnglish"]
      : ["options_rw", "optionsRw", "options_kinyarwanda", "optionsKinyarwanda"];

    let raw = getLocalizedField(q, languageNames);

    if (!raw) raw = getText(q.options);

    if (Array.isArray(raw)) {
      return raw.map(getText).filter((x) => typeof x === "string" && x.trim());
    }

    // Support localized options supplied as arrays in translations.
    const translations = q.translations;
    if (translations && typeof translations === "object") {
      const lang = translations[state.language] ??
        translations[state.language === "en" ? "english" : "kinyarwanda"];

      if (lang && Array.isArray(lang.options)) {
        return lang.options.map(getText).filter(Boolean);
      }
    }

    return [];
  }

  function getAnswer(q, options) {
    const languageNames = state.language === "en"
      ? ["answer_en", "answerEn", "answer_english", "answerEnglish"]
      : ["answer_rw", "answerRw", "answer_kinyarwanda", "answerKinyarwanda"];

    let answer = getLocalizedField(q, languageNames);

    if (!answer) answer = getText(q.answer);

    // If answer is a number, interpret it as an option index.
    if (
      answer === "" &&
      Number.isInteger(q.correctAnswerIndex)
    ) {
      return options[q.correctAnswerIndex] || "";
    }

    // Also support correctAnswer as a number or string.
    if (answer === "" && q.correctAnswer !== undefined) {
      if (
        Number.isInteger(q.correctAnswer) &&
        options[q.correctAnswer] !== undefined
      ) {
        return options[q.correctAnswer];
      }

      answer = getText(q.correctAnswer);
    }

    const match = options.find(
      (option) => normalise(option) === normalise(answer)
    );

    return match || "";
  }

  function getExplanation(q) {
    const names = state.language === "en"
      ? ["explanation_en", "explanationEn", "explanation_english"]
      : ["explanation_rw", "explanationRw", "explanation_kinyarwanda"];

    return getLocalizedField(q, names) ||
      getText(q.explanation) ||
      "";
  }

  function matchesMode(q) {
    const value = [
      q.mode,
      q.type,
      q.quizType,
      q.quiz_type,
      q.topic,
      q.category,
      q.category_en,
      q.category_rw
    ]
      .filter((x) => x !== undefined && x !== null)
      .map((x) => normalise(getText(x)))
      .join(" ");

    // No explicit category: keep the question instead of
    // accidentally excluding an existing JSON question.
    if (!value) return true;

    const isGeneral =
      /\bgeneral\b|\bknowledge\b|rusange|ubumenyi rusange/.test(value);

    const isTraffic =
      /traffic|road|driving|amategeko|umuhanda|ibinyabiziga|sign/.test(value);

    if (state.mode === "general") {
      // Keep unclassified questions; filter explicitly classified ones.
      return isGeneral || (!isTraffic && !isGeneral);
    }

    // Traffic mode: keep traffic questions and unclassified questions.
    return isTraffic || (!isTraffic && !isGeneral);
  }

  function normaliseQuestion(q, index) {
    if (!q || typeof q !== "object" || Array.isArray(q)) {
      return null;
    }

    const question = getQuestionText(q);
    const options = getOptions(q);

    if (!question || options.length < 2) return null;

    const answer = getAnswer(q, options);
    if (!answer) {
      console.warn(
        `Quiz Master: skipping invalid question ${index + 1}; answer does not match an option.`
      );
      return null;
    }

    if (!matchesMode(q)) return null;

    return {
      id: q.id ?? q.question_id ?? index,
      originalIndex: index,
      question,
      options,
      answer,
      explanation: getExplanation(q),
      category: getText(q.category) || (
        state.mode === "traffic"
          ? (state.language === "en" ? "Road Traffic Rules" : "Amategeko y’Umuhanda")
          : (state.language === "en" ? "General Knowledge" : "Ubumenyi Rusange")
      )
    };
  }

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function clearTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function showOnly(screen) {
    const screens = [
      elements.roundsScreen,
      elements.quizScreen,
      elements.resultScreen,
      elements.reviewScreen,
      elements.settingsScreen,
      elements.errorScreen
    ];

    screens.forEach((el) => {
      if (el) el.style.display = "none";
    });

    if (screen) screen.style.display = "block";
  }

  function showHome() {
    clearTimer();
    state.paused = false;
    state.started = false;
    showOnly(null);

    // Keep the original home screen visible.
    [
      "homeScreen",
      "mainScreen",
      "home",
      "gameSetup"
    ].forEach((id) => {
      const el = $(id);
      if (el && id !== "gameSetup") {
        el.style.display = "";
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showError(message) {
    clearTimer();

    if (elements.errorMessage) {
      elements.errorMessage.textContent = message;
    }

    showOnly(elements.errorScreen);

    if (!elements.errorScreen) {
      alert(message);
      showHome();
    }
  }

  function loadProgress() {
    const unlocked = Number(readString(KEYS.unlocked, "1"));
    state.unlocked = Number.isFinite(unlocked)
      ? Math.max(1, unlocked)
      : 1;

    const completed = readJSON(KEYS.completed, []);
    state.completed = new Set(
      Array.isArray(completed) ? completed.map(Number) : []
    );

    state.roundScores = readJSON(KEYS.stars, {}) || {};
    state.score = Number(readString(KEYS.totalScore, "0")) || 0;
  }

  function saveProgress() {
    saveJSON(KEYS.completed, [...state.completed]);
    saveJSON(KEYS.stars, state.roundScores);
    writeString(KEYS.unlocked, state.unlocked);
    writeString(KEYS.current, state.round);
    writeString(KEYS.totalScore, state.score);
    saveJSON(KEYS.progress, {
      currentRound: state.round,
      totalRounds: state.totalRounds,
      completedRounds: [...state.completed],
      unlockedRounds: state.unlocked,
      totalScore: state.score
    });
  }

  async function loadQuestions() {
    if (state.loading) return;

    state.loading = true;
    state.language = getLanguage();
    state.mode = getMode();

    try {
      const response = await fetch(QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Unable to load questions.json (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      let list;

      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.questions)) {
        list = data.questions;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      } else {
        throw new Error(
          "questions.json must contain an array of questions."
        );
      }

      state.allQuestions = list
        .map((q, index) => normaliseQuestion(q, index))
        .filter(Boolean);

      state.questions = state.allQuestions.slice();
      state.totalRounds = Math.ceil(
        state.questions.length / QUESTIONS_PER_ROUND
      );

      if (state.questions.length === 0) {
        throw new Error(
          state.language === "en"
            ? "No valid questions were found for your selected language and category. Check questions.json and make sure each answer matches one of its options."
            : "Nta bibazo byemewe bibonetse mu rurimi n'icyiciro wahisemo. Reba questions.json, urebe ko buri gisubizo gihuye n'imwe mu mahitamo."
        );
      }

      loadProgress();

      // Clamp saved progress when the JSON question count changes.
      state.unlocked = Math.min(
        Math.max(1, state.unlocked),
        state.totalRounds
      );

      state.round = Math.min(
        Math.max(1, Number(readString(KEYS.current, "1")) || 1),
        state.totalRounds
      );

      state.loading = false;
      return true;
    } catch (error) {
      state.loading = false;
      console.error("Quiz Master loading error:", error);

      showError(error.message || "Unable to load quiz questions.");
      return false;
    }
  }

  function setText(el, value) {
    if (el) el.textContent = String(value ?? "");
  }

  function startQuiz(roundNumber = 1) {
    clearTimer();

    if (!state.questions.length) {
      showError(
        "Questions are not loaded yet. Please press Start Quiz again."
      );
      return;
    }

    const requested = Number(roundNumber) || 1;
    state.round = Math.min(
      Math.max(1, requested),
      state.totalRounds
    );

    if (state.round > state.unlocked) {
      alert(
        `Complete Round ${state.unlocked} first to unlock the next round.`
      );
      return;
    }

    const start = (state.round - 1) * QUESTIONS_PER_ROUND;
    const end = Math.min(
      start + QUESTIONS_PER_ROUND,
      state.questions.length
    );

    state.roundQuestions = state.questions.slice(start, end);

    if (!state.roundQuestions.length) {
      showError("No questions are available in this round.");
      return;
    }

    state.questionIndex = 0;
    state.correct = 0;
    state.wrong = 0;
    state.roundResults = [];
    state.selected = false;
    state.paused = false;
    state.started = true;

    setText(elements.score, state.score);
    showOnly(elements.quizScreen);
    renderQuestion();
  }

  function renderQuestion() {
    clearTimer();

    const q = state.roundQuestions[state.questionIndex];

    if (!q) {
      finishRound();
      return;
    }

    state.selected = false;
    state.seconds = TIME_PER_QUESTION;

    if (elements.options) elements.options.replaceChildren();

    setText(
      elements.questionNumber,
      `Question ${state.questionIndex + 1} / ${state.roundQuestions.length}`
    );
    setText(elements.roundDisplay, `Round ${state.round} / ${state.totalRounds}`);
    setText(elements.score, state.score);
    setText(elements.timer, state.seconds);
    setText(elements.category, q.category);
    setText(elements.question, q.question);
    setText(elements.message, "");

    if (elements.progressBar) {
      const percent =
        ((state.questionIndex + 1) / state.roundQuestions.length) * 100;

      elements.progressBar.style.width = `${percent}%`;
      elements.progressBar.setAttribute("aria-valuenow", String(percent));
    }

    if (elements.nextBtn) {
      elements.nextBtn.disabled = true;
      elements.nextBtn.textContent =
        state.questionIndex === state.roundQuestions.length - 1
          ? "See Results"
          : "Next Question";
    }

    if (elements.options) {
      q.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option-btn";
        button.textContent = option;
        button.setAttribute("data-option-index", String(index));
        button.style.cursor = "pointer";

        button.addEventListener("click", () => selectAnswer(option, button));

        elements.options.appendChild(button);
      });
    }

    startTimer();
  }

  function startTimer() {
    clearTimer();

    state.timerId = setInterval(() => {
      if (state.paused || state.selected) return;

      state.seconds -= 1;
      setText(elements.timer, state.seconds);

      if (state.seconds <= 0) {
        clearTimer();
        timeOutQuestion();
      }
    }, 1000);
  }

  function timeOutQuestion() {
    if (state.selected) return;

    state.selected = true;
    state.wrong += 1;

    const q = state.roundQuestions[state.questionIndex];

    state.roundResults.push({
      question: q.question,
      options: q.options,
      answer: q.answer,
      selected: "",
      correct: false,
      explanation: q.explanation,
      timedOut: true
    });

    markCorrectOption(q);

    setText(
      elements.message,
      state.language === "en"
        ? `Time is up! Correct answer: ${q.answer}`
        : `Igihe kirangiye! Igisubizo nyacyo ni: ${q.answer}`
    );

    playSound(false);
    enableNextButton();
  }

  function selectAnswer(option, button) {
    if (state.selected || state.paused) return;

    state.selected = true;
    clearTimer();

    const q = state.roundQuestions[state.questionIndex];
    const isCorrect = normalise(option) === normalise(q.answer);

    if (elements.options) {
      elements.options
        .querySelectorAll("button")
        .forEach((el) => {
          el.disabled = true;
          el.style.opacity = "0.85";
        });
    }

    if (isCorrect) {
      state.correct += 1;
      state.score += POINTS_PER_CORRECT;

      if (button) {
        button.style.backgroundColor = "#d1fae5";
        button.style.borderColor = "#059669";
      }

      setText(
        elements.message,
        state.language === "en"
          ? "Correct! +10 points"
          : "Ni byo! +10 amanota"
      );

      playSound(true);
    } else {
      state.wrong += 1;

      if (button) {
        button.style.backgroundColor = "#fee2e2";
        button.style.borderColor = "#dc2626";
      }

      markCorrectOption(q);

      setText(
        elements.message,
        state.language === "en"
          ? `Incorrect. Correct answer: ${q.answer}`
          : `Si byo. Igisubizo nyacyo ni: ${q.answer}`
      );

      playSound(false);
    }

    state.roundResults.push({
      question: q.question,
      options: q.options,
      answer: q.answer,
      selected: option,
      correct: isCorrect,
      explanation: q.explanation,
      timedOut: false
    });

    setText(elements.score, state.score);
    enableNextButton();
  }

  function markCorrectOption(q) {
    if (!elements.options) return;

    elements.options.querySelectorAll("button").forEach((button) => {
      if (normalise(button.textContent) === normalise(q.answer)) {
        button.style.backgroundColor = "#d1fae5";
        button.style.borderColor = "#059669";
      }
    });
  }

  function enableNextButton() {
    if (elements.nextBtn) elements.nextBtn.disabled = false;
  }

  function nextQuestion() {
    if (!state.selected || state.paused) return;

    state.questionIndex += 1;

    if (state.questionIndex >= state.roundQuestions.length) {
      finishRound();
    } else {
      renderQuestion();
    }
  }

  function finishRound() {
    clearTimer();

    const total = state.roundQuestions.length;
    const percent = total ? Math.round((state.correct / total) * 100) : 0;

    state.completed.add(state.round);

    state.roundScores[state.round] = {
      score: state.correct * POINTS_PER_CORRECT,
      correct: state.correct,
      wrong: state.wrong,
      percent
    };

    if (percent >= UNLOCK_PERCENT && state.round < state.totalRounds) {
      state.unlocked = Math.max(state.unlocked, state.round + 1);
    }

    const best = Number(readString(KEYS.personalBest, "0")) || 0;

    if (state.score > best) {
      writeString(KEYS.personalBest, state.score);
    }

    saveProgress();

    setText(elements.finalScore, state.correct * POINTS_PER_CORRECT);
    setText(elements.resultPercent, `${percent}%`);
    setText(elements.finishedRound, state.round);
    setText(elements.correctCount, state.correct);
    setText(elements.wrongCount, state.wrong);

    setText(
      elements.resultMessage,
      percent >= 80
        ? (state.language === "en" ? "Excellent work!" : "Wakoze neza cyane!")
        : percent >= UNLOCK_PERCENT
          ? (state.language === "en" ? "Good job! Round completed." : "Ni byiza! Round yarangiye.")
          : (state.language === "en" ? "Keep practising and try again." : "Komeza witoze wongere ugerageze.")
    );

    if (elements.nextRoundBtn) {
      const hasNext = state.round < state.totalRounds;
      elements.nextRoundBtn.style.display = hasNext ? "" : "none";
      elements.nextRoundBtn.disabled =
        !hasNext || state.round + 1 > state.unlocked;

      elements.nextRoundBtn.textContent =
        state.round >= state.totalRounds
          ? "All Rounds Completed"
          : state.round + 1 <= state.unlocked
            ? `Next Round (${state.round + 1})`
            : `Score ${UNLOCK_PERCENT}% to Unlock Next Round`;
    }

    if (elements.restartBtn) {
      elements.restartBtn.textContent = "Retry Round";
    }

    showOnly(elements.resultScreen);
  }

  function renderRounds() {
    if (!elements.roundGrid) {
      showError("The rounds grid was not found in index.html.");
      return;
    }

    elements.roundGrid.replaceChildren();

    for (let round = 1; round <= state.totalRounds; round++) {
      const button = document.createElement("button");
      const isUnlocked = round <= state.unlocked;
      const isCompleted = state.completed.has(round);
      const roundInfo = state.roundScores[round];

      button.type = "button";
      button.className = "round-btn";
      button.textContent = isCompleted
        ? `Round ${round} ✓${roundInfo ? ` (${roundInfo.percent}%)` : ""}`
        : `Round ${round}`;

      button.disabled = !isUnlocked;
      button.setAttribute("aria-label", `Round ${round}`);

      if (!isUnlocked) {
        button.title = "Complete the previous round with at least 60% to unlock.";
        button.style.opacity = "0.5";
        button.style.cursor = "not-allowed";
      } else {
        button.style.cursor = "pointer";
        button.addEventListener("click", () => startQuiz(round));
      }

      elements.roundGrid.appendChild(button);
    }

    showOnly(elements.roundsScreen);
  }

  function showReview() {
    if (!elements.reviewList) return;

    elements.reviewList.replaceChildren();

    state.roundResults.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "review-item";

      const title = document.createElement("h3");
      title.textContent = `${index + 1}. ${item.question}`;
      card.appendChild(title);

      const chosen = document.createElement("p");
      chosen.textContent = item.timedOut
        ? (state.language === "en" ? "Your answer: Time expired" : "Igisubizo cyawe: Igihe cyarangiye")
        : (state.language === "en" ? `Your answer: ${item.selected || "No answer"}` : `Igisubizo cyawe: ${item.selected || "Nta gisubizo"}`);
      card.appendChild(chosen);

      const correct = document.createElement("p");
      correct.textContent = `${state.language === "en" ? "Correct answer" : "Igisubizo nyacyo"}: ${item.answer}`;
      card.appendChild(correct);

      const status = document.createElement("p");
      status.textContent = item.correct
        ? (state.language === "en" ? "Correct" : "Ni byo")
        : (state.language === "en" ? "Incorrect" : "Si byo");
      status.style.fontWeight = "bold";
      card.appendChild(status);

      if (item.explanation) {
        const explanation = document.createElement("p");
        explanation.textContent = item.explanation;
        card.appendChild(explanation);
      }

      elements.reviewList.appendChild(card);
    });

    setText(
      elements.reviewSummary,
      `${state.correct} correct / ${state.wrong} incorrect`
    );

    showOnly(elements.reviewScreen);
  }

  function togglePause() {
    if (!state.started) return;

    state.paused = !state.paused;

    if (elements.pauseBtn) {
      elements.pauseBtn.textContent = state.paused ? "Continue" : "Pause";
    }

    if (state.paused) {
      clearTimer();
      setText(
        elements.message,
        state.language === "en" ? "Quiz paused." : "Umukino uhagaritswe by'agateganyo."
      );
    } else if (!state.selected) {
      startTimer();
      setText(elements.message, "");
    }
  }

  function getAudio() {
    if (state.audio) return state.audio;

    const audio = new Audio("./mythica.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    state.audio = audio;
    return audio;
  }

  function updateMusic() {
    state.musicEnabled = elements.musicSwitch
      ? Boolean(elements.musicSwitch.checked)
      : readString(KEYS.music, "true") !== "false";

    writeString(KEYS.music, state.musicEnabled);

    if (!state.musicEnabled) {
      if (state.audio) state.audio.pause();
      return;
    }

    if (state.started) {
      getAudio().play().catch(() => {});
    }
  }

  function updateSound() {
    state.soundEnabled = elements.soundSwitch
      ? Boolean(elements.soundSwitch.checked)
      : readString(KEYS.sound, "true") !== "false";

    writeString(KEYS.sound, state.soundEnabled);
  }

  function playSound(correct) {
    if (!state.soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!state.audioContext) {
        state.audioContext = new AudioContextClass();
      }

      const context = state.audioContext;
      if (context.state === "suspended") context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = correct ? 880 : 220;
      gain.gain.value = 0.06;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch {}
  }

  function shareApp() {
    const text = "Test your knowledge with Quiz Master!";
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({ title: "Quiz Master 🇷🇼", text, url })
        .catch((error) => {
          if (error && error.name === "AbortError") return;
          copyShareLink(url);
        });
    } else {
      copyShareLink(url);
    }
  }

  async function copyShareLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      alert("✅ Link Copied!");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {}

      textarea.remove();
      alert(copied ? "✅ Link Copied!" : url);
    }
  }

  async function handleStart() {
    if (readString(KEYS.setup, "false") !== "true") {
      const setup = $("gameSetup");

      if (setup) {
        setup.style.display = "block";
        setup.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        alert("Please choose your language and quiz category first.");
      }
      return;
    }

    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    const savedRound = Number(readString(KEYS.current, "1")) || 1;
    startQuiz(Math.min(savedRound, state.unlocked));
  }

  function bindEvents() {
    if (elements.start) {
      elements.start.addEventListener("click", handleStart);
    }

    if (elements.continue) {
      elements.continue.addEventListener("click", handleStart);
    }

    if (elements.roundsBtn) {
      elements.roundsBtn.addEventListener("click", async () => {
        if (!state.questions.length && !(await loadQuestions())) return;
        renderRounds();
      });
    }

    if (elements.roundsBack) {
      elements.roundsBack.addEventListener("click", showHome);
    }

    if (elements.nextBtn) {
      elements.nextBtn.addEventListener("click", nextQuestion);
    }

    if (elements.pauseBtn) {
      elements.pauseBtn.addEventListener("click", togglePause);
    }

    if (elements.quizHomeBtn) {
      elements.quizHomeBtn.addEventListener("click", showHome);
    }

    if (elements.nextRoundBtn) {
      elements.nextRoundBtn.addEventListener("click", () => {
        if (state.round < state.totalRounds && state.round + 1 <= state.unlocked) {
          startQuiz(state.round + 1);
        }
      });
    }

    if (elements.restartBtn) {
      elements.restartBtn.addEventListener("click", () => startQuiz(state.round));
    }

    if (elements.reviewBtn) {
      elements.reviewBtn.addEventListener("click", showReview);
    }

    if (elements.resultHomeBtn) {
      elements.resultHomeBtn.addEventListener("click", showHome);
    }

    if (elements.reviewRetryBtn) {
      elements.reviewRetryBtn.addEventListener("click", () => startQuiz(state.round));
    }

    if (elements.reviewBackBtn) {
      elements.reviewBackBtn.addEventListener("click", () => showOnly(elements.resultScreen));
    }

    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener("click", () => {
        if (elements.musicSwitch) {
          elements.musicSwitch.checked =
            readString(KEYS.music, "true") !== "false";
        }

        if (elements.soundSwitch) {
          elements.soundSwitch.checked =
            readString(KEYS.sound, "true") !== "false";
        }

        showOnly(elements.settingsScreen);
      });
    }

    if (elements.settingsBackBtn) {
      elements.settingsBackBtn.addEventListener("click", showHome);
    }

    if (elements.musicSwitch) {
      elements.musicSwitch.addEventListener("change", updateMusic);
    }

    if (elements.soundSwitch) {
      elements.soundSwitch.addEventListener("change", updateSound);
    }

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener("click", shareApp);
    }

    if (elements.errorRestartBtn) {
      elements.errorRestartBtn.addEventListener("click", async () => {
        const loaded = await loadQuestions();
        if (loaded) startQuiz(1);
      });
    }

    if (elements.errorHomeBtn) {
      elements.errorHomeBtn.addEventListener("click", showHome);
    }

    // The setup script in index.html fires this event after selection.
    window.addEventListener("quizmaster:setup", async () => {
      state.language = getLanguage();
      state.mode = getMode();

      state.questions = [];
      state.allQuestions = [];
      state.completed.clear();
      state.unlocked = 1;
      state.roundScores = {};

      const loaded = await loadQuestions();
      if (loaded) startQuiz(1);
    });

    // Avoid leaving the countdown running in a hidden/background page.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.started && !state.paused) {
        clearTimer();
      } else if (
        !document.hidden &&
        state.started &&
        !state.paused &&
        !state.selected &&
        state.roundQuestions[state.questionIndex]
      ) {
        startTimer();
      }
    });
  }

  function init() {
    state.musicEnabled = readString(KEYS.music, "true") !== "false";
    state.soundEnabled = readString(KEYS.sound, "true") !== "false";

    bindEvents();
    loadProgress();

    // Load question data in advance so the rounds count is ready.
    loadQuestions().then((loaded) => {
      if (loaded) {
        console.info(
          `Quiz Master loaded ${state.questions.length} valid questions: ${state.totalRounds} rounds.`
        );
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
