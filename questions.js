/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE - SAFE FULL VERSION
   ---------------------------------------------------------
   Compatible with existing Quiz Master index.html
   ---------------------------------------------------------
   - Loads ./questions.json
   - Dynamic rounds from questions.json
   - 10 questions per round
   - Start / Continue / Quiz Rounds
   - Quiz / Result / Review / Error / Settings
   - Retry / Restart / Next Question / Next Round
   - Music + Sound
   - Progress saved with localStorage
   - Stars / Achievements / Personal Best
   - Daily Challenge
   - Does NOT change HTML/CSS design
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;
const UNLOCK_PERCENT = 60;
const QUESTIONS_FILE = "./questions.json";

/* =========================================================
   STORAGE KEYS
   ========================================================= */

const STORAGE = {
  progress: "quizmasterProgress",
  unlockedRounds: "quizmasterUnlockedRounds",
  currentRound: "quizmasterCurrentRound",
  music: "quizmasterMusic",
  sound: "quizmasterSound",
  completedRounds: "quizmasterCompletedRounds",
  roundStars: "quizmasterRoundStars",
  achievements: "quizmasterAchievements",
  personalBest: "quizmasterPersonalBest",
  totalScore: "quizmasterTotalScore",
  dailyChallenge: "quizmasterDailyChallenge",
  usedQuestions: "quizmasterUsedQuestions"
};

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let allQuestions = [];
let TOTAL_ROUNDS = 0;

let currentRound = 1;
let currentQuestions = [];
let currentQuestionIndex = 0;

let score = 0;
let correctAnswers = 0;
let wrongAnswers = 0;

let answeredCurrentQuestion = false;
let currentQuestionTimedOut = false;

let timerInterval = null;
let timeLeft = TIME_PER_QUESTION;

let reviewData = [];

let musicEnabled = true;
let soundEnabled = true;

let musicAudio = null;

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function getElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function safeText(element, value) {
  if (element) {
    element.textContent = value == null ? "" : String(value);
  }
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/* =========================================================
   LOCAL STORAGE HELPERS
   ========================================================= */

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    if (!value) return fallback;

    return JSON.parse(value);
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

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Storage remove error:", key, error);
  }
}

/* =========================================================
   AUDIO
   ========================================================= */

function playSound(type = "click") {
  if (!soundEnabled) return;

  try {
    let frequency = 500;
    let duration = 0.08;

    if (type === "correct") {
      frequency = 750;
      duration = 0.12;
    }

    if (type === "wrong") {
      frequency = 220;
      duration = 0.16;
    }

    if (type === "finish") {
      frequency = 900;
      duration = 0.2;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    oscillator.stop(context.currentTime + duration);

    oscillator.addEventListener("ended", () => {
      try {
        context.close();
      } catch (_) {}
    });
  } catch (error) {
    console.warn("Sound error:", error);
  }
}

function startMusic() {
  if (!musicEnabled) return;

  try {
    if (!musicAudio) {
      musicAudio = new Audio("./music.mp3");
      musicAudio.loop = true;
      musicAudio.volume = 0.35;
    }

    const playPromise = musicAudio.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        /* Browser may block autoplay until user interaction */
      });
    }
  } catch (error) {
    console.warn("Music error:", error);
  }
}

function stopMusic() {
  try {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
    }
  } catch (error) {
    console.warn("Stop music error:", error);
  }
}

function setMusicEnabled(enabled) {
  musicEnabled = Boolean(enabled);

  localStorage.setItem(
    STORAGE.music,
    musicEnabled ? "true" : "false"
  );

  updateSettingsSwitches();

  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);

  localStorage.setItem(
    STORAGE.sound,
    soundEnabled ? "true" : "false"
  );

  updateSettingsSwitches();

  if (soundEnabled) {
    playSound("click");
  }
}

function loadAudioSettings() {
  const savedMusic = localStorage.getItem(STORAGE.music);
  const savedSound = localStorage.getItem(STORAGE.sound);

  musicEnabled = savedMusic !== "false";
  soundEnabled = savedSound !== "false";

  updateSettingsSwitches();
}

function updateSettingsSwitches() {
  const musicSwitch = getElement("musicSwitch");
  const soundSwitch = getElement("soundSwitch");

  if (musicSwitch) {
    musicSwitch.classList.toggle("on", musicEnabled);
    musicSwitch.setAttribute(
      "aria-pressed",
      musicEnabled ? "true" : "false"
    );
  }

  if (soundSwitch) {
    soundSwitch.classList.toggle("on", soundEnabled);
    soundSwitch.setAttribute(
      "aria-pressed",
      soundEnabled ? "true" : "false"
    );
  }
}

/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  const screen = document.getElementById(screenId);

  if (screen) {
    screen.classList.add("active");
  }
}

/* =========================================================
   QUESTIONS LOADING
   ========================================================= */

async function loadQuestions() {
  try {
    const response = await fetch(
      QUESTIONS_FILE + "?v=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Could not load questions.json. HTTP " + response.status
      );
    }

    const data = await response.json();

    let questions = [];

    if (Array.isArray(data)) {
      questions = data;
    } else if (
      data &&
      Array.isArray(data.questions)
    ) {
      questions = data.questions;
    } else {
      throw new Error(
        "questions.json must contain an array of questions."
      );
    }

    const validQuestions = [];

    questions.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const questionText =
        typeof item.question === "string"
          ? item.question.trim()
          : "";

      const options = Array.isArray(item.options)
        ? item.options
            .filter(
              (option) =>
                typeof option === "string" &&
                option.trim() !== ""
            )
            .map((option) => option.trim())
        : [];

      const answer =
        typeof item.answer === "string"
          ? item.answer.trim()
          : "";

      const category =
        typeof item.category === "string" &&
        item.category.trim()
          ? item.category.trim()
          : "General Knowledge";

      if (
        !questionText ||
        options.length < 2 ||
        !answer ||
        !options.includes(answer)
      ) {
        console.warn(
          "Skipping invalid question at index:",
          index
        );

        return;
      }

      validQuestions.push({
        id:
          item.id != null
            ? String(item.id)
            : "question-" + (index + 1),

        question: questionText,

        question_rw:
          typeof item.question_rw === "string"
            ? item.question_rw.trim()
            : "",

        options: [...options],

        answer,

        category
      });
    });

    if (validQuestions.length < QUESTIONS_PER_ROUND) {
      throw new Error(
        "At least " +
          QUESTIONS_PER_ROUND +
          " valid questions are required."
      );
    }

    allQuestions = validQuestions;

    TOTAL_ROUNDS = Math.floor(
      allQuestions.length / QUESTIONS_PER_ROUND
    );

    if (TOTAL_ROUNDS < 1) {
      throw new Error(
        "Not enough questions to create a round."
      );
    }

    const savedRound = getNumber(
      localStorage.getItem(STORAGE.currentRound),
      1
    );

    currentRound = Math.min(
      Math.max(savedRound, 1),
      TOTAL_ROUNDS
    );

    ensureUnlockedRounds();

    console.log(
      "Quiz Master loaded:",
      allQuestions.length,
      "questions /",
      TOTAL_ROUNDS,
      "rounds"
    );

    return true;
  } catch (error) {
    console.error("Questions loading error:", error);

    showError(
      "Could not load the quiz questions. Please check that questions.json is valid and is in the same folder as index.html."
    );

    return false;
  }
}

/* =========================================================
   ROUND / UNLOCK SYSTEM
   ========================================================= */

function getUnlockedRounds() {
  const saved = getNumber(
    localStorage.getItem(STORAGE.unlockedRounds),
    1
  );

  return Math.min(
    Math.max(saved, 1),
    Math.max(TOTAL_ROUNDS, 1)
  );
}

function setUnlockedRounds(value) {
  const safeValue = Math.min(
    Math.max(getNumber(value, 1), 1),
    Math.max(TOTAL_ROUNDS, 1)
  );

  localStorage.setItem(
    STORAGE.unlockedRounds,
    String(safeValue)
  );
}

function ensureUnlockedRounds() {
  if (TOTAL_ROUNDS < 1) return;

  const saved = localStorage.getItem(
    STORAGE.unlockedRounds
  );

  if (!saved) {
    setUnlockedRounds(1);
  } else {
    setUnlockedRounds(getUnlockedRounds());
  }
}

function isRoundUnlocked(round) {
  return round <= getUnlockedRounds();
}

function unlockNextRoundIfNeeded(percent) {
  if (percent < UNLOCK_PERCENT) return;

  const nextRound = currentRound + 1;

  if (nextRound <= TOTAL_ROUNDS) {
    const unlocked = getUnlockedRounds();

    if (nextRound > unlocked) {
      setUnlockedRounds(nextRound);
    }
  }
}

/* =========================================================
   ROUND QUESTIONS
   ========================================================= */

function getUsedQuestions() {
  const used = readJSON(
    STORAGE.usedQuestions,
    []
  );

  return Array.isArray(used) ? used : [];
}

function saveUsedQuestions(used) {
  writeJSON(STORAGE.usedQuestions, used);
}

function selectQuestionsForRound(round) {
  const startIndex =
    (round - 1) * QUESTIONS_PER_ROUND;

  const endIndex =
    startIndex + QUESTIONS_PER_ROUND;

  /*
   * Primary system:
   * Use questions belonging to the round position.
   *
   * If the questions are exhausted or the last round has
   * fewer than 10 questions, the round is not created because
   * TOTAL_ROUNDS uses Math.floor().
   */

  let selected = allQuestions.slice(
    startIndex,
    endIndex
  );

  /*
   * If a round somehow does not contain enough questions,
   * use a safe fallback from the complete question pool.
   */

  if (selected.length < QUESTIONS_PER_ROUND) {
    selected = shuffle(allQuestions).slice(
      0,
      QUESTIONS_PER_ROUND
    );
  }

  /*
   * Shuffle the questions so each round does not always
   * appear in exactly the same order.
   */

  selected = shuffle(selected);

  /*
   * Shuffle options separately.
   */

  return selected.map((question) => ({
    ...question,
    options: shuffle(question.options)
  }));
}

/* =========================================================
   START QUIZ
   ========================================================= */

async function startQuiz() {
  playSound("click");

  if (!allQuestions.length) {
    const loaded = await loadQuestions();

    if (!loaded) return;
  }

  startNewRound(1);
}

async function continueQuiz() {
  playSound("click");

  if (!allQuestions.length) {
    const loaded = await loadQuestions();

    if (!loaded) return;
  }

  const saved = readJSON(
    STORAGE.progress,
    null
  );

  if (
    saved &&
    Array.isArray(saved.questions) &&
    saved.questions.length > 0
  ) {
    restoreProgress(saved);
    return;
  }

  startNewRound(
    getNumber(
      localStorage.getItem(STORAGE.currentRound),
      1
    )
  );
}

function startNewRound(round) {
  if (!allQuestions.length) {
    showError(
      "Questions are not loaded yet. Please try again."
    );

    return;
  }

  if (
    round < 1 ||
    round > TOTAL_ROUNDS
  ) {
    showError(
      "This quiz round is not available."
    );

    return;
  }

  if (!isRoundUnlocked(round)) {
    playSound("wrong");

    return;
  }

  clearTimer();

  currentRound = round;

  currentQuestions =
    selectQuestionsForRound(round);

  currentQuestionIndex = 0;

  score = 0;
  correctAnswers = 0;
  wrongAnswers = 0;

  reviewData = [];

  answeredCurrentQuestion = false;
  currentQuestionTimedOut = false;

  localStorage.setItem(
    STORAGE.currentRound,
    String(currentRound)
  );

  saveProgress();

  showScreen("quizScreen");

  startMusic();

  renderCurrentQuestion();
}

/* =========================================================
   RESTORE PROGRESS
   ========================================================= */

function restoreProgress(saved) {
  try {
    currentRound = getNumber(
      saved.round,
      1
    );

    if (
