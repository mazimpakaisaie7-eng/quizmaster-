/* =========================================================
   QUIZ MASTER 🇷🇼 - QUESTIONS.JS
   =========================================================
   Stable version
   - Start Quiz works
   - 10 questions per round
   - 20 seconds per question
   - Random questions
   - No repeats until question bank is completed
   - Score tracking
   - Correct / Wrong tracking
   - Multiple rounds
   - Compatible with questions.json
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const SECONDS_PER_QUESTION = 20;

  /* =========================================================
     GAME STATE
     ========================================================= */

  let allQuestions = [];
  let roundQuestions = [];

  let currentQuestionIndex = 0;
  let currentRound = 1;

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let timeLeft = SECONDS_PER_QUESTION;
  let timerInterval = null;

  let quizRunning = false;
  let questionsLoaded = false;

  let usedQuestionIndexes = new Set();

  /* =========================================================
     ELEMENT HELPER
     ========================================================= */

  function getElement(id) {
    return document.getElementById(id);
  }

  /* =========================================================
     TEXT NORMALIZER
     ========================================================= */

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  /* =========================================================
     SHUFFLE
     ========================================================= */

  function shuffle(array) {
    const result = Array.isArray(array) ? [...array] : [];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /* =========================================================
     LOAD QUESTIONS.JSON
     ========================================================= */

  async function loadQuestions() {
    try {
      const response = await fetch("./questions.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          "Could not load questions.json. HTTP " +
          response.status
        );
      }

      const data = await response.json();

      let questions;

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

      const validQuestions = questions.filter(function (q) {
        if (!q || typeof q !== "object") {
          return false;
        }

        const questionText =
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
          String(questionText).trim() !== "" &&
          Array.isArray(options) &&
          options.length >= 2
        );
      });

      if (validQuestions.length === 0) {
        throw new Error(
          "No valid questions were found in questions.json."
        );
      }

      allQuestions = validQuestions;
      questionsLoaded = true;

      console.log(
        "Quiz Master: loaded",
        allQuestions.length,
        "questions."
      );

      return true;

    } catch (error) {
      console.error(
        "Quiz Master load error:",
        error
      );

      showError(
        "Questions could not be loaded. " +
        "Please make sure questions.json is in the same folder as index.html."
      );

      return false;
    }
  }

  /* =========================================================
     CONVERT QUESTION
     ========================================================= */

  function prepareQuestion(raw) {
    const questionText =
      raw.question ??
      raw.questionText ??
      raw.text ??
      raw.q ??
      "";

    let options =
      raw.options ??
      raw.answers ??
      raw.choices ??
      [];

    let answer =
      raw.answer ??
      raw.correctAnswer ??
      raw.correct ??
      raw.correctOption ??
      null;

    /*
     * Support object-style options.
     */

    if (
      Array.isArray(options) &&
      options.length > 0 &&
      typeof options[0] === "object"
    ) {
      const newOptions = [];

      options.forEach(function (option) {
        const text =
          option.text ??
          option.label ??
          option.answer ??
          option.value ??
          "";

        if (String(text).trim() !== "") {
          newOptions.push(String(text));
        }

        if (
          option.correct === true ||
          option.isCorrect === true
        ) {
          answer = text;
        }
      });

      options = newOptions;
    }

    return {
      question: String(questionText),
      question_rw: String(
        raw.question_rw ??
        raw.questionRw ??
        raw.rw ??
        ""
      ),
      options: Array.isArray(options)
        ? options.map(function (option) {
            return String(option);
          })
        : [],
      answer: answer,
      category: String(
        raw.category ?? ""
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
     * If there are not enough unused questions
     * for another complete round, start a new cycle.
     */
    if (
      allQuestions.length - usedQuestionIndexes.size <
      QUESTIONS_PER_ROUND
    ) {
      usedQuestionIndexes.clear();
    }

    const available = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i++
    ) {
      if (!usedQuestionIndexes.has(i)) {
        available.push(i);
      }
    }

    const selected = shuffle(available).slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        available.length
      )
    );

    roundQuestions = selected.map(function (index) {
      usedQuestionIndexes.add(index);

      return prepareQuestion(
        allQuestions[index]
      );
    });

    currentQuestionIndex = 0;

    return roundQuestions.length > 0;
  }

  /* =========================================================
     START QUIZ
     ========================================================= */

  async function startQuiz() {
    console.log("Quiz Master: Start Quiz clicked.");

    stopTimer();

    /*
     * If this is the first start,
     * reset the game.
     */
    if (!questionsLoaded) {
      score = 0;
      correctAnswers = 0;
      wrongAnswers = 0;
      currentRound = 1;
      currentQuestionIndex = 0;
      usedQuestionIndexes.clear();
    }

    /*
     * Load questions only once.
     */
    if (!questionsLoaded) {
      const loaded = await loadQuestions();

      if (!loaded) {
        return;
      }
    }

    /*
     * Prepare the round.
     */
    const ready = prepareRound();

    if (!ready) {
      showError(
        "No questions are available."
      );
      return;
    }

    quizRunning = true;

    showQuizScreen();

    updateScore();

    showQuestion();
  }

  /*
   * IMPORTANT:
   * Make startQuiz available to index.html.
   */
  window.startQuiz = startQuiz;

  /* =========================================================
     SHOW QUIZ SCREEN
     ========================================================= */

  function showQuizScreen() {
    const startScreen =
      getElement("startScreen");

    const quizScreen =
      getElement("quizScreen");

    const resultScreen =
      getElement("resultScreen");

    const errorScreen =
      getElement("errorScreen");

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

    const question =
      roundQuestions[currentQuestionIndex];

    if (!question) {
      finishRound();
      return;
    }

    renderQuestion(question);

    startTimer();
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderQuestion(question) {
    const questionElement =
      getElement("question");

    const optionsElement =
      getElement("options");

    const numberElement =
      getElement("questionNumber");

    const categoryElement =
      getElement("category");

    /*
     * Question
     */
    if (questionElement) {
      questionElement.textContent =
        question.question;
    }

    /*
     * Category
     */
    if (categoryElement) {
      categoryElement.textContent =
        question.category;
    }

    /*
     * Question number
     */
    if (numberElement) {
      numberElement.textContent =
        "Question " +
        (currentQuestionIndex + 1) +
        " / " +
        roundQuestions.length;
    }

    /*
     * Options
     */
    if (!optionsElement) {
      console.error(
        "Element #options was not found."
      );
      return;
    }

    optionsElement.innerHTML = "";

    const options =
      shuffle(question.options);

    options.forEach(function (answer) {
      const button =
        document.createElement("button");

      button.type = "button";
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

    const question =
      roundQuestions[currentQuestionIndex];

    if (!question) {
      return;
    }

    /*
     * Disable all options.
     */
    const optionsElement =
      getElement("options");

    if (optionsElement) {
      const buttons =
        optionsElement.querySelectorAll(
          "button"
        );

      buttons.forEach(function (button) {
        button.disabled = true;
      });
    }

    const correct =
      isCorrectAnswer(
        selectedAnswer,
        question
      );

    if (correct) {
      correctAnswers++;
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

      highlightCorrectAnswer(question);
    }

    updateScore();

    setTimeout(function () {
      nextQuestion();
    }, 700);
  }

  /* =========================================================
     CHECK ANSWER
     ========================================================= */

  function isCorrectAnswer(
    selectedAnswer,
    question
  ) {
    const correct =
      question.answer;

    if (
      correct === null ||
      correct === undefined ||
      String(correct).trim() === ""
    ) {
      return false;
    }

    /*
     * Numeric index:
     * 0, 1, 2, 3
     */
    if (
      typeof correct === "number"
    ) {
      const correctOption =
        question.options[correct];

      if (correctOption !== undefined) {
        return (
          normalizeText(selectedAnswer) ===
          normalizeText(correctOption)
        );
      }
    }

    /*
     * Numeric string:
     * "0", "1", "2", "3"
     */
    if (
      typeof correct === "string" &&
      /^\d+$/.test(correct.trim())
    ) {
      const index =
        Number(correct.trim());

      const correctOption =
        question.options[index];

      if (correctOption !== undefined) {
        return (
          normalizeText(selectedAnswer) ===
          normalizeText(correctOption)
        );
      }
    }

    /*
     * Letter:
     * A, B, C, D
     */
    if (
      typeof correct === "string" &&
      /^[ABCD]$/i.test(correct.trim())
    ) {
      const index =
        correct.trim()
          .toUpperCase()
          .charCodeAt(0) - 65;

      const correctOption =
        question.options[index];

      if (correctOption !== undefined) {
        return (
          normalizeText(selectedAnswer) ===
          normalizeText(correctOption)
        );
      }
    }

    /*
     * Normal format:
     * "answer": "Kigali"
     */
    return (
      normalizeText(selectedAnswer) ===
      normalizeText(correct)
    );
  }

  /* =========================================================
     HIGHLIGHT CORRECT ANSWER
     ========================================================= */

  function highlightCorrectAnswer(question) {
    const optionsElement =
      getElement("options");

    if (!optionsElement) {
      return;
    }

    let correctText =
      question.answer;

    /*
     * Numeric answer.
     */
    if (
      typeof correctText === "number"
    ) {
      correctText =
        question.options[correctText];
    }

    /*
     * Letter answer.
     */
    if (
      typeof correctText === "string" &&
      /^[ABCD]$/i.test(
        correctText.trim()
      )
    ) {
      const index =
        correctText
          .trim()
          .toUpperCase()
          .charCodeAt(0) - 65;

      correctText =
        question.options[index];
    }

    const buttons =
      optionsElement.querySelectorAll(
        "button"
      );

    buttons.forEach(function (button) {
      if (
        normalizeText(button.textContent) ===
        normalizeText(correctText)
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
        if (!quizRunning) {
          stopTimer();
          return;
        }

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
      getElement("timer");

    if (timer) {
      timer.textContent =
        timeLeft + "s";
    }
  }

  /* =========================================================
     STOP TIMER
     ========================================================= */

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /* =========================================================
     TIMEOUT
     ========================================================= */

  function timeoutQuestion() {
    if (!quizRunning) {
      return;
    }

    stopTimer();

    wrongAnswers++;

    const question =
      roundQuestions[currentQuestionIndex];

    if (question) {
      highlightCorrectAnswer(question);
    }

    updateScore();

    setTimeout(function () {
      nextQuestion();
    }, 700);
  }

  /* =========================================================
     UPDATE SCORE
     ========================================================= */

  function updateScore() {
    const scoreElement =
      getElement("score");

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

    quizRunning = false;

    const quizScreen =
      getElement("quizScreen");

    const resultScreen =
      getElement("resultScreen");

    if (quizScreen) {
      quizScreen.style.display = "none";
    }

    if (resultScreen) {
      resultScreen.style.display = "";
    }

    const finishedRound =
      getElement("finishedRound");

    if (finishedRound) {
      finishedRound.textContent =
        currentRound;
    }

    const scoreElement =
      getElement("score");

    if (scoreElement) {
     
