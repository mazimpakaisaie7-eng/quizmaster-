
(() => {
  "use strict";

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 70,

    STORAGE: {
      language: "quizmasterLanguage",
      mode: "quizmasterMode",
      used: "quizmasterUsedQuestionIds",
      completed: "quizmasterCompletedRounds",
      review: "quizmasterReviewAnswers",
      best: "quizmasterBestScore",
      total: "quizmasterTotalScore",
      progress: "quizmasterProgress"
    }
  };

  const $ = id => document.getElementById(id);

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage error:", error);
    }
  }

  function readNumber(key) {
    return Number(localStorage.getItem(key)) || 0;
  }

  const savedProgress = readStorage(
    CONFIG.STORAGE.progress,
    null
  );

  const state = {
    language: localStorage.getItem(CONFIG.STORAGE.language) || "en",
    mode: localStorage.getItem(CONFIG.STORAGE.mode) || "traffic",

    questions: [],
    roundQuestions: [],

    currentIndex: 0,
    selectedAnswer: null,

    score: 0,
    correct: 0,
    seconds: 0,

    timer: null,
    answered: false,
    paused: false,

    round: 1,
    review: [],
    loaded: false
  };

  const used = readStorage(CONFIG.STORAGE.used, {
    traffic: [],
    general: []
  });

  const completed = readStorage(CONFIG.STORAGE.completed, {
    traffic: [],
    general: []
  });

  const results = readStorage(
    "quizmasterRoundResults",
    {}
  );

  ["traffic", "general"].forEach(mode => {
    if (!Array.isArray(used[mode])) {
      used[mode] = [];
    }

    if (!Array.isArray(completed[mode])) {
      completed[mode] = [];
    }
  });

  // ==========================================
  // BASIC HELPERS
  // ==========================================

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function show(id) {
    const element = $(id);

    if (element) {
      element.classList.remove("hidden");
    }
  }

  function hide(id) {
    const element = $(id);

    if (element) {
      element.classList.add("hidden");
    }
  }

  function on(id, event, callback) {
    const element = $(id);

    if (element) {
      element.addEventListener(event, callback);
    } else {
      console.warn("Missing HTML element:", id);
    }
  }

  function saveProgress() {
    save(CONFIG.STORAGE.progress, {
      mode: state.mode,
      language: state.language,
      round: state.round,
      currentIndex: state.currentIndex,
      score: state.score,
      correct: state.correct,
      answered: state.answered
    });
  }

  function isValidMode(mode) {
    return mode === "traffic" || mode === "general";
  }

  function normalizeLanguage(language) {
    return language === "rw" ? "rw" : "en";
  }

  function shuffle(items) {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [array[i], array[j]] = [
        array[j],
        array[i]
      ];
    }

    return array;
  }

  function showScreen(screenId) {
    const screens = [
      "homeScreen",
      "gameSetup",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ];

    screens.forEach(id => {
      const element = $(id);

      if (element) {
        element.classList.toggle(
          "hidden",
          id !== screenId
        );
      }
    });
  }

  // ==========================================
  // QUESTIONS
  // ==========================================

  function categoryQuestions(mode = state.mode) {
    return state.questions.filter(
      question => question.category === mode
    );
  }

  function getOptions(question, language = state.language) {
    if (
      language === "rw" &&
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      return question.options_rw;
    }

    return Array.isArray(question.options)
      ? question.options
      : [];
  }

  function getCorrectAnswer(question, language = state.language) {
    const options = getOptions(question, language);

    const answer = language === "rw"
      ? (question.answer_rw ?? question.answer)
      : (question.answer ?? question.answer_rw);

    if (typeof answer === "number") {
      return options[answer];
    }

    if (options.includes(answer)) {
      return answer;
    }

    const originalOptions = question.options || [];

    const originalAnswer = language === "rw"
      ? question.answer
      : question.answer_rw;

    if (typeof originalAnswer === "number") {
      return options[originalAnswer];
    }

    const originalIndex = originalOptions.indexOf(
      originalAnswer
    );

    if (
      originalIndex >= 0 &&
      options[originalIndex] !== undefined
    ) {
      return options[originalIndex];
    }

    return answer;
  }

  function getQuestionText(question, field) {
    if (state.language === "rw") {
      return question[field + "_rw"] ||
        question[field] ||
        "";
    }

    return question[field] ||
      question[field + "_rw"] ||
      "";
  }

  function getQuestionId(question) {
    return String(question._quizId);
  }

  function validQuestion(question) {
    if (!question || !isValidMode(question.category)) {
      return false;
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      return false;
    }

    const englishAnswer = getCorrectAnswer(
      question,
      "en"
    );

    if (!question.options.includes(englishAnswer)) {
      return false;
    }

    if (
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      const rwAnswer = getCorrectAnswer(
        question,
        "rw"
      );

      if (!question.options_rw.includes(rwAnswer)) {
        return false;
      }
    }

    return true;
  }

  async function loadQuestions() {
    try {
      setText("homeMessage", "Loading questions...");

      const response = await fetch(
        CONFIG.QUESTIONS_FILE,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          "Could not load questions.json: " +
          response.status
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "questions.json must contain an array."
        );
      }

      state.questions = data
        .map((question, index) => ({
          ...question,

          _quizId: question.id != null
            ? String(question.id)
            : "question-" + index
        }))
        .filter(validQuestion);

      if (!state.questions.length) {
        throw new Error("No valid questions found.");
      }

      state.loaded = true;

      if (
        savedProgress &&
        savedProgress.mode === state.mode
      ) {
        const savedRound = Math.max(
          1,
          Number(savedProgress.round) || 1
        );

        const savedKey =
          `${state.mode}-${savedRound}`;

        state.round = completed[state.mode].includes(
          savedKey
        )
          ? getNextRound(state.mode)
          : savedRound;
      } else {
        state.round = getNextRound(state.mode);
      }

      updateHome();

      setText(
        "homeMessage",
        "Questions loaded successfully!"
      );

      console.log(
        "Valid questions:",
        state.questions.length
      );

      console.log(
        "Traffic questions:",
        categoryQuestions("traffic").length
      );

      console.log(
        "General questions:",
        categoryQuestions("general").length
      );

    } catch (error) {
      console.error(error);

      setText(
        "homeMessage",
        "Error loading questions: " + error.message
      );
    }
  }

  // ==========================================
  // ROUNDS AND UNLOCK SYSTEM
  // ==========================================

  function getTotalRounds(mode = state.mode) {
    const totalQuestions = categoryQuestions(mode).length;

    return Math.ceil(
      totalQuestions / CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getNextRound(mode = state.mode) {
    const totalRounds = getTotalRounds(mode);
    const finished = completed[mode] || [];

    if (totalRounds === 0) {
      return 1;
    }

    for (let round = 1; round <= totalRounds; round++) {
      const key = `${mode}-${round}`;

      if (!finished.includes(key)) {
        return round;
      }
    }

    // All rounds in this cycle are completed.
    // A new cycle starts when the user chooses Next Round.
    return 1;
  }

  function isRoundUnlocked(
    round,
    mode = state.mode
  ) {
    if (round <= 1) {
      return true;
    }

    const finished = completed[mode] || [];

    for (let i = 1; i < round; i++) {
      if (!finished.includes(`${mode}-${i}`)) {
        return false;
      }
    }

    return true;
  }

  function getUnusedQuestions() {
    const all = categoryQuestions();

    if (!all.length) {
      return [];
    }

    const usedIds = new Set(
      used[state.mode].map(String)
    );

    let available = all.filter(
      question => !usedIds.has(getQuestionId(question))
    );

    // Start a new question cycle only after
    // every question in this category was used.
    if (!available.length) {
      used[state.mode] = [];

      save(CONFIG.STORAGE.used, used);

      available = [...all];
    }

    return shuffle(available);
  }

  function prepareRound() {
    if (!state.loaded) {
      setText(
        "homeMessage",
        "Questions are still loading."
      );

      return false;
    }

    if (!isValidMode(state.mode)) {
      setText("homeMessage", "Please select a category.");
      return false;
    }

    if (!isRoundUnlocked(state.round)) {
      setText("homeMessage", "This round is locked.");
      return false;
    }

    const available = getUnusedQuestions();

    if (!available.length) {
      setText("homeMessage", "No questions available.");
      return false;
    }

    state.roundQuestions = available.slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.review = [];
    state.selectedAnswer = null;
    state.answered = false;
    state.paused = false;

    const ids = state.roundQuestions.map(
      getQuestionId
    );

    used[state.mode] = [
      ...new Set([
        ...used[state.mode],
        ...ids
      ])
    ];

    save(CONFIG.STORAGE.used, used);
    saveProgress();

    return true;
  }

  // ==========================================
  // START QUIZ
  // ==========================================

  function openSetup() {
    if ($("gameSetup")) {
      showScreen("gameSetup");
    } else {
      startQuiz();
    }
  }

  function startQuiz() {
    if (!prepareRound()) {
      return;
    }

    showScreen("quizScreen");

    displayQuestion();
  }

  // ==========================================
  // DISPLAY QUESTION
  // ==========================================

  function displayQuestion() {
    stopTimer();

    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answered = false;
    state.paused = false;

    setText("currentRound", state.round);

    setText(
      "currentQuestionNumber",
      `${state.currentIndex + 1}/${state.roundQuestions.length}`
    );

    setText(
      "categoryIndicator",
      state.mode === "traffic"
        ? "Road Safety"
        : "General Knowledge"
    );

    setText(
      "questionText",
      getQuestionText(question, "question")
    );

    // Question image
    const image = $("questionImage");

    if (image) {
      const source =
        question.image ||
        question.image_url ||
        "";

      if (source) {
        image.src = source;

        image.alt = getQuestionText(
          question,
          "question"
        );

        image.classList.remove("hidden");

        image.onerror = () => {
          image.removeAttribute("src");
          image.classList.add("hidden");
        };
      } else {
        image.removeAttribute("src");
        image.classList.add("hidden");
      }
    }

    // Answer options
    const container = $("optionsContainer");

    if (!container) {
      console.error("optionsContainer is missing.");
      return;
    }

    container.innerHTML = "";

    getOptions(question).forEach(option => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-option";
      button.textContent = option;

      button.addEventListener("click", () => {
        if (state.answered) {
          return;
        }

        state.selectedAnswer = option;

        document
          .querySelectorAll(".answer-option")
          .forEach(item => {
            item.classList.remove("selected");
          });

        button.classList.add("selected");

        if ($("submitAnswerBtn")) {
          $("submitAnswerBtn").disabled = false;
        }
      });

      container.appendChild(button);
    });

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
      show("submitAnswerBtn");
    }

    hide("nextQuestionBtn");
    hide("answerFeedback");

    if ($("progressFill")) {
      $("progressFill").style.width =
        `${(state.currentIndex / state.roundQuestions.length) * 100}%`;
    }

    state.seconds = state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;

    setText("timer", state.seconds);

    startTimer();
  }

  // ==========================================
  // TIMER
  // ==========================================

  function startTimer() {
    stopTimer();

    state.timer = setInterval(() => {
      if (state.paused || state.answered) {
        return;
      }

      state.seconds--;

      setText("timer", state.seconds);

      if (state.seconds <= 0) {
        submitAnswer(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  // ==========================================
  // SUBMIT ANSWER
  // ==========================================

  function submitAnswer(timeExpired = false) {
    if (state.answered) {
      return;
    }

    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) {
      return;
    }

    if (
      state.selectedAnswer === null &&
      !timeExpired
    ) {
      return;
    }

    state.answered = true;

    stopTimer();

    const correctAnswer = getCorrectAnswer(question);
    const selected = state.selectedAnswer;

    const isCorrect = selected === correctAnswer;

    if (isCorrect) {
      state.correct++;
      state.score += CONFIG.POINTS_PER_CORRECT;
    }

    const feedback = $("answerFeedback");

    if (feedback) {
      feedback.classList.remove(
        "hidden",
        "good",
        "bad"
      );

      feedback.classList.add(
        isCorrect ? "good" : "bad"
      );

      if (timeExpired && selected === null) {
        feedback.textContent =
          state.language === "rw"
            ? "Igihe kirangiye. Igisubizo: " + correctAnswer
            : "Time is up. Correct answer: " + correctAnswer;
      } else if (isCorrect) {
        feedback.textContent =
          state.language === "rw"
            ? "Ni byo!"
            : "Correct answer!";
      } else {
        feedback.textContent =
          state.language === "rw"
            ? "Si byo. Igisubizo nyacyo: " + correctAnswer
            : "Incorrect. Correct answer: " + correctAnswer;
      }
    }

    document
      .querySelectorAll(".answer-option")
      .forEach(button => {
        button.disabled = true;

        if (button.textContent === correctAnswer) {
          button.classList.add("correct");
        } else if (
          button.textContent === selected
        ) {
          button.classList.add("incorrect");
        }
      });

    state.review.push({
      question: getQuestionText(
        question,
        "question"
      ),

      options: getOptions(question),

      selected: selected ?? "No answer",

      correct: correctAnswer,

      explanation: getQuestionText(
        question,
        "explanation"
      ),

      image: question.image ||
        question.image_url ||
        ""
    });

    hide("submitAnswerBtn");
    show("nextQuestionBtn");

    save(CONFIG.STORAGE.review, state.review);
    saveProgress();
  }

  // ==========================================
  // NEXT QUESTION
  // ==========================================

  function nextQuestion() {
    if (!state.answered) {
      return;
    }

    state.currentIndex++;

    if (
      state.currentIndex >=
      state.roundQuestions.length
    ) {
      finishRound();
    } else {
      displayQuestion();
    }
  }

  // ==========================================
  // FINISH ROUND
  // ==========================================

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;

    if (!total) {
      return;
    }

    const percent = Math.round(
      (state.correct / total) * 100
    );

    const passed =
      percent >= CONFIG.UNLOCK_PERCENT;

    const stars =
      percent >= 90 ? 3 :
      percent >= 70 ? 2 :
      percent >= 50 ? 1 : 0;

    setText(
      "resultScore",
      `${state.correct}/${total}`
    );

    setText(
      "resultPercent",
      `${percent}%`
    );

    setText(
      "resultStars",
      "⭐".repeat(stars)
    );

    setText(
      "resultTitle",
      state.language === "rw"
        ? (passed ? "Watsinze!" : "Round irarangiye!")
        : (passed ? "Congratulations!" : "Round Complete")
    );

    setText(
      "resultMessage",
      state.language === "rw"
        ? (
          passed
            ? "Watsinze! Round ikurikira irafungutse."
            : "Ongera ugerageze kugira ngo ufungure Round ikurikira."
        )
        : (
          passed
            ? "Well done! The next round is unlocked."
            : "Keep practising to unlock the next round."
        )
    );

    const roundKey =
      `${state.mode}-${state.round}`;

    results[roundKey] = {
      score: state.correct,
      total,
      percent,
      passed,
      stars
    };

    if (
      passed &&
      !completed[state.mode].includes(roundKey)
    ) {
      completed[state.mode].push(roundKey);
    }

    save(
      CONFIG.STORAGE.completed,
      completed
    );

    save(
      "quizmasterRoundResults",
      results
    );

    // Best score
    const best = readNumber(
      CONFIG.STORAGE.best
    );

    if (state.score > best) {
      localStorage.setItem(
        CONFIG.STORAGE.best,
        String(state.score)
      );
    }

    // Total score
    const totalScore = readNumber(
      CONFIG.STORAGE.total
    );

    localStorage.setItem(
      CONFIG.STORAGE.total,
      String(totalScore + state.score)
    );

    if ($("resultNextBtn")) {
      $("resultNextBtn").classList.toggle(
        "hidden",
        !passed
      );
    }

    if ($("retryBtn")) {
      $("retryBtn").classList.toggle(
        "hidden",
        passed
      );
    }

    saveProgress();

    showScreen("resultScreen");

    updateHome();
  }

  // ==========================================
  // HOME SCREEN
  // ==========================================

  function updateHome() {
    setText(
      "homeScore",
      localStorage.getItem(
        CONFIG.STORAGE.best
      ) || "0"
    );

    setText(
      "homeRound",
      getNextRound(state.mode)
    );

    const totalStars = Object.values(completed)
      .reduce(
        (sum, list) => sum + list.length,
        0
      );

    setText("homeStars", totalStars);

    const saved = readStorage(
      CONFIG.STORAGE.progress,
      null
    );

    if ($("continueBtn")) {
      $("continueBtn").classList.toggle(
        "hidden",
        !(saved && isValidMode(saved.mode))
      );
    }
  }

  // ==========================================
  // REVIEW ANSWERS
  // ==========================================

  function showReview() {
    stopTimer();

    const container = $("reviewContainer");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const reviews = state.review.length
      ? state.review
      : readStorage(
          CONFIG.STORAGE.review,
          []
        );

    if (!reviews.length) {
      container.textContent =
        state.language === "rw"
          ? "Nta bisubizo byo gusubiramo biraboneka."
          : "There are no answers to review yet.";

      showScreen("reviewScreen");
      return;
    }

    reviews.forEach((item, index) => {
      const card = document.createElement("div");

      card.className = "content-card";

      const heading = document.createElement("h3");

      heading.textContent =
        `${index + 1}. ${item.question}`;

      card.appendChild(heading);

      const selected = document.createElement("p");

      selected.textContent =
        "Your answer: " + item.selected;

      card.appendChild(selected);

      const correct = document.createElement("p");

      correct.textContent =
        "Correct answer: " + item.correct;

      card.appendChild(correct);

      if (item.explanation) {
        const explanation =
          document.createElement("p");

        explanation.textContent =
          item.explanation;

        card.appendChild(explanation);
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");
  }

  // ==========================================
  // ROUNDS SCREEN
  // ==========================================

  function showRounds() {
    const list = $("roundList");

    if (!list) {
      console.error(
        "HTML element roundList is missing."
      );

      return;
    }

    list.innerHTML = "";

    const all = categoryQuestions(state.mode);

    const totalRounds = Math.ceil(
      all.length / CONFIG.QUESTIONS_PER_ROUND
    );

    const finished = completed[state.mode] || [];

    const completedCount = finished.length;

    let unlockedCount = 0;

    for (
      let round = 1;
      round <= totalRounds;
      round++
    ) {
      if (isRoundUnlocked(round)) {
        unlockedCount++;
      }
    }

    // These three IDs are included in the updated index.html.
    setText("roundsCompleted", completedCount);
    setText("roundsTotal", totalRounds);
    setText("roundsUnlocked", unlockedCount);

    setText(
      "roundsDescription",
      `${completedCount} / ${totalRounds} completed rounds`
    );

    if (totalRounds === 0) {
      list.textContent =
        state.language === "rw"
          ? "Nta bibazo biboneka muri iyi category."
          : "No rounds available in this category.";

      showScreen("roundsScreen");
      return;
    }

    for (
      let round = 1;
      round <= totalRounds;
      round++
    ) {
      const key = `${state.mode}-${round}`;

      const isCompleted =
        finished.includes(key);

      const unlocked =
        isRoundUnlocked(round);

      const item =
        document.createElement("div");

      item.className =
        "content-card round-card";

      const heading =
        document.createElement("h3");

      heading.textContent =
        `Round ${round}`;

      item.appendChild(heading);

      const status =
        document.createElement("p");

      if (isCompleted) {
        const result = results[key];

        status.textContent = result
          ? `⭐ ${result.stars} | ${result.score}/${result.total} | ${result.percent}% | Completed`
          : "Completed";

        status.className = "feedback good";

      } else if (unlocked) {
        status.textContent =
          "🔓 Unlocked - Ready to play";

        status.className = "feedback good";

      } else {
        status.textContent =
          "🔒 Locked - Complete the previous round";

        status.className = "feedback";
      }

      item.appendChild(status);

      if (!isCompleted && unlocked) {
        const button =
          document.createElement("button");

        button.type = "button";

        button.textContent =
          "Play Round " + round;

        button.addEventListener("click", () => {
          state.round = round;

          saveProgress();

          startQuiz();
        });

        item.appendChild(button);
      }

      list.appendChild(item);
    }

    // Allow the user to start a new cycle
    // after completing every round in this category.
    if (completedCount >= totalRounds) {
      const newCycleButton =
        document.createElement("button");

      newCycleButton.type = "button";

      newCycleButton.textContent =
        state.language === "rw"
          ? "Tangira cycle nshya"
          : "Start New Cycle";

      newCycleButton.addEventListener("click", () => {
        resetCategoryCycle();

        state.round = 1;

        saveProgress();

        startQuiz();
      });

      list.appendChild(newCycleButton);
    }

    showScreen("roundsScreen");
  }

  // ==========================================
  // RESET CATEGORY CYCLE
  // ==========================================

  function resetCategoryCycle() {
    used[state.mode] = [];
    completed[state.mode] = [];

    Object.keys(results).forEach(key => {
      if (key.startsWith(state.mode + "-")) {
        delete results[key];
      }
    });

    save(CONFIG.STORAGE.used, used);

    save(CONFIG.STORAGE.completed, completed);

    save(
      "quizmasterRoundResults",
      results
    );
  }

  // ==========================================
  // NEXT ROUND
  // ==========================================

  function nextRound() {
    const currentKey =
      `${state.mode}-${state.round}`;

    if (
      !completed[state.mode].includes(currentKey)
    ) {
      return;
    }

    const totalRounds =
      getTotalRounds(state.mode);

    if (state.round >= totalRounds) {
      // All rounds completed: begin a new cycle.
      resetCategoryCycle();

      state.round = 1;

    } else {
      state.round = getNextRound(state.mode);
    }

    saveProgress();

    updateHome();

    startQuiz();
  }

  // ==========================================
  // RETRY ROUND
  // ==========================================

  function retryRound() {
    stopTimer();

    startQuiz();
  }

  // ==========================================
  // CONTINUE QUIZ
  // ==========================================

  function continueQuiz() {
    const saved = readStorage(
      CONFIG.STORAGE.progress,
      null
    );

    if (!saved || !isValidMode(saved.mode)) {
      startQuiz();
      return;
    }

    state.mode = saved.mode;

    state.language = normalizeLanguage(
      saved.language
    );

    const savedRound = Math.max(
      1,
      Number(saved.round) || 1
    );

    const savedKey =
      `${state.mode}-${savedRound}`;

    state.round =
      completed[state.mode].includes(savedKey)
        ? getNextRound(state.mode)
        : savedRound;

    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    updateSelectionSummary();

    startQuiz();
  }

  // ==========================================
  // LANGUAGE SELECTION
  // ==========================================

  function selectLanguage(button) {
    document
      .querySelectorAll("[data-language]")
      .forEach(item => {
        item.classList.remove("selected");

        item.setAttribute(
          "aria-pressed",
          "false"
        );
      });

    button.classList.add("selected");

    button.setAttribute(
      "aria-pressed",
      "true"
    );

    state.language = normalizeLanguage(
      button.dataset.language
    );

    updateSelectionSummary();
  }

  // ==========================================
  // CATEGORY SELECTION
  // ==========================================

  function selectMode(button) {
    if (!isValidMode(button.dataset.mode)) {
      return;
    }

    document
      .querySelectorAll("[data-mode]")
      .forEach(item => {
        item.classList.remove("selected");

        item.setAttribute(
          "aria-pressed",
          "false"
        );
      });

    button.classList.add("selected");

    button.setAttribute(
      "aria-pressed",
      "true"
    );

    state.mode = button.dataset.mode;

    state.round = getNextRound(state.mode);

    updateSelectionSummary();

    updateHome();
  }

  function updateSelectionSummary() {
    setText(
      "selectionSummary",

      `${state.language === "rw" ? "Ikinyarwanda" : "English"} · ` +
      `${state.mode === "traffic" ? "Road Safety" : "General Knowledge"}`
    );
  }

  // ==========================================
  // CONFIRM SETUP
  // ==========================================

  function confirmSetup() {
    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    state.round = getNextRound(state.mode);

    updateSelectionSummary();

    updateHome();

    startQuiz();
  }

  // ==========================================
  // SETTINGS
  // ==========================================

  function saveSettings() {
    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) {
      state.language = normalizeLanguage(
        language.value
      );
    }

    if (
      mode &&
      isValidMode(mode.value)
    ) {
      state.mode = mode.value;
    }

    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    state.round = getNextRound(state.mode);

    updateSelectionSummary();

    updateHome();

    setText(
      "settingsMessage",
      "Settings saved successfully."
    );

    showScreen("homeScreen");
  }

  // ==========================================
  // RESET ALL PROGRESS
  // ==========================================

  function resetProgress() {
    const confirmed = confirm(
      "Are you sure you want to reset all quiz progress?"
    );

    if (!confirmed) {
      return;
    }

    Object.values(CONFIG.STORAGE).forEach(key => {
      if (
        key !== CONFIG.STORAGE.language &&
        key !== CONFIG.STORAGE.mode
      ) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem(
      "quizmasterRoundResults"
    );

    used.traffic = [];
    used.general = [];

    completed.traffic = [];
    completed.general = [];

    Object.keys(results).forEach(key => {
      delete results[key];
    });

    save(CONFIG.STORAGE.used, used);

    save(CONFIG.STORAGE.completed, completed);

    state.round = 1;
    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.review = [];
    state.roundQuestions = [];

    stopTimer();

    updateHome();

    showScreen("homeScreen");
  }

  // ==========================================
  // SHARE
  // ==========================================

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master Rwanda",

      text: "Test your knowledge with Quiz Master!",

      url: location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          shareData.text + " " + shareData.url
        );

        alert("✅ Link Copied!");
      }

    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          shareData.text + " " + shareData.url
        );

        alert("✅ Link Copied!");

      } catch {
        alert("Unable to share this link.");
      }
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  function bindEvents() {
    document
      .querySelectorAll("[data-language]")
      .forEach(button => {
        button.addEventListener("click", () => {
          selectLanguage(button);
        });
      });

    document
      .querySelectorAll("[data-mode]")
      .forEach(button => {
        button.addEventListener("click", () => {
          selectMode(button);
        });
      });

    on("startBtn", "click", openSetup);

    on("confirmSetupBtn", "click", confirmSetup);

    on("continueBtn", "click", continueQuiz);

    on("submitAnswerBtn", "click", () => {
      submitAnswer(false);
    });

    on("nextQuestionBtn", "click", nextQuestion);

    on("quizReviewBtn", "click", showReview);

    on("resultReviewBtn", "click", showReview);

    on("reviewAnswersBtn", "click", showReview);

    on("quizHomeBtn", "click", () => {
      stopTimer();
      showScreen("homeScreen");
    });

    on("resultHomeBtn", "click", () => {
      showScreen("homeScreen");
    });

    on("reviewHomeBtn", "click", () => {
      showScreen("homeScreen");
    });

    on("roundsBtn", "click", showRounds);

    on("roundsHomeBtn", "click", () => {
      showScreen("homeScreen");
    });

    on("settingsBtn", "click", () => {
      if ($("settingsLanguage")) {
        $("settingsLanguage").value =
          state.language;
      }

      if ($("settingsMode")) {
        $("settingsMode").value =
          state.mode;
      }

      showScreen("settingsScreen");
    });

    on("saveSettingsBtn", "click", saveSettings);

    on("settingsHomeBtn", "click", () => {
      showScreen("homeScreen");
    });

    on("resetProgressBtn", "click", resetProgress);

    on("shareBtn", "click", shareQuiz);

    on("resultNextBtn", "click", nextRound);

    on("retryBtn", "click", retryRound);
  }

  // ==========================================
  // INITIALIZE APP
  // ==========================================

  function initialize() {
    bindEvents();

    document
      .querySelectorAll("[data-language]")
      .forEach(button => {
        const selected =
          button.dataset.language === state.language;

        button.classList.toggle(
          "selected",
          selected
        );

        button.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });

    document
      .querySelectorAll("[data-mode]")
      .forEach(button => {
        const selected =
          button.dataset.mode === state.mode;

        button.classList.toggle(
          "selected",
          selected
        );

        button.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });

    updateSelectionSummary();

    updateHome();

    loadQuestions();
  }

  initialize();

})();
