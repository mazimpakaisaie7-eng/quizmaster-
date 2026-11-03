(() => {
  "use strict";

  /* =====================================================
     QUIZ MASTER 🇷🇼
     Complete bilingual quiz engine
     Compatible with the supplied index.html
     Data source: ./questions.json
  ===================================================== */

  const CONFIG = Object.freeze({
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TRAFFIC_TIME: 60,
    GENERAL_TIME: 30,
    POINTS_PER_CORRECT: 10,
    PASS_PERCENTAGE: 70,
    LANGUAGES: ["en", "rw"],
    CATEGORIES: ["traffic", "general"]
  });

  const KEYS = Object.freeze({
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    progress: "quizmasterProgress",
    session: "quizmasterCurrentSession",
    used: "quizmasterUsedQuestionIds",
    completed: "quizmasterCompletedRounds",
    review: "quizmasterReviewAnswers",
    best: "quizmasterBestScore",
    total: "quizmasterTotalScore",
    weekly: "quizmasterWeeklyScores",
    settings: "quizmasterSettings",
    music: "quizmasterMusicEnabled"
  });

  const $ = id => document.getElementById(id);

  const state = {
    questions: [],
    language: "en",
    mode: "general",
    languageChosen: false,
    modeChosen: false,
    setupConfirmed: false,

    session: null,
    reviewAnswers: [],
    timerInterval: null,
    timeRemaining: 0,

    bestScore: 0,
    totalScore: 0,

    progress: {
      traffic: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      }
    },

    initialized: false
  };

  const LETTERS = ["A", "B", "C", "D"];

  /* =====================================================
     SAFE STORAGE
  ===================================================== */

  function readStorage(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) return fallback;

      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Quiz Master: Could not save", key);
      return false;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeString(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn("Quiz Master: Could not save preference.");
    }
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function makeId() {
    return "question_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9);
  }

  /* =====================================================
     CATEGORY AND LANGUAGE
  ===================================================== */

  function normalizeLanguage(language) {
    const value = String(language || "")
      .toLowerCase()
      .trim();

    return value === "rw" ? "rw" : "en";
  }

  function normalizeMode(category) {
    const value = String(category || "")
      .toLowerCase()
      .trim();

    if (
      value === "traffic" ||
      value === "road" ||
      value === "road-safety" ||
      value === "roadsafety"
    ) {
      return "traffic";
    }

    return "general";
  }

  function getTimerDuration() {
    return state.mode === "traffic"
      ? CONFIG.TRAFFIC_TIME
      : CONFIG.GENERAL_TIME;
  }

  function getCategoryName(category = state.mode) {
    if (state.language === "rw") {
      return category === "traffic"
        ? "Amategeko y'umuhanda"
        : "Ubumenyi rusange";
    }

    return category === "traffic"
      ? "Road Safety"
      : "General Knowledge";
  }

  function getText(question, englishField, kinyarwandaField) {
    const rw = question?.[kinyarwandaField];
    const en = question?.[englishField];

    if (state.language === "rw") {
      return rw || en || "";
    }

    return en || rw || "";
  }

  /* =====================================================
     QUESTION NORMALIZATION
  ===================================================== */

  function optionText(option, language) {
    if (typeof option === "string" || typeof option === "number") {
      return String(option);
    }

    if (option && typeof option === "object") {
      if (language === "rw") {
        return String(
          option.rw ??
          option.text_rw ??
          option.kinyarwanda ??
          option.en ??
          option.text ??
          ""
        );
      }

      return String(
        option.en ??
        option.text_en ??
        option.text ??
        option.rw ??
        ""
      );
    }

    return "";
  }

  function getOptionArrays(raw) {
    const english = safeArray(
      raw.options ??
      raw.options_en ??
      raw.choices ??
      raw.choices_en
    );

    const kinyarwanda = safeArray(
      raw.options_rw ??
      raw.choices_rw
    );

    return { english, kinyarwanda };
  }

  function findAnswerIndex(raw, englishOptions, rwOptions) {
    const directIndex = raw.answer_index ??
      raw.correct_index ??
      raw.correctAnswerIndex;

    if (
      directIndex !== undefined &&
      directIndex !== null &&
      Number.isInteger(Number(directIndex))
    ) {
      const index = Number(directIndex);

      if (index >= 0 && index < 4) {
        return index;
      }
    }

    const possibleAnswers = [
      raw.answer,
      raw.answer_en,
      raw.answer_rw,
      raw.correct_answer,
      raw.correct_answer_en,
      raw.correct_answer_rw
    ].filter(value => value !== undefined && value !== null);

    for (const answer of possibleAnswers) {
      if (typeof answer === "number") {
        if (answer >= 0 && answer < 4) {
          return answer;
        }

        if (answer >= 1 && answer <= 4) {
          return answer - 1;
        }
      }

      const text = String(answer).trim();

      const letterIndex = LETTERS.indexOf(text.toUpperCase());

      if (letterIndex !== -1) {
        return letterIndex;
      }

      let index = englishOptions.findIndex(
        option => option.trim().toLowerCase() === text.toLowerCase()
      );

      if (index !== -1) return index;

      index = rwOptions.findIndex(
        option => option.trim().toLowerCase() === text.toLowerCase()
      );

      if (index !== -1) return index;
    }

    return -1;
  }

  function normalizeQuestion(raw, index) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const category = normalizeMode(
      raw.category ??
      raw.mode ??
      raw.type
    );

    const questionEnglish = String(
      raw.question ??
      raw.question_en ??
      ""
    ).trim();

    const questionRw = String(
      raw.question_rw ??
      raw.question_kinyarwanda ??
      raw.question_rw_text ??
      ""
    ).trim();

    if (!questionEnglish && !questionRw) {
      return null;
    }

    const arrays = getOptionArrays(raw);

    const englishOptions = arrays.english.map(
      option => optionText(option, "en").trim()
    );

    const rwOptions = arrays.kinyarwanda.map(
      option => optionText(option, "rw").trim()
    );

    if (englishOptions.length !== 4) {
      return null;
    }

    if (englishOptions.some(option => !option)) {
      return null;
    }

    const answerIndex = findAnswerIndex(
      raw,
      englishOptions,
      rwOptions
    );

    if (answerIndex < 0 || answerIndex > 3) {
      return null;
    }

    const finalRwOptions = englishOptions.map((option, i) => {
      return rwOptions[i] || option;
    });

    const explanationEnglish = String(
      raw.explanation ??
      raw.explanation_en ??
      raw.answer_explanation ??
      ""
    ).trim();

    const explanationRw = String(
      raw.explanation_rw ??
      raw.explanation_kinyarwanda ??
      raw.answer_explanation_rw ??
      ""
    ).trim();

    return {
      id: String(raw.id || `question_${index + 1}`),
      category,

      question: questionEnglish || questionRw,
      question_rw: questionRw || questionEnglish,

      options: englishOptions,
      options_rw: finalRwOptions,

      answer: englishOptions[answerIndex],
      answer_rw: finalRwOptions[answerIndex],

      answerIndex,

      explanation: explanationEnglish || explanationRw,
      explanation_rw: explanationRw || explanationEnglish,

      image: String(
        raw.image ??
        raw.image_url ??
        ""
      ).trim()
    };
  }

  /* =====================================================
     LOAD QUESTIONS.JSON
  ===================================================== */

  async function loadQuestions() {
    const startButton = $("startBtn");

    if (startButton) {
      startButton.disabled = true;
    }

    setMessage(
      "homeMessage",
      state.language === "rw"
        ? "Turimo gutegura ibibazo..."
        : "Loading questions..."
    );

    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(
          `Could not load questions.json (${response.status})`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain an array.");
      }

      const validQuestions = [];
      let invalidCount = 0;

      data.forEach((raw, index) => {
        const question = normalizeQuestion(raw, index);

        if (question) {
          validQuestions.push(question);
        } else {
          invalidCount++;
          console.warn(
            `Quiz Master: Invalid question at item ${index + 1}`,
            raw
          );
        }
      });

      state.questions = validQuestions;

      if (invalidCount > 0) {
        console.warn(
          `Quiz Master: ${invalidCount} invalid question(s) were skipped.`
        );
      }

      if (state.questions.length === 0) {
        throw new Error(
          "No valid questions found. Check questions.json."
        );
      }

      updateSetupUI();
      updateHomeUI();
      updateRoundsUI();
      updateReviewButton();

      setMessage(
        "homeMessage",
        state.language === "rw"
          ? `Ibibazo ${state.questions.length} byateguwe neza.`
          : `${state.questions.length} questions loaded successfully.`
      );

      if (state.session && !state.session.finished) {
        $("continueBtn").hidden = false;
      }

      if (startButton) {
        startButton.disabled = !state.setupConfirmed;
      }

      document.dispatchEvent(
        new CustomEvent("quizmaster:questions-loaded", {
          detail: {
            count: state.questions.length,
            invalidCount
          }
        })
      );

      return true;

    } catch (error) {
      console.error("Quiz Master loading error:", error);

      setMessage(
        "homeMessage",
        state.language === "rw"
          ? "Ibibazo ntibyashoboye gufunguka. Reba questions.json hanyuma wongere ugerageze."
          : "Questions could not be loaded. Check questions.json and try again."
      );

      setMessage("setupError", error.message);

      document.dispatchEvent(
        new CustomEvent("quizmaster:error", {
          detail: { error }
        })
      );

      return false;
    }
  }

  /* =====================================================
     RESTORE SAVED DATA
  ===================================================== */

  function normalizeProgress(raw) {
    const result = {
      traffic: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      }
    };

    if (!raw || typeof raw !== "object") {
      return result;
    }

    CONFIG.CATEGORIES.forEach(category => {
      const source = raw[category] || {};

      result[category] = {
        completedRounds: safeArray(
          source.completedRounds ??
          source.completed ??
          []
        ).map(Number).filter(Number.isFinite),

        unlockedRound: Math.max(
          1,
          safeNumber(source.unlockedRound, 1)
        ),

        usedQuestionIds: safeArray(
          source.usedQuestionIds ??
          source.used ??
          []
        ).map(String)
      };
    });

    return result;
  }

  function restoreState() {
    state.language = normalizeLanguage(
      readString(KEYS.language, "en")
    );

    state.mode = normalizeMode(
      readString(KEYS.mode, "general")
    );

    state.bestScore = safeNumber(
      readString(KEYS.best, "0"),
      0
    );

    state.totalScore = safeNumber(
      readString(KEYS.total, "0"),
      0
    );

    state.progress = normalizeProgress(
      readStorage(KEYS.progress, null)
    );

    state.reviewAnswers = safeArray(
      readStorage(KEYS.review, [])
    );

    const settings = readStorage(KEYS.settings, {});

    if (settings && typeof settings === "object") {
      state.language = normalizeLanguage(
        settings.language || state.language
      );

      state.mode = normalizeMode(
        settings.mode || state.mode
      );
    }

    const savedSession = readStorage(KEYS.session, null);

    if (
      savedSession &&
      typeof savedSession === "object" &&
      Array.isArray(savedSession.questions) &&
      savedSession.questions.length > 0 &&
      !savedSession.finished
    ) {
      const validSession = savedSession.questions.every(entry => {
        return (
          entry &&
          typeof entry.questionId === "string" &&
          Number.isInteger(entry.answerIndex) &&
          entry.answerIndex >= 0 &&
          entry.answerIndex <= 3
        );
      });

      if (validSession) {
        state.session = savedSession;

        state.session.mode = normalizeMode(
          savedSession.mode || state.mode
        );

        state.session.language = normalizeLanguage(
          savedSession.language || state.language
        );

        state.timeRemaining = Math.max(
          0,
          safeNumber(
            savedSession.timeRemaining,
            state.session.mode === "traffic"
              ? CONFIG.TRAFFIC_TIME
              : CONFIG.GENERAL_TIME
          )
        );
      }
    }

    const legacyUsed = readStorage(KEYS.used, null);
    const legacyCompleted = readStorage(KEYS.completed, null);

    if (Array.isArray(legacyUsed) && legacyUsed.length) {
      state.progress[state.mode].usedQuestionIds = [
        ...new Set([
          ...state.progress[state.mode].usedQuestionIds,
          ...legacyUsed.map(String)
        ])
      ];
    }

    if (Array.isArray(legacyCompleted) && legacyCompleted.length) {
      state.progress[state.mode].completedRounds = [
        ...new Set([
          ...state.progress[state.mode].completedRounds,
          ...legacyCompleted.map(Number)
        ])
      ];
    }

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    $("settingsLanguage").value = state.language;
    $("settingsMode").value = state.mode;

    updateSetupUI();
    updateMusicStatus();
  }

  function saveProgress() {
    writeStorage(KEYS.progress, state.progress);

    writeStorage(KEYS.session, state.session);

    writeStorage(KEYS.review, state.reviewAnswers);

    writeString(KEYS.language, state.language);
    writeString(KEYS.mode, state.mode);

    writeString(KEYS.best, state.bestScore);
    writeString(KEYS.total, state.totalScore);

    const categoryProgress = state.progress[state.mode];

    writeStorage(
      KEYS.used,
      categoryProgress.usedQuestionIds
    );

    writeStorage(
      KEYS.completed,
      categoryProgress.completedRounds
    );

    writeStorage(KEYS.settings, {
      language: state.language,
      mode: state.mode
    });
  }

  /* =====================================================
     MESSAGE HELPERS
  ===================================================== */

  function setMessage(id, message, type = "") {
    const element = $(id);

    if (!element) return;

    element.textContent = message;

    if (type) {
      element.dataset.type = type;
    } else {
      delete element.dataset.type;
    }
  }

  function getMessage(english, kinyarwanda) {
    return state.language === "rw"
      ? kinyarwanda
      : english;
  }

  /* =====================================================
     SCREEN NAVIGATION
  ===================================================== */

  function showScreen(screenId) {
    stopTimer();

    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const target = $(screenId);

    if (!target) return;

    target.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (screenId === "homeScreen") {
      updateHomeUI();
    }

    if (screenId === "roundsScreen") {
      updateRoundsUI();
    }

    if (screenId === "reviewScreen") {
      renderReview();
    }

    saveProgress();
  }

  function goHome() {
    showScreen("homeScreen");
    updateHomeUI();
  }

  /* =====================================================
     SETUP
  ===================================================== */

  function updateSetupUI() {
    document.querySelectorAll(".language-btn").forEach(button => {
      const selected =
        button.dataset.language === state.language;

      button.classList.toggle("selected", selected);
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      const selected =
        button.dataset.mode === state.mode;

      button.classList.toggle("selected", selected);
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const summary = $("selectionSummary");

    if (summary) {
      if (state.language === "rw") {
        summary.textContent =
          `Ururimi: ${state.language === "rw" ? "Ikinyarwanda" : "English"} | Icyiciro: ${getCategoryName()}`;
      } else {
        summary.textContent =
          `Language: English | Category: ${getCategoryName()}`;
      }
    }

    $("confirmSetupBtn").disabled = !(
      state.languageChosen &&
      state.modeChosen
    );

    $("startBtn").disabled = !(
      state.setupConfirmed &&
      state.questions.length > 0
    );
  }

  function selectLanguage(language) {
    state.language = normalizeLanguage(language);
    state.languageChosen = true;
    state.setupConfirmed = false;

    updateSetupUI();

    setMessage("setupError", "");

    saveProgress();
  }

  function selectMode(mode) {
    state.mode = normalizeMode(mode);
    state.modeChosen = true;
    state.setupConfirmed = false;

    updateSetupUI();

    setMessage("setupError", "");

    saveProgress();
  }

  function confirmSetup() {
    if (!state.languageChosen || !state.modeChosen) {
      setMessage(
        "setupError",
        getMessage(
          "Please choose a language and category.",
          "Banza uhitemo ururimi n'icyiciro."
        ),
        "error"
      );

      return;
    }

    state.setupConfirmed = true;

    $("startBtn").disabled = state.questions.length === 0;

    setMessage(
      "setupError",
      getMessage(
        "Selection confirmed. You can start the quiz.",
        "Ibyo wahisemo byemejwe. Ushobora gutangira gukina."
      )
    );

    saveProgress();
    updateSetupUI();
  }

  /* =====================================================
     QUESTION POOL AND ROUNDS
  ===================================================== */

  function getCategoryQuestions(category = state.mode) {
    return state.questions.filter(
      question => question.category === category
    );
  }

  function getTotalRounds(category = state.mode) {
    const count = getCategoryQuestions(category).length;

    return Math.ceil(
      count / CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function getCategoryProgress(category = state.mode) {
    return state.progress[category];
  }

  function getUnlockedRound(category = state.mode) {
    return Math.min(
      Math.max(1, getCategoryProgress(category).unlockedRound),
      Math.max(1, getTotalRounds(category))
    );
  }

  function getNextQuestionPool(category = state.mode) {
    const questions = getCategoryQuestions(category);

    const used = new Set(
      getCategoryProgress(category).usedQuestionIds
    );

    let available = questions.filter(
      question => !used.has(question.id)
    );

    if (available.length === 0) {
      getCategoryProgress(category).usedQuestionIds = [];
      available = [...questions];
    }

    return shuffle(available);
  }

  function getCurrentRound() {
    return getUnlockedRound(state.mode);
  }

  function createRoundQuestions(roundNumber) {
    const pool = getNextQuestionPool(state.mode);

    const selected = pool.slice(
      0,
      CONFIG.QUESTIONS_PER_ROUND
    );

    return selected.map(question => {
      const optionIndexes = shuffle([0, 1, 2, 3]);

      return {
        questionId: question.id,
        answerIndex: question.answerIndex,

        optionOrder: optionIndexes,

        selectedOption: null,
        answered: false,
        correct: false,

        timeTaken: 0
      };
    });
  }

  function getQuestionById(id) {
    return state.questions.find(
      question => question.id === id
    );
  }

  /* =====================================================
     START AND CONTINUE
  ===================================================== */

  function startNewRound(roundNumber = null) {
    if (!state.questions.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "Questions are not loaded yet.",
          "Ibibazo ntibirafunguka."
        )
      );

      return;
    }

    if (!state.setupConfirmed) {
      setMessage(
        "setupError",
        getMessage(
          "Please confirm your selection first.",
          "Banza wemeze ibyo wahisemo."
        ),
        "error"
      );

      return;
    }

    const round = roundNumber || getCurrentRound();

    if (round > getUnlockedRound()) {
      setMessage(
        "homeMessage",
        getMessage(
          "Complete the previous round first.",
          "Banza urangize round ibanza."
        )
      );

      return;
    }

    const questions = createRoundQuestions(round);

    if (!questions.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "There are no questions in this category.",
          "Nta bibazo biri muri iki cyiciro."
        )
      );

      return;
    }

    state.session = {
      mode: state.mode,
      language: state.language,

      round,
      questions,

      currentIndex: 0,
      score: 0,
      correctCount: 0,

      startedAt: Date.now(),
      finished: false,

      timeRemaining: getTimerDuration()
    };

    state.timeRemaining = getTimerDuration();

    saveProgress();

    renderQuestion(true);

    showScreen("quizScreen");

    document.dispatchEvent(
      new CustomEvent("quizmaster:game-started", {
        detail: {
          category: state.mode,
          round,
          questionCount: questions.length
        }
      })
    );
  }

  function continueQuiz() {
    const session = state.session;

    if (
      !session ||
      session.finished ||
      !Array.isArray(session.questions)
    ) {
      startNewRound();
      return;
    }

    state.mode = normalizeMode(session.mode);
    state.language = normalizeLanguage(session.language);

    state.timeRemaining = Math.max(
      0,
      safeNumber(
        session.timeRemaining,
        getTimerDuration()
      )
    );

    const current = session.questions[session.currentIndex];

    if (!current) {
      finishRound();
      return;
    }

    if (current.answered) {
      session.currentIndex++;

      if (session.currentIndex >= session.questions.length) {
        finishRound();
        return;
      }
    }

    renderQuestion(false);
    showScreen("quizScreen");

    if (state.timeRemaining <= 0) {
      handleTimeUp();
    }
  }

  /* =====================================================
     QUESTION DISPLAY
  ===================================================== */

  function getCurrentQuestionEntry() {
    if (!state.session) return null;

    return state.session.questions[
      state.session.currentIndex
    ] || null;
  }

  function getCurrentQuestion() {
    const entry = getCurrentQuestionEntry();

    if (!entry) return null;

    return getQuestionById(entry.questionId);
  }

  function getDisplayedOptions(question, entry) {
    return entry.optionOrder.map(index => {
      return {
        originalIndex: index,
        text: state.language === "rw"
          ? question.options_rw[index]
          : question.options[index]
      };
    });
  }

  function renderQuestion(resetTimer = true) {
    const session = state.session;

    if (!session || session.finished) return;

    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (!entry || !question) {
      finishRound();
      return;
    }

    state.mode = session.mode;
    state.language = session.language;

    $("roundLabel").textContent = session.round;

    $("questionCounter").textContent =
      `${session.currentIndex + 1}/${session.questions.length}`;

    $("scoreNumber").textContent = session.score;

    $("categoryIndicator").textContent =
      getCategoryName(session.mode);

    $("questionText").textContent = getText(
      question,
      "question",
      "question_rw"
    );

    const image = $("questionImage");

    if (question.image) {
      image.src = question.image;
      image.style.display = "block";
      image.onerror = () => {
        image.style.display = "none";
      };
    } else {
      image.removeAttribute("src");
      image.style.display = "none";
    }

    const optionsContainer = $("optionsContainer");

    optionsContainer.replaceChildren();

    const displayedOptions = getDisplayedOptions(
      question,
      entry
    );

    displayedOptions.forEach((option, displayIndex) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-btn";

      const letter = document.createElement("span");

      letter.className = "option-letter";
      letter.textContent = LETTERS[displayIndex];

      const text = document.createElement("span");

      text.textContent = option.text;

      button.append(letter, text);

      button.addEventListener("click", () => {
        selectAnswer(option.originalIndex);
      });

      optionsContainer.appendChild(button);
    });

    $("submitAnswerBtn").disabled = true;
    $("nextQuestionBtn").hidden = true;

    $("answerFeedback").textContent = "";
    $("explanation").textContent = "";

    updateProgressUI();

    if (resetTimer) {
      state.timeRemaining = getTimerDuration();
    } else {
      state.timeRemaining = Math.max(
        0,
        safeNumber(
          session.timeRemaining,
          getTimerDuration()
        )
      );
    }

    session.timeRemaining = state.timeRemaining;

    startTimer(false);

    if (entry.answered) {
      restoreAnsweredQuestion();
    }
  }

  function updateProgressUI() {
    if (!state.session) return;

    const total = state.session.questions.length;

    const percent = total
      ? (state.session.currentIndex / total) * 100
      : 0;

    $("progressFill").style.width = `${percent}%`;

    $("quizProgressBar").setAttribute(
      "aria-valuenow",
      String(Math.round(percent))
    );
  }

  /* =====================================================
     ANSWER SELECTION
  ===================================================== */

  function selectAnswer(originalIndex) {
    const entry = getCurrentQuestionEntry();

    if (!entry || entry.answered) return;

    entry.selectedOption = originalIndex;

    const buttons = $("optionsContainer").querySelectorAll(
      ".option-btn"
    );

    buttons.forEach((button, displayIndex) => {
      const original = entry.optionOrder[displayIndex];

      button.classList.toggle(
        "selected",
        original === originalIndex
      );
    });

    $("submitAnswerBtn").disabled = false;

    saveProgress();
  }

  function submitAnswer() {
    const session = state.session;
    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (
      !session ||
      !entry ||
      !question ||
      entry.answered ||
      entry.selectedOption === null
    ) {
      return;
    }

    stopTimer();

    entry.answered = true;
    entry.correct =
      entry.selectedOption === question.answerIndex;

    entry.timeTaken = Math.max(
      0,
      getTimerDuration() - state.timeRemaining
    );

    if (entry.correct) {
      session.score += CONFIG.POINTS_PER_CORRECT;
      session.correctCount++;
    }

    $("scoreNumber").textContent = session.score;

    showAnswerFeedback(question, entry);

    $("submitAnswerBtn").disabled = true;
    $("nextQuestionBtn").hidden = false;

    $("optionsContainer")
      .querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question.answerIndex) {
          button.classList.add("correct");
        }

        if (
          originalIndex === entry.selectedOption &&
          !entry.correct
        ) {
          button.classList.add("incorrect");
        }
      });

    saveProgress();

    updateReviewButton();
  }

  function showAnswerFeedback(question, entry) {
    const feedback = $("answerFeedback");

    feedback.textContent = entry.correct
      ? getMessage(
          "✓ Correct answer!",
          "✓ Igisubizo ni cyo!"
        )
      : getMessage(
          "✗ Incorrect answer.",
          "✗ Igisubizo si cyo."
        );

    feedback.className = entry.correct
      ? "correct-text"
      : "wrong-text";

    const correctAnswer = getText(
      question,
      "answer",
      "answer_rw"
    );

    const explanation = getText(
      question,
      "explanation",
      "explanation_rw"
    );

    $("explanation").textContent = explanation
      ? `${getMessage("Explanation:", "Ibisobanuro:")} ${explanation}`
      : `${getMessage("Correct answer:", "Igisubizo nyacyo:")} ${correctAnswer}`;
  }

  function restoreAnsweredQuestion() {
    const entry = getCurrentQuestionEntry();
    const question = getCurrentQuestion();

    if (!entry || !question || !entry.answered) return;

    showAnswerFeedback(question, entry);

    $("submitAnswerBtn").disabled = true;
    $("nextQuestionBtn").hidden = false;

    $("optionsContainer")
      .querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question.answerIndex) {
          button.classList.add("correct");
        }

        if (
          originalIndex === entry.selectedOption &&
          !entry.correct
        ) {
          button.classList.add("incorrect");
        }
      });
  }

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  function nextQuestion() {
    const session = state.session;

    if (!session) return;

    const entry = getCurrentQuestionEntry();

    if (!entry || !entry.answered) return;

    session.currentIndex++;

    if (session.currentIndex >= session.questions.length) {
      finishRound();
      return;
    }

    state.timeRemaining = getTimerDuration();

    session.timeRemaining = state.timeRemaining;

    renderQuestion(true);

    saveProgress();
  }

  /* =====================================================
     TIMER
  ===================================================== */

  function updateTimerUI() {
    const timer = $("timer");
    const timerBox = $("timerBox");

    if (timer) {
      timer.textContent = String(state.timeRemaining);
    }

    if (timerBox) {
      timerBox.classList.toggle(
        "warning",
        state.timeRemaining <= 10
      );
    }
  }

  function stopTimer() {
    if (state.timerInterval !== null) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function startTimer(reset = true) {
    stopTimer();

    if (reset) {
      state.timeRemaining = getTimerDuration();
    } else {
      state.timeRemaining = Math.max(
        0,
        safeNumber(
          state.session?.timeRemaining,
          state.timeRemaining
        )
      );
    }

    if (state.session) {
      state.session.timeRemaining = state.timeRemaining;
    }

    updateTimerUI();

    if (state.timeRemaining <= 0) {
      handleTimeUp();
      return;
    }

    state.timerInterval = setInterval(() => {
      if (!state.session || state.session.finished) {
        stopTimer();
        return;
      }

      const entry = getCurrentQuestionEntry();

      if (!entry || entry.answered) {
        stopTimer();
        return;
      }

      state.timeRemaining = Math.max(
        0,
        state.timeRemaining - 1
      );

      state.session.timeRemaining = state.timeRemaining;

      updateTimerUI();

      if (state.timeRemaining <= 0) {
        stopTimer();
        handleTimeUp();
      }
    }, 1000);
  }

  function handleTimeUp() {
    const entry = getCurrentQuestionEntry();

    if (!entry || entry.answered) return;

    stopTimer();

    state.timeRemaining = 0;

    if (state.session) {
      state.session.timeRemaining = 0;
    }

    entry.answered = true;
    entry.correct = false;
    entry.selectedOption = null;
    entry.timeTaken = getTimerDuration();

    const question = getCurrentQuestion();

    if (question) {
      showAnswerFeedback(question, entry);
    }

    $("submitAnswerBtn").disabled = true;
    $("nextQuestionBtn").hidden = false;

    $("optionsContainer")
      .querySelectorAll(".option-btn")
      .forEach((button, displayIndex) => {
        const originalIndex = entry.optionOrder[displayIndex];

        button.disabled = true;

        if (originalIndex === question?.answerIndex) {
          button.classList.add("correct");
        }
      });

    $("answerFeedback").textContent = getMessage(
      "Time is up! The correct answer is shown above.",
      "Igihe kirangiye! Igisubizo nyacyo kiragaragazwa hejuru."
    );

    saveProgress();
  }

  /* =====================================================
     FINISH ROUND AND RESULTS
  ===================================================== */

  function finishRound() {
    const session = state.session;

    if (!session || session.finished) return;

    stopTimer();

    session.finished = true;

    const total = session.questions.length;
    const correct = session.correctCount;

    const percentage = total
      ? Math.round((correct / total) * 100)
      : 0;

    const passed = percentage >= CONFIG.PASS_PERCENTAGE;

    const progress = getCategoryProgress(session.mode);

    if (passed) {
      if (!progress.completedRounds.includes(session.round)) {
        progress.completedRounds.push(session.round);
      }

      progress.completedRounds.sort((a, b) => a - b);

      progress.unlockedRound = Math.max(
        progress.unlockedRound,
        session.round + 1
      );

      const usedIds = session.questions.map(
        entry => entry.questionId
      );

      progress.usedQuestionIds = [
        ...new Set([
          ...progress.usedQuestionIds,
          ...usedIds
        ])
      ];
    }

    state.totalScore += session.score;

    state.bestScore = Math.max(
      state.bestScore,
      session.score
    );

    state.reviewAnswers = session.questions.map(entry => {
      const question = getQuestionById(entry.questionId);

      if (!question) return null;

      return {
        questionId: question.id,
        category: question.category,

        question: question.question,
        question_rw: question.question_rw,

        options: question.options,
        options_rw: question.options_rw,

        answer: question.answer,
        answer_rw: question.answer_rw,

        explanation: question.explanation,
        explanation_rw: question.explanation_rw,

        selectedOption: entry.selectedOption,
        correct: entry.correct,
        answered: entry.answered,

        timeTaken: entry.timeTaken
      };
    }).filter(Boolean);

    writeStorage(KEYS.review, state.reviewAnswers);

    saveWeeklyScore(session.score);

    saveProgress();

    renderResults({
      passed,
      percentage,
      correct,
      total,
      score: session.score,
      round: session.round
    });

    showScreen("resultScreen");

    updateReviewButton();

    document.dispatchEvent(
      new CustomEvent("quizmaster:round-finished", {
        detail: {
          passed,
          percentage,
          correct,
          total,
          score: session.score,
          round: session.round
        }
      })
    );
  }

  function saveWeeklyScore(score) {
    const scores = safeArray(
      readStorage(KEYS.weekly, [])
    );

    scores.push({
      date: new Date().toISOString(),
      score: safeNumber(score)
    });

    writeStorage(
      KEYS.weekly,
      scores.slice(-100)
    );
  }

  function renderResults(result) {
    const stars = result.percentage >= 90
      ? "⭐⭐⭐"
      : result.percentage >= 70
        ? "⭐⭐"
        : result.percentage >= 40
          ? "⭐"
          : "☆";

    $("resultTitle").textContent = result.passed
      ? getMessage("Round Passed!", "Watsinze iyi round!")
      : getMessage("Round Not Passed", "Ntabwo watsinze iyi round.");

    $("resultMessage").textContent = result.passed
      ? getMessage(
          "Congratulations! You unlocked the next round.",
          "Urakoze! Wafunguye round ikurikira."
        )
      : getMessage(
          "You need at least 70% to unlock the next round. Try again!",
          "Ukeneye nibura 70% kugira ngo ufungure round ikurikira. Ongera ugerageze!"
        );

    $("resultStars").textContent = stars;
    $("resultScore").textContent = result.score;

    $("resultPercent").textContent =
      `${result.percentage}%`;

    $("resultCorrect").textContent =
      `${result.correct}/${result.total}`;

    $("resultPassMark").textContent =
      `${CONFIG.PASS_PERCENTAGE}%`;

    const nextRound = result.round + 1;
    const totalRounds = getTotalRounds(resultCategory());

    $("resultNextBtn").hidden = !(
      result.passed &&
      nextRound <= totalRounds
    );

    $("retryBtn").hidden = result.passed;

    if (
      result.passed &&
      nextRound > totalRounds
    ) {
      $("resultMessage").textContent = getMessage(
        "Excellent! You have completed all available rounds in this category.",
        "Byiza cyane! Warangije rounds zose ziri muri iki cyiciro."
      );
    }
  }

  function resultCategory() {
    return state.session?.mode || state.mode;
  }

  function retryRound() {
    if (!state.session) return;

    const round = state.session.round;

    state.mode = state.session.mode;
    state.language = state.session.language;

    state.session = null;

    startNewRound(round);
  }

  function nextRound() {
    if (!state.session) return;

    const next = state.session.round + 1;

    if (next > getTotalRounds(state.session.mode)) {
      goHome();
      return;
    }

    state.mode = state.session.mode;
    state.language = state.session.language;

    state.session = null;

    startNewRound(next);
  }

  /* =====================================================
     REVIEW ANSWERS
  ===================================================== */

  function updateReviewButton() {
    const hasReview = state.reviewAnswers.length > 0;

    const menuButton = $("reviewAnswersBtn");
    const quizButton = $("quizReviewBtn");
    const resultButton = $("resultReviewBtn");

    if (menuButton) {
      menuButton.hidden = !hasReview;
    }

    if (quizButton) {
      quizButton.disabled = !hasReview;
    }

    if (resultButton) {
      resultButton.disabled = !hasReview;
    }
  }

  function openReview() {
    if (!state.reviewAnswers.length) {
      setMessage(
        "homeMessage",
        getMessage(
          "There are no answers to review yet.",
          "Nta bisubizo byo gusubiramo birahari ubu."
        )
      );

      return;
    }

    showScreen("reviewScreen");
    renderReview();
  }

  function renderReview() {
    const container = $("reviewContainer");

    if (!container) return;

    container.replaceChildren();

    if (!state.reviewAnswers.length) {
      const message = document.createElement("p");

      message.textContent = getMessage(
        "No answers available.",
        "Nta bisubizo bihari."
      );

      container.appendChild(message);

      return;
    }

    state.reviewAnswers.forEach((entry, index) => {
      const card = document.createElement("article");

      card.className = "review-item";

      const question = document.createElement("h3");

      question.textContent =
        `${index + 1}. ${getText(
          entry,
          "question",
          "question_rw"
        )}`;

      card.appendChild(question);

      const selected = document.createElement("p");

      const selectedText = entry.selectedOption === null ||
        entry.selectedOption === undefined
        ? getMessage("No answer selected", "Nta gisubizo wahisemo")
        : (
            state.language === "rw"
              ? entry.options_rw[entry.selectedOption]
              : entry.options[entry.selectedOption]
          );

      selected.textContent =
        `${getMessage("Your answer:", "Igisubizo wahisemo:")} ${selectedText}`;

      selected.className = entry.correct
        ? "correct-text"
        : "wrong-text";

      card.appendChild(selected);

      const correct = document.createElement("p");

      correct.className = "correct-text";

      correct.textContent =
        `${getMessage("Correct answer:", "Igisubizo nyacyo:")} ${
          getText(entry, "answer", "answer_rw")
        }`;

      card.appendChild(correct);

      const explanation = document.createElement("p");

      explanation.textContent =
        `${getMessage("Explanation:", "Ibisobanuro:")} ${
          getText(entry, "explanation", "explanation_rw")
        }`;

      card.appendChild(explanation);

      container.appendChild(card);
    });

    document.dispatchEvent(
      new CustomEvent("quizmaster:review-data", {
        detail: {
          answers: state.reviewAnswers
        }
      })
    );
  }

  /* =====================================================
     HOME SCREEN AND STATS
  ===================================================== */

  function updateHomeUI() {
    const progress = getCategoryProgress();

    $("homeRound").textContent = getUnlockedRound();

    $("homeScore").textContent = state.bestScore;

    const completed = progress.completedRounds.length;

    $("homeStars").textContent =
      completed >= 10
        ? "⭐⭐⭐"
        : completed >= 5
          ? "⭐⭐"
          : completed >= 1
            ? "⭐"
            : "☆";

    const hasSession = Boolean(
      state.session &&
      !state.session.finished
    );

    $("continueBtn").hidden = !hasSession;

    $("startBtn").hidden = hasSession;

    if ($("startBtn")) {
      $("startBtn").disabled = !(
        state.setupConfirmed &&
        state.questions.length > 0
      );
    }

    updateReviewButton();
  }

  /* =====================================================
     ROUNDS SCREEN
  ===================================================== */

  function updateRoundsUI() {
    const list = $("roundList");

    if (!list) return;

    list.replaceChildren();

    const total = getTotalRounds();
    const progress = getCategoryProgress();
    const unlocked = getUnlockedRound();

    $("roundsCompleted").textContent =
      progress.completedRounds.length;

    $("roundsTotal").textContent = total;

    $("roundsUnlocked").textContent =
      Math.min(unlocked, total);

    $("roundsDescription").textContent =
      getMessage(
        `Category: ${getCategoryName()}. Pass each round with at least 70% to unlock the next one.`,
        `Icyiciro: ${getCategoryName()}. Tsinda nibura 70% kugira ngo ufungure round ikurikira.`
      );

    for (let round = 1; round <= total; round++) {
      const completed =
        progress.completedRounds.includes(round);

      const locked = round > unlocked;

      const button = document.createElement("button");

      button.type = "button";

      button.className = "round-card";

      if (completed) button.classList.add("completed");
      if (locked) button.classList.add("locked");

      button.disabled = locked;

      const title = document.createElement("span");

      title.textContent =
        `${getMessage("Round", "Round")} ${round}`;

      const status = document.createElement("span");

      status.className = "round-status";

      status.textContent = completed
        ? getMessage("✓ Completed", "✓ Yarangiye")
        : locked
          ? getMessage("🔒 Locked", "🔒 Ifunze")
          : getMessage("▶ Play", "▶ Kina");

      button.append(title, status);

      button.addEventListener("click", () => {
        if (!locked) {
          state.session = null;
          startNewRound(round);
        }
      });

      list.appendChild(button);
    }

    if (total === 0) {
      const message = document.createElement("p");

      message.textContent = getMessage(
        "No questions are available in this category.",
        "Nta bibazo biri muri iki cyiciro."
      );

      list.appendChild(message);
    }
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  function openSettings() {
    $("settingsLanguage").value = state.language;
    $("settingsMode").value = state.mode;

    updateMusicStatus();

    showScreen("settingsScreen");
  }

  function saveSettings() {
    const newLanguage = normalizeLanguage(
      $("settingsLanguage").value
    );

    const newMode = normalizeMode(
      $("settingsMode").value
    );

    if (
      state.session &&
      !state.session.finished &&
      (
        newLanguage !== state.session.language ||
        newMode !== state.session.mode
      )
    ) {
      setMessage(
        "settingsMessage",
        getMessage(
          "Finish or leave your current round before changing its language or category.",
          "Banza urangize cyangwa usohoke muri round urimo mbere yo guhindura ururimi cyangwa icyiciro."
        )
      );

      return;
    }

    state.language = newLanguage;
    state.mode = newMode;

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    saveProgress();

    updateSetupUI();
    updateHomeUI();
    updateRoundsUI();

    setMessage(
      "settingsMessage",
      getMessage(
        "Settings saved successfully.",
        "Ibyo wahinduye byabitswe neza."
      )
    );
  }

  function updateMusicStatus() {
    const enabled =
      readString(KEYS.music, "false") === "true";

    const button = $("musicToggleBtn");
    const status = $("musicStatus");

    if (button) {
      button.textContent = enabled
        ? "🔊 Music On"
        : "🔇 Music Off";
    }

    if (status) {
      status.textContent = enabled
        ? getMessage(
            "Music is enabled.",
            "Umuziki urafunguye."
          )
        : getMessage(
            "Music is disabled.",
            "Umuziki urafunze."
          );
    }
  }

  /* =====================================================
     RESET PROGRESS
  ===================================================== */

  function resetProgress() {
    const confirmed = window.confirm(
      getMessage(
        "Are you sure you want to reset all quiz progress? This cannot be undone.",
        "Urashaka koko gusiba progress yose ya Quiz Master? Ntibishobora gusubizwa."
      )
    );

    if (!confirmed) return;

    stopTimer();

    state.session = null;
    state.reviewAnswers = [];

    state.bestScore = 0;
    state.totalScore = 0;

    state.progress = {
      traffic: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      },
      general: {
        completedRounds: [],
        unlockedRound: 1,
        usedQuestionIds: []
      }
    };

    Object.values(KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("Could not reset:", key);
      }
    });

    state.language = "en";
    state.mode = "general";

    state.languageChosen = true;
    state.modeChosen = true;
    state.setupConfirmed = true;

    saveProgress();

    updateSetupUI();
    updateHomeUI();
    updateRoundsUI();
    updateReviewButton();

    setMessage(
      "settingsMessage",
      getMessage(
        "Your quiz progress has been reset.",
        "Progress yawe yasubijwe ku ntangiriro."
      )
    );

    goHome();
  }

  /* =====================================================
     SHARE
  ===================================================== */

  async function shareQuiz() {
    const shareData = {
      title: "Quiz Master 🇷🇼",
      text: "Test your knowledge with Quiz Master!",
      url: window.location.origin + window.location.pathname
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);

        setMessage(
          "homeMessage",
          getMessage(
            "✓ Link copied!",
            "✓ Link yakoporowe!"
          )
        );

        return;
      }

      window.prompt(
        getMessage("Copy this link:", "Koporora iyi link:"),
        shareData.url
      );

    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Sharing failed:", error);
      }
    }
  }

  /* =====================================================
     EVENT LISTENERS
  ===================================================== */

  function bindEvents() {
    document.querySelectorAll(".language-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectLanguage(button.dataset.language);
      });
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
      });
    });

    $("confirmSetupBtn").addEventListener(
      "click",
      confirmSetup
    );

    $("startBtn").addEventListener("click", () => {
      startNewRound();
    });

    $("continueBtn").addEventListener(
      "click",
      continueQuiz
    );

    $("submitAnswerBtn").addEventListener(
      "click",
      submitAnswer
    );

    $("nextQuestionBtn").addEventListener(
      "click",
      nextQuestion
    );

    $("quizReviewBtn").addEventListener(
      "click",
      openReview
    );

    $("quizHomeBtn").addEventListener(
      "click",
      goHome
    );

    $("resultNextBtn").addEventListener(
      "click",
      nextRound
    );

    $("retryBtn").addEventListener(
      "click",
      retryRound
    );

    $("resultReviewBtn").addEventListener(
      "click",
      openReview
    );

    $("resultHomeBtn").addEventListener(
      "click",
      goHome
    );

    $("reviewHomeBtn").addEventListener(
      "click",
      goHome
    );

    $("roundsBtn").addEventListener("click", () => {
      updateRoundsUI();
      showScreen("roundsScreen");
    });

    $("roundsHomeBtn").addEventListener(
      "click",
      goHome
    );

    $("settingsBtn").addEventListener(
      "click",
      openSettings
    );

    $("saveSettingsBtn").addEventListener(
      "click",
      saveSettings
    );

    $("resetProgressBtn").addEventListener(
      "click",
      resetProgress
    );

    $("settingsHomeBtn").addEventListener(
      "click",
      goHome
    );

    $("reviewAnswersBtn").addEventListener(
      "click",
      openReview
    );

    $("shareBtn").addEventListener(
      "click",
      shareQuiz
    );

    document.addEventListener(
      "quizmaster:music-changed",
      updateMusicStatus
    );
  }

  /* =====================================================
     SAVE WHEN PAGE IS HIDDEN OR CLOSED
  ===================================================== */

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveProgress();
    }
  });

  window.addEventListener("pagehide", () => {
    saveProgress();
  });

  window.addEventListener("beforeunload", () => {
    saveProgress();
  });

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.QuizMaster = {
    getState() {
      return {
        language: state.language,
        mode: state.mode,
        questionsLoaded: state.questions.length,
        session: state.session,
        bestScore: state.bestScore,
        totalScore: state.totalScore
      };
    },

    start: startNewRound,
    continue: continueQuiz,
    home: goHome,
    review: openReview,
    rounds: updateRoundsUI,
    reloadQuestions: loadQuestions
  };

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async function initialize() {
    if (state.initialized) return;

    state.initialized = true;

    restoreState();

    bindEvents();

    updateHomeUI();
    updateRoundsUI();
    updateReviewButton();

    const loaded = await loadQuestions();

    if (!loaded) {
      $("startBtn").disabled = true;
      return;
    }

    if (state.session && !state.session.finished) {
      $("continueBtn").hidden = false;
    }

    updateHomeUI();

    if (
      state.session &&
      state.session.questions.length > 0
    ) {
      setMessage(
        "homeMessage",
        getMessage(
          "You have a quiz in progress. Select Continue Quiz to resume.",
          "Ufite umukino utararangira. Kanda Continue Quiz kugira ngo ukomeze."
        )
      );
    }
  }

  initialize();

})();
