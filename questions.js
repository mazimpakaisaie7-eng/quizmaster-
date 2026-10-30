
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
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  }

  function readNumber(key) {
    return Number(localStorage.getItem(key)) || 0;
  }

  const savedProgress = readStorage(CONFIG.STORAGE.progress, null);

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

  const results = readStorage("quizmasterRoundResults", {});

  ["traffic", "general"].forEach(mode => {
    if (!Array.isArray(used[mode])) used[mode] = [];
    if (!Array.isArray(completed[mode])) completed[mode] = [];
  });

  function shuffle(items) {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  function setText(id, value) {
    if ($(id)) $(id).textContent = value;
  }

  function show(id) {
    if ($(id)) $(id).classList.remove("hidden");
  }

  function hide(id) {
    if ($(id)) $(id).classList.add("hidden");
  }

  function on(id, event, callback) {
    if ($(id)) {
      $(id).addEventListener(event, callback);
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

  function getCorrectAnswer(question, language = state.language) {
    const options = getOptions(question, language);

    const answer = language === "rw"
      ? (question.answer_rw ?? question.answer)
      : (question.answer ?? question.answer_rw);

    if (typeof answer === "number") return options[answer];

    if (options.includes(answer)) return answer;

    const originalOptions = question.options || [];

    const originalAnswer = language === "rw"
      ? question.answer
      : question.answer_rw;

    if (
      typeof originalAnswer === "number" &&
      options[originalAnswer] !== undefined
    ) {
      return options[originalAnswer];
    }

    const index = originalOptions.indexOf(originalAnswer);

    if (index >= 0 && options[index] !== undefined) {
      return options[index];
    }

    return answer;
  }

  function getQuestionText(question, field) {
    if (state.language === "rw") {
      return question[field + "_rw"] || question[field] || "";
    }

    return question[field] || question[field + "_rw"] || "";
  }

  function getQuestionId(question) {
    return String(question._quizId);
  }

  function validQuestion(question) {
    if (!question || !isValidMode(question.category)) return false;

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return false;
    }

    const answer = getCorrectAnswer(question, "en");

    if (!question.options.includes(answer)) return false;

    if (
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      const rwAnswer = getCorrectAnswer(question, "rw");

      if (!question.options_rw.includes(rwAnswer)) return false;
    }

    return true;
  }

  async function loadQuestions() {
    try {
      setText("homeMessage", "Loading questions...");

      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load questions.json: " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain an array.");
      }

      state.questions = data.map((question, index) => ({
        ...question,
        _quizId: question.id != null
          ? String(question.id)
          : "question-" + index
      })).filter(validQuestion);

      if (!state.questions.length) {
        throw new Error("No valid questions found.");
      }

      state.loaded = true;

      if (savedProgress && savedProgress.mode === state.mode) {
        state.round = Math.max(1, Number(savedProgress.round) || 1);
      } else {
        state.round = getNextRound();
      }

      updateHome();
      setText("homeMessage", "Questions loaded successfully!");

      console.log("Valid questions:", state.questions.length);

    } catch (error) {
      console.error(error);
      setText("homeMessage", "Error loading questions: " + error.message);
    }
  }

  function categoryQuestions(mode = state.mode) {
    return state.questions.filter(q => q.category === mode);
  }

  function getNextRound(mode = state.mode) {
    let round = 1;

    while ((completed[mode] || []).includes(`${mode}-${round}`)) {
      round++;
    }

    return round;
  }

  function isRoundUnlocked(round, mode = state.mode) {
    if (round <= 1) return true;

    for (let i = 1; i < round; i++) {
      if (!(completed[mode] || []).includes(`${mode}-${i}`)) {
        return false;
      }
    }

    return true;
  }

  function getUnusedQuestions() {
    const all = categoryQuestions();

    if (!all.length) return [];

    const usedIds = new Set(used[state.mode].map(String));

    let available = all.filter(q => !usedIds.has(getQuestionId(q)));

    if (!available.length) {
      used[state.mode] = [];
      save(CONFIG.STORAGE.used, used);
      available = [...all];
    }

    return shuffle(available);
  }

  function prepareRound() {
    if (!state.loaded) {
      setText("homeMessage", "Questions are still loading.");
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

    state.roundQuestions = available.slice(0, CONFIG.QUESTIONS_PER_ROUND);

    state.currentIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.review = [];
    state.selectedAnswer = null;
    state.answered = false;

    const ids = state.roundQuestions.map(getQuestionId);

    used[state.mode] = [...new Set([...used[state.mode], ...ids])];

    save(CONFIG.STORAGE.used, used);
    saveProgress();

    return true;
  }

  function startQuiz() {
    if (!prepareRound()) return;

    showScreen("quizScreen");
    displayQuestion();
  }

  function showScreen(screenId) {
    [
      "homeScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ].forEach(id => {
      if ($(id)) {
        $(id).classList.toggle("hidden", id !== screenId);
      }
    });
  }

  function displayQuestion() {
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];

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
      state.mode === "traffic" ? "Road Safety" : "General Knowledge"
    );

    setText("questionText", getQuestionText(question, "question"));

    const image = $("questionImage");

    if (image) {
      const source = question.image || question.image_url || "";

      if (source) {
        image.src = source;
        image.alt = getQuestionText(question, "question");
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

    const container = $("optionsContainer");

    if (!container) return;

    container.innerHTML = "";

    getOptions(question).forEach(option => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-option";
      button.textContent = option;

      button.addEventListener("click", () => {
        if (state.answered) return;

        state.selectedAnswer = option;

        document.querySelectorAll(".answer-option").forEach(item => {
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

  function startTimer() {
    stopTimer();

    state.timer = setInterval(() => {
      if (state.paused || state.answered) return;

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

  function submitAnswer(timeExpired = false) {
    if (state.answered) return;

    const question = state.roundQuestions[state.currentIndex];

    if (!question) return;

    if (state.selectedAnswer === null && !timeExpired) return;

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
      feedback.classList.remove("hidden", "good", "bad");
      feedback.classList.add(isCorrect ? "good" : "bad");

      feedback.textContent = timeExpired && selected === null
        ? (state.language === "rw"
          ? "Igihe kirangiye. Igisubizo: " + correctAnswer
          : "Time is up. Correct answer: " + correctAnswer)
        : isCorrect
          ? (state.language === "rw" ? "Ni byo!" : "Correct answer!")
          : (state.language === "rw"
            ? "Si byo. Igisubizo nyacyo: " + correctAnswer
            : "Incorrect. Correct answer: " + correctAnswer);
    }

    document.querySelectorAll(".answer-option").forEach(button => {
      button.disabled = true;

      if (button.textContent === correctAnswer) {
        button.classList.add("correct");
      } else if (button.textContent === selected) {
        button.classList.add("incorrect");
      }
    });

    state.review.push({
      question: getQuestionText(question, "question"),
      options: getOptions(question),
      selected: selected ?? "No answer",
      correct: correctAnswer,
      explanation: getQuestionText(question, "explanation"),
      image: question.image || question.image_url || ""
    });

    hide("submitAnswerBtn");
    show("nextQuestionBtn");

    save(CONFIG.STORAGE.review, state.review);
    saveProgress();
  }

  function nextQuestion() {
    if (!state.answered) return;

    state.currentIndex++;

    if (state.currentIndex >= state.roundQuestions.length) {
      finishRound();
    } else {
      displayQuestion();
    }
  }

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;

    if (!total) return;

    const percent = Math.round((state.correct / total) * 100);
    const passed = percent >= CONFIG.UNLOCK_PERCENT;

    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 50 ? 1 : 0;

    setText("resultScore", `${state.correct}/${total}`);
    setText("resultPercent", `${percent}%`);
    setText("resultStars", "⭐".repeat(stars));

    setText(
      "resultTitle",
      state.language === "rw"
        ? (passed ? "Watsinze!" : "Round irarangiye!")
        : (passed ? "Congratulations!" : "Round Complete")
    );

    setText(
      "resultMessage",
      state.language === "rw"
        ? (passed
          ? "Watsinze! Round ikurikira irafungutse."
          : "Ongera ugerageze kugira ngo ufungure Round ikurikira.")
        : (passed
          ? "Well done! The next round is unlocked."
          : "Keep practising to unlock the next round.")
    );

    const roundKey = `${state.mode}-${state.round}`;

    results[roundKey] = {
      score: state.correct,
      total,
      percent,
      passed,
      stars
    };

    if (passed && !completed[state.mode].includes(roundKey)) {
      completed[state.mode].push(roundKey);
    }

    save(CONFIG.STORAGE.completed, completed);
    save("quizmasterRoundResults", results);

    const best = readNumber(CONFIG.STORAGE.best);

    if (state.score > best) {
      localStorage.setItem(CONFIG.STORAGE.best, String(state.score));
    }

    const totalScore = readNumber(CONFIG.STORAGE.total);

    localStorage.setItem(
      CONFIG.STORAGE.total,
      String(totalScore + state.score)
    );

    if ($("resultNextBtn")) {
      $("resultNextBtn").classList.toggle("hidden", !passed);
    }

    if ($("retryBtn")) {
      $("retryBtn").classList.toggle("hidden", passed);
    }

    saveProgress();
    showScreen("resultScreen");
    updateHome();
  }

  function saveProgress() {
    save(CONFIG.STORAGE.progress, {
      mode: state.mode,
      language: state.language,
      round: state.round,
      currentIndex: state.currentIndex,
      score: state.score,
      correct: state.correct,
      completed: state.answered
    });
  }

  function updateHome() {
    setText("homeScore", localStorage.getItem(CONFIG.STORAGE.best) || "0");
    setText("homeRound", getNextRound(state.mode));

    const totalStars = Object.values(completed).reduce(
      (sum, list) => sum + list.length,
      0
    );

    setText("homeStars", totalStars);

    const saved = readStorage(CONFIG.STORAGE.progress, null);

    if ($("continueBtn")) {
      $("continueBtn").classList.toggle(
        "hidden",
        !(saved && isValidMode(saved.mode))
      );
    }
  }

  function showReview() {
    stopTimer();

    const container = $("reviewContainer");

    if (!container) return;

    container.innerHTML = "";

    const reviews = state.review.length
      ? state.review
      : readStorage(CONFIG.STORAGE.review, []);

    if (!reviews.length) {
      container.textContent = state.language === "rw"
        ? "Nta bisubizo byo gusubiramo biraboneka."
        : "There are no answers to review yet.";
    }

    reviews.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "content-card";

      const heading = document.createElement("h3");
      heading.textContent = `${index + 1}. ${item.question}`;
      card.appendChild(heading);

      const selected = document.createElement("p");
      selected.textContent = "Your answer: " + item.selected;
      card.appendChild(selected);

      const correct = document.createElement("p");
      correct.textContent = "Correct answer: " + item.correct;
      card.appendChild(correct);

      if (item.explanation) {
        const explanation = document.createElement("p");
        explanation.textContent = item.explanation;
        card.appendChild(explanation);
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");
  }

  // ==========================================
  // ROUNDS - SHOW ALL ROUNDS
  // ==========================================

  function showRounds() {
    const list = $("roundList");

    if (!list) {
      console.error("HTML element roundList is missing.");
      return;
    }

    list.innerHTML = "";

    const all = categoryQuestions(state.mode);
    const totalRounds = Math.max(
      1,
      Math.ceil(all.length / CONFIG.QUESTIONS_PER_ROUND)
    );

    const finished = completed[state.mode] || [];

    setText(
      "roundsDescription",
      `${finished.length} / ${totalRounds} completed rounds`
    );

    for (let round = 1; round <= totalRounds; round++) {
      const key = `${state.mode}-${round}`;
      const isCompleted = finished.includes(key);
      const unlocked = isRoundUnlocked(round);

      const item = document.createElement("div");
      item.className = "content-card round-card";

      const heading = document.createElement("h3");
      heading.textContent = `Round ${round}`;
      item.appendChild(heading);

      const status = document.createElement("p");

      if (isCompleted) {
        const result = results[key];

        status.textContent = result
          ? `⭐ ${result.stars} | ${result.score}/${result.total} | ${result.percent}% | Completed`
          : "Completed";

        status.className = "feedback good";
      } else if (unlocked) {
        status.textContent = "🔓 Unlocked - Ready to play";
        status.className = "feedback good";
      } else {
        status.textContent = "🔒 Locked - Complete the previous round";
        status.className = "feedback";
      }

      item.appendChild(status);

      if (!isCompleted && unlocked) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = "Play Round " + round;

        button.addEventListener("click", () => {
          state.round = round;
          startQuiz();
        });

        item.appendChild(button);
      }

      list.appendChild(item);
    }

    if (!totalRounds) {
      list.textContent = "No rounds available.";
    }

    showScreen("roundsScreen");
  }

  function continueQuiz() {
    const saved = readStorage(CONFIG.STORAGE.progress, null);

    if (!saved || !isValidMode(saved.mode)) {
      startQuiz();
      return;
    }

    state.mode = saved.mode;
    state.language = normalizeLanguage(saved.language);

    state.round = completed[state.mode].includes(
      `${state.mode}-${saved.round}`
    )
      ? getNextRound(state.mode)
      : Math.max(1, Number(saved.round) || 1);

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    startQuiz();
  }

  function selectLanguage(button) {
    document.querySelectorAll("[data-language]").forEach(item => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");

    state.language = normalizeLanguage(button.dataset.language);

    updateSelectionSummary();
  }

  function selectMode(button) {
    if (!isValidMode(button.dataset.mode)) return;

    document.querySelectorAll("[data-mode]").forEach(item => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");

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

  function saveSettings() {
    const language = $("settingsLanguage");
    const mode = $("settingsMode");

    if (language) {
      state.language = normalizeLanguage(language.value);
    }

    if (mode && isValidMode(mode.value)) {
      state.mode = mode.value;
    }

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    state.round = getNextRound(state.mode);

    updateSelectionSummary();
    updateHome();

    setText("settingsMessage", "Settings saved successfully.");
    showScreen("homeScreen");
  }

  function resetProgress() {
    if (!confirm("Are you sure you want to reset all quiz progress?")) {
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

    localStorage.removeItem("quizmasterRoundResults");

    used.traffic = [];
    used.general = [];

    completed.traffic = [];
    completed.general = [];

    Object.keys(results).forEach(key => delete results[key]);

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
      if (error.name === "AbortError") return;

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

  function nextRound() {
    const key = `${state.mode}-${state.round}`;

    if (!completed[state.mode].includes(key)) return;

    state.round = getNextRound(state.mode);

    saveProgress();
    updateHome();
    startQuiz();
  }

  function retryRound() {
    stopTimer();
    startQuiz();
  }

  function bindEvents() {
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => selectLanguage(button));
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => selectMode(button));
    });

    on("confirmSetupBtn", "click", () => {
      localStorage.setItem(CONFIG.STORAGE.language, state.language);
      localStorage.setItem(CONFIG.STORAGE.mode, state.mode);
      updateHome();
      setText("homeMessage", "Selection saved.");
    });

    on("startBtn", "click", startQuiz);
    on("continueBtn", "click", continueQuiz);

    on("submitAnswerBtn", "click", () => submitAnswer(false));
    on("nextQuestionBtn", "click", nextQuestion);

    on("quizReviewBtn", "click", showReview);
    on("resultReviewBtn", "click", showReview);
    on("reviewAnswersBtn", "click", showReview);

    on("quizHomeBtn", "click", () => {
      stopTimer();
      showScreen("homeScreen");
    });

    on("resultHomeBtn", "click", () => showScreen("homeScreen"));
    on("reviewHomeBtn", "click", () => showScreen("homeScreen"));

    on("roundsBtn", "click", showRounds);
    on("roundsHomeBtn", "click", () => showScreen("homeScreen"));

    on("settingsBtn", "click", () => {
      if ($("settingsLanguage")) $("settingsLanguage").value = state.language;
      if ($("settingsMode")) $("settingsMode").value = state.mode;
      showScreen("settingsScreen");
    });

    on("saveSettingsBtn", "click", saveSettings);
    on("settingsHomeBtn", "click", () => showScreen("homeScreen"));
    on("resetProgressBtn", "click", resetProgress);
    on("shareBtn", "click", shareQuiz);

    on("resultNextBtn", "click", nextRound);
    on("retryBtn", "click", retryRound);
  }

  function initialize() {
    bindEvents();

    document.querySelectorAll("[data-language]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.language === state.language
      );

      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === state.language)
      );
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.mode === state.mode
      );

      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mode === state.mode)
      );
    });

    updateSelectionSummary();
    updateHome();
    loadQuestions();
  }

  initialize();

})();
