/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   ---------------------------------------------------------
   SAFE COMPLETE VERSION
   ---------------------------------------------------------
   Features:
   - Start Quiz
   - Continue Quiz
   - Quiz Rounds
   - 10 rounds
   - 10 questions per round
   - 20 seconds per question
   - Score
   - Unlock rounds
   - Retry Round
   - Review Answers
   - Next Question
   - Settings
   - Music
   - Sound effects
   - Share
   - Daily Challenge
   - Achievements
   - Progress saving
   - Safe questions.json loading
   - Works with existing HTML
   - Does NOT change design
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 10;
  const UNLOCK_PERCENT = 60;
  const QUESTIONS_FILE = "./questions.json";

  /* =========================================================
     STORAGE
     ========================================================= */

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

  /* =========================================================
     STATE
     ========================================================= */

  let allQuestions = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let roundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let streak = 0;
  let bestStreak = 0;

  let timeLeft = TIME_PER_QUESTION;
  let timer = null;

  let quizStarted = false;
  let quizFinished = false;
  let answerSelected = false;

  let reviewData = [];

  let musicEnabled = true;
  let soundEnabled = true;

  let backgroundMusic = null;

  let questionsLoaded = false;
  let initializing = false;

  /* =========================================================
     DOM HELPERS
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function getElement() {
    const ids = Array.from(arguments);

    for (let i = 0; i < ids.length; i++) {
      const el = $(ids[i]);

      if (el) {
        return el;
      }
    }

    return null;
  }

  function showElement(el) {
    if (!el) return;

    el.hidden = false;
    el.style.display = "";
  }

  function hideElement(el) {
    if (!el) return;

    el.hidden = true;
    el.style.display = "none";
  }

  function setText(ids, value) {
    const list = Array.isArray(ids) ? ids : [ids];

    list.forEach(function (id) {
      const el = $(id);

      if (el) {
        el.textContent = value;
      }
    });
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  /* =========================================================
     STORAGE HELPERS
     ========================================================= */

  function storageGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Quiz Master storage error:", error);
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Quiz Master storage error:", error);
    }
  }

  function saveJSON(key, value) {
    try {
      storageSet(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save:", key, error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const raw = storageGet(key, "");

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  /* =========================================================
     ARRAY HELPERS
     ========================================================= */

  function shuffle(array) {
    const result = Array.isArray(array) ? array.slice() : [];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }

    return result;
  }

  /* =========================================================
     SCREEN MANAGEMENT
     ========================================================= */

  function getScreens() {
    return [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "settingsScreen",
      "errorScreen"
    ];
  }

  function showScreen(screenId) {
    const screens = getScreens();

    screens.forEach(function (id) {
      const screen = $(id);

      if (!screen) return;

      if (id === screenId) {
        showElement(screen);
      } else {
        hideElement(screen);
      }
    });

    try {
      window.scrollTo(0, 0);
    } catch (error) {}
  }

  /* =========================================================
     QUESTION VALIDATION
     ========================================================= */

  function isValidQuestion(question) {
    if (!question || typeof question !== "object") {
      return false;
    }

    if (typeof question.question !== "string") {
      return false;
    }

    if (!Array.isArray(question.options)) {
      return false;
    }

    if (question.options.length < 2) {
      return false;
    }

    if (
      question.answer === undefined ||
      question.answer === null
    ) {
      return false;
    }

    return true;
  }

  function normalizeQuestion(question, index) {
    if (!isValidQuestion(question)) {
      return null;
    }

    const options = question.options
      .map(function (option) {
        return String(option).trim();
      })
      .filter(function (option) {
        return option.length > 0;
      });

    if (options.length < 2) {
      return null;
    }

    let answer = question.answer;

    /* Numeric answer index */
    if (typeof answer === "number") {
      if (
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer < options.length
      ) {
        answer = options[answer];
      }
    }

    answer = String(answer).trim();

    /* Match answer with option */
    const matchingOption = options.find(function (option) {
      return normalizeText(option) === normalizeText(answer);
    });

    if (matchingOption) {
      answer = matchingOption;
    }

    /* Numeric answer stored as string */
    if (
      !options.some(function (option) {
        return normalizeText(option) === normalizeText(answer);
      })
    ) {
      const possibleIndex = Number(answer);

      if (
        Number.isInteger(possibleIndex) &&
        possibleIndex >= 0 &&
        possibleIndex < options.length
      ) {
        answer = options[possibleIndex];
      }
    }

    const answerExists = options.some(function (option) {
      return normalizeText(option) === normalizeText(answer);
    });

    if (!answerExists) {
      return null;
    }

    return {
      id:
        question.id ||
        "question-" + index,

      question:
        String(question.question).trim(),

      question_rw:
        typeof question.question_rw === "string"
          ? question.question_rw.trim()
          : "",

      options: options,

      answer: answer,

      category:
        typeof question.category === "string" &&
        question.category.trim()
          ? question.category.trim()
          : "General Knowledge"
    };
  }

  function normalizeQuestions(data) {
    let source = data;

    if (
      source &&
      !Array.isArray(source) &&
      Array.isArray(source.questions)
    ) {
      source = source.questions;
    }

    if (!Array.isArray(source)) {
      throw new Error(
        "questions.json must contain an array of questions."
      );
    }

    const normalized = [];

    source.forEach(function (question, index) {
      const clean = normalizeQuestion(question, index);

      if (clean) {
        normalized.push(clean);
      }
    });

    if (!normalized.length) {
      throw new Error(
        "No valid questions were found in questions.json."
      );
    }

    return normalized;
  }

  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {
    if (questionsLoaded && allQuestions.length) {
      return allQuestions;
    }

    if (initializing) {
      return allQuestions;
    }

    initializing = true;

    try {
      const response = await fetch(
        QUESTIONS_FILE,
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

      const data = await response.json();

      allQuestions = normalizeQuestions(data);

      questionsLoaded = true;

      console.log(
        "Quiz Master: loaded " +
          allQuestions.length +
          " questions."
      );

      return allQuestions;
    } catch (error) {
      console.error(
        "Quiz Master questions error:",
        error
      );

      showError(
        "Quiz questions could not be loaded. Please check questions.json and try again."
      );

      throw error;
    } finally {
      initializing = false;
    }
  }

  /* =========================================================
     ERROR SCREEN
     ========================================================= */

  function showError(message) {
    stopTimer();

    const errorMessage = getElement(
      "errorMessage",
      "errorText"
    );

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    showScreen("errorScreen");
  }

  /* =========================================================
     ROUND SYSTEM
     ========================================================= */

  function getUnlockedRounds() {
    let unlocked = Number(
      storageGet(
        STORAGE.unlockedRounds,
        "1"
      )
    );

    if (!Number.isFinite(unlocked)) {
      unlocked = 1;
    }

    return Math.max(
      1,
      Math.min(
        TOTAL_ROUNDS,
        Math.floor(unlocked)
      )
    );
  }

  function setUnlockedRounds(value) {
    const number = Number(value);

    const safe = Math.max(
      1,
      Math.min(
        TOTAL_ROUNDS,
        Number.isFinite(number)
          ? Math.floor(number)
          : 1
      )
    );

    storageSet(
      STORAGE.unlockedRounds,
      String(safe)
    );
  }

  function getCompletedRounds() {
    const value = readJSON(
      STORAGE.completedRounds,
      []
    );

    return Array.isArray(value)
      ? value
      : [];
  }

  function setCompletedRounds(rounds) {
    const clean = Array.from(
      new Set(
        rounds
          .map(Number)
          .filter(function (round) {
            return (
              Number.isInteger(round) &&
              round >= 1 &&
              round <= TOTAL_ROUNDS
            );
          })
      )
    ).sort(function (a, b) {
      return a - b;
    });

    saveJSON(
      STORAGE.completedRounds,
      clean
    );
  }

  function markRoundCompleted(round) {
    const completed = getCompletedRounds();

    if (!completed.includes(round)) {
      completed.push(round);
    }

    setCompletedRounds(completed);

    if (round < TOTAL_ROUNDS) {
      setUnlockedRounds(
        Math.max(
          getUnlockedRounds(),
          round + 1
        )
      );
    }
  }

  function getRoundPercentage(correct) {
    return Math.round(
      (correct / QUESTIONS_PER_ROUND) *
        100
    );
  }

  /* =========================================================
     USED QUESTIONS
     ========================================================= */

  function getUsedQuestions() {
    const value = readJSON(
      STORAGE.usedQuestions,
      []
    );

    return Array.isArray(value)
      ? value
      : [];
  }

  function saveUsedQuestions(used) {
    saveJSON(
      STORAGE.usedQuestions,
      used
    );
  }

  function questionIdentity(question) {
    if (!question) {
      return "";
    }

    return (
      question.id ||
      normalizeText(question.question)
    );
  }

  function addUsedQuestions(questions) {
    const used = getUsedQuestions();

    questions.forEach(function (question) {
      const id = questionIdentity(question);

      if (id && !used.includes(id)) {
        used.push(id);
      }
    });

    /*
      Reset when the question pool has
      effectively been completed.
    */

    if (
      allQuestions.length > 0 &&
      used.length >= allQuestions.length
    ) {
      saveUsedQuestions([]);
    } else {
      saveUsedQuestions(used);
    }
  }

  /* =========================================================
     SELECT ROUND QUESTIONS
     ========================================================= */

  function selectQuestionsForRound(round) {
    if (!allQuestions.length) {
      return [];
    }

    let used = getUsedQuestions();

    let available = allQuestions.filter(
      function (question) {
        return !used.includes(
          questionIdentity(question)
        );
      }
    );

    /*
      If not enough unused questions remain,
      start a new cycle.
    */

    if (
      available.length <
      QUESTIONS_PER_ROUND
    ) {
      used = [];
      saveUsedQuestions([]);

      available = allQuestions.slice();
    }

    /*
      Shuffle questions.
    */

    available = shuffle(available);

    /*
      Prefer category distribution when possible,
      but never break the round.
    */

    let selected = available.slice(
      0,
      QUESTIONS_PER_ROUND
    );

    /*
      If the JSON has fewer than 10 questions,
      use all available questions instead of crashing.
    */

    if (!selected.length) {
      return [];
    }

    return selected;
  }

  /* =========================================================
     PROGRESS
     ========================================================= */

  function saveProgress() {
    saveJSON(
      STORAGE.progress,
      {
        round: currentRound,
        questionIndex:
          currentQuestionIndex,
        score: score,
        correctAnswers:
          correctAnswers,
        wrongAnswers:
          wrongAnswers,
        streak: streak,
        bestStreak:
          bestStreak,
        roundQuestions:
          roundQuestions,
        reviewData:
          reviewData,
        quizStarted:
          quizStarted
      }
    );

    storageSet(
      STORAGE.currentRound,
      String(currentRound)
    );

    storageSet(
      STORAGE.selectedRound,
      String(currentRound)
    );
  }

  function getSavedProgress() {
    const progress = readJSON(
      STORAGE.progress,
      null
    );

    if (
      !progress ||
      typeof progress !== "object"
    ) {
      return null;
    }

    return progress;
  }

  function hasSavedProgress() {
    const progress =
      getSavedProgress();

    return !!(
      progress &&
      Array.isArray(
        progress.roundQuestions
      ) &&
      progress.roundQuestions.length &&
      progress.quizStarted
    );
  }

  /* =========================================================
     UPDATE CONTINUE BUTTON
     ========================================================= */

  function updateContinueButton() {
    const buttons = [
      getElement("continueBtn"),
      getElement("continueQuizBtn"),
      getElement("resumeBtn")
    ];

    const available =
      hasSavedProgress();

    buttons.forEach(function (button) {
      if (!button) return;

      if (available) {
        button.disabled = false;
        button.style.opacity = "";
      } else {
        /*
          Keep the button visible because
          the HTML may already style it.
        */

        button.disabled = true;
        button.style.opacity = "0.6";
      }
    });
  }

  /* =========================================================
     START QUIZ
     ========================================================= */

  async function startQuiz(round) {
    try {
      await loadQuestions();

      let selectedRound =
        Number(round);

      if (
        !Number.isInteger(
          selectedRound
        )
      ) {
        selectedRound = Number(
          storageGet(
            STORAGE.selectedRound,
            "1"
          )
        );
      }

      if (
        !Number.isInteger(
          selectedRound
        )
      ) {
        selectedRound = 1;
      }

      if (
        selectedRound < 1 ||
        selectedRound > TOTAL_ROUNDS
      ) {
        selectedRound = 1;
      }

      if (
        selectedRound >
        getUnlockedRounds()
      ) {
        return;
      }

      currentRound =
        selectedRound;

      currentQuestionIndex = 0;

      score = 0;
      correctAnswers = 0;
      wrongAnswers = 0;

      streak = 0;
      bestStreak = 0;

      reviewData = [];

      quizFinished = false;
      answerSelected = false;
      quizStarted = true;

      roundQuestions =
        selectQuestionsForRound(
          currentRound
        );

      if (!roundQuestions.length) {
        throw new Error(
          "No questions available."
        );
      }

      /*
        Save the selected questions so
        Continue Quiz can resume them.
      */

      saveProgress();

      showScreen("quizScreen");

      renderQuestion();

      startMusic();

    } catch (error) {
      console.error(
        "startQuiz error:",
        error
      );

      if (
        !questionsLoaded
      ) {
        showError(
          "Quiz could not start. Please check your questions.json file."
        );
      }
    }
  }

  /* =========================================================
     CONTINUE QUIZ
     ========================================================= */

  async function continueQuiz() {
    try {
      await loadQuestions();

      const progress =
        getSavedProgress();

      if (
        !progress ||
        !Array.isArray(
          progress.roundQuestions
        ) ||
        !progress.roundQuestions.length
      ) {
        startQuiz(1);
        return;
      }

      currentRound =
        Number(
          progress.round || 1
        );

      currentQuestionIndex =
        Number(
          progress.questionIndex || 0
        );

      score =
        Number(
          progress.score || 0
        );

      correctAnswers =
        Number(
          progress.correctAnswers || 0
        );

      wrongAnswers =
        Number(
          progress.wrongAnswers || 0
        );

      streak =
        Number(
          progress.streak || 0
        );

      bestStreak =
        Number(
          progress.bestStreak || 0
        );

      roundQuestions =
        progress.roundQuestions;

      reviewData =
        Array.isArray(
          progress.reviewData
        )
          ? progress.reviewData
          : [];

      quizStarted = true;
      quizFinished = false;
      answerSelected = false;

      if (
        currentQuestionIndex >=
        roundQuestions.length
      ) {
        currentQuestionIndex = 0;
      }

      showScreen("quizScreen");

      renderQuestion();

      startMusic();

    } catch (error) {
      console.error(
        "continueQuiz error:",
        error
      );

      showError(
        "Could not continue the saved quiz."
      );
    }
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderQuestion() {
    stopTimer();

    answerSelected = false;

    const question =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      finishRound();
      return;
    }

    /* Question text */

    setText(
      [
        "questionText",
        "question",
        "quizQuestion",
        "questionTitle"
      ],
      question.question
    );

    /* Optional Kinyarwanda text */

    const rw = getElement(
      "questionRW",
      "questionRw",
      "question_rw"
    );

    if (rw) {
      if (question.question_rw) {
        rw.textContent =
          question.question_rw;

        showElement(rw);
      } else {
        hideElement(rw);
      }
    }

    /* Category */

    setText(
      [
        "category",
        "questionCategory",
        "categoryText"
      ],
      question.category
    );

    /* Question number */

    const questionNumber =
      currentQuestionIndex + 1;

    setText(
      [
        "questionNumber",
        "questionCount",
        "currentQuestion",
        "progressText"
      ],
      "Question " +
        questionNumber +
        " / " +
        roundQuestions.length
    );

    /* Round */

    setText(
      [
        "roundNumber",
        "currentRound",
        "roundTitle"
      ],
      "Round " +
        currentRound
    );

    /* Score */

    updateScoreDisplay();

    /* Progress */

    updateProgressDisplay();

    /* Options */

    renderOptions(
      question
    );

    /* Timer */

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    startTimer();

    saveProgress();
  }

  /* =========================================================
     RENDER OPTIONS
     ========================================================= */

  function renderOptions(question) {
    const container =
      getElement(
        "options",
        "answerOptions",
        "optionsContainer",
        "answers"
      );

    if (!container) {
      console.warn(
        "Quiz Master: options container not found."
      );

      return;
    }

    container.innerHTML = "";

    const options =
      shuffle(question.options);

    options.forEach(
      function (option, index) {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "quiz-option";

        button.textContent =
          option;

        button.dataset.answer =
          option;

        button.dataset.index =
          String(index);

        button.addEventListener(
          "click",
          function () {
            handleAnswer(
              option,
              button
            );
          }
        );

        container.appendChild(
          button
        );
      }
    );
  }

  /* =========================================================
     ANSWER HANDLER
     ========================================================= */

  function handleAnswer(
    selectedAnswer,
    clickedButton
  ) {
    if (
      answerSelected ||
      quizFinished
    ) {
      return;
    }

    answerSelected = true;

    stopTimer();

    const question =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    const isCorrect =
      normalizeText(
        selectedAnswer
      ) ===
      normalizeText(
        question.answer
      );

    if (isCorrect) {
      correctAnswers++;

      streak++;

      if (
        streak >
        bestStreak
      ) {
        bestStreak =
          streak;
      }

      score +=
        POINTS_PER_CORRECT;

      /*
        Small streak bonus after
        3 consecutive correct answers.
      */

      if (
        streak >= 3
      ) {
        score += 5;
      }
    } else {
      wrongAnswers++;
      streak = 0;
    }

    reviewData.push({
      question:
        question.question,

      question_rw:
        question.question_rw,

      options:
        question.options.slice(),

      correctAnswer:
        question.answer,

      selectedAnswer:
        selectedAnswer,

      isCorrect:
        isCorrect,

      category:
        question.category
    });

    markAnswerButtons(
      question.answer,
      selectedAnswer
    );

    playAnswerSound(
      isCorrect
    );

    saveProgress();

    updateScoreDisplay();

    updateProgressDisplay();

    /*
      Automatically move to next question
      after a short delay.
    */

    setTimeout(
      function () {
        if (!quizFinished) {
          nextQuestion();
        }
      },
      650
    );
  }

  /* =========================================================
     MARK ANSWERS
     ========================================================= */

  function markAnswerButtons(
    correctAnswer,
    selectedAnswer
  ) {
    const container =
      getElement(
        "options",
        "answerOptions",
        "optionsContainer",
        "answers"
      );

    if (!container) {
      return;
    }

    const buttons =
      container.querySelectorAll(
        "button"
      );

    buttons.forEach(
      function (button) {
        const value =
          button.dataset.answer ||
          button.textContent;

        if (
          normalizeText(value) ===
          normalizeText(correctAnswer)
        ) {
          button.classList.add(
            "correct"
          );

          button.dataset.correct =
            "true";
        }

        if (
          normalizeText(value) ===
          normalizeText(selectedAnswer) &&
          normalizeText(value) !==
            normalizeText(correctAnswer)
        ) {
          button.classList.add(
            "wrong"
          );
        }

        button.disabled = true;
      }
    );
  }

  /* =========================================================
     NEXT QUESTION
     ========================================================= */

  function nextQuestion() {
    if (
      !quizStarted ||
      quizFinished
    ) {
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

    answerSelected = false;

    saveProgress();

    renderQuestion();
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function startTimer() {
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    timer =
      setInterval(
        function () {
          if (
            answerSelected ||
            quizFinished
          ) {
            stopTimer();
            return;
          }

          timeLeft--;

          updateTimerDisplay();

          if (
            timeLeft <= 0
          ) {
            stopTimer();

            handleTimeUp();
          }
        },
        1000
      );
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function handleTimeUp() {
    if (
      answerSelected ||
      quizFinished
    ) {
      return;
    }

    answerSelected = true;

    wrongAnswers++;

    streak = 0;

    const question =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      nextQuestion();
      return;
    }

    reviewData.push({
      question:
        question.question,

      question_rw:
        question.question_rw,

      options:
        question.options.slice(),

      correctAnswer:
        question.answer,

      selectedAnswer:
        null,

      isCorrect:
        false,

      timedOut:
        true,

      category:
        question.category
    });

    markAnswerButtons(
      question.answer,
      ""
    );

    playAnswerSound(false);

    saveProgress();

    setTimeout(
      function () {
        nextQuestion();
      },
      650
    );
  }

  function updateTimerDisplay() {
    setText(
      [
        "timer",
        "timerText",
        "timeLeft",
        "countdown"
      ],
      String(timeLeft)
    );
  }

  /* =========================================================
     SCORE DISPLAY
     ========================================================= */

  function updateScoreDisplay() {
    setText(
      [
        "score",
        "scoreText",
        "currentScore"
      ],
      String(score)
    );

    setText(
      [
        "correctAnswers",
        "correctCount"
      ],
      String(correctAnswers)
    );

    setText(
      [
        "wrongAnswers",
        "wrongCount"
      ],
      String(wrongAnswers)
    );

    setText(
      [
        "streak",
        "streakCount"
      ],
      String(streak)
    );
  }

  function updateProgressDisplay() {
    const total =
      roundQuestions.length ||
      QUESTIONS_PER_ROUND;

    const current =
      Math.min(
        currentQuestionIndex + 1,
        total
      );

    const percent =
      Math.round(
        (current / total) * 100
      );

    const bars = [
      getElement(
        "progressBar"
      ),
      getElement(
        "quizProgress"
      )
    ];

    bars.forEach(
      function (bar) {
        if (!bar) return;

        if (
          bar.tagName === "PROGRESS"
        ) {
          bar.value = percent;
        } else {
          bar.style.width =
            percent + "%";
        }
      }
    );
  }

  /* =========================================================
     FINISH ROUND
     ========================================================= */

  function finishRound() {
    stopTimer();

    quizFinished = true;
    quizStarted = false;

    const percentage =
      getRoundPercentage(
        correctAnswers
      );

    const passed =
      percentage >=
      UNLOCK_PERCENT;

    /*
      Mark completed when the player
      finishes the round.
    */

    if (passed) {
      markRoundCompleted(
        currentRound
      );
    }

    /*
      Save questions as used.
    */

    addUsedQuestions(
      roundQuestions
    );

    /*
      Save achievement data.
    */

    updateAchievements();

    /*
      Save result.
    */

    saveJSON(
      STORAGE.progress,
      {
        round:
          currentRound,

        score:
          score,

        correctAnswers:
          correctAnswers,

        wrongAnswers:
          wrongAnswers,

        percentage:
          percentage,

        completed:
          true
      }
    );

    renderResult(
      percentage,
      passed
    );

    showScreen(
      "resultScreen"
    );
  }

  /* =========================================================
     RESULT SCREEN
     ========================================================= */

  function renderResult(
    percentage,
    passed
  ) {
    setText(
      [
        "resultScore",
        "finalScore",
        "scoreResult"
      ],
      String(score)
    );

    setText(
      [
        "resultCorrect",
        "finalCorrect",
        "correctResult"
      ],
      String(correctAnswers)
    );

    setText(
      [
        "resultWrong",
        "finalWrong",
        "wrongResult"
      ],
      String(wrongAnswers)
    );

    setText(
      [
        "resultPercentage",
        "percentage",
        "finalPercentage"
      ],
      percentage + "%"
    );

    setText(
      [
        "resultMessage",
        "resultText"
      ],
      passed
        ? "Round completed!"
        : "Round completed. Keep practicing!"
    );
  }

  /* =========================================================
     RETRY ROUND
     ========================================================= */

  async function retryRound() {
    stopTimer();

    quizFinished = false;

    await startQuiz(
      currentRound
    );
  }

  /* =========================================================
     REVIEW ANSWERS
     ========================================================= */

  function showReview() {
    stopTimer();

    const container =
      getElement(
        "reviewContainer",
        "reviewList",
        "reviewAnswers",
        "reviewContent"
      );

    if (!container) {
      showScreen(
        "reviewScreen"
      );

      return;
    }

    container.innerHTML = "";

    if (!reviewData.length) {
      const empty =
        document.createElement(
          "p"
        );

      empty.textContent =
        "No answers to review yet.";

      container.appendChild(
        empty
      );

      showScreen(
        "reviewScreen"
      );

      return;
    }

    reviewData.forEach(
      function (item, index) {
        const wrapper =
          document.createElement(
            "div"
          );

        wrapper.className =
          "review-item";

        const question =
          document.createElement(
            "div"
          );

        question.className =
          "review-question";

        question.textContent =
          (index + 1) +
          ". " +
          item.question;

        wrapper.appendChild(
          question
        );

        const selected =
          document.createElement(
            "div"
          );

        selected.className =
          "review-selected";

        selected.textContent =
          "Your answer: " +
          (
            item.selectedAnswer ||
            "No answer"
          );

        wrapper.appendChild(
          selected
        );

        const correct =
          document.createElement(
            "div"
          );

        correct.className =
          "review-correct";

        correct.textContent =
          "Correct answer: " +
          item.correctAnswer;

        wrapper.appendChild(
          correct
        );

        const status =
          document.createElement(
            "div"
          );

        status.className =
          item.isCorrect
            ? "review-correct"
            : "review-wrong";

        status.textContent =
          item.isCorrect
            ? "Correct"
            : "Incorrect";

        wrapper.appendChild(
          status
        );

        container.appendChild(
          wrapper
        );
      }
    );

    showScreen(
      "reviewScreen"
    );
  }

  /* =========================================================
     REVIEW RETRY
     ========================================================= */

  function retryFromReview() {
    retryRound();
  }

  /* =========================================================
     ROUND SCREEN
     ========================================================= */

  function renderRounds() {
    const container =
      getElement(
        "roundGrid",
        "roundsGrid",
        "roundContainer",
        "roundsContainer"
      );

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const unlocked =
      getUnlockedRounds();

    const completed =
      getCompletedRounds();

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
        "round-button";

      const isUnlocked =
        round <= unlocked;

      const isCompleted =
        completed.includes(round);

      button.disabled =
        !isUnlocked;

      button.dataset.round =
        String(round);

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

      button.textContent =
        isUnlocked
          ? "Round " + round
          : "🔒 Round " + round;

      button.addEventListener(
        "click",
        function () {
          if (!button.disabled) {
            storageSet(
              STORAGE.selectedRound,
              String(round)
            );

            startQuiz(round);
          }
        }
      );

      container.appendChild(
        button
      );
    }

    showScreen(
      "roundsScreen"
    );
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function loadSettings() {
    const storedMusic =
      storageGet(
        STORAGE.music,
        "true"
      );

    const storedSound =
      storageGet(
        STORAGE.sound,
        "true"
      );

    musicEnabled =
      storedMusic !== "false";

    soundEnabled =
      storedSound !== "false";

    updateSettingsUI();
  }

  function saveSettings() {
    storageSet(
      STORAGE.music,
      String(musicEnabled)
    );

    storageSet(
      STORAGE.sound,
      String(soundEnabled)
    );
  }

  function updateSettingsUI() {
    const musicInputs = [
      getElement(
        "musicToggle"
      ),
      getElement(
        "musicSwitch"
      ),
      getElement(
        "musicCheckbox"
      )
    ];

    musicInputs.forEach(
      function (input) {
        if (!input) return;

        if (
          input.type === "checkbox" ||
          input.type === "radio"
        ) {
          input.checked =
            musicEnabled;
        }
      }
    );

    const soundInputs = [
      getElement(
        "soundToggle"
      ),
      getElement(
        "soundSwitch"
      ),
      getElement(
        "soundCheckbox"
      )
    ];

    soundInputs.forEach(
      function (input) {
        if (!input) return;

        if (
          input.type === "checkbox" ||
          input.type === "radio"
        ) {
          input.checked =
            soundEnabled;
        }
      }
    );
  }

  function toggleMusic(value) {
    if (
      typeof value === "boolean"
    ) {
      musicEnabled = value;
    } else {
      musicEnabled =
        !musicEnabled;
    }

    saveSettings();
    updateSettingsUI();

    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  function toggleSound(value) {
    if (
      typeof value === "boolean"
    ) {
      soundEnabled = value;
    } else {
      soundEnabled =
        !soundEnabled;
    }

    saveSettings();
    updateSettingsUI();

    if (soundEnabled) {
      playClickSound();
    }
  }

  /* =========================================================
     MUSIC
     ========================================================= */

  function createMusic() {
    if (backgroundMusic) {
      return backgroundMusic;
    }

    /*
      Uses music.mp3 if it exists.
    */

    backgroundMusic =
      new Audio(
        "./music.mp3"
      );

    backgroundMusic.loop =
      true;

    backgroundMusic.volume =
      0.25;

    return backgroundMusic;
  }

  function startMusic() {
    if (!musicEnabled) {
      return;
    }

    try {
      const audio =
        createMusic();

      const promise =
        audio.play();

      if (
        promise &&
        typeof promise.catch ===
          "function"
      ) {
        promise.catch(
          function () {
            /*
              Browser may block autoplay.
              Music will start after user interaction.
            */
          }
        );
      }
    } catch (error) {}
  }

  function stopMusic() {
    if (!backgroundMusic) {
      return;
    }

    try {
      backgroundMusic.pause();
    } catch (error) {}
  }

  /* =========================================================
     SOUND EFFECTS
     ========================================================= */

  let audioContext = null;

  function getAudioContext() {
    if (
      typeof window ===
        "undefined"
    ) {
      return null;
    }

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    if (!audioContext) {
      audioContext =
        new AudioContext();
    }

    return audioContext;
  }

  function beep(
    frequency,
    duration
  ) {
    if (!soundEnabled) {
      return;
    }

    try {
      const ctx =
        getAudioContext();

      if (!ctx) return;

      const oscillator =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      oscillator.frequency.value =
        frequency;

      oscillator.type =
        "sine";

      gain.gain.value =
        0.05;

      oscillator.connect(
        gain
      );

      gain.connect(
        ctx.destination
      );

      oscillator.start();

      oscillator.stop(
        ctx.currentTime +
          duration
      );
    } catch (error) {}
  }

  function playClickSound() {
    beep(600, 0.06);
  }

  function playAnswerSound(
    correct
  ) {
    if (correct) {
      beep(800, 0.08);

      setTimeout(
        function () {
          beep(1000, 0.08);
        },
        90
      );
    } else {
      beep(250, 0.12);
    }
  }

  /* =========================================================
     DAILY CHALLENGE
     ========================================================= */

  function getTodayKey() {
    const date =
      new Date();

    return (
      date.getFullYear() +
      "-" +
      String(
        date.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        date.getDate()
      ).padStart(2, "0")
    );
  }

  function startDailyChallenge() {
    if (!allQuestions.length) {
      loadQuestions().then(
        function () {
          startDailyChallenge();
        }
      );

      return;
    }

    const today =
      getTodayKey();

    const saved =
      readJSON(
        STORAGE.daily,
        null
      );

    if (
      saved &&
      saved.date === today &&
      Array.isArray(
        saved.questions
      ) &&
      saved.questions.length
    ) {
      roundQuestions =
        saved.questions;

      currentRound = 1;
      currentQuestionIndex = 0;

      score = 0;
      correctAnswers = 0;
      wrongAnswers = 0;

      streak = 0;
      bestStreak = 0;

      reviewData = [];

      quizStarted = true;
      quizFinished = false;

      showScreen(
        "quizScreen"
      );

      renderQuestion();

      return;
    }

    const dailyQuestions =
      shuffle(
        allQuestions
      ).slice(
        0,
        Math.min(
          QUESTIONS_PER_ROUND,
          allQuestions.length
        )
      );

    saveJSON(
      STORAGE.daily,
      {
        date: today,
        questions:
          dailyQuestions
      }
    );

    startDailyChallenge();
  }

  /* =========================================================
     ACHIEVEMENTS
     ========================================================= */

  function getAchievements() {
    const data =
      readJSON(
        STORAGE.achievements,
        {}
      );

    return data &&
      typeof data === "object"
      ? data
      : {};
  }

  function updateAchievements() {
    const achievements =
      getAchievements();

    if (
      correctAnswers >= 3
    ) {
      achievements.streak3 =
        true;
    }

    if (
      bestStreak >= 5
    ) {
      achievements.streak5 =
        true;
    }

    if (
      getCompletedRounds()
        .length >= 5
    ) {
      achievements.rounds5 =
        true;
    }

    if (
      getCompletedRounds()
        .length >= 10
    ) {
      achievements.allRounds =
        true;
    }

    saveJSON(
      STORAGE.achievements,
      achievements
    );
  }

  /* =========================================================
     SHARE
     ========================================================= */

  function shareQuizMaster() {
    const shareUrl =
      window.location.href;

    const shareData = {
      title:
        "Quiz Master 🇷🇼",

      text:
        "Test your knowledge with Quiz Master!",

      url:
        shareUrl
    };

    if (
      navigator.share
    ) {
      navigator.share(
        shareData
      ).catch(
        function (error) {
          if (
            error &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          copyShareLink(
            shareUrl
          );
        }
      );

      return;
    }

    copyShareLink(
      shareUrl
    );
  }

  function copyShareLink(url) {
    if (
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      navigator.clipboard
        .writeText(url)
        .then(
          function () {
            showTemporaryMessage(
              "✅ Link Copied!"
            );
          }
        )
        .catch(
          function () {
            fallbackCopy(
              url
            );
          }
        );

      return;
    }

    fallbackCopy(url);
  }

  function fallbackCopy(text) {
    try {
      const input =
        document.createElement(
          "textarea"
        );

      input.value = text;

      input.style.position =
        "fixed";

      input.style.opacity =
        "0";

      document.body.appendChild(
        input
      );

      input.focus();
      input.select();

      document.execCommand(
        "copy"
      );

      document.body.removeChild(
        input
      );

      showTemporaryMessage(
        "✅ Link Copied!"
      );
    } catch (error) {
      console.warn(
        "Could not copy link."
      );
    }
  }

  function showTemporaryMessage(
    message
  ) {
    const existing =
      getElement(
        "shareMessage",
        "toast",
        "message"
      );

    if (existing) {
      existing.textContent =
        message;

      showElement(existing);

      setTimeout(
        function () {
          hideElement(
            existing
          );
        },
        1800
      );
    } else {
      console.log(message);
    }
  }

  /* =========================================================
     GO HOME
     ========================================================= */

  function goHome() {
    stopTimer();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();
  }

  /* =========================================================
     BUTTON EVENT SYSTEM
     ========================================================= */

  function bindButton(
    ids,
    handler
  ) {
    const list = Array.isArray(ids)
      ? ids
      : [ids];

    list.forEach(
      function (id) {
        const button = $(id);

        if (!button) {
          return;
        }

        /*
          Prevent duplicate listeners.
        */

        if (
          button.dataset
            .quizMasterBound ===
          "true"
        ) {
          return;
        }

        button.dataset
          .quizMasterBound =
          "true";

        button.addEventListener(
          "click",
          function (event) {
            event.preventDefault();

            try {
              const result =
                handler(event);

              if (
                result &&
                typeof result.then ===
                  "function"
              ) {
                result.catch(
                  function (error) {
                    console.error(
                      "Quiz Master button error:",
                      error
                    );
                  }
                );
              }
            } catch (error) {
              console.error(
                "Quiz Master button error:",
                error
              );
            }
          }
        );
      }
    );
  }

  /* =========================================================
     INITIALIZE BUTTONS
     ========================================================= */

  function bindButtons() {
    /* Start */

    bindButton(
      [
        "startBtn",
        "startQuizBtn",
        "startButton"
      ],
      function () {
        startQuiz(1);
      }
    );

    /* Continue */

    bindButton(
      [
        "continueBtn",
        "continueQuizBtn",
        "resumeBtn",
        "continueButton"
      ],
      function () {
        continueQuiz();
      }
    );

    /* Rounds */

    bindButton(
      [
        "roundsBtn",
        "quizRoundsBtn",
        "roundsButton"
      ],
      function () {
        renderRounds();
      }
    );

    /* Settings */

    bindButton(
      [
        "settingsBtn",
        "settingsButton"
      ],
      function () {
        loadSettings();

        showScreen(
          "settingsScreen"
        );
      }
    );

    /* Review */

    bindButton(
      [
        "reviewBtn",
        "reviewButton",
        "reviewAnswersBtn"
      ],
      function () {
        showReview();
      }
    );

    /* Retry */

    bindButton(
      [
        "retryBtn",
        "retryRoundBtn",
        "retryButton",
        "resultRetryBtn"
      ],
      function () {
        retryRound();
      }
    );

    /* Retry from review */

    bindButton(
      [
        "reviewRetryBtn",
        "retryReviewBtn",
        "reviewRetryButton"
      ],
      function () {
        retryFromReview();
      }
    );

    /* Next */

    bindButton(
      [
        "nextBtn",
        "nextQuestionBtn",
        "nextButton"
      ],
      function () {
        nextQuestion();
      }
    );

    /* Error retry */

    bindButton(
      [
        "errorRetryBtn",
        "errorRetryButton",
        "retryErrorBtn"
      ],
      function () {
        loadQuestions()
          .then(
            function () {
              goHome();
            }
          )
          .catch(
            function () {}
          );
      }
    );

    /* Home */

    bindButton(
      [
        "homeBtn",
        "homeButton",
        "backHomeBtn",
        "backToHomeBtn"
      ],
      function () {
        goHome();
      }
    );

    /* Review back */

    bindButton(
      [
        "reviewBackBtn",
        "backFromReviewBtn"
      ],
      function () {
        showScreen(
          "resultScreen"
        );
      }
    );

    /* Rounds back */

    bindButton(
      [
        "roundsBackBtn",
        "backFromRoundsBtn"
      ],
      function () {
        goHome();
      }
    );

    /* Settings back */

    bindButton(
      [
        "settingsBackBtn",
        "backFromSettingsBtn"
      ],
      function () {
        goHome();
      }
    );

    /* Share */

    bindButton(
      [
        "shareBtn",
        "shareButton",
        "shareQuizBtn"
      ],
      function () {
        shareQuizMaster();
      }
    );

    /* Daily challenge */

    bindButton(
      [
        "dailyChallengeBtn",
        "dailyBtn",
        "dailyChallengeButton"
      ],
      function () {
        startDailyChallenge();
      }
    );

    /* Music */

    bindButton(
      [
        "musicToggle",
        "musicSwitch"
      ],
      function (event) {
        const target =
          event.currentTarget;

        if (
          target.type ===
            "checkbox" ||
          target.type ===
            "radio"
        ) {
          toggleMusic(
            target.checked
          );
        } else {
          toggleMusic();
        }
      }
    );

    /* Sound */

    bindButton(
      [
        "soundToggle",
        "soundSwitch"
      ],
      function (event) {
        const target =
          event.currentTarget;

        if (
          target.type ===
            "checkbox" ||
          target.type ===
            "radio"
        ) {
          toggleSound(
            target.checked
          );
        } else {
          toggleSound();
        }
      }
    );

    /* Other checkbox IDs */

    bindButton(
      [
        "musicCheckbox"
      ],
      function (event) {
        toggleMusic(
          event.currentTarget
            .checked
        );
      }
    );

    bindButton(
      [
        "soundCheckbox"
      ],
      function (event) {
        toggleSound(
          event.currentTarget
            .checked
        );
      }
    );
  }

  /* =========================================================
     GLOBAL FUNCTIONS
     ---------------------------------------------------------
     These make the functions available to
     existing inline onclick attributes.
     ========================================================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.retryRound =
    retryRound;

  window.retryQuiz =
    retryRound;

  window.showReview =
    showReview;

  window.retryFromReview =
    retryFromReview;

  window.renderRounds =
    renderRounds;

  window.showRounds =
    renderRounds;

  window.goHome =
    goHome;

  window.showHome =
    goHome;

  window.toggleMusic =
    toggleMusic;

  window.toggleSound =
    toggleSound;

  window.shareQuizMaster =
    shareQuizMaster;

  window.startDailyChallenge =
    startDailyChallenge;

  window.loadQuestions =
    loadQuestions;

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function initialize() {
    loadSettings();

    bindButtons();

    updateContinueButton();

    /*
      Make sure first round exists.
    */

    if (
      !storageGet(
        STORAGE.unlockedRounds,
        ""
      )
    ) {
      setUnlockedRounds(1);
    }

    /*
      Load questions in background.
      Do not force the user away from home screen.
    */

    loadQuestions()
      .then(
        function () {
          updateContinueButton();

          console.log(
            "Quiz Master initialized successfully."
          );
        }
      )
      .catch(
        function (error) {
          console.error(
            "Quiz Master initialization error:",
            error
          );
        }
      );
  }

  /* =========================================================
     START WHEN DOM IS READY
     ========================================================= */

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
