/* =========================================================
   QUIZ MASTER 🇷🇼
   QUESTIONS ENGINE
   ---------------------------------------------------------
   SAFE FULL VERSION
   ---------------------------------------------------------
   - Keeps existing index.html design
   - Keeps existing HTML IDs
   - Does NOT inject CSS
   - Does NOT create new visible UI
   - Supports music.mp3
   - Supports Music + Sound settings
   - Start Quiz
   - Continue Quiz
   - Quiz Rounds
   - Retry
   - Review Answers
   - Next Question
   - Next Round
   - Settings
   - Share
   - Progress saving
   - Round unlocking
   - Question retention
========================================================= */

(function () {
  "use strict";

  /* =======================================================
     CONFIG
  ======================================================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 500;
  const UNLOCK_PERCENT = 60;

  const QUESTIONS_FILE = "./questions.json";
  const MUSIC_FILE = "./music.mp3";

  /* =======================================================
     STORAGE KEYS
  ======================================================= */

  const STORAGE = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    selectedRound: "quizmasterSelectedRound",
    completedRounds: "quizmasterCompletedRounds",
    usedQuestions: "quizmasterUsedQuestions",
    music: "quizmasterMusic",
    sound: "quizmasterSound",
    premium: "quizmasterPremium",
    dailyChallenge: "quizmasterDailyChallenge",
    achievements: "quizmasterAchievements",
    personalBest: "quizmasterPersonalBest",
    totalScore: "quizmasterTotalScore"
  };

  /* =======================================================
     STATE
  ======================================================= */

  let allQuestions = [];

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let roundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let streak = 0;
  let bestStreak = 0;

  let timerInterval = null;
  let timeLeft = TIME_PER_QUESTION;

  let questionAnswered = false;

  let currentReview = [];

  let currentSelectedAnswer = null;

  /* =======================================================
     DOM HELPER
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  /* =======================================================
     SCREENS
  ======================================================= */

  const screens = [
    "homeScreen",
    "roundsScreen",
    "quizScreen",
    "resultScreen",
    "reviewScreen",
    "settingsScreen",
    "errorScreen"
  ];

  function showScreen(screenId) {
    screens.forEach(function (id) {
      const screen = $(id);

      if (!screen) return;

      /*
       * IMPORTANT:
       * index.html uses:
       * .screen { display:none }
       * .screen.active { display:block }
       *
       * Therefore we ONLY change the active class.
       */
      screen.classList.toggle("active", id === screenId);
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =======================================================
     SAFE STORAGE
  ======================================================= */

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Storage error:", error);
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage remove error:", error);
    }
  }

  /* =======================================================
     MUSIC
  ======================================================= */

  let musicEnabled = true;

  const backgroundMusic = new Audio(MUSIC_FILE);

  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.25;
  backgroundMusic.preload = "auto";

  function loadMusicSetting() {
    const saved = readStorage(STORAGE.music, true);

    musicEnabled = saved !== false;

    updateMusicSwitch();
  }

  function updateMusicSwitch() {
    const switchElement = $("musicSwitch");

    if (!switchElement) return;

    /*
     * Supports checkbox switches and normal buttons.
     */
    if ("checked" in switchElement) {
      switchElement.checked = musicEnabled;
    }

    switchElement.classList.toggle("on", musicEnabled);
    switchElement.setAttribute(
      "aria-pressed",
      musicEnabled ? "true" : "false"
    );
  }

  function startMusic() {
    if (!musicEnabled) return;

    backgroundMusic.play().catch(function () {
      /*
       * Browser may block autoplay.
       * The next user interaction can start it again.
       */
    });
  }

  function stopMusic() {
    try {
      backgroundMusic.pause();
    } catch (error) {
      console.warn("Music pause error:", error);
    }
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;

    writeStorage(STORAGE.music, musicEnabled);

    updateMusicSwitch();

    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  /* =======================================================
     SOUND
  ======================================================= */

  let soundEnabled = true;
  let audioContext = null;

  function loadSoundSetting() {
    const saved = readStorage(STORAGE.sound, true);

    soundEnabled = saved !== false;

    updateSoundSwitch();
  }

  function updateSoundSwitch() {
    const switchElement = $("soundSwitch");

    if (!switchElement) return;

    if ("checked" in switchElement) {
      switchElement.checked = soundEnabled;
    }

    switchElement.classList.toggle("on", soundEnabled);
    switchElement.setAttribute(
      "aria-pressed",
      soundEnabled ? "true" : "false"
    );
  }

  function getAudioContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    try {
      audioContext = new AudioContext();
      return audioContext;
    } catch (error) {
      return null;
    }
  }

  function playSound(type) {
    if (!soundEnabled) return;

    const ctx = getAudioContext();

    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(function () {});
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      let frequency = 440;

      if (type === "correct") {
        frequency = 700;
      } else if (type === "wrong") {
        frequency = 220;
      } else if (type === "click") {
        frequency = 500;
      } else if (type === "finish") {
        frequency = 800;
      }

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.08,
        ctx.currentTime + 0.01
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.18
      );

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.warn("Sound error:", error);
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;

    writeStorage(STORAGE.sound, soundEnabled);

    updateSoundSwitch();

    if (soundEnabled) {
      playSound("click");
    }
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  function initializeSettings() {
    loadMusicSetting();
    loadSoundSetting();
  }

  /* =======================================================
     QUESTION VALIDATION
  ======================================================= */

  function normalizeQuestion(item, index) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const question =
      typeof item.question === "string"
        ? item.question.trim()
        : "";

    const questionRw =
      typeof item.question_rw === "string"
        ? item.question_rw.trim()
        : "";

    const options = Array.isArray(item.options)
      ? item.options
          .filter(function (option) {
            return typeof option === "string";
          })
          .map(function (option) {
            return option.trim();
          })
          .filter(Boolean)
      : [];

    const answer =
      typeof item.answer === "string"
        ? item.answer.trim()
        : "";

    const category =
      typeof item.category === "string" &&
      item.category.trim()
        ? item.category.trim()
        : "General";

    if (!question) return null;

    if (options.length < 2) return null;

    if (!answer) return null;

    const answerExists = options.some(function (option) {
      return option === answer;
    });

    if (!answerExists) {
      return null;
    }

    return {
      id:
        item.id ||
        "question-" + index,

      question: question,

      question_rw: questionRw,

      options: options,

      answer: answer,

      category: category
    };
  }

  /* =======================================================
     LOAD QUESTIONS
  ======================================================= */

  async function loadQuestions() {
    try {
      const response = await fetch(
        QUESTIONS_FILE,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load questions.json"
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "questions.json must contain an array."
        );
      }

      const validQuestions = data
        .map(normalizeQuestion)
        .filter(Boolean);

      if (validQuestions.length < QUESTIONS_PER_ROUND) {
        throw new Error(
          "Quiz Master needs at least " +
          QUESTIONS_PER_ROUND +
          " valid questions."
        );
      }

      allQuestions = validQuestions;

      return true;
    } catch (error) {
      console.error(error);

      showError(
        "Questions could not be loaded. Please check that questions.json is valid and contains at least " +
        QUESTIONS_PER_ROUND +
        " valid questions."
      );

      return false;
    }
  }

  /* =======================================================
     ERROR SCREEN
  ======================================================= */

  function showError(message) {
    const errorMessage = $("errorMessage");

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    showScreen("errorScreen");
  }

  /* =======================================================
     UNLOCKED ROUNDS
  ======================================================= */

  function getUnlockedRounds() {
    let unlocked = readStorage(
      STORAGE.unlockedRounds,
      [1]
    );

    if (!Array.isArray(unlocked)) {
      unlocked = [1];
    }

    unlocked = unlocked
      .map(Number)
      .filter(function (round) {
        return (
          Number.isInteger(round) &&
          round >= 1 &&
          round <= TOTAL_ROUNDS
        );
      });

    if (!unlocked.includes(1)) {
      unlocked.push(1);
    }

    unlocked = Array.from(
      new Set(unlocked)
    ).sort(function (a, b) {
      return a - b;
    });

    writeStorage(
      STORAGE.unlockedRounds,
      unlocked
    );

    return unlocked;
  }

  function isRoundUnlocked(round) {
    return getUnlockedRounds().includes(
      Number(round)
    );
  }

  function unlockNextRound(round, percent) {
    if (percent < UNLOCK_PERCENT) {
      return;
    }

    if (round >= TOTAL_ROUNDS) {
      return;
    }

    const unlocked = getUnlockedRounds();

    const nextRound = round + 1;

    if (!unlocked.includes(nextRound)) {
      unlocked.push(nextRound);

      unlocked.sort(function (a, b) {
        return a - b;
      });

      writeStorage(
        STORAGE.unlockedRounds,
        unlocked
      );
    }
  }

  /* =======================================================
     USED QUESTIONS
  ======================================================= */

  function getUsedQuestions() {
    const used = readStorage(
      STORAGE.usedQuestions,
      []
    );

    if (!Array.isArray(used)) {
      return [];
    }

    return used;
  }

  function saveUsedQuestions(used) {
    writeStorage(
      STORAGE.usedQuestions,
      used
    );
  }

  function selectQuestionsForRound() {
    if (allQuestions.length < QUESTIONS_PER_ROUND) {
      throw new Error(
        "Not enough valid questions."
      );
    }

    let used = getUsedQuestions();

    const available = allQuestions.filter(
      function (question) {
        return !used.includes(question.id);
      }
    );

    /*
     * When the cycle is finished,
     * start a new question cycle.
     */
    if (
      available.length <
      QUESTIONS_PER_ROUND
    ) {
      used = [];

      saveUsedQuestions([]);

      /*
       * Shuffle all questions for a new cycle.
       */
      shuffleArray(allQuestions);
    }

    const freshAvailable = allQuestions.filter(
      function (question) {
        return !used.includes(question.id);
      }
    );

    const selected = shuffleArray(
      freshAvailable.slice()
    ).slice(
      0,
      QUESTIONS_PER_ROUND
    );

    /*
     * If something unexpected happens,
     * safely fill from all questions.
     */
    if (
      selected.length <
      QUESTIONS_PER_ROUND
    ) {
      const fallback = shuffleArray(
        allQuestions.slice()
      ).slice(
        0,
        QUESTIONS_PER_ROUND
      );

      return fallback;
    }

    const newUsed = used.concat(
      selected.map(function (question) {
        return question.id;
      })
    );

    saveUsedQuestions(newUsed);

    return selected;
  }

  /* =======================================================
     SHUFFLE
  ======================================================= */

  function shuffleArray(array) {
    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      const temp = array[i];

      array[i] = array[j];
      array[j] = temp;
    }

    return array;
  }

  /* =======================================================
     PROGRESS
  ======================================================= */

  function getProgress() {
    const progress = readStorage(
      STORAGE.progress,
      null
    );

    if (!progress || typeof progress !== "object") {
      return null;
    }

    return progress;
  }

  function saveProgress() {
    const progress = {
      active: true,

      round: currentRound,

      questionIndex:
        currentQuestionIndex,

      roundQuestions:
        roundQuestions,

      score: score,

      correctAnswers:
        correctAnswers,

      wrongAnswers:
        wrongAnswers,

      streak: streak,

      bestStreak:
        bestStreak,

      review: currentReview
    };

    writeStorage(
      STORAGE.progress,
      progress
    );

    writeStorage(
      STORAGE.currentRound,
      currentRound
    );
  }

  function clearProgress() {
    removeStorage(STORAGE.progress);
    removeStorage(STORAGE.currentRound);
    removeStorage(STORAGE.selectedRound);
  }

  function hasValidProgress() {
    const progress = getProgress();

    if (!progress) {
      return false;
    }

    if (!progress.active) {
      return false;
    }

    if (
      !Array.isArray(
        progress.roundQuestions
      )
    ) {
      return false;
    }

    if (
      progress.roundQuestions.length === 0
    ) {
      return false;
    }

    return true;
  }

  /* =======================================================
     CONTINUE BUTTON
  ======================================================= */

  function updateContinueButton() {
    const button = $("continueBtn");

    if (!button) return;

    if (hasValidProgress()) {
      button.style.display = "";
    } else {
      button.style.display = "none";
    }
  }

  /* =======================================================
     ROUNDS
  ======================================================= */

  function renderRounds() {
    const grid = $("roundGrid");

    if (!grid) return;

    grid.innerHTML = "";

    const unlocked = getUnlockedRounds();

    for (
      let round = 1;
      round <= TOTAL_ROUNDS;
      round++
    ) {
      const button =
        document.createElement("button");

      button.type = "button";

      button.textContent =
        unlocked.includes(round)
          ? "Round " + round
          : "🔒 Round " + round;

      button.dataset.round = String(round);

      /*
       * Keep existing CSS/design.
       * Only use existing classes if present.
       */
      if (!unlocked.includes(round)) {
        button.disabled = true;
      }

      button.addEventListener(
        "click",
        function () {
          if (
            !isRoundUnlocked(round)
          ) {
            return;
          }

          playSound("click");

          startNewRound(round);
        }
      );

      grid.appendChild(button);
    }
  }

  /* =======================================================
     START NEW ROUND
  ======================================================= */

  function startNewRound(round) {
    if (!isRoundUnlocked(round)) {
      return;
    }

    if (
      !allQuestions ||
      allQuestions.length <
        QUESTIONS_PER_ROUND
    ) {
      showError(
        "There are not enough valid questions to start this round."
      );

      return;
    }

    currentRound = Number(round);

    currentQuestionIndex = 0;

    score = 0;

    correctAnswers = 0;

    wrongAnswers = 0;

    streak = 0;

    bestStreak = 0;

    currentReview = [];

    currentSelectedAnswer = null;

    questionAnswered = false;

    stopTimer();

    try {
      roundQuestions =
        selectQuestionsForRound();
    } catch (error) {
      console.error(error);

      showError(
        "Unable to prepare questions for this round."
      );

      return;
    }

    writeStorage(
      STORAGE.selectedRound,
      currentRound
    );

    saveProgress();

    showScreen("quizScreen");

    startMusic();

    renderQuestion();
  }

  /* =======================================================
     START QUIZ
  ======================================================= */

  function startQuiz() {
    playSound("click");

    startMusic();

    /*
     * Start from the highest unlocked round only
     * when the user explicitly selects rounds.
     * Normal Start Quiz always starts Round 1.
     */
    startNewRound(1);
  }

  /* =======================================================
     CONTINUE QUIZ
  ======================================================= */

  function continueQuiz() {
    playSound("click");

    const progress = getProgress();

    if (!progress) {
      startQuiz();
      return;
    }

    if (
      !Array.isArray(
        progress.roundQuestions
      ) ||
      progress.roundQuestions.length === 0
    ) {
      startQuiz();
      return;
    }

    currentRound =
      Number(progress.round) || 1;

    currentQuestionIndex =
      Number(progress.questionIndex) || 0;

    roundQuestions =
      progress.roundQuestions;

    score =
      Number(progress.score) || 0;

    correctAnswers =
      Number(progress.correctAnswers) || 0;

    wrongAnswers =
      Number(progress.wrongAnswers) || 0;

    streak =
      Number(progress.streak) || 0;

    bestStreak =
      Number(progress.bestStreak) || 0;

    currentReview =
      Array.isArray(progress.review)
        ? progress.review
        : [];

    questionAnswered = false;

    currentSelectedAnswer = null;

    showScreen("quizScreen");

    startMusic();

    renderQuestion();
  }

  /* =======================================================
     QUIZ SCREEN ELEMENTS
  ======================================================= */

  function updateQuizHeader() {
    const questionNumber =
      $("questionNumber");

    const roundDisplay =
      $("roundDisplay");

    const scoreElement =
      $("score");

    if (questionNumber) {
      questionNumber.textContent =
        String(
          currentQuestionIndex + 1
        );
    }

    if (roundDisplay) {
      roundDisplay.textContent =
        "Round " + currentRound;
    }

    if (scoreElement) {
      scoreElement.textContent =
        String(score);
    }
  }

  /* =======================================================
     RENDER QUESTION
  ======================================================= */

  function renderQuestion() {
    stopTimer();

    if (
      !roundQuestions ||
      currentQuestionIndex >=
        roundQuestions.length
    ) {
      finishRound();
      return;
    }

    const current =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!current) {
      finishRound();
      return;
    }

    questionAnswered = false;

    currentSelectedAnswer = null;

    updateQuizHeader();

    const category =
      $("category");

    const question =
      $("question");

    const options =
      $("options");

    const message =
      $("message");

    const nextBtn =
      $("nextBtn");

    const progressBar =
      $("progressBar");

    const timer =
      $("timer");

    if (category) {
      category.textContent =
        current.category || "General";
    }

    if (question) {
      question.textContent =
        current.question;
    }

    if (message) {
      message.textContent = "";
    }

    if (nextBtn) {
      nextBtn.style.display = "none";
    }

    if (progressBar) {
      const percent =
        (
          currentQuestionIndex /
          roundQuestions.length
        ) * 100;

      progressBar.style.width =
        Math.max(
          0,
          Math.min(100, percent)
        ) + "%";
    }

    if (!options) {
      showError(
        "The quiz options element was not found."
      );

      return;
    }

    options.innerHTML = "";

    current.options.forEach(
      function (optionText) {
        const button =
          document.createElement("button");

        button.type = "button";

        button.textContent =
          optionText;

        button.dataset.answer =
          optionText;

        button.addEventListener(
          "click",
          function () {
            handleAnswer(
              optionText,
              button
            );
          }
        );

        options.appendChild(button);
      }
    );

    timeLeft = TIME_PER_QUESTION;

    updateTimerDisplay();

    startTimer();
  }

  /* =======================================================
     TIMER
  ======================================================= */

  function startTimer() {
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    timerInterval =
      setInterval(function () {
        if (questionAnswered) {
          stopTimer();
          return;
        }

        timeLeft--;

        updateTimerDisplay();

        if (timeLeft <= 0) {
          stopTimer();

          handleTimeOut();
        }
      }, 1000);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);

      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const timer = $("timer");

    if (!timer) return;

    timer.textContent =
      String(
        Math.max(0, timeLeft)
      );
  }

  /* =======================================================
     ANSWER
  ======================================================= */

  function handleAnswer(
    selectedAnswer,
    clickedButton
  ) {
    if (questionAnswered) {
      return;
    }

    questionAnswered = true;

    currentSelectedAnswer =
      selectedAnswer;

    stopTimer();

    const current =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!current) return;

    const isCorrect =
      selectedAnswer ===
      current.answer;

    const options =
      $("options");

    if (options) {
      const buttons =
        options.querySelectorAll(
          "button"
        );

      buttons.forEach(
        function (button) {
          button.disabled = true;

          const answer =
            button.dataset.answer;

          if (
            answer ===
            current.answer
          ) {
            button.classList.add(
              "correct"
            );
          }

          if (
            answer ===
              selectedAnswer &&
            !isCorrect
          ) {
            button.classList.add(
              "wrong"
            );
          }
        }
      );
    }

    if (isCorrect) {
      score += POINTS_PER_CORRECT;

      correctAnswers++;

      streak++;

      if (streak > bestStreak) {
        bestStreak = streak;
      }

      /*
       * Every 3 correct answers:
       * bonus +5
       */
      if (
        streak > 0 &&
        streak % 3 === 0
      ) {
        score += 5;
      }

      playSound("correct");

      showMessage(
        "Correct!"
      );
    } else {
      wrongAnswers++;

      streak = 0;

      playSound("wrong");

      showMessage(
        "Wrong. Correct answer: " +
        current.answer
      );
    }

    currentReview.push({
      question: current.question,

      question_rw:
        current.question_rw || "",

      options:
        current.options.slice(),

      correctAnswer:
        current.answer,

      selectedAnswer:
        selectedAnswer,

      isCorrect:
        isCorrect,

      timedOut:
        false,

      category:
        current.category
    });

    saveProgress();

    updateQuizHeader();

    showNextButton();
  }

  /* =======================================================
     TIME OUT
  ======================================================= */

  function handleTimeOut() {
    if (questionAnswered) {
      return;
    }

    questionAnswered = true;

    wrongAnswers++;

    streak = 0;

    const current =
      roundQuestions[
        currentQuestionIndex
      ];

    if (!current) return;

    const options =
      $("options");

    if (options) {
      const buttons =
        options.querySelectorAll(
          "button"
        );

      buttons.forEach(
        function (button) {
          button.disabled = true;

          if (
            button.dataset.answer ===
            current.answer
          ) {
            button.classList.add(
              "correct"
            );
          }
        }
      );
    }

    playSound("wrong");

    showMessage(
      "Time is up. Correct answer: " +
      current.answer
    );

    currentReview.push({
      question: current.question,

      question_rw:
        current.question_rw || "",

      options:
        current.options.slice(),

      correctAnswer:
        current.answer,

      selectedAnswer:
        null,

      isCorrect:
        false,

      timedOut:
        true,

      category:
        current.category
    });

    saveProgress();

    updateQuizHeader();

    showNextButton();
  }

  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(text) {
    const message =
      $("message");

    if (!message) return;

    message.textContent = text;
  }

  /* =======================================================
     NEXT BUTTON
  ======================================================= */

  function showNextButton() {
    const nextBtn =
      $("nextBtn");

    if (!nextBtn) return;

    nextBtn.style.display = "";
  }

  function nextQuestion() {
    if (!questionAnswered) {
      return;
    }

    playSound("click");

    currentQuestionIndex++;

    if (
      currentQuestionIndex >=
      roundQuestions.length
    ) {
      finishRound();

      return;
    }

    saveProgress();

    renderQuestion();
  }

  /* =======================================================
     FINISH ROUND
  ======================================================= */

  function finishRound() {
    stopTimer();

    questionAnswered = true;

    const total =
      roundQuestions.length ||
      QUESTIONS_PER_ROUND;

    const percent =
      Math.round(
        (
          correctAnswers /
          total
        ) * 100
      );

    const unlockedBefore =
      getUnlockedRounds();

    unlockNextRound(
      currentRound,
      percent
    );

    saveCompletedRound(
      currentRound,
      percent
    );

    updateAchievements();

    updatePersonalBest();

    updateTotalScore();

    clearProgress();

    renderResult(
      percent,
      total
    );

    playSound("finish");

    startMusic();

    updateContinueButton();

    renderRounds();
  }

  /* =======================================================
     RESULT
  ======================================================= */

  function renderResult(
    percent,
    total
  ) {
    const finalScore =
      $("finalScore");

    const resultPercent =
      $("resultPercent");

    const resultMessage =
      $("resultMessage");

    const finishedRound =
      $("finishedRound");

    const correctCount =
      $("correctCount");

    const wrongCount =
      $("wrongCount");

    const nextRoundBtn =
      $("nextRoundBtn");

    if (finalScore) {
      finalScore.textContent =
        String(score);
    }

    if (resultPercent) {
      resultPercent.textContent =
        String(percent) + "%";
    }

    if (finishedRound) {
      finishedRound.textContent =
        String(currentRound);
    }

    if (correctCount) {
      correctCount.textContent =
        String(correctAnswers);
    }

    if (wrongCount) {
      wrongCount.textContent =
        String(wrongAnswers);
    }

    if (resultMessage) {
      if (
        percent >= 80
      ) {
        resultMessage.textContent =
          "Excellent work!";
      } else if (
        percent >= UNLOCK_PERCENT
      ) {
        resultMessage.textContent =
          "Great job! You unlocked the next round.";
      } else {
        resultMessage.textContent =
          "Keep practicing and try again.";
      }
    }

    if (nextRoundBtn) {
      if (
        percent >= UNLOCK_PERCENT &&
        currentRound <
          TOTAL_ROUNDS &&
        isRoundUnlocked(
          currentRound + 1
        )
      ) {
        nextRoundBtn.style.display =
          "";
      } else {
        nextRoundBtn.style.display =
          "none";
      }
    }

    showScreen(
      "resultScreen"
    );
  }

  /* =======================================================
     NEXT ROUND
  ======================================================= */

  function nextRound() {
    const next =
      currentRound + 1;

    if (
      next > TOTAL_ROUNDS
    ) {
      return;
    }

    if (
      !isRoundUnlocked(next)
    ) {
      return;
    }

    playSound("click");

    startNewRound(next);
  }

  /* =======================================================
     RETRY
  ======================================================= */

  function retryRound() {
    playSound("click");

    startNewRound(
      currentRound
    );
  }

  /* =======================================================
     REVIEW
  ======================================================= */

  function showReview() {
    playSound("click");

    const reviewSummary =
      $("reviewSummary");

    const reviewList =
      $("reviewList");

    if (reviewSummary) {
      reviewSummary.textContent =
        correctAnswers +
        " correct / " +
        wrongAnswers +
        " wrong";
    }

    if (reviewList) {
      reviewList.innerHTML = "";

      currentReview.forEach(
        function (item, index) {
          const wrapper =
            document.createElement(
              "div"
            );

          const question =
            document.createElement(
              "div"
            );

          question.textContent =
            (
              index + 1
            ) +
            ". " +
            item.question;

          const answer =
            document.createElement(
              "div"
            );

          if (item.isCorrect) {
            answer.textContent =
              "Correct: " +
              item.correctAnswer;
          } else if (
            item.timedOut
          ) {
            answer.textContent =
              "Time expired. Correct answer: " +
              item.correctAnswer;
          } else {
            answer.textContent =
              "Your answer: " +
              (
                item.selectedAnswer ||
                "No answer"
              ) +
              " | Correct answer: " +
              item.correctAnswer;
          }

          wrapper.appendChild(
            question
          );

          wrapper.appendChild(
            answer
          );

          reviewList.appendChild(
            wrapper
          );
        }
      );
    }

    showScreen(
      "reviewScreen"
    );
  }

  /* =======================================================
     COMPLETED ROUNDS
  ======================================================= */

  function saveCompletedRound(
    round,
    percent
  ) {
    let completed =
      readStorage(
        STORAGE.completedRounds,
        []
      );

    if (!Array.isArray(completed)) {
      completed = [];
    }

    const existing =
      completed.find(
        function (item) {
          return (
            Number(item.round) ===
            Number(round)
          );
        }
      );

    if (existing) {
      existing.percent =
        Math.max(
          Number(existing.percent) || 0,
          percent
        );
    } else {
      completed.push({
        round: round,
        percent: percent,
        date:
          new Date().toISOString()
      });
    }

    writeStorage(
      STORAGE.completedRounds,
      completed
    );
  }

  /* =======================================================
     ACHIEVEMENTS
  ======================================================= */

  function getAchievements() {
    const achievements =
      readStorage(
        STORAGE.achievements,
        []
      );

    return Array.isArray(
      achievements
    )
      ? achievements
      : [];
  }

  function addAchievement(
    achievement
  ) {
    const achievements =
      getAchievements();

    if (
      !achievements.includes(
        achievement
      )
    ) {
      achievements.push(
        achievement
      );

      writeStorage(
        STORAGE.achievements,
        achievements
      );
    }
  }

  function updateAchievements() {
    const completed =
      readStorage(
        STORAGE.completedRounds,
        []
      );

    const roundsCompleted =
      Array.isArray(completed)
        ? completed.length
        : 0;

    if (
      roundsCompleted >= 1
    ) {
      addAchievement(
        "first_round"
      );
    }

    if (
      roundsCompleted >= 5
    ) {
      addAchievement(
        "five_rounds"
      );
    }

    if (
      correctAnswers >= 50
    ) {
      addAchievement(
        "fifty_correct"
      );
    }

    const unlocked =
      getUnlockedRounds();

    if (
      unlocked.length >=
      TOTAL_ROUNDS
    ) {
      addAchievement(
        "all_rounds"
      );
    }
  }

  /* =======================================================
     PERSONAL BEST
  ======================================================= */

  function updatePersonalBest() {
    const oldBest =
      Number(
        readStorage(
          STORAGE.personalBest,
          0
        )
      ) || 0;

    if (score > oldBest) {
      writeStorage(
        STORAGE.personalBest,
        score
      );
    }
  }

  /* =======================================================
     TOTAL SCORE
  ======================================================= */

  function updateTotalScore() {
    const oldTotal =
      Number(
        readStorage(
          STORAGE.totalScore,
          0
        )
      ) || 0;

    writeStorage(
      STORAGE.totalScore,
      oldTotal + score
    );
  }

  /* =======================================================
     DAILY CHALLENGE
  ======================================================= */

  function updateDailyChallenge() {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const current =
      readStorage(
        STORAGE.dailyChallenge,
        null
      );

    if (
      !current ||
      current.date !== today
    ) {
      writeStorage(
        STORAGE.dailyChallenge,
        {
          date: today,
          completed: false,
          score: 0
        }
      );
    }
  }

  /* =======================================================
     HOME
  ======================================================= */

  function goHome() {
    stopTimer();

    updateContinueButton();

    renderRounds();

    showScreen(
      "homeScreen"
    );
  }

  function goRounds() {
    playSound("click");

    renderRounds();

    showScreen(
      "roundsScreen"
    );
  }

  function goSettings() {
    playSound("click");

    updateMusicSwitch();

    updateSoundSwitch();

    showScreen(
      "settingsScreen"
    );
  }

  /* =======================================================
     SHARE
  ======================================================= */

  async function shareQuiz() {
    playSound("click");

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
        /*
         * User cancelled share.
         * Do not show an error.
         */
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
      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(
          shareUrl
        );

        const button =
          $("shareBtn");

        if (button) {
          const oldText =
            button.textContent;

          button.textContent =
            "✅ Link Copied!";

          setTimeout(
            function () {
              button.textContent =
                oldText;
            },
            1800
          );
        }

        return;
      }
    } catch (error) {
      console.warn(
        "Clipboard error:",
        error
      );
    }

    /*
     * Final fallback for older browsers.
     */
    try {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        shareUrl;

      textarea.style.position =
        "fixed";

      textarea.style.left =
        "-9999px";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      document.body.removeChild(
        textarea
      );

      const button =
        $("shareBtn");

      if (button) {
        const oldText =
          button.textContent;

        button.textContent =
          "✅ Link Copied!";

        setTimeout(
          function () {
            button.textContent =
              oldText;
          },
          1800
        );
      }
    } catch (error) {
      console.warn(
        "Share fallback error:",
        error
      );
    }
  }

  /* =======================================================
     EVENT LISTENERS
  ======================================================= */

  function setupEvents() {
    const startBtn =
      $("startBtn");

    const continueBtn =
      $("continueBtn");

    const roundsBtn =
      $("roundsBtn");

    const settingsBtn =
      $("settingsBtn");

    const shareBtn =
      $("shareBtn");

    const roundsBackBtn =
      $("roundsBackBtn");

    const nextBtn =
      $("nextBtn");

    const quizHomeBtn =
      $("quizHomeBtn");

    const nextRoundBtn =
      $("nextRoundBtn");

    const restartBtn =
      $("restartBtn");

    const reviewBtn =
      $("reviewBtn");

    const resultHomeBtn =
      $("resultHomeBtn");

    const reviewRetryBtn =
      $("reviewRetryBtn");

    const reviewBackBtn =
      $("reviewBackBtn");

    const musicSwitch =
      $("musicSwitch");

    const soundSwitch =
      $("soundSwitch");

    const settingsBackBtn =
      $("settingsBackBtn");

    const errorRestartBtn =
      $("errorRestartBtn");

    const errorHomeBtn =
      $("errorHomeBtn");

    if (startBtn) {
      startBtn.addEventListener(
        "click",
        startQuiz
      );
    }

    if (continueBtn) {
      continueBtn.addEventListener(
        "click",
        continueQuiz
      );
    }

    if (roundsBtn) {
      roundsBtn.addEventListener(
        "click",
        goRounds
      );
    }

    if (settingsBtn) {
      settingsBtn.addEventListener(
        "click",
        goSettings
      );
    }

    if (shareBtn) {
      shareBtn.addEventListener(
        "click",
        shareQuiz
      );
    }

    if (roundsBackBtn) {
      roundsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (nextBtn) {
      nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    }

    if (quizHomeBtn) {
      quizHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (nextRoundBtn) {
      nextRoundBtn.addEventListener(
        "click",
        nextRound
      );
    }

    if (restartBtn) {
      restartBtn.addEventListener(
        "click",
        retryRound
      );
    }

    if (reviewBtn) {
      reviewBtn.addEventListener(
        "click",
        showReview
      );
    }

    if (resultHomeBtn) {
      resultHomeBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (reviewRetryBtn) {
      reviewRetryBtn.addEventListener(
        "click",
        retryRound
      );
    }

    if (reviewBackBtn) {
      reviewBackBtn.addEventListener(
        "click",
        function () {
          playSound("click");

          showScreen(
            "resultScreen"
          );
        }
      );
    }

    if (musicSwitch) {
      musicSwitch.addEventListener(
        "click",
        function () {
          toggleMusic();
        }
      );

      musicSwitch.addEventListener(
        "change",
        function () {
          /*
           * For checkbox inputs, click already
           * handles the toggle. Do not toggle twice.
           */
        }
      );
    }

    if (soundSwitch) {
      soundSwitch.addEventListener(
        "click",
        function () {
          toggleSound();
        }
      );

      soundSwitch.addEventListener(
        "change",
        function () {
          /*
           * Click handler handles it.
           */
        }
      );
    }

    if (settingsBackBtn) {
      settingsBackBtn.addEventListener(
        "click",
        goHome
      );
    }

    if (errorRestartBtn) {
      errorRestartBtn.addEventListener(
        "click",
        async function () {
          const loaded =
            await loadQuestions();

          if (loaded) {
            goHome();

            updateContinueButton();
          }
        }
      );
    }

    if (errorHomeBtn) {
      errorHomeBtn.addEventListener(
        "click",
        goHome
      );
    }
  }

  /* =======================================================
     GLOBAL FUNCTIONS
     -------------------------------------------------------
     These are exposed only as compatibility helpers.
  ======================================================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.retryRound =
    retryRound;

  window.nextRound =
    nextRound;

  window.showReview =
    showReview;

  window.goHome =
    goHome;

  window.goRounds =
    goRounds;

  window.goSettings =
    goSettings;

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  async function initialize() {
    initializeSettings();

    updateDailyChallenge();

    setupEvents();

    /*
     * Home is the first screen.
     * This uses .active, matching index.html CSS.
     */
    showScreen(
      "homeScreen"
    );

    updateContinueButton();

    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }

    renderRounds();

    updateContinueButton();
  }

  /* =======================================================
     DOM READY
  ======================================================= */

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
