/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE - FULL COMPATIBLE VERSION
   ---------------------------------------------------------
   Compatible with existing index.html + questions.json
   ---------------------------------------------------------
   ✓ English + Kinyarwanda questions
   ✓ Reads questions exactly as stored in questions.json
   ✓ No index.html changes
   ✓ No CSS/design changes
   ✓ Dynamic rounds
   ✓ 10 questions per round
   ✓ Start / Continue / Rounds
   ✓ Next Question
   ✓ Result
   ✓ Review
   ✓ Retry
   ✓ Next Round
   ✓ Error Retry / Home
   ✓ Settings
   ✓ Music / Sound
   ✓ Saved progress
   ✓ Round unlocking
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const QUESTIONS_FILE = "./questions.json";

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const UNLOCK_PERCENT = 60;

  const MUSIC_FILE = "./music.mp3";

  const STORAGE = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    completedRounds: "quizmasterCompletedRounds",
    roundStars: "quizmasterRoundStars",
    achievements: "quizmasterAchievements",
    personalBest: "quizmasterPersonalBest",
    totalScore: "quizmasterTotalScore",
    dailyChallenge: "quizmasterDailyChallenge",
    usedQuestions: "quizmasterUsedQuestions"
  };

  /* =========================================================
     STATE
     ========================================================= */

  let allQuestions = [];
  let rounds = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let currentRoundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let selectedAnswer = null;
  let answered = false;

  let timerInterval = null;
  let timeLeft = TIME_PER_QUESTION;

  let quizFinished = false;

  let reviewQuestions = [];

  let musicEnabled = getStoredBoolean(
    STORAGE.music,
    true
  );

  let soundEnabled = getStoredBoolean(
    STORAGE.sound,
    true
  );

  let backgroundMusic = null;

  /* =========================================================
     DOM HELPERS
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  const elements = {
    homeScreen: $("homeScreen"),
    roundsScreen: $("roundsScreen"),
    quizScreen: $("quizScreen"),
    resultScreen: $("resultScreen"),
    reviewScreen: $("reviewScreen"),
    errorScreen: $("errorScreen"),
    settingsScreen: $("settingsScreen"),

    startBtn: $("startBtn"),
    continueBtn: $("continueBtn"),
    roundsBtn: $("roundsBtn"),
    settingsBtn: $("settingsBtn"),
    shareBtn: $("shareBtn"),

    roundsBackBtn: $("roundsBackBtn"),
    roundGrid: $("roundGrid"),

    questionNumber: $("questionNumber"),
    roundDisplay: $("roundDisplay"),
    score: $("score"),
    timer: $("timer"),
    progressBar: $("progressBar"),
    category: $("category"),
    question: $("question"),
    options: $("options"),
    message: $("message"),
    nextBtn: $("nextBtn"),
    quizHomeBtn: $("quizHomeBtn"),

    nextRoundBtn: $("nextRoundBtn"),
    restartBtn: $("restartBtn"),
    reviewBtn: $("reviewBtn"),
    resultHomeBtn: $("resultHomeBtn"),

    correctCount: $("correctCount"),
    wrongCount: $("wrongCount"),
    finalScore: $("finalScore"),
    resultPercent: $("resultPercent"),
    resultMessage: $("resultMessage"),
    finishedRound: $("finishedRound"),

    reviewList: $("reviewList"),
    reviewSummary: $("reviewSummary"),
    reviewRetryBtn: $("reviewRetryBtn"),
    reviewBackBtn: $("reviewBackBtn"),

    musicSwitch: $("musicSwitch"),
    soundSwitch: $("soundSwitch"),
    settingsBackBtn: $("settingsBackBtn"),

    errorMessage: $("errorMessage"),
    errorRestartBtn: $("errorRestartBtn"),
    errorHomeBtn: $("errorHomeBtn")
  };

  /* =========================================================
     SAFE TEXT
     ========================================================= */

  function safeText(element, value) {
    if (!element) return;

    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  /* =========================================================
     STORAGE
     ========================================================= */

  function getStoredBoolean(key, defaultValue) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return defaultValue;
      }

      return value === "true";
    } catch (error) {
      return defaultValue;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn(
        "Quiz Master storage save error:",
        error
      );
    }
  }

  function loadJSON(key, fallback) {
    try {
      const value =
        localStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      console.warn(
        "Quiz Master storage read error:",
        error
      );

      return fallback;
    }
  }

  /* =========================================================
     QUESTION LANGUAGE
     ========================================================= */

  /*
    IMPORTANT:

    The engine does NOT translate questions.

    It displays exactly what is stored in questions.json.

    Example:

    English:
    "What is the capital city of Rwanda?"

    Kinyarwanda:
    "Itara ritukura risobanura iki?"

    Both can exist in the same questions.json.

    If question_rw exists, it is used first.
    Otherwise question is used.
  */

  function getQuestionText(question) {
    if (!question) {
      return "";
    }

    if (
      typeof question.question_rw === "string" &&
      question.question_rw.trim() !== ""
    ) {
      return question.question_rw;
    }

    if (
      typeof question.question === "string"
    ) {
      return question.question;
    }

    return "";
  }

  function getOptions(question) {
    if (
      !question ||
      !Array.isArray(question.options)
    ) {
      return [];
    }

    return question.options;
  }

  function getAnswer(question) {
    if (!question) {
      return "";
    }

    return typeof question.answer === "string"
      ? question.answer
      : "";
  }

  /* =========================================================
     VALIDATE QUESTION
     ========================================================= */

  function validateQuestion(question, index) {
    if (
      !question ||
      typeof question !== "object"
    ) {
      throw new Error(
        `Question ${index + 1} is not a valid object.`
      );
    }

    const questionText =
      getQuestionText(question);

    if (!questionText) {
      throw new Error(
        `Question ${index + 1} has no question text.`
      );
    }

    if (!Array.isArray(question.options)) {
      throw new Error(
        `Question ${index + 1} has no valid options.`
      );
    }

    if (question.options.length < 2) {
      throw new Error(
        `Question ${index + 1} must have at least 2 options.`
      );
    }

    if (
      typeof question.answer !== "string" ||
      question.answer.trim() === ""
    ) {
      throw new Error(
        `Question ${index + 1} has no valid answer.`
      );
    }

    if (
      !question.options.includes(
        question.answer
      )
    ) {
      throw new Error(
        `Question ${index + 1}: answer does not match any option.`
      );
    }

    return true;
  }

  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {
    try {
      const response = await fetch(
        QUESTIONS_FILE +
          "?v=" +
          Date.now(),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load questions.json (${response.status})`
        );
      }

      const data =
        await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "questions.json must contain an array."
        );
      }

      if (data.length === 0) {
        throw new Error(
          "questions.json contains no questions."
        );
      }

      data.forEach(
        (question, index) =>
          validateQuestion(
            question,
            index
          )
      );

      allQuestions = data;

      buildRounds();

      initializeUnlockedRounds();

      renderRounds();

      updateContinueButton();

      console.log(
        `Quiz Master: ${allQuestions.length} questions loaded.`
      );

      console.log(
        `Quiz Master: ${rounds.length} rounds created.`
      );

    } catch (error) {
      console.error(
        "Quiz Master loading error:",
        error
      );

      showError(
        "Unable to load the quiz questions. Please check questions.json."
      );
    }
  }

  /* =========================================================
     BUILD ROUNDS
     ========================================================= */

  function buildRounds() {
    rounds = [];

    for (
      let i = 0;
      i < allQuestions.length;
      i += QUESTIONS_PER_ROUND
    ) {
      rounds.push(
        allQuestions.slice(
          i,
          i + QUESTIONS_PER_ROUND
        )
      );
    }
  }

  /* =========================================================
     UNLOCKED ROUNDS
     ========================================================= */

  function initializeUnlockedRounds() {
    let unlocked =
      Number(
        localStorage.getItem(
          STORAGE.unlockedRounds
        )
      );

    if (
      !Number.isFinite(unlocked) ||
      unlocked < 1
    ) {
      unlocked = 1;
    }

    unlocked = Math.min(
      unlocked,
      rounds.length
    );

    localStorage.setItem(
      STORAGE.unlockedRounds,
      String(unlocked)
    );
  }

  function getUnlockedRounds() {
    let unlocked =
      Number(
        localStorage.getItem(
          STORAGE.unlockedRounds
        )
      );

    if (
      !Number.isFinite(unlocked) ||
      unlocked < 1
    ) {
      unlocked = 1;
    }

    return Math.min(
      unlocked,
      Math.max(rounds.length, 1)
    );
  }

  function updateUnlockedRounds() {
    const percent =
      currentRoundQuestions.length > 0
        ? (
            correctAnswers /
            currentRoundQuestions.length
          ) * 100
        : 0;

    let unlocked =
      getUnlockedRounds();

    if (
      percent >= UNLOCK_PERCENT &&
      currentRound >= unlocked
    ) {
      unlocked =
        Math.min(
          currentRound + 1,
          rounds.length
        );

      localStorage.setItem(
        STORAGE.unlockedRounds,
        String(unlocked)
      );
    }

    renderRounds();
  }

  /* =========================================================
     SCREEN CONTROL
     ========================================================= */

  function showScreen(screenId) {
    const screenIds = [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "errorScreen",
      "settingsScreen"
    ];

    screenIds.forEach((id) => {
      const screen = $(id);

      if (!screen) return;

      screen.classList.toggle(
        "active",
        id === screenId
      );
    });
  }

  /* =========================================================
     START QUIZ
     ========================================================= */

  function startQuiz(roundNumber = 1) {
    stopTimer();

    if (!rounds.length) {
      showError(
        "No quiz rounds are available."
      );
      return;
    }

    let selectedRound =
      Number(roundNumber);

    if (
      !Number.isFinite(selectedRound)
    ) {
      selectedRound = 1;
    }

    if (selectedRound < 1) {
      selectedRound = 1;
    }

    if (
      selectedRound > rounds.length
    ) {
      selectedRound =
        rounds.length;
    }

    const unlocked =
      getUnlockedRounds();

    if (selectedRound > unlocked) {
      showError(
        "This round is locked. Complete previous rounds to unlock it."
      );
      return;
    }

    currentRound = selectedRound;

    currentRoundQuestions =
      rounds[currentRound - 1];

    if (
      !Array.isArray(
        currentRoundQuestions
      ) ||
      currentRoundQuestions.length === 0
    ) {
      showError(
        "This round has no questions."
      );
      return;
    }

    currentQuestionIndex = 0;

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    selectedAnswer = null;
    answered = false;
    quizFinished = false;

    reviewQuestions = [];

    saveCurrentProgress();

    showScreen("quizScreen");

    renderQuestion();

    startMusic();
  }

  /* =========================================================
     CONTINUE QUIZ
     ========================================================= */

  function continueQuiz() {
    const saved =
      loadJSON(
        STORAGE.progress,
        null
      );

    if (!saved) {
      startQuiz(1);
      return;
    }

    const savedRound =
      Number(saved.round);

    const savedIndex =
      Number(saved.questionIndex);

    if (
      !Number.isFinite(savedRound) ||
      !Number.isFinite(savedIndex)
    ) {
      startQuiz(1);
      return;
    }

    if (
      savedRound < 1 ||
      savedRound > rounds.length
    ) {
      startQuiz(1);
      return;
    }

    currentRound = savedRound;

    currentRoundQuestions =
      rounds[currentRound - 1];

    if (
      !currentRoundQuestions ||
      currentRoundQuestions.length === 0
    ) {
      startQuiz(1);
      return;
    }

    currentQuestionIndex =
      Math.min(
        Math.max(savedIndex, 0),
        currentRoundQuestions.length - 1
      );

    score =
      Number(saved.score) || 0;

    correctAnswers =
      Number(saved.correctAnswers) || 0;

    wrongAnswers =
      Number(saved.wrongAnswers) || 0;

    answered = false;
    selectedAnswer = null;
    quizFinished = false;

    reviewQuestions = [];

    showScreen("quizScreen");

    renderQuestion();

    startMusic();
  }

  /* =========================================================
     SAVE PROGRESS
     ========================================================= */

  function saveCurrentProgress() {
    saveJSON(
      STORAGE.progress,
      {
        round: currentRound,
        questionIndex:
          currentQuestionIndex,
        score: score,
        correctAnswers:
          correctAnswers,
        wrongAnswers:
          wrongAnswers
      }
    );

    localStorage.setItem(
      STORAGE.currentRound,
      String(currentRound)
    );
  }

  function clearProgress() {
    localStorage.removeItem(
      STORAGE.progress
    );
  }

  /* =========================================================
     CONTINUE BUTTON
     ========================================================= */

  function updateContinueButton() {
    if (!elements.continueBtn) {
      return;
    }

    const saved =
      loadJSON(
        STORAGE.progress,
        null
      );

    if (
      saved &&
      typeof saved === "object"
    ) {
      elements.continueBtn.style.display =
        "";
    } else {
      elements.continueBtn.style.display =
        "none";
    }
  }

  /* =========================================================
     RENDER QUESTION
     ========================================================= */

  function renderQuestion() {
    stopTimer();

    if (
      !currentRoundQuestions ||
      currentQuestionIndex >=
        currentRoundQuestions.length
    ) {
      finishRound();
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    selectedAnswer = null;
    answered = false;

    safeText(
      elements.questionNumber,
      `Question ${currentQuestionIndex + 1} / ${currentRoundQuestions.length}`
    );

    safeText(
      elements.roundDisplay,
      `Round ${currentRound}`
    );

    safeText(
      elements.score,
      `Score: ${score}`
    );

    safeText(
      elements.timer,
      `⏱️ ${TIME_PER_QUESTION}`
    );

    safeText(
      elements.category,
      question.category ||
        "General"
    );

    /*
      This is what allows English + Kinyarwanda
      in the same questions.json.
    */

    safeText(
      elements.question,
      getQuestionText(question)
    );

    renderOptions(question);

    updateProgress();

    if (elements.message) {
      elements.message.textContent =
        "";

      elements.message.classList.add(
        "hidden"
      );

      elements.message.classList.remove(
        "correct",
        "wrong"
      );
    }

    if (elements.nextBtn) {
      elements.nextBtn.style.display =
        "none";
    }

    startTimer();
  }

  /* =========================================================
     RENDER OPTIONS
     ========================================================= */

  function renderOptions(question) {
    if (!elements.options) {
      return;
    }

    elements.options.innerHTML =
      "";

    const options =
      getOptions(question);

    options.forEach(
      (option) => {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        /*
          IMPORTANT:
          Your existing CSS expects .option-btn.
          We add only the existing class.
          No new CSS is created.
        */

        button.className =
          "option-btn";

        button.textContent =
          String(option);

        button.dataset.answer =
          String(option);

        button.addEventListener(
          "click",
          () =>
            selectAnswer(
              option,
              button
            )
        );

        elements.options.appendChild(
          button
        );
      }
    );
  }

  /* =========================================================
     SELECT ANSWER
     ========================================================= */

  function selectAnswer(
    answer,
    button
  ) {
    if (answered) {
      return;
    }

    answered = true;
    selectedAnswer = answer;

    stopTimer();

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    const correctAnswer =
      getAnswer(question);

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            "button"
          )
        : [];

    optionButtons.forEach(
      (btn) => {
        btn.disabled = true;

        if (
          btn.dataset.answer ===
          String(correctAnswer)
        ) {
          btn.classList.add(
            "correct"
          );
        }

        if (
          btn.dataset.answer ===
            String(answer) &&
          String(answer) !==
            String(correctAnswer)
        ) {
          btn.classList.add(
            "wrong"
          );
        }
      }
    );

    const isCorrect =
      String(answer) ===
      String(correctAnswer);

    if (isCorrect) {
      correctAnswers++;

      score +=
        POINTS_PER_CORRECT;

      setMessage(
        "Correct!",
        "correct"
      );

      playSound("correct");

    } else {
      wrongAnswers++;

      setMessage(
        `Incorrect. Correct answer: ${correctAnswer}`,
        "wrong"
      );

      playSound("wrong");
    }

    reviewQuestions.push({
      question: question,
      selectedAnswer:
        answer,
      correctAnswer:
        correctAnswer,
      isCorrect:
        isCorrect
    });

    safeText(
      elements.score,
      `Score: ${score}`
    );

    if (elements.nextBtn) {
      elements.nextBtn.style.display =
        "";
    }

    saveCurrentProgress();
  }

  /* =========================================================
     NEXT QUESTION
     ========================================================= */

  function nextQuestion() {
    if (!answered) {
      return;
    }

    currentQuestionIndex++;

    saveCurrentProgress();

    if (
      currentQuestionIndex >=
      currentRoundQuestions.length
    ) {
      finishRound();
      return;
    }

    renderQuestion();
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function startTimer() {
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimer();

    timerInterval =
      setInterval(
        () => {
          if (answered) {
            stopTimer();
            return;
          }

          timeLeft--;

          updateTimer();

          if (timeLeft <= 0) {
            stopTimer();

            if (!answered) {
              timeExpired();
            }
          }
        },
        1000
      );
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(
        timerInterval
      );

      timerInterval = null;
    }
  }

  function updateTimer() {
    safeText(
      elements.timer,
      `⏱️ ${timeLeft}`
    );
  }

  /* =========================================================
     TIME EXPIRED
     ========================================================= */

  function timeExpired() {
    if (answered) {
      return;
    }

    answered = true;

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    const correctAnswer =
      getAnswer(question);

    wrongAnswers++;

    reviewQuestions.push({
      question: question,
      selectedAnswer: null,
      correctAnswer:
        correctAnswer,
      isCorrect: false
    });

    setMessage(
      `Time is up. Correct answer: ${correctAnswer}`,
      "wrong"
    );

    playSound("wrong");

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            "button"
          )
        : [];

    optionButtons.forEach(
      (btn) => {
        btn.disabled = true;

        if (
          btn.dataset.answer ===
          String(correctAnswer)
        ) {
          btn.classList.add(
            "correct"
          );
        }
      }
    );

    if (elements.nextBtn) {
      elements.nextBtn.style.display =
        "";
    }

    saveCurrentProgress();
  }

  /* =========================================================
     PROGRESS BAR
     ========================================================= */

  function updateProgress() {
    if (!elements.progressBar) {
      return;
    }

    const total =
      currentRoundQuestions.length;

    const current =
      currentQuestionIndex + 1;

    const percent =
      total > 0
        ? (current / total) * 100
        : 0;

    /*
      Existing index.html uses a DIV.
      We update its width only.
    */

    elements.progressBar.style.width =
      percent + "%";
  }

  /* =========================================================
     MESSAGE
     ========================================================= */

  function setMessage(
    message,
    type = ""
  ) {
    if (!elements.message) {
      return;
    }

    elements.message.textContent =
      message;

    elements.message.classList.remove(
      "hidden",
      "correct",
      "wrong"
    );

    if (type) {
      elements.message.classList.add(
        type
      );
    }
  }

  /* =========================================================
     FINISH ROUND
     ========================================================= */

  function finishRound() {
    stopTimer();

    quizFinished = true;

    const total =
      currentRoundQuestions.length;

    const percent =
      total > 0
        ? (correctAnswers / total) *
          100
        : 0;

    const stars =
      percent >= 80
        ? 3
        : percent >= 60
        ? 2
        : 1;

    saveRoundResult(
      currentRound,
      percent,
      stars
    );

    updateUnlockedRounds();

    clearProgress();

    updateResultScreen(
      percent,
      stars
    );

    updateContinueButton();

    showScreen(
      "resultScreen"
    );

    stopMusic();
  }

  /* =========================================================
     RESULT
     ========================================================= */

  function updateResultScreen(
    percent,
    stars
  ) {
    safeText(
      elements.finalScore,
      `Score: ${score}`
    );

    safeText(
      elements.resultPercent,
      `${Math.round(percent)}%`
    );

    safeText(
      elements.correctCount,
      correctAnswers
    );

    safeText(
      elements.wrongCount,
      wrongAnswers
    );

    safeText(
      elements.finishedRound,
      `Round ${currentRound} completed`
    );

    if (elements.resultMessage) {
      if (percent >= 80) {
        elements.resultMessage.textContent =
          "Excellent! You earned 3 stars.";
      } else if (
        percent >= 60
      ) {
        elements.resultMessage.textContent =
          "Great job! You earned 2 stars and unlocked the next round.";
      } else {
        elements.resultMessage.textContent =
          "Keep practicing! You can retry this round.";
      }
    }

    if (elements.nextRoundBtn) {
      const nextRound =
        currentRound + 1;

      const unlocked =
        getUnlockedRounds();

      if (
        nextRound <=
          rounds.length &&
        nextRound <=
          unlocked
      ) {
        elements.nextRoundBtn.style.display =
          "";
      } else {
        elements.nextRoundBtn.style.display =
          "none";
      }
    }

    saveTotalScore();
    updatePersonalBest();
  }

  /* =========================================================
     ROUND RESULTS
     ========================================================= */

  function saveRoundResult(
    roundNumber,
    percent,
    stars
  ) {
    const completed =
      loadJSON(
        STORAGE.completedRounds,
        []
      );

    if (
      !Array.isArray(completed)
    ) {
      return;
    }

    if (
      !completed.includes(
        roundNumber
      )
    ) {
      completed.push(
        roundNumber
      );
    }

    saveJSON(
      STORAGE.completedRounds,
      completed
    );

    const roundStars =
      loadJSON(
        STORAGE.roundStars,
        {}
      );

    roundStars[
      String(roundNumber)
    ] = stars;

    saveJSON(
      STORAGE.roundStars,
      roundStars
    );

    saveJSON(
      STORAGE.dailyChallenge,
      {
        date:
          new Date()
            .toISOString()
            .slice(0, 10),
        round:
          roundNumber,
        percent:
          Math.round(percent)
      }
    );
  }

  /* =========================================================
     TOTAL SCORE
     ========================================================= */

  function saveTotalScore() {
    const oldScore =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        )
      ) || 0;

    localStorage.setItem(
      STORAGE.totalScore,
      String(
        oldScore + score
      )
    );
  }

  /* =========================================================
     PERSONAL BEST
     ========================================================= */

  function updatePersonalBest() {
    const best =
      Number(
        localStorage.getItem(
          STORAGE.personalBest
        )
      ) || 0;

    if (score > best) {
      localStorage.setItem(
        STORAGE.personalBest,
        String(score)
      );
    }
  }

  /* =========================================================
     REVIEW
     ========================================================= */

  function showReview() {
    stopTimer();

    showScreen(
      "reviewScreen"
    );

    renderReview();
  }

  function renderReview() {
    if (!elements.reviewList) {
      return;
    }

    elements.reviewList.innerHTML =
      "";

    safeText(
      elements.reviewSummary,
      `Round ${currentRound}: ${correctAnswers}/${currentRoundQuestions.length} correct`
    );

    reviewQuestions.forEach(
      (item, index) => {
        const div =
          document.createElement(
            "div"
          );

        div.className =
          item.isCorrect
            ? "review-item review-correct"
            : "review-item review-wrong";

        const title =
          document.createElement(
            "strong"
          );

        title.textContent =
          `Question ${index + 1}: ${getQuestionText(item.question)}`;

        div.appendChild(
          title
        );

        const selected =
          document.createElement(
            "p"
          );

        selected.textContent =
          item.selectedAnswer ===
          null
            ? "Your answer: No answer"
            : `Your answer: ${item.selectedAnswer}`;

        div.appendChild(
          selected
        );

        const correct =
          document.createElement(
            "p"
          );

        correct.textContent =
          `Correct answer: ${item.correctAnswer}`;

        div.appendChild(
          correct
        );

        elements.reviewList.appendChild(
          div
        );
      }
    );
  }

  /* =========================================================
     RETRY
     ========================================================= */

  function retryRound() {
    stopTimer();

    startQuiz(
      currentRound
    );
  }

  /* =========================================================
     NEXT ROUND
     ========================================================= */

  function nextRound() {
    const next =
      currentRound + 1;

    const unlocked =
      getUnlockedRounds();

    if (
      next > rounds.length
    ) {
      showScreen(
        "resultScreen"
      );
      return;
    }

    if (
      next > unlocked
    ) {
      showError(
        "Complete the current round with at least 60% to unlock the next round."
      );
      return;
    }

    startQuiz(next);
  }

  /* =========================================================
     ROUNDS SCREEN
     ========================================================= */

  function renderRounds() {
    if (!elements.roundGrid) {
      return;
    }

    elements.roundGrid.innerHTML =
      "";

    const unlocked =
      getUnlockedRounds();

    const completed =
      loadJSON(
        STORAGE.completedRounds,
        []
      );

    const roundStars =
      loadJSON(
        STORAGE.roundStars,
        {}
      );

    rounds.forEach(
      (roundQuestions, index) => {
        const roundNumber =
          index + 1;

        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        const isUnlocked =
          roundNumber <=
          unlocked;

        const isCompleted =
          Array.isArray(completed) &&
          completed.includes(
            roundNumber
          );

        button.className =
          isUnlocked
            ? "round-btn unlocked"
            : "round-btn locked";

        let label =
          `Round ${roundNumber}`;

        if (
          isCompleted
        ) {
          const stars =
            Number(
              roundStars[
                String(
                  roundNumber
                )
              ]
            ) || 1;

          label +=
            ` ⭐ ${stars}/3`;
        }

        if (
          !isUnlocked
        ) {
          label +=
            " 🔒";
        }

        label +=
          `\n${roundQuestions.length} Questions`;

        button.textContent =
          label;

        button.addEventListener(
          "click",
          () => {
            if (
              roundNumber >
              getUnlockedRounds()
            ) {
              showError(
                "This round is locked. Complete previous rounds to unlock it."
              );
              return;
            }

            startQuiz(
              roundNumber
            );
          }
        );

        elements.roundGrid.appendChild(
          button
        );
      }
    );
  }

  /* =========================================================
     HOME
     ========================================================= */

  function goHome() {
    stopTimer();
    stopMusic();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function openSettings() {
    stopTimer();

    showScreen(
      "settingsScreen"
    );

    updateSettingsUI();
  }

  function updateSettingsUI() {
    if (elements.musicSwitch) {
      elements.musicSwitch.classList.toggle(
        "on",
        musicEnabled
      );

      elements.musicSwitch.setAttribute(
        "aria-pressed",
        String(musicEnabled)
      );
    }

    if (elements.soundSwitch) {
      elements.soundSwitch.classList.toggle(
        "on",
        soundEnabled
      );

      elements.soundSwitch.setAttribute(
        "aria-pressed",
        String(soundEnabled)
      );
    }
  }

  function toggleMusic() {
    musicEnabled =
      !musicEnabled;

    localStorage.setItem(
      STORAGE.music,
      String(musicEnabled)
    );

    updateSettingsUI();

    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  function toggleSound() {
    soundEnabled =
      !soundEnabled;

    localStorage.setItem(
      STORAGE.sound,
      String(soundEnabled)
    );

    updateSettingsUI();
  }

  /* =========================================================
     MUSIC
     ========================================================= */

  function initializeMusic() {
    try {
      backgroundMusic =
        new Audio(
          MUSIC_FILE
        );

      backgroundMusic.loop =
        true;

      backgroundMusic.volume =
        0.35;

      backgroundMusic.preload =
        "auto";

    } catch (error) {
      console.warn(
        "Music initialization warning:",
        error
      );
    }
  }

  function startMusic() {
    if (
      !musicEnabled ||
      !backgroundMusic
    ) {
      return;
    }

    const promise =
      backgroundMusic.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(
        () => {
          /*
            Browser autoplay policy may block
            music until the user interacts.
            This is normal.
          */
        }
      );
    }
  }

  function stopMusic() {
    if (!backgroundMusic) {
      return;
    }

    try {
      backgroundMusic.pause();
      backgroundMusic.currentTime =
        0;
    } catch (error) {
      console.warn(
        "Music stop warning:",
        error
      );
    }
  }

  /* =========================================================
     SOUND EFFECTS
     ========================================================= */

  function playSound(type) {
    if (!soundEnabled) {
      return;
    }

    /*
      Uses Web Audio only for short answer sounds.
      Background music uses music.mp3.
    */

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const context =
        new AudioContext();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      if (type === "correct") {
        oscillator.frequency.value =
          880;
      } else {
        oscillator.frequency.value =
          220;
      }

      gain.gain.setValueAtTime(
        0.08,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.18
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          0.18
      );

      oscillator.addEventListener(
        "ended",
        () => {
          context.close().catch(
            () => {}
          );
        }
      );

    } catch (error) {
      console.warn(
        "Sound effect warning:",
        error
      );
    }
  }

  /* =========================================================
     SHARE
     ========================================================= */

  async function shareQuiz() {
    const shareText =
      "Test your knowledge with Quiz Master!";

    const shareUrl =
      window.location.href;

    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            "Quiz Master 🇷🇼",
          text:
            shareText,
          url:
            shareUrl
        });

        return;

      } catch (error) {
        if (
          error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        shareUrl
      );

      const oldText =
        elements.shareBtn
          ? elements.shareBtn.textContent
          : "";

      if (elements.shareBtn) {
        elements.shareBtn.textContent =
          "✅ Link Copied!";

        setTimeout(
          () => {
            elements.shareBtn.textContent =
              oldText ||
              "📤 Share Quiz Master";
          },
          2000
        );
      }

    } catch (error) {
      window.prompt(
        "Copy this Quiz Master link:",
        shareUrl
      );
    }
  }

  /* =========================================================
     ERROR SCREEN
     ========================================================= */

  function showError(message) {
    stopTimer();
    stopMusic();

    safeText(
      elements.errorMessage,
      message
    );

    showScreen(
      "errorScreen"
    );
  }

  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  function setupEventListeners() {

    /* Start */

    if (elements.startBtn) {
      elements.startBtn.addEventListener(
        "click",
        () => startQuiz(1)
      );
    }

    /* Continue */

    if (elements.continueBtn) {
      elements.continueBtn.addEventListener(
        "click",
        continueQuiz
      );
    }

    /* Rounds */

    if (elements.roundsBtn) {
      elements.roundsBtn.addEventListener(
        "click",
        () => {
          renderRounds();

          showScreen(
            "roundsScreen"
          );
        }
      );
    }

    /* Settings */

    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener(
        "click",
        openSettings
      );
    }

    /* Share */

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener(
        "click",
        shareQuiz
      );
    }

    /* Rounds Back */

    if (elements.roundsBackBtn) {
      elements.roundsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    /* Next Question */

    if (elements.nextBtn) {
      elements.nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    }

    /* Quiz Home */

    if (elements.quizHomeBtn) {
      elements.quizHomeBtn.addEventListener(
        "click",
        () => {
          saveCurrentProgress();
          goHome();
        }
      );
    }

    /* Next Round */

    if (elements.nextRoundBtn) {
      elements.nextRoundBtn.addEventListener(
        "click",
        nextRound
      );
    }

    /* Retry */

    if (elements.restartBtn) {
      elements.restartBtn.addEventListener(
        "click",
        retryRound
      );
    }

    /* Review */

    if (elements.reviewBtn) {
      elements.reviewBtn.addEventListener(
        "click",
        showReview
      );
    }

    /* Result Home */

    if (elements.resultHomeBtn) {
      elements.resultHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    /* Review Retry */

    if (elements.reviewRetryBtn) {
      elements.reviewRetryBtn.addEventListener(
        "click",
        retryRound
      );
    }

    /* Review Back */

    if (elements.reviewBackBtn) {
      elements.reviewBackBtn.addEventListener(
        "click",
        () => {
          showScreen(
            "resultScreen"
          );
        }
      );
    }

    /* Music */

    if (elements.musicSwitch) {
      elements.musicSwitch.addEventListener(
        "click",
        toggleMusic
      );
    }

    /* Sound */

    if (elements.soundSwitch) {
      elements.soundSwitch.addEventListener(
        "click",
        toggleSound
      );
    }

    /* Settings Back */

    if (elements.settingsBackBtn) {
      elements.settingsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    /* Error Retry */

    if (elements.errorRestartBtn) {
      elements.errorRestartBtn.addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );

          loadQuestions();
        }
      );
    }

    /* Error Home */

    if (elements.errorHomeBtn) {
      elements.errorHomeBtn.addEventListener(
        "click",
        goHome
      );
    }
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function initialize() {
    initializeMusic();

    updateSettingsUI();

    setupEventListeners();

    showScreen(
      "homeScreen"
    );

    loadQuestions();
  }

  /* =========================================================
     PUBLIC FUNCTIONS
     ========================================================= */

  /*
    These are exposed globally as an extra safety measure.
    They do not change index.html.
  */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.nextRound =
    nextRound;

  window.retryRound =
    retryRound;

  window.showReview =
    showReview;

  window.goHome =
    goHome;

  window.loadQuestions =
    loadQuestions;

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
