// =====================================================
// QUIZ MASTER - questions.js
// Ihuye na index.html watanze
// =====================================================

// ⬅️ AHA ushobora guhindura umubare w'ibibazo
const QUESTIONS_PER_QUIZ = 10;

// ⬅️ AHA ushobora guhindura igihe kuri buri kibazo
const TIME_PER_QUESTION = 20;


// =====================================================
// VARIABLES
// =====================================================

let allQuestions = [];
let quizQuestions = [];

let currentQuestion = 0;
let score = 0;

let timer = null;
let timeLeft = TIME_PER_QUESTION;

let answered = false;


// =====================================================
// HTML ELEMENTS
// =====================================================

const startScreen = document.getElementById("startScreen");
const quizScreen = document.getElementById("quizScreen");
const resultScreen = document.getElementById("resultScreen");
const errorScreen = document.getElementById("errorScreen");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const questionNumber = document.getElementById("questionNumber");
const timerElement = document.getElementById("timer");

const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");

const scoreElement = document.getElementById("score");
const resultMessage = document.getElementById("resultMessage");

const errorMessage = document.getElementById("errorMessage");


// =====================================================
// SCREEN CONTROL
// =====================================================

function showScreen(screen) {

  startScreen.classList.remove("active");
  quizScreen.classList.remove("active");
  resultScreen.classList.remove("active");
  errorScreen.classList.remove("active");

  screen.classList.add("active");
}


// =====================================================
// LOAD QUESTIONS FROM questions.json
// =====================================================

async function loadQuestions() {

  try {

    const response = await fetch("./questions.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `questions.json ntiyabonetse. HTTP status: ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "questions.json igomba kuba Array/List y'ibibazo."
      );
    }

    if (data.length < QUESTIONS_PER_QUIZ) {
      throw new Error(
        `questions.json ifite ibibazo ${data.length} gusa. `
        + `Hakenewe nibura ${QUESTIONS_PER_QUIZ}.`
      );
    }

    if (
  typeof item.answer !== "string" &&
  typeof item.answer !== "number"
) {
  throw new Error(
    `Ikibazo cya ${index + 1} gifite "answer" itari yo.`
  );
}

if (typeof item.answer === "string") {

  const answerIndex =
    item.options.indexOf(item.answer);

  if (answerIndex === -1) {
    throw new Error(
      `Ikibazo cya ${index + 1} gifite "answer" itari muri options.`
    );
  }

  item.answer = answerIndex;
}

if (
  typeof item.answer === "number" &&
  (
    item.answer < 0 ||
    item.answer >= item.options.length
  )
) {
  throw new Error(
    `Ikibazo cya ${index + 1} gifite "answer" itari yo.`
  );
}

    allQuestions = data;

  } catch (error) {

    console.error("Quiz error:", error);

    showError(
      error.message ||
      "Habaye ikibazo mu gufungura ibibazo."
    );

  }

}


// =====================================================
// SHUFFLE ARRAY
// =====================================================

function shuffle(array) {

  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {

    const randomIndex =
      Math.floor(Math.random() * (i + 1));

    [newArray[i], newArray[randomIndex]] =
      [newArray[randomIndex], newArray[i]];

  }

  return newArray;
}


// =====================================================
// START QUIZ
// =====================================================

function startQuiz() {

  if (allQuestions.length < QUESTIONS_PER_QUIZ) {

    showError(
      `Ntabwo bishoboka gutangira. `
      + `Hakenewe nibura ${QUESTIONS_PER_QUIZ} questions.`
    );

    return;
  }

  // Hitamo ibibazo 10 bitandukanye
  quizQuestions = shuffle(allQuestions)
    .slice(0, QUESTIONS_PER_QUIZ);

  currentQuestion = 0;
  score = 0;

  showScreen(quizScreen);

  showQuestion();

}


// =====================================================
// SHOW QUESTION
// =====================================================

function showQuestion() {

  clearInterval(timer);

  answered = false;

  nextBtn.style.display = "none";

  optionsElement.innerHTML = "";

  const questionData =
    quizQuestions[currentQuestion];

  // Numero y'ikibazo
  questionNumber.textContent =
    currentQuestion + 1;

  // Ikibazo
  questionElement.textContent =
    questionData.question;


  // Shuffling options
  const optionsWithIndexes =
    questionData.options.map((option, index) => ({
      option,
      originalIndex: index
    }));

  const shuffledOptions =
    shuffle(optionsWithIndexes);


  // Kora buttons za answers
  shuffledOptions.forEach(item => {

    const button =
      document.createElement("button");

    button.className = "option";

    button.textContent = item.option;

    button.dataset.index =
      item.originalIndex;

    button.addEventListener(
      "click",
      () => selectAnswer(button, item.originalIndex)
    );

    optionsElement.appendChild(button);

  });


  // Tangiza timer
  startTimer();

}


// =====================================================
// TIMER
// =====================================================

function startTimer() {

  timeLeft = TIME_PER_QUESTION;

  timerElement.textContent = timeLeft;

  timer = setInterval(() => {

    timeLeft--;

    timerElement.textContent = timeLeft;

    if (timeLeft <= 0) {

      clearInterval(timer);

      timeIsUp();

    }

  }, 1000);

}


// =====================================================
// TIME IS UP
// =====================================================

function timeIsUp() {

  if (answered) {
    return;
  }

  answered = true;

  disableOptions();

  const correctAnswer =
    quizQuestions[currentQuestion].answer;

  const optionButtons =
    document.querySelectorAll(".option");

  optionButtons.forEach(button => {

    const index =
      Number(button.dataset.index);

    if (index === correctAnswer) {
      button.classList.add("correct");
    }

  });

  nextBtn.style.display = "block";

}


// =====================================================
// SELECT ANSWER
// =====================================================

function selectAnswer(button, selectedIndex) {

  if (answered) {
    return;
  }

  answered = true;

  clearInterval(timer);

  const correctAnswer =
    quizQuestions[currentQuestion].answer;


  // Disable all options
  disableOptions();


  // Check answer
  if (selectedIndex === correctAnswer) {

    score++;

    button.classList.add("correct");

  } else {

    button.classList.add("wrong");

    // Erekana answer nyayo
    const optionButtons =
      document.querySelectorAll(".option");

    optionButtons.forEach(optionButton => {

      const index =
        Number(optionButton.dataset.index);

      if (index === correctAnswer) {
        optionButton.classList.add("correct");
      }

    });

  }


  nextBtn.style.display = "block";

}


// =====================================================
// DISABLE OPTIONS
// =====================================================

function disableOptions() {

  const optionButtons =
    document.querySelectorAll(".option");

  optionButtons.forEach(button => {
    button.disabled = true;
  });

}


// =====================================================
// NEXT QUESTION
// =====================================================

function nextQuestion() {

  currentQuestion++;

  if (currentQuestion >= quizQuestions.length) {

    finishQuiz();

    return;
  }

  showQuestion();

}


// =====================================================
// FINISH QUIZ
// =====================================================

function finishQuiz() {

  clearInterval(timer);

  showScreen(resultScreen);

  scoreElement.textContent = score;

  let message = "";

  if (score === 10) {

    message =
      "🎉 Birakomeye cyane! Watsinze neza cyane!";

  } else if (score >= 8) {

    message =
      "👏 Byiza cyane! Ubumenyi bwawe ni bwiza.";

  } else if (score >= 5) {

    message =
      "👍 Wakoze neza! Komeza witoze.";

  } else if (score >= 3) {

    message =
      "💪 Gerageza nanone, ushobora gutsinda byinshi.";

  } else {

    message =
      "📚 Ongera wige maze wongere ugerageze.";

  }

  resultMessage.textContent = message;

}


// =====================================================
// RESTART QUIZ
// =====================================================

function restartQuiz() {

  clearInterval(timer);

  startQuiz();

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

  clearInterval(timer);

  errorMessage.textContent = message;

  showScreen(errorScreen);

}


// =====================================================
// BUTTON EVENTS
// =====================================================

startBtn.addEventListener(
  "click",
  startQuiz
);

nextBtn.addEventListener(
  "click",
  nextQuestion
);

restartBtn.addEventListener(
  "click",
  restartQuiz
);


// =====================================================
// LOAD QUESTIONS WHEN PAGE OPENS
// =====================================================

loadQuestions();
