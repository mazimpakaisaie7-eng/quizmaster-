/* =====================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS + ROUND SYSTEM
   ===================================================== */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;

const QUESTIONS_FILE = "./questions.json";

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

let unlockedRounds =
  parseInt(
    localStorage.getItem(
      "quizmasterUnlockedRounds"
    ) || "1",
    10
  );


/* =====================================================
   LOAD QUESTIONS
   ===================================================== */

async function loadQuestions() {

  try {

    const response =
      await fetch(
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

    const data =
      await response.json();

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

    if (allQuestions.length === 0) {

      throw new Error(
        "No questions found."
      );
    }

    console.log(
      "Loaded questions:",
      allQuestions.length
    );

    renderRounds();

    updateContinueButton();

  } catch (error) {

    console.error(error);

    alert(
      "Unable to load quiz questions. Please check questions.json."
    );
  }
}


/* =====================================================
   QUESTION VALIDATION
   ===================================================== */

function validQuestion(question) {

  return (
    question &&
    typeof question.question === "string" &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    typeof question.answer === "string"
  );
}


/* =====================================================
   GET RANDOM QUESTIONS
   ===================================================== */

function getQuestionsForRound() {

  const available = [];

  for (
    let i = 0;
    i < allQuestions.length;
    i++
  ) {

    if (
      !usedQuestionIndexes.includes(i) &&
      validQuestion(allQuestions[i])
    ) {

      available.push(i);
    }
  }


  /*
    If all questions have been used,
    start using them again.
  */

  if (
    available.length <
    QUESTIONS_PER_ROUND
  ) {

    usedQuestionIndexes = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i++
    ) {

      if (validQuestion(allQuestions[i])) {
        available.push(i);
      }
    }
  }


  /* Shuffle */

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


  selected.forEach(function(index) {

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


  return selected.map(function(index) {

    return allQuestions[index];

  });
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

  console.log(
    "Quiz progress saved."
  );
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

    renderRounds();

    if (
      typeof window.showRoundScreen ===
      "function"
    ) {

      window.showRoundScreen();
    }

    return;
  }


  try {

    const progress =
      JSON.parse(saved);


    currentRound =
      progress.currentRound || 1;

    currentQuestionIndex =
      progress.currentQuestionIndex || 0;

    currentRoundQuestions =
      progress.currentRoundQuestions || [];

    score =
      progress.score || 0;

    correctAnswers =
      progress.correctAnswers || 0;

    timeLeft =
      progress.timeLeft ||
      TIME_PER_QUESTION;

    usedQuestionIndexes =
      progress.usedQuestionIndexes || [];


    if (
      currentRoundQuestions.length === 0
    ) {

      startRound(currentRound);

      return;
    }


    if (
      typeof window.showQuizScreen ===
      "function"
    ) {

      window.showQuizScreen();
    }


    displayQuestion();

  } catch (error) {

    console.error(error);

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

  currentRound = 1;

  currentQuestionIndex = 0;

  score = 0;

  correctAnswers = 0;

  answered = false;

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
   START ROUND
   ===================================================== */

function startRound(roundNumber) {

  if (
    roundNumber >
    unlockedRounds
  ) {

    alert(
      "🔒 This round is locked. Complete the previous round with at least 60%."
    );

    return;
  }


  currentRound =
    roundNumber;

  currentQuestionIndex = 0;

  score = 0;

  correctAnswers = 0;

  answered = false;


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


  displayQuestion();
}


/* =====================================================
   RETRY CURRENT ROUND
   ===================================================== */

function retryCurrentRound() {

  startRound(currentRound);
}


window.retryCurrentRound =
  retryCurrentRound;


/* =====================================================
   NEXT ROUND
   ===================================================== */

function startNextRound() {

  const next =
    currentRound + 1;


  if (
    next <= unlockedRounds
  ) {

    startRound(next);

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

function displayQuestion() {

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


  questionText.textContent =
    question.question;


  questionNumber.textContent =
    "Question " +
    (currentQuestionIndex + 1) +
    "/" +
    currentRoundQuestions.length;


  roundLabel.textContent =
    "Round " +
    currentRound;


  scoreLabel.textContent =
    "Score: " +
    score;


  const progress =
    (
      currentQuestionIndex /
      currentRoundQuestions.length
    ) * 100;


  progressBar.style.width =
    progress + "%";


  options.innerHTML = "";


  /* Shuffle answer options */

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
        Math.random() *
        (i + 1)
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
    function(option) {

      const button =
        document.createElement(
          "button"
        );


      button.className =
        "option";


      button.type =
        "button";


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


      options.appendChild(
        button
      );
    }
  );


  timeLeft =
    TIME_PER_QUESTION;


  startTimer();
}


/* =====================================================
   TIMER
   ===================================================== */

function startTimer() {

  const timerElement =
    document.getElementById(
      "timer"
    );


  timerElement.textContent =
    "⏱️ " +
    timeLeft;


  timer =
    setInterval(function() {

      timeLeft--;


      timerElement.textContent =
        "⏱️ " +
        timeLeft;


      if (timeLeft <= 0) {

        clearInterval(timer);

        timeUp();

      }

    }, 1000);
}


/* =====================================================
   TIME UP
   ===================================================== */

function timeUp() {

  if (answered) {
    return;
  }


  answered = true;


  const question =
    currentRoundQuestions[
      currentQuestionIndex
    ];


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function(button) {

      button.disabled =
        true;


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
    function(button) {

      button.disabled =
        true;


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


  document.getElementById(
    "scoreLabel"
  ).textContent =
    "Score: " + score;


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


  saveQuizProgress();

  displayQuestion();
}


/* =====================================================
   FINISH ROUND
   ===================================================== */

function finishRound() {

  clearInterval(timer);


  const total =
    currentRoundQuestions.length;


  const percentage =
    Math.round(
      (correctAnswers / total) *
      100
    );


  const passed =
    percentage >= 60;


  /*
    Unlock next round only when
    score is 60% or more.
  */

  if (passed) {

    const nextRound =
      currentRound + 1;


    if (
      nextRound >
      unlockedRounds
    ) {

      unlockedRounds =
        nextRound;


      localStorage.setItem(
        "quizmasterUnlockedRounds",
        unlockedRounds
      );
    }
  }


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
   ROUND BUTTONS
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


  /*
    Number of rounds is calculated
    from the available questions.
  */

  const possibleRounds =
    Math.max(
      1,
      Math.ceil(
        allQuestions.length /
        QUESTIONS_PER_ROUND
      )
    );


  /*
    Always show all available rounds.
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


    button.className =
      "round-btn";


    button.type =
      "button";


    if (
      i <= unlockedRounds
    ) {

      button.classList.add(
        "unlocked"
      );


      button.textContent =
        "▶️ Round " + i;


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


  const saved =
    localStorage.getItem(
      "quizmasterProgress"
    );


  if (saved) {

    button.style.display =
      "block";

  } else {

    button.style.display =
      "block";
  }
}


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

      } catch (error) {

        usedQuestionIndexes = [];

      }
    }


    loadQuestions();

  }
);
