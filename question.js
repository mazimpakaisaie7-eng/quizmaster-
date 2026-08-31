let allQuestions = [];
let quizQuestions = [];
let currentQuestion = 0;
let score = 0;
let timer = null;
let timeLeft = 20;

async function loadQuestions() {
  const response = await fetch("./questions.json");

  if (!response.ok) {
    throw new Error("questions.json ntiyabonetse");
  }

  allQuestions = await response.json();

  if (!Array.isArray(allQuestions) || allQuestions.length < 10) {
    throw new Error("Shyiramo nibura ibibazo 10");
  }

  return allQuestions;
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function startQuiz() {
  quizQuestions = shuffle(allQuestions).slice(0, 10);
  currentQuestion = 0;
  score = 0;

  showQuestion();
}

function showQuestion() {
  clearInterval(timer);

  const q = quizQuestions[currentQuestion];

  document.getElementById("question").textContent = q.question;

  const options = document.getElementById("options");
  options.innerHTML = "";

  q.options.forEach(option => {
    const button = document.createElement("button");

    button.textContent = option;
    button.onclick = () => answerQuestion(option);

    options.appendChild(button);
  });

  startTimer();
}

function startTimer() {
  timeLeft = 20;

  document.getElementById("timer").textContent =
    `Igihe: ${timeLeft}s`;

  timer = setInterval(() => {
    timeLeft--;

    document.getElementById("timer").textContent =
      `Igihe: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function answerQuestion(answer) {
  clearInterval(timer);

  const correctAnswer =
    quizQuestions[currentQuestion].answer;

  if (answer === correctAnswer) {
    score++;
  }

  nextQuestion();
}

function nextQuestion() {
  currentQuestion++;

  if (currentQuestion >= quizQuestions.length) {
    finishQuiz();
    return;
  }

  showQuestion();
}

function finishQuiz() {
  clearInterval(timer);

  document.getElementById("question").textContent =
    `Quiz irarangiye! Amanota: ${score}/10`;

  document.getElementById("options").innerHTML = "";

  document.getElementById("timer").textContent = "";
}
