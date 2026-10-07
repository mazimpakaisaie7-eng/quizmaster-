(() => {
  "use strict";

  /* =========================================================
     QUIZ MASTER 🇷🇼
     questions.js
     Compatible with the existing index.html
     ========================================================= */

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
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    difficulty: "quizmasterDifficulty",

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
     STATE
     ========================================================= */

  const state = {
    initialized: false,
    questionsLoaded: false,

    questions: [],
    rounds: [],

    currentRound: 1,
    currentQuestionIndex: 0,

    currentDifficulty: "mixed",
    currentQuestions: [],

    score: 0,
    correct: 0,
    wrong: 0,

    answered: false,
    quizFinished: false,
    paused: false,

    reviewQuestions: [],

    timeLeft: CONFIG.TIME_PER_QUESTION,
    timer: null,

    musicEnabled: true,
    soundEnabled: true,

    audio: null
  };

  /* =========================================================
     ELEMENTS
     ========================================================= */

  const elements = {};

  function cacheElements() {
    const ids = [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "settingsScreen",
      "errorScreen",

      "startBtn",
      "continueBtn",
      "roundsBtn",
      "settingsBtn",
      "shareBtn",

      "roundGrid",
      "roundsBackBtn",

      "questionNumber",
      "roundDisplay",
      "score",
      "timer",
      "progressBar",
      "category",
      "question",
      "options",
      "message",
      "nextBtn",
      "pauseBtn",
      "quizHomeBtn",

      "finalScore",
      "resultPercent",
      "resultMessage",
      "finishedRound",
      "correctCount",
      "wrongCount",

      "nextRoundBtn",
      "restartBtn",
      "reviewBtn",
      "resultHomeBtn",

      "reviewSummary",
      "reviewList",
      "reviewRetryBtn",
      "reviewBackBtn",

      "musicSwitch",
      "soundSwitch",
      "settingsBackBtn",

      "errorMessage",
      "errorRestartBtn",
      "errorHomeBtn"
    ];

    ids.forEach((id) => {
      elements[id] =
        document.getElementById(id);
    });
  }

  /* =========================================================
     STORAGE
     ========================================================= */

  function readJSON(key, fallback) {
    try {
      const value =
        localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(
        "Quiz Master storage read error:",
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
      console.error(
        "Quiz Master storage write error:",
        error
      );

      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(
        "Quiz Master storage remove error:",
        error
      );
    }
  }

  function getNumber(key, fallback = 0) {
    try {
      const value =
        Number(
          localStorage.getItem(key)
        );

      return Number.isFinite(value)
        ? value
        : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function setNumber(key, value) {
    try {
      localStorage.setItem(
        key,
        String(value)
      );
    } catch (error) {
      console.error(
        "Quiz Master number storage error:",
        error
      );
    }
  }

  /* =========================================================
     SCREEN
     ========================================================= */

  function showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((screen) => {
        screen.classList.remove("active");
      });

    const screen =
      document.getElementById(
        screenId
      );

    if (screen) {
      screen.classList.add("active");
    }
  }

  /* =========================================================
     DIFFICULTY SCREEN
     ========================================================= */

  function createDifficultyScreen() {
    if (
      document.getElementById(
        "difficultyScreen"
      )
    ) {
      return;
    }

    if (
      !elements.roundsScreen ||
      !elements.roundsScreen.parentNode
    ) {
      return;
    }

    const screen =
      document.createElement("section");

    screen.id =
      "difficultyScreen";

    screen.className =
      "screen";

    screen.innerHTML = `
      <div class="container">
        <h2>Select Difficulty</h2>

        <div
          id="difficultyGrid"
          style="
            display:grid;
            gap:12px;
            margin-top:20px;
          "
        >
          <button
            type="button"
            class="main-btn"
            data-difficulty="easy"
          >
            🟢 Easy
          </button>

          <button
            type="button"
            class="main-btn"
            data-difficulty="medium"
          >
            🟡 Medium
          </button>

          <button
            type="button"
            class="main-btn"
            data-difficulty="hard"
          >
            🔴 Hard
          </button>

          <button
            type="button"
            class="secondary-btn"
            data-difficulty="mixed"
          >
            🎯 Mixed
          </button>

          <button
            type="button"
            class="secondary-btn"
            id="difficultyBackBtn"
          >
            ← Back
          </button>
        </div>
      </div>
    `;

    elements.roundsScreen.parentNode.insertBefore(
      screen,
      elements.roundsScreen
    );

    screen
      .querySelectorAll(
        "[data-difficulty]"
      )
      .forEach((button) => {
        button.type = "button";

        button.addEventListener(
          "click",
          () => {
            const difficulty =
              button.getAttribute(
                "data-difficulty"
              );

            state.currentDifficulty =
              difficulty;

            writeJSON(
              KEYS.difficulty,
              difficulty
            );

            buildRounds();

            showRounds();
          }
        );
      });

    const back =
      screen.querySelector(
        "#difficultyBackBtn"
      );

    if (back) {
      back.type = "button";

      back.addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );
    }
  }

  function showDifficultySelection() {
    if (!state.questionsLoaded) {
      showError(
        "Questions are still loading. Please try again."
      );

      return;
    }

    const screen =
      document.getElementById(
        "difficultyScreen"
      );

    if (!screen) {
      showRounds();
      return;
    }

    showScreen(
      "difficultyScreen"
    );
  }

  /* =========================================================
     QUESTION VALIDATION
     ========================================================= */

  function normalizeQuestion(item) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return null;
    }

    if (
      typeof item.question !==
      "string"
    ) {
      return null;
    }

    if (
      !Array.isArray(item.options)
    ) {
      return null;
    }

    const question =
      item.question.trim();

    const options =
      item.options
        .filter(
          (option) =>
            typeof option ===
              "string" &&
            option.trim()
        )
        .map(
          (option) =>
            option.trim()
        );

    const answer =
      typeof item.answer ===
        "string"
        ? item.answer.trim()
        : "";

    if (
      !question ||
      options.length < 2 ||
      !answer
    ) {
      return null;
    }

    if (
      !options.includes(answer)
    ) {
      return null;
    }

    let difficulty =
      typeof item.difficulty ===
        "string"
        ? item.difficulty
            .trim()
            .toLowerCase()
        : "medium";

    if (
      ![
        "easy",
        "medium",
        "hard"
      ].includes(difficulty)
    ) {
      difficulty = "medium";
    }

    return {
      question,
      question_rw:
        typeof item.question_rw ===
          "string"
          ? item.question_rw.trim()
          : "",
      options,
      answer,
      category:
        typeof item.category ===
          "string" &&
        item.category.trim()
          ? item.category.trim()
          : "General Knowledge",
      difficulty
    };
  }

  function validateQuestions(data) {
    if (!Array.isArray(data)) {
      throw new Error(
        "questions.json must contain an array."
      );
    }

    const valid = [];

    data.forEach((item) => {
      const question =
        normalizeQuestion(item);

      if (question) {
        valid.push(question);
      }
    });

    if (valid.length === 0) {
      throw new Error(
        "No valid questions were found in questions.json."
      );
    }

    return valid;
  }

  /* =========================================================
     SHUFFLE
     ========================================================= */

  function shuffle(array) {
    const result = Array.isArray(array)
      ? [...array]
      : [];

    for (
      let i = result.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
            (i + 1)
        );

      [
        result[i],
        result[j]
      ] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  /* =========================================================
     QUESTION ID
     ========================================================= */

  function questionId(question) {
    return [
      question.question,
      question.answer,
      question.category
    ]
      .join("|||")
      .toLowerCase();
  }

  /* =========================================================
     USED QUESTIONS
     ========================================================= */

  function getUsedQuestions() {
    const used =
      readJSON(
        KEYS.usedQuestions,
        []
      );

    return Array.isArray(used)
      ? used
      : [];
  }

  function selectFreshQuestions(pool) {
    if (!pool.length) {
      return [];
    }

    const required =
      CONFIG.QUESTIONS_PER_ROUND;

    let used =
      getUsedQuestions();

    let available =
      pool.filter(
        (question) =>
          !used.includes(
            questionId(question)
          )
      );

    /*
     * Start a new cycle when the old
     * cycle does not contain enough
     * unused questions.
     */
    if (
      available.length <
      required
    ) {
      used = [];

      available = [...pool];
    }

    const selected =
      shuffle(available).slice(
        0,
        Math.min(
          required,
          available.length
        )
      );

    selected.forEach(
      (question) => {
        const id =
          questionId(question);

        if (!used.includes(id)) {
          used.push(id);
        }
      }
    );

    writeJSON(
      KEYS.usedQuestions,
      used
    );

    return selected;
  }

  /* =========================================================
     DIFFICULTY
     ========================================================= */

  function getDifficultyPool() {
    if (
      state.currentDifficulty ===
      "mixed"
    ) {
      return [...state.questions];
    }

    const filtered =
      state.questions.filter(
        (question) =>
          question.difficulty ===
          state.currentDifficulty
      );

    if (
      filtered.length >=
      CONFIG.QUESTIONS_PER_ROUND
    ) {
      return filtered;
    }

    return [...state.questions];
  }

  /* =========================================================
     ROUNDS
     ========================================================= */

  function buildRounds() {
    state.rounds = [];

    const pool =
      getDifficultyPool();

    const shuffled =
      shuffle(pool);

    const count =
      Math.floor(
        shuffled.length /
          CONFIG.QUESTIONS_PER_ROUND
      );

    const rounds =
      Math.min(
        CONFIG.TOTAL_ROUNDS,
        count
      );

    for (
      let i = 0;
      i < rounds;
      i++
    ) {
      const start =
        i *
        CONFIG.QUESTIONS_PER_ROUND;

      const end =
        start +
        CONFIG.QUESTIONS_PER_ROUND;

      state.rounds.push(
        shuffled.slice(
          start,
          end
        )
      );
    }
  }

  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {
    try {
      const response =
        await fetch(
          `${CONFIG.QUESTIONS_FILE}?v=${Date.now()}`,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Unable to load questions.json (${response.status}).`
        );
      }

      const data =
        await response.json();

      state.questions =
        validateQuestions(data);

      const savedDifficulty =
        readJSON(
          KEYS.difficulty,
          "mixed"
        );

      if (
        [
          "easy",
          "medium",
          "hard",
          "mixed"
        ].includes(
          savedDifficulty
        )
      ) {
        state.currentDifficulty =
          savedDifficulty;
      }

      initializeUnlockedRounds();

      buildRounds();

      if (
        state.rounds.length === 0
      ) {
        throw new Error(
          "There are not enough questions to create a round."
        );
      }

      state.questionsLoaded =
        true;

      renderRounds();

      updateContinueButton();

      showScreen(
        "homeScreen"
      );

      console.log(
        "Quiz Master: questions loaded:",
        state.questions.length
      );
    } catch (error) {
      console.error(
        "Quiz Master:",
        error
      );

      state.questionsLoaded =
        false;

      showError(
        error.message ||
          "Unable to load questions."
      );
    }
  }

  /* =========================================================
     UNLOCKS
     ========================================================= */

  function initializeUnlockedRounds() {
    let unlocked =
      readJSON(
        KEYS.unlockedRounds,
        [1]
      );

    if (
      !Array.isArray(unlocked)
    ) {
      unlocked = [1];
    }

    if (
      !unlocked.includes(1)
    ) {
      unlocked.push(1);
    }

    unlocked =
      unlocked
        .filter(
          (round) =>
            Number.isInteger(
              round
            ) &&
            round >= 1 &&
            round <=
              CONFIG.TOTAL_ROUNDS
        )
        .sort(
          (a, b) => a - b
        );

    writeJSON(
      KEYS.unlockedRounds,
      unlocked
    );
  }

  function getUnlockedRounds() {
    const unlocked =
      readJSON(
        KEYS.unlockedRounds,
        [1]
      );

    return Array.isArray(unlocked)
      ? unlocked
      : [1];
  }

  function isRoundUnlocked(round) {
    return getUnlockedRounds().includes(
      round
    );
  }

  function unlockRound(round) {
    if (
      round < 1 ||
      round >
        CONFIG.TOTAL_ROUNDS
    ) {
      return;
    }

    const unlocked =
      getUnlockedRounds();

    if (
      !unlocked.includes(round)
    ) {
      unlocked.push(round);

      unlocked.sort(
        (a, b) => a - b
      );

      writeJSON(
        KEYS.unlockedRounds,
        unlocked
      );
    }
  }

  /* =========================================================
     ROUND BUTTONS
     ========================================================= */

  function showRounds() {
    if (!state.questionsLoaded) {
      showError(
        "Questions are not loaded yet."
      );

      return;
    }

    renderRounds();

    showScreen(
      "roundsScreen"
    );
  }

  function renderRounds() {
    const grid =
      elements.roundGrid;

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    for (
      let round = 1;
      round <= CONFIG.TOTAL_ROUNDS;
      round++
    ) {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "secondary-btn";

      const available =
        round <=
        state.rounds.length;

      const unlocked =
        available &&
        isRoundUnlocked(round);

      const stars =
        getRoundStars(round);

      if (unlocked) {
        button.disabled = false;

        button.textContent =
          stars > 0
            ? `Round ${round} ${"⭐".repeat(stars)}`
            : `Round ${round}`;

        button.addEventListener(
          "click",
          () => {
            startRound(round);
          }
        );
      } else {
        button.disabled = true;

        button.textContent =
          `🔒 Round ${round}`;

        button.style.opacity =
          "0.55";
      }

      grid.appendChild(button);
    }
  }

  /* =========================================================
     START ROUND
     ========================================================= */

  function startRound(round) {
    if (!state.questionsLoaded) {
      showError(
        "Questions are still loading."
      );

      return;
    }

    if (!isRoundUnlocked(round)) {
      return;
    }

    if (
      round < 1 ||
      round >
        state.rounds.length
    ) {
      showError(
        "This round is not available yet."
      );

      return;
    }

    state.currentRound =
      round;

    writeJSON(
      KEYS.currentRound,
      round
    );

    startQuiz();
  }

  /* =========================================================
     START QUIZ
     ========================================================= */

  function startQuiz() {
    if (!state.questionsLoaded) {
      showError(
        "Questions are not loaded yet."
      );

      return;
    }

    stopTimer();

    state.quizFinished = false;
    state.paused = false;
    state.answered = false;

    state.score = 0;
    state.correct = 0;
    state.wrong = 0;

    state.currentQuestionIndex = 0;

    state.reviewQuestions = [];

    let roundQuestions =
      state.rounds[
        state.currentRound - 1
      ];

    /*
     * If the selected round does not
     * have a valid set, safely create
     * one from the question pool.
     */
    if (
      !Array.isArray(
        roundQuestions
      ) ||
      roundQuestions.length === 0
    ) {
      roundQuestions =
        selectFreshQuestions(
          getDifficultyPool()
        );
    } else {
      roundQuestions =
        shuffle(
          roundQuestions
        );
    }

    if (
      roundQuestions.length === 0
    ) {
      showError(
        "No questions are available for this round."
      );

      return;
    }

    state.currentQuestions =
      roundQuestions.slice(
        0,
        CONFIG.QUESTIONS_PER_ROUND
      );

    showScreen(
      "quizScreen"
    );

    renderQuestion();

    startMusic();
  }

  /* =========================================================
     CONTINUE
     ========================================================= */

  function hasSavedProgress() {
    const progress =
      readJSON(
        KEYS.progress,
        null
      );

    return Boolean(
      progress &&
      Array.isArray(
        progress.questions
      ) &&
      progress.questions.length > 0 &&
      Number.isInteger(
        progress.questionIndex
      )
    );
  }

  function updateContinueButton() {
    const button =
      elements.continueBtn;

    if (!button) {
      return;
    }

    button.type = "button";

    button.style.display =
      hasSavedProgress()
        ? "block"
        : "none";
  }

  function saveCurrentProgress() {
    if (
      state.quizFinished ||
      !state.currentQuestions.length
    ) {
      return;
    }

    writeJSON(
      KEYS.progress,
      {
        difficulty:
          state.currentDifficulty,

        round:
          state.currentRound,

        questionIndex:
          state.currentQuestionIndex,

        questions:
          state.currentQuestions,

        score:
          state.score,

        correct:
          state.correct,

        wrong:
          state.wrong,

        reviewQuestions:
          state.reviewQuestions,

        timeLeft:
          state.timeLeft
      }
    );

    updateContinueButton();
  }

  function continueQuiz() {
    const progress =
      readJSON(
        KEYS.progress,
        null
      );

    if (
      !progress ||
      !Array.isArray(
        progress.questions
      ) ||
      !progress.questions.length
    ) {
      updateContinueButton();

      showDifficultySelection();

      return;
    }

    stopTimer();

    state.currentDifficulty =
      [
        "easy",
        "medium",
        "hard",
        "mixed"
      ].includes(
        progress.difficulty
      )
        ? progress.difficulty
        : "mixed";

    state.currentRound =
      Number.isInteger(
        progress.round
      )
        ? progress.round
        : 1;

    state.currentQuestionIndex =
      Number.isInteger(
        progress.questionIndex
      )
        ? progress.questionIndex
        : 0;

    state.currentQuestions =
      progress.questions;

    state.score =
      Number(progress.score) || 0;

    state.correct =
      Number(progress.correct) || 0;

    state.wrong =
      Number(progress.wrong) || 0;

    state.reviewQuestions =
      Array.isArray(
        progress.reviewQuestions
      )
        ? progress.reviewQuestions
        : [];

    state.timeLeft =
      Number(progress.timeLeft) > 0
        ? Number(progress.timeLeft)
        : CONFIG.TIME_PER_QUESTION;

    state.quizFinished = false;
    state.paused = false;
    state.answered = false;

    if (
      state.currentQuestionIndex >=
      state.currentQuestions.length
    ) {
      state.currentQuestionIndex = 0;
    }

    showScreen(
      "quizScreen"
    );

    renderQuestion();
    startMusic();
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderQuestion() {
    stopTimer();

    state.answered = false;
    state.paused = false;

    const current =
      state.currentQuestions[
        state.currentQuestionIndex
      ];

    if (!current) {
      finishRound();
      return;
    }

    if (
      elements.questionNumber
    ) {
      elements.questionNumber.textContent =
        `Question ${
          state.currentQuestionIndex + 1
        }/${state.currentQuestions.length}`;
    }

    if (
      elements.roundDisplay
    ) {
      elements.roundDisplay.textContent =
        `Round ${state.currentRound}`;
    }

    if (elements.score) {
      elements.score.textContent =
        String(state.score);
    }

    if (elements.category) {
      elements.category.textContent =
        current.category;
    }

    if (elements.question) {
      elements.question.textContent =
        current.question;
    }

    if (elements.message) {
      elements.message.textContent =
        "";
    }

    if (elements.progressBar) {
      const percent =
        (
          state.currentQuestionIndex /
          state.currentQuestions.length
        ) *
        100;

      elements.progressBar.style.width =
        `${Math.max(
          0,
          Math.min(
            100,
            percent
          )
        )}%`;
    }

    renderOptions(current);

    hideNextButton();

    state.timeLeft =
      CONFIG.TIME_PER_QUESTION;

    updatePauseButton();

    startTimer();

    saveCurrentProgress();
  }

  /* =========================================================
     OPTIONS
     ========================================================= */

  function renderOptions(question) {
    const container =
      elements.options;

    if (!container) {
      return;
    }

    container.innerHTML = "";

    shuffle(
      question.options
    ).forEach((option) => {
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
        () => {
          selectAnswer(
            option,
            button
          );
        }
      );

      container.appendChild(
        button
      );
    });
  }

  /* =========================================================
     ANSWER
     ========================================================= */

  function selectAnswer(
    selectedAnswer,
    selectedButton
  ) {
    if (
      state.answered ||
      state.quizFinished ||
      state.paused
    ) {
      return;
    }

    const current =
      state.currentQuestions[
        state.currentQuestionIndex
      ];

    if (!current) {
      return;
    }

    state.answered = true;

    stopTimer();

    const buttons =
      elements.options
        ? elements.options.querySelectorAll(
            "button"
          )
        : [];

    buttons.forEach(
      (button) => {
        button.disabled = true;
      }
    );

    const correct =
      selectedAnswer ===
      current.answer;

    if (correct) {
      state.correct++;

      state.score +=
        CONFIG.POINTS_PER_CORRECT;

      selectedButton.classList.add(
        "correct"
      );

      if (elements.message) {
        elements.message.textContent =
          "✅ Correct!";
      }

      playSound("correct");
    } else {
      state.wrong++;

      selectedButton.classList.add(
        "wrong"
      );

      buttons.forEach(
        (button) => {
          if (
            button.textContent ===
            current.answer
          ) {
            button.classList.add(
              "correct"
            );
          }
        }
      );

      if (elements.message) {
        elements.message.textContent =
          `❌ Correct answer: ${current.answer}`;
      }

      playSound("wrong");
    }

    state.reviewQuestions.push({
      question:
        current.question,

      question_rw:
        current.question_rw,

      selectedAnswer,

      correctAnswer:
        current.answer,

      isCorrect:
        correct,

      category:
        current.category
    });

    if (elements.score) {
      elements.score.textContent =
        String(state.score);
    }

    showNextButton();

    saveCurrentProgress();
  }

  /* =========================================================
     NEXT
     ========================================================= */

  function showNextButton() {
    const button =
      elements.nextBtn;

    if (!button) {
      return;
    }

    button.type = "button";

    button.style.display =
      "block";

    if (
      state.currentQuestionIndex <
      state.currentQuestions.length - 1
    ) {
      button.textContent =
        "➡️ Next Question";
    } else {
      button.textContent =
        "🏁 Finish Round";
    }
  }

  function hideNextButton() {
    const button =
      elements.nextBtn;

    if (!button) {
      return;
    }

    button.type = "button";

    button.style.display =
      "none";
  }

  function nextQuestion(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (
      state.quizFinished ||
      !state.answered
    ) {
      return;
    }

    if (
      state.currentQuestionIndex <
      state.currentQuestions.length - 1
    ) {
      state.currentQuestionIndex++;

      renderQuestion();

      return;
    }

    finishRound();
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function startTimer() {
    stopTimer();

    if (
      state.quizFinished ||
      state.paused ||
      state.answered
    ) {
      return;
    }

    if (
      !Number.isFinite(
        state.timeLeft
      ) ||
      state.timeLeft <= 0
    ) {
      state.timeLeft =
        CONFIG.TIME_PER_QUESTION;
    }

    updateTimerDisplay();

    state.timer =
      setInterval(() => {
        if (
          state.quizFinished ||
          state.paused ||
          state.answered
        ) {
          return;
        }

        state.timeLeft--;

        updateTimerDisplay();

        if (
          state.timeLeft <= 0
        ) {
          stopTimer();

          timeExpired();
        }
      }, 1000);
  }

  function stopTimer() {
    if (
      state.timer !== null
    ) {
      clearInterval(
        state.timer
      );

      state.timer = null;
    }
  }

  function updateTimerDisplay() {
    if (!elements.timer) {
      return;
    }

    elements.timer.textContent =
      String(
        Math.max(
          0,
          state.timeLeft
        )
      );
  }

  /* =========================================================
     TIME EXPIRED
     ========================================================= */

  function timeExpired() {
    if (
      state.answered ||
      state.quizFinished
    ) {
      return;
    }

    const current =
      state.currentQuestions[
        state.currentQuestionIndex
      ];

    if (!current) {
      return;
    }

    state.answered = true;
    state.wrong++;

    const buttons =
      elements.options
        ? elements.options.querySelectorAll(
            "button"
          )
        : [];

    buttons.forEach(
      (button) => {
        button.disabled = true;

        if (
          button.textContent ===
          current.answer
        ) {
          button.classList.add(
            "correct"
          );
        }
      }
    );

    if (elements.message) {
      elements.message.textContent =
        `⏰ Time's up! Correct answer: ${current.answer}`;
    }

    state.reviewQuestions.push({
      question:
        current.question,

      question_rw:
        current.question_rw,

      selectedAnswer:
        null,

      correctAnswer:
        current.answer,

      isCorrect: false,

      category:
        current.category
    });

    playSound("wrong");

    showNextButton();

    saveCurrentProgress();
  }

  /* =========================================================
     PAUSE / RESUME
     ========================================================= */

  function togglePause(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (
      state.quizFinished ||
      state.answered ||
      !state.currentQuestions.length
    ) {
      return;
    }

    if (state.paused) {
      /*
       * IMPORTANT:
       * Resume continues from the existing
       * timeLeft. It does NOT reset to 20.
       */
      state.paused = false;

      updatePauseButton();

      if (elements.message) {
        elements.message.textContent =
          "";
      }

      startTimer();

      return;
    }

    state.paused = true;

    stopTimer();

    updatePauseButton();

    if (elements.message) {
      elements.message.textContent =
        "⏸️ Quiz paused";
    }
  }

  function updatePauseButton() {
    const button =
      elements.pauseBtn;

    if (!button) {
      return;
    }

    button.type = "button";

    button.textContent =
      state.paused
        ? "▶️ Resume"
        : "⏸️ Pause";
  }

  /* =========================================================
     FINISH ROUND
     ========================================================= */

  function finishRound() {
    if (state.quizFinished) {
      return;
    }

    state.quizFinished = true;

    stopTimer();

    state.paused = false;

    const total =
      state.currentQuestions.length;

    const percent =
      total > 0
        ? Math.round(
            (state.correct / total) *
              100
          )
        : 0;

    const starCount =
      calculateStars(percent);

    saveRoundResult(
      state.currentRound,
      starCount
    );

    if (
      percent >=
      CONFIG.UNLOCK_PERCENT
    ) {
      unlockRound(
        state.currentRound + 1
      );
    }

    updateGlobalStats();

    removeStorage(
      KEYS.progress
    );

    updateContinueButton();

    stopMusic();

    renderResult(
      percent,
      starCount
    );

    showScreen(
      "resultScreen"
    );

    playSound("finish");
  }

  function calculateStars(percent) {
    if (percent >= 80) {
      return 3;
    }

    if (
      percent >=
      CONFIG.UNLOCK_PERCENT
    ) {
      return 2;
    }

    return 1;
  }

  /* =========================================================
     ROUND RESULTS
     ========================================================= */

  function getRoundStars(round) {
    const allStars =
      readJSON(
        KEYS.roundStars,
        {}
      );

    if (
      !allStars ||
      typeof allStars !==
        "object"
    ) {
      return 0;
    }

    return (
      Number(
        allStars[String(round)]
      ) || 0
    );
  }

  function saveRoundResult(
    round,
    starCount
  ) {
    /*
     * This deliberately uses different
     * variable names to avoid the
     * duplicate "stars" bug.
     */
    const roundStars =
      readJSON(
        KEYS.roundStars,
        {}
      );

    if (
      !roundStars ||
      typeof roundStars !==
        "object"
    ) {
      return;
    }

    const previous =
      Number(
        roundStars[String(round)]
      ) || 0;

    if (
      starCount > previous
    ) {
      roundStars[
        String(round)
      ] = starCount;

      writeJSON(
        KEYS.roundStars,
        roundStars
      );
    }

    const completed =
      readJSON(
        KEYS.completedRounds,
        []
      );

    const completedList =
      Array.isArray(completed)
        ? completed
        : [];

    if (
      !completedList.includes(
        round
      )
    ) {
      completedList.push(
        round
      );

      completedList.sort(
        (a, b) => a - b
      );

      writeJSON(
        KEYS.completedRounds,
        completedList
      );
    }
  }

  function renderResult(
    percent,
    starCount
  ) {
    if (elements.finalScore) {
      elements.finalScore.textContent =
        String(state.score);
    }

    if (
      elements.resultPercent
    ) {
      elements.resultPercent.textContent =
        `${percent}%`;
    }

    if (
      elements.finishedRound
    ) {
      elements.finishedRound.textContent =
        String(
          state.currentRound
        );
    }

    if (
      elements.correctCount
    ) {
      elements.correctCount.textContent =
        String(
          state.correct
        );
    }

    if (
      elements.wrongCount
    ) {
      elements.wrongCount.textContent =
        String(
          state.wrong
        );
    }

    if (
      elements.resultMessage
    ) {
      if (percent >= 80) {
        elements.resultMessage.textContent =
          `Excellent! ${"⭐".repeat(starCount)}`;
      } else if (
        percent >=
        CONFIG.UNLOCK_PERCENT
      ) {
        elements.resultMessage.textContent =
          `Great job! ${"⭐".repeat(starCount)}`;
      } else {
        elements.resultMessage.textContent =
          `Keep learning and try again! ${"⭐".repeat(starCount)}`;
      }
    }

    if (
      elements.nextRoundBtn
    ) {
      elements.nextRoundBtn.type =
        "button";

      const next =
        state.currentRound + 1;

      const canContinue =
        percent >=
          CONFIG.UNLOCK_PERCENT &&
        next <=
          CONFIG.TOTAL_ROUNDS &&
        next <=
          state.rounds.length;

      elements.nextRoundBtn.style.display =
        canContinue
          ? "block"
          : "none";

      elements.nextRoundBtn.disabled =
        !canContinue;
    }
  }

  /* =========================================================
     NEXT ROUND
     ========================================================= */

  function nextRound() {
    const next =
      state.currentRound + 1;

    if (
      next >
      CONFIG.TOTAL_ROUNDS
    ) {
      goHome();

      return;
    }

    if (
      next >
      state.rounds.length
    ) {
      showRounds();

      return;
    }

    if (
      !isRoundUnlocked(next)
    ) {
      showRounds();

      return;
    }

    state.currentRound =
      next;

    writeJSON(
      KEYS.currentRound,
      next
    );

    startQuiz();
  }

  /* =========================================================
     RESTART
     ========================================================= */

  function restartRound() {
    removeStorage(
      KEYS.progress
    );

    state.quizFinished = false;
    state.paused = false;

    startRound(
      state.currentRound
    );
  }

  /* =========================================================
     REVIEW
     ========================================================= */

  function showReview() {
    renderReview();

    showScreen(
      "reviewScreen"
    );
  }

  function renderReview() {
    if (
      elements.reviewSummary
    ) {
      elements.reviewSummary.textContent =
        `${state.correct} correct • ${state.wrong} wrong`;
    }

    const list =
      elements.reviewList;

    if (!list) {
      return;
    }

    list.innerHTML = "";

    state.reviewQuestions.forEach(
      (item, index) => {
        const wrapper =
          document.createElement(
            "div"
          );

        wrapper.className =
          "review-item";

        const title =
          document.createElement(
            "h3"
          );

        title.textContent =
          `${index + 1}. ${item.question}`;

        const result =
          document.createElement(
            "p"
          );

        result.textContent =
          item.isCorrect
            ? "✅ Correct"
            : "❌ Incorrect";

        const answer =
          document.createElement(
            "p"
          );

        answer.textContent =
          `Correct answer: ${item.correctAnswer}`;

        wrapper.appendChild(
          title
        );

        wrapper.appendChild(
          result
        );

        wrapper.appendChild(
          answer
        );

        if (
          item.selectedAnswer &&
          item.selectedAnswer !==
            item.correctAnswer
        ) {
          const selected =
            document.createElement(
              "p"
            );

          selected.textContent =
            `Your answer: ${item.selectedAnswer}`;

          wrapper.appendChild(
            selected
          );
        }

        list.appendChild(
          wrapper
        );
      }
    );
  }

  function retryFromReview() {
    restartRound();
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function initializeSettings() {
    state.musicEnabled =
      readJSON(
        KEYS.music,
        true
      ) !== false;

    state.soundEnabled =
      readJSON(
        KEYS.sound,
        true
      ) !== false;

    if (
      elements.musicSwitch
    ) {
      elements.musicSwitch.checked =
        state.musicEnabled;
    }

    if (
      elements.soundSwitch
    ) {
      elements.soundSwitch.checked =
        state.soundEnabled;
    }
  }

  function showSettings() {
    initializeSettings();

    showScreen(
      "settingsScreen"
    );
  }

  function setMusicEnabled(value) {
    state.musicEnabled =
      Boolean(value);

    writeJSON(
      KEYS.music,
      state.musicEnabled
    );

    if (!state.musicEnabled) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  function setSoundEnabled(value) {
    state.soundEnabled =
      Boolean(value);

    writeJSON(
      KEYS.sound,
      state.soundEnabled
    );
  }

  /* =========================================================
     MUSIC
     ========================================================= */

  function initializeMusic() {
    try {
      state.audio =
        new Audio(
          CONFIG.MUSIC_FILE
        );

      state.audio.loop =
        true;

      state.audio.preload =
        "auto";

      state.audio.volume =
        0.35;
    } catch (error) {
      state.audio = null;

      console.warn(
        "Music initialization failed:",
        error
      );
    }

    initializeSettings();
  }

  function startMusic() {
    if (
      !state.musicEnabled ||
      !state.audio
    ) {
      return;
    }

    try {
      const promise =
        state.audio.play();

      if (
        promise &&
        typeof promise.catch ===
          "function"
      ) {
        promise.catch(
          () => {
            /*
             * Browser autoplay restrictions
             * must never stop the quiz.
             */
          }
        );
      }
    } catch (error) {
      console.warn(
        "Music play failed:",
        error
      );
    }
  }

  function stopMusic() {
    if (!state.audio) {
      return;
    }

    try {
      state.audio.pause();

      state.audio.currentTime =
        0;
    } catch (error) {
      console.warn(
        "Music stop failed:",
        error
      );
    }
  }

  /* =========================================================
     SOUND
     ========================================================= */

  function playSound(type) {
    if (!state.soundEnabled) {
      return;
    }

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

      let frequency = 600;
      let duration = 0.08;

      if (
        type === "correct"
      ) {
        frequency = 800;
        duration = 0.1;
      }

      if (
        type === "wrong"
      ) {
        frequency = 250;
        duration = 0.15;
      }

      if (
        type === "finish"
      ) {
        frequency = 1000;
        duration = 0.18;
      }

      oscillator.type =
        "sine";

      oscillator.frequency.value =
        frequency;

      gain.gain.value =
        0.05;

      oscillator.connect(gain);

      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          duration
      );

      oscillator.addEventListener(
        "ended",
        () => {
          context
            .close()
            .catch(() => {});
        },
        {
          once: true
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
     DAILY CHALLENGE
     ========================================================= */

  function getTodayKey() {
    const date =
      new Date();

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getDate()
      ).padStart(2, "0")
    ].join("-");
  }

  function updateDailyChallenge() {
    const today =
      getTodayKey();

    const saved =
      readJSON(
        KEYS.dailyChallenge,
        null
      );

    if (
      saved &&
      saved.date === today
    ) {
      return;
    }

    writeJSON(
      KEYS.dailyChallenge,
      {
        date: today,
        completed: false,
        score: 0
      }
    );
  }

  /* =========================================================
     GLOBAL STATS
     ========================================================= */

  function updateGlobalStats() {
    const oldTotal =
      getNumber(
        KEYS.totalScore,
        0
      );

    setNumber(
      KEYS.totalScore,
      oldTotal + state.score
    );

    const best =
      getNumber(
        KEYS.personalBest,
        0
      );

    if (
      state.score > best
    ) {
      setNumber(
        KEYS.personalBest,
        state.score
      );
    }

    updateAchievements();
  }

  /* =========================================================
     ACHIEVEMENTS
     ========================================================= */

  function getAchievements() {
    const achievements =
      readJSON(
        KEYS.achievements,
        []
      );

    return Array.isArray(
      achievements
    )
      ? achievements
      : [];
  }

  function addAchievement(name) {
    const achievements =
      getAchievements();

    if (
      !achievements.includes(name)
    ) {
      achievements.push(name);

      writeJSON(
        KEYS.achievements,
        achievements
      );
    }
  }

  function updateAchievements() {
    const completed =
      readJSON(
        KEYS.completedRounds,
        []
      );

    const count =
      Array.isArray(completed)
        ? completed.length
        : 0;

    if (count >= 1) {
      addAchievement(
        "first_round"
      );
    }

    if (count >= 5) {
      addAchievement(
        "five_rounds"
      );
    }

    if (count >= 10) {
      addAchievement(
        "all_rounds"
      );
    }

    /*
     * Count total correct answers
     * from completed round progress.
     */
    const currentCorrect =
      state.correct;

    if (
      currentCorrect >= 50
    ) {
      addAchievement(
        "fifty_correct"
      );
    }
  }

  /* =========================================================
     HOME
     ========================================================= */

  function goHome(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    /*
     * Save the current quiz before
     * leaving, so Continue can work.
     */
    if (
      !state.quizFinished &&
      state.currentQuestions.length
    ) {
      saveCurrentProgress();
    }

    stopTimer();

    state.paused = false;

    stopMusic();

    updateContinueButton();

    showScreen(
      "homeScreen"
    );
  }

  /* =========================================================
     SHARE
     ========================================================= */

  async function shareQuiz(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const url =
      window.location.href;

    const text =
      "Test your knowledge with Quiz Master!";

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            "Quiz Master 🇷🇼",
          text,
          url
        });

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
      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(
          url
        );

        showShareSuccess();

        return;
      }
    } catch (error) {
      console.warn(
        "Clipboard failed:",
        error
      );
    }

    try {
      const input =
        document.createElement(
          "input"
        );

      input.value = url;

      input.style.position =
        "fixed";

      input.style.opacity =
        "0";

      document.body.appendChild(
        input
      );

      input.select();

      document.execCommand(
        "copy"
      );

      input.remove();

      showShareSuccess();
    } catch (error) {
      console.warn(
        "Share fallback failed:",
        error
      );
    }
  }

  function showShareSuccess() {
    if (!elements.shareBtn) {
      return;
    }

    const original =
      elements.shareBtn.textContent;

    elements.shareBtn.textContent =
      "✅ Link Copied!";

    setTimeout(() => {
      elements.shareBtn.textContent =
        original;
    }, 2000);
  }

  /* =========================================================
     ERROR
     ========================================================= */

  function showError(message) {
    stopTimer();

    stopMusic();

    if (
      elements.errorMessage
    ) {
      elements.errorMessage.textContent =
        message ||
        "Something went wrong.";
    }

    showScreen(
      "errorScreen"
    );
  }

  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  function setupEventListeners() {
    /*
     * START
     */
    if (elements.startBtn) {
      elements.startBtn.type =
        "button";

      elements.startBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showDifficultySelection();
        }
      );
    }

    /*
     * CONTINUE
     */
    if (elements.continueBtn) {
      elements.continueBtn.type =
        "button";

      elements.continueBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          continueQuiz();
        }
      );
    }

    /*
     * ROUNDS
     */
    if (elements.roundsBtn) {
      elements.roundsBtn.type =
        "button";

      elements.roundsBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showRounds();
        }
      );
    }

    /*
     * SETTINGS
     */
    if (elements.settingsBtn) {
      elements.settingsBtn.type =
        "button";

      elements.settingsBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showSettings();
        }
      );
    }

    /*
     * SHARE
     */
    if (elements.shareBtn) {
      elements.shareBtn.type =
        "button";

      elements.shareBtn.addEventListener(
        "click",
        shareQuiz
      );
    }

    /*
     * ROUNDS BACK
     */
    if (elements.roundsBackBtn) {
      elements.roundsBackBtn.type =
        "button";

      elements.roundsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    /*
     * NEXT
     */
    if (elements.nextBtn) {
      elements.nextBtn.type =
        "button";

      elements.nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    }

    /*
     * PAUSE
     */
    if (elements.pauseBtn) {
      elements.pauseBtn.type =
        "button";

      elements.pauseBtn.addEventListener(
        "click",
        togglePause
      );
    }

    /*
     * QUIZ HOME
     */
    if (elements.quizHomeBtn) {
      elements.quizHomeBtn.type =
        "button";

      elements.quizHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    /*
     * NEXT ROUND
     */
    if (elements.nextRoundBtn) {
      elements.nextRoundBtn.type =
        "button";

      elements.nextRoundBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          nextRound();
        }
      );
    }

    /*
     * RESTART
     */
    if (elements.restartBtn) {
      elements.restartBtn.type =
        "button";

      elements.restartBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          restartRound();
        }
      );
    }

    /*
     * REVIEW
     */
    if (elements.reviewBtn) {
      elements.reviewBtn.type =
        "button";

      elements.reviewBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showReview();
        }
      );
    }

    /*
     * RESULT HOME
     */
    if (elements.resultHomeBtn) {
      elements.resultHomeBtn.type =
        "button";

      elements.resultHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    /*
     * REVIEW RETRY
     */
    if (elements.reviewRetryBtn) {
      elements.reviewRetryBtn.type =
        "button";

      elements.reviewRetryBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          retryFromReview();
        }
      );
    }

    /*
     * REVIEW BACK
     */
    if (elements.reviewBackBtn) {
      elements.reviewBackBtn.type =
        "button";

      elements.reviewBackBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showScreen(
            "resultScreen"
          );
        }
      );
    }

    /*
     * MUSIC
     */
    if (elements.musicSwitch) {
      elements.musicSwitch.addEventListener(
        "change",
        () => {
          setMusicEnabled(
            elements.musicSwitch.checked
          );
        }
      );
    }

    /*
     * SOUND
     */
    if (elements.soundSwitch) {
      elements.soundSwitch.addEventListener(
        "change",
        () => {
          setSoundEnabled(
            elements.soundSwitch.checked
          );
        }
      );
    }

    /*
     * SETTINGS BACK
     */
    if (elements.settingsBackBtn) {
      elements.settingsBackBtn.type =
        "button";

      elements.settingsBackBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /*
     * ERROR RESTART
     */
    if (elements.errorRestartBtn) {
      elements.errorRestartBtn.type =
        "button";

      elements.errorRestartBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showScreen(
            "homeScreen"
          );

          loadQuestions();
        }
      );
    }

    /*
     * ERROR HOME
     */
    if (elements.errorHomeBtn) {
      elements.errorHomeBtn.type =
        "button";

      elements.errorHomeBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          showScreen(
            "homeScreen"
          );
        }
      );
    }
  }

  /* =========================================================
     PUBLIC FUNCTIONS
     ========================================================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.togglePause =
    togglePause;

  window.stopTimer =
    stopTimer;

  window.startTimer =
    startTimer;

  window.showRounds =
    showRounds;

  window.showSettings =
    showSettings;

  window.goHome =
    goHome;

  window.shareQuiz =
    shareQuiz;

  window.finishRound =
    finishRound;

  window.showReview =
    showReview;

  window.renderReview =
    renderReview;

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function initialize() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    cacheElements();

    createDifficultyScreen();

    initializeMusic();

    updateDailyChallenge();

    setupEventListeners();

    updateContinueButton();

    showScreen(
      "homeScreen"
    );

    loadQuestions();
  }

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
