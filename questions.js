 /* =========================================================
   QUIZ MASTER - QUESTIONS MANAGER
   =========================================================
   - 10 questions per round
   - 20 seconds per question
   - Round 1 -> Round 2 -> Round 3 -> ...
   - Random questions
   - No duplicate questions inside the same round
   - Correct / Wrong / Score tracking
   - Works with questions.json
   ========================================================= */

(function () {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const QUESTIONS_PER_ROUND = 10;
  const SECONDS_PER_QUESTION = 20;

  const QUESTIONS_FILE = "questions.json";

  /* =========================
     STATE
  ========================= */

  let allQuestions = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let roundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let answered = false;
  let timer = null;
  let timeLeft = SECONDS_PER_QUESTION;

  let quizStarted = false;

  /* =========================
     HELPERS
  ========================= */

  function shuffleArray(array) {
    const arr = Array.isArray(array) ? [...array] : [];

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  function normalizeQuestion(question) {
    if (!question || typeof question !== "object") {
      return null;
    }

    /*
      Supports common formats such as:

      {
        question: "...",
        options: ["A", "B", "C", "D"],
        answer: 0
      }

      or:

      {
        question: "...",
        answers: ["A", "B", "C", "D"],
        correctAnswer: 0
      }

      or:

      {
        question: "...",
        options: [...],
        correct: 0
      }
    */

    const text =
      question.question ??
      question.questionText ??
      question.text ??
      "";

    let options =
      question.options ??
      question.answers ??
      question.choices ??
      [];

    if (!Array.isArray(options)) {
      options = [];
    }

    let answer =
      question.answer ??
      question.correctAnswer ??
      question.correct ??
      question.correctIndex ??
      question.answerIndex;

    /*
      If answer is a letter such as A/B/C/D,
      convert it to an index.
    */
    if (typeof answer === "string") {
      const clean = answer.trim();

      const letterIndex = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
        E: 4,
        F: 5
      };

      if (letterIndex.hasOwnProperty(clean.toUpperCase())) {
        answer = letterIndex[clean.toUpperCase()];
      } else {
        /*
          Sometimes the correct answer is the actual
          answer text rather than an index.
        */
        const foundIndex = options.findIndex(
          option =>
            String(option).trim().toLowerCase() ===
            clean.toLowerCase()
        );

        if (foundIndex !== -1) {
          answer = foundIndex;
        }
      }
    }

    /*
      Sometimes JSON uses "correct": "answer text"
      and sometimes correctAnswer is a number.
    */
    if (
      typeof answer !== "number" ||
      answer < 0 ||
      answer >= options.length
    ) {
      answer = Number(answer);
    }

    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= options.length
    ) {
      return null;
    }

    if (!text || options.length < 2) {
      return null;
    }

    return {
      ...question,
      question: String(text),
      options: options.map(option => String(option)),
      answer: answer
    };
  }

  /* =========================
     LOAD QUESTIONS
  ========================= */

  async function loadQuestions() {
    try {
      const response = await fetch(QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          "Failed to load questions.json: HTTP " +
          response.status
        );
      }

      const data = await response.json();

      let questions = [];

      /*
        Supports:
        [
          {...},
          {...}
        ]

        OR

        {
          questions: [...]
        }
      */
      if (Array.isArray(data)) {
        questions = data;
      } else if (
        data &&
        Array.isArray(data.questions)
      ) {
        questions = data.questions;
      }

      allQuestions = questions
        .map(normalizeQuestion)
        .filter(Boolean);

      if (allQuestions.length === 0) {
        throw new Error(
          "questions.json nta bibazo byemewe irimo."
        );
      }

      console.log(
        "Quiz Master:",
        allQuestions.length,
        "questions loaded."
      );

      return allQuestions;
    } catch (error) {
      console.error(
        "Quiz Master - Error loading questions:",
        error
      );

      /*
        Do not crash the whole application.
      */
      allQuestions = [];

      return [];
    }
  }

  /* =========================
     CREATE ROUND
  ========================= */

  function createRound() {
    if (allQuestions.length === 0) {
      roundQuestions = [];
      return [];
    }

    /*
      Shuffle all questions and take 10.

      This means questions inside the current
      round cannot duplicate each other.
    */
    roundQuestions = shuffleArray(allQuestions).slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        allQuestions.length
      )
    );

    currentQuestionIndex = 0;

    return roundQuestions;
  }

  /* =========================
     START QUIZ
  ========================= */

  async function startQuiz() {
    stopTimer();

    /*
      If questions have not loaded yet,
      load them first.
    */
    if (allQuestions.length === 0) {
      await loadQuestions();
    }

    if (allQuestions.length === 0) {
      console.error(
        "Quiz Master: No questions available."
      );

      return null;
    }

    /*
      Reset everything when a completely new
      quiz starts.
    */
    currentRound = 1;
    currentQuestionIndex = 0;

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    answered = false;
    quizStarted = true;

    createRound();

    updateRoundUI();
    updateScoreUI();

    return getCurrentQuestion();
  }

  /* =========================
     START NEXT ROUND
  ========================= */

  function startNextRound() {
    stopTimer();

    /*
      IMPORTANT:
      Round number increases here.

      Round 1 -> Round 2
      Round 2 -> Round 3
      Round 3 -> Round 4
      etc.
    */
    currentRound++;

    currentQuestionIndex = 0;

    answered = false;

    /*
      Create completely new random questions.
    */
    createRound();

    updateRoundUI();
    updateScoreUI();

    return getCurrentQuestion();
  }

  /* =========================
     GET CURRENT QUESTION
  ========================= */

  function getCurrentQuestion() {
    if (
      !roundQuestions.length ||
      currentQuestionIndex >= roundQuestions.length
    ) {
      return null;
    }

    return roundQuestions[currentQuestionIndex];
  }

  /* =========================
     GETTERS
  ========================= */

  function getCurrentRound() {
    return currentRound;
  }

  function getCurrentQuestionIndex() {
    return currentQuestionIndex;
  }

  function getQuestionsPerRound() {
    return roundQuestions.length;
  }

  function getScore() {
    return score;
  }

  function getCorrectCount() {
    return correctAnswers;
  }

  function getWrongCount() {
    return wrongAnswers;
  }

  function getTimeLeft() {
    return timeLeft;
  }

  function getAllQuestions() {
    return [...allQuestions];
  }

  function isRoundComplete() {
    return (
      currentQuestionIndex >=
      roundQuestions.length
    );
  }

  /* =========================
     ANSWER QUESTION
  ========================= */

  function selectAnswer(selectedIndex) {
    if (answered) {
      return {
        correct: false,
        alreadyAnswered: true,
        finished: false
      };
    }

    const question = getCurrentQuestion();

    if (!question) {
      return {
        correct: false,
        alreadyAnswered: false,
        finished: true
      };
    }

    selectedIndex = Number(selectedIndex);

    if (!Number.isInteger(selectedIndex)) {
      return {
        correct: false,
        alreadyAnswered: false,
        finished: false
      };
    }

    answered = true;

    stopTimer();

    const isCorrect =
      selectedIndex === question.answer;

    if (isCorrect) {
      correctAnswers++;

      /*
        One correct answer = 1 point.
      */
      score++;

    } else {
      wrongAnswers++;
    }

    updateScoreUI();

    return {
      correct: isCorrect,
      selectedIndex: selectedIndex,
      correctIndex: question.answer,
      score: score,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers,
      finished: false
    };
  }

  /* =========================
     TIMEOUT
  ========================= */

  function timeoutQuestion() {
    if (answered) {
      return {
        timedOut: false,
        alreadyAnswered: true
      };
    }

    const question = getCurrentQuestion();

    if (!question) {
      return {
        timedOut: true,
        correctIndex: null
      };
    }

    answered = true;

    stopTimer();

    wrongAnswers++;

    updateScoreUI();

    return {
      timedOut: true,
      correct: false,
      correctIndex: question.answer,
      score: score,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers
    };
  }

  /* =========================
     NEXT QUESTION
  ========================= */

  function nextQuestion() {
    stopTimer();

    currentQuestionIndex++;

    answered = false;

    /*
      Still questions remaining in this round.
    */
    if (
      currentQuestionIndex <
      roundQuestions.length
    ) {
      return {
        question: getCurrentQuestion(),
        roundComplete: false,
        quizComplete: false
      };
    }

    /*
      The round is finished.

      DO NOT automatically increase the round here.

      The "Komeza kuri Round ikurikira" button
      can call startNextRound().
    */
    updateScoreUI();

    return {
      question: null,
      roundComplete: true,
      quizComplete: false,

      round: currentRound,

      score: score,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers
    };
  }

  /* =========================
     TIMER
  ========================= */

  function startTimer(callback) {
    stopTimer();

    timeLeft = SECONDS_PER_QUESTION;

    updateTimerUI();

    timer = setInterval(function () {
      timeLeft--;

      updateTimerUI();

      if (timeLeft <= 0) {
        stopTimer();

        const result = timeoutQuestion();

        if (typeof callback === "function") {
          callback(result);
        }
      }
    }, 1000);

    return timeLeft;
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function resetTimer() {
    stopTimer();

    timeLeft = SECONDS_PER_QUESTION;

    updateTimerUI();
  }

  /* =========================
     UI UPDATES
     ========================= */

  function findElement(ids) {
    for (const id of ids) {
      const element = document.getElementById(id);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function updateRoundUI() {
    /*
      These selectors cover common IDs without
      changing the design.
    */
    const roundElement = findElement([
      "roundNumber",
      "roundText",
      "currentRound",
      "round"
    ]);

    if (roundElement) {
      roundElement.textContent =
        "Round " + currentRound;
    }

    /*
      Also look for an element whose text is
      exactly "Round 1", "Round 2", etc.
    */
    const possibleRoundElements =
      document.querySelectorAll(
        "h1, h2, h3, h4, p, div, span"
      );

    possibleRoundElements.forEach(function (el) {
      const text = el.textContent.trim();

      if (/^Round\s+\d+$/i.test(text)) {
        el.textContent =
          "Round " + currentRound;
      }
    });
  }

  function updateScoreUI() {
    const scoreElement = findElement([
      "score",
      "scoreText",
      "points",
      "totalScore"
    ]);

    if (scoreElement) {
      /*
        Only update if this looks like a score
        element.
      */
      if (
        scoreElement.id === "scoreText" ||
        scoreElement.id === "score"
      ) {
        scoreElement.textContent = score;
      }
    }

    const correctElement = findElement([
      "correct",
      "correctCount",
      "correctAnswers"
    ]);

    if (correctElement) {
      correctElement.textContent =
        correctAnswers;
    }

    const wrongElement = findElement([
      "wrong",
      "wrongCount",
      "wrongAnswers"
    ]);

    if (wrongElement) {
      wrongElement.textContent =
        wrongAnswers;
    }
  }

  function updateTimerUI() {
    const timerElement = findElement([
      "timer",
      "time",
      "timeLeft",
      "timerText"
    ]);

    if (!timerElement) {
      return;
    }

    timerElement.textContent =
      timeLeft + "s";

    /*
      Also update data attributes if the existing
      HTML uses them.
    */
    timerElement.setAttribute(
      "data-time-left",
      String(timeLeft)
    );
  }

  /* =========================
     RENDER QUESTION
     ========================= */

  function renderQuestion(question) {
    if (!question) {
      return;
    }

    const questionElement = findElement([
      "questionText",
      "question",
      "quizQuestion"
    ]);

    if (questionElement) {
      questionElement.textContent =
        question.question;
    }

    const answersContainer = findElement([
      "answers",
      "answerButtons",
      "options",
      "choices"
    ]);

    if (!answersContainer) {
      return;
    }

    /*
      Clear only the answer buttons.
    */
    answersContainer.innerHTML = "";

    question.options.forEach(
      function (option, index) {
        const button =
          document.createElement("button");

        button.type = "button";

        button.className = "answer";

        button.textContent = option;

        button.dataset.index = String(index);

        button.addEventListener(
          "click",
          function () {
            const result =
              selectAnswer(index);

            /*
              Give the existing UI a chance
              to react to the result.
            */
            if (result.alreadyAnswered) {
              return;
            }

            if (result.correct) {
              button.classList.add(
                "correct"
              );
            } else {
              button.classList.add(
                "wrong"
              );

              const buttons =
                answersContainer.querySelectorAll(
                  "button"
                );

              if (
                buttons[result.correctIndex]
              ) {
                buttons[
                  result.correctIndex
                ].classList.add(
                  "correct"
                );
              }
            }
          }
        );

        answersContainer.appendChild(button);
      }
    );

    updateRoundUI();
    updateScoreUI();
  }

  /* =========================
     START CURRENT QUESTION
  ========================= */

  function showQuestion() {
    const question =
      getCurrentQuestion();

    if (!question) {
      return null;
    }

    answered = false;

    renderQuestion(question);

    resetTimer();

    return question;
  }

  /* =========================
     QUIZ STATUS
  ========================= */

  function getStatus() {
    return {
      round: currentRound,

      questionNumber:
        currentQuestionIndex + 1,

      totalQuestions:
        roundQuestions.length,

      score: score,

      correctAnswers:
        correctAnswers,

      wrongAnswers:
        wrongAnswers,

      timeLeft: timeLeft,

      answered: answered,

      quizStarted: quizStarted
    };
  }

  /* =========================
     FINISH QUIZ / RESET
  ========================= */

  function finishQuiz() {
    stopTimer();

    quizStarted = false;

    return {
      round: currentRound,
      score: score,
      correctAnswers: correctAnswers,
      wrongAnswers: wrongAnswers
    };
  }

  function resetQuiz() {
    stopTimer();

    currentRound = 1;
    currentQuestionIndex = 0;

    roundQuestions = [];

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    answered = false;

    quizStarted = false;

    timeLeft = SECONDS_PER_QUESTION;

    updateRoundUI();
    updateScoreUI();
    updateTimerUI();
  }

  /* =========================
     GLOBAL QUESTION MANAGER
  ========================= */

  window.questionManager = {

    /* Loading */
    loadQuestions,

    /* Quiz */
    startQuiz,
    finishQuiz,
    resetQuiz,

    /* Rounds */
    startNextRound,

    /* Questions */
    getCurrentQuestion,
    getCurrentQuestionIndex,
    getQuestionsPerRound,
    nextQuestion,
    showQuestion,
    renderQuestion,

    /* Answers */
    selectAnswer,
    timeoutQuestion,

    /* Timer */
    startTimer,
    stopTimer,
    resetTimer,

    /* Information */
    getCurrentRound,
    getScore,
    getCorrectCount,
    getWrongCount,
    getTimeLeft,
    getAllQuestions,
    isRoundComplete,
    getStatus,

    /* Utility */
    shuffleArray
  };

  /* =========================
     GLOBAL COMPATIBILITY
     ========================= */

  /*
    These aliases help older versions of
    Quiz Master continue working.
  */

  window.loadQuestions = loadQuestions;
  window.startQuiz = startQuiz;
  window.startNextRound = startNextRound;
  window.getCurrentQuestion =
    getCurrentQuestion;
  window.selectAnswer = selectAnswer;
  window.nextQuestion = nextQuestion;
  window.timeoutQuestion =
    timeoutQuestion;
  window.showQuestion = showQuestion;

  /* =========================
     INITIAL LOAD
  ========================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      /*
        Load questions.json once when the page
        opens. It does NOT automatically start
        the quiz.
      */
      loadQuestions();
    }
  );

})();
