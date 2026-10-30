
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
      progress: "quizmasterProgress",
      music: "quizmasterMusicEnabled"
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
    } catch (error) {
      console.error("Storage error:", error);
    }
  }

  function readNumber(key) {
    return Number(localStorage.getItem(key)) || 0;
  }

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
    loaded: false,

    round: 1,
    review: [],

    musicEnabled: false,
    audioContext: null,
    musicTimer: null,
    musicStep: 0
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

  // ======================================
  // HELPERS
  // ======================================

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
      console.warn("Missing element:", id);
    }
  }

  function validMode(mode) {
    return mode === "traffic" || mode === "general";
  }

  function normalizeLanguage(language) {
    return language === "rw" ? "rw" : "en";
  }

  function shuffle(items) {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  function showScreen(id) {
    const screens = [
      "homeScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "roundsScreen",
      "settingsScreen"
    ];

    screens.forEach(screen => {
      if ($(screen)) {
        $(screen).classList.toggle("hidden", screen !== id);
      }
    });
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

  // ======================================
  // QUESTION DATA
  // ======================================

  function categoryQuestions(mode = state.mode) {
    return state.questions.filter(q => q.category === mode);
  }

  function getOptions(question, language = state.language) {
    if (
      language === "rw" &&
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      return question.options_rw;
    }

    return Array.isArray(question.options) ? question.options : [];
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

    const fallbackAnswer = language === "rw"
      ? question.answer
      : question.answer_rw;

    if (typeof fallbackAnswer === "number") {
      return options[fallbackAnswer];
    }

    const index = originalOptions.indexOf(fallbackAnswer);

    if (index >= 0 && options[index] !== undefined) {
      return options[index];
    }

    return undefined;
  }

  function getQuestionText(question, field) {
    if (state.language === "rw") {
      return question[field + "_rw"] || question[field] || "";
    }

    return question[field] || question[field + "_rw"] || "";
  }

  function questionId(question) {
    return String(question._quizId);
  }

  function validQuestion(question) {
    if (!question || !validMode(question.category)) return false;

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) return false;

    const answer = getCorrectAnswer(question, "en");

    if (answer === undefined || !question.options.includes(answer)) {
      return false;
    }

    if (
      Array.isArray(question.options_rw) &&
      question.options_rw.length
    ) {
      const rwAnswer = getCorrectAnswer(question, "rw");

      if (
        rwAnswer === undefined ||
        !question.options_rw.includes(rwAnswer)
      ) return false;
    }

    return true;
  }

  // ======================================
  // LOAD QUESTIONS
  // ======================================

  async function loadQuestions() {
    try {
      setText("homeMessage", "Loading questions...");

      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Questions file error: " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain an array.");
      }

      state.questions = data
        .map((q, index) => ({
          ...q,
          _quizId: q.id != null ? String(q.id) : "question-" + index
        }))
        .filter(validQuestion);

      if (!state.questions.length) {
        throw new Error("No valid questions found.");
      }

      state.loaded = true;

      state.round = getNextRound(state.mode);

      updateHome();

      setText(
        "homeMessage",
        `Loaded ${state.questions.length} valid questions.`
      );

      console.log("Valid questions:", state.questions.length);
      console.log("Traffic:", categoryQuestions("traffic").length);
      console.log("General:", categoryQuestions("general").length);

    } catch (error) {
      console.error(error);

      state.loaded = false;

      setText(
        "homeMessage",
        "Error loading questions: " + error.message
      );
    }
  }

  // ======================================
  // ROUND SYSTEM
  // ======================================

  function getTotalRounds(mode = state.mode) {
    return Math.ceil(
      categoryQuestions(mode).length / CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getNextRound(mode = state.mode) {
    const total = getTotalRounds(mode);

    if (!total) return 1;

    const finished = completed[mode] || [];

    for (let round = 1; round <= total; round++) {
      if (!finished.includes(`${mode}-${round}`)) {
        return round;
      }
    }

    return 1;
  }

  function isRoundUnlocked(round, mode = state.mode) {
    if (round === 1) return true;

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

    if (!all.length) return [];

    const usedIds = new Set(used[state.mode].map(String));

    let available = all.filter(
      q => !usedIds.has(questionId(q))
    );

    // Begin a new cycle only after all questions were used.
    if (!available.length) {
      used[state.mode] = [];
      save(CONFIG.STORAGE.used, used);
      available = [...all];
    }

    return shuffle(available);
  }

  function prepareRound() {
    if (!state.loaded) {
      setText("homeMessage", "Please wait. Questions are loading.");
      return false;
    }

    if (!validMode(state.mode)) return false;

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

    const ids = state.roundQuestions.map(questionId);

    used[state.mode] = [
      ...new Set([...used[state.mode], ...ids])
    ];

    save(CONFIG.STORAGE.used, used);

    resetRoundState();

    saveProgress();

    return true;
  }

  function resetRoundState() {
    state.currentIndex = 0;
    state.selectedAnswer = null;
    state.score = 0;
    state.correct = 0;
    state.review = [];
    state.answered = false;
  }

  // ======================================
  // START AND CONFIRM
  // ======================================

  function startQuiz() {
    if (!prepareRound()) return;

    showScreen("quizScreen");

    displayQuestion();
  }

  function confirmSetup() {
    if (!state.loaded) {
      setText("homeMessage", "Please wait for questions to load.");
      return;
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

    startQuiz();
  }

  // ======================================
  // DISPLAY QUESTION
  // ======================================

  function displayQuestion() {
    stopTimer();

    const question = state.roundQuestions[state.currentIndex];

    if (!question) {
      finishRound();
      return;
    }

    state.selectedAnswer = null;
    state.answered = false;

    setText("currentRound", state.round);

    setText(
      "currentQuestionNumber",
      `${state.currentIndex + 1}/${state.roundQuestions.length}`
    );

    setText(
      "categoryIndicator",
      state.mode === "traffic" ? "Road Safety" : "General Knowledge"
    );

    setText(
      "questionText",
      getQuestionText(question, "question")
    );

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

        container.querySelectorAll(".answer-option").forEach(item => {
          item.classList.remove("selected");
        });

        button.classList.add("selected");

        if ($("submitAnswerBtn")) {
          $("submitAnswerBtn").disabled = false;
        }
      });

      container.appendChild(button);
    });

    show("submitAnswerBtn");
    hide("nextQuestionBtn");
    hide("answerFeedback");

    if ($("submitAnswerBtn")) {
      $("submitAnswerBtn").disabled = true;
    }

    if ($("progressFill")) {
      $("progressFill").style.width =
        `${(state.currentIndex / state.roundQuestions.length) * 100}%`;
    }

    state.seconds = state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;

    setText("timer", state.seconds);

    startTimer();
    saveProgress();
  }

  // ======================================
  // TIMER
  // ======================================

  function startTimer() {
    stopTimer();

    state.timer = setInterval(() => {
      if (state.answered) return;

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

  // ======================================
  // ANSWER
  // ======================================

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

      if (timeExpired && selected === null) {
        feedback.textContent = state.language === "rw"
          ? "Igihe kirangiye. Igisubizo: " + correctAnswer
          : "Time is up. Correct answer: " + correctAnswer;
      } else if (isCorrect) {
        feedback.textContent = state.language === "rw"
          ? "Ni byo! Igisubizo ni cyo."
          : "Correct answer!";
      } else {
        feedback.textContent = state.language === "rw"
          ? "Si byo. Igisubizo nyacyo: " + correctAnswer
          : "Incorrect. Correct answer: " + correctAnswer;
      }
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

  // ======================================
  // NEXT QUESTION
  // ======================================

  function nextQuestion() {
    if (!state.answered) return;

    state.currentIndex++;

    if (state.currentIndex >= state.roundQuestions.length) {
      finishRound();
    } else {
      displayQuestion();
    }
  }

  // ======================================
  // FINISH ROUND
  // ======================================

  function finishRound() {
    stopTimer();

    const total = state.roundQuestions.length;

    if (!total) return;

    const percent = Math.round((state.correct / total) * 100);
    const passed = percent >= CONFIG.UNLOCK_PERCENT;

    const stars =
      percent >= 90 ? 3 :
      percent >= 70 ? 2 :
      percent >= 50 ? 1 : 0;

    const key = `${state.mode}-${state.round}`;

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
          : "Ongera ugerageze kugira ngo utsinde iyi round.")
        : (passed
          ? "Well done! The next round is unlocked."
          : "Keep practising and try this round again.")
    );

    results[key] = {
      score: state.correct,
      total,
      percent,
      passed,
      stars
    };

    if (passed && !completed[state.mode].includes(key)) {
      completed[state.mode].push(key);
    }

    save(CONFIG.STORAGE.completed, completed);
    save("quizmasterRoundResults", results);

    const best = readNumber(CONFIG.STORAGE.best);

    if (state.score > best) {
      localStorage.setItem(CONFIG.STORAGE.best, String(state.score));
    }

    localStorage.setItem(
      CONFIG.STORAGE.total,
      String(readNumber(CONFIG.STORAGE.total) + state.score)
    );

    if (passed) {
      hide("retryBtn");
      show("resultNextBtn");
    } else {
      hide("resultNextBtn");
      show("retryBtn");
    }

    saveProgress();

    showScreen("resultScreen");
    updateHome();
  }

  // ======================================
  // RETRY SAME ROUND
  // ======================================

  function retryRound() {
    stopTimer();

    if (!state.roundQuestions.length) {
      startQuiz();
      return;
    }

    resetRoundState();

    saveProgress();

    showScreen("quizScreen");

    displayQuestion();
  }

  // ======================================
  // NEXT ROUND
  // ======================================

  function nextRound() {
    const key = `${state.mode}-${state.round}`;

    if (!completed[state.mode].includes(key)) return;

    if (state.round >= getTotalRounds()) {
      resetCategoryCycle();
      state.round = 1;
    } else {
      state.round = getNextRound(state.mode);
    }

    saveProgress();
    updateHome();
    startQuiz();
  }

  // ======================================
  // CYCLE RESET
  // ======================================

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
    save("quizmasterRoundResults", results);
  }

  // ======================================
  // HOME
  // ======================================

  function updateHome() {
    setText(
      "homeScore",
      localStorage.getItem(CONFIG.STORAGE.best) || "0"
    );

    setText("homeRound", getNextRound(state.mode));

    const stars = Object.values(completed)
      .reduce((sum, list) => sum + list.length, 0);

    setText("homeStars", stars);

    const saved = readStorage(CONFIG.STORAGE.progress, null);

    if ($("continueBtn")) {
      const canContinue = saved &&
        saved.mode === state.mode &&
        saved.roundQuestions;

      $("continueBtn").classList.toggle("hidden", !canContinue);
    }
  }

  // ======================================
  // CONTINUE
  // ======================================

  function continueQuiz() {
    const saved = readStorage(CONFIG.STORAGE.progress, null);

    if (!saved || !validMode(saved.mode)) {
      startQuiz();
      return;
    }

    state.mode = saved.mode;
    state.language = normalizeLanguage(saved.language);

    state.round = Math.max(1, Number(saved.round) || 1);

    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);
    localStorage.setItem(CONFIG.STORAGE.language, state.language);

    updateSelectionSummary();
    startQuiz();
  }

  // ======================================
  // REVIEW
  // ======================================

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

      showScreen("reviewScreen");
      return;
    }

    reviews.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "content-card";

      const heading = document.createElement("h3");
      heading.textContent = `${index + 1}. ${item.question}`;

      const selected = document.createElement("p");
      selected.textContent = "Your answer: " + item.selected;

      const correct = document.createElement("p");
      correct.textContent = "Correct answer: " + item.correct;

      card.append(heading, selected, correct);

      if (item.explanation) {
        const explanation = document.createElement("p");
        explanation.textContent = item.explanation;
        card.appendChild(explanation);
      }

      container.appendChild(card);
    });

    showScreen("reviewScreen");
  }

  // ======================================
  // ROUNDS SCREEN
  // ======================================

  function showRounds() {
    if (!state.loaded) {
      setText("homeMessage", "Please wait for questions to load.");
      return;
    }

    const list = $("roundList");

    if (!list) return;

    list.innerHTML = "";

    const total = getTotalRounds();
    const finished = completed[state.mode] || [];

    let unlockedCount = 0;

    for (let round = 1; round <= total; round++) {
      if (isRoundUnlocked(round)) unlockedCount++;
    }

    setText("roundsCompleted", finished.length);
    setText("roundsTotal", total);
    setText("roundsUnlocked", unlockedCount);

    setText(
      "roundsDescription",
      `${finished.length} / ${total} completed rounds`
    );

    if (!total) {
      list.textContent = "No questions available in this category.";
      showScreen("roundsScreen");
      return;
    }

    for (let round = 1; round <= total; round++) {
      const key = `${state.mode}-${round}`;
      const done = finished.includes(key);
      const unlocked = isRoundUnlocked(round);

      const card = document.createElement("div");
      card.className = "round-card";

      const heading = document.createElement("h3");
      heading.textContent = `Round ${round}`;

      const status = document.createElement("p");

      if (done) {
        const result = results[key];

        status.textContent = result
          ? `⭐ ${result.stars} | ${result.score}/${result.total} | ${result.percent}% | Completed`
          : "Completed";

        status.className = "round-status completed";

      } else if (unlocked) {
        status.textContent = "🔓 Unlocked - Ready to play";
        status.className = "round-status unlocked";

      } else {
        status.textContent = "🔒 Locked - Complete the previous round";
        status.className = "round-status locked";
      }

      card.append(heading, status);

      if (!done && unlocked) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = "Play Round " + round;

        button.addEventListener("click", () => {
          state.round = round;
          saveProgress();
          startQuiz();
        });

        card.appendChild(button);
      }

      list.appendChild(card);
    }

    if (finished.length >= total && total > 0) {
      const newCycle = document.createElement("button");

      newCycle.type = "button";
      newCycle.className = "primary";
      newCycle.textContent = state.language === "rw"
        ? "Tangira cycle nshya"
        : "Start New Cycle";

      newCycle.addEventListener("click", () => {
        resetCategoryCycle();
        state.round = 1;
        saveProgress();
        startQuiz();
      });

      list.appendChild(newCycle);
    }

    showScreen("roundsScreen");
  }

  // ======================================
  // LANGUAGE AND CATEGORY
  // ======================================

  function selectLanguage(button) {
    document.querySelectorAll("[data-language]").forEach(item => {
      const selected = item === button;

      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    state.language = normalizeLanguage(button.dataset.language);

    updateSelectionSummary();
  }

  function selectMode(button) {
    if (!validMode(button.dataset.mode)) return;

    document.querySelectorAll("[data-mode]").forEach(item => {
      const selected = item === button;

      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

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

  // ======================================
  // SETTINGS
  // ======================================

  function openSettings() {
    stopTimer();

    if ($("settingsLanguage")) {
      $("settingsLanguage").value = state.language;
    }

    if ($("settingsMode")) {
      $("settingsMode").value = state.mode;
    }

    updateMusicButton();

    showScreen("settingsScreen");
  }

  function saveSettings() {
    if ($("settingsLanguage")) {
      state.language = normalizeLanguage($("settingsLanguage").value);
    }

    if ($("settingsMode") && validMode($("settingsMode").value)) {
      state.mode = $("settingsMode").value;
    }

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    state.round = getNextRound(state.mode);

    updateSelectionSummary();
    updateHome();

    setText("settingsMessage", "Settings saved successfully.");

    showScreen("homeScreen");
  }

  // ======================================
  // MUSIC
  // ======================================

  // Original generated background melody.
  // It does not require an external music file.

  function playMusicNote(frequency, duration) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!state.audioContext) {
      state.audioContext = new AudioContextClass();
    }

    const ctx = state.audioContext;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  function musicTick() {
    if (!state.musicEnabled) return;

    const melody = [
      261.63, 329.63, 392.00, 329.63,
      293.66, 349.23, 440.00, 349.23,
      261.63, 329.63, 392.00, 523.25,
      440.00, 392.00, 329.63, 293.66
    ];

    playMusicNote(melody[state.musicStep % melody.length], 0.55);

    state.musicStep++;
  }

  function startMusic() {
    if (state.musicEnabled) return;

    state.musicEnabled = true;

    try {
      musicTick();

      state.musicTimer = setInterval(musicTick, 650);

      save(CONFIG.STORAGE.music, true);

    } catch (error) {
      console.warn("Music unavailable:", error);
    }

    updateMusicButton();
  }

  function stopMusic() {
    state.musicEnabled = false;

    if (state.musicTimer) {
      clearInterval(state.musicTimer);
      state.musicTimer = null;
    }

    if (state.audioContext) {
      state.audioContext.suspend().catch(() => {});
    }

    save(CONFIG.STORAGE.music, false);

    updateMusicButton();
  }

  function toggleMusic() {
    if (state.musicEnabled) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  function updateMusicButton() {
    const label = state.musicEnabled
      ? "🎵 Music: ON"
      : "🎵 Music: OFF";

    setText("musicToggleBtn", label);
    setText("settingsMusicBtn", label);
  }

  // ======================================
  // RESET PROGRESS
  // ======================================

  function resetProgress() {
    if (!confirm("Are you sure you want to reset all quiz progress?")) {
      return;
    }

    Object.values(CONFIG.STORAGE).forEach(key => {
      if (
        key !== CONFIG.STORAGE.language &&
        key !== CONFIG.STORAGE.mode &&
        key !== CONFIG.STORAGE.music
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
    save("quizmasterRoundResults", results);

    state.round = 1;
    state.roundQuestions = [];

    state.review = [];

    resetRoundState();
    stopTimer();

    updateHome();
    setText("settingsMessage", "Progress reset successfully.");

    showScreen("homeScreen");
  }

  // ======================================
  // SHARE
  // ======================================

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

  // ======================================
  // BACK BUTTONS
  // ======================================

  function goHome() {
    stopTimer();

    updateHome();

    showScreen("homeScreen");
  }

  // ======================================
  // EVENTS
  // ======================================

  function bindEvents() {
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => selectLanguage(button));
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => selectMode(button));
    });

    // Start now confirms current selections.
    on("startBtn", "click", confirmSetup);

    on("confirmSetupBtn", "click", confirmSetup);

    on("continueBtn", "click", continueQuiz);

    on("submitAnswerBtn", "click", () => submitAnswer(false));

    on("nextQuestionBtn", "click", nextQuestion);

    on("quizReviewBtn", "click", showReview);
    on("resultReviewBtn", "click", showReview);
    on("reviewAnswersBtn", "click", showReview);

    on("quizHomeBtn", "click", goHome);
    on("resultHomeBtn", "click", goHome);
    on("reviewHomeBtn", "click", goHome);
    on("roundsHomeBtn", "click", goHome);
    on("settingsHomeBtn", "click", goHome);

    on("roundsBtn", "click", showRounds);

    on("settingsBtn", "click", openSettings);

    on("saveSettingsBtn", "click", saveSettings);

    on("resetProgressBtn", "click", resetProgress);

    on("resultNextBtn", "click", nextRound);

    on("retryBtn", "click", retryRound);

    on("shareBtn", "click", shareQuiz);

    on("musicToggleBtn", "click", toggleMusic);

    on("settingsMusicBtn", "click", toggleMusic);
  }

  // ======================================
  // INITIALIZE
  // ======================================

  function initialize() {
    bindEvents();

    state.language = normalizeLanguage(state.language);

    if (!validMode(state.mode)) {
      state.mode = "traffic";
    }

    document.querySelectorAll("[data-language]").forEach(button => {
      const selected = button.dataset.language === state.language;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      const selected = button.dataset.mode === state.mode;

      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    updateSelectionSummary();

    state.musicEnabled = false;
    updateMusicButton();

    updateHome();

    showScreen("homeScreen");

    loadQuestions();
  }

  initialize();

})();
