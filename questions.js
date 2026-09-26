/* =========================================================
   QUIZ MASTER 🇷🇼 - QUESTIONS.JS
   Matches Quiz Master Knowledge Quiz index.html
   ========================================================= */

(() => {
  "use strict";

  /* =========================
     QUIZ SETTINGS
     ========================= */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 10;
  const UNLOCK_PERCENT = 60;

  const QUESTIONS_FILE = "./questions.json";

  /* =========================
     STORAGE KEYS
     ========================= */

  const STORAGE = {
    progress: "quizmasterProgress",
    unlocked: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    music: "quizmasterMusic",
    sound: "quizmasterSound"
  };

  /* =========================
     STATE
     ========================= */

  let allQuestions = [];
  let currentRound = 1;
  let currentQuestions = [];
  let currentQuestionIndex = 0;

  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;

  let timer = null;
  let timeLeft = TIME_PER_QUESTION;

  let answered = false;

  let reviewAnswers = [];

  let quizStarted = false;

  /* =========================
     DOM HELPERS
     ========================= */

  const $ = (id) => document.getElementById(id);

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    const screen = $(screenId);

    if (screen) {
      screen.classList.add("active");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =========================
     LOCAL STORAGE
     ========================= */

  function getUnlockedRounds() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE.unlocked)
      );

      if (Array.isArray(saved) && saved.length > 0) {
        return saved;
      }
    } catch (error) {
      console.warn("Could not read unlocked rounds:", error);
    }

    return [1];
  }

  function saveUnlockedRounds(rounds) {
    localStorage.setItem(
      STORAGE.unlocked,
      JSON.stringify(rounds)
    );
  }

  function getProgress() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE.progress)
      );
    } catch (error) {
      return null;
    }
  }

  function saveProgress() {
    const progress = {
      round: currentRound,
      questionIndex: currentQuestionIndex,
      score,
      correctCount,
      wrongCount,
      reviewAnswers
    };

    localStorage.setItem(
      STORAGE.progress,
      JSON.stringify(progress)
    );

    localStorage.setItem(
      STORAGE.currentRound,
      String(currentRound)
    );
  }

  function clearProgress() {
    localStorage.removeItem(STORAGE.progress);
    localStorage.removeItem(STORAGE.currentRound);
  }

  /* =========================
     ROUND UNLOCK SYSTEM
     ========================= */

  function unlockNextRound(roundNumber, percentage) {
    if (percentage < UNLOCK_PERCENT) {
      return;
    }

    const unlocked = getUnlockedRounds();

    const nextRound = roundNumber + 1;

    if (
      nextRound <= TOTAL_ROUNDS &&
      !unlocked.includes(nextRound)
    ) {
      unlocked.push(nextRound);
      unlocked.sort((a, b) => a - b);
      saveUnlockedRounds(unlocked);
    }
  }

  function isRoundUnlocked(roundNumber) {
    return getUnlockedRounds().includes(roundNumber);
  }

  /* =========================
     RENDER ROUNDS
     ========================= */

  function renderRounds() {
    const grid = $("roundGrid");

    if (!grid) return;

    const unlocked = getUnlockedRounds();

    grid.innerHTML = "";

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.round = String(round);

      if (unlocked.includes(round)) {
        button.className = "round-btn unlocked";
        button.textContent = `Round ${round}`;

        button.addEventListener("click", () => {
          startNewQuiz(round);
        });
      } else {
        button.className = "round-btn locked";
        button.textContent = `🔒 Round ${round}`;

        button.addEventListener("click", () => {
          showTemporaryMessage(
            `🔒 Round ${round} is locked. Complete the previous round with at least ${UNLOCK_PERCENT}%.`
          );
        });
      }

      grid.appendChild(button);
    }
  }

  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {
    try {
      const response = await fetch(
        `${QUESTIONS_FILE}?v=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Questions file could not be loaded. HTTP ${response.status}`
        );
      }

      const data = await response.json();

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

      validateQuestions();

      if (allQuestions.length < QUESTIONS_PER_ROUND) {
        throw new Error(
          `At least ${QUESTIONS_PER_ROUND} questions are required.`
        );
      }

      console.log(
        `Quiz Master loaded ${allQuestions.length} questions.`
      );

      return true;
    } catch (error) {
      console.error("Quiz loading error:", error);

      showError(
        "Unable to load quiz questions. Please check that questions.json exists in the same folder as index.html and that its JSON format is correct."
      );

      return false;
    }
  }

  /* =========================
     VALIDATE QUESTIONS
     ========================= */

  function validateQuestions() {
    allQuestions = allQuestions.filter((question) => {
      if (!question) return false;

      if (
        typeof question.question !== "string" ||
        question.question.trim() === ""
      ) {
        return false;
      }

      if (
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        return false;
      }

      if (
        typeof question.answer !== "string" ||
        question.answer.trim() === ""
      ) {
        return false;
      }

      return true;
    });

    console.log(
      `Valid questions: ${allQuestions.length}`
    );
  }

  /* =========================
     GET QUESTIONS FOR ROUND
     ========================= */

  function getQuestionsForRound(roundNumber) {
    const start =
      (roundNumber - 1) * QUESTIONS_PER_ROUND;

    const end =
      start + QUESTIONS_PER_ROUND;

    /*
      If there are enough questions for this round,
      use that section of the question bank.
    */

    if (allQuestions.length >= end) {
      return shuffleArray(
        allQuestions.slice(start, end)
      );
    }

    /*
      If there are not enough questions for a later round,
      recycle the question bank in shuffled order.

      This prevents the app from crashing while you
      continue adding more questions to questions.json.
    */

    const shuffled = shuffleArray(
      [...allQuestions]
    );

    const result = [];

    for (
      let i = 0;
      i < QUESTIONS_PER_ROUND;
      i++
    ) {
      result.push(
        shuffled[i % shuffled.length]
      );
    }

    return result;
  }

  /* =========================
     SHUFFLE
     ========================= */

  function shuffleArray(array) {
    const copy = [...array];

    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [copy[i], copy[j]] = [
        copy[j],
        copy[i]
      ];
    }

    return copy;
  }

  /* =========================
     START NEW QUIZ
     ========================= */

  async function startNewQuiz(roundNumber = 1) {
    if (!isRoundUnlocked(roundNumber)) {
      showTemporaryMessage(
        `🔒 Round ${roundNumber} is locked.`
      );
      return;
    }

    if (allQuestions.length === 0) {
      const loaded = await loadQuestions();

      if (!loaded) return;
    }

    stopTimer();

    currentRound = roundNumber;

    currentQuestions =
      getQuestionsForRound(currentRound);

    currentQuestionIndex = 0;

    score = 0;
    correctCount = 0;
    wrongCount = 0;

    reviewAnswers = [];

    answered = false;
    quizStarted = true;

    saveProgress();

    showScreen("quizScreen");

    renderQuestion();
  }

  /* =========================
     CONTINUE QUIZ
     ========================= */

  async function continueQuiz() {
    const progress = getProgress();

    if (!progress) {
      startNewQuiz(1);
      return;
    }

    if (allQuestions.length === 0) {
      const loaded = await loadQuestions();

      if (!loaded) return;
    }

    const savedRound =
      Number(progress.round) || 1;

    if (!isRoundUnlocked(savedRound)) {
      clearProgress();
      startNewQuiz(1);
      return;
    }

    currentRound = savedRound;

    currentQuestions =
      getQuestionsForRound(currentRound);

    currentQuestionIndex =
      Number(progress.questionIndex) || 0;

    score =
      Number(progress.score) || 0;

    correctCount =
      Number(progress.correctCount) || 0;

    wrongCount =
      Number(progress.wrongCount) || 0;

    reviewAnswers =
      Array.isArray(progress.reviewAnswers)
        ? progress.reviewAnswers
        : [];

    if (
      currentQuestionIndex >=
      currentQuestions.length
    ) {
      currentQuestionIndex = 0;
    }

    answered = false;
    quizStarted = true;

    showScreen("quizScreen");

    renderQuestion();
  }

  /* =========================
     SAVE QUIZ PROGRESS
     ========================= */

  function saveQuizProgress() {
    if (!quizStarted) return;

    saveProgress();
  }

  /* =========================
     RENDER QUESTION
     ========================= */

  function renderQuestion() {
    stopTimer();

    answered = false;

    const question =
      currentQuestions[currentQuestionIndex];

    if (!question) {
      finishQuiz();
      return;
    }

    const questionNumber =
      currentQuestionIndex + 1;

    const total =
      currentQuestions.length;

    /* Question number */

    if ($("questionNumber")) {
      $("questionNumber").textContent =
        `Question ${questionNumber} / ${total}`;
    }

    /* Score */

    if ($("score")) {
      $("score").textContent =
        `Score: ${score}`;
    }

    /* Round */

    if ($("roundDisplay")) {
      $("roundDisplay").textContent =
        `Round ${currentRound}`;
    }

    /* Category */

    if ($("category")) {
      $("category").textContent =
        question.category
          ? `📚 ${question.category}`
          : "";
    }

    /* Progress */

    if ($("progressBar")) {
      const percent =
        (questionNumber / total) * 100;

      $("progressBar").style.width =
        `${percent}%`;
    }

    /* Question */

    if ($("question")) {
      $("question").textContent =
        question.question;
    }

    /* Message */

    if ($("message")) {
      $("message").textContent = "";
      $("message").classList.add("hidden");
    }

    /* Next button */

    if ($("nextBtn")) {
      $("nextBtn").style.display =
        "none";
    }

    /* Options */

    renderOptions(question);

    /* Timer */

    startTimer();

    saveProgress();
  }

  /* =========================
     RENDER OPTIONS
     ========================= */

  function renderOptions(question) {
    const container = $("options");

    if (!container) return;

    container.innerHTML = "";

    const options = shuffleArray(
      question.options
    );

    options.forEach((option) => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      button.textContent = option;

      button.addEventListener(
        "click",
        () => {
          selectAnswer(
            option,
            question
          );
        }
      );

      container.appendChild(button);
    });
  }

  /* =========================
     SELECT ANSWER
     ========================= */

  function selectAnswer(
    selectedAnswer,
    question
  ) {
    if (answered) return;

    answered = true;

    stopTimer();

    const correctAnswer =
      String(question.answer).trim();

    const selected =
      String(selectedAnswer).trim();

    const isCorrect =
      selected === correctAnswer;

    const optionButtons =
      document.querySelectorAll(
        "#options button"
      );

    optionButtons.forEach((button) => {
      button.disabled = true;

      const buttonText =
        String(button.textContent).trim();

      if (
        buttonText === correctAnswer
      ) {
        button.classList.add("correct");
      }

      if (
        buttonText === selected &&
        !isCorrect
      ) {
        button.classList.add("wrong");
      }
    });

    if (isCorrect) {
      correctCount++;

      score += POINTS_PER_CORRECT;

      showMessage(
        "✅ Correct!",
        "correct"
      );

      playSound("correct");
    } else {
      wrongCount++;

      showMessage(
        `❌ Wrong! Correct answer: ${correctAnswer}`,
        "wrong"
      );

      playSound("wrong");
    }

    reviewAnswers.push({
      question:
        question.question,

      selected:
        selectedAnswer,

      correct:
        correctAnswer,

      isCorrect
    });

    if ($("score")) {
      $("score").textContent =
        `Score: ${score}`;
    }

    saveProgress();

    if ($("nextBtn")) {
      $("nextBtn").style.display =
        "block";
    }
  }

  /* =========================
     TIME OUT
     ========================= */

  function handleTimeUp() {
    if (answered) return;

    answered = true;

    const question =
      currentQuestions[currentQuestionIndex];

    if (!question) return;

    wrongCount++;

    const correctAnswer =
      String(question.answer).trim();

    const optionButtons =
      document.querySelectorAll(
        "#options button"
      );

    optionButtons.forEach((button) => {
      button.disabled = true;

      if (
        String(button.textContent).trim() ===
        correctAnswer
      ) {
        button.classList.add("correct");
      }
    });

    showMessage(
      `⏰ Time's up! Correct answer: ${correctAnswer}`,
      "wrong"
    );

    playSound("wrong");

    reviewAnswers.push({
      question:
        question.question,

      selected:
        "No answer",

      correct:
        correctAnswer,

      isCorrect: false
    });

    saveProgress();

    if ($("nextBtn")) {
      $("nextBtn").style.display =
        "block";
    }
  }

  /* =========================
     TIMER
     ========================= */

  function startTimer() {
    stopTimer();

    timeLeft = TIME_PER_QUESTION;

    updateTimerDisplay();

    timer = setInterval(() => {
      timeLeft--;

      updateTimerDisplay();

      if (timeLeft <= 0) {
        stopTimer();

        handleTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function updateTimerDisplay() {
    if ($("timer")) {
      $("timer").textContent =
        `⏱️ ${Math.max(0, timeLeft)}`;
    }
  }

  /* =========================
     NEXT QUESTION
     ========================= */

  function nextQuestion() {
    if (!answered) return;

    currentQuestionIndex++;

    if (
      currentQuestionIndex >=
      currentQuestions.length
    ) {
      finishQuiz();
      return;
    }

    renderQuestion();
  }

  /* =========================
     FINISH QUIZ
     ========================= */

  function finishQuiz() {
    stopTimer();

    quizStarted = false;

    const total =
      currentQuestions.length;

    const percentage =
      total > 0
        ? Math.round(
            (correctCount / total) * 100
          )
        : 0;

    /* Save unlock status */

    unlockNextRound(
      currentRound,
      percentage
    );

    /* Clear continue progress */

    clearProgress();

    /* Final score */

    if ($("finalScore")) {
      $("finalScore").textContent =
        `Score: ${score}`;
    }

    /* Percentage */

    if ($("resultPercent")) {
      $("resultPercent").textContent =
        `${percentage}%`;
    }

    /* Correct */

    if ($("correctCount")) {
      $("correctCount").textContent =
        correctCount;
    }

    /* Wrong */

    if ($("wrongCount")) {
      $("wrongCount").textContent =
        wrongCount;
    }

    /* Result message */

    let resultText = "";

    if (percentage >= 80) {
      resultText =
        "🎉 Excellent! Great knowledge!";
    } else if (percentage >= 60) {
      resultText =
        "👏 Well done! You unlocked the next round.";
    } else {
      resultText =
        "💪 Keep practicing and try again!";
    }

    if ($("resultMessage")) {
      $("resultMessage").textContent =
        resultText;
    }

    /* Finished round message */

    if ($("finishedRound")) {
      if (
        percentage >= UNLOCK_PERCENT &&
        currentRound < TOTAL_ROUNDS
      ) {
        $("finishedRound").textContent =
          `🔓 Round ${currentRound + 1} is now unlocked!`;
      } else if (
        percentage < UNLOCK_PERCENT
      ) {
        $("finishedRound").textContent =
          `You need at least ${UNLOCK_PERCENT}% to unlock the next round.`;
      } else {
        $("finishedRound").textContent =
          "🏆 You completed all available rounds!";
      }
    }

    /* Next round button */

    if ($("nextRoundBtn")) {
      if (
        percentage >= UNLOCK_PERCENT &&
        currentRound < TOTAL_ROUNDS
      ) {
        $("nextRoundBtn").style.display =
          "block";
      } else {
        $("nextRoundBtn").style.display =
          "none";
      }
    }

    showScreen("resultScreen");

    loadAds();

    renderRounds();
  }

  /* =========================
     START NEXT ROUND
     ========================= */

  function startNextRound() {
    const nextRound =
      currentRound + 1;

    if (nextRound > TOTAL_ROUNDS) {
      return;
    }

    if (!isRoundUnlocked(nextRound)) {
      showTemporaryMessage(
        `🔒 Round ${nextRound} is still locked.`
      );

      return;
    }

    startNewQuiz(nextRound);
  }

  /* =========================
     RETRY CURRENT ROUND
     ========================= */

  function retryCurrentRound() {
    startNewQuiz(currentRound);
  }

  /* =========================
     REVIEW ANSWERS
     ========================= */

  function showReview() {
    const list = $("reviewList");

    if (!list) return;

    list.innerHTML = "";

    if (reviewAnswers.length === 0) {
      list.innerHTML =
        "<p>No answers to review.</p>";

      if ($("reviewSummary")) {
        $("reviewSummary").textContent =
          "";
      }

      showScreen("reviewScreen");

      return;
    }

    if ($("reviewSummary")) {
      $("reviewSummary").textContent =
        `Round ${currentRound}: ${correctCount} correct, ${wrongCount} wrong.`;
    }

    reviewAnswers.forEach(
      (item, index) => {
        const wrapper =
          document.createElement("div");

        wrapper.className =
          "review-item";

        const title =
          document.createElement("strong");

        title.textContent =
          `${index + 1}. ${item.question}`;

        const selected =
          document.createElement("p");

        selected.textContent =
          `Your answer: ${item.selected}`;

        const correct =
          document.createElement("p");

        correct.textContent =
          `Correct answer: ${item.correct}`;

        if (item.isCorrect) {
          wrapper.classList.add(
            "review-correct"
          );
        } else {
          wrapper.classList.add(
            "review-wrong"
          );
        }

        wrapper.appendChild(title);
        wrapper.appendChild(selected);
        wrapper.appendChild(correct);

        list.appendChild(wrapper);
      }
    );

    showScreen("reviewScreen");
  }

  /* =========================
     MESSAGE
     ========================= */

  function showMessage(
    text,
    type = ""
  ) {
    const message = $("message");

    if (!message) return;

    message.textContent = text;

    message.className =
      "message";

    if (type) {
      message.classList.add(type);
    }

    message.classList.remove(
      "hidden"
    );
  }

  function showTemporaryMessage(
    text
  ) {
    const message = $("message");

    if (!message) {
      alert(text);
      return;
    }

    message.textContent = text;

    message.className =
      "message";

    message.classList.remove(
      "hidden"
    );

    setTimeout(() => {
      message.classList.add(
        "hidden"
      );
    }, 2500);
  }

  /* =========================
     ERROR SCREEN
     ========================= */

  function showError(message) {
    stopTimer();

    if ($("errorMessage")) {
      $("errorMessage").textContent =
        message;
    }

    showScreen("errorScreen");
  }

  /* =========================
     SETTINGS
     ========================= */

  function getMusicEnabled() {
    return (
      localStorage.getItem(
        STORAGE.music
      ) === "true"
    );
  }

  function getSoundEnabled() {
    const saved =
      localStorage.getItem(
        STORAGE.sound
      );

    if (saved === null) {
      return true;
    }

    return saved === "true";
  }

  function updateSettingsUI() {
    const musicSwitch =
      $("musicSwitch");

    const soundSwitch =
      $("soundSwitch");

    if (musicSwitch) {
      musicSwitch.classList.toggle(
        "on",
        getMusicEnabled()
      );
    }

    if (soundSwitch) {
      soundSwitch.classList.toggle(
        "on",
        getSoundEnabled()
      );
    }
  }

  function toggleMusic() {
    const newValue =
      !getMusicEnabled();

    localStorage.setItem(
      STORAGE.music,
      String(newValue)
    );

    updateSettingsUI();

    if (!newValue) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  }

  function toggleSound() {
    const newValue =
      !getSoundEnabled();

    localStorage.setItem(
      STORAGE.sound,
      String(newValue)
    );

    updateSettingsUI();
  }

  /* =========================
     SIMPLE SOUND EFFECTS
     ========================= */

  let audioContext = null;

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      audioContext =
        new AudioContext();
    }

    return audioContext;
  }

  function playSound(type) {
    if (!getSoundEnabled()) {
      return;
    }

    const context =
      getAudioContext();

    if (!context) return;

    if (
      context.state === "suspended"
    ) {
      context.resume();
    }

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.connect(gain);
    gain.connect(
      context.destination
    );

    if (type === "correct") {
      oscillator.frequency.value =
        523.25;
    } else if (type === "wrong") {
      oscillator.frequency.value =
        220;
    } else {
      oscillator.frequency.value =
        330;
    }

    gain.gain.setValueAtTime(
      0.03,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.18
    );

    oscillator.start();

    oscillator.stop(
      context.currentTime + 0.18
    );
  }

  /* =========================
     BACKGROUND MUSIC
     ========================= */

  let musicInterval = null;

  function startBackgroundMusic() {
    if (!getMusicEnabled()) {
      return;
    }

    if (musicInterval) {
      return;
    }

    const context =
      getAudioContext();

    if (!context) return;

    if (
      context.state === "suspended"
    ) {
      context.resume();
    }

    const notes = [
      261.63,
      329.63,
      392.0,
      329.63
    ];

    let index = 0;

    const playNote = () => {
      if (!getMusicEnabled()) {
        stopBackgroundMusic();
        return;
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      oscillator.frequency.value =
        notes[index];

      gain.gain.setValueAtTime(
        0.025,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.35
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.35
      );

      index =
        (index + 1) % notes.length;
    };

    playNote();

    musicInterval =
      setInterval(
        playNote,
        650
      );
  }

  function stopBackgroundMusic() {
    if (musicInterval) {
      clearInterval(
        musicInterval
      );

      musicInterval = null;
    }
  }

  /* =========================
     SHARE
     ========================= */

  async function shareQuiz() {
    const shareUrl =
      "https://quizmaster-liard-five.vercel.app/";

    const shareData = {
      title:
        "Quiz Master 🇷🇼",
      text:
        "Test your knowledge with Quiz Master!",
      url: shareUrl
    };

    try {
      if (
        navigator.share
      ) {
        await navigator.share(
          shareData
        );

        return;
      }

      await navigator.clipboard.writeText(
        shareUrl
      );

      if ($("shareBtn")) {
        const oldText =
          $("shareBtn").textContent;

        $("shareBtn").textContent =
          "✅ Link Copied!";

        setTimeout(() => {
          $("shareBtn").textContent =
            oldText;
        }, 2000);
      }
    } catch (error) {
      if (
        error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Share error:",
        error
      );
    }
  }

  /* =========================
     ADS
     ========================= */

  function loadAds() {
    try {
      if (
        window.adsbygoogle
      ) {
        const ads =
          document.querySelectorAll(
            ".adsbygoogle"
          );

        ads.forEach((ad) => {
          if (
            !ad.getAttribute(
              "data-adsbygoogle-status"
            )
          ) {
            (window.adsbygoogle =
              window.adsbygoogle || []
            ).push({});
          }
        });
      }
    } catch (error) {
      console.warn(
        "AdSense could not be loaded:",
        error
      );
    }
  }

  /* =========================
     EVENT LISTENERS
     ========================= */

  function setupEvents() {
    /* Start */

    if ($("startBtn")) {
      $("startBtn").addEventListener(
        "click",
        () => {
          startNewQuiz(1);
        }
      );
    }

    /* Continue */

    if ($("continueBtn")) {
      $("continueBtn").addEventListener(
        "click",
        () => {
          continueQuiz();
        }
      );
    }

    /* Choose Round */

    if ($("roundsBtn")) {
      $("roundsBtn").addEventListener(
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

    if ($("settingsBtn")) {
      $("settingsBtn").addEventListener(
        "click",
        () => {
          updateSettingsUI();

          showScreen(
            "settingsScreen"
          );
        }
      );
    }

    /* Share */

    if ($("shareBtn")) {
      $("shareBtn").addEventListener(
        "click",
        shareQuiz
      );
    }

    /* Next question */

    if ($("nextBtn")) {
      $("nextBtn").addEventListener(
        "click",
        nextQuestion
      );
    }

    /* Quiz Home */

    if ($("quizHomeBtn")) {
      $("quizHomeBtn").addEventListener(
        "click",
        () => {
          stopTimer();

          quizStarted = false;

          saveQuizProgress();

          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /* Result Retry */

    if ($("restartBtn")) {
      $("restartBtn").addEventListener(
        "click",
        retryCurrentRound
      );
    }

    /* Review */

    if ($("reviewBtn")) {
      $("reviewBtn").addEventListener(
        "click",
        showReview
      );
    }

    /* Next Round */

    if ($("nextRoundBtn")) {
      $("nextRoundBtn").addEventListener(
        "click",
        startNextRound
      );
    }

    /* Result Home */

    if ($("resultHomeBtn")) {
      $("resultHomeBtn").addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /* Review Retry */

    if ($("reviewRetryBtn")) {
      $("reviewRetryBtn").addEventListener(
        "click",
        retryCurrentRound
      );
    }

    /* Review Back */

    if ($("reviewBackBtn")) {
      $("reviewBackBtn").addEventListener(
        "click",
        () => {
          showScreen(
            "resultScreen"
          );
        }
      );
    }

    /* Error Retry */

    if ($("errorRestartBtn")) {
      $("errorRestartBtn").addEventListener(
        "click",
        async () => {
          const loaded =
            await loadQuestions();

          if (loaded) {
            startNewQuiz(1);
          }
        }
      );
    }

    /* Error Home */

    if ($("errorHomeBtn")) {
      $("errorHomeBtn").addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /* Rounds Back */

    if ($("roundsBackBtn")) {
      $("roundsBackBtn").addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /* Settings Back */

    if ($("settingsBackBtn")) {
      $("settingsBackBtn").addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );
    }

    /* Music */

    if ($("musicSwitch")) {
      $("musicSwitch").addEventListener(
        "click",
        toggleMusic
      );

      $("musicSwitch").addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            toggleMusic();
          }
        }
      );
    }

    /* Sound */

    if ($("soundSwitch")) {
      $("soundSwitch").addEventListener(
        "click",
        toggleSound
      );

      $("soundSwitch").addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            toggleSound();
          }
        }
      );
    }

    /* Start music after user interaction */

    document.addEventListener(
      "click",
      () => {
        if (
          getMusicEnabled() &&
          quizStarted
        ) {
          startBackgroundMusic();
        }
      },
      {
        once: true
      }
    );
  }

  /* =========================
     UPDATE CONTINUE BUTTON
     ========================= */

  function updateContinueButton() {
    const button =
      $("continueBtn");

    if (!button) return;

    const progress =
      getProgress();

    if (progress) {
      button.style.display =
        "block";
    } else {
      button.style.display =
        "none";
    }
  }

  /* =========================
     INITIALIZE
     ========================= */

  async function initialize() {
    setupEvents();

    updateSettingsUI();

    renderRounds();

    updateContinueButton();

    /*
      Round 1 is always unlocked.
    */

    if (!localStorage.getItem(
      STORAGE.unlocked
    )) {
      saveUnlockedRounds([1]);
    }

    /*
      Load questions when app opens.
    */

    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }

    updateContinueButton();

    /*
      Make sure Home screen is visible.
    */

    showScreen("homeScreen");

    console.log(
      "Quiz Master 🇷🇼 initialized successfully."
    );
  }

  /* =========================
     PUBLIC FUNCTIONS
     ========================= */

  window.startNewQuiz =
    startNewQuiz;

  window.continueQuiz =
    continueQuiz;

  window.renderRounds =
    renderRounds;

  window.saveQuizProgress =
    saveQuizProgress;

  window.startNextRound =
    startNextRound;

  window.retryCurrentRound =
    retryCurrentRound;

  window.showReview =
    showReview;

  /* =========================
     START APP
     ========================= */

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
