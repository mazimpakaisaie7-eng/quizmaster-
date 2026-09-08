/* =========================================================
   QUIZ MASTER - QUESTIONS.JS
   =========================================================
   FIX ONLY:
   🚀 Tangira Quiz

   FEATURES:
   - 10 questions per round
   - 20 seconds per question
   - Random questions
   - No duplicate questions in same round
   - Score tracking
   - Correct / Wrong tracking
   - Round 1 -> Round 2 -> Round 3 -> ...
   - Works with questions.json
   - Compatible with existing index.html
   - Does NOT modify Premium / Pi / Leaderboard / Share
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const SECONDS_PER_QUESTION = 20;

  /* =========================================================
     GAME VARIABLES
     ========================================================= */

  let allQuestions = [];
  let roundQuestions = [];

  let currentQuestionIndex = 0;

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let currentRound = 1;

  let timerInterval = null;
  let timeLeft = SECONDS_PER_QUESTION;

  let quizRunning = false;

  let usedQuestions = new Set();

  /* =========================================================
     GET ELEMENT
     ========================================================= */

  function el(id) {
    return document.getElementById(id);
  }

  /* =========================================================
     SHUFFLE
     ========================================================= */

  function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
      const randomIndex =
        Math.floor(Math.random() * (i + 1));

      [copy[i], copy[randomIndex]] =
        [copy[randomIndex], copy[i]];
    }

    return copy;
  }

  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {
    try {
      const response = await fetch("./questions.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          "questions.json ntabwo yabonetse."
        );
      }

      const data = await response.json();

      /*
       * Support:
       * [
       *   {...},
       *   {...}
       * ]
       *
       * OR
       *
       * {
       *   "questions": [...]
       * }
       */

      if (Array.isArray(data)) {
        allQuestions = data;
      } else if (Array.isArray(data.questions)) {
        allQuestions = data.questions;
      } else {
        throw new Error(
          "Format ya questions.json ntabwo ari correct."
        );
      }

      if (!allQuestions.length) {
        throw new Error(
          "questions.json nta bibazo irimo."
        );
      }

      console.log(
        "Quiz Master:",
        allQuestions.length,
        "questions loaded."
      );

      return true;

    } catch (error) {

      console.error(
        "Quiz Master questions error:",
        error
      );

      showError(
        "Ibibazo ntibyashoboye gufunguka. " +
        "Reba ko questions.json iri kumwe na index.html."
      );

      return false;
    }
  }

  /* =========================================================
     NORMALIZE QUESTION
     ========================================================= */

  function normalizeQuestion(q) {

    const questionText =
      q.question ??
      q.questionText ??
      q.text ??
      q.q ??
      "";

    let options =
      q.options ??
      q.answers ??
      q.choices ??
      [];

    let correct =
      q.correctAnswer ??
      q.correct ??
      q.answer ??
      q.correctOption ??
      null;

    /*
     * Support answer objects:
     *
     * {
     *   text: "Kigali",
     *   correct: true
     * }
     */

    if (
      Array.isArray(options) &&
      options.length > 0 &&
      typeof options[0] === "object"
    ) {

      const converted = [];

      options.forEach(function (option) {

        const text =
          option.text ??
          option.label ??
          option.answer ??
          option.value ??
          "";

        converted.push(String(text));

        if (
          option.correct === true ||
          option.isCorrect === true
        ) {
          correct = text;
        }
      });

      options = converted;
    }

    return {
      question: String(questionText),
      options: Array.isArray(options)
        ? options.map(String)
        : [],
      correctAnswer: correct
    };
  }

  /* =========================================================
     PREPARE ROUND
     ========================================================= */

  function prepareRound() {

    if (!allQuestions.length) {
      return false;
    }

    /*
     * If there aren't enough unused questions,
     * reset the used list.
     */

    const remaining =
      allQuestions.length - usedQuestions.size;

    if (remaining < QUESTIONS_PER_ROUND) {
      usedQuestions.clear();
    }

    const availableIndexes = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i++
    ) {
      if (!usedQuestions.has(i)) {
        availableIndexes.push(i);
      }
    }

    const randomIndexes =
      shuffle(availableIndexes);

    const numberToTake =
      Math.min(
        QUESTIONS_PER_ROUND,
        randomIndexes.length
      );

    roundQuestions = [];

    for (
      let i = 0;
      i < numberToTake;
      i++
    ) {

      const index = randomIndexes[i];

      usedQuestions.add(index);

      const question =
        normalizeQuestion(
          allQuestions[index]
        );

      /*
       * Only accept questions that have
       * text + at least 2 options.
       */

      if (
        question.question &&
        question.options.length >= 2
      ) {
        roundQuestions.push(question);
      }
    }

    currentQuestionIndex = 0;

    return roundQuestions.length > 0;
  }

  /* =========================================================
     START QUIZ
     ========================================================= */

  async function startQuiz() {

    console.log(
      "Quiz Master: Tangira Quiz clicked."
    );

    /*
     * Stop any previous timer.
     */

    stopTimer();

    /*
     * Reset quiz state.
     */

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    currentRound = 1;
    currentQuestionIndex = 0;

    usedQuestions.clear();

    quizRunning = true;

    updateScore();

    /*
     * Load questions if needed.
     */

    if (!allQuestions.length) {

      const loaded =
        await loadQuestions();

      if (!loaded) {
        quizRunning = false;
        return;
      }
    }

    /*
     * Prepare first round.
     */

    const ready =
      prepareRound();

    if (!ready) {

      quizRunning = false;

      showError(
        "Nta bibazo bibonetse muri questions.json."
      );

      return;
    }

    /*
     * Show quiz screen.
     */

    showQuizScreen();

    /*
     * IMPORTANT:
     * Show FIRST question immediately.
     */

    showQuestion();
  }

  /* =========================================================
     VERY IMPORTANT FIX
     =========================================================
     Make startQuiz visible to index.html.
     This allows:
     onclick="startQuiz()"
     ========================================================= */

  window.startQuiz = startQuiz;

  /* =========================================================
     SHOW QUIZ SCREEN
     ========================================================= */

  function showQuizScreen() {

    const startScreen =
      el("startScreen");

    const quizScreen =
      el("quizScreen");

    const resultScreen =
      el("resultScreen");

    const errorScreen =
      el("errorScreen");

    if (startScreen) {
      startScreen.style.display = "none";
    }

    if (resultScreen) {
      resultScreen.style.display = "none";
    }

    if (errorScreen) {
      errorScreen.style.display = "none";
    }

    if (quizScreen) {
      quizScreen.style.display = "";
    }
  }

  /* =========================================================
     SHOW QUESTION
     ========================================================= */

  function showQuestion() {

    if (!quizRunning) {
      return;
    }

    if (
      currentQuestionIndex >=
      roundQuestions.length
    ) {
      finishRound();
      return;
    }

    const current =
      roundQuestions[currentQuestionIndex];

    if (!current) {
      finishRound();
      return;
    }

    renderQuestion(current);

    startTimer();
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderQuestion(current) {

    const questionElement =
      el("question");

    const optionsElement =
      el("options");

    const questionNumberElement =
      el("questionNumber");

    /*
     * QUESTION TEXT
     */

    if (questionElement) {

      questionElement.textContent =
        current.question;
    }

    /*
     * QUESTION NUMBER
     */

    if (questionNumberElement) {

      questionNumberElement.textContent =
        "Round " +
        currentRound +
        " - " +
        (currentQuestionIndex + 1) +
        "/" +
        roundQuestions.length;
    }

    /*
     * OPTIONS
     */

    if (!optionsElement) {
      console.error(
        "Element #options ntabwo ibonetse."
      );
      return;
    }

    optionsElement.innerHTML = "";

    /*
     * Shuffle answers without
     * changing the original question.
     */

    const shuffledOptions =
      shuffle(current.options);

    shuffledOptions.forEach(function (answer) {

      const button =
        document.createElement("button");

      button.type = "button";

      /*
       * Keep existing CSS working.
       */

      button.className = "option";

      button.textContent = answer;

      button.addEventListener(
        "click",
        function () {

          selectAnswer(
            answer,
            button
          );
        }
      );

      optionsElement.appendChild(button);
    });
  }

  /* =========================================================
     SELECT ANSWER
     ========================================================= */

  function selectAnswer(
    selectedAnswer,
    clickedButton
  ) {

    if (!quizRunning) {
      return;
    }

    stopTimer();

    const current =
      roundQuestions[currentQuestionIndex];

    if (!current) {
      return;
    }

    const optionsElement =
      el("options");

    /*
     * Disable all answer buttons.
     */

    if (optionsElement) {

      const buttons =
        optionsElement.querySelectorAll(
          "button"
        );

      buttons.forEach(function (button) {
        button.disabled = true;
      });
    }

    /*
     * Check answer.
     */

    const isCorrect =
      checkAnswer(
        selectedAnswer,
        current
      );

    if (isCorrect) {

      correctAnswers++;

      /*
       * Keep simple scoring:
       * +10 per correct answer.
       */

      score += 10;

      if (clickedButton) {
        clickedButton.classList.add(
          "correct"
        );
      }

    } else {

      wrongAnswers++;

      if (clickedButton) {
        clickedButton.classList.add(
          "wrong"
        );
      }

      /*
       * Highlight correct answer.
       */

      showCorrectAnswer(
        current
      );
    }

    updateScore();

    /*
     * Move to next question.
     */

    setTimeout(
      function () {
        nextQuestion();
      },
      600
    );
  }

  /* =========================================================
     CHECK ANSWER
     ========================================================= */

  function checkAnswer(
    selectedAnswer,
    question
  ) {

    const correct =
      question.correctAnswer;

    /*
     * No correct answer supplied.
     */

    if (
      correct === null ||
      correct === undefined
    ) {
      return false;
    }

    /*
     * Correct answer can be a number.
     */

    if (
      typeof correct === "number"
    ) {

      if (
        question.options[
          correct
        ] !== undefined
      ) {

        return normalize(
          selectedAnswer
        ) === normalize(
          question.options[correct]
        );
      }
    }

    /*
     * Correct answer can be A/B/C/D.
     */

    if (
      typeof correct === "string" &&
      /^[ABCD]$/i.test(
        correct.trim()
      )
    ) {

      const letter =
        correct.trim().toUpperCase();

      const index =
        letter.charCodeAt(0) - 65;

      if (
        question.options[index] !==
        undefined
      ) {

        return normalize(
          selectedAnswer
        ) === normalize(
          question.options[index]
        );
      }
    }

    /*
     * Normal text answer.
     */

    return normalize(
      selectedAnswer
    ) === normalize(
      correct
    );
  }

  /* =========================================================
     NORMALIZE TEXT
     ========================================================= */

  function normalize(value) {

    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  /* =========================================================
     SHOW CORRECT ANSWER
     ========================================================= */

  function showCorrectAnswer(
    question
  ) {

    const optionsElement =
      el("options");

    if (!optionsElement) {
      return;
    }

    const buttons =
      optionsElement.querySelectorAll(
        "button"
      );

    buttons.forEach(function (button) {

      if (
        normalize(button.textContent) ===
        normalize(
          question.correctAnswer
        )
      ) {

        button.classList.add(
          "correct"
        );
      }
    });
  }

  /* =========================================================
     NEXT QUESTION
     ========================================================= */

  function nextQuestion() {

    if (!quizRunning) {
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

    showQuestion();
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function startTimer() {

    stopTimer();

    timeLeft =
      SECONDS_PER_QUESTION;

    updateTimer();

    timerInterval =
      setInterval(function () {

        timeLeft--;

        updateTimer();

        if (timeLeft <= 0) {

          timeoutQuestion();
        }

      }, 1000);
  }

  /* =========================================================
     UPDATE TIMER
     ========================================================= */

  function updateTimer() {

    const timer =
      el("timer");

    if (!timer) {
      return;
    }

    timer.textContent =
      timeLeft + "s";
  }

  /* =========================================================
     STOP TIMER
     ========================================================= */

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

  /* =========================================================
     TIME OUT
     ========================================================= */

  function timeoutQuestion() {

    if (!quizRunning) {
      return;
    }

    stopTimer();

    wrongAnswers++;

    const current =
      roundQuestions[
        currentQuestionIndex
      ];

    if (current) {

      showCorrectAnswer(
        current
      );
    }

    updateScore();

    /*
     * Give user a short moment to see
     * the correct answer.
     */

    setTimeout(
      function () {
        nextQuestion();
      },
      600
    );
  }

  /* =========================================================
     UPDATE SCORE
     ========================================================= */

  function updateScore() {

    const scoreElement =
      el("score");

    if (scoreElement) {

      scoreElement.textContent =
        score;
    }
  }

  /* =========================================================
     FINISH ROUND
     ========================================================= */

  function finishRound() {

    stopTimer();

    /*
     * Automatically continue:
     *
     * Round 1
     * Round 2
     * Round 3
     * ...
     */

    currentRound++;

    const ready =
      prepareRound();

    if (!ready) {

      finishQuiz();

      return;
    }

    currentQuestionIndex = 0;

    showQuestion();
  }

  /* =========================================================
     FINISH QUIZ
     ========================================================= */

  function finishQuiz() {

    stopTimer();

    quizRunning = false;

    const quizScreen =
      el("quizScreen");

    const resultScreen =
      el("resultScreen");

    if (quizScreen) {
      quizScreen.style.display = "none";
    }

    if (resultScreen) {
      resultScreen.style.display = "";
    }

    /*
     * Update common result elements
     * only if they exist.
     */

    const finalScore =
      el("finalScore");

    const correctElement =
      el("correctAnswers");

    const wrongElement =
      el("wrongAnswers");

    if (finalScore) {
      finalScore.textContent =
        score;
    }

    if (correctElement) {
      correctElement.textContent =
        correctAnswers;
    }

    if (wrongElement) {
      wrongElement.textContent =
        wrongAnswers;
    }

    saveScore();
  }

  /* =========================================================
     SAVE SCORE
     ========================================================= */

  function saveScore() {

    try {

      const oldScores =
        JSON.parse(
          localStorage.getItem(
            "quizmaster_scores"
          ) || "[]"
        );

      oldScores.push({
        score: score,
        correct: correctAnswers,
        wrong: wrongAnswers,
        round: currentRound,
        date:
          new Date().toISOString()
      });

      /*
       * Keep latest 50 scores.
       */

      const scores =
        oldScores.slice(-50);

      localStorage.setItem(
        "quizmaster_scores",
        JSON.stringify(scores)
      );

    } catch (error) {

      console.warn(
        "Score ntiyabitswe:",
        error
      );
    }
  }

  /* =========================================================
     ERROR
     ========================================================= */

  function showError(message) {

    const errorScreen =
      el("errorScreen");

    const errorMessage =
      el("errorMessage");

    if (errorMessage) {
      errorMessage.textContent =
        message;
    }

    if (errorScreen) {
      errorScreen.style.display = "";
    }
  }

  /* =========================================================
     START BUTTON
     =========================================================
     This is the main fix.
     ========================================================= */

  function connectStartButton() {

    const startButton =
      el("startBtn");

    if (!startButton) {

      console.warn(
        "Tangira Quiz button #startBtn ntiyabonetse."
      );

      return;
    }

    /*
     * Prevent duplicate listeners.
     */

    if (
      startButton.dataset.quizConnected ===
      "true"
    ) {
      return;
    }

    startButton.dataset.quizConnected =
      "true";

    startButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        event.stopPropagation();

        startQuiz();
      }
    );

    console.log(
      "Quiz Master: #startBtn connected."
    );
  }

  /* =========================================================
     RESTART BUTTON
     ========================================================= */

  function connectRestartButton() {

    const restartButton =
      el("restartBtn");

    if (!restartButton) {
      return;
    }

    if (
      restartButton.dataset.quizConnected ===
      "true"
    ) {
      return;
    }

    restartButton.dataset.quizConnected =
      "true";

    restartButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        startQuiz();
      }
    );
  }

  /* =========================================================
     NEXT BUTTON
     ========================================================= */

  function connectNextButton() {

    const nextButton =
      el("nextBtn");

    if (!nextButton) {
      return;
    }

    if (
      nextButton.dataset.quizConnected ===
      "true"
    ) {
      return;
    }

    nextButton.dataset.quizConnected =
      "true";

    nextButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        nextQuestion();
      }
    );
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function initialize() {

    /*
     * Connect buttons.
     */

    connectStartButton();
    connectRestartButton();
    connectNextButton();

    /*
     * Load questions in background.
     */

    await loadQuestions();

    /*
     * Connect again in case the HTML
     * was rendered dynamically.
     */

    connectStartButton();
    connectRestartButton();
    connectNextButton();

    console.log(
      "Quiz Master Questions Manager ready."
    );

    console.log(
      "window.startQuiz:",
      typeof window.startQuiz
    );
  }

  /* =========================================================
     DOM READY
     ========================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();
  }

  /* =========================================================
     PUBLIC QUIZ MANAGER
     ========================================================= */

  window.questionManager = {

    startQuiz: startQuiz,

    loadQuestions: loadQuestions,

    showQuestion: showQuestion,

    nextQuestion: nextQuestion,

    selectAnswer: selectAnswer,

    timeoutQuestion: timeoutQuestion,

    finishQuiz: finishQuiz,

    getScore: function () {
      return score;
    },

    getRound: function () {
      return currentRound;
    },

    getCorrectAnswers: function () {
      return correctAnswers;
    },

    getWrongAnswers: function () {
      return wrongAnswers;
    }

  };

})();
