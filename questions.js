(() => {
  "use strict";

  /* =========================================================
     QUIZ MASTER 🇷🇼
     QUESTIONS ENGINE - FULL VERSION
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
    dailyChallenge: "quizmasterDailyChallenge"
  };

  /* =========================
     STATE
     ========================= */

  let allQuestions = [];
  let rounds = [];

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
     DOM HELPER
     ========================= */

  const $ = (id) => document.getElementById(id);

  const elements = {
    homeScreen: $("homeScreen"),
    roundsScreen: $("roundsScreen"),
    quizScreen: $("quizScreen"),
    resultScreen: $("resultScreen"),
    reviewScreen: $("reviewScreen"),
    errorScreen: $("errorScreen"),
    settingsScreen: $("settingsScreen"),

    startBtn: $("startBtn"),
    continueBtn: $("continueBtn"),
    roundsBtn: $("roundsBtn"),
    settingsBtn: $("settingsBtn"),
    shareBtn: $("shareBtn"),

    roundsBackBtn: $("roundsBackBtn"),
    roundGrid: $("roundGrid"),

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
    quizHomeBtn: $("quizHomeBtn"),

    nextRoundBtn: $("nextRoundBtn"),
    restartBtn: $("restartBtn"),
    reviewBtn: $("reviewBtn"),
    resultHomeBtn: $("resultHomeBtn"),

    correctCount: $("correctCount"),
    wrongCount: $("wrongCount"),
    finalScore: $("finalScore"),
    resultPercent: $("resultPercent"),
    resultMessage: $("resultMessage"),
    finishedRound: $("finishedRound"),

    reviewList: $("reviewList"),
    reviewSummary: $("reviewSummary"),
    reviewRetryBtn: $("reviewRetryBtn"),
    reviewBackBtn: $("reviewBackBtn"),

    musicSwitch: $("musicSwitch"),
    soundSwitch: $("soundSwitch"),
    settingsBackBtn: $("settingsBackBtn"),

    errorMessage: $("errorMessage"),
    errorRestartBtn: $("errorRestartBtn"),
    errorHomeBtn: $("errorHomeBtn")
  };

  /* =========================
     SAFE HELPERS
     ========================= */

  function safeText(element, value) {
    if (!element) return;
    element.textContent =
      value == null ? "" : String(value);
  }

  function readJSON(key, fallback) {
    try {
      const value =
        localStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);

    } catch (error) {
      console.warn(
        "Could not read localStorage:",
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
        "Could not write localStorage:",
        key,
        error
      );

      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.min(
      Math.max(value, min),
      max
    );
  }

  /* =========================
     QUESTION TEXT
     ========================= */

  function getQuestionText(question) {
    if (!question) {
      return "";
    }

    if (
      typeof question.question_rw === "string" &&
      question.question_rw.trim()
    ) {
      return question.question_rw.trim();
    }

    return String(
      question.question || ""
    ).trim();
  }

  /* =========================
     QUESTION VALIDATION
     ========================= */

  function validateQuestion(
    question,
    index
  ) {
    if (
      !question ||
      typeof question !== "object"
    ) {
      throw new Error(
        `Question ${index + 1} is not a valid object.`
      );
    }

    if (
      typeof question.question !== "string" ||
      !question.question.trim()
    ) {
      throw new Error(
        `Question ${index + 1} has no valid "question".`
      );
    }

    if (!Array.isArray(question.options)) {
      throw new Error(
        `Question ${index + 1} must have an "options" array.`
      );
    }

    if (question.options.length < 2) {
      throw new Error(
        `Question ${index + 1} needs at least 2 options.`
      );
    }

    const options =
      question.options.map((option) =>
        String(option).trim()
      );

    if (
      options.some(
        (option) => !option
      )
    ) {
      throw new Error(
        `Question ${index + 1} contains an empty option.`
      );
    }

    if (
      typeof question.answer !== "string" ||
      !question.answer.trim()
    ) {
      throw new Error(
        `Question ${index + 1} has no valid "answer".`
      );
    }

    if (
      !options.includes(
        question.answer.trim()
      )
    ) {
      throw new Error(
        `Question ${index + 1}: answer does not exactly match one of the options.`
      );
    }

    return {
      ...question,
      options
    };
  }

  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {
    try {
      showLoadingState();

      const response =
        await fetch(
          `${QUESTIONS_FILE}?v=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Could not load questions.json (${response.status}).`
        );
      }

      const data =
        await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "questions.json must contain an array of questions."
        );
      }

      if (data.length === 0) {
        throw new Error(
          "questions.json contains no questions."
        );
      }

      allQuestions =
        data.map(
          (question, index) =>
            validateQuestion(
              question,
              index
            )
        );

      buildRounds();

      if (rounds.length === 0) {
        throw new Error(
          "No quiz rounds could be created."
        );
      }

      initializeUnlockedRounds();
      renderRounds();
      updateContinueButton();

      showScreen("homeScreen");

      updateRewards();

      console.log(
        `Quiz Master: loaded ${allQuestions.length} questions in ${rounds.length} rounds.`
      );

      return true;

    } catch (error) {
      console.error(
        "Quiz Master loading error:",
        error
      );

      showError(
        error && error.message
          ? error.message
          : "Could not load the quiz."
      );

      return false;
    }
  }

  function showLoadingState() {
    if (elements.question) {
      elements.question.textContent =
        "Loading questions...";
    }
  }

  /* =========================
     BUILD ROUNDS
     ========================= */

  function buildRounds() {
    rounds = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i += QUESTIONS_PER_ROUND
    ) {
      rounds.push(
        allQuestions.slice(
          i,
          i + QUESTIONS_PER_ROUND
        )
      );
    }
  }

  /* =========================
     ROUND UNLOCK SYSTEM
     ========================= */

  function initializeUnlockedRounds() {
    let unlocked =
      readJSON(
        STORAGE.unlockedRounds,
        null
      );

    if (!Array.isArray(unlocked)) {
      unlocked = [1];
    }

    unlocked =
      unlocked
        .map(Number)
        .filter(
          (round) =>
            Number.isInteger(round) &&
            round >= 1 &&
            round <= rounds.length
        );

    if (!unlocked.includes(1)) {
      unlocked.unshift(1);
    }

    unlocked =
      [...new Set(unlocked)]
        .sort(
          (a, b) => a - b
        );

    writeJSON(
      STORAGE.unlockedRounds,
      unlocked
    );
  }

  function getUnlockedRounds() {
    let unlocked =
      readJSON(
        STORAGE.unlockedRounds,
        [1]
      );

    if (!Array.isArray(unlocked)) {
      unlocked = [1];
    }

    unlocked =
      unlocked
        .map(Number)
        .filter(
          (round) =>
            Number.isInteger(round) &&
            round >= 1 &&
            round <= rounds.length
        );

    if (!unlocked.includes(1)) {
      unlocked.push(1);
    }

    return [
      ...new Set(unlocked)
    ].sort(
      (a, b) => a - b
    );
  }

  function updateUnlockedRounds(
    roundNumber,
    percent
  ) {
    const unlocked =
      getUnlockedRounds();

    if (
      percent >= UNLOCK_PERCENT &&
      roundNumber < rounds.length
    ) {
      const nextRound =
        roundNumber + 1;

      if (
        !unlocked.includes(
          nextRound
        )
      ) {
        unlocked.push(
          nextRound
        );
      }
    }

    unlocked.sort(
      (a, b) => a - b
    );

    writeJSON(
      STORAGE.unlockedRounds,
      unlocked
    );

    renderRounds();
  }

  function isRoundUnlocked(
    roundNumber
  ) {
    return getUnlockedRounds()
      .includes(
        Number(roundNumber)
      );
  }

  /* =========================
     SCREEN MANAGEMENT
     ========================= */

  function showScreen(screenId) {
    const screens = [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "errorScreen",
      "settingsScreen",
      "rewardsScreen"
    ];

    screens.forEach((id) => {
      const screen = $(id);

      if (!screen) return;

      screen.classList.toggle(
        "active",
        id === screenId
      );
    });

    if (
      screenId === "rewardsScreen"
    ) {
      updateRewards();
    }
  }

  /* =========================
     START QUIZ
     ========================= */

  function startQuiz(
    roundNumber = 1
  ) {
    roundNumber =
      Number(roundNumber);

    if (
      !Number.isInteger(
        roundNumber
      )
    ) {
      roundNumber = 1;
    }

    if (!rounds.length) {
      showError(
        "Questions have not finished loading yet."
      );
      return;
    }

    if (
      !isRoundUnlocked(
        roundNumber
      )
    ) {
      return;
    }

    stopTimer();

    currentRound =
      roundNumber;

    currentQuestionIndex = 0;

    currentRoundQuestions =
      rounds[
        currentRound - 1
      ] || [];

    if (
      !currentRoundQuestions.length
    ) {
      showError(
        "This round does not contain any questions."
      );
      return;
    }

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    selectedAnswer = null;
    answered = false;
    quizFinished = false;

    reviewQuestions = [];

    saveCurrentRound();

    showScreen(
      "quizScreen"
    );

    renderQuestion();

    startMusic();
  }

  /* =========================
     CONTINUE QUIZ
     ========================= */

  function continueQuiz() {
    const progress =
      readJSON(
        STORAGE.progress,
        null
      );

    if (!progress) {
      startQuiz(1);
      return;
    }

    if (!rounds.length) {
      showError(
        "Questions have not finished loading yet."
      );
      return;
    }

    const savedRound =
      Number(progress.round);

    const savedIndex =
      Number(
        progress.questionIndex
      );

    if (
      !Number.isInteger(
        savedRound
      ) ||
      savedRound < 1 ||
      savedRound > rounds.length
    ) {
      localStorage.removeItem(
        STORAGE.progress
      );

      startQuiz(1);
      return;
    }

    if (
      !isRoundUnlocked(
        savedRound
      )
    ) {
      localStorage.removeItem(
        STORAGE.progress
      );

      startQuiz(1);
      return;
    }

    currentRound =
      savedRound;

    currentRoundQuestions =
      rounds[
        currentRound - 1
      ] || [];

    if (
      !currentRoundQuestions.length
    ) {
      startQuiz(1);
      return;
    }

    currentQuestionIndex =
      clamp(
        Number.isInteger(
          savedIndex
        )
          ? savedIndex
          : 0,
        0,
        currentRoundQuestions.length - 1
      );

    score =
      Number(progress.score) || 0;

    correctAnswers =
      Number(
        progress.correctAnswers
      ) || 0;

    wrongAnswers =
      Number(
        progress.wrongAnswers
      ) || 0;

    selectedAnswer = null;
    answered = false;
    quizFinished = false;

    reviewQuestions = [];

    showScreen(
      "quizScreen"
    );

    renderQuestion();

    startMusic();
  }

  /* =========================
     SAVE PROGRESS
     ========================= */

  function saveCurrentRound() {
    try {
      localStorage.setItem(
        STORAGE.currentRound,
        String(currentRound)
      );
    } catch (error) {
      console.warn(error);
    }
  }

  function saveCurrentProgress() {
    if (
      !currentRoundQuestions.length
    ) {
      return;
    }

    writeJSON(
      STORAGE.progress,
      {
        round: currentRound,
        questionIndex:
          currentQuestionIndex,
        score,
        correctAnswers,
        wrongAnswers,
        savedAt: Date.now()
      }
    );

    saveCurrentRound();
    updateContinueButton();
  }

  function clearCurrentProgress() {
    localStorage.removeItem(
      STORAGE.progress
    );

    updateContinueButton();
  }

  function hasSavedProgress() {
    const progress =
      readJSON(
        STORAGE.progress,
        null
      );

    if (!progress) {
      return false;
    }

    return (
      Number.isInteger(
        Number(progress.round)
      ) &&
      Number.isInteger(
        Number(
          progress.questionIndex
        )
      )
    );
  }

  function updateContinueButton() {
    if (!elements.continueBtn) {
      return;
    }

    elements.continueBtn.style.display =
      hasSavedProgress()
        ? ""
        : "none";
  }

  /* =========================
     RENDER QUESTION
     ========================= */

  function renderQuestion() {
    if (
      !currentRoundQuestions.length
    ) {
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

    stopTimer();

    selectedAnswer = null;
    answered = false;

    const total =
      currentRoundQuestions.length;

    const questionNumber =
      currentQuestionIndex + 1;

    const progress =
      (questionNumber / total) *
      100;

    safeText(
      elements.questionNumber,
      `${questionNumber} / ${total}`
    );

    safeText(
      elements.roundDisplay,
      `Round ${currentRound}`
    );

    safeText(
      elements.score,
      String(score)
    );

    safeText(
      elements.category,
      question.category ||
        "General Knowledge"
    );

    safeText(
      elements.question,
      getQuestionText(question)
    );

    if (elements.progressBar) {
      elements.progressBar.style.width =
        `${progress}%`;
    }

    renderOptions(
      question.options
    );

    if (elements.message) {
      elements.message.textContent =
        "";

      elements.message.classList.remove(
        "correct",
        "wrong"
      );
    }

    if (elements.nextBtn) {
      elements.nextBtn.disabled =
        true;

      elements.nextBtn.style.display =
        "";
    }

    startTimer();
  }

  /* =========================
     RENDER OPTIONS
     ========================= */

  function renderOptions(options) {
    if (!elements.options) {
      return;
    }

    elements.options.innerHTML =
      "";

    options.forEach(
      (option, index) => {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";
        button.className =
          "option-btn";

        button.textContent =
          option;

        button.dataset.answer =
          option;

        button.dataset.index =
          String(index);

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
    if (
      answered ||
      quizFinished
    ) {
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
    selectedAnswer =
      answer;

    stopTimer();

    const isCorrect =
      answer ===
      question.answer;

    const optionButtons =
      elements.options
        ? elements.options
            .querySelectorAll(
              ".option-btn"
            )
        : [];

    optionButtons.forEach(
      (button) => {
        button.disabled =
          true;

        const value =
          button.dataset.answer;

        if (
          value ===
          question.answer
        ) {
          button.classList.add(
            "correct"
          );
        }

        if (
          value === answer &&
          !isCorrect
        ) {
          button.classList.add(
            "wrong"
          );
        }
      }
    );

    if (isCorrect) {
      correctAnswers++;

      score +=
        POINTS_PER_CORRECT;

      showMessage(
        "Correct! 🎉",
        true
      );

      playSound(
        "correct"
      );

    } else {
      wrongAnswers++;

      showMessage(
        `Wrong! Correct answer: ${question.answer}`,
        false
      );

      playSound(
        "wrong"
      );
    }

    reviewQuestions.push({
      ...question,
      userAnswer: answer,
      isCorrect
    });

    safeText(
      elements.score,
      String(score)
    );

    if (elements.nextBtn) {
      elements.nextBtn.disabled =
        false;
    }

    saveCurrentProgress();
  }

  function showMessage(
    message,
    correct
  ) {
    if (!elements.message) {
      return;
    }

    elements.message.textContent =
      message;

    elements.message.classList.toggle(
      "correct",
      Boolean(correct)
    );

    elements.message.classList.toggle(
      "wrong",
      !correct
    );
  }

  /* =========================
     NEXT QUESTION
     ========================= */

  function nextQuestion() {
    if (!answered) {
      return;
    }

    if (
      currentQuestionIndex >=
      currentRoundQuestions.length - 1
    ) {
      finishRound();
      return;
    }

    currentQuestionIndex++;

    saveCurrentProgress();

    renderQuestion();
  }

  /* =========================
     TIMER
     ========================= */

  function startTimer() {
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    timerInterval =
      setInterval(() => {
        timeLeft--;

        updateTimerDisplay();

        if (
          timeLeft <= 0
        ) {
          stopTimer();

          timeExpired();
        }
      }, 1000);
  }

  function stopTimer() {
    if (
      timerInterval !== null
    ) {
      clearInterval(
        timerInterval
      );

      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    safeText(
      elements.timer,
      String(
        Math.max(
          0,
          timeLeft
        )
      )
    );
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

    wrongAnswers++;

    const optionButtons =
      elements.options
        ? elements.options
            .querySelectorAll(
              ".option-btn"
            )
        : [];

    optionButtons.forEach(
      (button) => {
        button.disabled =
          true;

        if (
          button.dataset.answer ===
          question.answer
        ) {
          button.classList.add(
            "correct"
          );
        }
      }
    );

    showMessage(
      `Time's up! Correct answer: ${question.answer}`,
      false
    );

    playSound("wrong");

    reviewQuestions.push({
      ...question,
      userAnswer: null,
      isCorrect: false
    });

    if (elements.nextBtn) {
      elements.nextBtn.disabled =
        false;
    }

    saveCurrentProgress();
  }

  /* =========================
     FINISH ROUND
     ========================= */

  function finishRound() {
    if (quizFinished) {
      return;
    }

    quizFinished = true;

    stopTimer();

    const total =
      currentRoundQuestions.length ||
      1;

    const percent =
      Math.round(
        (correctAnswers /
          total) *
          100
      );

    const stars =
      percent >= 80
        ? 3
        : percent >= 60
        ? 2
        : 1;

    saveRoundResult(
      currentRound,
      percent,
      stars
    );

    updateUnlockedRounds(
      currentRound,
      percent
    );

    saveTotalScore(
      score
    );

    updatePersonalBest(
      score
    );

    updateAchievements();

    clearCurrentProgress();

    renderResult(
      percent,
      stars
    );

    showScreen(
      "resultScreen"
    );

    startMusic();
  }

  /* =========================
     RESULT
     ========================= */

  function renderResult(
    percent,
    stars
  ) {
    safeText(
      elements.finishedRound,
      `Round ${currentRound}`
    );

    safeText(
      elements.correctCount,
      String(correctAnswers)
    );

    safeText(
      elements.wrongCount,
      String(wrongAnswers)
    );

    safeText(
      elements.finalScore,
      String(score)
    );

    safeText(
      elements.resultPercent,
      `${percent}%`
    );

    let message = "";

    if (percent >= 80) {
      message =
        `Excellent! 🌟 You mastered this round! ${"★".repeat(stars)}`;

    } else if (
      percent >= 60
    ) {
      message =
        `Great job! 🎉 The next round is unlocked. ${"★".repeat(stars)}`;

    } else {
      message =
        `Keep practicing! 💪 You can try this round again. ${"★".repeat(stars)}`;
    }

    safeText(
      elements.resultMessage,
      message
    );

    if (elements.nextRoundBtn) {
      const nextRound =
        currentRound + 1;

      elements.nextRoundBtn.style.display =
        nextRound <= rounds.length &&
        isRoundUnlocked(
          nextRound
        )
          ? ""
          : "none";
    }

    if (elements.reviewBtn) {
      elements.reviewBtn.style.display =
        reviewQuestions.length
          ? ""
          : "none";
    }
  }

  /* =========================
     SAVE ROUND RESULT
     ========================= */

  function saveRoundResult(
    roundNumber,
    percent,
    stars
  ) {
    let completed =
      readJSON(
        STORAGE.completedRounds,
        []
      );

    if (!Array.isArray(completed)) {
      completed = [];
    }

    if (
      !completed.includes(
        roundNumber
      )
    ) {
      completed.push(
        roundNumber
      );
    }

    writeJSON(
      STORAGE.completedRounds,
      completed
    );

    let roundStars =
      readJSON(
        STORAGE.roundStars,
        {}
      );

    if (
      !roundStars ||
      typeof roundStars !==
        "object"
    ) {
      roundStars = {};
    }

    roundStars[
      roundNumber
    ] =
      Math.max(
        Number(
          roundStars[
            roundNumber
          ]
        ) || 0,
        stars
      );

    writeJSON(
      STORAGE.roundStars,
      roundStars
    );

    saveDailyChallenge(
      roundNumber,
      percent
    );
  }

  function saveDailyChallenge(
    roundNumber,
    percent
  ) {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const daily =
      readJSON(
        STORAGE.dailyChallenge,
        null
      );

    if (
      !daily ||
      daily.date !== today
    ) {
      writeJSON(
        STORAGE.dailyChallenge,
        {
          date: today,
          round: roundNumber,
          percent,
          completed: true
        }
      );

      return;
    }

    if (
      percent >
      Number(
        daily.percent || 0
      )
    ) {
      daily.percent =
        percent;

      daily.round =
        roundNumber;

      daily.completed =
        true;

      writeJSON(
        STORAGE.dailyChallenge,
        daily
      );
    }
  }

  /* =========================
     TOTAL SCORE
     ========================= */

  function saveTotalScore(
    roundScore
  ) {
    const oldTotal =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        )
      ) || 0;

    localStorage.setItem(
      STORAGE.totalScore,
      String(
        oldTotal +
          roundScore
      )
    );
  }

  /* =========================
     PERSONAL BEST
     ========================= */

  function updatePersonalBest(
    currentScore
  ) {
    const best =
      Number(
        localStorage.getItem(
          STORAGE.personalBest
        )
      ) || 0;

    if (
      currentScore >
      best
    ) {
      localStorage.setItem(
        STORAGE.personalBest,
        String(
          currentScore
        )
      );
    }
  }

  /* =========================================================
     ACHIEVEMENTS
     ========================================================= */

  const ACHIEVEMENTS = [
    {
      id: "first-round",
      title: "First Victory",
      description:
        "Complete your first quiz round.",
      icon: "🎮"
    },
    {
      id: "five-rounds",
      title: "Five Rounds",
      description:
        "Complete five quiz rounds.",
      icon: "🏆"
    },
    {
      id: "fifty-correct",
      title: "50 Correct",
      description:
        "Answer 50 questions correctly.",
      icon: "🎯"
    },
    {
      id: "all-rounds",
      title: "Quiz Master",
      description:
        "Complete all available quiz rounds.",
      icon: "🌟"
    }
  ];

  function getAchievements() {
    let achievements =
      readJSON(
        STORAGE.achievements,
        []
      );

    if (
      !Array.isArray(
        achievements
      )
    ) {
      achievements = [];
    }

    return [
      ...new Set(
        achievements
          .map(String)
      )
    ];
  }

  function saveAchievements(
    achievements
  ) {
    writeJSON(
      STORAGE.achievements,
      [
        ...new Set(
          achievements
        )
      ]
    );
  }

  function unlockAchievement(
    id
  ) {
    const achievements =
      getAchievements();

    if (
      !achievements.includes(id)
    ) {
      achievements.push(id);

      saveAchievements(
        achievements
      );

      console.log(
        "Quiz Master achievement unlocked:",
        id
      );
    }
  }

  function updateAchievements() {
    const completed =
      readJSON(
        STORAGE.completedRounds,
        []
      );

    const completedRounds =
      Array.isArray(completed)
        ? completed
        : [];

    if (
      completedRounds.length >= 1
    ) {
      unlockAchievement(
        "first-round"
      );
    }

    if (
      completedRounds.length >= 5
    ) {
      unlockAchievement(
        "five-rounds"
      );
    }

    const totalCorrect =
      getTotalCorrectAnswers();

    if (
      totalCorrect >= 50
    ) {
      unlockAchievement(
        "fifty-correct"
      );
    }

    if (
      rounds.length > 0 &&
      completedRounds.length >=
        rounds.length
    ) {
      unlockAchievement(
        "all-rounds"
      );
    }

    updateRewards();
  }

  function getTotalCorrectAnswers() {
    const completed =
      readJSON(
        STORAGE.completedRounds,
        []
      );

    const roundStars =
      readJSON(
        STORAGE.roundStars,
        {}
      );

    /*
      We calculate a safe estimate from
      completed round results when possible.
      The current session is also included.
    */

    let totalCorrect = 0;

    if (
      Array.isArray(completed)
    ) {
      completed.forEach(
        (roundNumber) => {
          const stars =
            Number(
              roundStars[
                roundNumber
              ]
            ) || 0;

          /*
            This is only used for the
            achievement threshold.
            A 3-star round is at least
            8 correct out of 10,
            2-star is at least 6,
            1-star is at least 1.
          */

          if (stars >= 3) {
            totalCorrect += 8;
          } else if (
            stars >= 2
          ) {
            totalCorrect += 6;
          } else if (
            stars >= 1
          ) {
            totalCorrect += 1;
          }
        }
      );
    }

    return totalCorrect;
  }

  /* =========================================================
     REWARDS SYSTEM
     ========================================================= */

  function createRewardsUI() {
    /*
      If the user later adds Rewards directly
      to index.html, this function will simply
      use the existing elements.
    */

    let rewardsBtn =
      $("rewardsBtn");

    let rewardsScreen =
      $("rewardsScreen");

    /*
      Create Rewards button automatically
      if it does not exist.
    */

    if (
      !rewardsBtn &&
      elements.shareBtn &&
      elements.shareBtn.parentElement
    ) {
      rewardsBtn =
        document.createElement(
          "button"
        );

      rewardsBtn.id =
        "rewardsBtn";

      rewardsBtn.type =
        "button";

      rewardsBtn.className =
        "secondary-btn";

      rewardsBtn.textContent =
        "🎁 Rewards";

      elements.shareBtn.parentElement.appendChild(
        rewardsBtn
      );
    }

    /*
      Create Rewards screen automatically.
    */

    if (!rewardsScreen) {
      rewardsScreen =
        document.createElement(
          "section"
        );

      rewardsScreen.id =
        "rewardsScreen";

      rewardsScreen.className =
        "screen";

      rewardsScreen.innerHTML = `
        <div class="container">

          <div class="screen-header">
            <h2>🎁 Rewards</h2>
            <p>
              Track your stars, achievements and quiz progress.
            </p>
          </div>

          <div class="result-card">

            <div class="result-icon">
              🎁
            </div>

            <h2>Your Rewards</h2>

            <div class="result-stats">

              <div class="stat-card">
                <span>⭐ Total Stars</span>
                <strong id="rewardsStars">0</strong>
              </div>

              <div class="stat-card">
                <span>🏆 Completed Rounds</span>
                <strong id="rewardsRounds">0</strong>
              </div>

              <div class="stat-card">
                <span>🎯 Total Score</span>
                <strong id="rewardsScore">0</strong>
              </div>

              <div class="stat-card">
                <span>🏅 Achievements</span>
                <strong id="rewardsAchievements">0</strong>
              </div>

            </div>

            <div
              id="rewardsAchievementList"
              class="review-list">
            </div>

            <div class="button-group">

              <button
                id="rewardsBackBtn"
                type="button"
                class="secondary-btn">
                ← Back Home
              </button>

            </div>

          </div>

        </div>
      `;

      /*
        Put the new screen before the settings
        screen so existing screens stay intact.
      */

      const settingsScreen =
        $("settingsScreen");

      if (
        settingsScreen &&
        settingsScreen.parentElement
      ) {
        settingsScreen.parentElement.insertBefore(
          rewardsScreen,
          settingsScreen
        );
      } else {
        document.body.appendChild(
          rewardsScreen
        );
      }
    }

    /*
      Refresh element references.
    */

    elements.rewardsBtn =
      $("rewardsBtn");

    elements.rewardsScreen =
      $("rewardsScreen");

    elements.rewardsStars =
      $("rewardsStars");

    elements.rewardsRounds =
      $("rewardsRounds");

    elements.rewardsScore =
      $("rewardsScore");

    elements.rewardsAchievements =
      $("rewardsAchievements");

    elements.rewardsAchievementList =
      $(
        "rewardsAchievementList"
      );

    elements.rewardsBackBtn =
      $("rewardsBackBtn");

    /*
      Add listeners only once.
    */

    if (
      elements.rewardsBtn &&
      !elements.rewardsBtn.dataset.listenerAdded
    ) {
      elements.rewardsBtn.addEventListener(
        "click",
        () => {
          updateRewards();
          showScreen(
            "rewardsScreen"
          );
          window.scrollTo(
            0,
            0
          );
        }
      );

      elements.rewardsBtn.dataset.listenerAdded =
        "true";
    }

    if (
      elements.rewardsBackBtn &&
      !elements.rewardsBackBtn.dataset.listenerAdded
    ) {
      elements.rewardsBackBtn.addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );

          updateContinueButton();

          startMusic();

          window.scrollTo(
            0,
            0
          );
        }
      );

      elements.rewardsBackBtn.dataset.listenerAdded =
        "true";
    }
  }

  function updateRewards() {
    const completed =
      readJSON(
        STORAGE.completedRounds,
        []
      );

    const roundStars =
      readJSON(
        STORAGE.roundStars,
        {}
      );

    const achievements =
      getAchievements();

    let totalStars = 0;

    if (
      roundStars &&
      typeof roundStars ===
        "object"
    ) {
      Object.values(
        roundStars
      ).forEach(
        (value) => {
          const stars =
            Number(value);

          if (
            Number.isFinite(
              stars
            )
          ) {
            totalStars +=
              stars;
          }
        }
      );
    }

    const completedRounds =
      Array.isArray(completed)
        ? completed.length
        : 0;

    const totalScore =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        )
      ) || 0;

    safeText(
      elements.rewardsStars,
      totalStars
    );

    safeText(
      elements.rewardsRounds,
      completedRounds
    );

    safeText(
      elements.rewardsScore,
      totalScore
    );

    safeText(
      elements.rewardsAchievements,
      achievements.length
    );

    renderAchievements();
  }

  function renderAchievements() {
    const container =
      elements.rewardsAchievementList;

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const unlocked =
      getAchievements();

    ACHIEVEMENTS.forEach(
      (achievement) => {
        const isUnlocked =
          unlocked.includes(
            achievement.id
          );

        const item =
          document.createElement(
            "div"
          );

        item.style.padding =
          "16px";

        item.style.borderRadius =
          "16px";

        item.style.background =
          isUnlocked
            ? "#f0fdf4"
            : "#f8fafc";

        item.style.border =
          isUnlocked
            ? "1px solid #86efac"
            : "1px solid #e5e7eb";

        item.style.opacity =
          isUnlocked
            ? "1"
            : "0.65";

        item.innerHTML = `
          <strong style="display:block;margin-bottom:5px;color:#111827;">
            ${
              isUnlocked
                ? "✅"
                : "🔒"
            }
            ${achievement.icon}
            ${achievement.title}
          </strong>

          <span style="color:#6b7280;font-size:14px;">
            ${achievement.description}
          </span>
        `;

        container.appendChild(
          item
        );
      }
    );
  }

  /* =========================
     REVIEW
     ========================= */

  function showReview() {
    stopTimer();

    renderReview();

    showScreen(
      "reviewScreen"
    );

    startMusic();
  }

  function renderReview() {
    if (!elements.reviewList) {
      return;
    }

    elements.reviewList.innerHTML =
      "";

    let correct = 0;
    let wrong = 0;

    reviewQuestions.forEach(
      (item, index) => {
        if (item.isCorrect) {
          correct++;
        } else {
          wrong++;
        }

        const wrapper =
          document.createElement(
            "div"
          );

        wrapper.className =
          "review-item";

        const number =
          document.createElement(
            "div"
          );

        number.className =
          "review-number";

        number.textContent =
          `Question ${index + 1}`;

        const question =
          document.createElement(
            "div"
          );

        question.className =
          "review-question";

        question.textContent =
          getQuestionText(
            item
          );

        const userAnswer =
          document.createElement(
            "div"
          );

        userAnswer.className =
          "review-user-answer";

        userAnswer.textContent =
          item.userAnswer
            ? `Your answer: ${item.userAnswer}`
            : "Your answer: No answer";

        const correctAnswer =
          document.createElement(
            "div"
          );

        correctAnswer.className =
          "review-correct-answer";

        correctAnswer.textContent =
          `Correct answer: ${item.answer}`;

        wrapper.appendChild(
          number
        );

        wrapper.appendChild(
          question
        );

        wrapper.appendChild(
          userAnswer
        );

        wrapper.appendChild(
          correctAnswer
        );

        elements.reviewList.appendChild(
          wrapper
        );
      }
    );

    safeText(
      elements.reviewSummary,
      `Correct: ${correct} • Wrong: ${wrong}`
    );
  }

  /* =========================
     RETRY ROUND
     ========================= */

  function retryRound() {
    startQuiz(
      currentRound
    );
  }

  /* =========================
     NEXT ROUND
     ========================= */

  function nextRound() {
    const next =
      currentRound + 1;

    if (
      next > rounds.length ||
      !isRoundUnlocked(
        next
      )
    ) {
      return;
    }

    startQuiz(next);
  }

  /* =========================
     ROUNDS SCREEN
     ========================= */

  function showRounds() {
    renderRounds();

    showScreen(
      "roundsScreen"
    );

    startMusic();
  }

  function renderRounds() {
    if (!elements.roundGrid) {
      return;
    }

    elements.roundGrid.innerHTML =
      "";

    const unlocked =
      getUnlockedRounds();

    const completed =
      readJSON(
        STORAGE.completedRounds,
        []
      );

    const roundStars =
      readJSON(
        STORAGE.roundStars,
        {}
      );

    rounds.forEach(
      (roundQuestions, index) => {
        const roundNumber =
          index + 1;

        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "round-btn";

        const isUnlocked =
          unlocked.includes(
            roundNumber
          );

        const isCompleted =
          Array.isArray(
            completed
          ) &&
          completed.includes(
            roundNumber
          );

        const stars =
          Number(
            roundStars[
              roundNumber
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

        let starText = "";

        if (stars > 0) {
          starText =
            " " +
            "★".repeat(
              stars
            ) +
            "☆".repeat(
              3 - stars
            );
        }

        button.textContent =
          isUnlocked
            ? `Round ${roundNumber}${starText}`
            : `🔒 Round ${roundNumber}`;

        button.disabled =
          !isUnlocked;

        if (isUnlocked) {
          button.addEventListener(
            "click",
            () => {
              startQuiz(
                roundNumber
              );
            }
          );
        }

        elements.roundGrid.appendChild(
          button
        );
      }
    );
  }

  /* =========================
     HOME
     ========================= */

  function goHome() {
    stopTimer();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();

    startMusic();
  }

  /* =========================
     SETTINGS
     ========================= */

  function showSettings() {
    updateSettingsUI();

    showScreen(
      "settingsScreen"
    );

    startMusic();
  }

  function updateSettingsUI() {
    if (elements.musicSwitch) {
      if (
        elements.musicSwitch.type ===
        "checkbox"
      ) {
        elements.musicSwitch.checked =
          musicEnabled;
      } else {
        elements.musicSwitch.classList.toggle(
          "on",
          musicEnabled
        );
      }
    }

    if (elements.soundSwitch) {
      if (
        elements.soundSwitch.type ===
        "checkbox"
      ) {
        elements.soundSwitch.checked =
          soundEnabled;
      } else {
        elements.soundSwitch.classList.toggle(
          "on",
          soundEnabled
        );
      }
    }
  }

  function toggleMusic() {
    if (
      elements.musicSwitch &&
      elements.musicSwitch.type ===
        "checkbox"
    ) {
      musicEnabled =
        elements.musicSwitch.checked;
    } else {
      musicEnabled =
        !musicEnabled;
    }

    localStorage.setItem(
      STORAGE.music,
      String(musicEnabled)
    );

    updateSettingsUI();

    if (musicEnabled) {
      startMusic(true);
    } else {
      /*
        IMPORTANT:
        Music position is saved.
        It is NOT reset to zero.
      */
      stopMusic();
    }
  }

  function toggleSound() {
    if (
      elements.soundSwitch &&
      elements.soundSwitch.type ===
        "checkbox"
    ) {
      soundEnabled =
        elements.soundSwitch.checked;
    } else {
      soundEnabled =
        !soundEnabled;
    }

    localStorage.setItem(
      STORAGE.sound,
      String(soundEnabled)
    );

    updateSettingsUI();
  }

  /* =========================================================
     MUSIC SYSTEM
     ========================================================= */

  function getSavedMusicPosition() {
    const position =
      Number(
        localStorage.getItem(
          STORAGE.musicPosition
        )
      );

    return Number.isFinite(
      position
    ) && position >= 0
      ? position
      : 0;
  }

  function saveMusicPosition() {
    if (!backgroundMusic) {
      return;
    }

    try {
      const current =
        Number(
          backgroundMusic.currentTime
        );

      if (
        Number.isFinite(
          current
        ) &&
        current >= 0
      ) {
        localStorage.setItem(
          STORAGE.musicPosition,
          String(current)
        );
      }
    } catch (error) {
      console.warn(
        "Quiz Master: Could not save music position:",
        error
      );
    }
  }

  function restoreMusicPosition() {
    if (!backgroundMusic) {
      return;
    }

    try {
      const saved =
        getSavedMusicPosition();

      if (
        !Number.isFinite(
          backgroundMusic.duration
        ) ||
        backgroundMusic.duration <= 0
      ) {
        return;
      }

      if (
        saved >= 0 &&
        saved < backgroundMusic.duration
      ) {
        backgroundMusic.currentTime =
          saved;
      }

    } catch (error) {
      console.warn(
        "Quiz Master: Could not restore music position:",
        error
      );
    }
  }

  function initializeMusic() {
    try {
      if (backgroundMusic) {
        return;
      }

      backgroundMusic =
        new Audio(
          MUSIC_FILE
        );

      backgroundMusic.loop =
        true;

      backgroundMusic.volume =
        0.35;

      backgroundMusic.preload =
        "auto";

      backgroundMusic.setAttribute(
        "playsinline",
        ""
      );

      backgroundMusic.addEventListener(
        "loadedmetadata",
        () => {
          restoreMusicPosition();
        }
      );

      backgroundMusic.addEventListener(
        "canplay",
        () => {
          restoreMusicPosition();
        },
        {
          once: true
        }
      );

      backgroundMusic.addEventListener(
        "ended",
        () => {
          if (
            musicEnabled
          ) {
            /*
              loop=true normally handles this.
              This is only a safety fallback.
            */
            try {
              backgroundMusic.currentTime =
                0;
            } catch (error) {}

            startMusic();
          }
        }
      );

      backgroundMusic.addEventListener(
        "error",
        () => {
          console.error(
            "Quiz Master: Could not load music:",
            MUSIC_FILE
          );
        }
      );

      backgroundMusic.addEventListener(
        "timeupdate",
        () => {
          /*
            Save playback position periodically.
          */
          if (
            backgroundMusic &&
            !backgroundMusic.paused
          ) {
            saveMusicPosition();
          }
        }
      );

      backgroundMusic.addEventListener(
        "pause",
        () => {
          saveMusicPosition();
        }
      );

      backgroundMusic.load();

    } catch (error) {
      console.error(
        "Quiz Master: Music initialization failed:",
        error
      );

      backgroundMusic =
        null;
    }
  }

  function startMusic(
    fromUserGesture = false
  ) {
    if (!musicEnabled) {
      return;
    }

    if (!backgroundMusic) {
      initializeMusic();
    }

    if (!backgroundMusic) {
      return;
    }

    if (
      !backgroundMusic.paused &&
      !backgroundMusic.ended
    ) {
      return;
    }

    if (
      musicPlayInProgress
    ) {
      return;
    }

    /*
      Restore the saved position
      before trying to play.
    */

    try {
      const saved =
        getSavedMusicPosition();

      if (
        Number.isFinite(
          backgroundMusic.duration
        ) &&
        backgroundMusic.duration >
          0 &&
        saved <
          backgroundMusic.duration
      ) {
        backgroundMusic.currentTime =
          saved;
      }
    } catch (error) {
      console.warn(
        "Quiz Master: Could not prepare music position:",
        error
      );
    }

    musicPlayInProgress =
      true;

    try {
      const playPromise =
        backgroundMusic.play();

      if (
        playPromise &&
        typeof playPromise.then ===
          "function"
      ) {
        playPromise
          .then(() => {
            musicPlayInProgress =
              false;

            console.log(
              "Quiz Master: Music is playing from saved position."
            );

            removeMusicInteractionListeners();

            startMusicPositionSaver();
          })
          .catch((error) => {
            musicPlayInProgress =
              false;

            console.warn(
              "Quiz Master: Music playback was blocked:",
              error
            );

            addMusicInteractionListeners();
          });
      } else {
        musicPlayInProgress =
          false;

        startMusicPositionSaver();
      }

    } catch (error) {
      musicPlayInProgress =
        false;

      console.warn(
        "Quiz Master: Music play error:",
        error
      );

      addMusicInteractionListeners();
    }
  }

  function stopMusic(
    reset = false
  ) {
    if (!backgroundMusic) {
      return;
    }

    /*
      IMPORTANT:
      The reset argument is intentionally
      ignored.

      Music position is always preserved.
      This means existing calls such as
      stopMusic(true) cannot accidentally
      reset the song to 0.
    */

    try {
      saveMusicPosition();

      backgroundMusic.pause();

    } catch (error) {
      console.warn(
        "Quiz Master: Could not stop music:",
        error
      );
    }

    musicPlayInProgress =
      false;

    stopMusicPositionSaver();
  }

  function startMusicPositionSaver() {
    if (
      musicSaveInterval !== null
    ) {
      return;
    }

    musicSaveInterval =
      setInterval(() => {
        if (
          backgroundMusic &&
          !backgroundMusic.paused
        ) {
          saveMusicPosition();
        }
      }, 2000);
  }

  function stopMusicPositionSaver() {
    if (
      musicSaveInterval !== null
    ) {
      clearInterval(
        musicSaveInterval
      );

      musicSaveInterval =
        null;
    }
  }

  function addMusicInteractionListeners() {
    if (
      musicInteractionListenersAdded
    ) {
      return;
    }

    document.addEventListener(
      "pointerdown",
      handleFirstMusicInteraction,
      {
        passive: true
      }
    );

    document.addEventListener(
      "touchstart",
      handleFirstMusicInteraction,
      {
        passive: true
      }
    );

    document.addEventListener(
      "click",
      handleFirstMusicInteraction,
      {
        passive: true
      }
    );

    musicInteractionListenersAdded =
      true;
  }

  function removeMusicInteractionListeners() {
    if (
      !musicInteractionListenersAdded
    ) {
      return;
    }

    document.removeEventListener(
      "pointerdown",
      handleFirstMusicInteraction
    );

    document.removeEventListener(
      "touchstart",
      handleFirstMusicInteraction
    );

    document.removeEventListener(
      "click",
      handleFirstMusicInteraction
    );

    musicInteractionListenersAdded =
      false;
  }

  function handleFirstMusicInteraction() {
    if (!musicEnabled) {
      return;
    }

    startMusic(true);
  }

  function setupMusicInteractionListeners() {
    addMusicInteractionListeners();
  }

  /* =========================================================
     SAVE MUSIC WHEN PAGE IS HIDDEN/CLOSED
     ========================================================= */

  function setupMusicPersistence() {
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
      () => {
        saveMusicPosition();
      }
    );

    window.addEventListener(
      "beforeunload",
      () => {
        saveMusicPosition();
      }
    );
  }

  /* =========================
     SOUND EFFECTS
     ========================= */

  function playSound(type) {
    if (!soundEnabled) {
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

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      if (
        type === "correct"
      ) {
        oscillator.frequency.value =
          880;
      } else {
        oscillator.frequency.value =
          220;
      }

      oscillator.type =
        "sine";

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.08,
        context.currentTime +
          0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime +
          0.18
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          0.2
      );

      oscillator.addEventListener(
        "ended",
        () => {
          if (
            context &&
            typeof context.close ===
              "function"
          ) {
            context
              .close()
              .catch(
                () => {}
              );
          }
        }
      );

    } catch (error) {
      console.warn(
        "Sound effect error:",
        error
      );
    }
  }

  /* =========================
     SHARE
     ========================= */

  async function shareQuiz() {
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
        navigator.share &&
        typeof navigator.share ===
          "function"
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
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {
        await navigator.clipboard.writeText(
          window.location.href
        );

        showTemporaryShareMessage(
          "✅ Link Copied!"
        );

        return;
      }

    } catch (error) {
      console.warn(
        "Clipboard failed:",
        error
      );
    }

    try {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        window.location.href;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.focus();
      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();

      showTemporaryShareMessage(
        "✅ Link Copied!"
      );

    } catch (error) {
      console.warn(
        "Share fallback failed:",
        error
      );
    }
  }

  function showTemporaryShareMessage(
    message
  ) {
    if (!elements.shareBtn) {
      return;
    }

    const original =
      elements.shareBtn.textContent;

    elements.shareBtn.textContent =
      message;

    setTimeout(() => {
      if (
        elements.shareBtn
      ) {
        elements.shareBtn.textContent =
          original;
      }
    }, 1800);
  }

  /* =========================
     ERROR SCREEN
     ========================= */

  function showError(message) {
    stopTimer();

    if (
      elements.errorMessage
    ) {
      elements.errorMessage.textContent =
        message;
    }

    showScreen(
      "errorScreen"
    );

    startMusic();
  }

  async function retryLoadingQuestions() {
    const success =
      await loadQuestions();

    if (success) {
      showScreen(
        "homeScreen"
      );

      updateContinueButton();

      startMusic();
    }
  }

  /* =========================
     EVENT LISTENERS
     ========================= */

  function setupEventListeners() {

    /* HOME */

    if (elements.startBtn) {
      elements.startBtn.addEventListener(
        "click",
        () => {
          startQuiz(1);
        }
      );
    }

    if (
      elements.continueBtn
    ) {
      elements.continueBtn.addEventListener(
        "click",
        () => {
          continueQuiz();
        }
      );
    }

    if (elements.roundsBtn) {
      elements.roundsBtn.addEventListener(
        "click",
        () => {
          showRounds();
        }
      );
    }

    if (
      elements.settingsBtn
    ) {
      elements.settingsBtn.addEventListener(
        "click",
        () => {
          showSettings();
        }
      );
    }

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener(
        "click",
        () => {
          shareQuiz();
        }
      );
    }

    /* ROUNDS */

    if (
      elements.roundsBackBtn
    ) {
      elements.roundsBackBtn.addEventListener(
        "click",
        () => {
          goHome();
        }
      );
    }

    /* QUIZ */

    if (elements.nextBtn) {
      elements.nextBtn.addEventListener(
        "click",
        () => {
          nextQuestion();
        }
      );
    }

    if (
      elements.quizHomeBtn
    ) {
      elements.quizHomeBtn.addEventListener(
        "click",
        () => {
          saveCurrentProgress();
          goHome();
        }
      );
    }

    /* RESULT */

    if (elements.restartBtn) {
      elements.restartBtn.addEventListener(
        "click",
        () => {
          retryRound();
        }
      );
    }

    if (
      elements.nextRoundBtn
    ) {
      elements.nextRoundBtn.addEventListener(
        "click",
        () => {
          nextRound();
        }
      );
    }

    if (elements.reviewBtn) {
      elements.reviewBtn.addEventListener(
        "click",
        () => {
          showReview();
        }
      );
    }

    if (
      elements.resultHomeBtn
    ) {
      elements.resultHomeBtn.addEventListener(
        "click",
        () => {
          goHome();
        }
      );
    }

    /* REVIEW */

    if (
      elements.reviewRetryBtn
    ) {
      elements.reviewRetryBtn.addEventListener(
        "click",
        () => {
          retryRound();
        }
      );
    }

    if (
      elements.reviewBackBtn
    ) {
      elements.reviewBackBtn.addEventListener(
        "click",
        () => {
          showScreen(
            "resultScreen"
          );

          startMusic();
        }
      );
    }

    /* SETTINGS */

    if (
      elements.musicSwitch
    ) {
      elements.musicSwitch.addEventListener(
        "click",
        () => {
          toggleMusic();
        }
      );
    }

    if (
      elements.soundSwitch
    ) {
      elements.soundSwitch.addEventListener(
        "click",
        () => {
          toggleSound();
        }
      );
    }

    if (
      elements.settingsBackBtn
    ) {
      elements.settingsBackBtn.addEventListener(
        "click",
        () => {
          goHome();
        }
      );
    }

    /* ERROR */

    if (
      elements.errorRestartBtn
    ) {
      elements.errorRestartBtn.addEventListener(
        "click",
        () => {
          retryLoadingQuestions();
        }
      );
    }

    if (
      elements.errorHomeBtn
    ) {
      elements.errorHomeBtn.addEventListener(
        "click",
        () => {
          goHome();
        }
      );
    }
  }

  /* =========================
     INITIALIZE
     ========================= */

  async function initialize() {

    /*
      Create the Rewards UI before
      setting up the buttons.
    */

    createRewardsUI();

    initializeMusic();

    updateSettingsUI();

    setupMusicInteractionListeners();

    setupMusicPersistence();

    setupEventListeners();

    showScreen(
      "homeScreen"
    );

    updateRewards();

    await loadQuestions();

    updateContinueButton();

    updateRewards();

    /*
      No forced autoplay.
      Browser/mobile policy requires
      user interaction.
    */
  }

  /* =========================
     PUBLIC FUNCTIONS
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
    () => {
      updateRewards();
      showScreen(
        "rewardsScreen"
      );
    };

  /* =========================
     START APP
     ========================= */

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
