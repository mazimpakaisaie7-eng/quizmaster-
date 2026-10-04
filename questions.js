/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE - SAFE FULL VERSION
   ---------------------------------------------------------
   Compatible with existing Quiz Master index.html
   ---------------------------------------------------------
   - Loads ./questions.json
   - Automatically calculates rounds from question count
   - 10 questions per round
   - Keeps existing design / CSS
   - Supports Start / Continue / Rounds
   - Supports Quiz / Result / Review / Error / Settings
   - Supports Music / Sound
   - Supports Retry / Next Round
   - Saves progress in localStorage
   - No hardcoded TOTAL_ROUNDS
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;
const UNLOCK_PERCENT = 60;
const QUESTIONS_FILE = "./questions.json";

/*
   IMPORTANT:
   Do NOT change this to 10 or 100.

   It is calculated automatically after questions.json loads.
*/
let TOTAL_ROUNDS = 0;


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

let currentRound = 1;
let currentQuestionIndex = 0;

let roundQuestions = [];

let score = 0;
let correctAnswers = 0;
let wrongAnswers = 0;

let answeredCurrentQuestion = false;

let timerInterval = null;
let timeLeft = TIME_PER_QUESTION;

let currentReview = [];

let musicAudio = null;
let audioInitialized = false;

let soundEnabled = true;
let musicEnabled = true;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function getElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);

    if (element) {
      return element;
    }
  }

  return null;
}


function getHomeScreen() {
  return getElement("homeScreen", "startScreen");
}


function getRoundsScreen() {
  return getElement("roundsScreen");
}


function getQuizScreen() {
  return getElement("quizScreen", "quiz");
}


function getResultScreen() {
  return getElement("resultScreen");
}


function getReviewScreen() {
  return getElement("reviewScreen");
}


function getErrorScreen() {
  return getElement("errorScreen");
}


function getSettingsScreen() {
  return getElement("settingsScreen");
}


/* =========================================================
   SAFE STORAGE
   ========================================================= */

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn("Storage read error:", key, error);
    return fallback;
  }
}


function writeStorage(key, value) {
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
   QUESTION NORMALIZATION
   ========================================================= */

function normalizeQuestion(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const questionText =
    typeof item.question === "string"
      ? item.question.trim()
      : "";

  if (!questionText) {
    return null;
  }

  if (!Array.isArray(item.options)) {
    return null;
  }

  const options = item.options
    .filter(option => typeof option === "string")
    .map(option => option.trim())
    .filter(Boolean);

  if (options.length < 2) {
    return null;
  }

  const answer =
    typeof item.answer === "string"
      ? item.answer.trim()
      : "";

  if (!answer) {
    return null;
  }

  const matchingAnswer = options.find(
    option => option.toLowerCase() === answer.toLowerCase()
  );

  if (!matchingAnswer) {
    console.warn(
      `Question ${index + 1} skipped because answer is not inside options.`,
      item
    );

    return null;
  }

  return {
    id:
      item.id !== undefined && item.id !== null
        ? String(item.id)
        : `question-${index + 1}`,

    question: questionText,

    question_rw:
      typeof item.question_rw === "string"
        ? item.question_rw.trim()
        : "",

    options: options,

    answer: matchingAnswer,

    category:
      typeof item.category === "string" && item.category.trim()
        ? item.category.trim()
        : "General Knowledge"
  };
}


/* =========================================================
   LOAD QUESTIONS
   ========================================================= */

async function loadQuestions() {
  try {
    const response = await fetch(QUESTIONS_FILE, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load questions.json (${response.status})`
      );
    }

    const data = await response.json();

    /*
      Supports both:

      [
        {...},
        {...}
      ]

      AND:

      {
        "questions": [
          {...}
        ]
      }
    */

    let rawQuestions = [];

    if (Array.isArray(data)) {
      rawQuestions = data;
    } else if (
      data &&
      Array.isArray(data.questions)
    ) {
      rawQuestions = data.questions;
    } else {
      throw new Error(
        "questions.json must contain an array of questions."
      );
    }

    const validQuestions = rawQuestions
      .map(normalizeQuestion)
      .filter(Boolean);

    if (validQuestions.length < QUESTIONS_PER_ROUND) {
      throw new Error(
        `At least ${QUESTIONS_PER_ROUND} valid questions are required. Found ${validQuestions.length}.`
      );
    }

    allQuestions = validQuestions;

    /*
      THIS IS THE IMPORTANT PART.

      Number of rounds comes directly from questions.json.

      100 questions = 10 rounds
      500 questions = 50 rounds
      1000 questions = 100 rounds
      5000 questions = 500 rounds
    */

    TOTAL_ROUNDS = Math.floor(
      allQuestions.length / QUESTIONS_PER_ROUND
    );

    if (TOTAL_ROUNDS < 1) {
      throw new Error(
        "There are not enough questions to create one round."
      );
    }

    console.log(
      `Quiz Master loaded ${allQuestions.length} questions and ${TOTAL_ROUNDS} rounds.`
    );

    return true;

  } catch (error) {
    console.error("Quiz Master question loading error:", error);

    showError(
      "We could not load the quiz questions. Please check questions.json and try again."
    );

    return false;
  }
}


/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(screen) {
  const screens = [
    getHomeScreen(),
    getRoundsScreen(),
    getQuizScreen(),
    getResultScreen(),
    getReviewScreen(),
    getErrorScreen(),
    getSettingsScreen()
  ];

  screens.forEach(element => {
    if (!element) {
      return;
    }

    element.classList.remove("active");
  });

  if (screen) {
    screen.classList.add("active");
  }
}


/* =========================================================
   ERROR SCREEN
   ========================================================= */

function showError(message) {
  stopTimer();

  const errorMessage = getElement(
    "errorMessage",
    "message"
  );

  if (errorMessage) {
    errorMessage.textContent = message;
  }

  showScreen(getErrorScreen());
}


/* =========================================================
   UNLOCKED ROUNDS
   ========================================================= */

function getUnlockedRounds() {
  let unlocked = readStorage(
    STORAGE.unlockedRounds,
    [1]
  );

  if (!Array.isArray(unlocked)) {
    unlocked = [1];
  }

  unlocked = unlocked
    .map(Number)
    .filter(
      round =>
        Number.isInteger(round) &&
        round >= 1 &&
        round <= TOTAL_ROUNDS
    );

  if (!unlocked.includes(1)) {
    unlocked.push(1);
  }

  unlocked = [...new Set(unlocked)];

  unlocked.sort((a, b) => a - b);

  writeStorage(
    STORAGE.unlockedRounds,
    unlocked
  );

  return unlocked;
}


function isRoundUnlocked(round) {
  return getUnlockedRounds().includes(Number(round));
}


function unlockNextRound(round, percentage) {
  if (
    percentage < UNLOCK_PERCENT ||
    round >= TOTAL_ROUNDS
  ) {
    return;
  }

  const unlocked = getUnlockedRounds();

  const nextRound = Number(round) + 1;

  if (!unlocked.includes(nextRound)) {
    unlocked.push(nextRound);
    unlocked.sort((a, b) => a - b);

    writeStorage(
      STORAGE.unlockedRounds,
      unlocked
    );
  }
}


/* =========================================================
   RENDER ROUNDS
   ========================================================= */

function renderRounds() {
  const roundGrid = getElement(
    "roundGrid",
    "roundsGrid"
  );

  if (!roundGrid) {
    console.warn("roundGrid element not found.");
    return;
  }

  roundGrid.innerHTML = "";

  const unlockedRounds = getUnlockedRounds();

  for (
    let round = 1;
    round <= TOTAL_ROUNDS;
    round++
  ) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "round-btn";

    const unlocked =
      unlockedRounds.includes(round);

    if (unlocked) {
      button.classList.add("unlocked");
    } else {
      button.classList.add("locked");
      button.disabled = true;
    }

    const stars = getRoundStars(round);

    if (unlocked) {
      button.innerHTML =
        `<span>Round ${round}</span>` +
        (stars > 0
          ? `<small>${"⭐".repeat(stars)}</small>`
          : "");
    } else {
      button.innerHTML =
        `<span>🔒 Round ${round}</span>`;
    }

    if (unlocked) {
      button.addEventListener(
        "click",
        () => {
          playSound("click");
          startNewRound(round);
        }
      );
    }

    roundGrid.appendChild(button);
  }
}


/* =========================================================
   ROUND QUESTION SELECTION
   ---------------------------------------------------------
   IMPORTANT:
   Each round gets its own fixed 10-question block.

   Round 1 -> questions 1-10
   Round 2 -> questions 11-20
   Round 3 -> questions 21-30
   etc.
   ========================================================= */

function selectQuestionsForRound(round) {
  const roundNumber = Number(round);

  if (!Number.isInteger(roundNumber)) {
    throw new Error("Invalid round number.");
  }

  if (
    roundNumber < 1 ||
    roundNumber > TOTAL_ROUNDS
  ) {
    throw new Error(
      `Round ${roundNumber} does not exist.`
    );
  }

  const start =
    (roundNumber - 1) *
    QUESTIONS_PER_ROUND;

  const end =
    start + QUESTIONS_PER_ROUND;

  const selected =
    allQuestions.slice(start, end);

  if (
    selected.length !==
    QUESTIONS_PER_ROUND
  ) {
    throw new Error(
      `Round ${roundNumber} does not contain ${QUESTIONS_PER_ROUND} valid questions.`
    );
  }

  /*
    Copy the objects so changing the option order
    does not modify the original questions array.
  */

  return selected.map(question => ({
    ...question,
    options: [...question.options]
  }));
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(array) {
  const copy = [...array];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] =
      [copy[j], copy[i]];
  }

  return copy;
}


/* =========================================================
   START NEW ROUND
   ========================================================= */

function startNewRound(round) {
  try {
    const roundNumber = Number(round);

    if (!isRoundUnlocked(roundNumber)) {
      showError(
        `Round ${roundNumber} is still locked.`
      );
      return;
    }

    if (
      !Array.isArray(allQuestions) ||
      allQuestions.length <
        QUESTIONS_PER_ROUND
    ) {
      showError(
        "Not enough questions are available."
      );
      return;
    }

    currentRound = roundNumber;
    currentQuestionIndex = 0;

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    currentReview = [];

    answeredCurrentQuestion = false;

    roundQuestions =
      selectQuestionsForRound(
        currentRound
      );

    /*
      Shuffle only the answer choices.
      The questions remain assigned to their round.
    */

    roundQuestions =
      roundQuestions.map(question => ({
        ...question,
        options: shuffleArray(
          question.options
        )
      }));

    saveCurrentRound();

    showScreen(getQuizScreen());

    startMusic();

    renderCurrentQuestion();

  } catch (error) {
    console.error(
      "Start round error:",
      error
    );

    showError(
      "There was a problem starting this round. Please try again."
    );
  }
}


/* =========================================================
   START QUIZ
   ========================================================= */

async function startQuiz() {
  playSound("click");

  /*
    This makes Start Quiz safe even if the user
    presses it before questions.json has finished loading.
  */

  if (
    !Array.isArray(allQuestions) ||
    allQuestions.length < QUESTIONS_PER_ROUND
  ) {
    const loaded = await loadQuestions();

    if (!loaded) {
      return;
    }
  }

  if (TOTAL_ROUNDS < 1) {
    showError(
      "No playable rounds were found."
    );
    return;
  }

  startNewRound(1);
}


/* =========================================================
   CONTINUE QUIZ
   ========================================================= */

function continueQuiz() {
  playSound("click");

  const progress = readStorage(
    STORAGE.progress,
    null
  );

  if (
    !progress ||
    !Array.isArray(progress.roundQuestions) ||
    progress.roundQuestions.length === 0
  ) {
    startQuiz();
    return;
  }

  currentRound =
    Number(progress.currentRound) || 1;

  currentQuestionIndex =
    Number(progress.currentQuestionIndex) || 0;

  score =
    Number(progress.score) || 0;

  correctAnswers =
    Number(progress.correctAnswers) || 0;

  wrongAnswers =
    Number(progress.wrongAnswers) || 0;

  roundQuestions =
    progress.roundQuestions;

  currentReview =
    Array.isArray(progress.currentReview)
      ? progress.currentReview
      : [];

  answeredCurrentQuestion = false;

  if (
    currentQuestionIndex < 0 ||
    currentQuestionIndex >=
      roundQuestions.length
  ) {
    currentQuestionIndex = 0;
  }

  if (
    !isRoundUnlocked(currentRound)
  ) {
    currentRound = 1;
    currentQuestionIndex = 0;
    roundQuestions =
      selectQuestionsForRound(1);
  }

  showScreen(getQuizScreen());

  startMusic();

  renderCurrentQuestion();
}


/* =========================================================
   SAVE CURRENT ROUND
   ========================================================= */

function saveCurrentRound() {
  writeStorage(
    STORAGE.currentRound,
    currentRound
  );
}


function saveProgress() {
  if (
    !Array.isArray(roundQuestions) ||
    roundQuestions.length === 0
  ) {
    return;
  }

  const progress = {
    currentRound,
    currentQuestionIndex,
    score,
    correctAnswers,
    wrongAnswers,
    roundQuestions,
    currentReview
  };

  writeStorage(
    STORAGE.progress,
    progress
  );

  saveCurrentRound();

  updateContinueButton();
}


function clearProgress() {
  removeStorage(STORAGE.progress);

  updateContinueButton();
}


/* =========================================================
   CONTINUE BUTTON
   ========================================================= */

function updateContinueButton() {
  const continueBtn =
    getElement("continueBtn");

  if (!continueBtn) {
    return;
  }

  const progress = readStorage(
    STORAGE.progress,
    null
  );

  const hasProgress =
    progress &&
    Array.isArray(progress.roundQuestions) &&
    progress.roundQuestions.length > 0;

  if (hasProgress) {
    continueBtn.style.display = "";
    continueBtn.disabled = false;
  } else {
    continueBtn.style.display = "none";
  }
}


/* =========================================================
   RENDER CURRENT QUESTION
   ========================================================= */

function renderCurrentQuestion() {
  if (
    !roundQuestions ||
    !roundQuestions.length
  ) {
    showError(
      "No questions are available for this round."
    );
    return;
  }

  if (
    currentQuestionIndex >=
    roundQuestions.length
  ) {
    finishRound();
    return;
  }

  const question =
    roundQuestions[
      currentQuestionIndex
    ];

  if (!question) {
    showError(
      "This question could not be loaded."
    );
    return;
  }

  answeredCurrentQuestion = false;

  updateQuestionNumber();

  updateRoundDisplay();

  updateScoreDisplay();

  updateCategory(question.category);

  updateQuestionText(
    question.question
  );

  renderOptions(question.options);

  resetMessage();

  resetNextButton();

  startTimer();

  updateProgressBar();

  saveProgress();
}


/* =========================================================
   QUESTION NUMBER
   ========================================================= */

function updateQuestionNumber() {
  const element = getElement(
    "questionNumber"
  );

  if (!element) {
    return;
  }

  const number =
    currentQuestionIndex + 1;

  element.textContent =
    `Question ${number} of ${roundQuestions.length}`;
}


/* =========================================================
   ROUND DISPLAY
   ========================================================= */

function updateRoundDisplay() {
  const element = getElement(
    "roundDisplay",
    "roundLabel"
  );

  if (!element) {
    return;
  }

  element.textContent =
    `Round ${currentRound}`;
}


/* =========================================================
   SCORE DISPLAY
   ========================================================= */

function updateScoreDisplay() {
  const element = getElement(
    "score",
    "scoreLabel"
  );

  if (!element) {
    return;
  }

  element.textContent =
    `Score: ${score}`;
}


/* =========================================================
   CATEGORY
   ========================================================= */

function updateCategory(category) {
  const element =
    getElement("category");

  if (!element) {
    return;
  }

  element.textContent =
    category || "General Knowledge";
}


/* =========================================================
   QUESTION TEXT
   ========================================================= */

function updateQuestionText(text) {
  const element = getElement(
    "question",
    "questionText"
  );

  if (!element) {
    console.warn(
      "Question text element not found."
    );
    return;
  }

  /*
    textContent is intentionally used.
    This prevents question JSON from injecting HTML.
  */

  element.textContent = text;
}


/* =========================================================
   OPTIONS
   ========================================================= */

function renderOptions(options) {
  const container =
    getElement("options");

  if (!container) {
    console.warn(
      "Options container not found."
    );
    return;
  }

  container.innerHTML = "";

  options.forEach(
    (option, index) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className = "option-btn";

      button.dataset.option =
        option;

      button.dataset.index =
        String(index);

      button.textContent =
        option;

      button.addEventListener(
        "click",
        () => {
          answerQuestion(
            option,
            button
          );
        }
      );

      container.appendChild(button);
    }
  );
}


/* =========================================================
   ANSWER QUESTION
   ========================================================= */

function answerQuestion(
  selectedAnswer,
  selectedButton
) {
  if (answeredCurrentQuestion) {
    return;
  }

  const question =
    roundQuestions[
      currentQuestionIndex
    ];

  if (!question) {
    return;
  }

  answeredCurrentQuestion = true;

  stopTimer();

  playSound("answer");

  const buttons =
    document.querySelectorAll(
      "#options button"
    );

  buttons.forEach(button => {
    button.disabled = true;

    const value =
      button.dataset.option;

    if (
      value &&
      value.toLowerCase() ===
        question.answer.toLowerCase()
    ) {
      button.classList.add("correct");
    }
  });

  const isCorrect =
    selectedAnswer.toLowerCase() ===
    question.answer.toLowerCase();

  if (isCorrect) {
    correctAnswers++;

    score += POINTS_PER_CORRECT;

    selectedButton.classList.add(
      "correct"
    );

    showMessage(
      "Correct! 🎉",
      "correct"
    );
  } else {
    wrongAnswers++;

    selectedButton.classList.add(
      "wrong"
    );

    showMessage(
      `Wrong. Correct answer: ${question.answer}`,
      "wrong"
    );
  }

  currentReview.push({
    question: question.question,
    options: [...question.options],
    correctAnswer: question.answer,
    selectedAnswer: selectedAnswer,
    isCorrect: isCorrect,
    category: question.category
  });

  updateScoreDisplay();

  showNextButton();

  saveProgress();
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  text,
  type = ""
) {
  const message =
    getElement("message");

  if (!message) {
    return;
  }

  message.textContent = text;

  message.classList.remove(
    "correct",
    "wrong"
  );

  if (type) {
    message.classList.add(type);
  }
}


function resetMessage() {
  const message =
    getElement("message");

  if (!message) {
    return;
  }

  message.textContent = "";

  message.classList.remove(
    "correct",
    "wrong"
  );
}


/* =========================================================
   NEXT BUTTON
   ========================================================= */

function showNextButton() {
  const nextBtn =
    getElement("nextBtn");

  if (!nextBtn) {
    return;
  }

  nextBtn.disabled = false;

  /*
    Use normal display behavior so existing CSS
    continues controlling the design.
  */

  nextBtn.style.display = "";
}


function resetNextButton() {
  const nextBtn =
    getElement("nextBtn");

  if (!nextBtn) {
    return;
  }

  nextBtn.disabled = true;

  /*
    Do not force a new design.
    The existing CSS controls its appearance.
  */

  nextBtn.style.display = "";
}


/* =========================================================
   NEXT QUESTION
   ========================================================= */

function nextQuestion() {
  playSound("click");

  if (!answeredCurrentQuestion) {
    return;
  }

  currentQuestionIndex++;

  if (
    currentQuestionIndex >=
    roundQuestions.length
  ) {
    finishRound();
    return;
  }

  renderCurrentQuestion();
}


/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {
  stopTimer();

  timeLeft = TIME_PER_QUESTION;

  updateTimerDisplay();

  timerInterval =
    setInterval(() => {
      timeLeft--;

      updateTimerDisplay();

      if (timeLeft <= 0) {
        stopTimer();

        handleTimeOut();
      }
    }, 1000);
}


function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);

    timerInterval = null;
  }
}


function updateTimerDisplay() {
  const timer =
    getElement("timer");

  if (!timer) {
    return;
  }

  timer.textContent =
    String(Math.max(0, timeLeft));
}


function handleTimeOut() {
  if (answeredCurrentQuestion) {
    return;
  }

  const question =
    roundQuestions[
      currentQuestionIndex
    ];

  if (!question) {
    return;
  }

  answeredCurrentQuestion = true;

  wrongAnswers++;

  playSound("wrong");

  const buttons =
    document.querySelectorAll(
      "#options button"
    );

  buttons.forEach(button => {
    button.disabled = true;

    const value =
      button.dataset.option;

    if (
      value &&
      value.toLowerCase() ===
        question.answer.toLowerCase()
    ) {
      button.classList.add("correct");
    }
  });

  showMessage(
    `Time's up! Correct answer: ${question.answer}`,
    "wrong"
  );

  currentReview.push({
    question: question.question,
    options: [...question.options],
    correctAnswer: question.answer,
    selectedAnswer: "",
    isCorrect: false,
    category: question.category,
    timedOut: true
  });

  showNextButton();

  saveProgress();
}


/* =========================================================
   PROGRESS BAR
   ========================================================= */

function updateProgressBar() {
  const progressBar =
    getElement("progressBar");

  if (!progressBar) {
    return;
  }

  const total =
    roundQuestions.length || 1;

  const current =
    currentQuestionIndex + 1;

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (current / total) * 100
      )
    );

  progressBar.style.width =
    `${percent}%`;
}


/* =========================================================
   FINISH ROUND
   ========================================================= */

function finishRound() {
  stopTimer();

  const totalQuestions =
    roundQuestions.length || 1;

  const percentage =
    Math.round(
      (correctAnswers /
        totalQuestions) *
        100
    );

  const stars =
    calculateStars(percentage);

  unlockNextRound(
    currentRound,
    percentage
  );

  saveCompletedRound(
    currentRound
  );

  saveRoundStars(
    currentRound,
    stars
  );

  updateAchievements();

  updatePersonalBest(
    percentage
  );

  saveTotalScore();

  clearProgress();

  renderResult(
    percentage,
    stars
  );

  renderRounds();

  updateContinueButton();

  stopMusic();

  showScreen(
    getResultScreen()
  );
}


/* =========================================================
   STARS
   ========================================================= */

function calculateStars(percentage) {
  if (percentage >= 80) {
    return 3;
  }

  if (percentage >= 60) {
    return 2;
  }

  return 1;
}


function getRoundStars(round) {
  const stars =
    readStorage(
      STORAGE.roundStars,
      {}
    );

  if (
    !stars ||
    typeof stars !== "object"
  ) {
    return 0;
  }

  return Number(
    stars[String(round)]
  ) || 0;
}


function saveRoundStars(
  round,
  stars
) {
  const data =
    readStorage(
      STORAGE.roundStars,
      {}
    );

  if (
    !data ||
    typeof data !== "object"
  ) {
    return;
  }

  const oldStars =
    Number(data[String(round)]) || 0;

  if (stars > oldStars) {
    data[String(round)] =
      stars;

    writeStorage(
      STORAGE.roundStars,
      data
    );
  }
}


/* =========================================================
   COMPLETED ROUNDS
   ========================================================= */

function saveCompletedRound(
  round
) {
  let completed =
    readStorage(
      STORAGE.completedRounds,
      []
    );

  if (!Array.isArray(completed)) {
    completed = [];
  }

  if (!completed.includes(round)) {
    completed.push(round);
  }

  completed.sort(
    (a, b) => a - b
  );

  writeStorage(
    STORAGE.completedRounds,
    completed
  );
}


/* =========================================================
   RESULT SCREEN
   ========================================================= */

function renderResult(
  percentage,
  stars
) {
  const finalScore =
    getElement("finalScore");

  const resultScore =
    getElement("resultScore");

  const resultPercent =
    getElement("resultPercent");

  const resultMessage =
    getElement("resultMessage");

  const correctCount =
    getElement("correctCount");

  const wrongCount =
    getElement("wrongCount");

  const finishedRound =
    getElement("finishedRound");

  if (finalScore) {
    finalScore.textContent =
      String(score);
  }

  if (resultScore) {
    resultScore.textContent =
      String(score);
  }

  if (resultPercent) {
    resultPercent.textContent =
      `${percentage}%`;
  }

  if (correctCount) {
    correctCount.textContent =
      String(correctAnswers);
  }

  if (wrongCount) {
    wrongCount.textContent =
      String(wrongAnswers);
  }

  if (finishedRound) {
    finishedRound.textContent =
      `Round ${currentRound}`;
  }

  if (resultMessage) {
    if (percentage >= 80) {
      resultMessage.textContent =
        "Excellent! You earned 3 stars! 🌟🌟🌟";
    } else if (percentage >= 60) {
      resultMessage.textContent =
        "Great job! You earned 2 stars! 🌟🌟";
    } else {
      resultMessage.textContent =
        "Good effort! Keep learning and try again. ⭐";
    }
  }

  /*
    Next Round button
  */

  const nextRoundBtn =
    getElement("nextRoundBtn");

  if (nextRoundBtn) {
    if (
      currentRound <
      TOTAL_ROUNDS
    ) {
      if (
        isRoundUnlocked(
          currentRound + 1
        )
      ) {
        nextRoundBtn.disabled = false;
        nextRoundBtn.style.display = "";
      } else {
        nextRoundBtn.disabled = true;
        nextRoundBtn.style.display = "";
      }
    } else {
      nextRoundBtn.disabled = true;
      nextRoundBtn.style.display = "";
    }
  }
}


/* =========================================================
   NEXT ROUND
   ========================================================= */

function nextRound() {
  playSound("click");

  const next =
    currentRound + 1;

  if (next > TOTAL_ROUNDS) {
    renderRounds();

    showScreen(
      getRoundsScreen()
    );

    return;
  }

  if (!isRoundUnlocked(next)) {
    return;
  }

  startNewRound(next);
}


/* =========================================================
   RETRY CURRENT ROUND
   ========================================================= */

function retryRound() {
  playSound("click");

  clearProgress();

  startNewRound(
    currentRound
  );
}


/* =========================================================
   REVIEW
   ========================================================= */

function renderReview() {
  const reviewList =
    getElement("reviewList");

  const reviewSummary =
    getElement("reviewSummary");

  if (!reviewList) {
    return;
  }

  reviewList.innerHTML = "";

  if (reviewSummary) {
    reviewSummary.textContent =
      `${correctAnswers} correct · ${wrongAnswers} wrong`;
  }

  if (
    !currentReview ||
    currentReview.length === 0
  ) {
    const empty =
      document.createElement("p");

    empty.textContent =
      "No answers to review.";

    reviewList.appendChild(empty);

    return;
  }

  currentReview.forEach(
    (item, index) => {
      const wrapper =
        document.createElement("div");

      wrapper.className =
        "review-item";

      const question =
        document.createElement("h3");

      question.textContent =
        `${index + 1}. ${item.question}`;

      wrapper.appendChild(question);

      const yourAnswer =
        document.createElement("p");

      yourAnswer.textContent =
        item.selectedAnswer
          ? `Your answer: ${item.selectedAnswer}`
          : "Your answer: No answer";

      wrapper.appendChild(
        yourAnswer
      );

      const correctAnswer =
        document.createElement("p");

      correctAnswer.textContent =
        `Correct answer: ${item.correctAnswer}`;

      wrapper.appendChild(
        correctAnswer
      );

      const status =
        document.createElement("p");

      status.textContent =
        item.isCorrect
          ? "Correct ✅"
          : "Incorrect ❌";

      status.classList.add(
        item.isCorrect
          ? "correct"
          : "wrong"
      );

      wrapper.appendChild(status);

      reviewList.appendChild(
        wrapper
      );
    }
  );
}


function openReview() {
  playSound("click");

  renderReview();

  showScreen(
    getReviewScreen()
  );
}


function reviewRetry() {
  playSound("click");

  startNewRound(
    currentRound
  );
}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function updateAchievements() {
  let achievements =
    readStorage(
      STORAGE.achievements,
      []
    );

  if (!Array.isArray(achievements)) {
    achievements = [];
  }

  const completedRounds =
    readStorage(
      STORAGE.completedRounds,
      []
    );

  const totalCorrect =
    getTotalCorrectAnswers();

  const addAchievement =
    id => {
      if (!achievements.includes(id)) {
        achievements.push(id);
      }
    };

  if (
    completedRounds.includes(1)
  ) {
    addAchievement(
      "first_round"
    );
  }

  if (
    completedRounds.length >= 5
  ) {
    addAchievement(
      "five_rounds"
    );
  }

  if (
    totalCorrect >= 50
  ) {
    addAchievement(
      "fifty_correct"
    );
  }

  if (
    completedRounds.length >=
    TOTAL_ROUNDS
  ) {
    addAchievement(
      "all_rounds"
    );
  }

  writeStorage(
    STORAGE.achievements,
    achievements
  );
}


/* =========================================================
   TOTAL CORRECT ANSWERS
   ========================================================= */

function getTotalCorrectAnswers() {
  /*
    We keep a permanent total in storage.
    Current round correct answers are added when the round ends.
  */

  const saved =
    Number(
      localStorage.getItem(
        "quizmasterTotalCorrect"
      )
    ) || 0;

  return saved;
}


function saveRoundCorrectAnswers() {
  const oldTotal =
    Number(
      localStorage.getItem(
        "quizmasterTotalCorrect"
      )
    ) || 0;

  const newTotal =
    oldTotal + correctAnswers;

  try {
    localStorage.setItem(
      "quizmasterTotalCorrect",
      String(newTotal)
    );
  } catch (error) {
    console.warn(error);
  }
}


/* =========================================================
   PERSONAL BEST
   ========================================================= */

function updatePersonalBest(
  percentage
) {
  const oldBest =
    Number(
      localStorage.getItem(
        STORAGE.personalBest
      )
    ) || 0;

  if (percentage > oldBest) {
    try {
      localStorage.setItem(
        STORAGE.personalBest,
        String(percentage)
      );
    } catch (error) {
      console.warn(error);
    }
  }
}


/* =========================================================
   TOTAL SCORE
   ========================================================= */

function saveTotalScore() {
  const oldTotal =
    Number(
      localStorage.getItem(
        STORAGE.totalScore
      )
    ) || 0;

  const newTotal =
    oldTotal + score;

  try {
    localStorage.setItem(
      STORAGE.totalScore,
      String(newTotal)
    );
  } catch (error) {
    console.warn(error);
  }
}


/* =========================================================
   MUSIC
   ========================================================= */

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
    savedMusic === null
      ? true
      : savedMusic === "true";

  soundEnabled =
    savedSound === null
      ? true
      : savedSound === "true";

  updateSettingsSwitches();
}


function updateSettingsSwitches() {
  const musicSwitch =
    getElement("musicSwitch");

  const soundSwitch =
    getElement("soundSwitch");

  if (musicSwitch) {
    musicSwitch.checked =
      musicEnabled;
  }

  if (soundSwitch) {
    soundSwitch.checked =
      soundEnabled;
  }
}


function createMusicAudio() {
  if (musicAudio) {
    return musicAudio;
  }

  musicAudio =
    new Audio("./music.mp3");

  musicAudio.loop = true;

  musicAudio.volume = 0.35;

  musicAudio.preload = "auto";

  return musicAudio;
}


function startMusic() {
  if (!musicEnabled) {
    return;
  }

  try {
    const audio =
      createMusicAudio();

    const promise =
      audio.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(
        error => {
          /*
            Browsers may block autoplay.
            We intentionally do not show
            an error to the player.
          */

          console.log(
            "Music playback waiting for user interaction.",
            error
          );
        }
      );
    }

    audioInitialized = true;

  } catch (error) {
    console.warn(
      "Music error:",
      error
    );
  }
}


function stopMusic() {
  if (!musicAudio) {
    return;
  }

  try {
    musicAudio.pause();
    musicAudio.currentTime = 0;
  } catch (error) {
    console.warn(error);
  }
}


/* =========================================================
   SOUND EFFECTS
   ========================================================= */

function playSound(type) {
  if (!soundEnabled) {
    return;
  }

  try {
    /*
      Small Web Audio sound effects.
      This does NOT change the visual design.
    */

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const context =
      new AudioContext();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.connect(gain);

    gain.connect(
      context.destination
    );

    let frequency = 500;
    let duration = 0.08;

    if (type === "click") {
      frequency = 500;
      duration = 0.06;
    }

    if (type === "answer") {
      frequency = 700;
      duration = 0.1;
    }

    if (type === "wrong") {
      frequency = 220;
      duration = 0.15;
    }

    oscillator.frequency.value =
      frequency;

    oscillator.type = "sine";

    gain.gain.setValueAtTime(
      0.05,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration
    );

    oscillator.start();

    oscillator.stop(
      context.currentTime + duration
    );

    oscillator.addEventListener(
      "ended",
      () => {
        try {
          context.close();
        } catch (error) {
          /* ignore */
        }
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
   SETTINGS
   ========================================================= */

function setMusicEnabled(enabled) {
  musicEnabled =
    Boolean(enabled);

  localStorage.setItem(
    STORAGE.music,
    String(musicEnabled)
  );

  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}


function setSoundEnabled(enabled) {
  soundEnabled =
    Boolean(enabled);

  localStorage.setItem(
    STORAGE.sound,
    String(soundEnabled)
  );

  if (soundEnabled) {
    playSound("click");
  }
}


function openSettings() {
  playSound("click");

  showScreen(
    getSettingsScreen()
  );
}


/* =========================================================
   HOME
   ========================================================= */

function goHome() {
  playSound("click");

  stopTimer();

  stopMusic();

  showScreen(
    getHomeScreen()
  );

  updateContinueButton();
}


/* =========================================================
   ROUNDS SCREEN
   ========================================================= */

function openRounds() {
  playSound("click");

  renderRounds();

  showScreen(
    getRoundsScreen()
  );
}


/* =========================================================
   SHARE
   ========================================================= */

async function shareQuiz() {
  playSound("click");

  const shareUrl =
    window.location.href;

  const shareText =
    "Test your knowledge with Quiz Master!";

  try {
    if (
      navigator.share
    ) {
      await navigator.share({
        title:
          "Quiz Master 🇷🇼",
        text:
          shareText,
        url:
          shareUrl
      });

      return;
    }

  } catch (error) {
    /*
      AbortError means the user simply
      closed the share dialog.
    */

    if (
      error &&
      error.name === "AbortError"
    ) {
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(
      shareUrl
    );

    const shareBtn =
      getElement("shareBtn");

    if (shareBtn) {
      const original =
        shareBtn.textContent;

      shareBtn.textContent =
        "✅ Link Copied!";

      setTimeout(() => {
        shareBtn.textContent =
          original;
      }, 1800);
    }

  } catch (error) {
    console.warn(
      "Clipboard error:",
      error
    );
  }
}


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

  /* -----------------------------------------
     HOME
     ----------------------------------------- */

  const startBtn =
    getElement("startBtn");

  if (startBtn) {
    startBtn.addEventListener(
      "click",
      startQuiz
    );
  }


  const continueBtn =
    getElement("continueBtn");

  if (continueBtn) {
    continueBtn.addEventListener(
      "click",
      continueQuiz
    );
  }


  const roundsBtn =
    getElement("roundsBtn");

  if (roundsBtn) {
    roundsBtn.addEventListener(
      "click",
      openRounds
    );
  }


  const settingsBtn =
    getElement("settingsBtn");

  if (settingsBtn) {
    settingsBtn.addEventListener(
      "click",
      openSettings
    );
  }


  const shareBtn =
    getElement("shareBtn");

 
