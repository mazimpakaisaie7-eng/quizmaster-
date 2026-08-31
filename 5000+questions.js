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
    this.loaded = false;
  }

  async loadQuestions() {
    if (this.loaded) {
      return this.allQuestions;
    }

    const response = await fetch("./questions.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("questions.json ntiyabonetse");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length < 10) {
      throw new Error("questions.json igomba kugira nibura 10 questions");
    }

    this.allQuestions = data;
    this.loaded = true;

    return this.allQuestions;
  }

  shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] =
        [result[j], result[i]];
    }

    return result;
  }

  createRound() {
    this.roundQuestions =
      this.shuffle(this.allQuestions).slice(
        0,
        this.totalQuestions
      );

    this.currentIndex = 0;
    this.score = 0;

    this.showQuestion();
  }

  showQuestion() {
    this.stopTimer();

    const question =
      this.roundQuestions[this.currentIndex];

    if (!question) {
      this.finishQuiz();
      return;
    }

    const questionElement =
      document.getElementById("question");

    const optionsElement =
      document.getElementById("options");

    if (!questionElement || !optionsElement) {
      console.error(
        "index.html ibura #question cyangwa #options"
      );
      return;
    }

    questionElement.textContent =
      question.question;

    optionsElement.innerHTML = "";

    question.options.forEach(option => {
      const button =
        document.createElement("button");

      button.textContent = option;

      button.onclick = () => {
        this.answerQuestion(option);
      };

      optionsElement.appendChild(button);
    });

    this.startTimer();
  }

  startTimer() {
    this.timeLeft =
      this.timePerQuestion;

    this.updateTimer();

    this.timer = setInterval(() => {
      this.timeLeft--;

      this.updateTimer();

      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.nextQuestion();
      }
    }, 1000);
  }

  updateTimer() {
    const timerElement =
      document.getElementById("timer");

    if (timerElement) {
      timerElement.textContent =
        `Igihe: ${this.timeLeft}s`;
    }
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  answerQuestion(answer) {
    this.stopTimer();

    const question =
      this.roundQuestions[this.currentIndex];

    if (answer === question.answer) {
      this.score++;
    }

    this.nextQuestion();
  }

  nextQuestion() {
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

  finishQuiz() {
    this.stopTimer();

    const questionElement =
      document.getElementById("question");

    const optionsElement =
      document.getElementById("options");

    const timerElement =
      document.getElementById("timer");

    if (questionElement) {
      questionElement.textContent =
        `Quiz irarangiye! Amanota: ${this.score}/${this.totalQuestions}`;
    }

    if (optionsElement) {
      optionsElement.innerHTML = "";
    }

    if (timerElement) {
      timerElement.textContent = "";
    }
  }

  async startQuiz() {
    try {
      await this.loadQuestions();
      this.createRound();
    } catch (error) {
      console.error(error);

      alert(
        "Ibibazo ntibishoboye gufunguka. Reba questions.json."
      );
    }
  }
}

const questionManager =
  new QuestionManager();

window.questionManager =
  questionManager;

window.startQuiz = function () {
  questionManager.startQuiz();
};
