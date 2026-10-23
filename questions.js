
"use strict";

/* =====================================================
   QUIZ MASTER 🇷🇼
   index.html + questions.json
   30 seconds per question
   10 questions per round
   ===================================================== */

const QUESTIONS_FILE = "./questions.json";
const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 30;
const POINTS_PER_CORRECT = 10;
const UNLOCK_PERCENT = 60;
const MUSIC_FILE = "./mythica.mp3";

const KEYS = {
  language: "quizmasterLanguage",
  mode: "quizmasterMode",
  setup: "quizmasterSetupComplete",
  difficulty: "quizmasterDifficulty",
  progress: "quizmasterProgress",
  currentRound: "quizmasterCurrentRound",
  music: "quizmasterMusic",
  sound: "quizmasterSound",
  best: "quizmasterPersonalBest",
  totalScore: "quizmasterTotalScore"
};

const WORDS = {
  rw: {
    question: "Ikibazo",
    correct: "Ni byo!",
    incorrect: "Si byo.",
    timeUp: "Igihe kirarangiye!",
    next: "Ikibazo gikurikira",
    finish: "Reba amanota",
    round: "Round",
    completed: "Warangije iyi Round!",
    unlocked: "Round ikurikira yafunguwe!",
    locked: "Ukeneye nibura 60% kugira ngo ufungure Round ikurikira.",
    correctAnswer: "Igisubizo cy'ukuri",
    explanation: "Ibisobanuro",
    loadingError: "Habaye ikibazo mu gufungura ibibazo.",
    noQuestions: "Nta bibazo bibonetse muri iki cyiciro no mu rurimi wahisemo.",
    resume: "Komeza umukino",
    start: "Tangira umukino",
    paused: "Umukino urahagaritswe. Kanda Komeza.",
    answer: "Wasubije",
    noReview: "Nta bisubizo byo gusubiramo bihari."
  },
  en: {
    question: "Question",
    correct: "Correct!",
    incorrect: "Incorrect.",
    timeUp: "Time is up!",
    next: "Next Question",
    finish: "View Results",
    round: "Round",
    completed: "You completed this round!",
    unlocked: "The next round is unlocked!",
    locked: "You need at least 60% to unlock the next round.",
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    loadingError: "There was a problem loading the questions.",
    noQuestions: "No questions found for this category and language.",
    resume: "Continue Game",
    start: "Start Game",
    paused: "The game is paused. Press Resume.",
    answer: "Your answer",
    noReview: "There are no answers to review."
  }
};

let allQuestions = [];
let roundQuestions = [];
let currentRound = 1;
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let streak = 0;
let timeLeft = TIME_PER_QUESTION;
let timerInterval = null;
let gameActive = false;
let paused = false;
let answered = false;
let loading = false;
let reviewItems = [];
let musicAudio = null;

let selectedLanguage = "rw";
let selectedMode = "traffic";
let selectedDifficulty = "mixed";

function el(id) {
  return document.getElementById(id);
}

function text(key) {
  return WORDS[selectedLanguage]?.[key] || key;
}

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.warn("Could not save setting:", error);
  }
}

function readObject(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

function saveObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save progress:", error);
  }
}

function translated(value, fallback = "") {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const preferred = value[selectedLanguage];
    if (typeof preferred === "string" && preferred.trim()) {
      return preferred;
    }

    const other = value[selectedLanguage === "rw" ? "en" : "rw"];
    if (typeof other === "string" && other.trim()) return other;
  }

  return fallback;
}

function showScreen(id) {
  const screenIds = [
    "homeScreen",
    "roundsScreen",
    "quizScreen",
    "resultScreen",
    "reviewScreen",
    "settingsScreen",
    "errorScreen"
  ];

  screenIds.forEach((screenId) => {
    const screen = el(screenId);
    if (!screen) return;

    const active = screenId === id;
    screen.hidden = !active;
    screen.style.display = active ? "" : "none";
  });
}

function showError(message) {
  stopTimer();

  const errorScreen = el("errorScreen");
  const errorMessage = el("errorMessage");

  if (errorMessage) errorMessage.textContent = message;

  if (errorScreen) showScreen("errorScreen");
  else window.alert(message);
}

function getProgress() {
  return readObject(KEYS.progress, {});
}

function getProgressKey() {
  return `${selectedMode}_${selectedLanguage}`;
}

function getModeProgress() {
  const progress = getProgress();
  return progress[getProgressKey()] || {};
}

function saveModeProgress(changes) {
  const progress = getProgress();
  const key = getProgressKey();

  progress[key] = {
    ...(progress[key] || {}),
    ...changes
  };

  saveObject(KEYS.progress, progress);
}

function getUnlockedRound() {
  return Math.max(1, Number(getModeProgress().unlockedRound) || 1);
}

function setUnlockedRound(round) {
  saveModeProgress({
    unlockedRound: Math.max(getUnlockedRound(), round)
  });
}

function getSavedRound() {
  const saved = Number(getModeProgress().currentRound) || 1;
  return Math.min(Math.max(1, saved), Math.max(1, getRoundCount()));
}

function normalizeQuestion(raw, index, mode) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Question ${index + 1}: invalid question object.`);
  }

  const question = raw.question && typeof raw.question === "object"
    ? raw.question
    : {
        rw: raw.question_rw || raw.question || "",
        en: raw.question_en || raw.question || ""
      };

  let options = raw.options;

  if (Array.isArray(options)) {
    // Legacy format: a single options array.
    options = { rw: options, en: options };
  } else if (!options || typeof options !== "object") {
    options = {
      rw: raw.options_rw,
      en: raw.options_en
    };
  }

  if (!Array.isArray(options.rw) || !Array.isArray(options.en)) {
    throw new Error(
      `Question ${index + 1}: options.rw and options.en must be arrays.`
    );
  }

  if (
    options.rw.length < 2 ||
    options.en.length < 2 ||
    options.rw.some(v => typeof v !== "string" || !v.trim()) ||
    options.en.some(v => typeof v !== "string" || !v.trim())
  ) {
    throw new Error(`Question ${index + 1}: invalid answer options.`);
  }

  let correctIndex = raw.correctIndex;

  if (!Number.isInteger(correctIndex)) {
    const answer = raw.answer;

    if (Number.isInteger(answer)) {
      correctIndex = answer;
    } else if (typeof answer === "string") {
      correctIndex = options.rw.indexOf(answer);

      if (correctIndex < 0) {
        correctIndex = options.en.indexOf(answer);
      }
    } else if (answer && typeof answer === "object") {
      correctIndex = options.rw.indexOf(answer.rw);

      if (correctIndex < 0) {
        correctIndex = options.en.indexOf(answer.en);
      }
    }
  }

  if (
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.rw.length ||
    correctIndex >= options.en.length
  ) {
    throw new Error(
      `Question ${index + 1}: correctIndex is invalid.`
    );
  }

  const questionRW = translatedForValidation(question, "rw");
  const questionEN = translatedForValidation(question, "en");

  if (!questionRW || !questionEN) {
    throw new Error(
      `Question ${index + 1}: question must have rw and en text.`
    );
  }

  return {
    id: raw.id || `${mode}-${index + 1}`,
    mode,
    category: raw.category || {
      rw: mode === "traffic"
        ? "Amategeko y'umuhanda"
        : "Ubumenyi rusange",
      en: mode === "traffic"
        ? "Road Traffic Rules"
        : "General Knowledge"
    },
    question,
    options,
    correctIndex,
    explanation: raw.explanation || { rw: "", en: "" },
    difficulty: String(raw.difficulty || "mixed").toLowerCase()
  };
}

function translatedForValidation(value, language) {
  if (typeof value === "string") return value.trim();

  if (value && typeof value === "object") {
    return typeof value[language] === "string"
      ? value[language].trim()
      : "";
  }

  return "";
}

function validateJSON(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      'questions.json must contain "traffic" and "general" arrays.'
    );
  }

  if (!Array.isArray(data.traffic)) {
    throw new Error('Missing "traffic" array in questions.json.');
  }

  if (!Array.isArray(data.general)) {
    throw new Error('Missing "general" array in questions.json.');
  }

  const traffic = data.traffic.map((q, i) =>
    normalizeQuestion(q, i, "traffic")
  );

  const general = data.general.map((q, i) =>
    normalizeQuestion(q, i, "general")
  );

  return [...traffic, ...general];
}

async function loadQuestions() {
  if (loading) return false;
  loading = true;

  try {
    const response = await fetch(QUESTIONS_FILE, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load questions.json (HTTP ${response.status}).`
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "questions.json is not valid JSON. Check commas and brackets."
      );
    }

    allQuestions = validateJSON(data);
    loading = false;
    return true;
  } catch (error) {
    loading = false;
    console.error("Quiz loading error:", error);
    showError(error.message || text("loadingError"));
    return false;
  }
}

function getAvailableQuestions() {
  return allQuestions.filter(q => {
    if (q.mode !== selectedMode) return false;

    if (
      selectedDifficulty !== "mixed" &&
      q.difficulty !== selectedDifficulty
    ) {
      return false;
    }

    const questionText = translated(q.question);
    const options = q.options[selectedLanguage];

    return (
      questionText.trim() !== "" &&
      Array.isArray(options) &&
      q.correctIndex >= 0 &&
      q.correctIndex < options.length
    );
  });
}

function getRoundCount() {
  return Math.ceil(
    getAvailableQuestions().length / QUESTIONS_PER_ROUND
  );
}

function getQuestionsForRound(round) {
  const questions = getAvailableQuestions();
  const start = (round - 1) * QUESTIONS_PER_ROUND;

  return questions.slice(start, start + QUESTIONS_PER_ROUND);
}

function updateText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function updateProgressBar() {
  const bar = el("progressBar");
  if (!bar) return;

  const percent = roundQuestions.length
    ? currentQuestionIndex / roundQuestions.length * 100
    : 0;

  bar.style.width = `${percent}%`;
  bar.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function updateHeader() {
  updateText(
    "questionNumber",
    `${text("question")} ${currentQuestionIndex + 1}/${roundQuestions.length}`
  );

  updateText("roundDisplay", `${text("round")} ${currentRound}`);
  updateText("score", String(score));
  updateText("timer", String(timeLeft));
  updateProgressBar();

  const q = roundQuestions[currentQuestionIndex];

  if (q) {
    updateText("category", translated(q.category));
  }
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  stopTimer();
  timeLeft = TIME_PER_QUESTION;
  updateText("timer", String(timeLeft));

  timerInterval = setInterval(() => {
    if (!gameActive || paused || answered) return;

    timeLeft -= 1;
    updateText("timer", String(timeLeft));

    if (timeLeft <= 0) {
      stopTimer();
      timeExpired();
    }
  }, 1000);
}

function disableOptions() {
  const options = el("options");
  if (!options) return;

  options.querySelectorAll("button").forEach(button => {
    button.disabled = true;
  });
}

function renderQuestion() {
  if (currentQuestionIndex >= roundQuestions.length) {
    finishRound();
    return;
  }

  const q = roundQuestions[currentQuestionIndex];

  answered = false;

  updateText("question", translated(q.question));
  updateText("message", "");

  const optionBox = el("options");

  if (optionBox) {
    optionBox.replaceChildren();

    q.options[selectedLanguage].forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";
      button.textContent = option;
      button.dataset.index = String(index);

      button.addEventListener("click", () => answerQuestion(index));

      optionBox.appendChild(button);
    });
  }

  const nextButton = el("nextBtn");

  if (nextButton) {
    nextButton.disabled = true;
    nextButton.textContent =
      currentQuestionIndex === roundQuestions.length - 1
        ? text("finish")
        : text("next");
  }

  updateHeader();
  startTimer();
}

function answerQuestion(index) {
  if (!gameActive || paused || answered) return;

  const q = roundQuestions[currentQuestionIndex];
  if (!q) return;

  answered = true;
  stopTimer();
  disableOptions();

  const correct = index === q.correctIndex;
  const optionBox = el("options");

  if (optionBox) {
    const buttons = optionBox.querySelectorAll("button");

    buttons.forEach((button, i) => {
      if (i === q.correctIndex) button.classList.add("correct");
      if (i === index && !correct) button.classList.add("incorrect");
    });
  }

  if (correct) {
    correctCount++;
    score += POINTS_PER_CORRECT;
    streak++;

    if (streak % 3 === 0) score += 5;

    updateText("message", text("correct"));
  } else {
    wrongCount++;
    streak = 0;
    updateText(
      "message",
      `${text("incorrect")} ${text("correctAnswer")}: ` +
      q.options[selectedLanguage][q.correctIndex]
    );
  }

  const explanation = translated(q.explanation);

  if (explanation) {
    updateText(
      "message",
      `${el("message")?.textContent || ""} ${explanation}`.trim()
    );
  }

  reviewItems.push({
    question: translated(q.question),
    options: q.options[selectedLanguage].slice(),
    selectedIndex: index,
    correctIndex: q.correctIndex,
    explanation,
    correct
  });

  updateText("score", String(score));

  const nextButton = el("nextBtn");
  if (nextButton) nextButton.disabled = false;
}

function timeExpired() {
  if (!gameActive || answered) return;

  answered = true;
  wrongCount++;
  streak = 0;

  const q = roundQuestions[currentQuestionIndex];
  if (!q) return;

  disableOptions();

  const correctButton = el("options")?.querySelector(
    `button[data-index="${q.correctIndex}"]`
  );

  if (correctButton) correctButton.classList.add("correct");

  const explanation = translated(q.explanation);

  updateText(
    "message",
    `${text("timeUp")} ${text("correctAnswer")}: ` +
    q.options[selectedLanguage][q.correctIndex] +
    (explanation ? ` — ${explanation}` : "")
  );

  reviewItems.push({
    question: translated(q.question),
    options: q.options[selectedLanguage].slice(),
    selectedIndex: -1,
    correctIndex: q.correctIndex,
    explanation,
    correct: false
  });

  const nextButton = el("nextBtn");
  if (nextButton) nextButton.disabled = false;
}

function nextQuestion() {
  if (!gameActive || paused || !answered) return;

  currentQuestionIndex++;

  if (currentQuestionIndex >= roundQuestions.length) {
    finishRound();
  } else {
    renderQuestion();
  }
}

function startRound(round) {
  if (round > getUnlockedRound()) {
    showError(text("locked"));
    return;
  }

  if (round < 1 || round > getRoundCount()) {
    showError(text("noQuestions"));
    return;
  }

  roundQuestions = getQuestionsForRound(round);

  if (!roundQuestions.length) {
    showError(text("noQuestions"));
    return;
  }

  currentRound = round;
  currentQuestionIndex = 0;
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  streak = 0;
  reviewItems = [];
  paused = false;
  answered = false;
  gameActive = true;

  saveModeProgress({ currentRound: round });
  writeStorage(KEYS.currentRound, round);

  showScreen("quizScreen");
  renderQuestion();
}

function finishRound() {
  stopTimer();
  gameActive = false;
  paused = false;

  const total = roundQuestions.length;
  const percent = total
    ? Math.round(correctCount / total * 100)
    : 0;

  if (percent >= UNLOCK_PERCENT) {
    setUnlockedRound(
      Math.min(currentRound + 1, getRoundCount())
    );
  }

  const progress = getModeProgress();

  saveModeProgress({
    currentRound,
    lastScore: score,
    lastPercent: percent,
    lastCorrect: correctCount,
    lastWrong: wrongCount,
    personalBest: Math.max(
      Number(progress.personalBest) || 0,
      score
    )
  });

  writeStorage(
    KEYS.best,
    Math.max(Number(readStorage(KEYS.best, "0")) || 0, score)
  );

  writeStorage(
    KEYS.totalScore,
    (Number(readStorage(KEYS.totalScore, "0")) || 0) + score
  );

  updateText("finalScore", String(score));
  updateText("resultPercent", `${percent}%`);
  updateText("finishedRound", `${text("round")} ${currentRound}`);
  updateText("correctCount", String(correctCount));
  updateText("wrongCount", String(wrongCount));

  let result = text("completed");

  if (percent >= UNLOCK_PERCENT && currentRound < getRoundCount()) {
    result += " " + text("unlocked");
  } else if (percent < UNLOCK_PERCENT) {
    result += " " + text("locked");
  }

  updateText("resultMessage", result);

  const nextRoundButton = el("nextRoundBtn");

  if (nextRoundButton) {
    const canContinue =
      currentRound < getRoundCount() &&
      currentRound + 1 <= getUnlockedRound();

    nextRoundButton.disabled = !canContinue;
    nextRoundButton.hidden = !canContinue;
  }

  showScreen("resultScreen");
}

function togglePause() {
  if (!gameActive) return;

  paused = !paused;

  const button = el("pauseBtn");

  if (button) {
    button.textContent = paused
      ? (selectedLanguage === "rw" ? "Komeza" : "Resume")
      : (selectedLanguage === "rw" ? "Hagarika gato" : "Pause");
  }

  if (paused) {
    stopTimer();
    updateText("message", text("paused"));
  } else if (!answered) {
    updateText("message", "");
    startTimer();
  }
}

function renderRounds() {
  const grid = el("roundGrid");
  if (!grid) return;

  grid.replaceChildren();

  const count = getRoundCount();
  const unlocked = getUnlockedRound();

  for (let round = 1; round <= count; round++) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "round-btn";
    button.textContent = `${text("round")} ${round}`;

    if (round > unlocked) {
      button.disabled = true;
      button.classList.add("locked");
    } else {
      button.addEventListener("click", () => startRound(round));
    }

    grid.appendChild(button);
  }

  showScreen("roundsScreen");
}

function showReview() {
  const list = el("reviewList");
  if (!list) return;

  list.replaceChildren();

  updateText(
    "reviewSummary",
    `${text("correctAnswer")}: ${correctCount} | ${text("incorrect")}: ${wrongCount}`
  );

  if (!reviewItems.length) {
    list.textContent = text("noReview");
    showScreen("reviewScreen");
    return;
  }

  reviewItems.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "review-item";

    const question = document.createElement("p");
    question.textContent = `${index + 1}. ${item.question}`;
    card.appendChild(question);

    const correct = document.createElement("p");
    correct.textContent =
      `${text("correctAnswer")}: ${item.options[item.correctIndex]}`;
    card.appendChild(correct);

    if (item.selectedIndex >= 0) {
      const selected = document.createElement("p");
      selected.textContent =
        `${text("answer")}: ${item.options[item.selectedIndex]}`;
      card.appendChild(selected);
    }

    if (item.explanation) {
      const explanation = document.createElement("p");
      explanation.textContent =
        `${text("explanation")}: ${item.explanation}`;
      card.appendChild(explanation);
    }

    list.appendChild(card);
  });

  showScreen("reviewScreen");
}

function startMusic() {
  if (readStorage(KEYS.music, "true") === "false") return;

  try {
    if (!musicAudio) {
      musicAudio = new Audio(MUSIC_FILE);
      musicAudio.loop = true;
      musicAudio.volume = 0.25;
    }

    musicAudio.play().catch(() => {});
  } catch (error) {
    console.warn("Music could not play:", error);
  }
}

function stopMusic() {
  if (musicAudio) musicAudio.pause();
}

function bind(id, callback) {
  const node = el(id);
  if (node) node.addEventListener("click", callback);
}

function goHome() {
  stopTimer();
  gameActive = false;
  paused = false;
  showScreen("homeScreen");
}

function applySettings() {
  selectedLanguage = readStorage(KEYS.language, "rw");
  selectedMode = readStorage(KEYS.mode, "traffic");
  selectedDifficulty = readStorage(KEYS.difficulty, "mixed");

  if (!["rw", "en"].includes(selectedLanguage)) {
    selectedLanguage = "rw";
  }

  if (!["traffic", "general"].includes(selectedMode)) {
    selectedMode = "traffic";
  }

  const musicSwitch = el("musicSwitch");
  if (musicSwitch) {
    musicSwitch.checked = readStorage(KEYS.music, "true") !== "false";

    musicSwitch.addEventListener("change", () => {
      writeStorage(KEYS.music, musicSwitch.checked);
      if (musicSwitch.checked) startMusic();
      else stopMusic();
    });
  }

  const soundSwitch = el("soundSwitch");
  if (soundSwitch) {
    soundSwitch.checked = readStorage(KEYS.sound, "true") !== "false";

    soundSwitch.addEventListener("change", () => {
      writeStorage(KEYS.sound, soundSwitch.checked);
    });
  }
}

async function startNewGame() {
  applySettings();

  if (!(await loadQuestions())) return;

  if (!getAvailableQuestions().length) {
    showError(text("noQuestions"));
    return;
  }

  startMusic();
  renderRounds();
}

async function continueGame() {
  applySettings();

  if (!(await loadQuestions())) return;

  if (!getAvailableQuestions().length) {
    showError(text("noQuestions"));
    return;
  }

  startMusic();

  startRound(
    Math.min(getSavedRound(), getUnlockedRound())
  );
}

function initializeQuizMaster() {
  applySettings();

  bind("startBtn", startNewGame);
  bind("continueBtn", continueGame);

  bind("roundsBtn", async () => {
    applySettings();
    if (await loadQuestions()) renderRounds();
  });

  bind("settingsBtn", () => showScreen("settingsScreen"));
  bind("roundsBackBtn", goHome);
  bind("quizHomeBtn", goHome);
  bind("resultHomeBtn", goHome);
  bind("settingsBackBtn", goHome);
  bind("errorHomeBtn", goHome);

  bind("nextBtn", nextQuestion);
  bind("pauseBtn", togglePause);

  bind("nextRoundBtn", () => {
    if (currentRound < getRoundCount()) {
      startRound(currentRound + 1);
    } else {
      renderRounds();
    }
  });

  bind("restartBtn", () => startRound(currentRound));
  bind("reviewBtn", showReview);
  bind("reviewBackBtn", () => showScreen("resultScreen"));
  bind("reviewRetryBtn", () => startRound(currentRound));

  bind("errorRestartBtn", async () => {
    if (await loadQuestions()) renderRounds();
  });

  bind("shareBtn", async () => {
    const data = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        window.alert("✅ Link Copied!");
      }
    } catch (error) {
      if (error?.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(data.url);
        window.alert("✅ Link Copied!");
      } catch {
        console.warn("Could not copy the link.");
      }
    }
  });

  document.addEventListener("quizmaster:setup", (event) => {
    const detail = event.detail || {};

    if (["rw", "en"].includes(detail.language)) {
      selectedLanguage = detail.language;
      writeStorage(KEYS.language, selectedLanguage);
    }

    if (["traffic", "general"].includes(detail.mode)) {
      selectedMode = detail.mode;
      writeStorage(KEYS.mode, selectedMode);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameActive && !paused) {
      togglePause();
    }
  });

  window.addEventListener("beforeunload", stopTimer);

  showScreen("homeScreen");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeQuizMaster);
} else {
  initializeQuizMaster();
}
