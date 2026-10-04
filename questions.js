/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   ---------------------------------------------------------
   SAFE FULL VERSION
   - Works with existing index.html
   - Loads ./questions.json
   - Robust JSON validation
   - Fixes answer/option spaces and case differences
   - Start Quiz
   - Continue Quiz
   - 10 rounds
   - 10 questions per round
   - 20 seconds per question
   - 10 points per correct answer
   - 60% required to unlock next round
   - Question randomization
   - No question repeats until available questions are used
   - Score saving
   - Progress saving
   - Review answers
   - Retry round
   - Next round
   - Stars
   - Streak bonus
   - Achievements
   - Daily challenge
   - Music setting
   - Sound setting
   - Share button
   - AdSense-safe
   - Keeps existing design/CSS
========================================================= */

(function () {
  "use strict";

  /* =======================================================
     CONFIGURATION
  ======================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 10;
  const UNLOCK_PERCENT = 60;

  const QUESTIONS_FILE = "./questions.json";

  const STORAGE = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    selectedRound: "quizmasterSelectedRound",
    completedRounds: "quizmasterCompletedRounds",
    usedQuestions: "quizmasterUsedQuestions",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    premium: "quizmasterPremium",
    daily: "quizmasterDailyChallenge",
    achievements: "quizmasterAchievements"
  };

  /* =======================================================
     STATE
  ======================================================= */

  let allQuestions = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let roundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let streak = 0;
  let bestStreak = 0;

  let timer = null;
  let timeLeft = TIME_PER_QUESTION;

  let quizFinished = false;
  let answerSelected = false;

  let quizStarted = false;

  let reviewData = [];

  let musicEnabled = true;
  let soundEnabled = true;

  let backgroundMusic = null;

  /* =======================================================
     BASIC HELPERS
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function getElement(...ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  function showElement(el) {
    if (!el) return;
    el.style.display = "";
    el.hidden = false;
  }

  function hideElement(el) {
    if (!el) return;
    el.style.display = "none";
    el.hidden = true;
  }

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  function shuffle(array) {
    const copy = Array.isArray(array) ? [...array] : [];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  /* =======================================================
     STORAGE
  ======================================================= */

  function getStorageJSON(key, fallback) {
    const value = localStorage.getItem(key);

    if (!value) return fallback;

    return safeParse(value, fallback);
  }

  function setStorageJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Quiz Master storage error:", error);
    }
  }

  /* =======================================================
     QUESTIONS VALIDATION
  ======================================================= */

  function validateQuestions(data) {
    if (!Array.isArray(data)) {
      console.error("questions.json is not an array.");
      return false;
    }

    if (data.length < QUESTIONS_PER_ROUND) {
      console.error(
        `Not enough questions. Found ${data.length}, need at least ${QUESTIONS_PER_ROUND}.`
      );
      return false;
    }

    let valid = true;

    data.forEach((q, index) => {
      if (!q || typeof q !== "object") {
        console.error(`Invalid question at index ${index}.`, q);
        valid = false;
        return;
      }

      if (
        typeof q.question !== "string" ||
        q.question.trim() === ""
      ) {
        console.error(
          `Question ${index + 1} has no valid "question" field.`,
          q
        );
        valid = false;
        return;
      }

      if (
        !Array.isArray(q.options) ||
        q.options.length < 2
      ) {
        console.error(
          `Question ${index + 1} has invalid options.`,
          q
        );
        valid = false;
        return;
      }

      const validOptions = q.options.every(
        option =>
          typeof option === "string" &&
          option.trim() !== ""
      );

      if (!validOptions) {
        console.error(
          `Question ${index + 1} contains an invalid option.`,
          q
        );
        valid = false;
        return;
      }

      if (
        typeof q.answer !== "string" ||
        q.answer.trim() === ""
      ) {
        console.error(
          `Question ${index + 1} has no valid answer.`,
          q
        );
        valid = false;
        return;
      }

      const answerNormalized = normalizeText(q.answer);

      const answerExists = q.options.some(
        option => normalizeText(option) === answerNormalized
      );

      if (!answerExists) {
        console.error(
          `Question ${index + 1}: answer "${q.answer}" does not match any option.`,
          q
        );

        valid = false;
      }
    });

    return valid;
  }

  /* =======================================================
     NORMALIZE QUESTIONS
  ======================================================= */

  function normalizeQuestions(data) {
    return data.map((q, index) => {
      const options = q.options
        .map(option => String(option).trim())
        .filter(Boolean);

      const rawAnswer = String(q.answer).trim();

      const matchingAnswer = options.find(
        option =>
          normalizeText(option) === normalizeText(rawAnswer)
      );

      return {
        id:
          q.id ||
          `question-${index}-${normalizeText(q.question)
            .slice(0, 30)
            .replace(/[^a-z0-9]+/g, "-")}`,

        question: String(q.question).trim(),

        question_rw:
          typeof q.question_rw === "string"
            ? q.question_rw.trim()
            : "",

        options: options,

        answer: matchingAnswer || rawAnswer,

        category:
          typeof q.category === "string" &&
          q.category.trim()
            ? q.category.trim()
            : "General Knowledge"
      };
    });
  }

  /* =======================================================
     LOAD QUESTIONS
  ======================================================= */

  async function loadQuestions() {
    try {
      const response = await fetch(
        QUESTIONS_FILE,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `questions.json returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!validateQuestions(data)) {
        throw new Error(
          "questions.json contains one or more invalid questions."
        );
      }

      allQuestions = normalizeQuestions(data);

      console.log(
        `Quiz Master: ${allQuestions.length} questions loaded successfully.`
      );

      hideError();

      initializeAfterQuestionsLoaded();

      return true;
    } catch (error) {
      console.error(
        "Quiz Master question loading error:",
        error
      );

      showError(
        "Quiz questions could not be loaded. Please check that questions.json is available and correctly formatted."
      );

      return false;
    }
  }

  /* =======================================================
     ERROR SCREEN
  ======================================================= */

  function showError(message) {
    const errorScreen = getElement("errorScreen");

    if (!errorScreen) {
      console.error(message);
      return;
    }

    const errorMessage = getElement(
      "errorMessage",
      "quizErrorMessage"
    );

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    hideAllScreens();

    showElement(errorScreen);
  }

  function hideError() {
    const errorScreen = getElement("errorScreen");

    if (errorScreen) {
      hideElement(errorScreen);
    }
  }

  /* =======================================================
     SCREENS
  ======================================================= */

  function hideAllScreens() {
    const screens = [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "errorScreen",
      "settingsScreen"
    ];

    screens.forEach(id => {
      const el = $(id);

      if (el) {
        hideElement(el);
      }
    });
  }

  function showScreen(id) {
    hideAllScreens();

    const screen = $(id);

    if (screen) {
      showElement(screen);
    }
  }

  function showHome() {
    stopTimer();

    quizStarted = false;

    showScreen("homeScreen");

    updateContinueButton();

    updateProgressUI();
  }

  /* =======================================================
     ROUND PROGRESS
  ======================================================= */

  function getUnlockedRounds() {
    let unlocked = getStorageJSON(
      STORAGE.unlockedRounds,
      1
    );

    unlocked = parseInt(unlocked, 10);

    if (!Number.isFinite(unlocked)) {
      unlocked = 1;
    }

    unlocked = Math.max(
      1,
      Math.min(TOTAL_ROUNDS, unlocked)
    );

    return unlocked;
  }

  function setUnlockedRounds(value) {
    value = Math.max(
      1,
      Math.min(TOTAL_ROUNDS, parseInt(value, 10) || 1)
    );

    localStorage.setItem(
      STORAGE.unlockedRounds,
      String(value)
    );
  }

  function getCompletedRounds() {
    return getStorageJSON(
      STORAGE.completedRounds,
      []
    );
  }

  function setCompletedRounds(rounds) {
    setStorageJSON(
      STORAGE.completedRounds,
      rounds
    );
  }

  function markRoundCompleted(round) {
    const completed = getCompletedRounds();

    if (!completed.includes(round)) {
      completed.push(round);
      completed.sort((a, b) => a - b);
      setCompletedRounds(completed);
    }

    if (round < TOTAL_ROUNDS) {
      const unlocked = getUnlockedRounds();

      if (round + 1 > unlocked) {
        setUnlockedRounds(round + 1);
      }
    }
  }

  /* =======================================================
     USED QUESTIONS
  ======================================================= */

  function getUsedQuestions() {
    const used = getStorageJSON(
      STORAGE.usedQuestions,
      []
    );

    return Array.isArray(used) ? used : [];
  }

  function setUsedQuestions(used) {
    setStorageJSON(
      STORAGE.usedQuestions,
      used
    );
  }

  function addUsedQuestions(questions) {
    const used = getUsedQuestions();

    questions.forEach(q => {
      if (!used.includes(q.id)) {
        used.push(q.id);
      }
    });

    setUsedQuestions(used);
  }

  function resetUsedQuestionsIfNecessary() {
    const used = getUsedQuestions();

    if (used.length >= allQuestions.length) {
      setUsedQuestions([]);
    }
  }

  /* =======================================================
     SELECT ROUND QUESTIONS
  ======================================================= */

  function selectQuestionsForRound(round) {
    if (!allQuestions.length) {
      return [];
    }

    resetUsedQuestionsIfNecessary();

    let used = getUsedQuestions();

    let available = allQuestions.filter(
      q => !used.includes(q.id)
    );

    if (available.length < QUESTIONS_PER_ROUND) {
      setUsedQuestions([]);

      used = [];

      available = [...allQuestions];
    }

    let selected = shuffle(available).slice(
      0,
      QUESTIONS_PER_ROUND
    );

    /*
      Safety:
      If there are fewer than 10 unique questions,
      reuse questions rather than breaking the quiz.
    */

    if (selected.length < QUESTIONS_PER_ROUND) {
      const remainingNeeded =
        QUESTIONS_PER_ROUND - selected.length;

      const additional = shuffle(allQuestions).slice(
        0,
        remainingNeeded
      );

      selected = selected.concat(additional);
    }

    addUsedQuestions(selected);

    return selected;
  }

  /* =======================================================
     ROUND GRID
  ======================================================= */

  function renderRounds() {
    const grid = getElement(
      "roundGrid",
      "roundsGrid"
    );

    if (!grid) return;

    grid.innerHTML = "";

    const unlocked = getUnlockedRounds();

    const completed = getCompletedRounds();

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "round-btn";

      if (round > unlocked) {
        button.classList.add("locked");
        button.disabled = true;
      }

      if (completed.includes(round)) {
        button.classList.add("completed");
      }

      button.dataset.round = String(round);

      if (round > unlocked) {
        button.innerHTML = `
          <span>🔒</span>
          <span>Round ${round}</span>
        `;
      } else if (completed.includes(round)) {
        button.innerHTML = `
          <span>⭐</span>
          <span>Round ${round}</span>
        `;
      } else {
        button.innerHTML = `
          <span>🎮</span>
          <span>Round ${round}</span>
        `;
      }

      button.addEventListener("click", function () {
        startRound(round);
      });

      grid.appendChild(button);
    }
  }

  function openRounds() {
    renderRounds();
    showScreen("roundsScreen");
  }

  /* =======================================================
     START QUIZ
  ======================================================= */

  function startQuiz() {
    if (!allQuestions.length) {
      showError(
        "Quiz questions are not loaded yet."
      );

      return;
    }

    const savedRound = parseInt(
      localStorage.getItem(
        STORAGE.currentRound
      ),
      10
    );

    const round =
      Number.isFinite(savedRound) &&
      savedRound >= 1 &&
      savedRound <= TOTAL_ROUNDS
        ? savedRound
        : 1;

    startRound(round);
  }

  function startRound(round) {
    if (!allQuestions.length) {
      showError(
        "Quiz questions are not loaded yet."
      );

      return;
    }

    const unlocked = getUnlockedRounds();

    if (round > unlocked) {
      return;
    }

    currentRound = round;

    currentQuestionIndex = 0;

    score = 0;

    correctAnswers = 0;

    wrongAnswers = 0;

    streak = 0;

    bestStreak = 0;

    quizFinished = false;

    answerSelected = false;

    reviewData = [];

    roundQuestions =
      selectQuestionsForRound(round);

    if (
      !roundQuestions ||
      roundQuestions.length === 0
    ) {
      showError(
        "No quiz questions are available."
      );

      return;
    }

    localStorage.setItem(
      STORAGE.currentRound,
      String(currentRound)
    );

    saveProgress();

    quizStarted = true;

    showScreen("quizScreen");

    renderCurrentQuestion();

    startTimer();

    playBackgroundMusic();

    updateContinueButton();
  }

  /* =======================================================
     CONTINUE QUIZ
  ======================================================= */

  function continueQuiz() {
    const saved = getStorageJSON(
      STORAGE.progress,
      null
    );

    if (
      !saved ||
      !Array.isArray(saved.questions) ||
      saved.questions.length === 0
    ) {
      startQuiz();
      return;
    }

    currentRound = saved.round || 1;

    currentQuestionIndex =
      saved.questionIndex || 0;

    score = saved.score || 0;

    correctAnswers =
      saved.correctAnswers || 0;

    wrongAnswers =
      saved.wrongAnswers || 0;

    streak = saved.streak || 0;

    bestStreak = saved.bestStreak || 0;

    roundQuestions = saved.questions;

    reviewData =
      Array.isArray(saved.reviewData)
        ? saved.reviewData
        : [];

    quizFinished = false;

    answerSelected = false;

    quizStarted = true;

    showScreen("quizScreen");

    renderCurrentQuestion();

    startTimer();

    playBackgroundMusic();
  }

  /* =======================================================
     SAVE PROGRESS
  ======================================================= */

  function saveProgress() {
    if (!roundQuestions.length) return;

    const data = {
      round: currentRound,
      questionIndex: currentQuestionIndex,
      score: score,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers,
      streak: streak,
      bestStreak: bestStreak,
      questions: roundQuestions,
      reviewData: reviewData,
      savedAt: Date.now()
    };

    setStorageJSON(
      STORAGE.progress,
      data
    );
  }

  function clearProgress() {
    localStorage.removeItem(
      STORAGE.progress
    );

    localStorage.removeItem(
      STORAGE.currentRound
    );
  }

  /* =======================================================
     CONTINUE BUTTON
  ======================================================= */

  function updateContinueButton() {
    const button = getElement(
      "continueBtn",
      "continueQuizBtn"
    );

    if (!button) return;

    const progress = getStorageJSON(
      STORAGE.progress,
      null
    );

    const hasProgress =
      progress &&
      Array.isArray(progress.questions) &&
      progress.questions.length > 0;

    if (hasProgress) {
      button.disabled = false;
      button.style.display = "";
    } else {
      button.disabled = true;
      button.style.display = "none";
    }
  }

  /* =======================================================
     RENDER QUESTION
  ======================================================= */

  function renderCurrentQuestion() {
    if (
      currentQuestionIndex < 0 ||
      currentQuestionIndex >= roundQuestions.length
    ) {
      finishRound();
      return;
    }

    const question =
      roundQuestions[currentQuestionIndex];

    if (!question) {
      finishRound();
      return;
    }

    answerSelected = false;

    const questionText = getElement(
      "question",
      "questionText",
      "quizQuestion"
    );

    if (questionText) {
      questionText.textContent =
        question.question;
    }

    const categoryElement = getElement(
      "category",
      "questionCategory",
      "quizCategory"
    );

    if (categoryElement) {
      categoryElement.textContent =
        question.category;
    }

    const questionNumber = getElement(
      "questionNumber",
      "questionCount",
      "currentQuestion"
    );

    if (questionNumber) {
      questionNumber.textContent =
        `Question ${currentQuestionIndex + 1} of ${roundQuestions.length}`;
    }

    const roundLabel = getElement(
      "roundNumber",
      "currentRound",
      "quizRound"
    );

    if (roundLabel) {
      roundLabel.textContent =
        `Round ${currentRound}`;
    }

    const progressBar = getElement(
      "quizProgress",
      "questionProgress",
      "progressBar"
    );

    if (progressBar) {
      const percent =
        ((currentQuestionIndex + 1) /
          roundQuestions.length) *
        100;

      if (
        progressBar.tagName === "PROGRESS"
      ) {
        progressBar.value = percent;
      } else {
        progressBar.style.width =
          `${percent}%`;
      }
    }

    renderOptions(question);

    timeLeft = TIME_PER_QUESTION;

    updateTimerUI();
  }

  /* =======================================================
     RENDER OPTIONS
  ======================================================= */

  function renderOptions(question) {
    const optionsContainer = getElement(
      "options",
      "answerOptions",
      "optionsContainer"
    );

    if (!optionsContainer) {
      console.warn(
        "Quiz Master: options container not found."
      );

      return;
    }

    optionsContainer.innerHTML = "";

    const options = shuffle(
      question.options
    );

    options.forEach((option, index) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className = "option-btn";

      button.dataset.answer = option;

      button.textContent = option;

      button.addEventListener(
        "click",
        function () {
          selectAnswer(
            option,
            button
          );
        }
      );

      optionsContainer.appendChild(button);
    });
  }

  /* =======================================================
     SELECT ANSWER
  ======================================================= */

  function selectAnswer(
    selectedAnswer,
    clickedButton
  ) {
    if (answerSelected) return;

    if (quizFinished) return;

    answerSelected = true;

    stopTimer();

    const question =
      roundQuestions[currentQuestionIndex];

    if (!question) return;

    const correct =
      normalizeText(selectedAnswer) ===
      normalizeText(question.answer);

    const optionsContainer = getElement(
      "options",
      "answerOptions",
      "optionsContainer"
    );

    if (optionsContainer) {
      const buttons =
        optionsContainer.querySelectorAll(
          "button"
        );

      buttons.forEach(button => {
        const buttonAnswer =
          button.dataset.answer || "";

        if (
          normalizeText(buttonAnswer) ===
          normalizeText(question.answer)
        ) {
          button.classList.add(
            "correct"
          );
        }

        if (
          button === clickedButton &&
          !correct
        ) {
          button.classList.add(
            "wrong"
          );
        }

        button.disabled = true;
      });
    }

    let pointsEarned = 0;

    if (correct) {
      correctAnswers++;

      streak++;

      if (streak > bestStreak) {
        bestStreak = streak;
      }

      pointsEarned =
        POINTS_PER_CORRECT;

      /*
        Streak bonus:
        after 3 consecutive correct answers,
        add a small bonus.
      */

      if (streak >= 3) {
        pointsEarned += 5;
      }

      score += pointsEarned;

      playCorrectSound();
    } else {
      wrongAnswers++;

      streak = 0;

      playWrongSound();
    }

    reviewData.push({
      question: question.question,
      question_rw:
        question.question_rw || "",
      selectedAnswer:
        selectedAnswer,
      correctAnswer:
        question.answer,
      correct: correct,
      points: pointsEarned,
      category:
        question.category
    });

    updateScoreUI();

    saveProgress();

    /*
      Short delay so user can see
      correct/wrong answer before
      next question.
    */

    setTimeout(() => {
      if (!quizStarted) return;

      currentQuestionIndex++;

      if (
        currentQuestionIndex >=
        roundQuestions.length
      ) {
        finishRound();
      } else {
        answerSelected = false;

        saveProgress();

        renderCurrentQuestion();

        startTimer();
      }
    }, 700);
  }

  /* =======================================================
     TIMER
  ======================================================= */

  function startTimer() {
    stopTimer();

    timeLeft = TIME_PER_QUESTION;

    updateTimerUI();

    timer = setInterval(() => {
      if (answerSelected) {
        return;
      }

      timeLeft--;

      updateTimerUI();

      if (timeLeft <= 0) {
        stopTimer();

        handleTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function handleTimeUp() {
    if (answerSelected) return;

    answerSelected = true;

    const question =
      roundQuestions[currentQuestionIndex];

    if (!question) {
      finishRound();
      return;
    }

    wrongAnswers++;

    streak = 0;

    const optionsContainer = getElement(
      "options",
      "answerOptions",
      "optionsContainer"
    );

    if (optionsContainer) {
      const buttons =
        optionsContainer.querySelectorAll(
          "button"
        );

      buttons.forEach(button => {
        const buttonAnswer =
          button.dataset.answer || "";

        if (
          normalizeText(buttonAnswer) ===
          normalizeText(question.answer)
        ) {
          button.classList.add(
            "correct"
          );
        }

        button.disabled = true;
      });
    }

    reviewData.push({
      question: question.question,
      question_rw:
        question.question_rw || "",
      selectedAnswer: null,
      correctAnswer:
        question.answer,
      correct: false,
      points: 0,
      category:
        question.category
    });

    playWrongSound();

    saveProgress();

    setTimeout(() => {
      currentQuestionIndex++;

      if (
        currentQuestionIndex >=
        roundQuestions.length
      ) {
        finishRound();
      } else {
        answerSelected = false;

        renderCurrentQuestion();

        startTimer();
      }
    }, 700);
  }

  function updateTimerUI() {
    const timerElement = getElement(
      "timer",
      "timeLeft",
      "questionTimer"
    );

    if (timerElement) {
      timerElement.textContent =
        String(timeLeft);
    }

    const timerBar = getElement(
      "timerBar",
      "timeProgress"
    );

    if (timerBar) {
      const percent =
        (timeLeft /
          TIME_PER_QUESTION) *
        100;

      if (
        timerBar.tagName === "PROGRESS"
      ) {
        timerBar.value = percent;
      } else {
        timerBar.style.width =
          `${percent}%`;
      }
    }
  }

  /* =======================================================
     SCORE UI
  ======================================================= */

  function updateScoreUI() {
    const scoreElement = getElement(
      "score",
      "quizScore",
      "currentScore"
    );

    if (scoreElement) {
      scoreElement.textContent =
        String(score);
    }

    const streakElement = getElement(
      "streak",
      "quizStreak",
      "currentStreak"
    );

    if (streakElement) {
      streakElement.textContent =
        String(streak);
    }
  }

  /* =======================================================
     FINISH ROUND
  ======================================================= */

  function finishRound() {
    stopTimer();

    quizFinished = true;

    quizStarted = false;

    const total =
      roundQuestions.length ||
      QUESTIONS_PER_ROUND;

    const percentage = Math.round(
      (correctAnswers / total) * 100
    );

    const passed =
      percentage >= UNLOCK_PERCENT;

    if (passed) {
      markRoundCompleted(
        currentRound
      );

      saveStars(
        currentRound,
        calculateStars(percentage)
      );

      checkAchievements();

      updateDailyChallenge();
    }

    clearProgress();

    renderResult(
      percentage,
      passed
    );

    showScreen("resultScreen");

    stopBackgroundMusic();
  }

  /* =======================================================
     STARS
  ======================================================= */

  function calculateStars(percentage) {
    if (percentage >= 90) {
      return 3;
    }

    if (percentage >= 75) {
      return 2;
    }

    if (percentage >= UNLOCK_PERCENT) {
      return 1;
    }

    return 0;
  }

  function getStars() {
    return getStorageJSON(
      "quizmasterStars",
      {}
    );
  }

  function saveStars(round, stars) {
    const data = getStars();

    const previous =
      parseInt(data[round] || 0, 10);

    if (stars > previous) {
      data[round] = stars;
    }

    setStorageJSON(
      "quizmasterStars",
      data
    );
  }

  function getTotalStars() {
    const stars = getStars();

    return Object.values(stars).reduce(
      (sum, value) =>
        sum + (parseInt(value, 10) || 0),
      0
    );
  }

  /* =======================================================
     RESULT SCREEN
  ======================================================= */

  function renderResult(
    percentage,
    passed
  ) {
    const scoreElement = getElement(
      "resultScore",
      "finalScore"
    );

    if (scoreElement) {
      scoreElement.textContent =
        String(score);
    }

    const percentageElement =
      getElement(
        "resultPercentage",
        "finalPercentage"
      );

    if (percentageElement) {
      percentageElement.textContent =
        `${percentage}%`;
    }

    const correctElement =
      getElement(
        "correctAnswers",
        "resultCorrect"
      );

    if (correctElement) {
      correctElement.textContent =
        String(correctAnswers);
    }

    const wrongElement =
      getElement(
        "wrongAnswers",
        "resultWrong"
      );

    if (wrongElement) {
      wrongElement.textContent =
        String(wrongAnswers);
    }

    const streakElement =
      getElement(
        "bestStreak",
        "resultStreak"
      );

    if (streakElement) {
      streakElement.textContent =
        String(bestStreak);
    }

    const starsElement =
      getElement(
        "resultStars",
        "stars"
      );

    if (starsElement) {
      const stars =
        calculateStars(percentage);

      starsElement.textContent =
        "⭐".repeat(stars) +
        "☆".repeat(3 - stars);
    }

    const titleElement =
      getElement(
        "resultTitle",
        "resultMessage"
      );

    if (titleElement) {
      if (percentage >= 90) {
        titleElement.textContent =
          "Excellent! 🎉";
      } else if (passed) {
        titleElement.textContent =
          "Round Completed! 🎉";
      } else {
        titleElement.textContent =
          "Keep Practicing! 💪";
      }
    }

    const nextButton =
      getElement(
        "nextRoundBtn",
        "nextBtn"
      );

    if (nextButton) {
      if (
        passed &&
        currentRound < TOTAL_ROUNDS
      ) {
        nextButton.style.display = "";
        nextButton.disabled = false;
      } else {
        nextButton.style.display = "none";
      }
    }
  }

  /* =======================================================
     REVIEW
  ======================================================= */

  function showReview() {
    const container = getElement(
      "reviewContent",
      "reviewList",
      "reviewAnswers"
    );

    if (!container) {
      showScreen("reviewScreen");
      return;
    }

    container.innerHTML = "";

    reviewData.forEach(
      (item, index) => {
        const wrapper =
          document.createElement("div");

        wrapper.className =
          "review-item";

        const status =
          item.correct
            ? "✅"
            : "❌";

        const question =
          document.createElement("div");

        question.className =
          "review-question";

        question.textContent =
          `${status} ${index + 1}. ${item.question}`;

        wrapper.appendChild(question);

        const answer =
          document.createElement("div");

        answer.className =
          "review-answer";

        if (item.correct) {
          answer.textContent =
            `Your answer: ${item.selectedAnswer}`;
        } else {
          answer.textContent =
            `Correct answer: ${item.correctAnswer}`;
        }

        wrapper.appendChild(answer);

        if (
          item.selectedAnswer &&
          !item.correct
        ) {
          const yourAnswer =
            document.createElement("div");

          yourAnswer.textContent =
            `Your answer: ${item.selectedAnswer}`;

          wrapper.appendChild(
            yourAnswer
          );
        }

        container.appendChild(
          wrapper
        );
      }
    );

    showScreen("reviewScreen");
  }

  /* =======================================================
     RETRY ROUND
  ======================================================= */

  function retryRound() {
    startRound(currentRound);
  }

  /* =======================================================
     NEXT ROUND
  ======================================================= */

  function nextRound() {
    const next =
      currentRound + 1;

    if (next > TOTAL_ROUNDS) {
      showHome();
      return;
    }

    if (next > getUnlockedRounds()) {
      openRounds();
      return;
    }

    startRound(next);
  }

  /* =======================================================
     ACHIEVEMENTS
  ======================================================= */

  function getAchievements() {
    return getStorageJSON(
      STORAGE.achievements,
      []
    );
  }

  function unlockAchievement(name) {
    const achievements =
      getAchievements();

    if (!achievements.includes(name)) {
      achievements.push(name);

      setStorageJSON(
        STORAGE.achievements,
        achievements
      );

      console.log(
        `Achievement unlocked: ${name}`
      );
    }
  }

  function checkAchievements() {
    const completed =
      getCompletedRounds();

    if (completed.length >= 1) {
      unlockAchievement(
        "First Round"
      );
    }

    if (completed.length >= 5) {
      unlockAchievement(
        "Five Rounds"
      );
    }

    if (completed.length >= 10) {
      unlockAchievement(
        "Quiz Master"
      );
    }

    if (bestStreak >= 3) {
      unlockAchievement(
        "Streak Master"
      );
    }

    if (getTotalStars() >= 10) {
      unlockAchievement(
        "Star Collector"
      );
    }
  }

  /* =======================================================
     DAILY CHALLENGE
  ======================================================= */

  function getTodayKey() {
    const date = new Date();

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

    const daily =
      getStorageJSON(
        STORAGE.daily,
        {}
      );

    daily[today] = true;

    setStorageJSON(
      STORAGE.daily,
      daily
    );
  }

  function hasCompletedDailyChallenge() {
    const daily =
      getStorageJSON(
        STORAGE.daily,
        {}
      );

    return Boolean(
      daily[getTodayKey()]
    );
  }

  function startDailyChallenge() {
    if (!allQuestions.length) {
      return;
    }

    const selected =
      shuffle(allQuestions).slice(
        0,
        Math.min(
          QUESTIONS_PER_ROUND,
          allQuestions.length
        )
      );

    currentRound = 1;

    currentQuestionIndex = 0;

    score = 0;

    correctAnswers = 0;

    wrongAnswers = 0;

    streak = 0;

    bestStreak = 0;

    reviewData = [];

    roundQuestions = selected;

    quizFinished = false;

    answerSelected = false;

    quizStarted = true;

    showScreen("quizScreen");

    renderCurrentQuestion();

    startTimer();

    playBackgroundMusic();
  }

  /* =======================================================
     MUSIC
  ======================================================= */

  function loadSettings() {
    const music =
      localStorage.getItem(
        STORAGE.music
      );

    const sound =
      localStorage.getItem(
        STORAGE.sound
      );

    musicEnabled =
      music === null
        ? true
        : music === "true";

    soundEnabled =
      sound === null
        ? true
        : sound === "true";

    updateSettingsUI();
  }

  function saveSettings() {
    localStorage.setItem(
      STORAGE.music,
      String(musicEnabled)
    );

    localStorage.setItem(
      STORAGE.sound,
      String(soundEnabled)
    );
  }

  function updateSettingsUI() {
    const musicToggle =
      getElement(
        "musicToggle",
        "musicSwitch"
      );

    if (musicToggle) {
      if (
        musicToggle.type ===
        "checkbox"
      ) {
        musicToggle.checked =
          musicEnabled;
      }
    }

    const soundToggle =
      getElement(
        "soundToggle",
        "soundSwitch"
      );

    if (soundToggle) {
      if (
        soundToggle.type ===
        "checkbox"
      ) {
        soundToggle.checked =
          soundEnabled;
      }
    }
  }

  function initBackgroundMusic() {
    if (backgroundMusic) {
      return;
    }

    backgroundMusic =
      document.createElement("audio");

    backgroundMusic.src =
      "./music.mp3";

    backgroundMusic.loop = true;

    backgroundMusic.preload = "auto";

    backgroundMusic.volume = 0.25;

    /*
      Do not add the audio element visibly.
    */

    backgroundMusic.style.display =
      "none";

    document.body.appendChild(
      backgroundMusic
    );
  }

  function playBackgroundMusic() {
    if (!musicEnabled) {
      return;
    }

    initBackgroundMusic();

    if (!backgroundMusic) {
      return;
    }

    const promise =
      backgroundMusic.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(() => {
        /*
          Browser may block autoplay.
          Music will start after a user
          interaction.
        */
      });
    }
  }

  function stopBackgroundMusic() {
    if (!backgroundMusic) {
      return;
    }

    backgroundMusic.pause();

    try {
      backgroundMusic.currentTime = 0;
    } catch (e) {}
  }

  /* =======================================================
     SOUND EFFECTS
  ======================================================= */

  function playTone(
    frequency,
    duration
  ) {
    if (!soundEnabled) return;

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return;

      const context =
        new AudioContext();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.frequency.value =
        frequency;

      oscillator.type = "sine";

      gain.gain.value = 0.04;

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
          try {
            context.close();
          } catch (e) {}
        }
      );
    } catch (error) {
      console.warn(
        "Sound effect unavailable."
      );
    }
  }

  function playCorrectSound() {
    playTone(700, 0.12);
  }

  function playWrongSound() {
    playTone(250, 0.15);
  }

  /* =======================================================
     SETTINGS SCREEN
  ======================================================= */

  function openSettings() {
    loadSettings();

    showScreen(
      "settingsScreen"
    );
  }

  /* =======================================================
     SHARE
  ======================================================= */

  async function shareQuizMaster() {
    const shareUrl =
      "https://quizmaster-liard-five.vercel.app/";

    const shareData = {
      title:
        "Quiz Master 🇷🇼",
      text:
        "Test your knowledge with Quiz Master!",
      url: shareUrl
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
        shareUrl
      );

      showTemporaryMessage(
        "✅ Link Copied!"
      );
    } catch (error) {
      showTemporaryMessage(
        shareUrl
      );
    }
  }

  function showTemporaryMessage(
    message
  ) {
    const existing =
      document.getElementById(
        "quizMasterTemporaryMessage"
      );

    if (existing) {
      existing.remove();
    }

    const messageElement =
      document.createElement(
        "div"
      );

    messageElement.id =
      "quizMasterTemporaryMessage";

    messageElement.textContent =
      message;

    messageElement.style.position =
      "fixed";

    messageElement.style.left =
      "50%";

    messageElement.style.bottom =
      "25px";

    messageElement.style.transform =
      "translateX(-50%)";

    messageElement.style.zIndex =
      "99999";

    messageElement.style.padding =
      "10px 16px";

    messageElement.style.borderRadius =
      "10px";

    messageElement.style.background =
      "rgba(0,0,0,0.85)";

    messageElement.style.color =
      "#fff";

    document.body.appendChild(
      messageElement
    );

    setTimeout(() => {
      messageElement.remove();
    }, 1800);
  }

  /* =======================================================
     BUTTON EVENTS
  ======================================================= */

  function bindClick(
    ids,
    handler
  ) {
    ids.forEach(id => {
      const el = $(id);

      if (!el) return;

      el.addEventListener(
        "click",
        handler
      );
    });
  }

  function initializeEvents() {
    /*
      HOME
    */

    bindClick(
      [
        "startBtn",
        "startQuizBtn"
      ],
      startQuiz
    );

    bindClick(
      [
        "continueBtn",
        "continueQuizBtn"
      ],
      continueQuiz
    );

    bindClick(
      [
        "roundsBtn",
        "quizRoundsBtn",
        "viewRoundsBtn"
      ],
      openRounds
    );

    bindClick(
      [
        "settingsBtn"
      ],
      openSettings
    );

    bindClick(
      [
        "shareBtn",
        "shareQuizBtn"
      ],
      shareQuizMaster
    );

    /*
      ROUNDS
    */

    bindClick(
      [
        "roundsBackBtn",
        "backFromRoundsBtn"
      ],
      showHome
    );

    /*
      RESULT
    */

    bindClick(
      [
        "retryBtn",
        "retryRoundBtn"
      ],
      retryRound
    );

    bindClick(
      [
        "nextRoundBtn",
        "nextBtn"
      ],
      nextRound
    );

    bindClick(
      [
        "reviewBtn",
        "reviewAnswersBtn"
      ],
      showReview
    );

    bindClick(
      [
        "resultHomeBtn",
        "homeBtn",
        "backHomeBtn"
      ],
      showHome
    );

    /*
      REVIEW
    */

    bindClick(
      [
        "reviewBackBtn",
        "backFromReviewBtn"
      ],
      () =>
        showScreen("resultScreen")
    );

    /*
      ERROR
    */

    bindClick(
      [
        "retryLoadBtn",
        "retryQuestionsBtn",
        "errorRetryBtn"
      ],
      loadQuestions
    );

    bindClick(
      [
        "errorHomeBtn"
      ],
      showHome
    );

    /*
      SETTINGS
    */

    bindClick(
      [
        "settingsBackBtn",
        "backFromSettingsBtn"
      ],
      showHome
    );

    /*
      SHARE
    */

    bindClick(
      [
        "shareBtn",
        "shareQuizBtn"
      ],
      shareQuizMaster
    );

    /*
      MUSIC
    */

    const musicToggle =
      getElement(
        "musicToggle",
        "musicSwitch"
      );

    if (musicToggle) {
      musicToggle.addEventListener(
        "change",
        function () {
          musicEnabled =
            Boolean(
              musicToggle.checked
            );

          saveSettings();

          if (
            musicEnabled
          ) {
            playBackgroundMusic();
          } else {
            stopBackgroundMusic();
          }
        }
      );
    }

    /*
      SOUND
    */

    const soundToggle =
      getElement(
        "soundToggle",
        "soundSwitch"
      );

    if (soundToggle) {
      soundToggle.addEventListener(
        "change",
        function () {
          soundEnabled =
            Boolean(
              soundToggle.checked
            );

          saveSettings();

          if (soundEnabled) {
            playCorrectSound();
          }
        }
      );
    }

    /*
      DAILY CHALLENGE
    */

    bindClick(
      [
        "dailyChallengeBtn",
        "dailyBtn"
      ],
      startDailyChallenge
    );
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initializeAfterQuestionsLoaded() {
    loadSettings();

    renderRounds();

    updateContinueButton();

    updateProgressUI();
  }

  function updateProgressUI() {
    const completed =
      getCompletedRounds();

    const unlocked =
      getUnlockedRounds();

    const completedElement =
      getElement(
        "completedRounds",
        "progressCompleted"
      );

    if (completedElement) {
      completedElement.textContent =
        String(
          completed.length
        );
    }

    const unlockedElement =
      getElement(
        "unlockedRounds",
        "progressUnlocked"
      );

    if (unlockedElement) {
      unlockedElement.textContent =
        String(unlocked);
    }

    const starsElement =
      getElement(
        "totalStars",
        "starsCount"
      );

    if (starsElement) {
      starsElement.textContent =
        String(getTotalStars());
    }
  }

  function initialize() {
    if (
      window.quizMasterInitialized
    ) {
      return;
    }

    window.quizMasterInitialized =
      true;

    console.log(
      "Quiz Master 🇷🇼 initializing..."
    );

    loadSettings();

    initBackgroundMusic();

    initializeEvents();

    updateContinueButton();

    loadQuestions();
  }

  /* =======================================================
     PUBLIC FUNCTIONS
     ======================================================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.startRound =
    startRound;

  window.openRounds =
    openRounds;

  window.retryRound =
    retryRound;

  window.nextRound =
    nextRound;

  window.showReview =
    showReview;

  window.showHome =
    showHome;

  window.openSettings =
    openSettings;

  window.shareQuizMaster =
    shareQuizMaster;

  window.startDailyChallenge =
    startDailyChallenge;

  window.loadQuizQuestions =
    loadQuestions;

  /* =======================================================
     START
  ======================================================= */

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
