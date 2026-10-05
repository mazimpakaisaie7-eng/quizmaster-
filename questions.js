(() => {
  "use strict";

  /* =========================================================
     QUIZ MASTER 🇷🇼
     QUESTIONS ENGINE
     FULL VERSION + DIFFICULTY
     ========================================================= */

  /* =========================
     CONFIGURATION
     ========================= */

  const QUESTIONS_FILE = "./questions.json";
  const MUSIC_FILE = "./mythica.mp3";

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const UNLOCK_PERCENT = 60;

  /* =========================
     DIFFICULTIES
     ========================= */

  const DIFFICULTIES = {
    easy: {
      label: "Easy",
      icon: "🟢",
      description: "Beginner-friendly questions"
    },

    medium: {
      label: "Medium",
      icon: "🟡",
      description: "Balanced challenge"
    },

    hard: {
      label: "Hard",
      icon: "🔴",
      description: "Challenging questions"
    }
  };

  const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

  /* =========================
     STORAGE
     ========================= */

  const STORAGE = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    musicPosition: "quizmasterMusicPosition",

    completedRounds: "quizmasterCompletedRounds",
    roundStars: "quizmasterRoundStars",

    achievements: "quizmasterAchievements",
    personalBest: "quizmasterPersonalBest",
    totalScore: "quizmasterTotalScore",
    dailyChallenge: "quizmasterDailyChallenge",

    difficulty: "quizmasterDifficulty"
  };

  /* =========================
     STATE
     ========================= */

  let allQuestions = [];
  let rounds = [];

  let selectedDifficulty =
    normalizeDifficulty(
      localStorage.getItem(STORAGE.difficulty) || "medium"
    );

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let currentRoundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let selectedAnswer = null;
  let answered = false;

  let timerInterval = null;
  let timeLeft = TIME_PER_QUESTION;

  let quizFinished = false;

  let reviewQuestions = [];

  let musicEnabled =
    localStorage.getItem(STORAGE.music) !== "false";

  let soundEnabled =
    localStorage.getItem(STORAGE.sound) !== "false";

  let backgroundMusic = null;

  let musicInteractionListenersAdded = false;
  let musicPlayInProgress = false;
  let musicSaveInterval = null;

  /* =========================
     DOM ELEMENTS
     ========================= */

  const elements = {
    homeScreen: document.getElementById("homeScreen"),
    roundsScreen: document.getElementById("roundsScreen"),
    quizScreen: document.getElementById("quizScreen"),
    resultScreen: document.getElementById("resultScreen"),
    reviewScreen: document.getElementById("reviewScreen"),
    errorScreen: document.getElementById("errorScreen"),
    settingsScreen: document.getElementById("settingsScreen"),

    startBtn: document.getElementById("startBtn"),
    continueBtn: document.getElementById("continueBtn"),
    roundsBtn: document.getElementById("roundsBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    shareBtn: document.getElementById("shareBtn"),

    roundsBackBtn: document.getElementById("roundsBackBtn"),
    roundGrid: document.getElementById("roundGrid"),

    questionNumber: document.getElementById("questionNumber"),
    roundDisplay: document.getElementById("roundDisplay"),
    score: document.getElementById("score"),
    timer: document.getElementById("timer"),
    progressBar: document.getElementById("progressBar"),
    category: document.getElementById("category"),
    question: document.getElementById("question"),
    options: document.getElementById("options"),
    message: document.getElementById("message"),
    nextBtn: document.getElementById("nextBtn"),

    quizHomeBtn: document.getElementById("quizHomeBtn"),

    nextRoundBtn: document.getElementById("nextRoundBtn"),
    restartBtn: document.getElementById("restartBtn"),
    reviewBtn: document.getElementById("reviewBtn"),
    resultHomeBtn: document.getElementById("resultHomeBtn"),

    correctCount: document.getElementById("correctCount"),
    wrongCount: document.getElementById("wrongCount"),
    finalScore: document.getElementById("finalScore"),
    resultPercent: document.getElementById("resultPercent"),
    resultMessage: document.getElementById("resultMessage"),
    finishedRound: document.getElementById("finishedRound"),

    reviewList: document.getElementById("reviewList"),
    reviewSummary: document.getElementById("reviewSummary"),
    reviewRetryBtn: document.getElementById("reviewRetryBtn"),
    reviewBackBtn: document.getElementById("reviewBackBtn"),

    musicSwitch: document.getElementById("musicSwitch"),
    soundSwitch: document.getElementById("soundSwitch"),
    settingsBackBtn: document.getElementById("settingsBackBtn"),

    errorMessage: document.getElementById("errorMessage"),
    errorRestartBtn: document.getElementById("errorRestartBtn"),
    errorHomeBtn: document.getElementById("errorHomeBtn")
  };

  /* =========================
     HELPERS
     ========================= */

  function $(id) {
    return document.getElementById(id);
  }

  function safeText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  }

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      console.warn("Quiz Master JSON read error:", key, error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Quiz Master JSON write error:", key, error);
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeDifficulty(value) {
    const difficulty = safeText(value)
      .trim()
      .toLowerCase();

    if (difficulty === "low") {
      return "easy";
    }

    if (difficulty === "beginner") {
      return "easy";
    }

    if (difficulty === "normal") {
      return "medium";
    }

    if (difficulty === "difficult") {
      return "hard";
    }

    if (DIFFICULTIES[difficulty]) {
      return difficulty;
    }

    return "medium";
  }

  function difficultyLabel(value) {
    const difficulty = normalizeDifficulty(value);
    return DIFFICULTIES[difficulty].label;
  }

  function difficultyIcon(value) {
    const difficulty = normalizeDifficulty(value);
    return DIFFICULTIES[difficulty].icon;
  }

  function getQuestionText(question) {
    if (
      question &&
      typeof question.question_rw === "string" &&
      question.question_rw.trim()
    ) {
      return question.question_rw;
    }

    return safeText(question && question.question);
  }

  /* =========================
     QUESTION VALIDATION
     ========================= */

  function validateQuestion(question, index) {
    if (!question || typeof question !== "object") {
      throw new Error(
        `Invalid question at position ${index + 1}.`
      );
    }

    if (
      typeof question.question !== "string" ||
      !question.question.trim()
    ) {
      throw new Error(
        `Question ${index + 1} is missing "question".`
      );
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      throw new Error(
        `Question ${index + 1} must have at least 2 options.`
      );
    }

    const options = question.options.map(option =>
      safeText(option).trim()
    );

    if (options.some(option => !option)) {
      throw new Error(
        `Question ${index + 1} contains an empty option.`
      );
    }

    if (
      typeof question.answer !== "string" ||
      !question.answer.trim()
    ) {
      throw new Error(
        `Question ${index + 1} is missing "answer".`
      );
    }

    const answer = question.answer.trim();

    if (!options.includes(answer)) {
      throw new Error(
        `Question ${index + 1}: answer must exactly match one of the options.`
      );
    }

    /*
      IMPORTANT:
      If old questions do not have difficulty,
      they automatically become Medium.
    */

    const difficulty = normalizeDifficulty(
      question.difficulty || "medium"
    );

    return {
      ...question,
      options,
      answer,
      difficulty
    };
  }

  /* =========================
     DIFFICULTY QUESTIONS
     ========================= */

  function getQuestionsForDifficulty(difficulty = selectedDifficulty) {
    const normalized = normalizeDifficulty(difficulty);

    return allQuestions.filter(
      question =>
        normalizeDifficulty(question.difficulty) === normalized
    );
  }

  function ensureValidDifficulty() {
    if (!allQuestions.length) {
      return;
    }

    const hasCurrentDifficulty =
      allQuestions.some(
        question =>
          normalizeDifficulty(question.difficulty) ===
          selectedDifficulty
      );

    if (hasCurrentDifficulty) {
      return;
    }

    const availableDifficulty = DIFFICULTY_ORDER.find(
      difficulty =>
        allQuestions.some(
          question =>
            normalizeDifficulty(question.difficulty) === difficulty
        )
    );

    if (availableDifficulty) {
      selectedDifficulty = availableDifficulty;

      localStorage.setItem(
        STORAGE.difficulty,
        selectedDifficulty
      );
    }
  }

  /* =========================
     BUILD ROUNDS
     ========================= */

  function buildRounds() {
    rounds = [];

    const difficultyQuestions =
      getQuestionsForDifficulty(selectedDifficulty);

    for (
      let i = 0;
      i < difficultyQuestions.length;
      i += QUESTIONS_PER_ROUND
    ) {
      rounds.push(
        difficultyQuestions.slice(
          i,
          i + QUESTIONS_PER_ROUND
        )
      );
    }

    return rounds;
  }

  /* =========================
     DIFFICULTY STORAGE
     ========================= */

  function difficultyStorageKey(baseKey, difficulty = selectedDifficulty) {
    return `${baseKey}_${normalizeDifficulty(difficulty)}`;
  }

  /* =========================
     UNLOCKED ROUNDS
     ========================= */

  function initializeUnlockedRounds() {
    const key = difficultyStorageKey(
      STORAGE.unlockedRounds
    );

    let unlocked = readJSON(key, null);

    if (!Array.isArray(unlocked)) {
      /*
        Compatibility with the old version.

        Old progress did not have difficulty.
        We use it only for Medium.
      */

      if (selectedDifficulty === "medium") {
        const oldUnlocked = readJSON(
          STORAGE.unlockedRounds,
          null
        );

        if (Array.isArray(oldUnlocked)) {
          unlocked = oldUnlocked;
        }
      }
    }

    if (!Array.isArray(unlocked)) {
      unlocked = [1];
    }

    unlocked = unlocked
      .map(Number)
      .filter(
        roundNumber =>
          Number.isInteger(roundNumber) &&
          roundNumber >= 1 &&
          roundNumber <= rounds.length
      );

    if (!unlocked.includes(1) && rounds.length > 0) {
      unlocked.unshift(1);
    }

    unlocked = [...new Set(unlocked)].sort(
      (a, b) => a - b
    );

    writeJSON(key, unlocked);

    return unlocked;
  }

  function getUnlockedRounds() {
    const key = difficultyStorageKey(
      STORAGE.unlockedRounds
    );

    let unlocked = readJSON(key, null);

    if (!Array.isArray(unlocked)) {
      initializeUnlockedRounds();
      unlocked = readJSON(key, [1]);
    }

    return unlocked;
  }

  function isRoundUnlocked(roundNumber) {
    return getUnlockedRounds().includes(
      Number(roundNumber)
    );
  }

  function updateUnlockedRounds() {
    if (!rounds.length) {
      return;
    }

    const unlocked = getUnlockedRounds();

    const nextRoundNumber = currentRound + 1;

    if (
      nextRoundNumber <= rounds.length &&
      !unlocked.includes(nextRoundNumber)
    ) {
      const percentage =
        currentRoundQuestions.length > 0
          ? Math.round(
              (correctAnswers /
                currentRoundQuestions.length) *
                100
            )
          : 0;

      if (percentage >= UNLOCK_PERCENT) {
        unlocked.push(nextRoundNumber);

        unlocked.sort((a, b) => a - b);

        writeJSON(
          difficultyStorageKey(
            STORAGE.unlockedRounds
          ),
          unlocked
        );
      }
    }
  }

  /* =========================
     COMPLETED ROUNDS
     ========================= */

  function getCompletedRoundsForDifficulty(
    difficulty = selectedDifficulty
  ) {
    const key = difficultyStorageKey(
      STORAGE.completedRounds,
      difficulty
    );

    let completed = readJSON(key, null);

    if (!Array.isArray(completed)) {
      /*
        Migrate old completed rounds to Medium.
      */

      if (normalizeDifficulty(difficulty) === "medium") {
        const oldCompleted = readJSON(
          STORAGE.completedRounds,
          []
        );

        if (Array.isArray(oldCompleted)) {
          completed = oldCompleted;
        }
      }
    }

    if (!Array.isArray(completed)) {
      completed = [];
    }

    return completed
      .map(Number)
      .filter(Number.isInteger);
  }

  function saveCompletedRound(roundNumber) {
    const key = difficultyStorageKey(
      STORAGE.completedRounds
    );

    const completed =
      getCompletedRoundsForDifficulty();

    if (!completed.includes(roundNumber)) {
      completed.push(roundNumber);
    }

    completed.sort((a, b) => a - b);

    writeJSON(key, completed);
  }

  /* =========================
     STARS
     ========================= */

  function getRoundStarsForDifficulty(
    difficulty = selectedDifficulty
  ) {
    const key = difficultyStorageKey(
      STORAGE.roundStars,
      difficulty
    );

    let stars = readJSON(key, null);

    if (
      !stars ||
      typeof stars !== "object" ||
      Array.isArray(stars)
    ) {
      if (normalizeDifficulty(difficulty) === "medium") {
        const oldStars = readJSON(
          STORAGE.roundStars,
          {}
        );

        if (
          oldStars &&
          typeof oldStars === "object" &&
          !Array.isArray(oldStars)
        ) {
          stars = oldStars;
        }
      }
    }

    if (
      !stars ||
      typeof stars !== "object" ||
      Array.isArray(stars)
    ) {
      stars = {};
    }

    return stars;
  }

  function saveRoundStars(roundNumber, starsCount) {
    const key = difficultyStorageKey(
      STORAGE.roundStars
    );

    const stars = getRoundStarsForDifficulty();

    stars[String(roundNumber)] = starsCount;

    writeJSON(key, stars);
  }

  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {
    try {
      const response = await fetch(
        `${QUESTIONS_FILE}?v=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load questions.json (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "questions.json must contain an array of questions."
        );
      }

      if (!data.length) {
        throw new Error(
          "questions.json does not contain any questions."
        );
      }

      allQuestions = data.map(validateQuestion);

      ensureValidDifficulty();

      buildRounds();

      if (!rounds.length) {
        throw new Error(
          `There are no ${difficultyLabel(
            selectedDifficulty
          )} questions available.`
        );
      }

      initializeUnlockedRounds();
      renderRounds();
      updateContinueButton();
      updateRewards();

      showScreen("homeScreen");
    } catch (error) {
      console.error("Quiz Master load error:", error);

      showError(
        error && error.message
          ? error.message
          : "Unable to load quiz questions."
      );
    }
  }

  /* =========================
     SCREEN SYSTEM
     ========================= */

  function showScreen(screenId) {
    const screenIds = [
      "homeScreen",
      "difficultyScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "errorScreen",
      "settingsScreen",
      "rewardsScreen"
    ];

    screenIds.forEach(id => {
      const screen = $(id);

      if (screen) {
        screen.classList.toggle(
          "active",
          id === screenId
        );
      }
    });
  }

  /* =========================
     DIFFICULTY UI
     ========================= */

  function createDifficultyUI() {
    let screen = $("difficultyScreen");

    if (!screen) {
      screen = document.createElement("section");

      screen.id = "difficultyScreen";
      screen.className = "screen";

      screen.innerHTML = `
        <div class="container">

          <div class="screen-header">
            <h2>Choose Difficulty</h2>
            <p>Select how challenging you want the quiz to be.</p>
          </div>

          <div id="difficultyGrid" class="button-group"></div>

          <button
            type="button"
            id="difficultyBackBtn"
            class="secondary-btn"
          >
            ← Back
          </button>

        </div>
      `;

      const roundsScreen =
        $("roundsScreen");

      if (
        roundsScreen &&
        roundsScreen.parentElement
      ) {
        roundsScreen.parentElement.insertBefore(
          screen,
          roundsScreen
        );
      } else {
        document.body.appendChild(screen);
      }
    }

    elements.difficultyScreen = screen;
    elements.difficultyGrid =
      $("difficultyGrid");
    elements.difficultyBackBtn =
      $("difficultyBackBtn");

    renderDifficultyOptions();
  }

  function renderDifficultyOptions(roundNumber = 1) {
    const grid =
      elements.difficultyGrid;

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    DIFFICULTY_ORDER.forEach(difficulty => {
      const info =
        DIFFICULTIES[difficulty];

      const button =
        document.createElement("button");

      button.type = "button";

      /*
        Use the existing Start Quiz button
        style when available.
      */

      button.className =
        elements.startBtn &&
        elements.startBtn.className
          ? elements.startBtn.className
          : "secondary-btn";

      button.innerHTML = `
        <span>
          ${info.icon} ${info.label}
        </span>
        <small>
          ${info.description}
        </small>
      `;

      button.addEventListener(
        "click",
        () => {
          chooseDifficulty(
            difficulty,
            roundNumber
          );
        }
      );

      grid.appendChild(button);
    });
  }

  function showDifficultySelection(
    roundNumber = 1
  ) {
    if (!allQuestions.length) {
      showError(
        "Questions are still loading. Please try again."
      );
      return;
    }

    renderDifficultyOptions(roundNumber);

    showScreen("difficultyScreen");
  }

  function chooseDifficulty(
    difficulty,
    roundNumber = 1
  ) {
    selectedDifficulty =
      normalizeDifficulty(difficulty);

    localStorage.setItem(
      STORAGE.difficulty,
      selectedDifficulty
    );

    buildRounds();

    if (!rounds.length) {
      showDifficultyMessage(
        `No ${difficultyLabel(
          selectedDifficulty
        )} questions are available yet. Add "difficulty": "${selectedDifficulty}" to questions.json.`
      );

      return;
    }

    initializeUnlockedRounds();
    renderRounds();

    const requestedRound =
      Number(roundNumber) || 1;

    const safeRound =
      requestedRound >= 1 &&
      requestedRound <= rounds.length &&
      isRoundUnlocked(requestedRound)
        ? requestedRound
        : 1;

    startQuiz(safeRound);
  }

  function showDifficultyMessage(message) {
    if (!elements.difficultyGrid) {
      return;
    }

    const oldMessage =
      $("difficultyMessage");

    if (oldMessage) {
      oldMessage.remove();
    }

    const messageElement =
      document.createElement("p");

    messageElement.id =
      "difficultyMessage";

    messageElement.className =
      "message";

    messageElement.textContent =
      message;

    elements.difficultyGrid.parentElement.insertBefore(
      messageElement,
      elements.difficultyGrid
    );
  }

  /* =========================
     START QUIZ
     ========================= */

  function startQuiz(
    roundNumber = 1,
    difficulty = null
  ) {
    if (difficulty) {
      selectedDifficulty =
        normalizeDifficulty(difficulty);

      localStorage.setItem(
        STORAGE.difficulty,
        selectedDifficulty
      );
    }

    buildRounds();

    if (!rounds.length) {
      showError(
        `No ${difficultyLabel(
          selectedDifficulty
        )} questions are available.`
      );

      return;
    }

    initializeUnlockedRounds();

    roundNumber = Number(roundNumber) || 1;

    if (
      roundNumber < 1 ||
      roundNumber > rounds.length
    ) {
      roundNumber = 1;
    }

    if (!isRoundUnlocked(roundNumber)) {
      roundNumber = 1;
    }

    stopTimer();

    currentRound = roundNumber;
    currentQuestionIndex = 0;

    currentRoundQuestions =
      [...rounds[currentRound - 1]];

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    selectedAnswer = null;
    answered = false;

    quizFinished = false;

    reviewQuestions = [];

    saveCurrentProgress();

    showScreen("quizScreen");

    renderQuestion();

    startMusic();
  }

  /* =========================
     CONTINUE QUIZ
     ========================= */

  function updateContinueButton() {
    if (!elements.continueBtn) {
      return;
    }

    const progress =
      readJSON(STORAGE.progress, null);

    const validProgress =
      progress &&
      Number.isInteger(
        Number(progress.round)
      ) &&
      Number.isInteger(
        Number(progress.questionIndex)
      );

    elements.continueBtn.style.display =
      validProgress
        ? ""
        : "none";
  }

  function continueQuiz() {
    const progress =
      readJSON(STORAGE.progress, null);

    if (!progress) {
      showDifficultySelection(1);
      return;
    }

    selectedDifficulty =
      normalizeDifficulty(
        progress.difficulty ||
        localStorage.getItem(
          STORAGE.difficulty
        ) ||
        "medium"
      );

    localStorage.setItem(
      STORAGE.difficulty,
      selectedDifficulty
    );

    buildRounds();

    if (!rounds.length) {
      showError(
        `No ${difficultyLabel(
          selectedDifficulty
        )} questions are available.`
      );

      return;
    }

    initializeUnlockedRounds();

    const savedRound =
      Number(progress.round) || 1;

    const savedQuestionIndex =
      Number(progress.questionIndex) || 0;

    if (
      savedRound < 1 ||
      savedRound > rounds.length ||
      !isRoundUnlocked(savedRound)
    ) {
      startQuiz(1);
      return;
    }

    currentRound = savedRound;

    currentRoundQuestions =
      [...rounds[currentRound - 1]];

    currentQuestionIndex =
      clamp(
        savedQuestionIndex,
        0,
        Math.max(
          0,
          currentRoundQuestions.length - 1
        )
      );

    score =
      Number(progress.score) || 0;

    correctAnswers =
      Number(progress.correctAnswers) || 0;

    wrongAnswers =
      Number(progress.wrongAnswers) || 0;

    reviewQuestions =
      Array.isArray(progress.reviewQuestions)
        ? progress.reviewQuestions
        : [];

    selectedAnswer = null;
    answered = false;
    quizFinished = false;

    showScreen("quizScreen");

    renderQuestion();

    startMusic();
  }

  /* =========================
     SAVE PROGRESS
     ========================= */

  function saveCurrentProgress() {
    const progress = {
      difficulty: selectedDifficulty,
      round: currentRound,
      questionIndex: currentQuestionIndex,
      score,
      correctAnswers,
      wrongAnswers,
      reviewQuestions
    };

    writeJSON(
      STORAGE.progress,
      progress
    );

    localStorage.setItem(
      STORAGE.currentRound,
      String(currentRound)
    );

    updateContinueButton();
  }

  function clearProgress() {
    localStorage.removeItem(
      STORAGE.progress
    );

    localStorage.removeItem(
      STORAGE.currentRound
    );

    updateContinueButton();
  }

  /* =========================
     RENDER QUESTION
     ========================= */

  function renderQuestion() {
    if (
      !currentRoundQuestions.length
    ) {
      finishRound();
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      finishRound();
      return;
    }

    answered = false;
    selectedAnswer = null;

    const totalQuestions =
      currentRoundQuestions.length;

    const questionNumber =
      currentQuestionIndex + 1;

    if (elements.questionNumber) {
      elements.questionNumber.textContent =
        `Question ${questionNumber} of ${totalQuestions}`;
    }

    if (elements.roundDisplay) {
      elements.roundDisplay.textContent =
        `Round ${currentRound} • ${difficultyIcon(
          selectedDifficulty
        )} ${difficultyLabel(
          selectedDifficulty
        )}`;
    }

    if (elements.score) {
      elements.score.textContent =
        String(score);
    }

    if (elements.category) {
      elements.category.textContent =
        safeText(
          question.category || "General"
        );
    }

    if (elements.question) {
      elements.question.textContent =
        getQuestionText(question);
    }

    if (elements.progressBar) {
      const percentage =
        (questionNumber /
          totalQuestions) *
        100;

      elements.progressBar.style.width =
        `${clamp(
          percentage,
          0,
          100
        )}%`;
    }

    if (elements.message) {
      elements.message.textContent = "";
    }

    if (elements.nextBtn) {
      elements.nextBtn.disabled = true;
    }

    renderOptions(question);

    startTimer();
  }

  /* =========================
     RENDER OPTIONS
     ========================= */

  function renderOptions(question) {
    if (!elements.options) {
      return;
    }

    elements.options.innerHTML = "";

    question.options.forEach(
      (option, index) => {
        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "option-btn";

        button.dataset.answer =
          option;

        button.innerHTML =
          `<span>${String.fromCharCode(
            65 + index
          )}.</span> ${safeText(option)}`;

        button.addEventListener(
          "click",
          () => {
            selectAnswer(
              option,
              button
            );
          }
        );

        elements.options.appendChild(
          button
        );
      }
    );
  }

  /* =========================
     SELECT ANSWER
     ========================= */

  function selectAnswer(
    answer,
    clickedButton
  ) {
    if (answered) {
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    answered = true;
    selectedAnswer = answer;

    stopTimer();

    const isCorrect =
      answer === question.answer;

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            ".option-btn"
          )
        : [];

    optionButtons.forEach(button => {
      button.disabled = true;

      if (
        button.dataset.answer ===
        question.answer
      ) {
        button.classList.add(
          "correct"
        );
      }

      if (
        button.dataset.answer ===
          answer &&
        !isCorrect
      ) {
        button.classList.add(
          "wrong"
        );
      }
    });

    if (isCorrect) {
      correctAnswers++;

      score += POINTS_PER_CORRECT;

      if (elements.message) {
        elements.message.textContent =
          "✅ Correct!";
      }

      playSound("correct");
    } else {
      wrongAnswers++;

      if (elements.message) {
        elements.message.textContent =
          `❌ Wrong. Correct answer: ${question.answer}`;
      }

      playSound("wrong");
    }

    reviewQuestions.push({
      ...question,
      userAnswer: answer,
      isCorrect
    });

    if (elements.score) {
      elements.score.textContent =
        String(score);
    }

    if (elements.nextBtn) {
      elements.nextBtn.disabled = false;
    }

    saveCurrentProgress();
  }

  /* =========================
     NEXT QUESTION
     ========================= */

  function nextQuestion() {
    if (!answered) {
      return;
    }

    if (
      currentQuestionIndex <
      currentRoundQuestions.length - 1
    ) {
      currentQuestionIndex++;

      saveCurrentProgress();

      renderQuestion();
    } else {
      finishRound();
    }
  }

  /* =========================
     TIMER
     ========================= */

  function startTimer() {
    stopTimer();

    timeLeft = TIME_PER_QUESTION;

    updateTimerDisplay();

    timerInterval =
      setInterval(() => {
        timeLeft--;

        updateTimerDisplay();

        if (timeLeft <= 0) {
          timeExpired();
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
    if (elements.timer) {
      elements.timer.textContent =
        String(Math.max(0, timeLeft));
    }
  }

  function timeExpired() {
    if (answered) {
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    answered = true;

    selectedAnswer = null;

    stopTimer();

    wrongAnswers++;

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            ".option-btn"
          )
        : [];

    optionButtons.forEach(button => {
      button.disabled = true;

      if (
        button.dataset.answer ===
        question.answer
      ) {
        button.classList.add(
          "correct"
        );
      }
    });

    if (elements.message) {
      elements.message.textContent =
        `⏰ Time's up! Correct answer: ${question.answer}`;
    }

    reviewQuestions.push({
      ...question,
      userAnswer: null,
      isCorrect: false
    });

    playSound("wrong");

    if (elements.nextBtn) {
      elements.nextBtn.disabled = false;
    }

    saveCurrentProgress();
  }

  /* =========================
     FINISH ROUND
     ========================= */

  function finishRound() {
    stopTimer();

    quizFinished = true;

    const total =
      currentRoundQuestions.length;

    const percentage =
      total > 0
        ? Math.round(
            (correctAnswers / total) *
              100
          )
        : 0;

    let stars = 1;

    if (percentage >= 80) {
      stars = 3;
    } else if (
      percentage >= UNLOCK_PERCENT
    ) {
      stars = 2;
    }

    saveRoundResult(
      currentRound,
      percentage,
      stars
    );

    updateUnlockedRounds();

    updateRewards();

    clearProgress();

    renderResult(
      percentage,
      stars
    );

    showScreen("resultScreen");

    startMusic();
  }

  function saveRoundResult(
    roundNumber,
    percentage,
    stars
  ) {
    saveCompletedRound(
      roundNumber
    );

    saveRoundStars(
      roundNumber,
      stars
    );

    const oldTotalScore =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        )
      ) || 0;

    localStorage.setItem(
      STORAGE.totalScore,
      String(
        oldTotalScore + score
      )
    );

    const personalBest =
      Number(
        localStorage.getItem(
          STORAGE.personalBest
        )
      ) || 0;

    if (score > personalBest) {
      localStorage.setItem(
        STORAGE.personalBest,
        String(score)
      );
    }

    updateAchievements();
  }

  /* =========================
     RESULT
     ========================= */

  function renderResult(
    percentage,
    stars
  ) {
    if (elements.correctCount) {
      elements.correctCount.textContent =
        String(correctAnswers);
    }

    if (elements.wrongCount) {
      elements.wrongCount.textContent =
        String(wrongAnswers);
    }

    if (elements.finalScore) {
      elements.finalScore.textContent =
        String(score);
    }

    if (elements.resultPercent) {
      elements.resultPercent.textContent =
        `${percentage}%`;
    }

    if (elements.finishedRound) {
      elements.finishedRound.textContent =
        `Round ${currentRound} • ${difficultyIcon(
          selectedDifficulty
        )} ${difficultyLabel(
          selectedDifficulty
        )}`;
    }

    if (elements.resultMessage) {
      if (percentage >= 80) {
        elements.resultMessage.textContent =
          "🌟 Excellent work!";
      } else if (
        percentage >= UNLOCK_PERCENT
      ) {
        elements.resultMessage.textContent =
          "🎉 Great job! You unlocked the next round.";
      } else {
        elements.resultMessage.textContent =
          "💪 Keep practicing and try again!";
      }
    }

    if (elements.nextRoundBtn) {
      const nextRound =
        currentRound + 1;

      const canContinue =
        nextRound <= rounds.length &&
        isRoundUnlocked(nextRound);

      elements.nextRoundBtn.style.display =
        canContinue ? "" : "none";
    }

    if (elements.reviewBtn) {
      elements.reviewBtn.style.display =
        reviewQuestions.length
          ? ""
          : "none";
    }

    renderStars(
      stars
    );
  }

  function renderStars(stars) {
    const starContainer =
      $("resultStars");

    if (!starContainer) {
      return;
    }

    starContainer.textContent =
      "⭐".repeat(
        clamp(stars, 1, 3)
      );
  }

  /* =========================
     RETRY
     ========================= */

  function retryRound() {
    startQuiz(
      currentRound,
      selectedDifficulty
    );
  }

  /* =========================
     NEXT ROUND
     ========================= */

  function nextRound() {
    const next =
      currentRound + 1;

    if (
      next <= rounds.length &&
      isRoundUnlocked(next)
    ) {
      startQuiz(
        next,
        selectedDifficulty
      );
    }
  }

  /* =========================
     REVIEW
     ========================= */

  function showReview() {
    if (!reviewQuestions.length) {
      return;
    }

    renderReview();

    showScreen(
      "reviewScreen"
    );
  }

  function renderReview() {
    if (elements.reviewSummary) {
      elements.reviewSummary.textContent =
        `${correctAnswers} correct • ${wrongAnswers} wrong • ${difficultyLabel(
          selectedDifficulty
        )}`;
    }

    if (!elements.reviewList) {
      return;
    }

    elements.reviewList.innerHTML = "";

    reviewQuestions.forEach(
      (item, index) => {
        const card =
          document.createElement("div");

        card.className =
          "review-item";

        const questionText =
          getQuestionText(item);

        const userAnswer =
          item.userAnswer === null ||
          item.userAnswer === undefined
            ? "No answer"
            : item.userAnswer;

        card.innerHTML = `
          <div class="review-number">
            Question ${index + 1}
          </div>

          <div class="review-question">
            ${escapeHTML(questionText)}
          </div>

          <div class="review-answer">
            Your answer:
            <strong>
              ${escapeHTML(userAnswer)}
            </strong>
          </div>

          <div class="review-correct-answer">
            Correct answer:
            <strong>
              ${escapeHTML(item.answer)}
            </strong>
          </div>

          <div class="review-status">
            ${
              item.isCorrect
                ? "✅ Correct"
                : "❌ Incorrect"
            }
          </div>
        `;

        elements.reviewList.appendChild(
          card
        );
      }
    );
  }

  function escapeHTML(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* =========================
     ROUNDS
     ========================= */

  function renderRounds() {
    if (!elements.roundGrid) {
      return;
    }

    elements.roundGrid.innerHTML = "";

    const unlocked =
      getUnlockedRounds();

    const completed =
      getCompletedRoundsForDifficulty();

    const stars =
      getRoundStarsForDifficulty();

    rounds.forEach(
      (roundQuestions, index) => {
        const roundNumber =
          index + 1;

        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "round-btn";

        const isUnlocked =
          unlocked.includes(
            roundNumber
          );

        const isCompleted =
          completed.includes(
            roundNumber
          );

        const roundStars =
          Number(
            stars[
              String(roundNumber)
            ]
          ) || 0;

        if (!isUnlocked) {
          button.classList.add(
            "locked"
          );
        }

        if (isCompleted) {
          button.classList.add(
            "completed"
          );
        }

        button.innerHTML = `
          <span>
            ${
              isUnlocked
                ? "🎯"
                : "🔒"
            }
          </span>

          <strong>
            Round ${roundNumber}
          </strong>

          <small>
            ${roundQuestions.length} questions
            ${
              roundStars
                ? ` • ${"⭐".repeat(
                    roundStars
                  )}`
                : ""
            }
          </small>
        `;

        if (isUnlocked) {
          button.addEventListener(
            "click",
            () => {
              startQuiz(
                roundNumber,
                selectedDifficulty
              );
            }
          );
        } else {
          button.disabled = true;
        }

        elements.roundGrid.appendChild(
          button
        );
      }
    );

    updateRoundsHeader();
  }

  function updateRoundsHeader() {
    const oldLabel =
      $("roundDifficultyLabel");

    if (oldLabel) {
      oldLabel.remove();
    }

    const grid =
      elements.roundGrid;

    if (!grid || !grid.parentElement) {
      return;
    }

    const label =
      document.createElement("p");

    label.id =
      "roundDifficultyLabel";

    label.className =
      "message";

    label.textContent =
      `${difficultyIcon(
        selectedDifficulty
      )} ${difficultyLabel(
        selectedDifficulty
      )} difficulty`;

    grid.parentElement.insertBefore(
      label,
      grid
    );
  }

  /* =========================
     REWARDS UI
     ========================= */

  function createRewardsUI() {
    let rewardsScreen =
      $("rewardsScreen");

    if (!rewardsScreen) {
      rewardsScreen =
        document.createElement("section");

      rewardsScreen.id =
        "rewardsScreen";

      rewardsScreen.className =
        "screen";

      rewardsScreen.innerHTML = `
        <div class="container">

          <div class="screen-header">
            <h2>🏆 Rewards</h2>
            <p>
              Track your stars, progress and achievements.
            </p>
          </div>

          <div
            id="rewardsStats"
            class="result-stats"
          ></div>

          <div
            id="achievementList"
            class="review-list"
          ></div>

          <div class="button-group">
            <button
              type="button"
              id="rewardsBackBtn"
              class="secondary-btn"
            >
              ← Back
            </button>
          </div>

        </div>
      `;

      const homeScreen =
        $("homeScreen");

      if (
        homeScreen &&
        homeScreen.parentElement
      ) {
        homeScreen.parentElement.appendChild(
          rewardsScreen
        );
      } else {
        document.body.appendChild(
          rewardsScreen
        );
      }
    }

    elements.rewardsScreen =
      rewardsScreen;

    elements.rewardsStats =
      $("rewardsStats");

    elements.achievementList =
      $("achievementList");

    elements.rewardsBackBtn =
      $("rewardsBackBtn");

    let rewardsBtn =
      $("rewardsBtn");

    if (!rewardsBtn) {
      rewardsBtn =
        document.createElement("button");

      rewardsBtn.type = "button";
      rewardsBtn.id = "rewardsBtn";

      rewardsBtn.className =
        elements.roundsBtn &&
        elements.roundsBtn.className
          ? elements.roundsBtn.className
          : "secondary-btn";

      rewardsBtn.textContent =
        "🏆 Rewards";

      if (
        elements.shareBtn &&
        elements.shareBtn.parentElement
      ) {
        elements.shareBtn.parentElement.appendChild(
          rewardsBtn
        );
      }
    }

    elements.rewardsBtn =
      rewardsBtn;
  }

  function getAllCompletedRoundEntries() {
    const entries = [];

    DIFFICULTY_ORDER.forEach(
      difficulty => {
        const completed =
          getCompletedRoundsForDifficulty(
            difficulty
          );

        completed.forEach(round => {
          entries.push(
            `${difficulty}-${round}`
          );
        });
      }
    );

    return [
      ...new Set(entries)
    ];
  }

  function getAllStars() {
    let total = 0;

    DIFFICULTY_ORDER.forEach(
      difficulty => {
        const stars =
          getRoundStarsForDifficulty(
            difficulty
          );

        Object.values(stars).forEach(
          value => {
            total +=
              Number(value) || 0;
          }
        );
      }
    );

    return total;
  }

  function updateRewards() {
    if (!elements.rewardsStats) {
      return;
    }

    const completed =
      getAllCompletedRoundEntries();

    const totalStars =
      getAllStars();

    const totalScore =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        )
      ) || 0;

    const personalBest =
      Number(
        localStorage.getItem(
          STORAGE.personalBest
        )
      ) || 0;

    elements.rewardsStats.innerHTML = `
      <div class="stat-card">
        <strong>
          ${completed.length}
        </strong>
        <span>
          Completed
        </span>
      </div>

      <div class="stat-card">
        <strong>
          ${totalStars}
        </strong>
        <span>
          Stars
        </span>
      </div>

      <div class="stat-card">
        <strong>
          ${totalScore}
        </strong>
        <span>
          Total Score
        </span>
      </div>

      <div class="stat-card">
        <strong>
          ${personalBest}
        </strong>
        <span>
          Personal Best
        </span>
      </div>
    `;

    renderAchievements();
  }

  function renderAchievements() {
    if (!elements.achievementList) {
      return;
    }

    const achievements =
      readJSON(
        STORAGE.achievements,
        []
      );

    const achievementDefinitions = [
      {
        id: "first-round",
        icon: "🎯",
        title: "First Round",
        description:
          "Complete your first quiz round."
      },

      {
        id: "five-rounds",
        icon: "🔥",
        title: "Five Rounds",
        description:
          "Complete five quiz rounds."
      },

      {
        id: "fifty-correct",
        icon: "🧠",
        title: "50 Correct",
        description:
          "Reach an estimated 50 correct answers."
      },

      {
        id: "all-rounds",
        icon: "👑",
        title: "All Rounds",
        description:
          "Complete all rounds in a difficulty."
      }
    ];

    elements.achievementList.innerHTML = "";

    achievementDefinitions.forEach(
      achievement => {
        const unlocked =
          achievements.includes(
            achievement.id
          );

        const item =
          document.createElement("div");

        item.className =
          "review-item";

        item.innerHTML = `
          <div>
            ${
              unlocked
                ? "🏆"
                : "🔒"
            }
            <strong>
              ${achievement.icon}
              ${achievement.title}
            </strong>
          </div>

          <small>
            ${achievement.description}
          </small>
        `;

        elements.achievementList.appendChild(
          item
        );
      }
    );
  }

  /* =========================
     ACHIEVEMENTS
     ========================= */

  function updateAchievements() {
    let achievements =
      readJSON(
        STORAGE.achievements,
        []
      );

    if (!Array.isArray(achievements)) {
      achievements = [];
    }

    const completed =
      getAllCompletedRoundEntries();

    if (
      completed.length >= 1 &&
      !achievements.includes(
        "first-round"
      )
    ) {
      achievements.push(
        "first-round"
      );
    }

    if (
      completed.length >= 5 &&
      !achievements.includes(
        "five-rounds"
      )
    ) {
      achievements.push(
        "five-rounds"
      );
    }

    const estimatedCorrect =
      getTotalCorrectAnswers();

    if (
      estimatedCorrect >= 50 &&
      !achievements.includes(
        "fifty-correct"
      )
    ) {
      achievements.push(
        "fifty-correct"
      );
    }

    if (
      rounds.length > 0
    ) {
      const completedCurrentDifficulty =
        getCompletedRoundsForDifficulty();

      if (
        completedCurrentDifficulty.length >=
          rounds.length &&
        !achievements.includes(
          "all-rounds"
        )
      ) {
        achievements.push(
          "all-rounds"
        );
      }
    }

    writeJSON(
      STORAGE.achievements,
      [...new Set(achievements)]
    );
  }

  function getTotalCorrectAnswers() {
    let estimated = 0;

    DIFFICULTY_ORDER.forEach(
      difficulty => {
        const stars =
          getRoundStarsForDifficulty(
            difficulty
          );

        Object.values(stars).forEach(
          value => {
            const starCount =
              Number(value) || 0;

            /*
              Approximation used by the
              previous version.

              3 stars ≈ 8 correct
              2 stars ≈ 6 correct
              1 star  ≈ 1 correct
            */

            if (starCount >= 3) {
              estimated += 8;
            } else if (
              starCount === 2
            ) {
              estimated += 6;
            } else if (
              starCount === 1
            ) {
              estimated += 1;
            }
          }
        );
      }
    );

    return estimated;
  }

  function showRewards() {
    updateRewards();

    showScreen(
      "rewardsScreen"
    );
  }

  /* =========================
     SETTINGS
     ========================= */

  function showSettings() {
    updateSettingsUI();

    showScreen(
      "settingsScreen"
    );
  }

  function updateSettingsUI() {
    if (elements.musicSwitch) {
      elements.musicSwitch.checked =
        musicEnabled;
    }

    if (elements.soundSwitch) {
      elements.soundSwitch.checked =
        soundEnabled;
    }
  }

  /* =========================
     SOUND
     ========================= */

  function playSound(type) {
    if (!soundEnabled) {
      return;
    }

    /*
      No external sound files are required.
      Use a short Web Audio beep.
    */

    try {
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

      oscillator.frequency.value =
        type === "correct"
          ? 880
          : 220;

      oscillator.type =
        "sine";

      gain.gain.setValueAtTime(
        0.08,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.15
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.15
      );
    } catch (error) {
      console.warn(
        "Sound unavailable:",
        error
      );
    }
  }

  function toggleSound() {
    soundEnabled =
      elements.soundSwitch
        ? elements.soundSwitch.checked
        : !soundEnabled;

    localStorage.setItem(
      STORAGE.sound,
      String(soundEnabled)
    );
  }

  /* =========================
     MUSIC
     ========================= */

  function initializeMusic() {
    if (backgroundMusic) {
      return;
    }

    backgroundMusic =
      new Audio(MUSIC_FILE);

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.35;
    backgroundMusic.preload = "auto";

    restoreMusicPosition();

    backgroundMusic.addEventListener(
      "timeupdate",
      saveMusicPosition
    );

    backgroundMusic.addEventListener(
      "loadedmetadata",
      restoreMusicPosition
    );

    backgroundMusic.addEventListener(
      "canplay",
      restoreMusicPosition,
      {
        once: true
      }
    );
  }

  function saveMusicPosition() {
    if (!backgroundMusic) {
      return;
    }

    if (
      !Number.isFinite(
        backgroundMusic.currentTime
      )
    ) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE.musicPosition,
        String(
          backgroundMusic.currentTime
        )
      );
    } catch (error) {
      console.warn(
        "Unable to save music position:",
        error
      );
    }
  }

  function restoreMusicPosition() {
    if (!backgroundMusic) {
      return;
    }

    const saved =
      Number(
        localStorage.getItem(
          STORAGE.musicPosition
        )
      );

    if (
      Number.isFinite(saved) &&
      saved >= 0
    ) {
      try {
        if (
          !Number.isFinite(
            backgroundMusic.duration
          ) ||
          saved <
            backgroundMusic.duration
        ) {
          backgroundMusic.currentTime =
            saved;
        }
      } catch (error) {
        console.warn(
          "Unable to restore music position:",
          error
        );
      }
    }
  }

  async function startMusic() {
    if (!musicEnabled) {
      return;
    }

    initializeMusic();

    if (!backgroundMusic) {
      return;
    }

    if (
      !backgroundMusic.paused ||
      musicPlayInProgress
    ) {
      return;
    }

    musicPlayInProgress = true;

    try {
      await backgroundMusic.play();
    } catch (error) {
      /*
        Browser autoplay policies may block
        automatic playback.

        We do not treat AbortError as an error.
      */

      if (
        error &&
        error.name !== "AbortError"
      ) {
        console.warn(
          "Music autoplay blocked:",
          error
        );
      }

      addMusicInteractionListeners();
    } finally {
      musicPlayInProgress = false;
    }
  }

  function stopMusic(reset = false) {
    if (!backgroundMusic) {
      return;
    }

    saveMusicPosition();

    backgroundMusic.pause();

    /*
      IMPORTANT:
      Do not reset currentTime.
      This keeps mythica.mp3 at the same position.
    */

    if (reset) {
      /*
        Intentionally not resetting position.
      */
    }
  }

  function toggleMusic() {
    musicEnabled =
      elements.musicSwitch
        ? elements.musicSwitch.checked
        : !musicEnabled;

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

  function addMusicInteractionListeners() {
    if (
      musicInteractionListenersAdded
    ) {
      return;
    }

    musicInteractionListenersAdded =
      true;

    const tryStart = () => {
      if (musicEnabled) {
        startMusic();
      }
    };

    [
      "pointerdown",
      "touchstart",
      "click"
    ].forEach(eventName => {
      document.addEventListener(
        eventName,
        tryStart,
        {
          passive: true
        }
      );
    });
  }

  function startMusicPersistence() {
    if (musicSaveInterval) {
      return;
    }

    musicSaveInterval =
      setInterval(
        saveMusicPosition,
        2000
      );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          saveMusicPosition();
        }
      }
    );

    window.addEventListener(
      "pagehide",
      saveMusicPosition
    );

    window.addEventListener(
      "beforeunload",
      saveMusicPosition
    );
  }

  /* =========================
     SHARE
     ========================= */

  async function shareQuiz() {
    const shareUrl =
      window.location.href;

    const shareText =
      "Test your knowledge with Quiz Master!";

    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            "Quiz Master 🇷🇼",
          text: shareText,
          url: shareUrl
        });

        return;
      } catch (error) {
        if (
          error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        shareUrl
      );

      if (elements.shareBtn) {
        const oldText =
          elements.shareBtn.textContent;

        elements.shareBtn.textContent =
          "✅ Link Copied!";

        setTimeout(() => {
          elements.shareBtn.textContent =
            oldText;
        }, 1800);
      }
    } catch (error) {
      console.warn(
        "Unable to copy share link:",
        error
      );
    }
  }

  /* =========================
     HOME
     ========================= */

  function goHome() {
    stopTimer();

    saveMusicPosition();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();
  }

  function showRounds() {
    buildRounds();
    initializeUnlockedRounds();
    renderRounds();

    showScreen(
      "roundsScreen"
    );
  }

  /* =========================
     ERROR
     ========================= */

  function showError(message) {
    stopTimer();

    if (elements.errorMessage) {
      elements.errorMessage.textContent =
        safeText(message);
    }

    showScreen(
      "errorScreen"
    );
  }

  /* =========================
     EVENT LISTENERS
     ========================= */

  function setupEventListeners() {
    if (elements.startBtn) {
      elements.startBtn.addEventListener(
        "click",
        () => {
          showDifficultySelection(1);
        }
      );
    }

    if (elements.continueBtn) {
      elements.continueBtn.addEventListener(
        "click",
        continueQuiz
      );
    }

    if (elements.roundsBtn) {
      elements.roundsBtn.addEventListener(
        "click",
        showRounds
      );
    }

    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener(
        "click",
        showSettings
      );
    }

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener(
        "click",
        shareQuiz
      );
    }

    if (elements.roundsBackBtn) {
      elements.roundsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.nextBtn) {
      elements.nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    }

    if (elements.quizHomeBtn) {
      elements.quizHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.nextRoundBtn) {
      elements.nextRoundBtn.addEventListener(
        "click",
        nextRound
      );
    }

    if (elements.restartBtn) {
      elements.restartBtn.addEventListener(
        "click",
        () => {
          startQuiz(
            currentRound,
            selectedDifficulty
          );
        }
      );
    }

    if (elements.reviewBtn) {
      elements.reviewBtn.addEventListener(
        "click",
        showReview
      );
    }

    if (elements.resultHomeBtn) {
      elements.resultHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.reviewRetryBtn) {
      elements.reviewRetryBtn.addEventListener(
        "click",
        () => {
          startQuiz(
            currentRound,
            selectedDifficulty
          );
        }
      );
    }

    if (elements.reviewBackBtn) {
      elements.reviewBackBtn.addEventListener(
        "click",
        () => {
          showScreen(
            "resultScreen"
          );
        }
      );
    }

    if (elements.musicSwitch) {
      elements.musicSwitch.checked =
        musicEnabled;

      elements.musicSwitch.addEventListener(
        "change",
        toggleMusic
      );
    }

    if (elements.soundSwitch) {
      elements.soundSwitch.checked =
        soundEnabled;

      elements.soundSwitch.addEventListener(
        "change",
        toggleSound
      );
    }

    if (elements.settingsBackBtn) {
      elements.settingsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.errorRestartBtn) {
      elements.errorRestartBtn.addEventListener(
        "click",
        loadQuestions
      );
    }

    if (elements.errorHomeBtn) {
      elements.errorHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.difficultyBackBtn) {
      elements.difficultyBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (elements.rewardsBtn) {
      elements.rewardsBtn.addEventListener(
        "click",
        showRewards
      );
    }

    if (elements.rewardsBackBtn) {
      elements.rewardsBackBtn.addEventListener(
        "click",
        goHome
      );
    }
  }

  /* =========================
     INITIALIZE
     ========================= */

  function initialize() {
    createDifficultyUI();

    createRewardsUI();

    initializeMusic();

    startMusicPersistence();

    setupEventListeners();

    updateSettingsUI();

    updateContinueButton();

    updateRewards();

    showScreen(
      "homeScreen"
    );

    loadQuestions();
  }

  /* =========================
     PUBLIC API
     ========================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.showRounds =
    showRounds;

  window.showSettings =
    showSettings;

  window.showReview =
    showReview;

  window.retryRound =
    retryRound;

  window.nextRound =
    nextRound;

  window.goHome =
    goHome;

  window.shareQuiz =
    shareQuiz;

  window.startMusic =
    startMusic;

  window.stopMusic =
    stopMusic;

  window.toggleMusic =
    toggleMusic;

  window.toggleSound =
    toggleSound;

  window.loadQuestions =
    loadQuestions;

  window.showRewards =
    showRewards;

  window.showDifficultySelection =
    showDifficultySelection;

  /* =========================
     START
     ========================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
