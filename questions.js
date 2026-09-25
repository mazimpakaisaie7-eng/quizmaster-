/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   MATCHED EXACTLY WITH CURRENT index.html
   ========================================================= */

"use strict";

/* =========================================================
   SETTINGS
   ========================================================= */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;
const PASS_PERCENTAGE = 60;
const MAX_ROUNDS = 10;
const QUESTIONS_FILE = "./questions.json";

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let allQuestions = [];

let currentRound = 1;
let currentQuestionIndex = 0;
let currentRoundQuestions = [];

let score = 0;
let correctAnswers = 0;

let timeLeft = TIME_PER_QUESTION;
let timer = null;
let answered = false;

let unlockedRounds = 1;
let completedRounds = [];
let usedQuestionIndexes = [];

/* =========================================================
   SAFE LOCAL STORAGE
   ========================================================= */

function storageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.warn("Storage read error:", key, error);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Storage write error:", key, error);
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Storage remove error:", key, error);
  }
}

/* =========================================================
   LOAD SAVED SETTINGS
   ========================================================= */

function loadSavedState() {

  const savedUnlocked =
    parseInt(
      storageGet("quizmasterUnlockedRounds", "1"),
      10
    );

  unlockedRounds =
    Number.isInteger(savedUnlocked) && savedUnlocked >= 1
      ? Math.min(savedUnlocked, MAX_ROUNDS)
      : 1;


  try {

    const savedCompleted =
      JSON.parse(
        storageGet(
          "quizmasterCompletedRounds",
          "[]"
        )
      );

    completedRounds =
      Array.isArray(savedCompleted)
        ? savedCompleted.filter(function (round) {
            return Number.isInteger(round);
          })
        : [];

  } catch (error) {

    completedRounds = [];

  }


  try {

    const savedUsed =
      JSON.parse(
        storageGet(
          "quizmasterUsedQuestions",
          "[]"
        )
      );

    usedQuestionIndexes =
      Array.isArray(savedUsed)
        ? savedUsed.filter(function (index) {
            return Number.isInteger(index);
          })
        : [];

  } catch (error) {

    usedQuestionIndexes = [];

  }

}

/* =========================================================
   SCREEN CONTROL
   ========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(function (screen) {
      screen.classList.remove("active");
    });


  const screen =
    document.getElementById(screenId);


  if (screen) {

    screen.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

}


function showStartScreen() {
  showScreen("startScreen");
}


function showQuizScreen() {
  showScreen("quizScreen");
}


function showResultScreen() {
  showScreen("resultScreen");
}


function showRoundsScreen() {
  showScreen("roundsScreen");
}


function showErrorScreen() {
  showScreen("errorScreen");
}


window.showStartScreen = showStartScreen;
window.showQuizScreen = showQuizScreen;
window.showResultScreen = showResultScreen;
window.showRoundsScreen = showRoundsScreen;
window.showErrorScreen = showErrorScreen;

/* =========================================================
   VALIDATE QUESTION
   ========================================================= */

function validQuestion(question) {

  if (!question || typeof question !== "object") {
    return false;
  }


  if (
    typeof question.question !== "string" ||
    question.question.trim() === ""
  ) {
    return false;
  }


  if (
    !Array.isArray(question.options) ||
    question.options.length < 2
  ) {
    return false;
  }


  for (const option of question.options) {

    if (
      typeof option !== "string" ||
      option.trim() === ""
    ) {
      return false;
    }

  }


  if (
    typeof question.answer !== "string" ||
    question.answer.trim() === ""
  ) {
    return false;
  }


  return true;

}

/* =========================================================
   LOAD QUESTIONS
   ========================================================= */

async function loadQuestions() {

  try {

    const response =
      await fetch(
        QUESTIONS_FILE +
        "?v=" +
        Date.now(),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status +
        " while loading questions.json"
      );

    }


    const data =
      await response.json();


    let questions = [];


    if (Array.isArray(data)) {

      questions = data;

    }

    else if (
      data &&
      Array.isArray(data.questions)
    ) {

      questions = data.questions;

    }

    else {

      throw new Error(
        "questions.json must be an array or contain a questions array."
      );

    }


    allQuestions =
      questions.filter(validQuestion);


    if (allQuestions.length === 0) {

      throw new Error(
        "No valid questions were found in questions.json."
      );

    }


    console.log(
      "Quiz Master:",
      allQuestions.length,
      "valid questions loaded."
    );


    /*
     * If old localStorage contains question
     * indexes that no longer exist, remove them.
     */

    usedQuestionIndexes =
      usedQuestionIndexes.filter(function (index) {

        return (
          index >= 0 &&
          index < allQuestions.length
        );

      });


    storageSet(
      "quizmasterUsedQuestions",
      JSON.stringify(usedQuestionIndexes)
    );


    renderRounds();
    updateContinueButton();


    /*
     * Start button
     */

    const startBtn =
      document.getElementById("startBtn");


    if (startBtn) {

      startBtn.onclick =
        function (event) {

          event.preventDefault();

          startNewQuiz();

        };

    }


    console.log(
      "Quiz Master is ready."
    );

  }

  catch (error) {

    console.error(
      "Quiz Master loading error:",
      error
    );


    const errorMessage =
      document.getElementById(
        "errorMessage"
      );


    if (errorMessage) {

      errorMessage.textContent =
        "Unable to load questions.json. Make sure questions.json is in the project root and contains valid questions.";

    }


    showErrorScreen();

  }

}

/* =========================================================
   GET QUESTIONS FOR ROUND
   ========================================================= */

function getQuestionsForRound() {

  if (allQuestions.length === 0) {
    return [];
  }


  /*
   Find unused questions.
  */

  let availableIndexes =
    [];


  for (
    let i = 0;
    i < allQuestions.length;
    i++
  ) {

    if (
      !usedQuestionIndexes.includes(i)
    ) {

      availableIndexes.push(i);

    }

  }


  /*
   If there are not enough unused questions
   for another round, start a fresh pool.
  */

  if (
    availableIndexes.length <
    Math.min(
      QUESTIONS_PER_ROUND,
      allQuestions.length
    )
  ) {

    usedQuestionIndexes = [];

    storageSet(
      "quizmasterUsedQuestions",
      "[]"
    );


    availableIndexes = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i++
    ) {

      availableIndexes.push(i);

    }

  }


  /*
   Shuffle question indexes.
  */

  for (
    let i = availableIndexes.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );


    const temp =
      availableIndexes[i];

    availableIndexes[i] =
      availableIndexes[j];

    availableIndexes[j] =
      temp;

  }


  /*
   Select questions for this round.
  */

  const selectedIndexes =
    availableIndexes.slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        availableIndexes.length
      )
    );


  /*
   Mark them as used.
  */

  selectedIndexes.forEach(
    function (index) {

      if (
        !usedQuestionIndexes.includes(index)
      ) {

        usedQuestionIndexes.push(index);

      }

    }
  );


  storageSet(
    "quizmasterUsedQuestions",
    JSON.stringify(
      usedQuestionIndexes
    )
  );


  return selectedIndexes.map(
    function (index) {
      return allQuestions[index];
    }
  );

}

/* =========================================================
   SAVE QUIZ PROGRESS
   ========================================================= */

function saveQuizProgress() {

  if (
    !Array.isArray(currentRoundQuestions) ||
    currentRoundQuestions.length === 0
  ) {

    return;

  }


  const progress = {

    currentRound:
      currentRound,

    currentQuestionIndex:
      currentQuestionIndex,

    currentRoundQuestions:
      currentRoundQuestions,

    score:
      score,

    correctAnswers:
      correctAnswers,

    timeLeft:
      timeLeft,

    usedQuestionIndexes:
      usedQuestionIndexes

  };


  storageSet(
    "quizmasterProgress",
    JSON.stringify(progress)
  );


  updateContinueButton();

}


window.saveQuizProgress =
  saveQuizProgress;

/* =========================================================
   CONTINUE BUTTON DISPLAY
   ========================================================= */

function updateContinueButton() {

  const button =
    document.getElementById(
      "continueBtn"
    );


  if (!button) {
    return;
  }


  const saved =
    storageGet(
      "quizmasterProgress",
      null
    );


  if (saved) {

    button.style.display =
      "block";

    button.disabled =
      false;

    button.textContent =
      "▶️ Continue Quiz";

  }

  else {

    button.style.display =
      "block";

    button.disabled =
      false;

    button.textContent =
      "▶️ Continue Quiz";

  }

}


window.updateContinueButton =
  updateContinueButton;

/* =========================================================
   CONTINUE SAVED QUIZ
   ========================================================= */

function continueSavedQuiz() {

  const saved =
    storageGet(
      "quizmasterProgress",
      null
    );


  if (!saved) {

    alert(
      "There is no saved quiz to continue. Starting a new quiz."
    );

    startNewQuiz();

    return;

  }


  try {

    const progress =
      JSON.parse(saved);


    if (
      !progress ||
      !Array.isArray(
        progress.currentRoundQuestions
      ) ||
      progress.currentRoundQuestions.length === 0
    ) {

      throw new Error(
        "Invalid saved quiz."
      );

    }


    currentRound =
      Number(progress.currentRound) || 1;


    currentQuestionIndex =
      Number(progress.currentQuestionIndex) || 0;


    currentRoundQuestions =
      progress.currentRoundQuestions;


    score =
      Number(progress.score) || 0;


    correctAnswers =
      Number(progress.correctAnswers) || 0;


    timeLeft =
      Number(progress.timeLeft);


    if (
      !Number.isFinite(timeLeft) ||
      timeLeft <= 0
    ) {

      timeLeft =
        TIME_PER_QUESTION;

    }


    if (
      Array.isArray(
        progress.usedQuestionIndexes
      )
    ) {

      usedQuestionIndexes =
        progress.usedQuestionIndexes;

    }


    /*
     * Safety checks.
     */

    if (
      currentRound < 1
    ) {

      currentRound = 1;

    }


    if (
      currentQuestionIndex < 0
    ) {

      currentQuestionIndex = 0;

    }


    if (
      currentQuestionIndex >=
      currentRoundQuestions.length
    ) {

      currentQuestionIndex = 0;

    }


    answered = false;

    showQuizScreen();

    displayQuestion(true);

  }

  catch (error) {

    console.error(
      "Continue quiz error:",
      error
    );


    storageRemove(
      "quizmasterProgress"
    );


    updateContinueButton();


    alert(
      "The saved quiz could not be restored. Starting a new quiz."
    );


    startNewQuiz();

  }

}


window.continueQuiz =
  continueSavedQuiz;

/* =========================================================
   START NEW QUIZ
   ========================================================= */

function startNewQuiz() {

  clearInterval(timer);


  currentRound = 1;

  currentQuestionIndex = 0;

  currentRoundQuestions = [];

  score = 0;

  correctAnswers = 0;

  timeLeft =
    TIME_PER_QUESTION;

  answered = false;


  /*
   New quiz = fresh question pool.
  */

  usedQuestionIndexes = [];


  storageRemove(
    "quizmasterProgress"
  );


  storageRemove(
    "quizmasterSelectedRound"
  );


  storageSet(
    "quizmasterUsedQuestions",
    "[]"
  );


  updateContinueButton();


  startRound(1);

}


window.startNewQuiz =
  startNewQuiz;

/* =========================================================
   START QUIZ
   ========================================================= */

function startQuiz() {

  /*
   This function is used by the current index.html
   for Continue Quiz and Choose Round.

   If a saved quiz exists and no round was selected,
   continue it.

   If a round was selected, start that round.
  */

  const selectedRound =
    Number(
      storageGet(
        "quizmasterSelectedRound",
        ""
      )
    );


  if (
    Number.isInteger(selectedRound) &&
    selectedRound >= 1
  ) {

    storageRemove(
      "quizmasterSelectedRound"
    );


    startRound(
      selectedRound
    );

    return;

  }


  /*
   If saved progress exists,
   continue it.
  */

  const saved =
    storageGet(
      "quizmasterProgress",
      null
    );


  if (saved) {

    continueSavedQuiz();

    return;

  }


  /*
   No saved progress = new quiz.
  */

  startNewQuiz();

}


window.startQuiz =
  startQuiz;

/* =========================================================
   START ROUND
   ========================================================= */

function startRound(roundNumber) {

  clearInterval(timer);


  roundNumber =
    Number(roundNumber);


  if (
    !Number.isInteger(roundNumber) ||
    roundNumber < 1
  ) {

    roundNumber = 1;

  }


  if (
    roundNumber > MAX_ROUNDS
  ) {

    alert(
      "That round does not exist."
    );

    return;

  }


  if (
    roundNumber > unlockedRounds
  ) {

    alert(
      "🔒 This round is locked. Complete the previous round with at least 60%."
    );

    return;

  }


  if (
    allQuestions.length === 0
  ) {

    alert(
      "Questions are still loading. Please wait a moment and try again."
    );

    return;

  }


  currentRound =
    roundNumber;

  currentQuestionIndex = 0;

  score = 0;

  correctAnswers = 0;

  timeLeft =
    TIME_PER_QUESTION;

  answered = false;


  currentRoundQuestions =
    getQuestionsForRound();


  if (
    currentRoundQuestions.length === 0
  ) {

    alert(
      "No questions are available."
    );

    return;

  }


  saveQuizProgress();

  showQuizScreen();

  displayQuestion(false);

}


window.startRound =
  startRound;

/* =========================================================
   RETRY CURRENT ROUND
   ========================================================= */

function retryCurrentRound() {

  startRound(
    currentRound
  );

}


window.retryCurrentRound =
  retryCurrentRound;

/* =========================================================
   DISPLAY QUESTION
   ========================================================= */

function displayQuestion(isContinuing) {

  clearInterval(timer);

  answered = false;


  const question =
    currentRoundQuestions[
      currentQuestionIndex
    ];


  if (!question) {

    finishRound();

    return;

  }


  const questionElement =
    document.getElementById(
      "question"
    );


  const optionsElement =
    document.getElementById(
      "options"
    );


  if (
    !questionElement ||
    !optionsElement
  ) {

    console.error(
      "Quiz HTML elements are missing."
    );

    return;

  }


  const questionNumber =
    document.getElementById(
      "questionNumber"
    );


  const roundDisplay =
    document.getElementById(
      "roundDisplay"
    );


  const scoreElement =
    document.getElementById(
      "score"
    );


  const categoryElement =
    document.getElementById(
      "category"
    );


  const progressBar =
    document.getElementById(
      "progressBar"
    );


  const timerElement =
    document.getElementById(
      "timer"
    );


  const message =
    document.getElementById(
      "message"
    );


  /*
   Question
  */

  questionElement.textContent =
    question.question;


  /*
   Question number
  */

  if (questionNumber) {

    questionNumber.textContent =
      "Question " +
      (currentQuestionIndex + 1) +
      " / " +
      currentRoundQuestions.length;

  }


  /*
   Round
  */

  if (roundDisplay) {

    roundDisplay.textContent =
      "Round " +
      currentRound;

  }


  /*
   Score
  */

  if (scoreElement) {

    scoreElement.textContent =
      "Score: " +
      score;

  }


  /*
   Category
  */

  if (categoryElement) {

    categoryElement.textContent =
      question.category ||
      "General Knowledge";

  }


  /*
   Progress
  */

  if (progressBar) {

    const progress =
      (
        (currentQuestionIndex + 1) /
        currentRoundQuestions.length
      ) * 100;


    progressBar.style.width =
      progress + "%";

  }


  /*
   Clear message
  */

  if (message) {

    message.textContent = "";

    message.classList.add(
      "hidden"
    );

  }


  /*
   Remove old answer buttons.
  */

  optionsElement.innerHTML = "";


  /*
   Shuffle answer choices.
  */

  const shuffledOptions =
    [...question.options];


  for (
    let i =
      shuffledOptions.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );


    const temp =
      shuffledOptions[i];

    shuffledOptions[i] =
      shuffledOptions[j];

    shuffledOptions[j] =
      temp;

  }


  /*
   Create answer buttons.
  */

  shuffledOptions.forEach(
    function (option) {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";

      button.className =
        "option";

      button.textContent =
        option;


      button.addEventListener(
        "click",
        function () {

          selectAnswer(
            option,
            question.answer
          );

        }
      );


      optionsElement.appendChild(
        button
      );

    }
  );


  /*
   Timer.
  */

  if (!isContinuing) {

    timeLeft =
      TIME_PER_QUESTION;

  }


  if (
    !Number.isFinite(timeLeft) ||
    timeLeft <= 0
  ) {

    timeLeft =
      TIME_PER_QUESTION;

  }


  if (timerElement) {

    timerElement.textContent =
      "⏱️ " +
      timeLeft;

  }


  startTimer();

}

/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {

  clearInterval(timer);


  const timerElement =
    document.getElementById(
      "timer"
    );


  if (!timerElement) {
    return;
  }


  timerElement.textContent =
    "⏱️ " +
    timeLeft;


  timer =
    setInterval(
      function () {

        if (answered) {

          clearInterval(timer);

          return;

        }


        timeLeft--;


        if (timeLeft < 0) {

          timeLeft = 0;

        }


        timerElement.textContent =
          "⏱️ " +
          timeLeft;


        /*
         Save every 5 seconds.
        */

        if (
          timeLeft > 0 &&
          timeLeft % 5 === 0
        ) {

          saveQuizProgress();

        }


        if (
          timeLeft <= 0
        ) {

          clearInterval(timer);

          timeUp();

        }

      },
      1000
    );

}

/* =========================================================
   TIME UP
   ========================================================= */

function timeUp() {

  if (answered) {
    return;
  }


  answered = true;

  clearInterval(timer);


  const question =
    currentRoundQuestions[
      currentQuestionIndex
    ];


  if (!question) {

    nextQuestion();

    return;

  }


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function (button) {

      button.disabled = true;


      if (
        button.textContent.trim() ===
        String(question.answer).trim()
      ) {

        button.classList.add(
          "correct"
        );

      }

    }
  );


  const message =
    document.getElementById(
      "message"
    );


  if (message) {

    message.textContent =
      "⏰ Time is up!";

    message.classList.remove(
      "hidden"
    );

  }


  saveQuizProgress();


  setTimeout(
    function () {

      nextQuestion();

    },
    900
  );

}

/* =========================================================
   SELECT ANSWER
   ========================================================= */

function selectAnswer(
  selected,
  correct
) {

  if (answered) {
    return;
  }


  answered = true;

  clearInterval(timer);


  const selectedText =
    String(selected).trim();


  const correctText =
    String(correct).trim();


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function (button) {

      button.disabled = true;


      const text =
        button.textContent.trim();


      if (
        text === correctText
      ) {

        button.classList.add(
          "correct"
        );

      }


      if (
        text === selectedText &&
        selectedText !== correctText
      ) {

        button.classList.add(
          "wrong"
        );

      }

    }
  );


  const message =
    document.getElementById(
      "message"
    );


  if (
    selectedText === correctText
  ) {

    score +=
      POINTS_PER_CORRECT;


    correctAnswers++;


    if (message) {

      message.textContent =
        "✅ Correct! +" +
        POINTS_PER_CORRECT +
        " points";

      message.classList.remove(
        "hidden"
      );

    }

  }

  else {

    if (message) {

      message.textContent =
        "❌ Incorrect!";

      message.classList.remove(
        "hidden"
      );

    }

  }


  const scoreElement =
    document.getElementById(
      "score"
    );


  if (scoreElement) {

    scoreElement.textContent =
      "Score: " +
      score;

  }


  saveQuizProgress();


  setTimeout(
    function () {

      nextQuestion();

    },
    800
  );

}

/* =========================================================
   NEXT QUESTION
   ========================================================= */

function nextQuestion() {

  clearInterval(timer);


  currentQuestionIndex++;


  if (
    currentQuestionIndex >=
    currentRoundQuestions.length
  ) {

    finishRound();

    return;

  }


  timeLeft =
    TIME_PER_QUESTION;


  saveQuizProgress();

  displayQuestion(false);

}

/* =========================================================
   FINISH ROUND
   ========================================================= */

function finishRound() {

  clearInterval(timer);


  const total =
    currentRoundQuestions.length;


  const correct =
    correctAnswers;


  const wrong =
    Math.max(
      0,
      total - correct
    );


  const percentage =
    total > 0
      ? Math.round(
          (correct / total) * 100
        )
      : 0;


  const passed =
    percentage >= PASS_PERCENTAGE;


  /*
   Unlock next round if passed.
  */

  if (passed) {

    if (
      !completedRounds.includes(
        currentRound
      )
    ) {

      completedRounds.push(
        currentRound
      );

    }


    if (
      currentRound < MAX_ROUNDS &&
      currentRound + 1 > unlockedRounds
    ) {

      unlockedRounds =
        currentRound + 1;

    }

  }


  storageSet(
    "quizmasterUnlockedRounds",
    String(unlockedRounds)
  );


  storageSet(
    "quizmasterCompletedRounds",
    JSON.stringify(
      completedRounds
    )
  );


  /*
   Remove current saved game.
  */

  storageRemove(
    "quizmasterProgress"
  );


  updateContinueButton();


  updateResult(
    correct,
    wrong,
    total,
    percentage,
    passed
  );


  renderRounds();

  showResultScreen();

}

/* =========================================================
   UPDATE RESULT
   ========================================================= */

function updateResult(
  correct,
  wrong,
  total,
  percentage,
  passed
) {

  const finalScore =
    document.getElementById(
      "finalScore"
    );


  const resultPercent =
    document.getElementById(
      "resultPercent"
    );


  const resultMessage =
    document.getElementById(
      "resultMessage"
    );


  const correctCount =
    document.getElementById(
      "correctCount"
    );


  const wrongCount =
    document.getElementById(
      "wrongCount"
    );


  const finishedRound =
    document.getElementById(
      "finishedRound"
    );


  const restartBtn =
    document.getElementById(
      "restartBtn"
    );


  if (finalScore) {

    finalScore.textContent =
      "Score: " +
      score;

  }


  if (resultPercent) {

    resultPercent.textContent =
      percentage +
      "%";

  }


  if (correctCount) {

    correctCount.textContent =
      correct;

  }


  if (wrongCount) {

    wrongCount.textContent =
      wrong;

  }


  if (finishedRound) {

    finishedRound.textContent =
      "Round " +
      currentRound +
      " • " +
      correct +
      "/" +
      total +
      " correct";

  }


  if (resultMessage) {

    if (passed) {

      if (
        currentRound < MAX_ROUNDS &&
        currentRound < unlockedRounds
      ) {

        resultMessage.textContent =
          "🎉 Excellent! You passed with " +
          percentage +
          "%. Round " +
          (currentRound + 1) +
          " is now unlocked.";

      }

      else {

        resultMessage.textContent =
          "🎉 Excellent! You completed Round " +
          currentRound +
          " with " +
          percentage +
          "%.";

      }

    }

    else {

      resultMessage.textContent =
        "You got " +
        correct +
        "/" +
        total +
        " correct (" +
        percentage +
        "%). You need at least " +
        PASS_PERCENTAGE +
        "% to unlock the next round.";

    }

  }


  if (restartBtn) {

    restartBtn.style.display =
      "block";

    restartBtn.disabled =
      false;


    if (
      passed &&
      currentRound < MAX_ROUNDS &&
      currentRound < unlockedRounds
    ) {

      restartBtn.textContent =
        "▶️ Continue to Round " +
        (currentRound + 1);

    }

    else {

      restartBtn.textContent =
        "🔄 Try Round Again";

    }

  }

}

/* =========================================================
   RENDER ROUNDS
   ========================================================= */

function renderRounds() {

  const roundGrid =
    document.getElementById(
      "roundGrid"
    );


  if (!roundGrid) {
    return;
  }


  const totalPossibleRounds =
    Math.max(
      1,
      Math.ceil(
        allQuestions.length /
        QUESTIONS_PER_ROUND
      )
    );


  const maxRounds =
    Math.min(
      MAX_ROUNDS,
      totalPossibleRounds
    );


  const buttons =
    roundGrid.querySelectorAll(
      ".round-btn"
    );


  buttons.forEach(
    function (button, index) {

      const round =
        index + 1;


      if (
        round > maxRounds
      ) {

        button.style.display =
          "none";

        return;

      }


      button.style.display =
        "block";


      button.disabled =
        false;


      button.classList.remove(
        "unlocked",
        "locked",
        "completed"
      );


      button.setAttribute(
        "data-round",
        String(round)
      );


      const isUnlocked =
        round <= unlockedRounds;


      const isCompleted =
        completedRounds.includes(
          round
        );


      if (isCompleted) {

        button.classList.add(
          "completed"
        );

        button.textContent =
          "✅ Round " +
          round;

        button.disabled =
          false;

      }

      else if (isUnlocked) {

        button.classList.add(
          "unlocked"
        );

        button.textContent =
          "▶️ Round " +
          round;

        button.disabled =
          false;

      }

      else {

        button.classList.add(
          "locked"
        );

        button.textContent =
          "🔒 Round " +
          round;

        button.disabled =
          true;

      }

    }
  );

}


window.renderRounds =
  renderRounds;

/* =========================================================
   RESET ALL QUIZ DATA
   ========================================================= */

function resetQuizData() {

  clearInterval(timer);


  storageRemove(
    "quizmasterProgress"
  );

  storageRemove(
    "quizmasterUsedQuestions"
  );

  storageRemove(
    "quizmasterCompletedRounds"
  );

  storageRemove(
    "quizmasterUnlockedRounds"
  );

  storageRemove(
    "quizmasterSelectedRound"
  );


  unlockedRounds = 1;

  completedRounds = [];

  usedQuestionIndexes = [];

  currentRound = 1;

  currentQuestionIndex = 0;

  currentRoundQuestions = [];

  score = 0;

  correctAnswers = 0;

  timeLeft =
    TIME_PER_QUESTION;

  answered = false;


  updateContinueButton();

  renderRounds();

  showStartScreen();

}


window.resetQuizData =
  resetQuizData;

/* =========================================================
   RESULT BUTTONS
   ========================================================= */

function connectResultButtons() {

  const restartBtn =
    document.getElementById(
      "restartBtn"
    );


  const resultHomeBtn =
    document.getElementById(
      "resultHomeBtn"
    );


  const quizHomeBtn =
    document.getElementById(
      "quizHomeBtn"
    );


  const errorRestartBtn =
    document.getElementById(
      "errorRestartBtn"
    );


  const errorHomeBtn =
    document.getElementById(
      "errorHomeBtn"
    );


  /*
   Restart / next round
  */

  if (restartBtn) {

    restartBtn.onclick =
      function (event) {

        event.preventDefault();


        if (
          completedRounds.includes(
            currentRound
          ) &&
          currentRound < unlockedRounds
        ) {

          startRound(
            currentRound + 1
          );

        }

        else {

          retryCurrentRound();

        }

      };

  }


  /*
   Result home
  */

  if (resultHomeBtn) {

    resultHomeBtn.onclick =
      function (event) {

        event.preventDefault();

        clearInterval(timer);

        showStartScreen();

      };

  }


  /*
   Quiz home
  */

  if (quizHomeBtn) {

    quizHomeBtn.onclick =
      function (event) {

        event.preventDefault();

        clearInterval(timer);

        showStartScreen();

      };

  }


  /*
   Error restart
  */

  if (errorRestartBtn) {

    errorRestartBtn.onclick =
      function (event) {

        event.preventDefault();

        location.reload();

      };

  }


  /*
   Error home
  */

  if (errorHomeBtn) {

    errorHomeBtn.onclick =
      function (event) {

        event.preventDefault();

        showStartScreen();

      };

  }

}

/* =========================================================
   ROUND BUTTON CONNECTION
   ========================================================= */

function connectRoundButtons() {

  const buttons =
    document.querySelectorAll(
      ".round-btn"
    );


  buttons.forEach(
    function (button) {

      /*
       Prevent duplicate listeners by replacing
       onclick instead of addEventListener.
      */

      button.onclick =
        function (event) {

          event.preventDefault();


          if (
            button.disabled ||
            button.classList.contains("locked")
          ) {

            return;

          }


          const round =
            Number(
              button.getAttribute(
                "data-round"
              )
            );


          if (
            !Number.isInteger(round) ||
            round < 1
          ) {

            return;

          }


          if (
            round > unlockedRounds
          ) {

            alert(
              "🔒 This round is locked."
            );

            return;

          }


          storageSet(
            "quizmasterSelectedRound",
            String(round)
          );


          startQuiz();

        };

    }
  );

}

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadSavedState();

    connectResultButtons();

    connectRoundButtons();

    loadQuestions();

  }
);
