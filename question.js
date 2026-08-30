// question.js
// Quiz Master - 5,000+ Questions System

class QuestionManager {
  constructor() {
    this.allQuestions = [];
    this.roundQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.totalQuestions = 10;
  }

  // Load 5,000+ questions
  async loadQuestions() {
    try {
      const response = await fetch("./questions.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("questions.json ntiyabonetse.");
      }

      const data = await response.json();

      // Yemera:
      // [ {...}, {...} ]
      // cyangwa
      // { "questions": [ {...}, {...} ] }

      if (Array.isArray(data)) {
        this.allQuestions = data;
      } else if (Array.isArray(data.questions)) {
        this.allQuestions = data.questions;
      } else {
        throw new Error("Format ya questions.json ntabwo ari yo.");
      }

      if (this.allQuestions.length < 10) {
        throw new Error(
          `Hakenewe nibura questions 10. Hariho ${this.allQuestions.length}.`
        );
      }

      console.log(
        `Loaded ${this.allQuestions.length} questions.`
      );

      return this.allQuestions;

    } catch (error) {
      console.error("Question loading error:", error);
      throw error;
    }
  }

  // Shuffle questions
  shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  // Create new round
  createRound(number = 10) {
    if (this.allQuestions.length < number) {
      throw new Error(
        `Nta questions zihagije. Ziriho: ${this.allQuestions.length}`
      );
    }

    this.roundQuestions = this.shuffle(
      this.allQuestions
    ).slice(0, number);

    this.currentIndex = 0;
    this.score = 0;
    this.totalQuestions = number;

    return this.roundQuestions;
  }

  // Current question
  getCurrentQuestion() {
    return this.roundQuestions[this.currentIndex] || null;
  }

  // Current question number
  getCurrentNumber() {
    return this.currentIndex + 1;
  }

  // Total
  getTotal() {
    return this.roundQuestions.length;
  }

  // Check answer
  checkAnswer(userAnswer) {
    const question = this.getCurrentQuestion();

    if (!question) {
      return {
        correct: false,
        message: "Question ntabwo ibonetse."
      };
    }

    const correctAnswer =
      question.answer ??
      question.correctAnswer ??
      question.correct_option;

    const user =
      String(userAnswer ?? "")
        .trim()
        .toLowerCase();

    const correct =
      String(correctAnswer ?? "")
        .trim()
        .toLowerCase();

    const isCorrect = user === correct;

    if (isCorrect) {
      this.score++;
    }

    return {
      correct: isCorrect,
      answer: correctAnswer,
      score: this.score
    };
  }

  // Next question
  next() {
    if (
      this.currentIndex <
      this.roundQuestions.length - 1
    ) {
      this.currentIndex++;
      return this.getCurrentQuestion();
    }

    return null;
  }

  // Is quiz finished?
  isFinished() {
    return (
      this.currentIndex >=
      this.roundQuestions.length - 1
    );
  }

  // Get score
  getScore() {
    return this.score;
  }

  // Get percentage
  getPercentage() {
    if (!this.totalQuestions) return 0;

    return Math.round(
      (this.score / this.totalQuestions) * 100
    );
  }

  // Reset
  reset() {
    this.roundQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
  }
}


// Global Quiz Master question manager
const questionManager = new QuestionManager();


// Make available to index.html
window.questionManager = questionManager;


// Automatically load questions
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await questionManager.loadQuestions();

    console.log(
      "Quiz Master question system ready."
    );

  } catch (error) {
    console.error(
      "Failed to load questions:",
      error
    );
  }
});
