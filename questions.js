/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS.JS

   Features:
   - Start Quiz
   - Continue Quiz
   - Pause & Save
   - Automatic progress saving
   - Resume after refresh/browser close
   - Score saving
   - Timer saving
   - Used-question saving
   - No question repeats until cycle ends
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
     LOCAL STORAGE
     ========================= */

  const SAVE_KEY =
    "quizmaster_saved_progress_v1";


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

  let timerStartedAt = null;

  let answered = false;

  let savedSelectedAnswer = null;

  let quizStarted = false;


  /*
   * Stores questions already used.
   *
   * Questions will not repeat until the
   * whole question bank has been used.
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

      const element =
        getElement(id);


      if (element) {

        element.classList.add(
          "hidden"
        );

      }

    });


    const target =
      getElement(screenId);


    if (target) {

      target.classList.remove(
        "hidden"
      );

    }

  }


  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {

    try {

      const response =
        await fetch(
          QUESTIONS_FILE +
          "?v=" +
          Date.now(),
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


      const data =
        await response.json();


      /*
       * Accept both:
       *
       * [
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

        questions = data;

      } else if (
        data &&
        Array.isArray(data.questions)
      ) {

        questions =
          data.questions;

      } else {

        throw new Error(
          "questions.json must contain an array of questions."
        );

      }


      /* =========================
         REMOVE INVALID QUESTIONS
         ========================= */

      questions =
        questions.filter(
          function (q) {

            if (
              !q ||
              typeof q !== "object"
            ) {

              return false;

            }


            if (
              typeof q.question !==
              "string" ||
              q.question.trim() === ""
            ) {

              return false;

            }


            if (
              !Array.isArray(
                q.options
              ) ||
              q.options.length < 2
            ) {

              return false;

            }


            if (
              typeof q.answer !==
              "string" ||
              q.answer.trim() === ""
            ) {

              return false;

            }


            return true;

          }
        );


      if (
        questions.length === 0
      ) {

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

    const copy =
      array.slice();


    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );


      const temp =
        copy[i];


      copy[i] =
        copy[j];


      copy[j] =
        temp;

    }


    return copy;

  }


  /* =========================
     CREATE ROUND
     ========================= */

  function createRoundQuestions() {

    let availableIndexes = [];


    for (
      let i = 0;
      i < questions.length;
      i++
    ) {

      if (
        !usedQuestionIndexes.has(i)
      ) {

        availableIndexes.push(i);

      }

    }


    /*
     * If all questions have been used,
     * start a new cycle.
     */

    if (
      availableIndexes.length === 0
    ) {

      usedQuestionIndexes.clear();


      for (
        let i = 0;
        i < questions.length;
        i++
      ) {

        availableIndexes.push(i);

      }

    }


    availableIndexes =
      shuffle(
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
      selectedIndexes.map(
        function (index) {

          usedQuestionIndexes.add(
            index
          );


          return questions[index];

        }
      );


    currentQuestionIndex = 0;

  }


  /* =========================
     START NEW QUIZ
     ========================= */

  async function startQuiz() {

    try {

      clearTimer();


      /*
       * IMPORTANT:
       *
       * Start Quiz means START NEW QUIZ.
       *
       * Any old saved progress is removed.
       */

      clearSavedProgress();


      /*
       * Load questions if needed.
       */

      if (
        !questions.length
      ) {

        const loaded =
          await loadQuestions();


        if (!loaded) {

          return;

        }

      }


      if (
        !questions.length
      ) {

        showError(
          "No quiz questions are available."
        );

        return;

      }


      quizStarted = true;


      score = 0;

      correctAnswers = 0;

      wrongAnswers = 0;

      roundNumber = 1;

      usedQuestionIndexes =
        new Set();


      /*
       * Create first round.
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


      const scoreElement =
        getElement("score");


      if (scoreElement) {

        scoreElement.textContent =
          "0";

      }


      showScreen(
        "quizScreen"
      );


      displayCurrentQuestion();


      saveProgress();


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

    savedSelectedAnswer =
      null;


    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];


    if (!question) {

      finishRound();

      return;

    }


    /* =========================
       QUESTION NUMBER
       ========================= */

    const questionNumber =
      getElement(
        "questionNumber"
      );


    if (questionNumber) {

      questionNumber.textContent =
        "Question " +
        (
          currentQuestionIndex + 1
        ) +
        "/" +
        currentRoundQuestions.length;

    }


    /* =========================
       PROGRESS
       ========================= */

    const progressBar =
      getElement(
        "progressBar"
      );


    if (progressBar) {

      const progress =
        (
          currentQuestionIndex /
          currentRoundQuestions.length
        ) * 100;


      progressBar.style.width =
        progress + "%";

    }


    /* =========================
       QUESTION TEXT
       ========================= */

    const questionElement =
      getElement(
        "question"
      );


    if (questionElement) {

      let questionText =
        question.question;


      /*
       * English is preferred.
       */

      if (
        (
          !questionText ||
          typeof questionText !==
          "string"
        ) &&
        typeof question.question_rw ===
        "string"
      ) {

        questionText =
          question.question_rw;

      }


      questionElement.textContent =
        questionText ||
        "Question unavailable.";

    }


    /* =========================
       OPTIONS
       ========================= */

    displayOptions(
      question
    );


    /* =========================
       NEXT BUTTON
       ========================= */

    const nextBtn =
      getElement(
        "nextBtn"
      );


    if (nextBtn) {

      nextBtn.classList.add(
        "hidden"
      );

    }


    /* =========================
       TIMER
       ========================= */

    timeLeft =
      TIME_PER_QUESTION;


    timerStartedAt =
      Date.now();


    updateTimerDisplay();


    startTimer();


    /*
     * Save current question.
     */

    saveProgress();

  }


  /* =========================
     DISPLAY OPTIONS
     ========================= */

  function displayOptions(
    question
  ) {

    const optionsContainer =
      getElement(
        "options"
      );


    if (!optionsContainer) {

      return;

    }


    optionsContainer.innerHTML =
      "";


    const options =
      shuffle(
        question.options
      );


    options.forEach(
      function (optionText) {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "option";


        button.textContent =
          String(
            optionText
          );


        button.addEventListener(
          "click",
          function () {

            handleAnswer(
              String(
                optionText
              ),
              button,
              question
            );

          }
        );


        optionsContainer.appendChild(
          button
        );

      }
    );

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


    savedSelectedAnswer =
      String(
        selectedAnswer
      );


    clearTimer();


    const optionButtons =
      document.querySelectorAll(
        "#options .option"
      );


    optionButtons.forEach(
      function (button) {

        button.disabled =
          true;


        const buttonText =
          button.textContent.trim();


        const correctAnswer =
          String(
            question.answer
          ).trim();


        if (
          buttonText ===
          correctAnswer
        ) {

          button.classList.add(
            "correct"
          );

        }

      }
    );


    const correctAnswer =
      String(
        question.answer
      ).trim();


    const selected =
      String(
        selectedAnswer
      ).trim();


    if (
      selected ===
      correctAnswer
    ) {

      correctAnswers++;


      score +=
        POINTS_PER_CORRECT;


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


    const nextBtn =
      getElement(
        "nextBtn"
      );


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


    /*
     * Save immediately after answer.
     */

    saveProgress();

  }


  /* =========================
     TIMER
     ========================= */

  function startTimer() {

    clearTimer();


    timerStartedAt =
      Date.now();


    timerInterval =
      setInterval(
        function () {

          timeLeft--;


          updateTimerDisplay();


          saveProgress();


          if (
            timeLeft <= 0
          ) {

            clearTimer();


            handleTimeout();

          }

        },
        1000
      );

  }


  function clearTimer() {

    if (
      timerInterval !==
      null
    ) {

      clearInterval(
        timerInterval
      );


      timerInterval =
        null;

    }

  }


  function updateTimerDisplay() {

    const timer =
      getElement(
        "timer"
      );


    if (timer) {

      timer.textContent =
        String(
          Math.max(
            0,
            timeLeft
          )
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


    savedSelectedAnswer =
      null;


    wrongAnswers++;


    const currentQuestion =
      currentRoundQuestions[
        currentQuestionIndex
      ];


    const optionButtons =
      document.querySelectorAll(
        "#options .option"
      );


    optionButtons.forEach(
      function (button) {

        button.disabled =
          true;


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

      }
    );


    updateScoreDisplay();


    const nextBtn =
      getElement(
        "nextBtn"
      );


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


    saveProgress();

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


    /*
     * VERY IMPORTANT:
     *
     * Remove saved progress because
     * this round has been completed.
     */

    clearSavedProgress();


    showScreen(
      "resultScreen"
    );


    const finalScore =
      getElement(
        "finalScore"
      );


    if (finalScore) {

      finalScore.textContent =
        String(
          score
        );

    }


    const correctCount =
      getElement(
        "correctCount"
      );


    if (correctCount) {

      correctCount.textContent =
        String(
          correctAnswers
        );

    }


    const wrongCount =
      getElement(
        "wrongCount"
      );


    if (wrongCount) {

      wrongCount.textContent =
        String(
          wrongAnswers
        );

    }


    const finishedRound =
      getElement(
        "finishedRound"
      );


    if (finishedRound) {

      finishedRound.textContent =
        String(
          currentRoundQuestions.length
        );

    }


    const resultMessage =
      getElement(
        "resultMessage"
      );


    if (resultMessage) {

      const total =
        currentRoundQuestions.length;


      const percentage =
        total > 0
          ? Math.round(
              (
                correctAnswers /
                total
              ) * 100
            )
          : 0;


      if (
        percentage >= 90
      ) {

        resultMessage.textContent =
          "Excellent! Outstanding performance!";


      } else if (
        percentage >= 70
      ) {

        resultMessage.textContent =
          "Great job! Keep learning!";


      } else if (
        percentage >= 50
      ) {

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
      getElement(
        "score"
      );


    if (scoreElement) {

      scoreElement.textContent =
        String(
          score
        );

    }

  }


  /* =========================
     CONTINUE NEXT ROUND
     ========================= */

  function restartQuiz() {

    clearTimer();


    /*
     * Do NOT clear usedQuestionIndexes.
     *
     * This prevents questions from
     * repeating until the question bank
     * cycle is complete.
     */

    score = 0;

    correctAnswers = 0;

    wrongAnswers = 0;

    quizStarted = true;


    createRoundQuestions();


    const scoreElement =
      getElement(
        "score"
      );


    if (scoreElement) {

      scoreElement.textContent =
        "0";

    }


    showScreen(
      "quizScreen"
    );


    displayCurrentQuestion();


    saveProgress();

  }


  /* =========================
     PAUSE & SAVE
     ========================= */

  function pauseQuiz() {

    if (!quizStarted) {

      return;

    }


    /*
     * Save everything before leaving.
     */

    saveProgress();


    clearTimer();


    quizStarted = false;


    showScreen(
      "startScreen"
    );


    refreshContinueButton();

  }


  /* =========================
     SAVE PROGRESS
     ========================= */

  function saveProgress() {

    try {

      if (
        !quizStarted &&
        !currentRoundQuestions.length
      ) {

        return;

      }


      /*
       * Save only the data required
       * to restore the quiz.
       */

      const progress = {

        version: 1,

        quizStarted:
          quizStarted,

        currentRoundQuestions:
          currentRoundQuestions,

        currentQuestionIndex:
          currentQuestionIndex,

        score:
          score,

        correctAnswers:
          correctAnswers,

        wrongAnswers:
          wrongAnswers,

        roundNumber:
          roundNumber,

        usedQuestionIndexes:
          Array.from(
            usedQuestionIndexes
          ),

        timeLeft:
          timeLeft,

        timerStartedAt:
          timerStartedAt,

        answered:
          answered,

        selectedAnswer:
          savedSelectedAnswer,

        savedAt:
          Date.now()

      };


      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(
          progress
        )
      );


      refreshContinueButton();


    } catch (error) {

      console.warn(
        "Quiz progress could not be saved:",
        error
      );

    }

  }


  /* =========================
     LOAD SAVED PROGRESS
     ========================= */

  function getSavedProgress() {

    try {

      const raw =
        localStorage.getItem(
          SAVE_KEY
        );


      if (!raw) {

        return null;

      }


      const progress =
        JSON.parse(
          raw
        );


      if (
        !progress ||
        typeof progress !==
        "object"
      ) {

        return null;

      }


      if (
        !Array.isArray(
          progress.currentRoundQuestions
        )
      ) {

        return null;

      }


      if (
        progress.currentRoundQuestions.length === 0
      ) {

        return null;

      }


      return progress;


    } catch (error) {

      console.warn(
        "Saved quiz progress is invalid:",
        error
      );


      clearSavedProgress();


      return null;

    }

  }


  /* =========================
     CONTINUE QUIZ
     ========================= */

  async function continueQuiz() {

    try {

      clearTimer();


      let progress =
        getSavedProgress();


      if (!progress) {

        startQuiz();

        return;

      }


      /*
       * Load questions if necessary.
       */

      if (
        !questions.length
      ) {

        const loaded =
          await loadQuestions();


        if (!loaded) {

          return;

        }

      }


      /*
       * Restore saved state.
       */

      currentRoundQuestions =
        progress.currentRoundQuestions;


      currentQuestionIndex =
        Number(
          progress.currentQuestionIndex
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


      roundNumber =
        Number(
          progress.roundNumber
        ) || 1;


      usedQuestionIndexes =
        new Set(
          Array.isArray(
            progress.usedQuestionIndexes
          )
            ? progress.usedQuestionIndexes
            : []
        );


      timeLeft =
        Number(
          progress.timeLeft
        );


      if (
        !Number.isFinite(
          timeLeft
        )
      ) {

        timeLeft =
          TIME_PER_QUESTION;

      }


      answered =
        progress.answered === true;


      savedSelectedAnswer =
        progress.selectedAnswer ||
        null;


      quizStarted = true;


      /*
       * Make sure question index
       * is valid.
       */

      if (
        currentQuestionIndex < 0 ||
        currentQuestionIndex >=
        currentRoundQuestions.length
      ) {

        currentQuestionIndex = 0;

      }


      /*
       * Calculate how much time passed
       * while the app was closed.
       */

      let elapsedSeconds = 0;


      if (
        progress.timerStartedAt
      ) {

        const elapsed =
          Date.now() -
          Number(
            progress.timerStartedAt
          );


        if (
          Number.isFinite(
            elapsed
          ) &&
          elapsed > 0
        ) {

          elapsedSeconds =
            Math.floor(
              elapsed / 1000
            );

        }

      }


      /*
       * If the question was already answered,
       * do not reduce its timer.
       *
       * If it was not answered, reduce the
       * saved timer according to elapsed time.
       */

      if (!answered) {

        timeLeft =
          Math.max(
            0,
            timeLeft -
            elapsedSeconds
          );

      }


      showScreen(
        "quizScreen"
      );


      /*
       * Restore the current question.
       */

      displayRestoredQuestion();


      /*
       * If the saved timer already expired,
       * mark the question as timed out.
       */

      if (
        !answered &&
        timeLeft <= 0
      ) {

        timeLeft = 0;

        updateTimerDisplay();

        handleTimeout();

        return;

      }


      /*
       * If already answered, don't start timer.
       */

      if (answered) {

        clearTimer();

        return;

      }


      /*
       * Continue countdown.
       */

      timerStartedAt =
        Date.now();


      updateTimerDisplay();


      startTimer();


      saveProgress();


    } catch (error) {

      console.error(
        "Continue quiz error:",
        error
      );


      showError(
        "The saved quiz could not be restored. Please start a new quiz."
      );

    }

  }


  /* =========================
     DISPLAY RESTORED QUESTION
     ========================= */

  function displayRestoredQuestion() {

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];


    if (!question) {

      finishRound();

      return;

    }


    /* =========================
       QUESTION NUMBER
       ========================= */

    const questionNumber =
      getElement(
        "questionNumber"
      );


    if (questionNumber) {

      questionNumber.textContent =
        "Question " +
        (
          currentQuestionIndex + 1
        ) +
        "/" +
        currentRoundQuestions.length;

    }


    /* =========================
       PROGRESS
       ========================= */

    const progressBar =
      getElement(
        "progressBar"
      );


    if (progressBar) {

      const progress =
        (
          currentQuestionIndex /
          currentRoundQuestions.length
        ) * 100;


      progressBar.style.width =
        progress + "%";

    }


    /* =========================
       QUESTION
       ========================= */

    const questionElement =
      getElement(
        "question"
      );


    if (questionElement) {

      let questionText =
        question.question;


      if (
        (
          !questionText ||
          typeof questionText !==
          "string"
        ) &&
        typeof question.question_rw ===
        "string"
      ) {

        questionText =
          question.question_rw;

      }


      questionElement.textContent =
        questionText ||
        "Question unavailable.";

    }


    /* =========================
       OPTIONS
       ========================= */

    displayOptions(
      question
    );


    /* =========================
       SCORE
       ========================= */

    updateScoreDisplay();


    /* =========================
       TIMER
       ========================= */

    updateTimerDisplay();


    /*
     * Restore answered state.
     */

    if (answered) {

      restoreAnsweredState(
        question
      );

    } else {

      const nextBtn =
        getElement(
          "nextBtn"
        );


      if (nextBtn) {

        nextBtn.classList.add(
          "hidden"
        );

      }

    }

  }


  /* =========================
     RESTORE ANSWERED STATE
     ========================= */

  function restoreAnsweredState(
    question
  ) {

    clearTimer();


    const correctAnswer =
      String(
        question.answer
      ).trim();


    const optionButtons =
      document.querySelectorAll(
        "#options .option"
      );


    optionButtons.forEach(
      function (button) {

        button.disabled =
          true;


        const buttonText =
          button.textContent.trim();


        if (
          buttonText ===
          correctAnswer
        ) {

          button.classList.add(
            "correct"
          );

        }


        if (
          savedSelectedAnswer !==
          null &&
          buttonText ===
          String(
            savedSelectedAnswer
          ).trim() &&
          buttonText !==
          correctAnswer
        ) {

          button.classList.add(
            "wrong"
          );

        }

      }
    );


    const nextBtn =
      getElement(
        "nextBtn"
      );


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
     CLEAR SAVED PROGRESS
     ========================= */

  function clearSavedProgress() {

    try {

      localStorage.removeItem(
        SAVE_KEY
      );


      refreshContinueButton();


    } catch (error) {

      console.warn(
        "Could not clear saved quiz progress:",
        error
      );

    }

  }


  /* =========================
     CONTINUE BUTTON
     ========================= */

  function refreshContinueButton() {

    const continueBtn =
      getElement(
        "continueBtn"
      );


    if (!continueBtn) {

      return;

    }


    const saved =
      getSavedProgress();


    if (saved) {

      continueBtn.classList.remove(
        "hidden"
      );

    } else {

      continueBtn.classList.add(
        "hidden"
      );

    }

  }


  /* =========================
     ERROR SCREEN
     ========================= */

  function showError(
    message
  ) {

    clearTimer();


    quizStarted = false;


    const errorMessage =
      getElement(
        "errorMessage"
      );


    if (errorMessage) {

      errorMessage.textContent =
        message;

    }


    showScreen(
      "errorScreen"
    );

  }


  /* =========================
     BUTTON CONNECTIONS
     ========================= */

  function connectButtons() {

    /*
     * index.html already handles
     * Start Quiz and Continue Quiz.
     */


    /* =========================
       NEXT BUTTON
       ========================= */

    const nextBtn =
      getElement(
        "nextBtn"
      );


    if (nextBtn) {

      nextBtn.addEventListener(
        "click",
        function () {

          nextQuestion();

        }
      );

    }


    /* =========================
       RESTART / NEXT ROUND
       ========================= */

    const restartBtn =
      getElement(
        "restartBtn"
      );


    if (restartBtn) {

      restartBtn.addEventListener(
        "click",
        function () {

          restartQuiz();

        }
      );

    }


    /* =========================
       PAUSE & SAVE
       ========================= */

    const pauseBtn =
      getElement(
        "pauseBtn"
      );


    if (pauseBtn) {

      pauseBtn.addEventListener(
        "click",
        function () {

          pauseQuiz();

        }
      );

    }


    /* =========================
       ERROR BUTTON
       ========================= */

    const errorRestartBtn =
      getElement(
        "errorRestartBtn"
      );


    if (errorRestartBtn) {

      errorRestartBtn.addEventListener(
        "click",
        function () {

          showScreen(
            "startScreen"
          );


          refreshContinueButton();

        }
      );

    }

  }


  /* =========================
     AUTO SAVE EVENTS
     ========================= */

  /*
   * Save when the page becomes hidden.
   *
   * This helps when the user:
   * - changes app
   * - locks phone
   * - closes browser tab
   * - switches to another application
   */

  document.addEventListener(
    "visibilitychange",
    function () {

      if (
        document.visibilityState ===
        "hidden"
      ) {

        if (quizStarted) {

          saveProgress();

        }

      }

    }
  );


  /*
   * Save before browser/page closes.
   */

  window.addEventListener(
    "beforeunload",
    function () {

      if (quizStarted) {

        saveProgress();

      }

    }
  );


  /* =========================
     PUBLIC API
     ========================= */

  window.startQuiz =
    startQuiz;


  window.nextQuestion =
    nextQuestion;


  window.restartQuiz =
    restartQuiz;


  window.pauseQuiz =
    pauseQuiz;


  window.continueQuiz =
    continueQuiz;


  window.refreshContinueButton =
    refreshContinueButton;


  /* =========================
     INITIALIZATION
     ========================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      connectButtons();


      /*
       * Check whether an old quiz
       * is available.
       */

      refreshContinueButton();

    }
  );


})();
