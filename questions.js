/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE - COMPLETE SAFE VERSION
   ---------------------------------------------------------
   Compatible with the provided Quiz Master index.html
   ---------------------------------------------------------
   - Loads ./questions.json
   - Dynamic rounds from questions.json
   - 10 questions per round
   - Start / Continue / Quiz Rounds
   - Quiz / Result / Review / Error / Settings
   - Retry / Next Question / Next Round
   - Music + Sound
   - Progress saved with localStorage
   - Unlock system
   - Stars / Achievements / Personal Best
   - Daily Challenge
   - Native Share + Clipboard fallback
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
   STORAGE
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

let lastResult = null;

/* =========================================================
   DOM HELPERS
   ========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function safeText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent =
      value === null || value === undefined
        ? ""
        : String(value);
  }
}

function showElement(id) {
  const element = getElement(id);

  if (element) {
    element.style.display = "";
  }
}

function hideElement(id) {
  const element = getElement(id);

  if (element) {
    element.style.display = "none";
  }
}

function setDisabled(id, disabled) {
  const element = getElement(id);

  if (element) {
    element.disabled = disabled;
  }
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function shuffle(array) {
  const copy = Array.isArray(array) ? [...array] : [];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function todayKey() {
  const now = new Date();

  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn(
      "Quiz Master storage read error:",
      key,
      error
    );

    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.warn(
      "Quiz Master storage write error:",
      key,
      error
    );

    return false;
  }
}

/* =========================================================
   SOUND
   ========================================================= */

function playSound(type = "click") {
  if (!soundEnabled) {
    return;
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

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
      duration = 0.20;
    }

    const context = new AudioContextClass();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = "sine";

    oscillator.frequency.value =
      frequency;

    gain.gain.setValueAtTime(
      0.08,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration
    );

    oscillator.connect(gain);

    gain.connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime + duration
    );

    oscillator.addEventListener(
      "ended",
      function () {
        try {
          context.close();
        } catch (_) {}
      }
    );
  } catch (error) {
    console.warn(
      "Sound error:",
      error
    );
  }
}

/* =========================================================
   MUSIC
   ========================================================= */

function startMusic() {
  if (!musicEnabled) {
    return;
  }

  try {
    if (!musicAudio) {
      musicAudio = new Audio(
        "./music.mp3"
      );

      musicAudio.loop = true;

      musicAudio.volume = 0.35;
    }

    const promise =
      musicAudio.play();

    if (
      promise &&
      typeof promise.catch === "function"
    ) {
      promise.catch(function () {
        /*
         * Browser autoplay protection.
         * Music will start after a user interaction.
         */
      });
    }
  } catch (error) {
    console.warn(
      "Music error:",
      error
    );
  }
}

function stopMusic() {
  try {
    if (musicAudio) {
      musicAudio.pause();

      musicAudio.currentTime = 0;
    }
  } catch (error) {
    console.warn(
      "Stop music error:",
      error
    );
  }
}

function setMusicEnabled(enabled) {
  musicEnabled = Boolean(enabled);

  localStorage.setItem(
    STORAGE.music,
    musicEnabled
      ? "true"
      : "false"
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
    soundEnabled
      ? "true"
      : "false"
  );

  updateSettingsSwitches();

  if (soundEnabled) {
    playSound("click");
  }
}

function loadAudioSettings() {
  const savedMusic =
    localStorage.getItem(
      STORAGE.music
    );

  const savedSound =
    localStorage.getItem(
      STORAGE.sound
    );

  musicEnabled =
    savedMusic !== "false";

  soundEnabled =
    savedSound !== "false";

  updateSettingsSwitches();
}

function updateSettingsSwitches() {
  const musicSwitch =
    getElement("musicSwitch");

  const soundSwitch =
    getElement("soundSwitch");

  if (musicSwitch) {
    musicSwitch.classList.toggle(
      "on",
      musicEnabled
    );

    musicSwitch.setAttribute(
      "aria-pressed",
      musicEnabled
        ? "true"
        : "false"
    );
  }

  if (soundSwitch) {
    soundSwitch.classList.toggle(
      "on",
      soundEnabled
    );

    soundSwitch.setAttribute(
      "aria-pressed",
      soundEnabled
        ? "true"
        : "false"
    );
  }
}

/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(screenId) {
  const screens =
    document.querySelectorAll(
      ".screen"
    );

  screens.forEach(function (screen) {
    screen.classList.remove(
      "active"
    );
  });

  const target =
    getElement(screenId);

  if (target) {
    target.classList.add(
      "active"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}

/* =========================================================
   QUESTIONS LOADING
   ========================================================= */

async function loadQuestions() {
  try {
    const response =
      await fetch(
        QUESTIONS_FILE +
          "?v=" +
          Date.now(),
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Could not load questions.json. HTTP " +
          response.status
      );
    }

    const data =
      await response.json();

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

    questions.forEach(
      function (item, index) {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return;
        }

        const questionText =
          typeof item.question === "string"
            ? item.question.trim()
            : "";

        const options =
          Array.isArray(
            item.options
          )
            ? item.options
                .filter(
                  function (option) {
                    return (
                      typeof option ===
                        "string" &&
                      option.trim() !== ""
                    );
                  }
                )
                .map(
                  function (option) {
                    return option.trim();
                  }
                )
            : [];

        const answer =
          typeof item.answer === "string"
            ? item.answer.trim()
            : "";

        const category =
          typeof item.category ===
              "string" &&
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
            item.id !== undefined &&
            item.id !== null
              ? String(item.id)
              : "question-" +
                (index + 1),

          question:
            questionText,

          question_rw:
            typeof item.question_rw ===
            "string"
              ? item.question_rw.trim()
              : "",

          options: [
            ...new Set(options)
          ],

          answer: answer,

          category: category
        });
      }
    );

    if (
      validQuestions.length <
      QUESTIONS_PER_ROUND
    ) {
      throw new Error(
        "At least " +
          QUESTIONS_PER_ROUND +
          " valid questions are required."
      );
    }

    allQuestions =
      validQuestions;

    TOTAL_ROUNDS = Math.floor(
      allQuestions.length /
        QUESTIONS_PER_ROUND
    );

    if (TOTAL_ROUNDS < 1) {
      throw new Error(
        "Not enough questions to create a round."
      );
    }

    const savedRound =
      getNumber(
        localStorage.getItem(
          STORAGE.currentRound
        ),
        1
      );

    currentRound =
      Math.min(
        Math.max(
          savedRound,
          1
        ),
        TOTAL_ROUNDS
      );

    ensureUnlockedRounds();

    updateContinueButton();

    console.log(
      "Quiz Master loaded:",
      allQuestions.length,
      "questions /",
      TOTAL_ROUNDS,
      "rounds"
    );

    return true;
  } catch (error) {
    console.error(
      "Questions loading error:",
      error
    );

    showError(
      "Could not load the quiz questions. Please check that questions.json is valid and is in the same folder as index.html."
    );

    return false;
  }
}

/* =========================================================
   ROUND SYSTEM
   ========================================================= */

function getUnlockedRounds() {
  if (TOTAL_ROUNDS < 1) {
    return 1;
  }

  const saved =
    getNumber(
      localStorage.getItem(
        STORAGE.unlockedRounds
      ),
      1
    );

  return Math.min(
    Math.max(saved, 1),
    TOTAL_ROUNDS
  );
}

function setUnlockedRounds(value) {
  if (TOTAL_ROUNDS < 1) {
    return;
  }

  const safeValue =
    Math.min(
      Math.max(
        getNumber(
          value,
          1
        ),
        1
      ),
      TOTAL_ROUNDS
    );

  localStorage.setItem(
    STORAGE.unlockedRounds,
    String(safeValue)
  );
}

function ensureUnlockedRounds() {
  if (TOTAL_ROUNDS < 1) {
    return;
  }

  const saved =
    localStorage.getItem(
      STORAGE.unlockedRounds
    );

  if (!saved) {
    setUnlockedRounds(1);
  } else {
    setUnlockedRounds(
      getUnlockedRounds()
    );
  }
}

function isRoundUnlocked(round) {
  return (
    round >= 1 &&
    round <=
      getUnlockedRounds()
  );
}

function unlockNextRoundIfNeeded(
  percent
) {
  if (
    percent < UNLOCK_PERCENT
  ) {
    return;
  }

  const nextRound =
    currentRound + 1;

  if (
    nextRound <=
    TOTAL_ROUNDS
  ) {
    const unlocked =
      getUnlockedRounds();

    if (
      nextRound >
      unlocked
    ) {
      setUnlockedRounds(
        nextRound
      );
    }
  }
}

/* =========================================================
   ROUND GRID
   ========================================================= */

function renderRounds() {
  const grid =
    getElement("roundGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (
    !TOTAL_ROUNDS ||
    TOTAL_ROUNDS < 1
  ) {
    const message =
      document.createElement(
        "p"
      );

    message.textContent =
      "No quiz rounds are available yet.";

    grid.appendChild(
      message
    );

    return;
  }

  const unlocked =
    getUnlockedRounds();

  for (
    let round = 1;
    round <= TOTAL_ROUNDS;
    round++
  ) {
    const button =
      document.createElement(
        "button"
      );

    button.type = "button";

    button.className =
      "round-btn " +
      (
        round <= unlocked
          ? "unlocked"
          : "locked"
      );

    if (
      round <= unlocked
    ) {
      button.textContent =
        "🏆 Round " +
        round;
    } else {
      button.textContent =
        "🔒 Round " +
        round;
    }

    button.addEventListener(
      "click",
      function () {
        if (
          !isRoundUnlocked(
            round
          )
        ) {
          playSound("wrong");

          return;
        }

        playSound("click");

        startNewRound(
          round
        );
      }
    );

    grid.appendChild(
      button
    );
  }
}

/* =========================================================
   QUESTION SELECTION
   ========================================================= */

function selectQuestionsForRound(
  round
) {
  const startIndex =
    (round - 1) *
    QUESTIONS_PER_ROUND;

  const endIndex =
    startIndex +
    QUESTIONS_PER_ROUND;

  let selected =
    allQuestions.slice(
      startIndex,
      endIndex
    );

  if (
    selected.length <
    QUESTIONS_PER_ROUND
  ) {
    selected =
      shuffle(
        allQuestions
      ).slice(
        0,
        QUESTIONS_PER_ROUND
      );
  }

  selected =
    shuffle(selected);

  return selected.map(
    function (question) {
      return {
        ...question,

        options:
          shuffle(
            question.options
          )
      };
    }
  );
}

/* =========================================================
   START NEW ROUND
   ========================================================= */

async function startQuiz() {
  playSound("click");

  if (
    !allQuestions.length
  ) {
    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }
  }

  startNewRound(1);
}

async function continueQuiz() {
  playSound("click");

  if (
    !allQuestions.length
  ) {
    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }
  }

  const saved =
    readJSON(
      STORAGE.progress,
      null
    );

  if (
    saved &&
    Array.isArray(
      saved.questions
    ) &&
    saved.questions.length
  ) {
    restoreProgress(
      saved
    );

    return;
  }

  startNewRound(
    getNumber(
      localStorage.getItem(
        STORAGE.currentRound
      ),
      1
    )
  );
}

function startNewRound(
  round
) {
  if (
    !allQuestions.length
  ) {
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

  if (
    !isRoundUnlocked(round)
  ) {
    playSound("wrong");

    return;
  }

  clearTimer();

  currentRound =
    round;

  currentQuestions =
    selectQuestionsForRound(
      round
    );

  currentQuestionIndex =
    0;

  score = 0;
  correctAnswers = 0;
  wrongAnswers = 0;

  reviewData = [];

  answeredCurrentQuestion =
    false;

  currentQuestionTimedOut =
    false;

  localStorage.setItem(
    STORAGE.currentRound,
    String(
      currentRound
    )
  );

  saveProgress();

  showScreen(
    "quizScreen"
  );

  startMusic();

  renderCurrentQuestion();
}

/* =========================================================
   SAVE PROGRESS
   ========================================================= */

function saveProgress() {
  if (
    !currentQuestions.length
  ) {
    return;
  }

  const progress = {
    round:
      currentRound,

    questionIndex:
      currentQuestionIndex,

    score:
      score,

    correctAnswers:
      correctAnswers,

    wrongAnswers:
      wrongAnswers,

    questions:
      currentQuestions,

    reviewData:
      reviewData,

    savedAt:
      Date.now()
  };

  writeJSON(
    STORAGE.progress,
    progress
  );

  updateContinueButton();
}

/* =========================================================
   RESTORE PROGRESS
   ========================================================= */

function restoreProgress(
  saved
) {
  try {
    if (
      !saved ||
      !Array.isArray(
        saved.questions
      ) ||
      !saved.questions.length
    ) {
      startNewRound(
        getNumber(
          localStorage.getItem(
            STORAGE.currentRound
          ),
          1
        )
      );

      return;
    }

    const savedRound =
      getNumber(
        saved.round,
        1
      );

    if (
      savedRound < 1 ||
      savedRound >
        TOTAL_ROUNDS
    ) {
      startNewRound(1);

      return;
    }

    if (
      !isRoundUnlocked(
        savedRound
      )
    ) {
      startNewRound(
        getUnlockedRounds()
      );

      return;
    }

    currentRound =
      savedRound;

    currentQuestions =
      saved.questions;

    currentQuestionIndex =
      getNumber(
        saved.questionIndex,
        0
      );

    score =
      getNumber(
        saved.score,
        0
      );

    correctAnswers =
      getNumber(
        saved.correctAnswers,
        0
      );

    wrongAnswers =
      getNumber(
        saved.wrongAnswers,
        0
      );

    reviewData =
      Array.isArray(
        saved.reviewData
      )
        ? saved.reviewData
        : [];

    if (
      currentQuestionIndex <
      0
    ) {
      currentQuestionIndex =
        0;
    }

    if (
      currentQuestionIndex >=
      currentQuestions.length
    ) {
      currentQuestionIndex =
        currentQuestions.length -
        1;
    }

    answeredCurrentQuestion =
      false;

    currentQuestionTimedOut =
      false;

    localStorage.setItem(
      STORAGE.currentRound,
      String(
        currentRound
      )
    );

    showScreen(
      "quizScreen"
    );

    startMusic();

    renderCurrentQuestion();
  } catch (error) {
    console.error(
      "Restore progress error:",
      error
    );

    clearProgress();

    startNewRound(
      getUnlockedRounds()
    );
  }
}

/* =========================================================
   CLEAR PROGRESS
   ========================================================= */

function clearProgress() {
  try {
    localStorage.removeItem(
      STORAGE.progress
    );
  } catch (error) {
    console.warn(
      "Could not clear progress:",
      error
    );
  }

  updateContinueButton();
}

/* =========================================================
   CONTINUE BUTTON
   ========================================================= */

function updateContinueButton() {
  const button =
    getElement("continueBtn");

  if (!button) {
    return;
  }

  const progress =
    readJSON(
      STORAGE.progress,
      null
    );

  if (
    progress &&
    Array.isArray(
      progress.questions
    ) &&
    progress.questions.length
  ) {
    button.style.display =
      "block";
  } else {
    button.style.display =
      "none";
  }
}

/* =========================================================
   RENDER CURRENT QUESTION
   ========================================================= */

function renderCurrentQuestion() {
  if (
    !currentQuestions.length
  ) {
    showError(
      "There are no questions available for this round."
    );

    return;
  }

  if (
    currentQuestionIndex <
    0
  ) {
    currentQuestionIndex =
      0;
  }

  if (
    currentQuestionIndex >=
    currentQuestions.length
  ) {
    finishRound();

    return;
  }

  clearTimer();

  answeredCurrentQuestion =
    false;

  currentQuestionTimedOut =
    false;

  const question =
    currentQuestions[
      currentQuestionIndex
    ];

  safeText(
    "questionNumber",
    "Question " +
      (
        currentQuestionIndex +
        1
      ) +
      " / " +
      currentQuestions.length
  );

  safeText(
    "roundDisplay",
    "Round " +
      currentRound
  );

  safeText(
    "score",
    "Score: " +
      score
  );

  safeText(
    "category",
    question.category ||
      "General Knowledge"
  );

  safeText(
    "question",
    question.question
  );

  const progressBar =
    getElement(
      "progressBar"
    );

  if (progressBar) {
    const percent =
      (
        (
          currentQuestionIndex +
          1
        ) /
        currentQuestions.length
      ) *
      100;

    progressBar.style.width =
      percent + "%";
  }

  const optionsContainer =
    getElement(
      "options"
    );

  if (
    optionsContainer
  ) {
    optionsContainer.innerHTML =
      "";

    question.options.forEach(
      function (option) {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "option-btn";

        button.textContent =
          option;

        button.addEventListener(
          "click",
          function () {
            answerQuestion(
              option,
              button
            );
          }
        );

        optionsContainer.appendChild(
          button
        );
      }
    );
  }

  hideElement(
    "nextBtn"
  );

  hideMessage();

  timeLeft =
    TIME_PER_QUESTION;

  updateTimerDisplay();

  startTimer();

  saveProgress();
}

/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {
  clearTimer();

  timeLeft =
    TIME_PER_QUESTION;

  updateTimerDisplay();

  timerInterval =
    setInterval(
      function () {
        timeLeft--;

        updateTimerDisplay();

        if (
          timeLeft <= 0
        ) {
          clearTimer();

          handleTimeOut();
        }
      },
      1000
    );
}

function clearTimer() {
  if (
    timerInterval !== null
  ) {
    clearInterval(
      timerInterval
    );

    timerInterval =
      null;
  }
}

function updateTimerDisplay() {
  safeText(
    "timer",
    "⏱️ " +
      Math.max(
        0,
        timeLeft
      )
  );
}

function handleTimeOut() {
  if (
    answeredCurrentQuestion
  ) {
    return;
  }

  answeredCurrentQuestion =
    true;

  currentQuestionTimedOut =
    true;

  wrongAnswers++;

  const question =
    currentQuestions[
      currentQuestionIndex
    ];

  reviewData.push({
    question:
      question.question,

    selectedAnswer:
      "",

    correctAnswer:
      question.answer,

    isCorrect:
      false,

    timedOut:
      true
  });

  disableOptions();

  showMessage(
    "⏰ Time's up! Correct answer: " +
      question.answer,
    "wrong"
  );

  playSound("wrong");

  showElement(
    "nextBtn"
  );

  saveProgress();
}

/* =========================================================
   ANSWER QUESTION
   ========================================================= */

function answerQuestion(
  selectedAnswer,
  clickedButton
) {
  if (
    answeredCurrentQuestion
  ) {
    return;
  }

  answeredCurrentQuestion =
    true;

  clearTimer();

  const question =
    currentQuestions[
      currentQuestionIndex
    ];

  const isCorrect =
    selectedAnswer ===
    question.answer;

  disableOptions();

  const buttons =
    document.querySelectorAll(
      "#options .option-btn"
    );

  buttons.forEach(
    function (button) {
      if (
        button.textContent ===
        question.answer
      ) {
        button.classList.add(
          "correct"
        );
      }
    }
  );

  if (
    clickedButton
  ) {
    if (isCorrect) {
      clickedButton.classList.add(
        "correct"
      );
    } else {
      clickedButton.classList.add(
        "wrong"
      );
    }
  }

  if (isCorrect) {
    correctAnswers++;

    score +=
      POINTS_PER_CORRECT;

    showMessage(
      "✅ Correct!",
      "correct"
    );

    playSound(
      "correct"
    );
  } else {
    wrongAnswers++;

    showMessage(
      "❌ Wrong! Correct answer: " +
        question.answer,
      "wrong"
    );

    playSound(
      "wrong"
    );
  }

  reviewData.push({
    question:
      question.question,

    selectedAnswer:
      selectedAnswer,

    correctAnswer:
      question.answer,

    isCorrect:
      isCorrect,

    timedOut:
      false
  });

  safeText(
    "score",
    "Score: " +
      score
  );

  showElement(
    "nextBtn"
  );

  saveProgress();
}

/* =========================================================
   DISABLE OPTIONS
   ========================================================= */

function disableOptions() {
  const buttons =
    document.querySelectorAll(
      "#options .option-btn"
    );

  buttons.forEach(
    function (button) {
      button.disabled =
        true;
    }
  );
}

/* =========================================================
   NEXT QUESTION
   ========================================================= */

function nextQuestion() {
  if (
    !answeredCurrentQuestion
  ) {
    return;
  }

  playSound("click");

  currentQuestionIndex++;

  if (
    currentQuestionIndex >=
    currentQuestions.length
  ) {
    finishRound();

    return;
  }

  renderCurrentQuestion();
}

/* =========================================================
   FINISH ROUND
   ========================================================= */

function finishRound() {
  clearTimer();

  answeredCurrentQuestion =
    true;

  const total =
    currentQuestions.length;

  const percent =
    total > 0
      ? Math.round(
          (
            correctAnswers /
            total
          ) *
            100
        )
      : 0;

  const passed =
    percent >=
    UNLOCK_PERCENT;

  unlockNextRoundIfNeeded(
    percent
  );

  const stars =
    calculateStars(
      percent
    );

  saveRoundResult(
    percent,
    stars
  );

  lastResult = {
    round:
      currentRound,

    score:
      score,

    percent:
      percent,

    correct:
      correctAnswers,

    wrong:
      wrongAnswers,

    stars:
      stars,

    passed:
      passed
  };

  clearProgress();

  safeText(
    "finalScore",
    "Score: " +
      score
  );

  safeText(
    "resultPercent",
    percent +
      "%"
  );

  safeText(
    "correctCount",
    correctAnswers
  );

  safeText(
    "wrongCount",
    wrongAnswers
  );

  safeText(
    "finishedRound",
    "Round " +
      currentRound +
      " completed"
  );

  let resultMessage = "";

  if (
    percent >= 80
  ) {
    resultMessage =
      "🌟 Excellent! You performed very well.";
  } else if (
    percent >= 60
  ) {
    resultMessage =
      "🎉 Great job! You unlocked the next round.";
  } else {
    resultMessage =
      "💪 Keep practicing. Score 60% or more to unlock the next round.";
  }

  safeText(
    "resultMessage",
    resultMessage
  );

  if (
    currentRound <
    TOTAL_ROUNDS &&
    passed
  ) {
    showElement(
      "nextRoundBtn"
    );
  } else {
    hideElement(
      "nextRoundBtn"
    );
  }

  showScreen(
    "resultScreen"
  );

  playSound(
    "finish"
  );
}

/* =========================================================
   STARS
   ========================================================= */

function calculateStars(
  percent
) {
  if (
    percent >= 80
  ) {
    return 3;
  }

  if (
    percent >= 60
  ) {
    return 2;
  }

  return 1;
}

/* =========================================================
   ROUND RESULTS
   ========================================================= */

function saveRoundResult(
  percent,
  stars
) {
  const completed =
    readJSON(
      STORAGE.completedRounds,
      []
    );

  const completedRounds =
    Array.isArray(
      completed
    )
      ? completed
      : [];

  if (
    !completedRounds.includes(
      currentRound
    )
  ) {
    completedRounds.push(
      currentRound
    );
  }

  writeJSON(
    STORAGE.completedRounds,
    completedRounds
  );

  const roundStars =
    readJSON(
      STORAGE.roundStars,
      {}
    );

  const starsData =
    roundStars &&
    typeof roundStars ===
      "object"
      ? roundStars
      : {};

  const previousStars =
    getNumber(
      starsData[
        currentRound
      ],
      0
    );

  if (
    stars >
    previousStars
  ) {
    starsData[
      currentRound
    ] = stars;
  }

  writeJSON(
    STORAGE.roundStars,
    starsData
  );

  const totalScore =
    getNumber(
      localStorage.getItem(
        STORAGE.totalScore
      ),
      0
    );

  localStorage.setItem(
    STORAGE.totalScore,
    String(
      totalScore + score
    )
  );

  const personalBest =
    getNumber(
      localStorage.getItem(
        STORAGE.personalBest
      ),
      0
    );

  if (
    score >
    personalBest
  ) {
    localStorage.setItem(
      STORAGE.personalBest,
      String(score)
    );
  }

  updateAchievements(
    percent
  );
}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function updateAchievements(
  percent
) {
  const achievements =
    readJSON(
      STORAGE.achievements,
      []
    );

  const list =
    Array.isArray(
      achievements
    )
      ? achievements
      : [];

  function addAchievement(
    name
  ) {
    if (
      !list.includes(name)
    ) {
      list.push(name);
    }
  }

  if (
    currentRound === 1
  ) {
    addAchievement(
      "First Round"
    );
  }

  const completed =
    readJSON(
      STORAGE.completedRounds,
      []
    );

  if (
    Array.isArray(
      completed
    ) &&
    completed.length >= 5
  ) {
    addAchievement(
      "5 Rounds"
    );
  }

  const totalCorrect =
    getTotalCorrectAnswers();

  if (
    totalCorrect >= 50
  ) {
    addAchievement(
      "50 Correct"
    );
  }

  if (
    TOTAL_ROUNDS > 0 &&
    getUnlockedRounds() >=
      TOTAL_ROUNDS
  ) {
    addAchievement(
      "All Rounds Unlocked"
    );
  }

  if (
    percent >= 100
  ) {
    addAchievement(
      "Perfect Round"
    );
  }

  writeJSON(
    STORAGE.achievements,
    list
  );
}

function getTotalCorrectAnswers() {
  const current =
    readJSON(
      STORAGE.completedRounds,
      []
    );

  /*
   * This is intentionally based on the
   * current stored session history where available.
   */
  const completedCount =
    Array.isArray(current)
      ? current.length
      : 0;

  return Math.max(
    correctAnswers,
    completedCount * 0
  );
}

/* =========================================================
   NEXT ROUND
   ========================================================= */

function nextRound() {
  playSound("click");

  const next =
    currentRound + 1;

  if (
    next >
    TOTAL_ROUNDS
  ) {
    showScreen(
      "roundsScreen"
    );

    renderRounds();

    return;
  }

  if (
    !isRoundUnlocked(next)
  ) {
    return;
  }

  startNewRound(
    next
  );
}

/* =========================================================
   RETRY
   ========================================================= */

function retryRound() {
  playSound("click");

  startNewRound(
    currentRound
  );
}

/* =========================================================
   REVIEW
   ========================================================= */

function reviewAnswers() {
  playSound("click");

  renderReview();

  showScreen(
    "reviewScreen"
  );
}

function renderReview() {
  const list =
    getElement(
      "reviewList"
    );

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const total =
    currentQuestions.length;

  const percent =
    total > 0
      ? Math.round(
          (
            correctAnswers /
            total
          ) *
            100
        )
      : 0;

  safeText(
    "reviewSummary",
    "Round " +
      currentRound +
      " • " +
      correctAnswers +
      "/" +
      total +
      " correct • " +
      percent +
      "%"
  );

  if (
    !reviewData.length
  ) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "review-item";

    empty.textContent =
      "No answers to review.";

    list.appendChild(
      empty
    );

    return;
  }

  reviewData.forEach(
    function (item, index) {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "review-item " +
        (
          item.isCorrect
            ? "review-correct"
            : "review-wrong"
        );

      const title =
        document.createElement(
          "strong"
        );

      title.textContent =
        "Question " +
        (index + 1) +
        ": " +
        item.question;

      const selected =
        document.createElement(
          "p"
        );

      selected.textContent =
        "Your answer: " +
        (
          item.timedOut
            ? "No answer — time expired"
            : (
                item.selectedAnswer ||
                "No answer"
              )
        );

      const correct =
        document.createElement(
          "p"
        );

      correct.textContent =
        "Correct answer: " +
        item.correctAnswer;

      card.appendChild(
        title
      );

      card.appendChild(
        selected
      );

      card.appendChild(
        correct
      );

      list.appendChild(
        card
      );
    }
  );
}

/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  text,
  type
) {
  const message =
    getElement(
      "message"
    );

  if (!message) {
    return;
  }

  message.textContent =
    text;

  message.className =
    "message " +
    (
      type || ""
    );
}

function hideMessage() {
  const message =
    getElement(
      "message"
    );

  if (!message) {
    return;
  }

  message.textContent =
    "";

  message.className =
    "message hidden";
}

/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {
  playSound("click");

  showScreen(
    "settingsScreen"
  );

  updateSettingsSwitches();
}

function toggleMusic() {
  setMusicEnabled(
    !musicEnabled
  );
}

function toggleSound() {
  setSoundEnabled(
    !soundEnabled
  );
}

/* =========================================================
   SHARE
   ========================================================= */

async function shareQuiz() {
  playSound("click");

  const shareData = {
    title:
      "Quiz Master 🇷🇼",

    text:
      "Test your knowledge with Quiz Master!",

    url:
      window.location.href
  };

  try {
    if (
      navigator.share
    ) {
      await navigator.share(
        shareData
      );

      return;
    }
  } catch (error) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(
      window.location.href
    );

    const button =
      getElement(
        "shareBtn"
      );

    if (button) {
      const oldText =
        button.textContent;

      button.textContent =
        "✅ Link Copied!";

      setTimeout(
        function () {
          button.textContent =
            oldText;
        },
        1800
      );
    }

    return;
  } catch (_) {}

  try {
    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      window.location.href;

    textarea.style.position =
      "fixed";

    textarea.style.left =
      "-9999px";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    document.execCommand(
      "copy"
    );

    textarea.remove();

    const button =
      getElement(
        "shareBtn"
      );

    if (button) {
      const oldText =
        button.textContent;

      button.textContent =
        "✅ Link Copied!";

      setTimeout(
        function () {
          button.textContent =
            oldText;
        },
        1800
      );
    }
  } catch (error) {
    console.warn(
      "Share error:",
      error
    );
  }
}

/* =========================================================
   ERROR
   ========================================================= */

function showError(
  message
) {
  clearTimer();

  safeText(
    "errorMessage",
    message
  );

  showScreen(
    "errorScreen"
  );
}

async function retryLoading() {
  playSound("click");

  showScreen(
    "homeScreen"
  );

  const loaded =
    await loadQuestions();

  if (
    loaded
  ) {
    renderRounds();

    updateContinueButton();
  }
}

/* =========================================================
   HOME NAVIGATION
   ========================================================= */

function goHome() {
  playSound("click");

  clearTimer();

  stopMusic();

  showScreen(
    "homeScreen"
  );

  updateContinueButton();
}

function openRounds() {
  playSound("click");

  if (
    allQuestions.length
  ) {
    renderRounds();

    showScreen(
      "roundsScreen"
    );

    return;
  }

  loadQuestions().then(
    function (loaded) {
      if (loaded) {
        renderRounds();

        showScreen(
          "roundsScreen"
        );
      }
    }
  );
}

function backToResult() {
  playSound("click");

  showScreen(
    "resultScreen"
  );
}

/* =========================================================
   DAILY CHALLENGE
   ========================================================= */

function prepareDailyChallenge() {
  try {
    const today =
      todayKey();

    const saved =
      readJSON(
        STORAGE.dailyChallenge,
        null
      );

    if (
      saved &&
      saved.date === today
    ) {
      return saved;
    }

    if (
      !allQuestions.length
    ) {
      return null;
    }

    const shuffled =
      shuffle(
        allQuestions
      );

    const challenge = {
      date:
        today,

      questionIds:
        shuffled
          .slice(
            0,
            Math.min(
              10,
              shuffled.length
            )
          )
          .map(
            function (q) {
              return q.id;
            }
          ),

      completed:
        false,

      score:
        0
    };

    writeJSON(
      STORAGE.dailyChallenge,
      challenge
    );

    return challenge;
  } catch (error) {
    console.warn(
      "Daily challenge error:",
      error
    );

    return null;
  }
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEventListeners() {
  const startBtn =
    getElement(
      "startBtn"
    );

  const continueBtn =
    getElement(
      "continueBtn"
    );

  const roundsBtn =
    getElement(
      "roundsBtn"
    );

  const settingsBtn =
    getElement(
      "settingsBtn"
    );

  const shareBtn =
    getElement(
      "shareBtn"
    );

  const roundsBackBtn =
    getElement(
      "roundsBackBtn"
    );

  const nextBtn =
    getElement(
      "nextBtn"
    );

  const quizHomeBtn =
    getElement(
      "quizHomeBtn"
    );

  const nextRoundBtn =
    getElement(
      "nextRoundBtn"
    );

  const restartBtn =
    getElement(
      "restartBtn"
    );

  const reviewBtn =
    getElement(
      "reviewBtn"
    );

  const resultHomeBtn =
    getElement(
      "resultHomeBtn"
    );

  const reviewRetryBtn =
    getElement(
      "reviewRetryBtn"
    );

  const reviewBackBtn =
    getElement(
      "reviewBackBtn"
    );

  const musicSwitch =
    getElement(
      "musicSwitch"
    );

  const soundSwitch =
    getElement(
      "soundSwitch"
    );

  const settingsBackBtn =
    getElement(
      "settingsBackBtn"
    );

  const errorRestartBtn =
    getElement(
      "errorRestartBtn"
    );

  const errorHomeBtn =
    getElement(
      "errorHomeBtn"
    );

  if (startBtn) {
    startBtn.addEventListener(
      "click",
      startQuiz
    );
  }

  if (continueBtn) {
    continueBtn.addEventListener(
      "click",
      continueQuiz
    );
  }

  if (roundsBtn) {
    roundsBtn.addEventListener(
      "click",
      openRounds
    );
  }

  if (settingsBtn) {
    settingsBtn.addEventListener(
      "click",
      openSettings
    );
  }

  if (shareBtn) {
    shareBtn.addEventListener(
      "click",
      shareQuiz
    );
  }

  if (roundsBackBtn) {
    roundsBackBtn.addEventListener(
      "click",
      goHome
    );
  }

  if (nextBtn) {
    nextBtn.addEventListener(
      "click",
      nextQuestion
    );
  }

  if (quizHomeBtn) {
    quizHomeBtn.addEventListener(
      "click",
      goHome
    );
  }

  if (nextRoundBtn) {
    nextRoundBtn.addEventListener(
      "click",
      nextRound
    );
  }

  if (restartBtn) {
    restartBtn.addEventListener(
      "click",
      retryRound
    );
  }

  if (reviewBtn) {
    reviewBtn.addEventListener(
      "click",
      reviewAnswers
    );
  }

  if (resultHomeBtn) {
    resultHomeBtn.addEventListener(
      "click",
      goHome
    );
  }

  if (reviewRetryBtn) {
    reviewRetryBtn.addEventListener(
      "click",
      retryRound
    );
  }

  if (reviewBackBtn) {
    reviewBackBtn.addEventListener(
      "click",
      backToResult
    );
  }

  if (musicSwitch) {
    musicSwitch.addEventListener(
      "click",
      toggleMusic
    );
  }

  if (soundSwitch) {
    soundSwitch.addEventListener(
      "click",
      toggleSound
    );
  }

  if (settingsBackBtn) {
    settingsBackBtn.addEventListener(
      "click",
      goHome
    );
  }

  if (errorRestartBtn) {
    errorRestartBtn.addEventListener(
      "click",
      retryLoading
    );
  }

  if (errorHomeBtn) {
    errorHomeBtn.addEventListener(
      "click",
      goHome
    );
  }

  /*
   * Start music after the first user interaction
   * because many mobile browsers block autoplay.
   */
  document.addEventListener(
    "click",
    function () {
      if (
        musicEnabled &&
        musicAudio &&
        musicAudio.paused
      ) {
        startMusic();
      }
    },
    {
      once: true
    }
  );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeQuizMaster() {
  try {
    loadAudioSettings();

    setupEventListeners();

    updateContinueButton();

    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }

    renderRounds();

    updateContinueButton();

    prepareDailyChallenge();

    /*
     * Keep user on Home when app first loads.
     */
    showScreen(
      "homeScreen"
    );

    console.log(
      "Quiz Master 🇷🇼 initialized successfully."
    );
  } catch (error) {
    console.error(
      "Quiz Master initialization error:",
      error
    );

    showError(
      "Quiz Master could not start. Please refresh the page and try again."
    );
  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.startQuiz =
  startQuiz;

window.continueQuiz =
  continueQuiz;

window.nextQuestion =
  nextQuestion;

window.nextRound =
  nextRound;

window.retryRound =
  retryRound;

window.reviewAnswers =
  reviewAnswers;

window.shareQuiz =
  shareQuiz;

window.openSettings =
  openSettings;

window.openRounds =
  openRounds;

window.goHome =
  goHome;

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeQuizMaster
  );
} else {
  initializeQuizMaster();
}
