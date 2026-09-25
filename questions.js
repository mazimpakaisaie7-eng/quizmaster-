/* =====================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS + ROUND + SAVE/CONTINUE SYSTEM
   ===================================================== */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;
const QUESTIONS_FILE = "./questions.json";


/* =====================================================
   GLOBAL VARIABLES
   ===================================================== */

let allQuestions = [];

let currentRound = 1;
let currentQuestionIndex = 0;
let currentRoundQuestions = [];

let score = 0;
let correctAnswers = 0;

let timer = null;
let timeLeft = TIME_PER_QUESTION;

let answered = false;

let usedQuestionIndexes = [];


/* =====================================================
   ROUND STORAGE
   ===================================================== */

let unlockedRounds = parseInt(
  localStorage.getItem("quizmasterUnlockedRounds") || "1",
  10
);

if (!Number.isInteger(unlockedRounds) || unlockedRounds < 1) {
  unlockedRounds = 1;
}


let completedRounds = [];

try {
  const savedCompleted = localStorage.getItem(
    "quizmasterCompletedRounds"
  );

  completedRounds = savedCompleted
    ? JSON.parse(savedCompleted)
    : [];

  if (!Array.isArray(completedRounds)) {
    completedRounds = [];
  }

} catch (error) {

  completedRounds = [];

}


/* =====================================================
   SCREEN CONTROL
   ===================================================== */

function showScreen(screenId) {

  document.querySelectorAll(".screen").forEach(function (screen) {
    screen.classList.remove("active");
  });

  const target = document.getElementById(screenId);

  if (target) {
    target.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


function showQuizScreen() {
  showScreen("quizScreen");
}


function showResultScreen() {
  showScreen("resultScreen");
}


function showStartScreen() {
  showScreen("startScreen");
}


window.showQuizScreen = showQuizScreen;
window.showResultScreen = showResultScreen;


/* =====================================================
   LOAD QUESTIONS
   ===================================================== */

async function loadQuestions() {

  try {

    const response = await fetch(
      QUESTIONS_FILE + "?v=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Could not load questions.json"
      );
    }

    const data = await response.json();


    if (Array.isArray(data)) {

      allQuestions = data;

    } else if (
      data &&
      Array.isArray(data.questions)
    ) {

      allQuestions = data.questions;

    } else {

      throw new Error(
        "questions.json must contain an array of questions."
      );

    }


    allQuestions = allQuestions.filter(validQuestion);


    if (allQuestions.length === 0) {

      throw new Error(
        "No valid questions were found in questions.json."
      );

    }


    console.log(
      "Quiz Master loaded questions:",
      allQuestions.length
    );


    renderRounds();
    updateContinueButton();

  } catch (error) {

    console.error(
      "Quiz Master loading error:",
      error
    );

    const errorMessage =
      document.getElementById("errorMessage");

    if (errorMessage) {

      errorMessage.textContent =
        "Unable to load questions.json. Please make sure the file exists in the project root and contains valid questions.";

    }

    showScreen("errorScreen");

  }

}


/* =====================================================
   VALIDATE QUESTION
   ===================================================== */

function validQuestion(question) {

  return (

    question &&

    typeof question.question === "string" &&

    question.question.trim() !== "" &&

    Array.isArray(question.options) &&

    question.options.length >= 2 &&

    question.options.every(function (option) {

      return (
        typeof option === "string" &&
        option.trim() !== ""
      );

    }) &&

    typeof question.answer === "string" &&

    question.answer.trim() !== ""

  );

}


/* =====================================================
   GET QUESTIONS FOR ROUND
   ===================================================== */

function getQuestionsForRound() {

  let available = [];


  for (
    let i = 0;
    i < allQuestions.length;
    i++
  ) {

    if (!usedQuestionIndexes.includes(i)) {

      available.push(i);

    }

  }


  /*
   If there are not enough unused questions,
   allow the question pool to restart.
  */

  if (
    available.length <
    QUESTIONS_PER_ROUND
  ) {

    usedQuestionIndexes = [];

    available = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i++
    ) {

      available.push(i);

    }

  }


  /*
   Shuffle questions
  */

  for (
    let i = available.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [
      available[i],
      available[j]
    ] = [
      available[j],
      available[i]
    ];

  }


  const selected = available.slice(
    0,
    Math.min(
      QUESTIONS_PER_ROUND,
      available.length
    )
  );


  selected.forEach(function (index) {

    if (!usedQuestionIndexes.includes(index)) {

      usedQuestionIndexes.push(index);

    }

  });


  localStorage.setItem(
    "quizmasterUsedQuestions",
    JSON.stringify(usedQuestionIndexes)
  );


  return selected.map(function (index) {

    return allQuestions[index];

  });

}


/* =====================================================
   SAVE QUIZ PROGRESS
   ===================================================== */

function saveQuizProgress() {

  if (
    !currentRoundQuestions ||
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


  localStorage.setItem(
    "quizmasterProgress",
    JSON.stringify(progress)
  );


  updateContinueButton();

}


window.saveQuizProgress = saveQuizProgress;


/* =====================================================
   CONTINUE QUIZ
   ===================================================== */

function continueQuiz() {

  const saved =
    localStorage.getItem(
      "quizmasterProgress"
    );


  if (!saved) {

    alert(
      "There is no saved quiz to continue. Start a new quiz first."
    );

    return;

  }


  try {

    const progress =
      JSON.parse(saved);


    currentRound =
      Number(progress.currentRound) || 1;


    currentQuestionIndex =
      Number(progress.currentQuestionIndex) || 0;


    currentRoundQuestions =
      Array.isArray(
        progress.currentRoundQuestions
      )
        ? progress.currentRoundQuestions
        : [];


    score =
      Number(progress.score) || 0;


    correctAnswers =
      Number(progress.correctAnswers) || 0;


    timeLeft =
      Number(progress.timeLeft) > 0
        ? Number(progress.timeLeft)
        : TIME_PER_QUESTION;


    usedQuestionIndexes =
      Array.isArray(
        progress.usedQuestionIndexes
      )
        ? progress.usedQuestionIndexes
        : [];


    if (
      currentRoundQuestions.length === 0
    ) {

      startRound(currentRound);

      return;

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


  } catch (error) {

    console.error(
      "Continue quiz error:",
      error
    );


    localStorage.removeItem(
      "quizmasterProgress"
    );


    alert(
      "Saved quiz data could not be restored. A new quiz will start."
    );


    startNewQuiz();

  }

}


window.continueQuiz = continueQuiz;


/* =====================================================
   START NEW QUIZ
   ===================================================== */

function startNewQuiz() {

  clearInterval(timer);


  currentRound = 1;

  currentQuestionIndex = 0;

  currentRoundQuestions = [];

  score = 0;

  correctAnswers = 0;

  answered = false;

  timeLeft = TIME_PER_QUESTION;

  usedQuestionIndexes = [];


  localStorage.removeItem(
    "quizmasterProgress"
  );


  localStorage.setItem(
    "quizmasterUsedQuestions",
    JSON.stringify([])
  );


  startRound(1);

}


window.startNewQuiz = startNewQuiz;


/* =====================================================
   START QUIZ
   ===================================================== */

function startQuiz() {

  startNewQuiz();

}


window.startQuiz = startQuiz;


/* =====================================================
   START SELECTED ROUND
   ===================================================== */

function startRound(roundNumber) {

  roundNumber =
    Number(roundNumber);


  if (
    !Number.isInteger(roundNumber) ||
    roundNumber < 1
  ) {

    roundNumber = 1;

  }


  if (
    roundNumber >
    unlockedRounds
  ) {

    alert(
      "🔒 This round is locked. Complete the previous round with at least 60%."
    );

    return;

  }


  if (allQuestions.length === 0) {

    alert(
      "Questions are still loading. Please try again."
    );

    return;

  }


  clearInterval(timer);


  currentRound =
    roundNumber;


  currentQuestionIndex = 0;

  score = 0;

  correctAnswers = 0;

  answered = false;

  timeLeft =
    TIME_PER_QUESTION;


  currentRoundQuestions =
    getQuestionsForRound();


  if (
    currentRoundQuestions.length === 0
  ) {

    alert(
      "No valid questions are available."
    );

    return;

  }


  saveQuizProgress();


  showQuizScreen();


  displayQuestion(false);

}


window.startRound = startRound;


/* =====================================================
   RETRY CURRENT ROUND
   ===================================================== */

function retryCurrentRound() {

  startRound(currentRound);

}


window.retryCurrentRound =
  retryCurrentRound;


/* =====================================================
   START NEXT ROUND
   ===================================================== */

function startNextRound() {

  const nextRound =
    currentRound + 1;


  if (
    nextRound <= unlockedRounds
  ) {

    startRound(nextRound);

  } else {

    alert(
      "🔒 Complete this round with at least 60% first."
    );

  }

}


window.startNextRound =
  startNextRound;


/* =====================================================
   DISPLAY QUESTION
   ===================================================== */

function displayQuestion(
  isContinuing = false
) {

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


  /*
   IMPORTANT:
   These IDs exactly match index.html
  */

  const questionElement =
    document.getElementById("question");

  const options =
    document.getElementById("options");

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


  if (
    !questionElement ||
    !options
  ) {

    console.error(
      "Quiz elements are missing from index.html."
    );

    return;

  }


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
      question.category
        ? question.category
        : "General Knowledge";

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
   Clear old options
  */

  options.innerHTML = "";


  /*
   Shuffle options
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


    [
      shuffledOptions[i],
      shuffledOptions[j]
    ] = [
      shuffledOptions[j],
      shuffledOptions[i]
    ];

  }


  /*
   Create option buttons
  */

  shuffledOptions.forEach(
    function (option) {

      const button =
        document.createElement(
          "button"
        );


      button.type = "button";

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


      options.appendChild(
        button
      );

    }
  );


  /*
   Continue saved timer
  */

  if (
    !isContinuing ||
    !timeLeft ||
    timeLeft <= 0
  ) {

    timeLeft =
      TIME_PER_QUESTION;

  }


  startTimer();

}


/* =====================================================
   TIMER
   ===================================================== */

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

        timeLeft--;


        timerElement.textContent =
          "⏱️ " +
          timeLeft;


        /*
         Save every 5 seconds
        */

        if (
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


/* =====================================================
   TIME UP
   ===================================================== */

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


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function (button) {

      button.disabled = true;


      if (
        button.textContent.trim() ===
        question.answer.trim()
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


  setTimeout(
    nextQuestion,
    900
  );

}


/* =====================================================
   SELECT ANSWER
   ===================================================== */

function selectAnswer(
  selected,
  correct
) {

  if (answered) {

    return;

  }


  answered = true;

  clearInterval(timer);


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
        text === correct.trim()
      ) {

        button.classList.add(
          "correct"
        );

      }


      if (
        text === selected.trim() &&
        selected.trim() !==
          correct.trim()
      ) {

        button.classList.add(
          "wrong"
        );

      }

    }
  );


  /*
   Correct answer
  */

  if (
    selected.trim() ===
    correct.trim()
  ) {

    score +=
      POINTS_PER_CORRECT;

    correctAnswers++;


    const message =
      document.getElementById(
        "message"
      );


    if (message) {

      message.textContent =
        "✅ Correct! +" +
        POINTS_PER_CORRECT +
        " points";

      message.classList.remove(
        "hidden"
      );

    }

  } else {

    const message =
      document.getElementById(
        "message"
      );


    if (message) {

      message.textContent =
        "❌ Incorrect!";

      message.classList.remove(
        "hidden"
      );

    }

  }


  /*
   Update score immediately
  */

  const scoreElement =
    document.getElementById(
      "score"
    );


  if (scoreElement) {

    scoreElement.textContent =
      "Score: " +
      score;

  }


  /*
   Save before moving forward
  */

  saveQuizProgress();


  setTimeout(
    nextQuestion,
    800
  );

}


/* =====================================================
   NEXT QUESTION
   ===================================================== */

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


  const message =
    document.getElementById(
      "message"
    );


  if (message) {

    message.textContent = "";

    message.classList.add(
      "hidden"
    );

  }


  saveQuizProgress();


  displayQuestion(false);

}


/* =====================================================
   RESULT UPDATE
   ===================================================== */

function updateResult(
  correct,
  total,
  passed,
  nextRoundNumber
) {

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
