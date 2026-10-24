
(() => {
  "use strict";

  // QUIZ MASTER RWANDA — QUESTIONS ENGINE
  // Works with the supplied index.html.
  // Questions file: ./questions.json

  const CONFIG = {
    QUESTIONS_FILE: "./questions.json",
    QUESTIONS_PER_ROUND: 10,
    TIME_PER_QUESTION: 30,
    POINTS_PER_CORRECT: 10,
    UNLOCK_PERCENT: 60,
    BONUS_EVERY_CORRECT: 3,
    BONUS_POINTS: 5
  };

  const KEYS = {
    language: "quizmasterLanguage",
    mode: "quizmasterMode",
    progress: "quizmasterProgress",
    unlocked: "quizmasterUnlocked",
    completed: "quizmasterCompleted",
    stars: "quizmasterRoundStars",
    totalScore: "quizmasterTotalScore",
    best: "quizmasterPersonalBest",
    streak: "quizmasterCorrectStreak",
    session: "quizmasterSavedSession",
    review: "quizmasterReviewAnswers"
  };

  const $ = id => document.getElementById(id);

  const state = {
    allQuestions: [],
    questions: [],
    currentQuestions: [],
    round: 1,
    totalRounds: 0,
    questionIndex: 0,
    score: 0,
    roundCorrect: 0,
    streak: 0,
    timeLeft: CONFIG.TIME_PER_QUESTION,
    timer: null,
    answered: false,
    loading: false,
    started: false,
    language: "rw",
    mode: "traffic",
    answers: [],
    sessionVersion: 1
  };

  let loadPromise = null;
  let sessionToken = 0;

  const t = (rw, en) => state.language === "en" ? en : rw;

  function safeJSON(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readObject(key) {
    const value = safeJSON(localStorage.getItem(key) || "{}", {});
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  function readArray(key) {
    const value = safeJSON(localStorage.getItem(key) || "[]", []);
    return Array.isArray(value) ? value : [];
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn("Quiz Master: Could not save preference.", error);
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Quiz Master: Could not save data.", error);
      return false;
    }
  }

  function getLanguage() {
    return localStorage.getItem(KEYS.language) === "en" ? "en" : "rw";
  }

  function getMode() {
    const value = String(
      localStorage.getItem(KEYS.mode) || "traffic"
    ).toLowerCase();

    if (["general", "knowledge", "rusange", "ubumenyi"].includes(value)) {
      return "general";
    }

    return "traffic";
  }

  function showError(message) {
    console.error("Quiz Master:", message);

    const element = $("quizError") || $("errorMessage");

    if (element) {
      element.textContent = String(message);
      element.style.display = "block";
    }
  }

  function clearError() {
    ["quizError", "errorMessage"].forEach(id => {
      const element = $(id);
      if (element) {
        element.textContent = "";
        element.style.display = "none";
      }
    });
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
      screen.style.display = "none";
    });

    const screen = $(id);

    if (screen) {
      screen.classList.add("active");
      screen.style.display = "block";
    } else {
      console.error("Quiz Master: Screen not found:", id);
    }

    clearError();
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("quizmaster:" + name, { detail })
    );
  }

  function localisedValue(item, base, language) {
    const keys = language === "en"
      ? [`${base}_en`, `${base}En`, `en_${base}`]
      : [`${base}_rw`, `${base}_kin`, `${base}Rw`, `rw_${base}`];

    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) {
        return item[key];
      }
    }

    return item[base];
  }

  function normaliseCategory(value) {
    const category = String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

    if (!category) return "";

    const generalWords = [
      "general", "general knowledge", "knowledge",
      "ubumenyi rusange", "rusange", "ubumenyi"
    ];

    const trafficWords = [
      "traffic", "road", "road safety", "road traffic",
      "traffic rules", "amategeko yumuhanda",
      "amategeko y'umuhanda", "umuhanda",
      "ibinyabiziga", "road safety rules"
    ];

    if (generalWords.some(word => category === word || category.includes(word))) {
      return "general";
    }

    if (trafficWords.some(word => category === word || category.includes(word))) {
      return "traffic";
    }

    return category;
  }

  function getRawCategory(item) {
    return item.category ??
      item.mode ??
      item.type ??
      item.topic ??
      item.quizType ??
      item.quiz_type ??
      "";
  }

  function normaliseQuestion(raw, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }

    const question = String(
      localisedValue(raw, "question", state.language) ?? ""
    ).trim();

    const rawOptions = localisedValue(raw, "options", state.language);

    if (!question || !Array.isArray(rawOptions)) {
      console.warn(`Question ${index + 1}: missing question/options.`);
      return null;
    }

    const options = rawOptions
      .map(option => String(option ?? "").trim())
      .filter(Boolean);

    if (options.length < 2) {
      console.warn(`Question ${index + 1}: fewer than two options.`);
      return null;
    }

    const rawAnswer = localisedValue(raw, "answer", state.language);

    if (rawAnswer === undefined || rawAnswer === null) {
      console.warn(`Question ${index + 1}: missing answer.`);
      return null;
    }

    const answer = String(rawAnswer).trim();

    const correctOption = options.find(
      option => option.toLocaleLowerCase() === answer.toLocaleLowerCase()
    );

    if (!correctOption) {
      console.warn(
        `Question ${index + 1}: answer does not match an option.`,
        raw
      );
      return null;
    }

    const explanation = String(
      localisedValue(raw, "explanation", state.language) ?? ""
    ).trim();

    return {
      id: String(raw.id ?? raw.question_id ?? index + 1),
      question,
      options,
      answer: correctOption,
      explanation,
      category: normaliseCategory(getRawCategory(raw)),
      originalIndex: index
    };
  }

  function getUnlockedRound() {
    const key = `${KEYS.unlocked}_${state.mode}`;
    const stored = Number(localStorage.getItem(key) || 1);

    return Math.max(
      1,
      Math.min(
        Number.isFinite(stored) && stored > 0 ? stored : 1,
        Math.max(1, state.totalRounds)
      )
    );
  }

  function getRoundQuestions(round) {
    const start = (round - 1) * CONFIG.QUESTIONS_PER_ROUND;
    return state.questions.slice(
      start,
      start + CONFIG.QUESTIONS_PER_ROUND
    );
  }

  function updateText(ids, value) {
    ids.forEach(id => {
      const element = $(id);
      if (element) element.textContent = String(value);
    });
  }

  function updateRoundsDisplay() {
    ["totalRounds", "roundsCount", "availableRounds"].forEach(id => {
      const element = $(id);
      if (element) element.textContent = String(state.totalRounds);
    });
  }

  function updateProgress() {
    const total = state.currentQuestions.length;
    const current = Math.min(state.questionIndex + 1, total || 1);

    updateText(["currentQuestionNumber", "questionNumber"], current);
    updateText(["questionCount", "totalQuestions"], total);
    updateText(["currentRound", "roundNumber"], state.round);
    updateText(["score", "currentScore"], state.score);

    const bar = $("progressBar");
    if (bar) {
      const percent = total
        ? (state.questionIndex / total) * 100
        : 0;
      bar.style.width = `${percent}%`;
    }
  }

  function stopTimer() {
    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(KEYS.session);
    } catch (error) {
      console.warn("Could not clear saved session.", error);
    }
  }

  function saveSession() {
    if (!state.started) return;

    saveJSON(KEYS.session, {
      version: state.sessionVersion,
      language: state.language,
      mode: state.mode,
      round: state.round,
      questionIndex: state.questionIndex,
      score: state.score,
      roundCorrect: state.roundCorrect,
      streak: state.streak,
      timeLeft: state.timeLeft,
      answered: state.answered,
      answers: state.answers
    });
  }

  function publishReview() {
    saveJSON(KEYS.review, state.answers);
    emit("review-data", state.answers);
  }

  async function loadQuestions(force = false) {
    if (loadPromise && !force) return loadPromise;

    loadPromise = (async () => {
      state.loading = true;
      clearError();

      try {
        state.language = getLanguage();
        state.mode = getMode();

        const response = await fetch(
          `${CONFIG.QUESTIONS_FILE}?v=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            `Could not load questions.json (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        const rawQuestions = Array.isArray(data)
          ? data
          : Array.isArray(data.questions)
            ? data.questions
            : Array.isArray(data.data)
              ? data.data
              : null;

        if (!rawQuestions) {
          throw new Error(
            "questions.json must be an array or contain a questions array."
          );
        }

        state.allQuestions = rawQuestions;

        const normalised = rawQuestions
          .map((raw, index) => normaliseQuestion(raw, index))
          .filter(Boolean);

        // Strict category filtering: unlabelled questions are not mixed
        // into both categories.
        state.questions = normalised.filter(question =>
          question.category === state.mode
        );

        state.totalRounds = Math.ceil(
          state.questions.length / CONFIG.QUESTIONS_PER_ROUND
        );

        if (!state.questions.length) {
          const hasUnlabelled = normalised.some(q => !q.category);

          throw new Error(
            hasUnlabelled
              ? t(
                  "Nta bibazo by'iki cyiciro byabonetse. Reba ko buri kibazo muri questions.json gifite category nka traffic cyangwa general.",
                  "No questions found for this category. Make sure each question in questions.json has a category such as traffic or general."
                )
              : t(
                  "Nta bibazo byemewe bihuye n'ururimi n'icyiciro wahisemo. Reba options, answer na category muri questions.json.",
                  "No valid questions match your language and category. Check options, answer, and category in questions.json."
                )
          );
        }

        const unlockedKey = `${KEYS.unlocked}_${state.mode}`;
        const oldUnlocked = Number(localStorage.getItem(unlockedKey) || 1);

        save(
          unlockedKey,
          Math.max(1, Math.min(oldUnlocked || 1, state.totalRounds))
        );

        updateRoundsDisplay();

        console.info(
          `Quiz Master: ${state.questions.length} questions; ${state.totalRounds} rounds; category=${state.mode}.`
        );

        return true;
      } catch (error) {
        showError(error.message || t(
          "Habaye ikibazo mu gufungura ibibazo.",
          "There was a problem loading questions."
        ));
        return false;
      } finally {
        state.loading = false;
        loadPromise = null;
      }
    })();

    return loadPromise;
  }

  function startTimer() {
    stopTimer();

    const token = sessionToken;

    updateText(["timer", "timeLeft", "countdown"], state.timeLeft);

    state.timer = setInterval(() => {
      if (token !== sessionToken || !state.started || state.answered) {
        return;
      }

      state.timeLeft -= 1;
      updateText(["timer", "timeLeft", "countdown"], state.timeLeft);
      saveSession();

      if (state.timeLeft <= 0) {
        stopTimer();
        chooseAnswer(null, null);
      }
    }, 1000);
  }

  function renderQuestion() {
    stopTimer();

    if (!state.started) return;

    if (state.questionIndex >= state.currentQuestions.length) {
      finishRound();
      return;
    }

    const question = state.currentQuestions[state.questionIndex];

    if (!question) {
      showError(t(
        "Ikibazo ntikibonetse. Ongera utangize round.",
        "Question not found. Please restart the round."
      ));
      return;
    }

    state.answered = false;
    state.timeLeft = CONFIG.TIME_PER_QUESTION;

    updateProgress();
    updateText(["questionText", "question"], question.question);

    const container = $("optionsContainer");

    if (!container) {
      showError("index.html is missing optionsContainer.");
      return;
    }

    container.replaceChildren();

    question.options.forEach((option, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-btn";
      button.dataset.optionIndex = String(index);
      button.textContent = option;

      button.addEventListener("click", () => chooseAnswer(option, button));

      container.appendChild(button);
    });

    const explanation = $("explanation");
    if (explanation) {
      explanation.textContent = "";
      explanation.style.display = "none";
    }

    const nextButton = $("nextQuestionBtn");
    if (nextButton) {
      nextButton.style.display = "none";
      nextButton.disabled = false;
    }

    saveSession();
    startTimer();
  }

  function chooseAnswer(selectedOption, selectedButton) {
    if (!state.started || state.answered) return;

    const question = state.currentQuestions[state.questionIndex];
    if (!question) return;

    state.answered = true;
    stopTimer();

    const correct = selectedOption !== null &&
      selectedOption === question.answer;

    document.querySelectorAll("#optionsContainer .answer-btn")
      .forEach(button => {
        button.disabled = true;

        if (button.textContent === question.answer) {
          button.classList.add("correct");
        }

        if (button === selectedButton && !correct) {
          button.classList.add("incorrect");
        }
      });

    if (correct) {
      state.score += CONFIG.POINTS_PER_CORRECT;
      state.roundCorrect += 1;
      state.streak += 1;

      if (state.streak % CONFIG.BONUS_EVERY_CORRECT === 0) {
        state.score += CONFIG.BONUS_POINTS;
      }

      save(
        KEYS.totalScore,
        Number(localStorage.getItem(KEYS.totalScore) || 0) +
          CONFIG.POINTS_PER_CORRECT
      );
    } else {
      state.streak = 0;
    }

    save(KEYS.streak, state.streak);

    const record = {
      id: question.id,
      question: question.question,
      options: question.options,
      selectedAnswer: selectedOption,
      correctAnswer: question.answer,
      answer: question.answer,
      isCorrect: correct,
      explanation: question.explanation,
      category: state.mode,
      language: state.language,
      round: state.round,
      questionNumber: state.questionIndex + 1
    };

    const oldIndex = state.answers.findIndex(
      item => item.id === record.id &&
        item.round === record.round &&
        item.questionNumber === record.questionNumber
    );

    if (oldIndex >= 0) {
      state.answers[oldIndex] = record;
    } else {
      state.answers.push(record);
    }

    publishReview();

    updateText(["score", "currentScore"], state.score);

    const explanation = $("explanation");

    if (explanation) {
      let message = "";

      if (selectedOption === null) {
        message += t("Igihe kirangiye. ", "Time is up. ");
      }

      message += correct
        ? t("Igisubizo ni cyo! ", "Correct answer! ")
        : t("Igisubizo nyacyo: ", "Correct answer: ");

      message += question.answer;

      if (question.explanation) {
        message += ` — ${question.explanation}`;
      }

      explanation.textContent = message;
      explanation.style.display = "block";
    }

    const nextButton = $("nextQuestionBtn");

    if (nextButton) {
      nextButton.textContent =
        state.questionIndex + 1 >= state.currentQuestions.length
          ? t("Reba amanota", "View Results")
          : t("Ikibazo gikurikira", "Next Question");

      nextButton.style.display = "block";
      nextButton.disabled = false;
    }

    saveSession();
  }

  function nextQuestion() {
    if (!state.started || !state.answered) return;

    stopTimer();
    state.questionIndex += 1;

    if (state.questionIndex >= state.currentQuestions.length) {
      finishRound();
    } else {
      renderQuestion();
    }
  }

  function finishRound() {
    if (!state.started) return;

    stopTimer();

    const total = state.currentQuestions.length;
    const percent = total
      ? Math.round((state.roundCorrect / total) * 100)
      : 0;

    const stars = percent >= 80 ? 3 : percent >= 60 ? 2 : 1;
    const starKey = `${state.mode}_${state.round}`;

    const starsData = readObject(KEYS.stars);
    starsData[starKey] = Math.max(
      Number(starsData[starKey] || 0),
      stars
    );
    saveJSON(KEYS.stars, starsData);

    const completedKey = `${state.mode}_${state.round}`;
    const completed = readArray(KEYS.completed);

    if (!completed.includes(completedKey)) {
      completed.push(completedKey);
    }
    saveJSON(KEYS.completed, completed);

    const progress = readObject(KEYS.progress);
    progress[completedKey] = {
      score: state.score,
      correct: state.roundCorrect,
      total,
      percent
    };
    saveJSON(KEYS.progress, progress);

    if (percent >= CONFIG.UNLOCK_PERCENT && state.round < state.totalRounds) {
      const unlockedKey = `${KEYS.unlocked}_${state.mode}`;
      const oldUnlocked = Number(localStorage.getItem(unlockedKey) || 1);

      save(
        unlockedKey,
        Math.max(oldUnlocked, state.round + 1)
      );
    }

    const oldBest = Number(localStorage.getItem(KEYS.best) || 0);
    if (state.score > oldBest) save(KEYS.best, state.score);

    updateText(["resultScore", "finalScore"], state.score);
    updateText(["correctAnswers", "roundCorrect"], state.roundCorrect);
    updateText(["totalQuestionsResult"], total);
    updateText(["resultPercent", "roundPercent"], `${percent}%`);
    updateText(["roundStars", "resultStars"], "★".repeat(stars));
    updateText(["resultRound", "finishedRound"], state.round);

    const message = $("resultMessage");
    if (message) {
      message.textContent = percent >= CONFIG.UNLOCK_PERCENT
        ? t(
            "Wakoze neza! Round ikurikira irafungutse niba ihari.",
            "Well done! The next round is unlocked if available."
          )
        : t(
            "Komeza witoze. Ukeneye nibura 60% kugira ngo ufungure round ikurikira.",
            "Keep practising. You need at least 60% to unlock the next round."
          );
    }

    const nextButton = $("resultNextBtn");
    if (nextButton) {
      const available = percent >= CONFIG.UNLOCK_PERCENT &&
        state.round < state.totalRounds;

      nextButton.disabled = !available;
      nextButton.style.display =
        state.round < state.totalRounds ? "block" : "none";
    }

    state.started = false;
    state.answered = false;
    publishReview();
    clearSession();

    renderRounds();
    showScreen("resultScreen");
  }

  async function startQuiz(round = 1) {
    clearError();

    if (state.loading) return;

    state.language = getLanguage();
    state.mode = getMode();

    if (!state.questions.length) {
      const loaded = await loadQuestions();
      if (!loaded) return;
    }

    if (!state.totalRounds) {
      showError(t("Nta rounds ziboneka.", "No rounds are available."));
      return;
    }

    const chosenRound = Math.max(
      1,
      Math.min(Number(round) || 1, state.totalRounds)
    );

    if (chosenRound > getUnlockedRound()) {
      showError(t(
        "Banza urangize round ibanziriza iyi ufite nibura 60%.",
        "Complete the previous round with at least 60% first."
      ));
      return;
    }

    stopTimer();
    sessionToken += 1;

    state.round = chosenRound;
    state.currentQuestions = getRoundQuestions(chosenRound);
    state.questionIndex = 0;
    state.score = 0;
    state.roundCorrect = 0;
    state.streak = 0;
    state.answers = [];
    state.timeLeft = CONFIG.TIME_PER_QUESTION;
    state.answered = false;
    state.started = true;

    if (!state.currentQuestions.length) {
      state.started = false;
      showError(t(
        "Nta bibazo biri muri iyi round.",
        "This round has no questions."
      ));
      return;
    }

    saveJSON(KEYS.review, []);
    emit("review-data", []);
    showScreen("quizScreen");
    renderQuestion();
  }

  async function beginSelectedSetup(detail = {}) {
    stopTimer();
    sessionToken += 1;

    state.language = detail.language === "en" ? "en" : "rw";
    state.mode = detail.mode === "general" ? "general" : "traffic";

    save(KEYS.language, state.language);
    save(KEYS.mode, state.mode);

    state.questions = [];
    state.currentQuestions = [];
    state.started = false;
    state.answers = [];

    clearSession();

    const loaded = await loadQuestions(true);
    if (!loaded) {
      showScreen("gameSetup");
      return;
    }

    await startQuiz(1);
  }

  function renderRounds() {
    const container = $("roundsContainer");
    if (!container) return;

    container.replaceChildren();

    const unlocked = getUnlockedRound();
    const stars = readObject(KEYS.stars);

    for (let round = 1; round <= state.totalRounds; round++) {
      const button = document.createElement("button");
      const key = `${state.mode}_${round}`;
      const count = Number(stars[key] || 0);

      button.type = "button";
      button.className = "round-btn";
      button.textContent =
        `${round} — ${"★".repeat(count)}` +
        (round > unlocked ? " 🔒" : "");

      button.disabled = round > unlocked;
      button.addEventListener("click", () => startQuiz(round));

      container.appendChild(button);
    }

    updateRoundsDisplay();
  }

  async function showRounds() {
    state.language = getLanguage();
    state.mode = getMode();

    const loaded = await loadQuestions();
    if (!loaded) return;

    renderRounds();
    showScreen("roundsScreen");
  }

  async function continueQuiz() {
    clearError();

    const saved = localStorage.getItem(KEYS.session);

    if (!saved) {
      showError(t(
        "Nta mukino wabitswe wo gukomeza. Tangira umukino mushya.",
        "No saved game found. Start a new quiz."
      ));
      showScreen("homeScreen");
      return;
    }

    const session = safeJSON(saved, null);

    if (!session || typeof session !== "object") {
      clearSession();
      showError(t(
        "Umukino wabitswe ntiwafungutse.",
        "The saved game could not be loaded."
      ));
      return;
    }

    if (
      session.language !== getLanguage() ||
      session.mode !== getMode()
    ) {
      showError(t(
        "Ururimi cyangwa icyiciro byarahindutse. Hitamo icyari cyakoreshejwe cyangwa utangire umukino mushya.",
        "The saved game's language or category has changed. Restore the original settings or start a new quiz."
      ));
      return;
    }

    state.language = session.language;
    state.mode = session.mode;

    const loaded = await loadQuestions(true);
    if (!loaded) return;

    await resumeSession(session);
  }

  async function resumeSession(session) {
    state.round = Number(session.round) || 1;

    if (state.round > state.totalRounds) {
      clearSession();
      showError(t(
        "Round yabitswe ntikiboneka.",
        "The saved round is no longer available."
      ));
      return;
    }

    state.currentQuestions = getRoundQuestions(state.round);

    if (!state.currentQuestions.length) {
      clearSession();
      showError(t(
        "Nta bibazo by'iyi round bibonetse.",
        "No questions were found for this round."
      ));
      return;
    }

    state.questionIndex = Math.max(
      0,
      Math.min(
        Number(session.questionIndex) || 0,
        state.currentQuestions.length - 1
      )
    );

    state.score = Number(session.score) || 0;
    state.roundCorrect = Number(session.roundCorrect) || 0;
    state.streak = Number(session.streak) || 0;
    state.timeLeft = Math.max(
      1,
      Math.min(
        CONFIG.TIME_PER_QUESTION,
        Number(session.timeLeft) || CONFIG.TIME_PER_QUESTION
      )
    );

    state.answers = Array.isArray(session.answers)
      ? session.answers
      : readArray(KEYS.review);

    state.answered = Boolean(session.answered);
    state.started = true;
    sessionToken += 1;

    showScreen("quizScreen");

    if (state.answered) {
      // Re-render the current question and restore the previous answer.
      const question = state.currentQuestions[state.questionIndex];
      const record = state.answers.find(item =>
        item.id === question.id &&
        item.round === state.round &&
        item.questionNumber === state.questionIndex + 1
      );

      if (!record) {
        state.answered = false;
        renderQuestion();
        return;
      }

      renderQuestion();
      stopTimer();

      state.answered = false;

      const selected = record.selectedAnswer;
      const buttons = document.querySelectorAll(
        "#optionsContainer .answer-btn"
      );

      let selectedButton = null;
      buttons.forEach(button => {
        if (button.textContent === selected) {
          selectedButton = button;
        }
      });

      chooseAnswer(selected, selectedButton);
      state.answered = true;
      stopTimer();
      saveSession();
    } else {
      renderQuestion();
    }
  }

  // The supplied index.html also installs a click listener on this button.
  // Use the event listener protocol to avoid double-advancing questions.
  function bindEngineButtons() {
    const nextButton = $("nextQuestionBtn");

    if (nextButton && !nextButton.dataset.engineBound) {
      nextButton.dataset.engineBound = "true";
      nextButton.addEventListener("click", nextQuestion);
    }

    const homeButton = $("quizHomeBtn");

    if (homeButton && !homeButton.dataset.engineBound) {
      homeButton.dataset.engineBound = "true";

      homeButton.addEventListener("click", () => {
        stopTimer();
        saveSession();
        state.started = false;
      });
    }
  }

  // Integration events emitted by the supplied index.html.
  window.addEventListener("quizmaster:setup", event => {
    beginSelectedSetup(event.detail || {});
  });

  window.addEventListener("quizmaster:continue", () => {
    continueQuiz();
  });

  window.addEventListener("quizmaster:show-rounds", () => {
    showRounds();
  });

  window.addEventListener("quizmaster:retry", () => {
    startQuiz(state.round);
  });

  window.addEventListener("quizmaster:next-round", () => {
    if (
      state.round < state.totalRounds &&
      state.round + 1 <= getUnlockedRound()
    ) {
      startQuiz(state.round + 1);
    }
  });

  window.addEventListener("quizmaster:next-question", () => {
    nextQuestion();
  });

  window.addEventListener("quizmaster:review-answers", () => {
    publishReview();
  });

  document.addEventListener("DOMContentLoaded", async () => {
    bindEngineButtons();

    state.language = getLanguage();
    state.mode = getMode();

    // Prepare rounds and allow the user to start from the setup screen.
    const loaded = await loadQuestions();

    const continueButton = $("continueBtn");
    if (continueButton) {
      continueButton.disabled = !localStorage.getItem(KEYS.session);
    }

    const reviewButton = $("reviewAnswersBtn");
    if (reviewButton) {
      reviewButton.disabled = readArray(KEYS.review).length === 0;
    }

    if (loaded) renderRounds();
  });
})();
