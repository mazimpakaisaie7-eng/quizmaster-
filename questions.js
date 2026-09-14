/*
  let       } 
          timeLeft--;

          
    const timer =
      b 
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
     * Do NOT immediately start another round.
     *
     * Show the existing result screen.
     * The existing restartBtn will start
     * the next round.
     */

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
     * Existing index.html uses:
     * #finishedRound
     * #score
     * #resultMessage
     * #correctCount
     * #wrongCount
     */

    const finishedRound =
      el("finishedRound");

    if (finishedRound) {

      finishedRound.textContent =
        currentRound;
    }

    const scoreElement =
      el("score");

    if (scoreElement) {

      scoreElement.textContent =
        score;
    }

    const correctCount =
      el("correctCount");

    if (correctCount) {

      correctCount.textContent =
        correctAnswers;
    }

    const wrongCount =
      el("wrongCount");

    if (wrongCount) {

      wrongCount.textContent =
        wrongAnswers;
    }

    const resultMessage =
      el("resultMessage");

    if (resultMessage) {

      resultMessage.textContent =
        "Round " +
        currentRound +
        " irangiye! " +
        "Kanda kuri 'Komeza kuri Round ikurikira' gukomeza.";
    }

    /*
     * Also support alternate IDs if present.
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
     START NEXT ROUND
     ========================================================= */

  function startNextRound() {

    stopTimer();

    /*
     * Move to next round.
     */
    currentRound++;

    /*
     * Prepare next set.
     */
    const ready =
      prepareRound();

    if (!ready) {

      showError(
        "Nta bibazo bihagije bibonetse muri questions.json."
      );

      return;
    }

    quizRunning = true;

    showQuizScreen();

    showQuestion();
  }

  /* =========================================================
     RESTART / NEXT ROUND BUTTON
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

        /*
         * Existing button means:
         * "Komeza kuri Round ikurikira"
         */

        startNextRound();
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
     START BUTTON
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
     * Prevent duplicate connection
     * inside questions.js.
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

        /*
         * Do not stopPropagation here.
         *
         * This allows the existing index.html
         * start button listener to continue working
         * if it is present.
         */

        startQuiz();
      }
    );

    console.log(
      "Quiz Master: #startBtn connected."
    );
  }

  /* =========================================================
     ERROR
     ========================================================= */

  function showError(message) {

    stopTimer();

    quizRunning = false;

    const startScreen =
      el("startScreen");

    const quizScreen =
      el("quizScreen");

    const resultScreen =
      el("resultScreen");

    const errorScreen =
      el("errorScreen");

    const errorMessage =
      el("errorMessage");

    if (startScreen) {
      startScreen.style.display = "none";
    }

    if (quizScreen) {
      quizScreen.style.display = "none";
    }

    if (resultScreen) {
      resultScreen.style.display = "none";
    }

    if (errorMessage) {
      errorMessage.textContent =
        message;
    }

    if (errorScreen) {
      errorScreen.style.display = "";
    }
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
       * Keep latest 50 records.
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
     * IMPORTANT:
     * We do NOT show an error just because
     * questions.json is still loading.
     *
     * startQuiz() can load it when the user
     * presses the button.
     */

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

    finishQuiz: finishRound,

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
