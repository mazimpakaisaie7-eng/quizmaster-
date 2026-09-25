/* =====================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS + ROUNDS + SAVE / CONTINUE
   MATCHED WITH CURRENT index.html
   ===================================================== */

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 20;
const POINTS_PER_CORRECT = 10;
const PASS_PERCENTAGE = 60;
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
   STORAGE
   ===================================================== */

let unlockedRounds = 1;
let completedRounds = [];

try {

  unlockedRounds = parseInt(
    localStorage.getItem(
      "quizmasterUnlockedRounds"
    ) || "1",
    10
  );

  if (
    !Number.isInteger(unlockedRounds) ||
    unlockedRounds < 1
  ) {
    unlockedRounds = 1;
  }

} catch (error) {

  unlockedRounds = 1;

}


try {

  const savedCompleted =
    localStorage.getItem(
      "quizmasterCompletedRounds"
    );

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


try {

  const savedUsed =
    localStorage.getItem(
      "quizmasterUsedQuestions"
    );

  if (savedUsed) {

    const parsed =
      JSON.parse(savedUsed);

    if (Array.isArray(parsed)) {
      usedQuestionIndexes = parsed;
    }

  }

} catch (error) {

  usedQuestionIndexes = [];

}


/* =====================================================
   SCREEN CONTROL
   ===================================================== */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(function(screen) {

      screen.classList.remove("active");

    });


  const target =
    document.getElementById(screenId);


  if (target) {

    target.classList.add("active");

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


window.showStartScreen = showStartScreen;
window.showQuizScreen = showQuizScreen;
window.showResultScreen = showResultScreen;
window.showRoundsScreen = showRoundsScreen;


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

    question.options.every(function(option) {

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
   LOAD QUESTIONS
   ===================================================== */

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
        "Could not load questions.json"
      );

    }


    const data =
      await response.json();


    if (Array.isArray(data)) {

      allQuestions = data;

    }

    else if (
      data &&
      Array.isArray(data.questions)
    ) {

      allQuestions =
        data.questions;

    }

    else {

      throw new Error(
        "questions.json must contain an array of questions."
      );

    }


    allQuestions =
      allQuestions.filter(
        validQuestion
      );


    if (allQuestions.length === 0) {

      throw new Error(
        "No valid questions were found."
      );

    }


    console.log(
      "Quiz Master loaded:",
      allQuestions.length,
      "questions"
    );


    renderRounds();
    updateContinueButton();


    /* Make Start Quiz work */

    const startBtn =
      document.getElementById(
        "startBtn"
      );


    if (startBtn) {

      startBtn.onclick =
        function(event) {

          event.preventDefault();

          startQuiz();

        };

    }


    console.log(
      "Quiz Master is ready."
    );


  } catch (error) {

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
        "Unable to load questions.json. Please make sure questions.json exists in the project root and contains valid questions.";

    }


    showScreen(
      "errorScreen"
    );

  }

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
   If not enough unused questions remain,
   reset the question pool.
  */

  if (
    available.length <
    Math.min(
      QUESTIONS_PER_ROUND,
      allQuestions.length
    )
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


  updateContinueButton();

}


window.saveQuizProgress =
  saveQuizProgress;


/* =====================================================
   CONTINUE BUTTON
   ===================================================== */

function updateContinueButton() {

  const continueBtn =
    document.getElementById(
      "continueBtn"
    );


  if (!continueBtn) {
    return;
  }


  const saved =
    localStorage.getItem(
      "quizmasterProgress"
    );


  if (saved) {

    continueBtn.style.display =
      "block";

    continueBtn.disabled =
      false;

    continueBtn.textContent =
      "▶️ Continue Quiz";

  }

  else {

    continueBtn.style.display =
      "none";

  }

}


window.updateContinueButton =
  updateContinueButton;


/* =====================================================
   CONTINUE SAVED QUIZ
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
      Number(
        progress.currentRound
      ) || 1;


    currentQuestionIndex =
      Number(
        progress.currentQuestionIndex
      ) || 0;


    currentRoundQuestions =
      Array.isArray(
        progress.currentRoundQuestions
      )
        ? progress.currentRoundQuestions
        : [];


    score =
      Number(
        progress.score
      ) || 0;


    correctAnswers =
      Number(
        progress.correctAnswers
      ) || 0;


    timeLeft =
      Number(
        progress.timeLeft
      );


    if (
      !Number.isFinite(timeLeft) ||
      timeLeft <= 0
    ) {

      timeLeft =
        TIME_PER_QUESTION;

    }


    usedQuestionIndexes =
      Array.isArray(
        progress.usedQuestionIndexes
      )
        ? progress.usedQuestionIndexes
        : [];


    if (
      currentRoundQuestions.length === 0
    ) {

      startRound(
        currentRound
      );

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
      "Continue error:",
      error
    );


    localStorage.removeItem(
      "quizmasterProgress"
    );


    updateContinueButton();


    alert(
      "Saved quiz data is invalid. Starting a new quiz."
    );


    startNewQuiz();

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

  timeLeft =
    TIME_PER_QUESTION;

  answered = false;

  usedQuestionIndexes = [];


  localStorage.removeItem(
    "quizmasterProgress"
  );


  localStorage.setItem(
    "quizmasterUsedQuestions",
    JSON.stringify([])
  );


  updateContinueButton();


  startRound(1);

}


window.startNewQuiz =
  startNewQuiz;


/* =====================================================
   START QUIZ
   ===================================================== */

function startQuiz() {

  /*
   If a round was selected from the
   Choose Round screen, use it.
  */

  const selectedRound =
    Number(
      localStorage.getItem(
        "quizmasterSelectedRound"
      )
    );


  if (
    Number.isInteger(selectedRound) &&
    selectedRound >= 1
  ) {

    localStorage.removeItem(
      "quizmasterSelectedRound"
    );


    startRound(
      selectedRound
    );


    return;

  }


  /*
   Normal Start Quiz always starts
   a completely new quiz.
  */

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


  if (
    !Array.isArray(allQuestions) ||
    allQuestions.length === 0
  ) {

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

  timeLeft =
    TIME_PER_QUESTION;

  answered = false;


  currentRoundQuestions =
    getQuestionsForRound();


  if (
    currentRoundQuestions.length === 0
  ) {

    alert(
      "No questions are available for this round."
    );

    return;

  }


  saveQuizProgress();

  showQuizScreen();

  displayQuestion(false);

}


window.startRound =
  startRound;


/* =====================================================
   RETRY ROUND
   ===================================================== */

function retryCurrentRound() {

  startRound(
    currentRound
  );

}


window.retryCurrentRound =
  retryCurrentRound;


/* =====================================================
   DISPLAY QUESTION
   ===================================================== */

function displayQuestion(
  isContinuing
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


  const questionElement =
    document.getElementById(
      "question"
    );


  const options =
    document.getElementById(
      "options"
    );


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


  const message =
    document.getElementById(
      "message"
    );


  if (
    !questionElement ||
    !options
  ) {

    console.error(
      "Required quiz elements are missing from index.html."
    );

    return;

  }


  questionElement.textContent =
    question.question;


  if (questionNumber) {

    questionNumber.textContent =
      "Question " +
      (currentQuestionIndex + 1) +
      " / " +
      currentRoundQuestions.length;

  }


  if (roundDisplay) {

    roundDisplay.textContent =
      "Round " +
      currentRound;

  }


  if (scoreElement) {

    scoreElement.textContent =
      "Score: " +
      score;

  }


  if (categoryElement) {

    categoryElement.textContent =
      question.category ||
      "General Knowledge";

  }


  if (progressBar) {

    const progress =
      (
        (currentQuestionIndex + 1) /
        currentRoundQuestions.length
      ) * 100;


    progressBar.style.width =
      progress + "%";

  }


  if (message) {

    message.textContent = "";

    message.classList.add(
      "hidden"
    );

  }


  /*
   Remove old option buttons.
  */

  options.innerHTML = "";


  /*
   Shuffle answers.
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
   Create answer buttons.
  */

  shuffledOptions.forEach(
    function(option) {

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


      options.appendChild(
        button
      );

    }
  );


  /*
   Timer.
  */

  if (
    !isContinuing
  ) {

    timeLeft =
      TIME_PER_QUESTION;

  }


  if (
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


        if (timeLeft < 0) {
          timeLeft = 0;
        }


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


  if (!question) {

    nextQuestion();

    return;

  }


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function(button) {

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


  saveQuizProgress();


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


  const selectedText =
    String(selected).trim();


  const correctText =
    String(correct).trim();


  const buttons =
    document.querySelectorAll(
      "#options .option"
    );


  buttons.forEach(
    function(button) {

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
   FINISH ROUND
   ===================================================== */

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
    percentage >=
    PASS_PERCENTAGE;


  const nextRoundNumber =
    currentRound + 1;


  /*
   Unlock next round.
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
      nextRoundNumber >
      unlockedRounds
    ) {

      unlockedRounds =
        nextRoundNumber;

    }

  }


  localStorage.setItem(
    "quizmasterUnlockedRounds",
    String(unlockedRounds)
  );


  localStorage.setItem(
    "quizmasterCompletedRounds",
    JSON.stringify(
      completedRounds
    )
  );


  /*
   Delete saved progress
   because the round is finished.
  */

  localStorage.removeItem(
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


  showResultScreen();


  renderRounds();

}


/* =====================================================
   UPDATE RESULT
   ===================================================== */

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
        currentRound <
        unlockedRounds
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


  /*
   Restart button in current index.html.
  */

  const restartBtn =
    document.getElementById(
      "restartBtn"
    );


  if (restartBtn) {

    restartBtn.style.display =
      "block";

    restartBtn.disabled =
      false;


    if (passed) {

      restartBtn.textContent =
        "▶️ Continue / Play Again";

    }

    else {

      restartBtn.textContent =
        "🔄 Try Round Again";

    }

  }

}


/* =====================================================
   RENDER ROUNDS
   MATCHES #roundGrid AND .round-btn
   ===================================================== */

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
      10,
      totalPossibleRounds
    );


  const existingButtons =
    Array.from(
      roundGrid.querySelectorAll(
        ".round-btn"
      )
    );


  /*
   Update the 10 buttons already
   present in index.html.
  */

  existingButtons.forEach(
    function(button, index) {

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


      button.setAttribute(
        "data-round",
        String(round)
      );


      button.classList.remove(
        "unlocked",
        "locked",
        "completed"
      );


      const unlocked =
        round <=
        unlockedRounds;


      const completed =
        completedRounds.includes(
          round
        );


      button.disabled =
        !unlocked;


      if (completed) {

        button.classList.add(
          "completed"
        );

        button.textContent =
          "✅ Round " +
          round;

      }

      else if (unlocked) {

        button.classList.add(
          "unlocked"
        );

        button.textContent =
          "▶️ Round " +
          round;

      }

      else {

        button.classList.add(
          "locked"
        );

        button.textContent =
          "🔒 Round " +
          round;

      }

    }
  );

}


window.renderRounds =
  renderRounds;


/* =====================================================
   RESET ALL DATA
   ===================================================== */

function resetQuizData() {

  clearInterval(timer);


  localStorage.removeItem(
    "quizmasterProgress"
  );

  localStorage.removeItem(
    "quizmasterUsedQuestions"
  );

  localStorage.removeItem(
    "quizmasterCompletedRounds"
  );

  localStorage.removeItem(
    "quizmasterUnlockedRounds"
  );

  localStorage.removeItem(
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


/* =====================================================
   RESULT BUTTONS
   MATCHES CURRENT index.html
   ===================================================== */

function connectResultButtons() {

  const restartBtn =
    document.getElementById(
      "restartBtn"
    );


  const resultHomeBtn =
    document.getElementById(
      "resultHomeBtn"
    );


  const errorRestartBtn =
    document.getElementById(
      "errorRestartBtn"
    );


  if (restartBtn) {

    restartBtn.addEventListener(
      "click",
      function(event) {

        event.preventDefault();


        /*
         If current round was passed,
         play the next unlocked round.
         Otherwise retry same round.
        */

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

      }
    );

  }


  if (resultHomeBtn) {

    resultHomeBtn.addEventListener(
      "click",
      function(event) {

        event.preventDefault();

        showStartScreen();

      }
    );

  }


  if (errorRestartBtn) {

    errorRestartBtn.addEventListener(
      "click",
      function(event) {

        event.preventDefault();

        location.reload();

      }
    );

  }

}


/* =====================================================
   INITIALIZE
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    connectResultButtons();

    loadQuestions();

  }
);
