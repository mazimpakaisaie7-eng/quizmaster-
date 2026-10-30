
(() => {
  "use strict";

  // ==========================================
  // QUIZ MASTER RWANDA - COMPLETE GAME ENGINE
  // ==========================================

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

  // ==========================================
  // STORAGE
  // ==========================================

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

  // ==========================================
  // GAME STATE
  // ==========================================

  const savedProgress = readStorage(
    CONFIG.STORAGE.progress,
    null
  );

  const state = {
    language:
      localStorage.getItem(CONFIG.STORAGE.language) || "en",

    mode:
      localStorage.getItem(CONFIG.STORAGE.mode) || "traffic",

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

    musicOn: false,

    loaded: false
  };

  const used = readStorage(
    CONFIG.STORAGE.used,
    {
      traffic: [],
      general: []
    }
  );

  const completed = readStorage(
    CONFIG.STORAGE.completed,
    {
      traffic: [],
      general: []
    }
  );

  // Repair old or invalid storage structures.
  ["traffic", "general"].forEach(mode => {
    if (!Array.isArray(used[mode])) {
      used[mode] = [];
    }

    if (!Array.isArray(completed[mode])) {
      completed[mode] = [];
    }
  });

  // ==========================================
  // HELPERS
  // ==========================================

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

  function isValidMode(mode) {
    return mode === "traffic" || mode === "general";
  }

  function normalizeLanguage(language) {
    return language === "rw" ? "rw" : "en";
  }

  // ==========================================
  // LANGUAGE SUPPORT
  // ==========================================

  function getOptions(question, language = state.language) {
    if (
      language === "rw" &&
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      return question.options_rw;
    }

    return question.options || [];
  }

  function getCorrectAnswer(
    question,
    language = state.language
  ) {
    const options = getOptions(question, language);

    let answer =
      language === "rw"
        ? (question.answer_rw ?? question.answer)
        : (question.answer ?? question.answer_rw);

    // Numeric answers represent option positions.
    if (typeof answer === "number") {
      return options[answer];
    }

    // Direct answer match.
    if (options.includes(answer)) {
      return answer;
    }

    // Map the answer from the other language
    // using the original option position.
    const originalOptions = question.options || [];
    const originalAnswer =
      language === "rw"
        ? question.answer
        : question.answer_rw;

    if (
      typeof originalAnswer === "number" &&
      options[originalAnswer] !== undefined
    ) {
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

  // ==========================================
  // QUESTION VALIDATION
  // ==========================================

  function validQuestion(question) {
    if (!question) return false;

    if (
      !["traffic", "general"].includes(question.category)
    ) {
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

  // ==========================================
  // LOAD QUESTIONS
  // ==========================================

  async function loadQuestions() {
    try {
      setText(
        "homeMessage",
        "Loading questions..."
      );

      const response = await fetch(
        CONFIG.QUESTIONS_FILE,
        {
          cache: "no-store"
        }
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

      // Give questions without IDs a stable ID
      // based on their original JSON position.
      const prepared = data.map((question, index) => ({
        ...question,

        _quizId:
          question.id !== undefined &&
          question.id !== null
            ? String(question.id)
            : "question-" + index
      }));

      state.questions = prepared.filter(validQuestion);

      if (!state.questions.length) {
        throw new Error(
          "No valid questions found. Check questions.json."
        );
      }

      state.loaded = true;

      // Restore saved round only when it belongs
      // to the currently selected category.
      if (
        savedProgress &&
        savedProgress.mode === state.mode
      ) {
        state.round = Math.max(
          1,
          Number(savedProgress.round) || 1
        );
      } else {
        state.round = getNextRound(state.mode);
      }

      updateHome();

      setText(
        "homeMessage",
        "Questions loaded successfully!"
      );

      console.log(
        "Quiz Master loaded:",
        state.questions.length,
        "valid questions."
      );

    } catch (error) {
      console.error("Question loading error:", error);

      setText(
        "homeMessage",
        "Error loading questions: " + error.message
      );
    }
  }

  // ==========================================
  // ROUND MANAGEMENT
  // ==========================================

  function categoryQuestions(mode = state.mode) {
    return state.questions.filter(
      question => question.category === mode
    );
  }

  function getNextRound(mode = state.mode) {
    const finished = completed[mode] || [];

    let round = 1;

    while (
      finished.includes(`${mode}-${round}`)
    ) {
      round++;
    }

    return round;
  }

  function isRoundUnlocked(round, mode = state.mode) {
    if (round <= 1) return true;

    for (let i = 1; i < round; i++) {
      if (
        !completed[mode].includes(
          `${mode}-${i}`
        )
      ) {
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // NO-REPEAT QUESTION SYSTEM
  // ==========================================

  function getUnusedQuestions() {
    const all = categoryQuestions();

    if (!all.length) {
      return [];
    }

    const usedIds = new Set(
      used[state.mode].map(String)
    );

    let available = all.filter(
      question =>
        !usedIds.has(getQuestionId(question))
    );

    // Reset the cycle ONLY when every question
    // in this category has already been used.
    if (available.length === 0) {
      used[state.mode] = [];

      save(
        CONFIG.STORAGE.used,
        used
      );

      available = [...all];
    }

    return shuffle(available);
  }

  function prepareRound() {
    if (!state.loaded) {
      setText(
        "homeMessage",
        "Questions are still loading. Please wait."
      );

      return false;
    }

    if (!isRoundUnlocked(state.round)) {
      state.round = getNextRound(state.mode);
    }

    const available = getUnusedQuestions();

    if (!available.length) {
      setText(
        "homeMessage",
        "No questions available in this category."
      );

      return false;
    }

    // A round contains 10 questions.
    // If fewer questions remain in the current cycle,
    // use those remaining questions without repeating.
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

    // Reserve these questions for this round.
    const newIds = state.roundQuestions.map(
      getQuestionId
    );

    used[state.mode] = [
      ...new Set([
        ...used[state.mode],
        ...newIds
      ])
    ];

    save(
      CONFIG.STORAGE.used,
      used
    );

    saveProgress();

    return true;
  }

  // ==========================================
  // START QUIZ
  // ==========================================

  function startQuiz() {
    if (!state.loaded) {
      setText(
        "homeMessage",
        "Questions are still loading. Try again."
      );

      return;
    }

    if (!prepareRound()) {
      return;
    }

    showScreen("quizScreen");

    displayQuestion();
  }

  // ==========================================
  // SCREEN MANAGEMENT
  // ==========================================

  function showScreen(screenId) {
    const screens = [
      "homeScreen",
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

    setText(
      "currentRound",
      state.round
    );

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

    // QUESTION IMAGE

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

    // ANSWER OPTIONS

    const options = getOptions(question);

    const container = $("optionsContainer");

    if (!container) return;

    container.innerHTML = "";

    options.forEach(option => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-option";
      button.textContent = option;

      button.addEventListener("click", () => {
        if (state.answered) return;

        state.selectedAnswer = option;

        document.querySelectorAll(
          ".answer-option"
        ).forEach(item => {
          item.classList.remove("selected");
        });

        button.classList.add("selected");

        const submit = $("submitAnswerBtn");

        if (submit) {
          submit.disabled = false;
        }
      });

      container.appendChild(button);
    });

    const submit = $("submitAnswerBtn");

    if (submit) {
      submit.disabled = true;
      submit.classList.remove("hidden");
    }

    hide("nextQuestionBtn");
    hide("answerFeedback");

    const progress = $("progressFill");

    if (progress) {
      progress.style.width =
        `${(state.currentIndex / state.roundQuestions.length) * 100}%`;
    }

    state.seconds =
      state.mode === "traffic"
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

      setText(
        "timer",
        state.seconds
      );

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
    if (state.answered) return;

    const question =
      state.roundQuestions[state.currentIndex];

    if (!question) return;

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

    const isCorrect =
      selected === correctAnswer;

    if (isCorrect) {
      state.correct++;

      state.score += CONFIG.POINTS_PER_CORRECT;
    }

    // FEEDBACK

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
            ? "Igihe kirangiye. Igisubizo nyacyo: " + correctAnswer
            : "Time is up. Correct answer: " + correctAnswer;

      } else {
        feedback.textContent = isCorrect
          ? (
              state.language === "rw"
                ? "Ni byo! Igisubizo ni cyo."
                : "Correct answer!"
            )
          : (
              state.language === "rw"
                ? "Si byo. Igisubizo nyacyo: " + correctAnswer
                : "Incorrect. Correct answer: " + correctAnswer
            );
      }
    }

    // DISABLE OPTIONS

    document.querySelectorAll(
      ".answer-option"
    ).forEach(button => {
      button.disabled = true;

      if (button.textContent === correctAnswer) {
        button.classList.add("correct");

      } else if (
        button.textContent === selected
      ) {
        button.classList.add("incorrect");
      }
    });

    // REVIEW DATA

    state.review.push({
      question: getQuestionText(question, "question"),

      options: getOptions(question),

      selected: selected ?? "No answer",

      correct: correctAnswer,

      explanation: getQuestionText(
        question,
        "explanation"
      ),

      image:
        question.image ||
        question.image_url ||
        ""
    });

    hide("submitAnswerBtn");

    show("nextQuestionBtn");

    save(
      CONFIG.STORAGE.review,
      state.review
    );

    saveProgress();
  }

  // ==========================================
  // NEXT QUESTION
  // ==========================================

  function nextQuestion() {
    if (!state.answered) return;

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

    if (!total) return;

    const percent = Math.round(
      (state.correct / total) * 100
    );

    const passed =
      percent >= CONFIG.UNLOCK_PERCENT;

    const stars =
      percent >= 90 ? 3 :
      percent >= 70 ? 2 :
      percent >= 50 ? 1 : 0;

    // RESULT DISPLAY

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
      passed
        ? (
            state.language === "rw"
              ? "Watsinze! Round ikurikira irafungutse."
              : "Well done! The next round is unlocked."
          )
        : (
            state.language === "rw"
              ? "Ongera ugerageze kugira ngo ufungure Round ikurikira."
              : "Keep practising to unlock the next round."
          )
    );

    // ONLY MARK A ROUND COMPLETED
    // WHEN THE PLAYER REACHES 70%.

    const roundKey =
      `${state.mode}-${state.round}`;

    if (passed) {
      if (
        !completed[state.mode].includes(roundKey)
      ) {
        completed[state.mode].push(roundKey);
      }

      save(
        CONFIG.STORAGE.completed,
        completed
      );
    }

    // BEST SCORE

    const best = readNumber(
      CONFIG.STORAGE.best
    );

    if (state.score > best) {
      localStorage.setItem(
        CONFIG.STORAGE.best,
        String(state.score)
      );
    }

    // TOTAL SCORE

    const totalScore = readNumber(
      CONFIG.STORAGE.total
    );

    localStorage.setItem(
      CONFIG.STORAGE.total,
      String(totalScore + state.score)
    );

    // NEXT ROUND BUTTON

    const nextButton = $("resultNextBtn");

    if (nextButton) {
      nextButton.classList.toggle(
        "hidden",
        !passed
      );
    }

    // RETRY BUTTON

    const retry = $("retryBtn");

    if (retry) {
      retry.classList.toggle(
        "hidden",
        passed
      );
    }

    // Save finished round state.

    saveProgress();

    showScreen("resultScreen");

    updateHome();

    console.log(
      "Round finished:",
      state.round,
      "Score:",
      percent + "%",
      "Passed:",
      passed
    );
  }

  // ==========================================
  // PROGRESS
  // ==========================================

  function saveProgress() {
    save(
      CONFIG.STORAGE.progress,
      {
        mode: state.mode,

        language: state.language,

        round: state.round,

        currentIndex: state.currentIndex,

        score: state.score,

        correct: state.correct,

        completed: state.answered
      }
    );
  }

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

    const totalStars = Object.values(
      completed
    ).reduce(
      (sum, list) => sum + list.length,
      0
    );

    setText(
      "homeStars",
      totalStars
    );

    const saved = readStorage(
      CONFIG.STORAGE.progress,
      null
    );

    const canContinue =
      saved &&
      isValidMode(saved.mode);

    const continueButton = $("continueBtn");

    if (continueButton) {
      continueButton.classList.toggle(
        "hidden",
        !canContinue
      );
    }
  }

  // ==========================================
  // REVIEW ANSWERS
  // ==========================================

  function showReview() {
    stopTimer();

    const container = $("reviewContainer");

    if (!container) return;

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
    }

    reviews.forEach((item, index) => {
      const card = document.createElement("div");

      card.className = "content-card";

      const heading = document.createElement("h3");

      heading.textContent =
        `${index + 1}. ${item.question}`;

      card.appendChild(heading);

      if (item.image) {
        const image = document.createElement("img");

        image.src = item.image;

        image.alt = "Question image";

        image.className = "question-image";

        image.onerror = () => image.remove();

        card.appendChild(image);
      }

      const selected = document.createElement("p");

      selected.textContent =
        "Your answer: " + item.selected;

      card.appendChild(selected);

      const correct = document.createElement("p");

      correct.textContent =
        "Correct answer: " + item.correct;

      card.appendChild(correct);

      if (item.explanation) {
        const explanation = document.createElement("p");

        explanation.textContent =
          item.explanation;

        card.appendChild(explanation);
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");
  }

  // ==========================================
  // ROUNDS LIST
  // ==========================================

  function showRounds() {
    const list = $("roundList");

    if (!list) return;

    list.innerHTML = "";

    const rounds = completed[state.mode] || [];

    setText(
      "roundsDescription",
      `${rounds.length} completed rounds in this category.`
    );

    if (!rounds.length) {
      list.textContent = "No completed rounds yet.";

    } else {
      rounds.forEach(round => {
        const item = document.createElement("div");

        item.className = "feedback good";

        item.textContent = round;

        list.appendChild(item);
      });
    }

    showScreen("roundsScreen");
  }

  // ==========================================
  // CONTINUE QUIZ
  // ==========================================

  function continueQuiz() {
    const saved = readStorage(
      CONFIG.STORAGE.progress,
      null
    );

    if (
      !saved ||
      !isValidMode(saved.mode)
    ) {
      startQuiz();
      return;
    }

    state.mode = saved.mode;

    state.language = normalizeLanguage(
      saved.language
    );

    // Continue from the next unlocked round
    // if the saved round has already been completed.
    if (
      completed[state.mode].includes(
        `${state.mode}-${saved.round}`
      )
    ) {
      state.round = getNextRound(state.mode);

    } else {
      state.round = Math.max(
        1,
        Number(saved.round) || 1
      );
    }

    localStorage.setItem(
      CONFIG.STORAGE.language,
      state.language
    );

    localStorage.setItem(
      CONFIG.STORAGE.mode,
      state.mode
    );

    startQuiz();
  }

  // ==========================================
  // LANGUAGE SELECTION
  // ==========================================

  function selectLanguage(button) {
    document.querySelectorAll(
      "[data-language]"
    ).forEach(item => {
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
    document.querySelectorAll(
      "[data-mode]"
    ).forEach(item => {
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

  // ==========================================
  // SELECTION SUMMARY
  // ==========================================

  function updateSelectionSummary() {
    setText(
      "selectionSummary",
      `${state.language === "rw" ? "Ikinyarwanda" : "English"} · ` +
      `${state.mode === "traffic" ? "Road Safety" : "General Knowledge"}`
    );
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

    if (mode && isValidMode(mode.value)) {
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
  // RESET PROGRESS
  // ==========================================

  function resetProgress() {
    const confirmed = confirm(
      "Are you sure you want to reset all quiz progress?"
    );

    if (!confirmed) return;

    Object.values(CONFIG.STORAGE).forEach(key => {
      if (
        key !== CONFIG.STORAGE.language &&
        key !== CONFIG.STORAGE.mode
      ) {
        localStorage.removeItem(key);
      }
    });

    used.traffic = [];
    used.general = [];

    completed.traffic = [];
    completed.general = [];

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
  // SHARE QUIZ
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
  // NEXT ROUND - IMPORTANT FIX
  // ==========================================

  function nextRound() {
    const currentKey =
      `${state.mode}-${state.round}`;

    // Never advance if the previous round
    // has not been unlocked.
    if (!completed[state.mode].includes(currentKey)) {
      console.warn(
        "This round has not been completed successfully."
      );

      return;
    }

    state.round++;

    // Verify sequential unlocking.
    if (!isRoundUnlocked(state.round)) {
      state.round = getNextRound(state.mode);
    }

    saveProgress();

    updateHome();

    // Start the next round immediately.
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
  // EVENT LISTENERS
  // ==========================================

  function bindEvents() {

    document.querySelectorAll(
      "[data-language]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => selectLanguage(button)
      );
    });

    document.querySelectorAll(
      "[data-mode]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => selectMode(button)
      );
    });

    on(
      "confirmSetupBtn",
      "click",
      () => {
        localStorage.setItem(
          CONFIG.STORAGE.language,
          state.language
        );

        localStorage.setItem(
          CONFIG.STORAGE.mode,
          state.mode
        );

        updateHome();

        setText(
          "homeMessage",
          "Selection saved. You can start the quiz."
        );
      }
    );

    on("startBtn", "click", startQuiz);

    on("continueBtn", "click", continueQuiz);

    on(
      "submitAnswerBtn",
      "click",
      () => submitAnswer(false)
    );

    on(
      "nextQuestionBtn",
      "click",
      nextQuestion
    );

    on("quizReviewBtn", "click", showReview);

    on("resultReviewBtn", "click", showReview);

    on("reviewAnswersBtn", "click", showReview);

    on(
      "quizHomeBtn",
      "click",
      () => {
        stopTimer();

        showScreen("homeScreen");
      }
    );

    on(
      "resultHomeBtn",
      "click",
      () => showScreen("homeScreen")
    );

    on(
      "reviewHomeBtn",
      "click",
      () => showScreen("homeScreen")
    );

    on("roundsBtn", "click", showRounds);

    on(
      "roundsHomeBtn",
      "click",
      () => showScreen("homeScreen")
    );

    on(
      "settingsBtn",
      "click",
      () => {
        const language = $("settingsLanguage");

        const mode = $("settingsMode");

        if (language) {
          language.value = state.language;
        }

        if (mode) {
          mode.value = state.mode;
        }

        showScreen("settingsScreen");
      }
    );

    on(
      "saveSettingsBtn",
      "click",
      saveSettings
    );

    on(
      "settingsHomeBtn",
      "click",
      () => showScreen("homeScreen")
    );

    on(
      "resetProgressBtn",
      "click",
      resetProgress
    );

    on("shareBtn", "click", shareQuiz);

    // THIS IS THE MAIN ROUND PROGRESSION FIX.
    on(
      "resultNextBtn",
      "click",
      nextRound
    );

    on(
      "retryBtn",
      "click",
      retryRound
    );
  }

  // ==========================================
  // INITIALIZE
  // ==========================================

  function initialize() {
    bindEvents();

    document.querySelectorAll(
      "[data-language]"
    ).forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.language === state.language
      );

      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.language === state.language
        )
      );
    });

    document.querySelectorAll(
      "[data-mode]"
    ).forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.mode === state.mode
      );

      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.mode === state.mode
        )
      );
    });

    updateSelectionSummary();

    updateHome();

    loadQuestions();
  }

  initialize();

})();
