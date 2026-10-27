
(() => {
  "use strict";

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 70,
    MAX_ROUNDS: 500
  };

  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = "quizmaster_progress_v3";
  const SETTINGS_KEY = "quizmaster_settings_v3";

  const translations = {
    en: {
      description: "Test your knowledge, learn road safety and progress through each round.",
      welcome: "Welcome to Quiz Master",
      setup: "Choose your language and quiz category before starting.",
      language: "Choose language",
      category: "Choose quiz type",
      traffic: "Road Safety",
      general: "General Knowledge",
      confirm: "Confirm Selection",
      start: "Start Quiz",
      continue: "Continue Quiz",
      rounds: "View Rounds",
      settings: "Settings",
      share: "Share Quiz",
      round: "Round",
      currentRound: "Current Round",
      question: "Question",
      seconds: "Seconds",
      score: "Best Score",
      stars: "Stars",
      next: "Next Question",
      pause: "Pause Quiz",
      resume: "Resume Quiz",
      exit: "Exit to Home",
      correct: "Correct!",
      incorrect: "Incorrect.",
      timeout: "Time is up!",
      explanation: "Explanation",
      result: "Round Complete",
      correctAnswers: "Correct Answers",
      percentage: "Percentage",
      earnedStars: "Stars Earned",
      retry: "Try Again",
      nextRound: "Next Round",
      home: "Back to Home",
      difficulty: "Difficulty",
      save: "Save Settings",
      reset: "Reset Progress",
      saved: "Settings saved.",
      resetConfirm: "Reset all saved quiz progress?",
      resetDone: "Progress has been reset.",
      loading: "Loading questions...",
      loadError: "Could not load questions. Check questions.json and try again.",
      noQuestions: "No questions are available for this category.",
      needQuestions: "Add at least 10 valid questions to play a complete round.",
      locked: "Locked",
      unlocked: "Unlocked",
      passed: "Congratulations! You unlocked the next round.",
      failed: "You need at least 70% to unlock the next round.",
      allRounds: "You have completed all available rounds.",
      selectFirst: "Confirm your language and quiz type first.",
      noSavedGame: "There is no saved quiz to continue.",
      shareText: "Test your knowledge with Quiz Master!",
      copied: "✅ Link Copied!",
      paused: "Quiz paused.",
      starsEarned: "Stars",
      roundList: "Choose an unlocked round.",
      mixed: "Mixed",
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      summary: "Selection",
      chooseRound: "Play this round",
      unavailable: "This round is locked.",
      confirmExit: "Exit this quiz? Your progress in this round will be saved.",
      questionNumber: "Question"
    },

    rw: {
      description: "Gerageza ubumenyi bwawe, wige umutekano wo mu muhanda kandi utere imbere buri Round.",
      welcome: "Murakaza neza muri Quiz Master",
      setup: "Hitamo ururimi n'ubwoko bw'ibibazo mbere yo gutangira.",
      language: "Hitamo ururimi",
      category: "Hitamo ubwoko bw'ibibazo",
      traffic: "Amategeko y'umuhanda",
      general: "Ibibazo rusange",
      confirm: "Emeza ibyo wahisemo",
      start: "Tangira gukina",
      continue: "Komeza aho wari ugeze",
      rounds: "Reba ama-Round",
      settings: "Igenamiterere",
      share: "Sangiza abandi",
      round: "Round",
      currentRound: "Round urimo",
      question: "Ikibazo",
      seconds: "Amasegonda",
      score: "Amanota meza",
      stars: "Inyenyeri",
      next: "Ikibazo gikurikira",
      pause: "Hagarika by'agateganyo",
      resume: "Komeza gukina",
      exit: "Subira ahabanza",
      correct: "Ni byo!",
      incorrect: "Si byo.",
      timeout: "Igihe kirangiye!",
      explanation: "Ibisobanuro",
      result: "Round irangiye",
      correctAnswers: "Ibisubizo by'ukuri",
      percentage: "Ijanisha",
      earnedStars: "Inyenyeri wabonye",
      retry: "Ongera ugerageze",
      nextRound: "Jya kuri Round ikurikira",
      home: "Subira ahabanza",
      difficulty: "Urwego rw'ibibazo",
      save: "Bika igenamiterere",
      reset: "Siba aho ugeze",
      resetConfirm: "Urashaka gusiba aho wageze hose mu mukino?",
      resetDone: "Aho wari ugeze hasibwe.",
      saved: "Igenamiterere ryabitswe.",
      loading: "Ibibazo biri gutegurwa...",
      loadError: "Ibibazo ntibyafungutse. Reba questions.json wongere ugerageze.",
      noQuestions: "Nta bibazo bibonetse muri ubu bwoko.",
      needQuestions: "Ongeramo nibura ibibazo 10 bifite amakuru yuzuye kugira ngo ukine Round.",
      locked: "Ifunze",
      unlocked: "Ifunguye",
      passed: "Ni byiza! Wafunguye Round ikurikira.",
      failed: "Ugomba kubona nibura 70% kugira ngo ufungure Round ikurikira.",
      allRounds: "Warangije ama-Round yose ahari.",
      selectFirst: "Banza wemeze ururimi n'ubwoko bw'ibibazo.",
      noSavedGame: "Nta mukino wabitswe wo gukomeza.",
      shareText: "Test your knowledge with Quiz Master!",
      copied: "✅ Link Copied!",
      paused: "Umukino wahagaritswe by'agateganyo.",
      starsEarned: "Inyenyeri",
      roundList: "Hitamo Round ifunguye.",
      mixed: "Bivanze",
      easy: "Byoroshye",
      medium: "Hagati",
      hard: "Bikomeye",
      summary: "Ibyahiswemo",
      chooseRound: "Kina iyi Round",
      unavailable: "Iyi Round irafunze.",
      confirmExit: "Uragira ngo usubire ahabanza? Aho ugeze muri iyi Round harabikwa.",
      questionNumber: "Ikibazo"
    }
  };

  let language = "en";
  let category = "traffic";
  let difficulty = "mixed";

  let allQuestions = [];
  let roundQuestions = [];
  let currentRound = 1;
  let questionIndex = 0;
  let score = 0;
  let secondsLeft = 0;
  let timerId = null;
  let answered = false;
  let gameActive = false;
  let selectedConfirmed = false;
  let currentScreen = "home";

  let roundBest = {};
  let roundStars = {};
  let unlockedRounds = {};
  let savedGame = null;

  // Stores shuffled answer choices separately for each question.
  let displayedOptions = [];

  function t(key) {
    return translations[language][key] ??
      translations.en[key] ??
      key;
  }

  function readObject(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roundBest,
        roundStars,
        unlockedRounds,
        savedGame
      }));
    } catch (error) {
      console.warn("Could not save progress:", error);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        language,
        category,
        difficulty,
        selectedConfirmed
      }));
    } catch (error) {
      console.warn("Could not save settings:", error);
    }
  }

  function loadSavedData() {
    const progress = readObject(STORAGE_KEY, {});

    roundBest = progress.roundBest || {};
    roundStars = progress.roundStars || {};
    unlockedRounds = progress.unlockedRounds || {};
    savedGame = progress.savedGame || null;

    const settings = readObject(SETTINGS_KEY, {});

    if (settings.language === "rw" || settings.language === "en") {
      language = settings.language;
    }

    if (settings.category === "traffic" ||
        settings.category === "general") {
      category = settings.category;
    }

    if (["mixed", "easy", "medium", "hard"].includes(settings.difficulty)) {
      difficulty = settings.difficulty;
    }

    selectedConfirmed = settings.selectedConfirmed === true;

    if (savedGame && !savedGame.finished) {
      if (savedGame.language === language &&
          savedGame.category === category) {
        currentRound = Math.max(1, Number(savedGame.round) || 1);
      } else {
        savedGame = null;
      }
    }
  }

  function progressKey(cat, round) {
    return `${cat}_round_${round}`;
  }

  function isUnlocked(round, cat = category) {
    if (round === 1) return true;
    return unlockedRounds[progressKey(cat, round)] === true;
  }

  function getRoundBest(round, cat = category) {
    return Number(roundBest[progressKey(cat, round)] || 0);
  }

  function getRoundStars(round, cat = category) {
    return Number(roundStars[progressKey(cat, round)] || 0);
  }

  function totalStars(cat = category) {
    let total = 0;

    for (let round = 1; round <= CONFIG.MAX_ROUNDS; round++) {
      total += getRoundStars(round, cat);
    }

    return total;
  }

  function getLanguageValue(question, base) {
    if (language === "rw") {
      return question[`${base}_rw`] || question[base] || "";
    }

    return question[base] || question[`${base}_rw`] || "";
  }

  function getOptions(question) {
    const options = language === "rw"
      ? question.options_rw
      : question.options;

    if (!Array.isArray(options) || options.length < 2) {
      return [];
    }

    // Shuffle options while preserving the original answer text.
    return shuffle(options.map(String));
  }

  function getCorrectAnswer(question) {
    return String(
      language === "rw"
        ? (question.answer_rw || question.answer || "")
        : (question.answer || question.answer_rw || "")
    );
  }

  function validateQuestion(q) {
    if (!q || typeof q !== "object") return false;

    if (q.category !== "traffic" && q.category !== "general") {
      return false;
    }

    if (typeof q.question !== "string" ||
        typeof q.question_rw !== "string") {
      return false;
    }

    if (!Array.isArray(q.options) ||
        !Array.isArray(q.options_rw) ||
        q.options.length < 2 ||
        q.options.length !== q.options_rw.length) {
      return false;
    }

    if (!q.options.every(x => typeof x === "string" && x.trim()) ||
        !q.options_rw.every(x => typeof x === "string" && x.trim())) {
      return false;
    }

    if (typeof q.answer !== "string" ||
        typeof q.answer_rw !== "string") {
      return false;
    }

    if (!q.options.includes(q.answer) ||
        !q.options_rw.includes(q.answer_rw)) {
      return false;
    }

    // Check that bilingual options and answers match by position.
    const answerIndex = q.options.indexOf(q.answer);

    if (q.options_rw[answerIndex] !== q.answer_rw) {
      return false;
    }

    return true;
  }

  async function loadQuestions() {
    $("homeMessage").textContent = t("loading");

    try {
      const response = await fetch(
        `${CONFIG.QUESTIONS_FILE}?v=4`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain a JSON array.");
      }

      allQuestions = data.filter(validateQuestion);

      if (allQuestions.length !== data.length) {
        console.warn(
          `${data.length - allQuestions.length} invalid questions were skipped.`
        );
      }

      if (allQuestions.length === 0) {
        throw new Error("No valid questions found.");
      }

      $("homeMessage").textContent = "";
      updateHome();

      if (currentScreen === "home") {
        showScreen("home");
      }
    } catch (error) {
      console.error("Question loading error:", error);
      $("homeMessage").textContent = t("loadError");
    }
  }

  function showScreen(screen) {
    stopTimer();
    currentScreen = screen;

    const screens = {
      home: "homeScreen",
      game: "gameScreen",
      result: "resultScreen",
      rounds: "roundsScreen",
      settings: "settingsScreen"
    };

    Object.entries(screens).forEach(([key, id]) => {
      $(id).classList.toggle("hidden", key !== screen);
    });
  }

  function updateChoiceButtons() {
    document.querySelectorAll("[data-language]").forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      const active = button.dataset.mode === category;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });

    $("selectionSummary").textContent =
      `${language === "rw" ? "Ikinyarwanda" : "English"} · ${t(category)}`;

    $("confirmSetupBtn").textContent = t("confirm");
  }

  function updateHome() {
    $("homeRound").textContent = currentRound;
    $("homeScore").textContent = getRoundBest(currentRound);
    $("homeStars").textContent = totalStars();

    $("startBtn").textContent = t("start");
    $("continueBtn").textContent = t("continue");
    $("roundsBtn").textContent = t("rounds");
    $("settingsBtn").textContent = t("settings");
    $("shareBtn").textContent = t("share");

    $("continueBtn").classList.toggle(
      "hidden",
      !savedGame || savedGame.finished ||
      savedGame.category !== category ||
      savedGame.language !== language
    );

    updateChoiceButtons();
  }

  function applyTranslations() {
    document.documentElement.lang = language;

    $("heroDescription").textContent = t("description");
    $("welcomeTitle").textContent = t("welcome");
    $("setupDescription").textContent = t("setup");
    $("languageLabel").textContent = t("language");
    $("categoryLabel").textContent = t("category");

    $("roundLabel").textContent = t("currentRound");
    $("scoreLabel").textContent = t("score");
    $("starsLabel").textContent = t("stars");

    $("gameRoundLabel").textContent = t("round");
    $("questionLabel").textContent = t("question");
    $("timerLabel").textContent = t("seconds");

    $("nextBtn").textContent = t("next");
    $("pauseBtn").textContent = t("pause");
    $("exitBtn").textContent = t("exit");

    $("resultTitle").textContent = t("result");
    $("resultScoreLabel").textContent = t("correctAnswers");
    $("resultPercentLabel").textContent = t("percentage");
    $("resultStarsLabel").textContent = t("earnedStars");

    $("retryBtn").textContent = t("retry");
    $("nextRoundBtn").textContent = t("nextRound");
    $("resultHomeBtn").textContent = t("home");

    $("roundsTitle").textContent = t("rounds");
    $("roundsDescription").textContent = t("roundList");
    $("roundsHomeBtn").textContent = t("home");

    $("settingsTitle").textContent = t("settings");
    $("difficultyLabel").textContent = t("difficulty");
    $("saveSettingsBtn").textContent = t("save");
    $("resetProgressBtn").textContent = t("reset");
    $("settingsHomeBtn").textContent = t("home");

    for (const option of $("difficultySelect").options) {
      option.textContent = t(option.value);
    }

    updateChoiceButtons();
  }

  function confirmSetup() {
    selectedConfirmed = true;
    currentRound = 1;
    savedGame = null;

    saveSettings();
    saveProgress();
    applyTranslations();
    updateHome();

    $("homeMessage").textContent = "";
  }

  function filteredQuestions() {
    let questions = allQuestions.filter(q => q.category === category);

    if (difficulty !== "mixed") {
      questions = questions.filter(q =>
        !q.difficulty || q.difficulty === difficulty
      );
    }

    return questions;
  }

  // Fisher-Yates shuffle.
  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function startRound(round, resume = false) {
    if (!selectedConfirmed) {
      $("homeMessage").textContent = t("selectFirst");
      return;
    }

    const bank = filteredQuestions();

    if (bank.length === 0) {
      $("homeMessage").textContent = t("noQuestions");
      showScreen("home");
      return;
    }

    if (bank.length < CONFIG.QUESTIONS_PER_ROUND) {
      $("homeMessage").textContent = t("needQuestions");
      showScreen("home");
      return;
    }

    if (!isUnlocked(round)) {
      $("homeMessage").textContent = t("unavailable");
      return;
    }

    currentRound = round;
    score = 0;
    questionIndex = 0;
    answered = false;
    gameActive = true;
    displayedOptions = [];

    if (resume && savedGame &&
        savedGame.category === category &&
        savedGame.language === language &&
        savedGame.round === round) {
      questionIndex = Math.max(
        0,
        Math.min(Number(savedGame.questionIndex) || 0, 9)
      );

      score = Math.max(0, Number(savedGame.score) || 0);

      const savedIds = Array.isArray(savedGame.questionIds)
        ? savedGame.questionIds
        : [];

      const restored = savedIds.map(id =>
        bank.find((q, index) => {
          const questionId = q.id !== undefined
            ? String(q.id)
            : `q-${allQuestions.indexOf(q)}`;

          return questionId === String(id);
        })
      );

      if (restored.length === CONFIG.QUESTIONS_PER_ROUND &&
          restored.every(Boolean)) {
        roundQuestions = restored;
      } else {
        roundQuestions = shuffle(bank).slice(
          0,
          CONFIG.QUESTIONS_PER_ROUND
        );
        questionIndex = 0;
        score = 0;
      }
    } else {
      roundQuestions = shuffle(bank).slice(
        0,
        CONFIG.QUESTIONS_PER_ROUND
      );
    }

    savedGame = {
      category,
      language,
      round,
      questionIndex,
      score,
      questionIds: roundQuestions.map(q =>
        q.id !== undefined
          ? String(q.id)
          : `q-${allQuestions.indexOf(q)}`
      ),
      finished: false
    };

    saveProgress();
    showScreen("game");
    renderQuestion();
  }

  function saveCurrentGame() {
    if (!gameActive) return;

    savedGame = {
      category,
      language,
      round: currentRound,
      questionIndex,
      score,
      questionIds: roundQuestions.map(q =>
        q.id !== undefined
          ? String(q.id)
          : `q-${allQuestions.indexOf(q)}`
      ),
      finished: false
    };

    saveProgress();
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function renderQuestion() {
    stopTimer();

    const q = roundQuestions[questionIndex];

    if (!q) {
      finishRound();
      return;
    }

    answered = false;
    secondsLeft = category === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;

    $("gameRound").textContent = currentRound;
    $("questionCounter").textContent =
      `${questionIndex + 1}/${CONFIG.QUESTIONS_PER_ROUND}`;

    $("timer").textContent = secondsLeft;
    $("progressFill").style.width =
      `${(questionIndex / CONFIG.QUESTIONS_PER_ROUND) * 100}%`;

    $("categoryInfo").textContent = t(category);
    $("questionText").textContent = getLanguageValue(q, "question");

    $("answerList").replaceChildren();

    $("feedback").className = "feedback hidden";
    $("feedback").textContent = "";
    $("nextBtn").classList.add("hidden");

    // Shuffle the choices once when the question is rendered.
    // Keep the shuffled list stable until the player answers.
    const options = getOptions(q);
    displayedOptions = options.slice();

    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.textContent = option;

      button.addEventListener("click", () => {
        chooseAnswer(option, button);
      });

      $("answerList").appendChild(button);
    });

    $("pauseBtn").textContent = t("pause");

    saveCurrentGame();
    startTimer();
  }

  function startTimer() {
    stopTimer();

    timerId = setInterval(() => {
      if (!gameActive || answered) return;

      secondsLeft--;
      $("timer").textContent = secondsLeft;

      if (secondsLeft <= 0) {
        chooseAnswer(null, null, true);
      }
    }, 1000);
  }

  function chooseAnswer(selected, clickedButton, timedOut = false) {
    if (answered || !gameActive) return;

    answered = true;
    stopTimer();

    const q = roundQuestions[questionIndex];
    const correctAnswer = getCorrectAnswer(q);
    const isCorrect = selected === correctAnswer;

    if (isCorrect) {
      score += CONFIG.POINTS_PER_CORRECT;
    }

    document.querySelectorAll(".answer-option").forEach(button => {
      button.disabled = true;

      if (button.textContent === correctAnswer) {
        button.classList.add("correct");
      } else if (button === clickedButton && !isCorrect) {
        button.classList.add("incorrect");
      }
    });

    const feedback = $("feedback");
    feedback.className = `feedback ${isCorrect ? "good" : "bad"}`;

    const message = document.createElement("strong");
    message.textContent = timedOut
      ? t("timeout")
      : isCorrect ? t("correct") : t("incorrect");

    feedback.replaceChildren(message);

    if (!isCorrect) {
      const correct = document.createElement("p");
      correct.textContent =
        `${language === "rw" ? "Igisubizo nyacyo" : "Correct answer"}: ${correctAnswer}`;
      feedback.appendChild(correct);
    }

    const explanation = getLanguageValue(q, "explanation");

    if (explanation) {
      const explanationText = document.createElement("p");
      explanationText.textContent =
        `${t("explanation")}: ${explanation}`;
      feedback.appendChild(explanationText);
    }

    feedback.classList.remove("hidden");

    $("progressFill").style.width =
      `${((questionIndex + 1) / CONFIG.QUESTIONS_PER_ROUND) * 100}%`;

    $("nextBtn").classList.remove("hidden");
    $("nextBtn").textContent =
      questionIndex === CONFIG.QUESTIONS_PER_ROUND - 1
        ? t("result")
        : t("next");

    saveCurrentGame();
  }

  function nextQuestion() {
    if (!answered) return;

    questionIndex++;

    if (questionIndex >= CONFIG.QUESTIONS_PER_ROUND) {
      finishRound();
      return;
    }

    saveCurrentGame();
    renderQuestion();
  }

  function finishRound() {
    stopTimer();
    gameActive = false;

    const percent = Math.round(
      score /
      (CONFIG.QUESTIONS_PER_ROUND * CONFIG.POINTS_PER_CORRECT) *
      100
    );

    const stars = percent >= 90 ? 3 : percent >= 80 ? 2 : percent >= 70 ? 1 : 0;
    const key = progressKey(category, currentRound);

    roundBest[key] = Math.max(
      Number(roundBest[key] || 0),
      percent
    );

    roundStars[key] = Math.max(
      Number(roundStars[key] || 0),
      stars
    );

    const passed = percent >= CONFIG.UNLOCK_PERCENT;

    if (passed && currentRound < CONFIG.MAX_ROUNDS) {
      unlockedRounds[progressKey(category, currentRound + 1)] = true;
    }

    savedGame = {
      category,
      language,
      round: currentRound,
      questionIndex: 0,
      score: 0,
      questionIds: [],
      finished: true
    };

    saveProgress();

    $("resultScore").textContent =
      `${score / CONFIG.POINTS_PER_CORRECT}/${CONFIG.QUESTIONS_PER_ROUND}`;

    $("resultPercent").textContent = `${percent}%`;
    $("resultStars").textContent = `${stars} ★`;

    $("resultMessage").textContent = passed
      ? (currentRound >= CONFIG.MAX_ROUNDS
          ? t("allRounds")
          : t("passed"))
      : t("failed");

    $("retryBtn").textContent = t("retry");

    $("nextRoundBtn").classList.toggle(
      "hidden",
      !passed || currentRound >= CONFIG.MAX_ROUNDS
    );

    $("resultHomeBtn").textContent = t("home");

    updateHome();
    showScreen("result");
  }

  function pauseGame() {
    if (!gameActive) return;

    saveCurrentGame();
    gameActive = false;
    stopTimer();

    $("pauseBtn").textContent = t("resume");
    $("homeMessage").textContent = t("paused");
  }

  function resumeGame() {
    if (currentScreen !== "game" || answered) {
      if (savedGame && !savedGame.finished) {
        startRound(savedGame.round, true);
      }
      return;
    }

    gameActive = true;
    $("pauseBtn").textContent = t("pause");
    startTimer();
  }

  function renderRounds() {
    $("roundList").replaceChildren();

    for (let round = 1; round <= CONFIG.MAX_ROUNDS; round++) {
      const unlocked = isUnlocked(round);
      const best = getRoundBest(round);
      const stars = getRoundStars(round);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.disabled = !unlocked;

      button.textContent =
        `${t("round")} ${round} · ${unlocked ? t("unlocked") : t("locked")} · ${best}% · ${stars} ★`;

      button.addEventListener("click", () => {
        if (unlocked) startRound(round);
      });

      $("roundList").appendChild(button);
    }

    showScreen("rounds");
  }

  function openSettings() {
    $("difficultySelect").value = difficulty;
    $("settingsMessage").textContent = "";
    showScreen("settings");
  }

  function returnHome() {
    stopTimer();
    gameActive = false;
    updateHome();
    showScreen("home");
  }

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master 🇷🇼 - Knowledge Quiz",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${shareData.text} ${shareData.url}`
      );

      $("homeMessage").textContent = t("copied");
    } catch {
      $("homeMessage").textContent =
        `${shareData.text} ${shareData.url}`;
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => {
        language = button.dataset.language;
        selectedConfirmed = false;
        updateChoiceButtons();
      });
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => {
        category = button.dataset.mode;
        selectedConfirmed = false;
        updateChoiceButtons();
      });
    });

    $("confirmSetupBtn").addEventListener("click", confirmSetup);

    $("startBtn").addEventListener("click", () => {
      if (!selectedConfirmed) {
        $("homeMessage").textContent = t("selectFirst");
        return;
      }

      startRound(currentRound);
    });

    $("continueBtn").addEventListener("click", () => {
      if (!savedGame || savedGame.finished) {
        $("homeMessage").textContent = t("noSavedGame");
        return;
      }

      language = savedGame.language;
      category = savedGame.category;
      selectedConfirmed = true;

      applyTranslations();
      updateHome();
      startRound(savedGame.round, true);
    });

    $("roundsBtn").addEventListener("click", renderRounds);
    $("settingsBtn").addEventListener("click", openSettings);
    $("shareBtn").addEventListener("click", shareQuiz);

    $("nextBtn").addEventListener("click", nextQuestion);

    $("pauseBtn").addEventListener("click", () => {
      if (gameActive) {
        pauseGame();
      } else {
        resumeGame();
      }
    });

    $("exitBtn").addEventListener("click", () => {
      if (gameActive) saveCurrentGame();
      returnHome();
    });

    $("retryBtn").addEventListener("click", () => {
      startRound(currentRound);
    });

    $("nextRoundBtn").addEventListener("click", () => {
      if (currentRound < CONFIG.MAX_ROUNDS &&
          isUnlocked(currentRound + 1)) {
        startRound(currentRound + 1);
      }
    });

    $("resultHomeBtn").addEventListener("click", returnHome);
    $("roundsHomeBtn").addEventListener("click", returnHome);
    $("settingsHomeBtn").addEventListener("click", returnHome);

    $("saveSettingsBtn").addEventListener("click", () => {
      difficulty = $("difficultySelect").value;
      saveSettings();
      $("settingsMessage").textContent = t("saved");
    });

    $("resetProgressBtn").addEventListener("click", () => {
      if (!window.confirm(t("resetConfirm"))) return;

      roundBest = {};
      roundStars = {};
      unlockedRounds = {};
      savedGame = null;
      currentRound = 1;
      score = 0;
      questionIndex = 0;

      saveProgress();
      updateHome();

      $("settingsMessage").textContent = t("resetDone");
    });
  }

  function init() {
    loadSavedData();
    bindEvents();
    applyTranslations();
    updateHome();
    loadQuestions();
  }

  init();
})();
