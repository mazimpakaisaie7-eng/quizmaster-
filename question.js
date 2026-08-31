// question.js
// Quiz Master - Questions System
// 5,000+ questions support
// 10 random questions per round
// 20 seconds per question
// Score system

class QuestionManager {
  constructor() {
    this.allQuestions = [];
    this.roundQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.totalQuestions = 10;
    this.timePerQuestion = 20;
    this.timer = null;
    this.timeLeft = 20;
    this.quizStarted = false;
  }

  // Load questions ONCE from questions.json
  async loadQuestions() {
    try {
      const response = await fetch("./questions.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `questions.json ntiyabonetse. HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json igomba kuba Array.");
      }

      if (data.length < this.totalQuestions) {
        throw new Error(
          `Harakenewe nibura ibibazo ${this.totalQuestions}.`
        );
      }

      this.allQuestions = data;

      return this.allQuestions;
    } catch (error) {
      console.error("Question loading error:", error);
      throw error;
    }
  }

  // Shuffle questions randomly
  shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [result[i], result[randomIndex]] = [
        result[randomIndex],
        result[i]
      ];
    }

    return result;
  }

  // Select 10 different questions for a new round
  createRound() {
    if (this.allQuestions.length < this.totalQuestions) {
      throw new Error(
        `Nta bibazo bihagije. Shyiramo nibura ${this.totalQuestions}.`
      );
    }

    this.roundQuestions = this.shuffle(
      this.allQuestions
    ).slice(0, this.totalQuestions);

    this.currentIndex = 0;
    this.score = 0;
    this.quizStarted = true;

    this.stopTimer();
  }

  // Get current question
  getCurrentQuestion() {
    return this.roundQuestions[this.currentIndex] || null;
  }

  // Display current question
  showQuestion() {
    const question = this.getCurrentQuestion();

    if (!question) {
      this.finishQuiz();
      return;
    }

    const questionElement =
      document.getElementById("question");

    const optionsElement =
      document.getElementById("options");

    const timerElement =
      document.getElementById("timer");

    if (!questionElement || !optionsElement) {
      console.error(
        "index.html ibura #question cyangwa #options."
      );
      return;
    }

    questionElement.textContent =
      question.question || "Ikibazo ntikiboneka.";

    optionsElement.innerHTML = "";

    if (!Array.isArray(question.options)) {
      console.error(
        "Iki kibazo nta options Array gifite:",
        question
      );
      return;
    }

    question.options.forEach((option) => {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = option;

      button.addEventListener("click", () => {
        this.answerQuestion(option);
      });

      optionsElement.appendChild(button);
    });

    if (timerElement) {
      timerElement.textContent =
        `Igihe: ${this.timePerQuestion}s`;
    }

    this.startTimer();
  }

  // Start 20-second timer
  startTimer() {
    this.stopTimer();

    this.timeLeft = this.timePerQuestion;

    this.updateTimerDisplay();

    this.timer = setInterval(() => {
      this.timeLeft--;

      this.updateTimerDisplay();

      if (this.timeLeft <= 0) {
        this.stopTimer();

        // Time finished = automatically move to next question
        this.nextQuestion();
      }
    }, 1000);
  }

  // Update timer on screen
  updateTimerDisplay() {
    const timerElement =
      document.getElementById("timer");

    if (timerElement) {
      timerElement.textContent =
        `Igihe: ${this.timeLeft}s`;
    }
  }

  // Stop timer
  stopTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Check answer
  answerQuestion(selectedAnswer) {
    if (!this.quizStarted) {
      return;
    }

    const question = this.getCurrentQuestion();

    if (!question) {
      return;
    }

    this.stopTimer();

    if (selectedAnswer === question.answer) {
      this.score++;
    }

    this.nextQuestion();
  }

  // Move to next question
  nextQuestion() {
    if (!this.quizStarted) {
      return;
    }

    this.currentIndex++;

    if (
      this.currentIndex >=
      this.roundQuestions.length
    ) {
      this.finishQuiz();
      return;
    }

    this.showQuestion();
  }

  // Finish quiz
  finishQuiz() {
    this.stopTimer();
    this.quizStarted = false;

    const questionElement =
      document.getElementById("question");

    const optionsElement =
      document.getElementById("options");

    const timerElement =
      document.getElementById("timer");

    if (questionElement) {
      questionElement.textContent =
        `Quiz irarangiye! Amanota yawe: ${this.score}/${this.totalQuestions}`;
    }

    if (optionsElement) {
      optionsElement.innerHTML = "";
    }

    if (timerElement) {
      timerElement.textContent = "";
    }

    console.log(
      `Quiz finished: ${this.score}/${this.totalQuestions}`
    );
  }

  // Start a new round
  async startQuiz() {
    try {
      if (this.allQuestions.length === 0) {
        await this.loadQuestions();
      }

      this.createRound();
      this.showQuestion();
    } catch (error) {
      console.error(error);

      alert(
        "Ibibazo ntibashoboye gufunguka. Reba niba questions.json iri kuri root."
      );
    }
  }

  // Start another round with 10 new random questions
  async restartQuiz() {
    await this.startQuiz();
  }
}

// Create one QuestionManager
const questionManager = new QuestionManager();

// Make it accessible from index.html
window.questionManager = questionManager;

// Function used by button onclick="startQuiz()"
async function startQuiz() {
  await questionManager.startQuiz();
}

// Function for starting another round
async function restartQuiz() {
  await questionManager.restartQuiz();
}
