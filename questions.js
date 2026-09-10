/* =========================================================
   QUIZ MASTER - QUESTIONS.JS
   =========================================================
   FIX ONLY:
   🚀 Tangira Quiz

   COMPATIBLE WITH:
   - Existing index.html
   - questions.json
   - question
   - question_rw
   - options
   - answer
   - category

   FEATURES:
   - 10 questions per round
   - 20 seconds per question
   - Random questions
   - No duplicate questions until bank is finished
   - Score tracking
   - Correct / Wrong tracking
   - Round 1 -> Result -> Round 2 -> Result -> ...
   - Does NOT modify Premium / Pi / Share
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

  /*
   * Questions already used in previous rounds.
   * They will not be selected again until
   * the whole question bank has been used.
   */
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
    const copy = Array.isArray(array) ? [...array] : [];

    for (let i = copy.length - 1; i > 0; i--) {
      const randomIndex =
        Math.floor(Math.random() * (i + 1));

      [copy[i], copy[randomIndex]] =
        [copy[randomIndex], copy[i]];
    }

    return copy;
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
       * Supported formats:
       *
       * [
       *   {
       *     "question": "...",
       *     "question_rw": "...",
       *     "options": ["...", "..."],
       *     "answer": "...",
       *     "category": "..."
       *   }
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
      } else if (
        data &&
        Array.isArray(data.questions)
      ) {
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

      /*
       * Remove only completely invalid records.
       * We do NOT change valid questions.
       */
      allQuestions = allQuestions.filter(function (q) {
        if (!q || typeof q !== "object") {
          return false;
        }

        const question =
          q.question ??
          q.questionText ??
          q.text ??
          q.q ??
          "";

        const options =
          q.options ??
          q.answers ??
          q.choices ??
          [];

        return (
          String(question).trim() !== "" &&
          Array.isArray(options) &&
          options.length >= 2
        );
      });

      if (!allQuestions.length) {
        throw new Error(
          "Nta kibazo gifite format iboneye muri questions.json."
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

      quizRunning = false;

      showError(
        "Ibibazo ntibyashoboye gufunguka. " +
        "Reba ko questions.json iri kumwe na index.html " +
        "kandi ko JSON nta makosa irimo."
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

    /*
     * Kinyarwanda question is supported.
     *
     * Current index.html uses #question,
     * so we keep the English/default question
     * as the main displayed question.
     *
     * question_rw remains available as data.
     */

    const questionRw =
      q.question_rw ??
      q.questionRw ??
      q.rw ??
      "";

    let options =
      q.options ??
      q.answers ??
      q.choices ??
      [];

    let correct =
      q.answer ??
      q.correctAnswer ??
      q.correct ??
      q.correctOption ??
      null;

    /*
     * Support option objects too.
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
      question_rw: String(questionRw),
      options: Array.isArray(options)
        ? options.map(function (item) {
            return String(item);
          })
        : [],
      correctAnswer: correct,
      category: String(
        q.category ?? ""
      )
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
     * If fewer than 10 unused questions remain,
     * start a new cycle.
     *
     * This guarantees that questions can continue
     * after the whole bank has been consumed.
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

    roundQuestions = [];

    /*
     * Take maximum 10 questions.
     */
    for (
      let i = 0;
      i < randomIndexes.length &&
      roundQuestions.length < QUESTIONS_PER_ROUND;
      i++
    ) {

      const index =
        randomIndexes[i];

      const question =
        normalizeQuestion(
          allQuestions[index]
        );

      /*
       * Only valid questions are added.
       */
      if (
        question.question.trim() &&
        question.options.length >= 2
      ) {

        roundQuestions.push(question);

        usedQuestions.add(index);
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

    stopTimer();

    /*
     * If the quiz is not running,
     * this is a NEW quiz.
     */
    if (!quizRunning) {

      score = 0;
      correctAnswers = 0;
      wrongAnswers = 0;

      currentRound = 1;

      currentQuestionIndex = 0;

      usedQuestions.clear();
    }

    quizRunning = true;

    /*
     * Load questions if they are not loaded.
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
     * Prepare round.
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

    updateScore();

    showQuizScreen();

    showQuestion();
  }

  /* =========================================================
     MAKE startQuiz AVAILABLE GLOBALLY
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
      roundQuestions[
        currentQuestionIndex
      ];

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

    const categoryElement =
      el("category");

    /*
     * QUESTION
     */

    if (questionElement) {

      questionElement.textContent =
        current.question;
    }

    /*
     * CATEGORY
     */

    if (categoryElement) {

      categoryElement.textContent =
        current.category || "";
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
     * Shuffle only the displayed options.
     * Original JSON is not modified.
     */

    const shuffledOptions =
      shuffle(current.options);

    shuffledOptions.forEach(
      function (answer) {

        const button =
          document.createElement("button");

        button.type = "button";

        /*
         * Keep existing CSS.
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

        optionsElement.appendChild(
          button
        );
      }
    );
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
      roundQuestions[
        currentQuestionIndex
      ];

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

      buttons.forEach(
        function (button) {
          button.disabled = true;
        }
      );
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
       * Keep original scoring:
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

      showCorrectAnswer(
        current
      );
    }

    updateScore();

    /*
     * Move to next question after
     * short delay.
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

    if (
      correct === null ||
      correct === undefined ||
      String(correct).trim() === ""
    ) {
      return false;
    }

    /*
     * If answer is numeric,
     * treat it as option index.
     */

    if (
      typeof correct === "number"
    ) {

      if (
        question.options[correct] !==
        undefined
      ) {

        return (
          normalize(selectedAnswer) ===
          normalize(
            question.options[correct]
          )
        );
      }
    }

    /*
     * If answer is numeric text,
     * e.g. "0", "1", "2", "3".
     */
    if (
      typeof correct === "string" &&
      /^\d+$/.test(correct.trim())
    ) {

      const index =
        Number(correct.trim());

      if (
        question.options[index] !==
        undefined
      ) {

        return (
          normalize(selectedAnswer) ===
          normalize(
            question.options[index]
          )
        );
      }
    }

    /*
     * Support A / B / C / D.
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

        return (
          normalize(selectedAnswer) ===
          normalize(
            question.options[index]
          )
        );
      }
    }

    /*
     * Standard questions.json format:
     *
     * "answer": "Kigali"
     *
     * Compare answer text with
     * selected option text.
     */

    return (
      normalize(selectedAnswer) ===
      normalize(correct)
    );
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

    buttons.forEach(
      function (button) {

        /*
         * For normal JSON:
         * answer = exact option text.
         */

        if (
          normalize(button.textContent) ===
          normalize(
            question.correctAnswer
          )
        ) {

          button.classList.add(
            "correct"
          );

          return;
        }

        /*
         * Also support answer as
         * option index.
         */

        if (
          typeof question.correctAnswer ===
          "number"
        ) {

          const correctText =
            question.options[
              question.correctAnswer
            ];

          if (
            normalize(button.textContent) ===
            normalize(correctText)
          ) {

            button.classList.add(
              "correct"
            );
          }
        }
      }
    );
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
      setInterval(
        function () {

          if (!quizRunning) {
            stopTimer();
            return;
          }

          timeLeft--;

          updateTimer();

          if (timeLeft <= 0) {

            timeoutQuestion();
          }

        },
        1000
      );
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
