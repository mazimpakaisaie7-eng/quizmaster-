/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS.JS
   Fully compatible with the provided index.html
   ========================================================= */

(function () {
  "use strict";

  /* =========================
     QUIZ SETTINGS
     ========================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const QUESTIONS_FILE = "./questions.json";

  /* =========================
     QUIZ STATE
     ========================= */

  let questions = [];
  let currentRoundQuestions = [];
  let currentQuestionIndex = 0;

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let roundNumber = 1;
  let timerInterval = null;
  let timeLeft = TIME_PER_QUESTION;

  let answered = false;
  let quizStarted = false;

  /*
   * Stores questions already used.
   * Questions will not repeat until the whole
   * question bank has been used.
   */
  let usedQuestionIndexes = new Set();


  /* =========================
     DOM HELPERS
     ========================= */

  function getElement(id) {
    return document.getElementById(id);
  }


  function showScreen(screenId) {
    const screens = [
      "startScreen",
      "quizScreen",
      "resultScreen",
      "errorScreen"
    ];

    screens.forEach(function (id) {
      const element = getElement(id);

      if (element) {
        element.classList.add("hidden");
      }
    });

    const target = getElement(screenId);

    if (target) {
      target.classList.remove("hidden");
    }
  }


  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {

    try {

      const response = await fetch(
        QUESTIONS_FILE + "?v=" + Date.now(),
        {
          method: "GET",
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          "questions.json could not be loaded. HTTP status: " +
          response.status
        );
      }

      const data = await response.json();

      /*
       * Accept both formats:
       *
       * [
       *   {...},
       *   {...}
       * ]
       *
       * OR
       *
       * {
       *   "questions": [
       *     {...}
       *   ]
       * }
       */

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


      /* Remove invalid questions */

      questions = questions.filter(function (q) {

        if (!q || typeof q !== "object") {
          return false;
        }

        if (
          typeof q.question !== "string" ||
          q.question.trim() === ""
        ) {
          return false;
        }

        if (
          !Array.isArray(q.options) ||
          q.options.length < 2
        ) {
          return false;
        }

        if (
          typeof q.answer !== "string" ||
          q.answer.trim() === ""
        ) {
          return false;
        }

        return true;
      });


      if (questions.length === 0) {
        throw new Error(
          "No valid questions were found in questions.json."
        );
      }


      return true;

    } catch (error) {

      console.error(
        "Quiz Master question loading error:",
        error
      );

      showError(
        "The quiz questions could not be loaded. Please check that questions.json is in the same folder as index.html and contains valid JSON."
      );

      return false;
    }
  }


  /* =========================
     SHUFFLE
     ========================= */

  function shuffle(array) {

    const copy = array.slice();

    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {

      const j = Math.floor(
        Math.random() * (i + 1)
      );

      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }


  /* =========================
     GET NEXT QUESTIONS
     ========================= */

  function createRoundQuestions() {

    /*
     * If the remaining questions are fewer than
     * 10, use all remaining questions.
     *
     * When there are no remaining questions,
     * start a new cycle.
     */

    let availableIndexes = [];

    for (
      let i = 0;
      i < questions.length;
      i++
    ) {

      if (!usedQuestionIndexes.has(i)) {
        availableIndexes.push(i);
      }
    }


    /*
     * Start a new cycle only after all questions
     * have been used.
     */

    if (availableIndexes.length === 0) {

      usedQuestionIndexes.clear();

      for (
        let i = 0;
        i < questions.length;
        i++
      ) {
        availableIndexes.push(i);
      }
    }


    availableIndexes = shuffle(
      availableIndexes
    );


    const selectedIndexes =
      availableIndexes.slice(
        0,
        Math.min(
          QUESTIONS_PER_ROUND,
          availableIndexes.length
        )
      );


    currentRoundQuestions =
      selectedIndexes.map(function (index) {

        usedQuestionIndexes.add(index);

        return questions[index];
      });


    currentQuestionIndex = 0;
  }


  /* =========================
     START QUIZ
     ========================= */

  async function startQuiz() {

    try {

      clearTimer();

      /*
       * Load questions if they have not been loaded yet.
       */

      if (!questions.length) {

        const loaded = await loadQuestions();

        if (!loaded) {
          return;
        }
      }


      if (!questions.length) {

        showError(
          "No quiz questions are available."
        );

        return;
      }


      quizStarted = true;

      score = 0;
      correctAnswers = 0;
      wrongAnswers = 0;


      /*
       * Create the first round.
       */

      createRoundQuestions();


      if (
        !currentRoundQuestions ||
        currentRoundQuestions.length === 0
      ) {

        showError(
          "The quiz could not create a question round."
        );

        return;
      }


      /*
       * Reset score display.
       */

      const scoreElement = getElement("score");

      if (scoreElement) {
        scoreElement.textContent = "0";
      }


      showScreen("quizScreen");

      displayCurrentQuestion();

    } catch (error) {

      console.error(
        "Quiz start error:",
        error
      );

      showError(
        "The quiz could not start. Please try again."
      );
    }
  }


  /* =========================
     DISPLAY QUESTION
     ========================= */

  function displayCurrentQuestion() {

    clearTimer();

    answered = false;


    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];


    if (!question) {

      finishRound();

      return;
    }


    /* Question number */

    const questionNumber =
      getElement("questionNumber");

    if (questionNumber) {

      questionNumber.textContent =
        "Question " +
        (currentQuestionIndex + 1) +
        "/" +
        currentRoundQuestions.length;
    }


    /* Progress bar */

    const progressBar =
      getElement("progressBar");

    if (progressBar) {

      const progress =
        (
          currentQuestionIndex /
          currentRoundQuestions.length
        ) * 100;

      progressBar.style.width =
        progress + "%";
    }


    /* Question text */

    const questionElement =
      getElement("question");

    if (questionElement) {

      /*
       * English question is preferred.
       */

      let questionText =
        question.question;

      /*
       * If question.question is missing,
       * allow question_rw as fallback.
       */

      if (
        (!questionText ||
          typeof questionText !== "string") &&
        typeof question.question_rw === "string"
      ) {
        questionText =
          question.question_rw;
      }


      questionElement.textContent =
        questionText || "Question unavailable.";
    }


    /* Options */

    displayOptions(question);


    /* Hide Next button until answer */

    const nextBtn =
      getElement("nextBtn");

    if (nextBtn) {
      nextBtn.classList.add("hidden");
    }


    /* Timer */

    timeLeft = TIME_PER_QUESTION;

    updateTimerDisplay();

    startTimer();
  }


  /* =========================
     DISPLAY OPTIONS
     ========================= */

  function displayOptions(question) {

    const optionsContainer =
      getElement("options");

    if (!optionsContainer) {
      return;
    }


    optionsContainer.innerHTML = "";


    const options =
      shuffle(question.options);


    options.forEach(function (optionText) {

      const button =
        document.createElement("button");

      button.type = "button";

      button.className = "option";

      button.textContent =
        String(optionText);


      button.addEventListener(
        "click",
        function () {

          handleAnswer(
            String(optionText),
            button,
            question
          );
        }
      );


      optionsContainer.appendChild(button);
    });
  }


  /* =========================
     ANSWER QUESTION
     ========================= */

  function handleAnswer(
    selectedAnswer,
    selectedButton,
    question
  ) {

    if (answered) {
      return;
    }


    answered = true;

    clearTimer();


    const optionButtons =
      document.querySelectorAll(
        "#options .option"
      );


    optionButtons.forEach(function (button) {

      button.disabled = true;

      const buttonText =
        button.textContent.trim();

      const correctAnswer =
        String(question.answer).trim();


      if (
        buttonText === correctAnswer
      ) {
        button.classList.add(
          "correct"
        );
      }
    });


    const correctAnswer =
      String(question.answer).trim();


    const selected =
      String(selectedAnswer).trim();


    if (selected === correctAnswer) {

      correctAnswers++;

      score += POINTS_PER_CORRECT;

      selectedButton.classList.add(
        "correct"
      );

    } else {

      wrongAnswers++;

      selectedButton.classList.add(
        "wrong"
      );
    }


    updateScoreDisplay();


    /*
     * Show Next Question button.
     */

    const nextBtn =
      getElement("nextBtn");

    if (nextBtn) {

      nextBtn.textContent =
        currentQuestionIndex <
        currentRoundQuestions.length - 1
          ? "Next Question"
          : "Finish Round";

      nextBtn.classList.remove(
        "hidden"
      );
    }
  }


  /* =========================
     TIMER
     ========================= */

  function startTimer() {

    clearTimer();


    timerInterval =
      setInterval(function () {

        timeLeft--;

        updateTimerDisplay();


        if (timeLeft <= 0) {

          clearTimer();

          handleTimeout();
        }

      }, 1000);
  }


  function clearTimer() {

    if (timerInterval !== null) {

      clearInterval(
        timerInterval
      );

      timerInterval = null;
    }
  }


  function updateTimerDisplay() {

    const timer =
      getElement("timer");

    if (timer) {

      timer.textContent =
        String(
          Math.max(0, timeLeft)
        );
    }
  }


  /* =========================
     TIMEOUT
     ========================= */

  function handleTimeout() {

    if (answered) {
      return;
    }


    answered = true;

    wrongAnswers++;


    const currentQuestion =
      currentRoundQuestions[
        currentQuestionIndex
      ];


    const optionButtons =
      document.querySelectorAll(
        "#options .option"
      );


    optionButtons.forEach(function (button) {

      button.disabled = true;


      if (
        currentQuestion &&
        button.textContent.trim() ===
        String(
          currentQuestion.answer
        ).trim()
      ) {

        button.classList.add(
          "correct"
        );
      }
    });


    updateScoreDisplay();


    const nextBtn =
      getElement("nextBtn");

    if (nextBtn) {

      nextBtn.textContent =
        currentQuestionIndex <
        currentRoundQuestions.length - 1
          ? "Next Question"
          : "Finish Round";

      nextBtn.classList.remove(
        "hidden"
      );
    }
  }


  /* =========================
     NEXT QUESTION
     ========================= */

  function nextQuestion() {

    if (!quizStarted) {
      return;
    }


    clearTimer();


    if (
      currentQuestionIndex <
      currentRoundQuestions.length - 1
    ) {

      currentQuestionIndex++;

      displayCurrentQuestion();

    } else {

      finishRound();
    }
  }


  /* =========================
     FINISH ROUND
     ========================= */

  function finishRound() {

    clearTimer();

    quizStarted = false;

    showScreen("resultScreen");


    const finalScore =
      getElement("finalScore");

    if (finalScore) {
      finalScore.textContent =
        String(score);
    }


    const correctCount =
      getElement("correctCount");

    if (correctCount) {
      correctCount.textContent =
        String(correctAnswers);
    }


    const wrongCount =
      getElement("wrongCount");

    if (wrongCount) {
      wrongCount.textContent =
        String(wrongAnswers);
    }


    const finishedRound =
      getElement("finishedRound");

    if (finishedRound) {
      finishedRound.textContent =
        String(
          currentRoundQuestions.length
        );
    }


    const resultMessage =
      getElement("resultMessage");

    if (resultMessage) {

      const total =
        currentRoundQuestions.length;

      const percentage =
        total > 0
          ? Math.round(
              (correctAnswers / total) * 100
            )
          : 0;


      if (percentage >= 90) {

        resultMessage.textContent =
          "Excellent! Outstanding performance!";

      } else if (percentage >= 70) {

        resultMessage.textContent =
          "Great job! Keep learning!";

      } else if (percentage >= 50) {

        resultMessage.textContent =
          "Good effort! You can do even better!";

      } else {

        resultMessage.textContent =
          "Keep practicing and try again!";
      }
    }


    roundNumber++;
  }


  /* =========================
     UPDATE SCORE
     ========================= */

  function updateScoreDisplay() {

    const scoreElement =
      getElement("score");

    if (scoreElement) {

      scoreElement.textContent =
        String(score);
    }
  }


  /* =========================
     CONTINUE NEXT ROUND
     ========================= */

  function restartQuiz() {

    clearTimer();

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    quizStarted = true;


    /*
     * Do NOT clear usedQuestionIndexes here.
     *
     * This prevents questions from repeating
     * until the entire question bank is used.
     */

    createRoundQuestions();


    const scoreElement =
      getElement("score");

    if (scoreElement) {
      scoreElement.textContent = "0";
    }


    showScreen("quizScreen");

    displayCurrentQuestion();
  }


  /* =========================
     ERROR SCREEN
     ========================= */

  function showError(message) {

    clearTimer();

    quizStarted = false;


    const errorMessage =
      getElement("errorMessage");

    if (errorMessage) {

      errorMessage.textContent =
        message;
    }


    showScreen("errorScreen");
  }


  /* =========================
     BUTTON CONNECTIONS
     ========================= */

  function connectButtons() {

    /*
     * START BUTTON
     *
     * index.html already calls
     * window.startQuiz().
     *
     * We do not add another click event
     * here to avoid duplicate starts.
     */


    const nextBtn =
      getElement("nextBtn");

    if (nextBtn) {

      nextBtn.addEventListener(
        "click",
        function () {
          nextQuestion();
        }
      );
    }


    const restartBtn =
      getElement("restartBtn");

    if (restartBtn) {

      restartBtn.addEventListener(
        "click",
        function () {
          restartQuiz();
        }
      );
    }


    const errorRestartBtn =
      getElement("errorRestartBtn");

    if (errorRestartBtn) {

      errorRestartBtn.addEventListener(
        "click",
        function () {

          /*
           * Try loading the questions again
           * without requiring a full page reload.
           */

          showScreen("startScreen");
        }
      );
    }
  }


  /* =========================
     PUBLIC API
     ========================= */

  /*
   * THIS IS THE MOST IMPORTANT PART.
   *
   * index.html checks:
   *
   * typeof window.startQuiz === "function"
   *
   * Therefore startQuiz MUST be global.
   */

  window.startQuiz = startQuiz;


  /*
   * Optional public functions.
   */

  window.nextQuestion = nextQuestion;

  window.restartQuiz = restartQuiz;


  /* =========================
     INITIALIZATION
     ========================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      connectButtons();

      /*
       * Do not automatically start the quiz.
       *
       * The user must press:
       * 🚀 Start Quiz
       */
    }
  );


})();
