// question.js

class QuizQuestionSystem {
  constructor() {
    this.questions = [];
    this.currentQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.timeLimit = 20;
    this.timer = null;
    this.timeLeft = this.timeLimit;
  }

  // Load questions from questions.json
  async loadQuestions() {
    try {
      const response = await fetch("./questions.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("questions.json ntiyabonetse");
      }

      const data = await response.json();

      // Support both:
      // [ ...questions ]
      // and { questions: [ ... ] }
      this.questions = Array.isArray(data)
        ? data
        : Array.isArray(data.questions)
          ? data.questions
          : [];

      if (this.questions.length === 0) {
        throw new Error("Nta bibazo bibonetse muri questions.json");
      }

      return this.questions;
    } catch (error) {
      console.error("Question loading error:", error);
      throw error;
    }
  }

  // Pick 10 different random questions
  createRound(numberOfQuestions = 10) {
    if (this.questions.length < numberOfQuestions) {
      throw new Error(
        `Hakenewe nibura ${numberOfQuestions} questions. Ufite ${this.questions.length}.`
      );
    }

    const shuffled = [...this.questions];

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[i]
      ];
    }

    this.currentQuestions = shuffled.slice(0, numberOfQuestions);
    this.currentIndex = 0;
    this.score = 0;

    return this.currentQuestions;
  }

  // Get current question
  getCurrentQuestion() {
    if (
      this.currentIndex < 0 ||
      this.currentIndex >= this.currentQuestions.length
    ) {
      return null;
    }

    return this.currentQuestions[this.currentIndex];
  }

  // Get question number
  getQuestionNumber() {
    return this.currentIndex + 1;
  }

  // Get total questions
  getTotalQuestions() {
    return this.currentQuestions.length;
  }

  // Check answer
  checkAnswer(answer) {
    const question = this.getCurrentQuestion();

    if (!question) {
      return {
        correct: false,
        message: "Nta kibazo kiriho."
      };
    }

    const correctAnswer = question.answer ?? question.correctAnswer;

    const userAnswer = String(answer ?? "")
      .trim()
      .toLowerCase();

    const rightAnswer = String(correctAnswer ?? "")
      .trim()
      .toLowerCase();

    const correct = userAnswer === rightAnswer;

    if (correct) {
      this.score++;
    }

    return {
      correct,
      correctAnswer,
      score: this.score
    };
  }

  // Move to next question
  nextQuestion() {
    this.stopTimer();

    this.currentIndex++;

    if (this.currentIndex >= this.currentQuestions.length) {
      return null;
    }

    return this.getCurrentQuestion();
  }

  // Check if quiz is finished
  isFinished() {
    return this.currentIndex >= this.currentQuestions.length;
  }

  // Start 20-second timer
  startTimer(onTick, onTimeUp) {
    this.stopTimer();

    this.timeLeft = this.timeLimit;

    if (typeof onTick === "function") {
      onTick(this.timeLeft);
    }

    this.timer = setInterval(() => {
      this.timeLeft--;

      if (typeof onTick === "function") {
        onTick(this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.stopTimer();

        if (typeof onTimeUp === "function") {
          onTimeUp();
        }
      }
    }, 1000);
  }

  // Stop timer
