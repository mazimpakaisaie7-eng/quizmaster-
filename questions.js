/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   Compatible with the supplied index.html
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

  let timer = null;
  let timeLeft = TIME_PER_QUESTION;

  let answerSelected = false;
  let quizStarted = false;
  let quizFinished = false;

  let reviewData = [];

  let musicEnabled = true;
  let soundEnabled = true;

  let backgroundMusic = null;

  let questionsLoaded = false;
  let loadingPromise = null;

  /* =========================================================
     DOM
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function getElement() {
    for (let i = 0; i < arguments.length; i++) {
      const element = $(arguments[i]);

      if (element) {
        return element;
      }
    }

    return null;
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
      console.warn("Storage error:", error);
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage remove error:", error);
    }
  }

  function saveJSON(key, value) {
    try {
      storageSet(key, JSON.stringify(value));
    } catch (error) {
      console.warn("JSON save error:", error);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = storageGet(key, "");

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  /* =========================================================
     TEXT HELPERS
     ========================================================= */

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  /* =========================================================
     ARRAY HELPERS
     ========================================================= */

  function shuffle(array) {
    const result = Array.isArray(array)
      ? array.slice()
      : [];

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
     IMPORTANT:
     index.html uses .screen.active
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

      if (!screen) {
        return;
      }

      if (id === screenId) {
        screen.classList.add("active");
        screen.hidden = false;
      } else {
        screen.classList.remove("active");
        screen.hidden = true;
      }
    });

    window.scrollTo(0, 0);
  }

  /* =========================================================
     QUESTIONS VALIDATION
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

  /* =========================================================
     QUESTION NORMALIZATION
     ========================================================= */

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

    /* Answer can be a number */
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

    /* Find matching option */
    let matchingOption = options.find(function (option) {
      return (
        normalizeText(option) ===
        normalizeText(answer)
      );
    });

    if (matchingOption) {
      answer = matchingOption;
    }

    /* Support answer as numeric string */
    if (
      !options.some(function (option) {
        return (
          normalizeText(option) ===
          normalizeText(answer)
        );
      })
    ) {
      const numberAnswer = Number(answer);

      if (
        Number.isInteger(numberAnswer) &&
        numberAnswer >= 0 &&
        numberAnswer < options.length
      ) {
        answer = options[numberAnswer];
      }
    }

    /* Final validation */
    const answerExists = options.some(function (option) {
      return (
        normalizeText(option) ===
        normalizeText(answer)
      );
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
        "questions.json must contain an array."
      );
    }

    const result = [];

    source.forEach(function (question, index) {
      const clean = normalizeQuestion(
        question,
        index
      );

      if (clean) {
        result.push(clean);
      }
    });

    if (result.length === 0) {
      throw new Error(
        "No valid questions found in questions.json."
      );
    }

    return result;
  }

  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {
    if (questionsLoaded && allQuestions.length) {
      return allQuestions;
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    loadingPromise = fetch(
      QUESTIONS_FILE + "?v=" + Date.now(),
      {
        cache: "no-store"
      }
    )
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "questions.json could not be loaded. HTTP " +
              response.status
          );
        }

        return response.json();
      })
      .then(function (data) {
        allQuestions = normalizeQuestions(data);

        questionsLoaded = true;

        return allQuestions;
      })
      .catch(function (error) {
        questionsLoaded = false;

        showError(
          "Unable to load questions.json. " +
            error.message
        );

        throw error;
      })
      .finally(function () {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  /* =========================================================
     ERROR
     ========================================================= */

  function showError(message) {
    stopTimer();

    const errorMessage = $(
      "errorMessage"
    );

    if (errorMessage) {
      errorMessage.textContent =
        message ||
        "Unable to load quiz questions.";
    }

    showScreen("errorScreen");
  }

  /* =========================================================
     ROUNDS
     ========================================================= */

  function getUnlockedRounds() {
    let value = Number(
      storageGet(
        STORAGE.unlockedRounds,
        "1"
      )
    );

    if (!Number.isFinite(value)) {
      value = 1;
    }

    return Math.max(
      1,
      Math.min(
        TOTAL_ROUNDS,
        Math.floor(value)
      )
    );
  }

  function setUnlockedRounds(value) {
    const safe = Math.max(
      1,
      Math.min(
        TOTAL_ROUNDS,
        Math.floor(Number(value) || 1)
      )
    );

    storageSet(
      STORAGE.unlockedRounds,
      String(safe)
    );
  }

  function getCompletedRounds() {
    const data = readJSON(
      STORAGE.completedRounds,
      []
    );

    return Array.isArray(data)
      ? data
      : [];
  }

  function saveCompletedRound(round) {
    const completed =
      getCompletedRounds();

    if (!completed.includes(round)) {
      completed.push(round);
    }

    saveJSON(
      STORAGE.completedRounds,
      completed
    );
  }

  function unlockNextRound(round) {
    if (round >= TOTAL_ROUNDS) {
      return;
    }

    const next = round + 1;

    if (next > getUnlockedRounds()) {
      setUnlockedRounds(next);
    }
  }

  /* =========================================================
     USED QUESTIONS
     ========================================================= */

  function getUsedQuestions() {
    const used = readJSON(
      STORAGE.usedQuestions,
      []
    );

    return Array.isArray(used)
      ? used
      : [];
  }

  function saveUsedQuestions(used) {
    saveJSON(
      STORAGE.usedQuestions,
      used
    );
  }

  function questionId(question) {
    return (
      question.id ||
      normalizeText(question.question)
    );
  }

  function addUsedQuestions(questions) {
    let used =
      getUsedQuestions();

    questions.forEach(function (question) {
      const id = questionId(question);

      if (
        id &&
        !used.includes(id)
      ) {
        used.push(id);
      }
    });

    /*
      Once almost all questions have been used,
      start a fresh cycle.
    */

    if (
      used.length >=
      Math.max(
        1,
        allQuestions.length - 1
      )
    ) {
      used = [];
    }

    saveUsedQuestions(used);
  }

  /* =========================================================
     SELECT ROUND QUESTIONS
     ========================================================= */

  function selectQuestionsForRound() {
    if (!allQuestions.length) {
      return [];
    }

    let used =
      getUsedQuestions();

    let available =
      allQuestions.filter(function (question) {
        return !used.includes(
          questionId(question)
        );
      });

    /*
      If not enough unused questions remain,
      reset the cycle.
    */

    if (
      available.length <
      QUESTIONS_PER_ROUND
    ) {
      used = [];

      saveUsedQuestions([]);

      available =
        allQuestions.slice();
    }

    /*
      We always need 10 questions.
      If the JSON has fewer than 10 questions,
      use the available questions without
      crashing the app.
    */

    const selected =
      shuffle(available).slice(
        0,
        Math.min(
          QUESTIONS_PER_ROUND,
          available.length
        )
      );

    addUsedQuestions(selected);

    return selected;
  }

  /* =========================================================
     PROGRESS
     ========================================================= */

  function saveProgress() {
    const progress = {
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
        roundQuestions
          .map(function (q) {
            return q.id;
          }),
      reviewData:
        reviewData
    };

    saveJSON(
      STORAGE.progress,
      progress
    );

    storageSet(
      STORAGE.currentRound,
      String(currentRound)
    );
  }

  function getSavedProgress() {
    const progress =
      readJSON(
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
      progress.roundQuestions.length > 0
    );
  }

  function clearProgress() {
    storageRemove(
      STORAGE.progress
    );
  }

  /* =========================================================
     HOME BUTTON STATE
     ========================================================= */

  function updateContinueButton() {
    const button =
      $("continueBtn");

    if (!button) {
      return;
    }

    if (hasSavedProgress()) {
      button.style.display = "";
      button.hidden = false;
    } else {
      button.style.display =
        "none";
      button.hidden = true;
    }
  }

  /* =========================================================
     ROUND SCREEN
     ========================================================= */

  function renderRounds() {
    const grid =
      $("roundGrid");

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

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
        "round-btn " +
        (
          round <= unlocked
            ? "unlocked"
            : "locked"
        );

      if (round <= unlocked) {
        const done =
          completed.includes(
            round
          );

        button.textContent =
          done
            ? "✅ Round " + round
            : "🎯 Round " + round;

        button.addEventListener(
          "click",
          function () {
            startRound(round);
          }
        );
      } else {
        button.textContent =
          "🔒 Round " + round;

        button.addEventListener(
          "click",
          function () {
            alert(
              "Round " +
                round +
                " is locked. Complete the previous round with at least " +
                UNLOCK_PERCENT +
                "%."
            );
          }
        );
      }

      grid.appendChild(
        button
      );
    }
  }

  /* =========================================================
     QUIZ START
     ========================================================= */

  async function startQuiz() {
    try {
      await loadQuestions();

      currentRound = 1;

      storageSet(
        STORAGE.currentRound,
        "1"
      );

      beginRound(1);
    } catch (error) {
      console.error(
        "Start Quiz error:",
        error
      );
    }
  }

  async function startRound(round) {
    try {
      await loadQuestions();

      const unlocked =
        getUnlockedRounds();

      if (
        round < 1 ||
        round > TOTAL_ROUNDS
      ) {
        return;
      }

      if (round > unlocked) {
        alert(
          "This round is locked."
        );

        return;
      }

      currentRound = round;

      storageSet(
        STORAGE.selectedRound,
        String(round)
      );

      beginRound(round);
    } catch (error) {
      console.error(
        "Start Round error:",
        error
      );
    }
  }

  function beginRound(round) {
    stopTimer();

    currentRound = round;

    currentQuestionIndex = 0;

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    streak = 0;
    bestStreak = 0;

    quizFinished = false;
    quizStarted = true;

    answerSelected = false;

    reviewData = [];

    roundQuestions =
      selectQuestionsForRound();

    if (
      !roundQuestions.length
    ) {
      showError(
        "There are not enough valid questions in questions.json."
      );

      return;
    }

    saveProgress();

    showScreen(
      "quizScreen"
    );

    renderCurrentQuestion();
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
        )
      ) {
        startQuiz();

        return;
      }

      currentRound =
        Number(
          progress.round
        ) || 1;

      currentQuestionIndex =
        Number(
          progress.questionIndex
        ) || 0;

      score =
        Number(
          progress.score
        ) || 0;

      correctAnswers =
        Number(
          progress.correctAnswers
        ) || 0;

      wrongAnswers =
        Number(
          progress.wrongAnswers
        ) || 0;

      streak =
        Number(
          progress.streak
        ) || 0;

      bestStreak =
        Number(
          progress.bestStreak
        ) || 0;

      reviewData =
        Array.isArray(
          progress.reviewData
        )
          ? progress.reviewData
          : [];

      const ids =
        progress.roundQuestions;

      roundQuestions =
        ids
          .map(function (id) {
            return allQuestions.find(
              function (question) {
                return (
                  question.id === id
                );
              }
            );
          })
          .filter(Boolean);

      /*
        Fallback if IDs changed.
      */

      if (
        roundQuestions.length === 0
      ) {
        beginRound(
          currentRound
        );

        return;
      }

      if (
        currentQuestionIndex >=
        roundQuestions.length
      ) {
        currentQuestionIndex = 0;
      }

      quizStarted = true;
      quizFinished = false;

      showScreen(
        "quizScreen"
      );

      renderCurrentQuestion();
    } catch (error) {
      console.error(
        "Continue error:",
        error
      );

      showError(
        "Unable to continue the saved quiz."
      );
    }
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderCurrentQuestion() {
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

    const questionNumber =
      $("questionNumber");

    const roundDisplay =
      $("roundDisplay");

    const scoreElement =
      $("score");

    const timerElement =
      $("timer");

    const progressBar =
      $("progressBar");

    const category =
      $("category");

    const questionElement =
      $("question");

    const optionsElement =
      $("options");

    const message =
      $("message");

    const nextButton =
      $("nextBtn");

    if (questionNumber) {
      questionNumber.textContent =
        "Question " +
        (currentQuestionIndex + 1) +
        " / " +
        roundQuestions.length;
    }

    if (roundDisplay) {
      roundDisplay.textContent =
        "Round " +
        currentRound;
    }

    if (scoreElement) {
      scoreElement.textContent =
        "Score: " +
        score;
    }

    if (category) {
      category.textContent =
        question.category;
    }

    if (questionElement) {
      questionElement.textContent =
        question.question;
    }

    if (progressBar) {
      const percent =
        (
          currentQuestionIndex /
          roundQuestions.length
        ) * 100;

      progressBar.style.width =
        Math.max(
          0,
          Math.min(
            100,
            percent
          )
        ) + "%";
    }

    if (optionsElement) {
      optionsElement.innerHTML = "";

      const shuffledOptions =
        shuffle(
          question.options
        );

      shuffledOptions.forEach(
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

          optionsElement.appendChild(
            button
          );
        }
      );
    }

    if (message) {
      message.textContent = "";
      message.className =
        "message hidden";
    }

    if (nextButton) {
      nextButton.style.display =
        "none";

      nextButton.hidden =
        true;
    }

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
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    timer =
      setInterval(
        function () {
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
    if (timer !== null) {
      clearInterval(timer);

      timer = null;
    }
  }

  function updateTimerDisplay() {
    const timerElement =
      $("timer");

    if (timerElement) {
      timerElement.textContent =
        "⏱️ " +
        Math.max(
          0,
          timeLeft
        );
    }
  }

  function handleTimeUp() {
    if (answerSelected) {
      return;
    }

    answerSelected = true;

    const question =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    wrongAnswers++;

    streak = 0;

    reviewData.push({
      question:
        question.question,

      selectedAnswer:
        "Time expired",

      correctAnswer:
        question.answer,

      correct: false
    });

    markOptionsAfterAnswer(
      question,
      null
    );

    showMessage(
      "⏰ Time is up!",
      false
    );

    showNextButton();

    playWrongSound();

    saveProgress();
  }

  /* =========================================================
     ANSWER
     ========================================================= */

  function answerQuestion(
    selectedAnswer,
    clickedButton
  ) {
    if (answerSelected) {
      return;
    }

    const question =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    answerSelected = true;

    stopTimer();

    const correct =
      normalizeText(
        selectedAnswer
      ) ===
      normalizeText(
        question.answer
      );

    if (correct) {
      correctAnswers++;

      score +=
        POINTS_PER_CORRECT;

      streak++;

      if (
        streak >
        bestStreak
      ) {
        bestStreak =
          streak;
      }

      showMessage(
        "✅ Correct!",
        true
      );

      playCorrectSound();
    } else {
      wrongAnswers++;

      streak = 0;

      showMessage(
        "❌ Wrong answer!",
        false
      );

      playWrongSound();
    }

    reviewData.push({
      question:
        question.question,

      selectedAnswer:
        selectedAnswer,

      correctAnswer:
        question.answer,

      correct:
        correct
    });

    markOptionsAfterAnswer(
      question,
      selectedAnswer
    );

    const scoreElement =
      $("score");

    if (scoreElement) {
      scoreElement.textContent =
        "Score: " +
        score;
    }

    showNextButton();

    saveProgress();
  }

  function markOptionsAfterAnswer(
    question,
    selectedAnswer
  ) {
    const options =
      document.querySelectorAll(
        "#options .option-btn"
      );

    options.forEach(
      function (button) {
        button.disabled = true;

        const value =
          button.textContent;

        if (
          normalizeText(value) ===
          normalizeText(
            question.answer
          )
        ) {
          button.classList.add(
            "correct"
          );
        }

        if (
          selectedAnswer !== null &&
          normalizeText(value) ===
          normalizeText(
            selectedAnswer
          ) &&
          normalizeText(value) !==
          normalizeText(
            question.answer
          )
        ) {
          button.classList.add(
            "wrong"
          );
        }
      }
    );
  }

  /* =========================================================
     MESSAGE
     ========================================================= */

  function showMessage(
    text,
    correct
  ) {
    const message =
      $("message");

    if (!message) {
      return;
    }

    message.textContent =
      text;

    message.className =
      correct
        ? "message correct"
        : "message wrong";
  }

  function showNextButton() {
    const nextButton =
      $("nextBtn");

    if (!nextButton) {
      return;
    }

    nextButton.style.display =
      "";

    nextButton.hidden =
      false;
  }

  /* =========================================================
     NEXT QUESTION
     ========================================================= */

  function nextQuestion() {
    if (!quizStarted) {
      return;
    }

    if (!answerSelected) {
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
     FINISH ROUND
     ========================================================= */

  function finishRound() {
    stopTimer();

    quizFinished = true;
    quizStarted = false;

    const total =
      roundQuestions.length;

    const percent =
      total > 0
        ? Math.round(
            (
              correctAnswers /
              total
            ) * 100
          )
        : 0;

    const finalScore =
      $("finalScore");

    const resultPercent =
      $("resultPercent");

    const resultMessage =
      $("resultMessage");

    const finishedRound =
      $("finishedRound");

    const correctCount =
      $("correctCount");

    const wrongCount =
      $("wrongCount");

    const nextRoundButton =
      $("nextRoundBtn");

    if (finalScore) {
      finalScore.textContent =
        "Score: " +
        score;
    }

    if (resultPercent) {
      resultPercent.textContent =
        percent + "%";
    }

    if (correctCount) {
      correctCount.textContent =
        correctAnswers;
    }

    if (wrongCount) {
      wrongCount.textContent =
        wrongAnswers;
    }

    if (finishedRound) {
      finishedRound.textContent =
        "Round " +
        currentRound +
        " completed.";
    }

    if (percent >= UNLOCK_PERCENT) {
      saveCompletedRound(
        currentRound
      );

      unlockNextRound(
        currentRound
      );

      if (resultMessage) {
        resultMessage.textContent =
          "🎉 Excellent! You scored " +
          percent +
          "% and unlocked the next round.";
      }
    } else {
      if (resultMessage) {
        resultMessage.textContent =
          "Keep trying! You need at least " +
          UNLOCK_PERCENT +
          "% to unlock the next round.";
      }
    }

    if (
      nextRoundButton
    ) {
      if (
        percent >=
          UNLOCK_PERCENT &&
        currentRound <
          TOTAL_ROUNDS
      ) {
        nextRoundButton.style.display =
          "";

        nextRoundButton.hidden =
          false;

        nextRoundButton.textContent =
          "🔓 Next Round";
      } else {
        nextRoundButton.style.display =
          "none";

        nextRoundButton.hidden =
          true;
      }
    }

    updateAchievements(
      percent
    );

    saveDailyResult();

    clearProgress();

    updateContinueButton();

    showScreen(
      "resultScreen"
    );
  }

  /* =========================================================
     NEXT ROUND
     ========================================================= */

  function nextRound() {
    if (
      currentRound >=
      TOTAL_ROUNDS
    ) {
      return;
    }

    const next =
      currentRound + 1;

    if (
      next >
      getUnlockedRounds()
    ) {
      return;
    }

    startRound(next);
  }

  /* =========================================================
     RETRY
     ========================================================= */

  function retryRound() {
    startRound(
      currentRound
    );
  }

  /* =========================================================
     REVIEW
     ========================================================= */

  function renderReview() {
    const list =
      $("reviewList");

    const summary =
      $("reviewSummary");

    if (!list) {
      return;
    }

    list.innerHTML = "";

    const total =
      reviewData.length;

    const correct =
      reviewData.filter(
        function (item) {
          return item.correct;
        }
      ).length;

    if (summary) {
      summary.textContent =
        "Round " +
        currentRound +
        " — " +
        correct +
        "/" +
        total +
        " correct";
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
            item.correct
              ? "review-correct"
              : "review-wrong"
          );

        const title =
          document.createElement(
            "strong"
          );

        title.textContent =
          (
            index + 1
          ) +
          ". " +
          item.question;

        const selected =
          document.createElement(
            "p"
          );

        selected.textContent =
          "Your answer: " +
          item.selectedAnswer;

        const correctAnswer =
          document.createElement(
            "p"
          );

        correctAnswer.textContent =
          "Correct answer: " +
          item.correctAnswer;

        card.appendChild(
          title
        );

        card.appendChild(
          selected
        );

        card.appendChild(
          correctAnswer
        );

        list.appendChild(
          card
        );
      }
    );

    showScreen(
      "reviewScreen"
    );
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function loadSettings() {
    const savedMusic =
      storageGet(
        STORAGE.music,
        "true"
      );

    const savedSound =
      storageGet(
        STORAGE.sound,
        "true"
      );

    musicEnabled =
      savedMusic !== "false";

    soundEnabled =
      savedSound !== "false";

    updateSettingsUI();
  }

  function updateSettingsUI() {
    const musicSwitch =
      $("musicSwitch");

    const soundSwitch =
      $("soundSwitch");

    if (musicSwitch) {
      musicSwitch.classList.toggle(
        "on",
        musicEnabled
      );

      musicSwitch.setAttribute(
        "aria-pressed",
        String(musicEnabled)
      );
    }

    if (soundSwitch) {
      soundSwitch.classList.toggle(
        "on",
        soundEnabled
      );

      soundSwitch.setAttribute(
        "aria-pressed",
        String(soundEnabled)
      );
    }
  }

  function toggleMusic() {
    musicEnabled =
      !musicEnabled;

    storageSet(
      STORAGE.music,
      String(musicEnabled)
    );

    updateSettingsUI();

    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  function toggleSound() {
    soundEnabled =
      !soundEnabled;

    storageSet(
      STORAGE.sound,
      String(soundEnabled)
    );

    updateSettingsUI();
  }

  /* =========================================================
     MUSIC
     ========================================================= */

  function createMusic() {
    if (backgroundMusic) {
      return backgroundMusic;
    }

    try {
      backgroundMusic =
        new Audio(
          "./music.mp3"
        );

      backgroundMusic.loop =
        true;

      backgroundMusic.volume =
        0.25;

      return backgroundMusic;
    } catch (error) {
      backgroundMusic =
        null;

      return null;
    }
  }

  function startMusic() {
    if (!musicEnabled) {
      return;
    }

    const music =
      createMusic();

    if (!music) {
      return;
    }

    music.play().catch(
      function () {
        /*
          Browser autoplay policies may block
          music until the user interacts.
        */
      }
    );
  }

  function stopMusic() {
    if (!backgroundMusic) {
      return;
    }

    try {
      backgroundMusic.pause();
      backgroundMusic.currentTime =
        0;
    } catch (error) {
      console.warn(
        "Music stop error:",
        error
      );
    }
  }

  /* =========================================================
     SOUND EFFECTS
     ========================================================= */

  function playTone(
    frequency,
    duration
  ) {
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
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          duration
      );

      setTimeout(
        function () {
          try {
            context.close();
          } catch (e) {}
        },
        duration * 1000 + 100
      );
    } catch (error) {
      console.warn(
        "Sound error:",
        error
      );
    }
  }

  function playCorrectSound() {
    playTone(
      880,
      0.12
    );
  }

  function playWrongSound() {
    playTone(
      220,
      0.16
    );
  }

  /* =========================================================
     DAILY CHALLENGE
     ========================================================= */

  function todayKey() {
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

  function saveDailyResult() {
    const data = {
      date: todayKey(),
      round: currentRound,
      score: score,
      correct: correctAnswers
    };

    saveJSON(
      STORAGE.daily,
      data
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

    const result =
      Array.isArray(
        achievements
      )
        ? achievements
        : [];

    function add(name) {
      if (!result.includes(name)) {
        result.push(name);
      }
    }

    if (currentRound === 1) {
      add("first-round");
    }

    if (
      getCompletedRounds().length >= 5
    ) {
      add("five-rounds");
    }

    if (
      percent >= UNLOCK_PERCENT
    ) {
      add("sixty-percent");
    }

    if (
      getCompletedRounds().length >=
      TOTAL_ROUNDS
    ) {
      add("all-rounds");
    }

    saveJSON(
      STORAGE.achievements,
      result
    );
  }

  /* =========================================================
     HOME
     ========================================================= */

  function goHome() {
    stopTimer();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();

    if (!musicEnabled) {
      stopMusic();
    }
  }

  /* =========================================================
     SHARE
     ========================================================= */

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
        navigator.share
      ) {
        await navigator.share(
          shareData
        );

        return;
      }
    } catch (error) {
      /*
        AbortError simply means the user cancelled.
      */

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
        $("shareBtn");

      if (button) {
        const original =
          button.textContent;

        button.textContent =
          "✅ Link Copied!";

        setTimeout(
          function () {
            button.textContent =
              original;
          },
          2000
        );
      }
    } catch (error) {
      alert(
        "Share this Quiz Master link:\n" +
          window.location.href
      );
    }
  }

  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  function bindEvents() {
    const startBtn =
      $("startBtn");

    if (startBtn) {
      startBtn.addEventListener(
        "click",
        startQuiz
      );
    }

    const continueBtn =
      $("continueBtn");

    if (continueBtn) {
      continueBtn.addEventListener(
        "click",
        continueQuiz
      );
    }

    const roundsBtn =
      $("roundsBtn");

    if (roundsBtn) {
      roundsBtn.addEventListener(
        "click",
        function () {
          renderRounds();

          showScreen(
            "roundsScreen"
          );
        }
      );
    }

    const settingsBtn =
      $("settingsBtn");

    if (settingsBtn) {
      settingsBtn.addEventListener(
        "click",
        function () {
          updateSettingsUI();

          showScreen(
            "settingsScreen"
          );
        }
      );
    }

    const shareBtn =
      $("shareBtn");

    if (shareBtn) {
      shareBtn.addEventListener(
        "click",
        shareQuiz
      );
    }

    const nextBtn =
      $("nextBtn");

    if (nextBtn) {
      nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    }

    const quizHomeBtn =
      $("quizHomeBtn");

    if (quizHomeBtn) {
      quizHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    const roundsBackBtn =
      $("roundsBackBtn");

    if (roundsBackBtn) {
      roundsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    const restartBtn =
      $("restartBtn");

    if (restartBtn) {
      restartBtn.addEventListener(
        "click",
        retryRound
      );
    }

    const reviewBtn =
      $("reviewBtn");

    if (reviewBtn) {
      reviewBtn.addEventListener(
        "click",
        renderReview
      );
    }

    const resultHomeBtn =
      $("resultHomeBtn");

    if (resultHomeBtn) {
      resultHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    const nextRoundBtn =
      $("nextRoundBtn");

    if (nextRoundBtn) {
      nextRoundBtn.addEventListener(
        "click",
        nextRound
      );
    }

    const reviewRetryBtn =
      $("reviewRetryBtn");

    if (reviewRetryBtn) {
      reviewRetryBtn.addEventListener(
        "click",
        retryRound
      );
    }

    const reviewBackBtn =
      $("reviewBackBtn");

    if (reviewBackBtn) {
      reviewBackBtn.addEventListener(
        "click",
        function () {
          showScreen(
            "resultScreen"
          );
        }
      );
    }

    const settingsBackBtn =
      $("settingsBackBtn");

    if (settingsBackBtn) {
      settingsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    const musicSwitch =
      $("musicSwitch");

    if (musicSwitch) {
      musicSwitch.addEventListener(
        "click",
        toggleMusic
      );
    }

    const soundSwitch =
      $("soundSwitch");

    if (soundSwitch) {
      soundSwitch.addEventListener(
        "click",
        toggleSound
      );
    }

    const errorRestartBtn =
      $("errorRestartBtn");

    if (errorRestartBtn) {
      errorRestartBtn.addEventListener(
        "click",
        function () {
          questionsLoaded =
            false;

          allQuestions =
            [];

          startQuiz();
        }
      );
    }

    const errorHomeBtn =
      $("errorHomeBtn");

    if (errorHomeBtn) {
      errorHomeBtn.addEventListener(
        "click",
        goHome
      );
    }
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function init() {
    loadSettings();

    bindEvents();

    updateContinueButton();

    /*
      IMPORTANT:
      Do not call showElement().
      index.html uses .screen.active.
    */

    showScreen(
      "homeScreen"
    );

    /*
      Load questions in background.
      If questions.json has an error,
      the app will show the error screen
      only when loading is required.
    */

    try {
      await loadQuestions();

      updateContinueButton();

      renderRounds();
    } catch (error) {
      console.error(
        "Quiz Master initialization:",
        error
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

  window.startRound =
    startRound;

  window.nextQuestion =
    nextQuestion;

  window.retryRound =
    retryRound;

  window.renderReview =
    renderReview;

  window.goHome =
    goHome;

  window.showScreen =
    showScreen;

  window.loadQuestions =
    loadQuestions;

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
