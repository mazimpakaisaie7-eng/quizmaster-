/* =====================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS + ROUND SYSTEM
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
   UNLOCKED ROUNDS
   ===================================================== */

let unlockedRounds = parseInt(
  localStorage.getItem("quizmasterUnlockedRounds") || "1",
  10
);

if (!Number.isInteger(unlockedRounds) || unlockedRounds < 1) {
  unlockedRounds = 1;
}


/* =====================================================
   COMPLETED ROUNDS
   ===================================================== */

let completedRounds = [];

try {
  const savedCompleted =
    localStorage.getItem("quizmasterCompletedRounds");

  completedRounds =
    savedCompleted
      ? JSON.parse(savedCompleted)
      : [];

  if (!Array.isArray(completedRounds)) {
    completedRounds = [];
  }

} catch (error) {
  completedRounds = [];
}


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


    allQuestions =
      allQuestions.filter(validQuestion);


    if (allQuestions.length === 0) {
      throw new Error(
        "No valid questions found."
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


    alert(
      "Unable to load quiz questions. Please check questions.json."
    );
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
    question.options.every(
      option =>
        typeof option === "string" &&
        option.trim() !== ""
    ) &&
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

    if (
      !usedQuestionIndexes.includes(i)
    ) {

      available.push(i);
    }
  }


  /*
    If there are not enough unused questions
    for another complete round, start a new cycle.
  */

  if (
    available.length < QUESTIONS_PER_ROUND
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


  /* ===================================================
     SHUFFLE QUESTIONS
     =================================================== */

  for (
    let i = available.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      available[i],
      available[j]
    ] = [
      available[j],
      available[i]
    ];
  }


  const selected =
    available.slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        available.length
      )
    );


  selected.forEach(index => {

    if (
      !usedQuestionIndexes.includes(index)
    ) {

      usedQuestionIndexes.push(index);
    }

  });


  localStorage.setItem(
    "quizmasterUsedQuestions",
    JSON.stringify(
      usedQuestionIndexes
    )
  );


  return selected.map(
    index => allQuestions[index]
  );
}


/* =====================================================
   SAVE PROGRESS
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


window.saveQuizProgress =
  saveQuizProgress;


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
      "There is no saved quiz to continue."
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


    if (
      typeof window.showQuizScreen ===
      "function"
    ) {

      window.showQuizScreen();
    }


    displayQuestion(true);


  } catch (error) {

    console.error(
      "Continue error:",
      error
    );


    localStorage.removeItem(
      "quizmasterProgress"
    );


    startRound(1);
  }
}


window.continueQuiz =
  continueQuiz;


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

  timeLeft =
    TIME_PER_QUESTION;

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


window.startNewQuiz =
  startNewQuiz;


/* =====================================================
   START QUIZ
   ===================================================== */

function startQuiz() {

  startNewQuiz();
}


window.startQuiz =
  startQuiz;


/* =====================================================
   START ROUND
   ===================================================== */

function startRound(roundNumber) {

  roundNumber =
    Number(roundNumber);


  if (
    roundNumber > unlockedRounds
  ) {

    alert(
      "🔒 This round is locked. Complete the previous round with at least 60%."
    );

    return;
  }


  clearInterval(timer);


  currentRound =
    roundNumber;

  currentQuestionIndex =
    0;

  score =
    0;

  correctAnswers =
    0;

  answered =
    false;

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


  if (
    typeof window.showQuizScreen ===
    "function"
  ) {

    window.showQuizScreen();
  }


  displayQuestion(false);
}


/* =====================================================
   RETRY ROUND
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


  const questionText =
    document.getElementById(
      "questionText"
    );

  const options =
    document.getElementById(
      "options"
    );

  const questionNumber =
    document.getElementById(
      "questionNumber"
    );

  const roundLabel =
    document.getElementById(
      "roundLabel"
    );

  const scoreLabel =
    document.getElementById(
      "scoreLabel"
    );

  const progressBar =
    document.getElementById(
      "progressBar"
    );


  if (
    !questionText ||
    !options
  ) {

    console.error(
      "Quiz elements missing from index.html."
    );

    return;
  }


  questionText.textContent =
    question.question;


  if (questionNumber) {

    questionNumber.textContent =
      "Question " +
      (currentQuestionIndex + 1) +
      "/" +
      currentRoundQuestions.length;
  }


  if (roundLabel) {

    roundLabel.textContent =
      "Round " +
      currentRound;
  }


  if (scoreLabel) {

    scoreLabel.textContent =
      "Score: " +
      score;
  }


  const progress =
    (
      currentQuestionIndex /
      currentRoundQuestions.length
    ) * 100;


  if (progressBar) {

    progressBar.style.width =
      progress + "%";
  }


  options.innerHTML = "";


  /* ===================================================
     SHUFFLE OPTIONS
     =================================================== */

  const shuffledOptions =
    [...question.options];


  for (
    let i = shuffledOptions.length - 1;
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


  shuffledOptions.forEach(
    option => {

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
        function() {

          selectAnswer(
            option,
            question.answer
          );
        }
      );


      options.appendChild(button);
    }
  );


  /* ===================================================
     TIMER
     =================================================== */

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
      function() {

        timeLeft--;


        timerElement.textContent =
          "⏱️ " +
          timeLeft;


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
    button => {

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
    button => {

      button.disabled = true;


      if (
        button.textContent.trim() ===
        correct.trim()
      ) {

        button.classList.add(
          "correct"
        );
      }


      if (
        button.textContent.trim() ===
        selected.trim() &&
        selected.trim() !==
        correct.trim()
      ) {

        button.classList.add(
          "wrong"
        );
      }
    }
  );


  if (
    selected.trim() ===
    correct.trim()
  ) {

    score +=
      POINTS_PER_CORRECT;

    correctAnswers++;
  }


  const scoreLabel =
    document.getElementById(
      "scoreLabel"
    );


  if (scoreLabel) {

    scoreLabel.textContent =
      "Score: " +
      score;
  }


  setTimeout(
    nextQuestion,
    800
  );
}


/* =====================================================
   NEXT QUESTION
   ===================================================== */

function nextQuestion() {

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


/* =====================================================
   FINISH ROUND
   ===================================================== */

function finishRound() {

  clearInterval(timer);


  const total =
    currentRoundQuestions.length;


  const percentage =
    total > 0
      ? Math.round(
          (correctAnswers / total) * 100
        )
      : 0;


  const passed =
    percentage >= 60;


  /* ===================================================
     SAVE COMPLETED ROUND
     =================================================== */

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


    localStorage.setItem(
      "quizmasterCompletedRounds",
      JSON.stringify(
        completedRounds
      )
    );


    /* Unlock next round */

    const nextRound =
      currentRound + 1;


    if (
      nextRound > unlockedRounds
    ) {

      unlockedRounds =
        nextRound;


      localStorage.setItem(
        "quizmasterUnlockedRounds",
        String(unlockedRounds)
      );
    }
  }


  /* ===================================================
     REMOVE ACTIVE PROGRESS
     =================================================== */

  localStorage.removeItem(
    "quizmasterProgress"
  );


  updateContinueButton();


  const nextRoundNumber =
    currentRound + 1;


  if (
    typeof window.updateResult ===
    "function"
  ) {

    window.updateResult(
      correctAnswers,
      total,
      passed,
      nextRoundNumber
    );
  }


  if (
    typeof window.showResultScreen ===
    "function"
  ) {

    window.showResultScreen();
  }


  renderRounds();
}


/* =====================================================
   RENDER ROUNDS
   ===================================================== */

function renderRounds() {

  const grid =
    document.getElementById(
      "roundGrid"
    );


  if (!grid) {
    return;
  }


  grid.innerHTML = "";


  const possibleRounds =
    Math.max(
      1,
      Math.ceil(
        allQuestions.length /
        QUESTIONS_PER_ROUND
      )
    );


  /*
    Show all rounds that actually exist.
  */

  for (
    let i = 1;
    i <= possibleRounds;
    i++
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "round-btn";


    const unlocked =
      i <= unlockedRounds;


    const completed =
      completedRounds.includes(i);


    if (unlocked) {

      if (completed) {

        button.classList.add(
          "completed"
        );

        button.textContent =
          "✅ Round " + i;

      } else {

        button.classList.add(
          "unlocked"
        );

        button.textContent =
          "▶️ Round " + i;
      }


      button.addEventListener(
        "click",
        function() {

          startRound(i);
        }
      );


    } else {

      button.classList.add(
        "locked"
      );


      button.textContent =
        "🔒 Round " + i;


      button.addEventListener(
        "click",
        function() {

          alert(
            "🔒 Locked. Get at least 60% in the previous round to unlock this round."
          );
        }
      );
    }


    grid.appendChild(button);
  }
}


window.renderRounds =
  renderRounds;


/* =====================================================
   CONTINUE BUTTON
   ===================================================== */

function updateContinueButton() {

  const button =
    document.getElementById(
      "continueBtn"
    );


  if (!button) {
    return;
  }


  button.style.display =
    "block";


  button.textContent =
    "▶️ Continue Quiz";
}


window.updateContinueButton =
  updateContinueButton;


/* =====================================================
   INITIALIZE
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const savedUsed =
      localStorage.getItem(
        "quizmasterUsedQuestions"
      );


    if (savedUsed) {

      try {

        usedQuestionIndexes =
          JSON.parse(savedUsed);


        if (
          !Array.isArray(
            usedQuestionIndexes
          )
        ) {

          usedQuestionIndexes = [];
        }

      } catch (error) {

        usedQuestionIndexes = [];
      }
    }


    loadQuestions();
  }
);

Ikintu cy'ingenzi nakosoye: nongeyemo "window.startQuiz = startQuiz;". Ibi ni ingenzi cyane niba "index.html" yawe ifite button nka:

<button id="startBtn" type="button">▶️ Start Quiz</button>

kandi ikayihamagara:

window.startQuiz()

Noneho "Start Quiz" izatangiza quiz neza.

Ariko hari ikindi tugomba kugenzura

Kugira ngo iyi "questions.js" ikore neza, "index.html" yawe igomba kuba ifite IDs izi:

- "startBtn"
- "continueBtn"
- "questionText"
- "options"
- "questionNumber"
- "roundLabel"
- "scoreLabel"
- "timer"
- "progressBar"
- "roundGrid"

Kandi "index.html" igomba kurangiza ishyiraho:

<script src="./questions.js"></script>

Niba umbwiye ngo "ngenzurira na index.html", nyohereza "index.html" yawe yose. Ndayihuza n'iyi "questions.js" kugira ngo Start Quiz, Continue, Round, Timer, Result na Share bikorere hamwe nta conflict.
