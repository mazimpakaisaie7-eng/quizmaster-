/* =========================================================
   QUIZ MASTER 🇷🇼 - QUESTIONS + RETENTION FEATURES
   File: questions.js

   SAFE VERSION
   ---------------------------------------------------------
   - Keeps existing HTML IDs
   - Keeps existing design/layout
   - Does NOT inject new CSS
   - Does NOT inject new visible cards
   - Uses existing questions.json
   - Keeps Start Quiz working
   - Keeps Continue Quiz working
   - Keeps existing scoring/timer
   - Adds streaks, stars, achievements
   - Adds Daily Challenge
   - Keeps Share button
   - Keeps AdSense safe
========================================================= */

(function () {
  "use strict";

  /* ========================================================
     CONFIG
  ======================================================== */

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const TOTAL_ROUNDS = 10;
  const UNLOCK_PERCENT = 60;
  const QUESTIONS_FILE = "./questions.json";

  const STORAGE = {
    progress: "quizmasterProgress",
    unlocked: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",

    music: "quizmasterMusic",
    sound: "quizmasterSound",

    completed: "quizmasterCompletedRounds",
    stars: "quizmasterRoundStars",
    achievements: "quizmasterAchievements",
    best: "quizmasterPersonalBest",
    totalScore: "quizmasterTotalScore",

    daily: "quizmasterDailyChallenge",
    usedQuestions: "quizmasterUsedQuestions"
  };

  /* ========================================================
     STATE
  ======================================================== */

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
  let quizStarted = false;

  let reviewAnswers = [];

  let currentStreak = 0;
  let bestStreak = 0;
  let streakBonus = 0;

  let quizMode = "round";
  let dailyDate = "";

  /* ========================================================
     DOM HELPER
  ======================================================== */

  const $ = (id) => document.getElementById(id);

  /* ========================================================
     SCREEN
     
     IMPORTANT:
     Do not force display:block here.
     Existing CSS controls the layout.
  ======================================================== */

  function showScreen(id) {
    document
      .querySelectorAll(".screen")
      .forEach((screen) => {
        screen.classList.remove("active");
      });

    const target = $(id);

    if (target) {
      target.classList.add("active");
    }

    try {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (error) {
      window.scrollTo(0, 0);
    }
  }

  /* ========================================================
     STORAGE
  ======================================================== */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn(
        "Quiz Master storage error:",
        error
      );
    }
  }

  /* ========================================================
     DATE
  ======================================================== */

  function todayKey() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  /* ========================================================
     SHUFFLE
  ======================================================== */

  function shuffleArray(array) {
    const copy = Array.isArray(array)
      ? array.slice()
      : [];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [
        copy[i],
        copy[j]
      ] = [
        copy[j],
        copy[i]
      ];
    }

    return copy;
  }

  /* ========================================================
     UNLOCKED ROUNDS
  ======================================================== */

  function getUnlockedRounds() {
    const saved = readJSON(
      STORAGE.unlocked,
      [1]
    );

    const list = Array.isArray(saved)
      ? saved
      : [1];

    if (!list.includes(1)) {
      list.push(1);
    }

    return [
      ...new Set(
        list
          .map(Number)
          .filter(
            (n) =>
              Number.isInteger(n) &&
              n >= 1 &&
              n <= TOTAL_ROUNDS
          )
      )
    ].sort((a, b) => a - b);
  }

  function setUnlockedRounds(list) {
    const cleaned = [
      ...new Set(
        list
          .map(Number)
          .filter(
            (n) =>
              Number.isInteger(n) &&
              n >= 1 &&
              n <= TOTAL_ROUNDS
          )
      )
    ].sort((a, b) => a - b);

    if (!cleaned.includes(1)) {
      cleaned.unshift(1);
    }

    writeJSON(
      STORAGE.unlocked,
      cleaned
    );
  }

  /* ========================================================
     COMPLETED ROUNDS
  ======================================================== */

  function getCompletedRounds() {
    const data = readJSON(
      STORAGE.completed,
      []
    );

    return Array.isArray(data)
      ? [
          ...new Set(
            data
              .map(Number)
              .filter(
                (n) =>
                  Number.isInteger(n) &&
                  n >= 1 &&
                  n <= TOTAL_ROUNDS
              )
          )
        ]
      : [];
  }

  function markRoundCompleted(round) {
    const completed =
      getCompletedRounds();

    if (!completed.includes(round)) {
      completed.push(round);

      completed.sort(
        (a, b) => a - b
      );

      writeJSON(
        STORAGE.completed,
        completed
      );
    }
  }

  /* ========================================================
     STARS
  ======================================================== */

  function getRoundStars() {
    const data = readJSON(
      STORAGE.stars,
      {}
    );

    return data &&
      typeof data === "object" &&
      !Array.isArray(data)
      ? data
      : {};
  }

  function saveRoundStars(round, stars) {
    const data =
      getRoundStars();

    const key = String(round);

    data[key] = Math.max(
      Number(data[key] || 0),
      Number(stars) || 0
    );

    writeJSON(
      STORAGE.stars,
      data
    );
  }

  function starsForPercent(percent) {
    if (percent >= 80) {
      return 3;
    }

    if (percent >= 60) {
      return 2;
    }

    return 1;
  }

  /* ========================================================
     PERSONAL BEST
  ======================================================== */

  function getBestData() {
    const data = readJSON(
      STORAGE.best,
      {
        bestRoundScore: 0,
        bestPercent: 0,
        bestStreak: 0,
        totalCorrect: 0
      }
    );

    return {
      bestRoundScore:
        Number(data.bestRoundScore) || 0,

      bestPercent:
        Number(data.bestPercent) || 0,

      bestStreak:
        Number(data.bestStreak) || 0,

      totalCorrect:
        Number(data.totalCorrect) || 0
    };
  }

  function updatePersonalBest() {
    const best =
      getBestData();

    const percent = Math.round(
      (
        correctCount /
        Math.max(
          currentQuestions.length,
          1
        )
      ) * 100
    );

    best.bestRoundScore =
      Math.max(
        best.bestRoundScore,
        score
      );

    best.bestPercent =
      Math.max(
        best.bestPercent,
        percent
      );

    best.bestStreak =
      Math.max(
        best.bestStreak,
        bestStreak
      );

    best.totalCorrect +=
      correctCount;

    writeJSON(
      STORAGE.best,
      best
    );

    return best;
  }

  /* ========================================================
     ACHIEVEMENTS
  ======================================================== */

  function getAchievements() {
    const data = readJSON(
      STORAGE.achievements,
      []
    );

    return Array.isArray(data)
      ? data
      : [];
  }

  function unlockAchievement(
    id,
    title,
    description
  ) {
    const achievements =
      getAchievements();

    if (
      achievements.some(
        (item) =>
          item &&
          item.id === id
      )
    ) {
      return false;
    }

    achievements.push({
      id,
      title,
      description,
      date: todayKey()
    });

    writeJSON(
      STORAGE.achievements,
      achievements
    );

    return true;
  }

  function checkAchievements(percent) {
    const completed =
      getCompletedRounds();

    const best =
      getBestData();

    const unlocked =
      getUnlockedRounds();

    const newlyUnlocked = [];

    const candidates = [
      [
        "first_round",
        "🎯 First Round",
        "Completed your first quiz round.",
        completed.length >= 1
      ],

      [
        "streak_3",
        "🔥 Hot Streak",
        "Reached a 3-answer streak.",
        best.bestStreak >= 3
      ],

      [
        "streak_5",
        "🔥 Streak Master",
        "Reached a 5-answer streak.",
        best.bestStreak >= 5
      ],

      [
        "rounds_5",
        "🏆 Five Rounds",
        "Completed 5 quiz rounds.",
        completed.length >= 5
      ],

      [
        "correct_50",
        "🥇 50 Correct",
        "Answered 50 questions correctly.",
        best.totalCorrect >= 50
      ],

      [
        "score_500",
        "💎 500 Points",
        "Earned at least 500 points in a round.",
        best.bestRoundScore >= 500
      ],

      [
        "perfect_round",
        "⭐ Perfect Round",
        "Scored 100% in a round.",
        percent === 100
      ],

      [
        "all_rounds",
        "👑 Quiz Master",
        "Unlocked all 10 rounds.",
        unlocked.length >= TOTAL_ROUNDS
      ]
    ];

    candidates.forEach(
      (item) => {
        const [
          id,
          title,
          description,
          condition
        ] = item;

        if (
          condition &&
          unlockAchievement(
            id,
            title,
            description
          )
        ) {
          newlyUnlocked.push({
            id,
            title,
            description
          });
        }
      }
    );

    return newlyUnlocked;
  }

  /* ========================================================
     STREAK
  ======================================================== */

  function resetStreak() {
    currentStreak = 0;
  }

  function registerCorrectAnswer() {
    currentStreak += 1;

    bestStreak = Math.max(
      bestStreak,
      currentStreak
    );

    let bonus = 0;

    /*
      Every 3 consecutive correct
      answers gives +5 bonus points.
    */

    if (
      currentStreak >= 3 &&
      currentStreak % 3 === 0
    ) {
      bonus = 5;

      score += bonus;

      streakBonus += bonus;
    }

    return bonus;
  }

  /* ========================================================
     QUESTIONS
  ======================================================== */

  async function loadQuestions() {
    try {
      const response =
        await fetch(
          QUESTIONS_FILE,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Could not load questions.json"
        );
      }

      const data =
        await response.json();

      if (
        !validateQuestions(data)
      ) {
        throw new Error(
          "questions.json format is invalid."
        );
      }

      allQuestions = data;

      return true;
    } catch (error) {
      console.error(
        "Quiz Master question loading error:",
        error
      );

      showError(
        "Quiz questions could not be loaded. Please check that questions.json is in the same folder as questions.js."
      );

      return false;
    }
  }

  function validateQuestions(data) {
    if (
      !Array.isArray(data) ||
      data.length <
        QUESTIONS_PER_ROUND
    ) {
      return false;
    }

    return data.every(
      (q) =>
        q &&
        typeof q.question ===
          "string" &&
        q.question.trim() !== "" &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.answer ===
          "string" &&
        q.options.includes(
          q.answer
        )
    );
  }

  /* ========================================================
     USED QUESTIONS
  ======================================================== */

  function getUsedQuestions() {
    const data =
      readJSON(
        STORAGE.usedQuestions,
        []
      );

    return Array.isArray(data)
      ? data.filter(
          (item) =>
            typeof item ===
            "string"
        )
      : [];
  }

  function saveUsedQuestions(list) {
    const max =
      Math.max(
        allQuestions.length,
        100
      );

    /*
      Keep only unique question names.
    */

    const cleaned = [
      ...new Set(
        list.filter(
          (item) =>
            typeof item ===
            "string"
        )
      )
    ];

    /*
      If everything has been used,
      start a new cycle.
    */

    const finalList =
      cleaned.length >=
      allQuestions.length
        ? []
        : cleaned.slice(-max);

    writeJSON(
      STORAGE.usedQuestions,
      finalList
    );
  }

  function rememberQuestions(questions) {
    const used =
      getUsedQuestions();

    questions.forEach(
      (q) => {
        if (
          q &&
          typeof q.question ===
            "string"
        ) {
          if (
            !used.includes(
              q.question
            )
          ) {
            used.push(
              q.question
            );
          }
        }
      }
    );

    saveUsedQuestions(
      used
    );
  }

  /* ========================================================
     ROUND QUESTIONS
     
     Existing 100+ question behavior
     remains supported.

     If enough questions exist,
     avoid previously completed
     questions where possible.
  ======================================================== */

  function getQuestionsForRound(round) {
    if (!allQuestions.length) {
      return [];
    }

    const used =
      new Set(
        getUsedQuestions()
      );

    let available =
      allQuestions.filter(
        (q) =>
          !used.has(q.question)
      );

    /*
      Start a new cycle if there
      are not enough unused questions.
    */

    if (
      available.length <
      QUESTIONS_PER_ROUND
    ) {
      available =
        allQuestions.slice();

      /*
        Do not erase storage here.
        The new cycle will naturally
        begin with the current round.
      */

      if (
        allQuestions.length >=
        QUESTIONS_PER_ROUND
      ) {
        writeJSON(
          STORAGE.usedQuestions,
          []
        );
      }
    }

    /*
      Preserve dedicated round
      ordering when no used-question
      cycle is active and enough
      questions exist.
    */

    const start =
      (round - 1) *
      QUESTIONS_PER_ROUND;

    const end =
      start +
      QUESTIONS_PER_ROUND;

    if (
      allQuestions.length >=
        end &&
      getUsedQuestions().length === 0
    ) {
      return shuffleArray(
        allQuestions.slice(
          start,
          end
        )
      );
    }

    /*
      Otherwise select from the
      unused pool.
    */

    return shuffleArray(
      available
    ).slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        available.length
      )
    );
  }

  /* ========================================================
     DAILY CHALLENGE
  ======================================================== */

  function getDailyQuestions() {
    const date =
      todayKey();

    let seed = 0;

    for (
      let i = 0;
      i < date.length;
      i++
    ) {
      seed =
        (
          (seed << 5) -
          seed
        ) +
        date.charCodeAt(i);

      seed |= 0;
    }

    const pool =
      allQuestions.slice();

    function seededRandom() {
      seed =
        (
          seed * 1664525 +
          1013904223
        ) >>> 0;

      return (
        seed /
        4294967296
      );
    }

    for (
      let i =
        pool.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          seededRandom() *
          (i + 1)
        );

      [
        pool[i],
        pool[j]
      ] = [
        pool[j],
        pool[i]
      ];
    }

    return pool.slice(
      0,
      Math.min(
        QUESTIONS_PER_ROUND,
        pool.length
      )
    );
  }

  /* ========================================================
     QUIZ STATE
  ======================================================== */

  function resetQuizState() {
    currentQuestionIndex = 0;

    score = 0;
    correctCount = 0;
    wrongCount = 0;

    timeLeft =
      TIME_PER_QUESTION;

    answered = false;

    reviewAnswers = [];

    currentStreak = 0;
    bestStreak = 0;
    streakBonus = 0;
  }

  /* ========================================================
     START NEW QUIZ
  ======================================================== */

  function startNewQuiz(roundNumber) {
    if (!allQuestions.length) {
      showMessage(
        "Questions are still loading. Please try again."
      );
      return;
    }

    const round =
      Number(roundNumber);

    if (
      !Number.isInteger(round) ||
      round < 1 ||
      round > TOTAL_ROUNDS
    ) {
      return;
    }

    if (
      !getUnlockedRounds()
        .includes(round)
    ) {
      showMessage(
        "🔒 This round is still locked."
      );

      return;
    }

    stopTimer();

    currentRound =
      round;

    quizMode =
      "round";

    dailyDate = "";

    resetQuizState();

    currentQuestions =
      getQuestionsForRound(
        currentRound
      );

    if (
      currentQuestions.length <
      QUESTIONS_PER_ROUND
    ) {
      /*
        Safe fallback if the
        questions file is smaller.
      */

      const shuffled =
        shuffleArray(
          allQuestions
        );

      currentQuestions = [];

      for (
        let i = 0;
        i < QUESTIONS_PER_ROUND;
        i++
      ) {
        currentQuestions.push(
          shuffled[
            i %
            shuffled.length
          ]
        );
      }
    }

    if (
      !currentQuestions.length
    ) {
      showError(
        "No questions are available for this round."
      );

      return;
    }

    quizStarted =
      true;

    saveQuizProgress();

    showScreen(
      "quizScreen"
    );

    renderQuestion();
  }

  /* ========================================================
     DAILY START
  ======================================================== */

  function startDailyChallenge() {
    if (
      !allQuestions.length
    ) {
      showMessage(
        "Questions are not loaded yet."
      );

      return;
    }

    const daily =
      readJSON(
        STORAGE.daily,
        {}
      );

    if (
      daily.date === todayKey() &&
      daily.completed === true
    ) {
      showMessage(
        "✅ Daily Challenge already completed today."
      );

      return;
    }

    stopTimer();

    quizMode =
      "daily";

    dailyDate =
      todayKey();

    currentRound = 1;

    resetQuizState();

    currentQuestions =
      getDailyQuestions();

    if (
      !currentQuestions.length
    ) {
      showError(
        "No questions are available for the Daily Challenge."
      );

      return;
    }

    quizStarted =
      true;

    writeJSON(
      STORAGE.daily,
      {
        date: dailyDate,
        completed: false
      }
    );

    saveQuizProgress();

    showScreen(
      "quizScreen"
    );

    renderQuestion();
  }

  /* ========================================================
     SAVE PROGRESS
  ======================================================== */

  function saveQuizProgress() {
    if (
      !quizStarted ||
      !currentQuestions.length
    ) {
      return;
    }

    writeJSON(
      STORAGE.progress,
      {
        mode: quizMode,
        dailyDate,
        round: currentRound,

        questionIndex:
          currentQuestionIndex,

        score,
        correctCount,
        wrongCount,

        timeLeft,

        currentStreak,
        bestStreak,
        streakBonus,

        reviewAnswers,

        questionIds:
          currentQuestions.map(
            (q) => q.question
          )
      }
    );

    writeJSON(
      STORAGE.currentRound,
      currentRound
    );
  }

  /* ========================================================
     CONTINUE
  ======================================================== */

  function continueQuiz() {
    if (!allQuestions.length) {
      showMessage(
        "Questions are still loading. Please try again."
      );
      return;
    }

    const saved =
      readJSON(
        STORAGE.progress,
        null
      );

    if (
      !saved ||
      !Array.isArray(
        saved.questionIds
      ) ||
      !saved.questionIds.length
    ) {
      startNewQuiz(
        getUnlockedRounds()[0] ||
          1
      );

      return;
    }

    const questionMap =
      new Map(
        allQuestions.map(
          (q) => [
            q.question,
            q
          ]
        )
      );

    currentQuestions =
      saved.questionIds
        .map(
          (id) =>
            questionMap.get(id)
        )
        .filter(Boolean);

    if (
      !currentQuestions.length
    ) {
      startNewQuiz(
        saved.round || 1
      );

      return;
    }

    quizMode =
      saved.mode === "daily"
        ? "daily"
        : "round";

    dailyDate =
      saved.dailyDate || "";

    currentRound =
      Number(
        saved.round
      ) || 1;

    currentQuestionIndex =
      Number.isFinite(
        Number(
          saved.questionIndex
        )
      )
        ? Number(
            saved.questionIndex
          )
        : 0;

    score =
      Number(
        saved.score
      ) || 0;

    correctCount =
      Number(
        saved.correctCount
      ) || 0;

    wrongCount =
      Number(
        saved.wrongCount
      ) || 0;

    /*
      IMPORTANT:
      Do not use || here because
      timeLeft can legitimately be 0.
    */

    const savedTime =
      Number(
        saved.timeLeft
      );

    timeLeft =
      Number.isFinite(savedTime) &&
      savedTime >= 0 &&
      savedTime <=
        TIME_PER_QUESTION
        ? savedTime
        : TIME_PER_QUESTION;

    currentStreak =
      Number(
        saved.currentStreak
      ) || 0;

    bestStreak =
      Number(
        saved.bestStreak
      ) || 0;

    streakBonus =
      Number(
        saved.streakBonus
      ) || 0;

    reviewAnswers =
      Array.isArray(
        saved.reviewAnswers
      )
        ? saved.reviewAnswers
        : [];

    if (
      currentQuestionIndex < 0
    ) {
      currentQuestionIndex = 0;
    }

    if (
      currentQuestionIndex >=
      currentQuestions.length
    ) {
      currentQuestionIndex =
        currentQuestions.length - 1;
    }

    quizStarted =
      true;

    showScreen(
      "quizScreen"
    );

    renderQuestion(
      true
    );
  }

  /* ========================================================
     RENDER QUESTION
  ======================================================== */

  function renderQuestion(
    isContinue = false
  ) {
    stopTimer();

    const q =
      currentQuestions[
        currentQuestionIndex
      ];

    if (!q) {
      finishQuiz();
      return;
    }

    answered = false;

    /*
      New question starts at 20 seconds.
      Continue keeps its saved timer.
    */

    if (!isContinue) {
      timeLeft =
        TIME_PER_QUESTION;
    }

    if ($("questionNumber")) {
      $("questionNumber")
        .textContent =
        `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    }

    if ($("roundDisplay")) {
      $("roundDisplay")
        .textContent =
        quizMode === "daily"
          ? "📅 Daily Challenge"
          : `Round ${currentRound}`;
    }

    if ($("score")) {
      $("score")
        .textContent =
        String(score);
    }

    if ($("timer")) {
      $("timer")
        .textContent =
        String(
          Math.max(
            0,
            timeLeft
          )
        );
    }

    if ($("category")) {
      $("category")
        .textContent =
        q.category ||
        "General Knowledge";
    }

    if ($("question")) {
      $("question")
        .textContent =
        q.question;
    }

    const progress =
      Math.round(
        (
          currentQuestionIndex /
          Math.max(
            currentQuestions.length,
            1
          )
        ) * 100
      );

    if ($("progressBar")) {
      $("progressBar")
        .style.width =
        `${progress}%`;
    }

    renderOptions(q);

    updateNextButton(false);

    /*
      If Continue restores a timer
      that has already reached 0,
      finish that question safely.
    */

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    startTimer();
  }

  /* ========================================================
     OPTIONS
  ======================================================== */

  function renderOptions(q) {
    const container =
      $("options");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    shuffleArray(
      q.options
    ).forEach(
      (option) => {
        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        /*
          Keep the existing class
          expected by the app.
        */

        button.className =
          "option-btn";

        button.textContent =
          option;

        button.addEventListener(
          "click",
          () => {
            selectAnswer(
              option,
              button
            );
          }
        );

        container.appendChild(
          button
        );
      }
    );
  }

  /* ========================================================
     ANSWER
  ======================================================== */

  function selectAnswer(
    selected,
    button
  ) {
    if (answered) {
      return;
    }

    answered = true;

    stopTimer();

    const q =
      currentQuestions[
        currentQuestionIndex
      ];

    if (!q) {
      return;
    }

    const isCorrect =
      selected === q.answer;

    document
      .querySelectorAll(
        "#options button"
      )
      .forEach(
        (btn) => {
          btn.disabled = true;

          if (
            btn.textContent ===
            q.answer
          ) {
            btn.classList.add(
              "correct"
            );
          }
        }
      );

    if (isCorrect) {
      correctCount += 1;

      score +=
        POINTS_PER_CORRECT;

      const bonus =
        registerCorrectAnswer();

      button.classList.add(
        "correct"
      );

      showMessage(
        bonus > 0
          ? `🔥 ${currentStreak} streak! +${bonus} bonus points!`
          : `✅ Correct! +${POINTS_PER_CORRECT} points`
      );

      playCorrectSound();

    } else {
      wrongCount += 1;

      resetStreak();

      button.classList.add(
        "wrong"
      );

      showMessage(
        `❌ Wrong. Correct answer: ${q.answer}`
      );

      playWrongSound();
    }

    reviewAnswers.push({
      question:
        q.question,

      selected,

      correct:
        q.answer,

      isCorrect,

      timedOut: false
    });

    if ($("score")) {
      $("score")
        .textContent =
        String(score);
    }

    updateNextButton(true);

    saveQuizProgress();
  }

  /* ========================================================
     TIME UP
  ======================================================== */

  function handleTimeUp() {
    if (answered) {
      return;
    }

    answered = true;

    stopTimer();

    const q =
      currentQuestions[
        currentQuestionIndex
      ];

    if (!q) {
      return;
    }

    wrongCount += 1;

    resetStreak();

    document
      .querySelectorAll(
        "#options button"
      )
      .forEach(
        (btn) => {
          btn.disabled = true;

          if (
            btn.textContent ===
            q.answer
          ) {
            btn.classList.add(
              "correct"
            );
          }
        }
      );

    reviewAnswers.push({
      question:
        q.question,

      selected: "",

      correct:
        q.answer,

      isCorrect: false,

      timedOut: true
    });

    showMessage(
      `⏰ Time up! Correct answer: ${q.answer}`
    );

    updateNextButton(true);

    saveQuizProgress();
  }

  /* ========================================================
     NEXT BUTTON
  ======================================================== */

  function updateNextButton(enabled) {
    const button =
      $("nextBtn");

    if (!button) {
      return;
    }

    button.disabled =
      !enabled;

    if (enabled) {
      button.textContent =
        currentQuestionIndex >=
        currentQuestions.length - 1
          ? "Finish Quiz"
          : "Next Question";
    } else {
      button.textContent =
        "Choose an Answer";
    }
  }

  /* ========================================================
     NEXT QUESTION
  ======================================================== */

  function nextQuestion() {
    if (!answered) {
      return;
    }

    if (
      currentQuestionIndex >=
      currentQuestions.length - 1
    ) {
      finishQuiz();
      return;
    }

    currentQuestionIndex += 1;

    saveQuizProgress();

    renderQuestion();
  }

  /* ========================================================
     TIMER
  ======================================================== */

  function startTimer() {
    stopTimer();

    if ($("timer")) {
      $("timer")
        .textContent =
        String(
          Math.max(
            0,
            timeLeft
          )
        );
    }

    timer =
      setInterval(
        () => {
          if (!quizStarted) {
            stopTimer();
            return;
          }

          timeLeft -= 1;

          if ($("timer")) {
            $("timer")
              .textContent =
              String(
                Math.max(
                  0,
                  timeLeft
                )
              );
          }

          /*
            Save occasionally so Continue
            has current timer progress.
          */

          if (
            timeLeft > 0 &&
            timeLeft % 5 === 0
          ) {
            saveQuizProgress();
          }

          if (
            timeLeft <= 0
          ) {
            handleTimeUp();
          }
        },
        1000
      );
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /* ========================================================
     UNLOCK NEXT ROUND
  ======================================================== */

  function unlockNextRoundIfNeeded(
    round,
    percent
  ) {
    const unlocked =
      getUnlockedRounds();

    if (
      percent >= UNLOCK_PERCENT &&
      round < TOTAL_ROUNDS &&
      !unlocked.includes(
        round + 1
      )
    ) {
      unlocked.push(
        round + 1
      );

      setUnlockedRounds(
        unlocked
      );

      return true;
    }

    return false;
  }

  /* ========================================================
     FINISH QUIZ
  ======================================================== */

  function finishQuiz() {
    stopTimer();

    quizStarted = false;

    const total =
      currentQuestions.length ||
      QUESTIONS_PER_ROUND;

    const percent =
      Math.round(
        (
          correctCount /
          total
        ) * 100
      );

    const stars =
      starsForPercent(
        percent
      );

    /*
      Remember questions after
      completing the quiz.
    */

    rememberQuestions(
      currentQuestions
    );

    if (
      quizMode === "round"
    ) {
      markRoundCompleted(
        currentRound
      );

      saveRoundStars(
        currentRound,
        stars
      );

      unlockNextRoundIfNeeded(
        currentRound,
        percent
      );

    } else {
      const daily =
        readJSON(
          STORAGE.daily,
          {}
        );

      daily.date =
        dailyDate ||
        todayKey();

      daily.completed =
        true;

      daily.score =
        score;

      daily.percent =
        percent;

      writeJSON(
        STORAGE.daily,
        daily
      );

      unlockAchievement(
        "daily_challenge",
        "📅 Daily Challenger",
        "Completed a Daily Challenge."
      );
    }

    updatePersonalBest();

    const totalScore =
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        ) || "0"
      );

    localStorage.setItem(
      STORAGE.totalScore,
      String(
        totalScore + score
      )
    );

    const newlyUnlocked =
      checkAchievements(
        percent
      );

    /*
      Remove Continue progress
      ONLY after the quiz is fully
      completed.
    */

    localStorage.removeItem(
      STORAGE.progress
    );

    if ($("finalScore")) {
      $("finalScore")
        .textContent =
        String(score);
    }

    if ($("resultPercent")) {
      $("resultPercent")
        .textContent =
        `${percent}%`;
    }

    if ($("finishedRound")) {
      $("finishedRound")
        .textContent =
        quizMode === "daily"
          ? "Daily Challenge"
          : `Round ${currentRound}`;
    }

    if ($("correctCount")) {
      $("correctCount")
        .textContent =
        String(correctCount);
    }

    if ($("wrongCount")) {
      $("wrongCount")
        .textContent =
        String(wrongCount);
    }

    if ($("resultMessage")) {
      if (percent === 100) {
        $("resultMessage")
          .textContent =
          "👑 Perfect! You mastered this round!";
      } else if (percent >= 80) {
        $("resultMessage")
          .textContent =
          "⭐ Excellent! Keep your streak going!";
      } else if (percent >= 60) {
        $("resultMessage")
          .textContent =
          "🎉 Great job! The next round is unlocked.";
      } else {
        $("resultMessage")
          .textContent =
          "💪 Keep practicing and try the round again!";
      }
    }

    const nextRoundButton =
      $("nextRoundBtn");

    if (nextRoundButton) {
      const unlocked =
        getUnlockedRounds();

      nextRoundButton.style.display =
        quizMode === "round" &&
        currentRound < TOTAL_ROUNDS &&
        unlocked.includes(
          currentRound + 1
        )
          ? ""
          : "none";
    }

    /*
      Do not add new visible
      reward panels/cards.
    */

    renderRounds();

    updateContinueButton();

    showScreen(
      "resultScreen"
    );

    loadAds();

    window.quizMasterLastRewards = {
      percent,
      stars,
      streak: bestStreak,
      streakBonus,
      newlyUnlocked
    };
  }

  /* ========================================================
     NEXT ROUND
  ======================================================== */

  function startNextRound() {
    const next =
      currentRound + 1;

    if (
      next > TOTAL_ROUNDS
    ) {
      return;
    }

    if (
      !getUnlockedRounds()
        .includes(next)
    ) {
      showMessage(
        "🔒 Finish the current round with at least 60% to unlock it."
      );

      return;
    }

    startNewQuiz(next);
  }

  /* ========================================================
     RETRY
  ======================================================== */

  function retryCurrentRound() {
    if (
      quizMode === "daily"
    ) {
      const daily =
        readJSON(
          STORAGE.daily,
          {}
        );

      daily.completed =
        false;

      writeJSON(
        STORAGE.daily,
        daily
      );

      startDailyChallenge();

      return;
    }

    startNewQuiz(
      currentRound
    );
  }

  /* ========================================================
     REVIEW
  ======================================================== */

  function showReview() {
    const list =
      $("reviewList");

    const summary =
      $("reviewSummary");

    if (!list) {
      return;
    }

    if (summary) {
      summary.textContent =
        `${correctCount} correct • ${wrongCount} wrong`;
    }

    list.innerHTML = "";

    reviewAnswers.forEach(
      (item, index) => {
        const card =
          document.createElement(
            "div"
          );

        card.className =
          "review-item";

        const question =
          escapeHTML(
            item.question
          );

        const selected =
          escapeHTML(
            item.selected ||
            "No answer"
          );

        const correct =
          escapeHTML(
            item.correct
          );

        card.innerHTML = `
          <strong>
            ${index + 1}.
            ${question}
          </strong>

          <div style="margin-top:6px;">
            Your answer:
            <strong>
              ${selected}
            </strong>
          </div>

          <div>
            Correct answer:
            <strong>
              ${correct}
            </strong>
          </div>

          <div style="margin-top:4px;">
            ${
              item.isCorrect
                ? "✅ Correct"
                : "❌ Incorrect"
            }

            ${
              item.timedOut
                ? " • ⏰ Time up"
                : ""
            }
          </div>
        `;

        list.appendChild(
          card
        );
      }
    );

    showScreen(
      "reviewScreen"
    );
  }

  /* ========================================================
     HTML ESCAPE
  ======================================================== */

  function escapeHTML(value) {
    return String(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  /* ========================================================
     MESSAGE
  ======================================================== */

  function showMessage(text) {
    const box =
      $("message");

    if (!box) {
      return;
    }

    box.textContent =
      text;

    box.style.display =
      "block";

    clearTimeout(
      showMessage.timeout
    );

    showMessage.timeout =
      setTimeout(
        () => {
          box.style.display =
            "none";
        },
        2500
      );
  }

  /* ========================================================
     ERROR
  ======================================================== */

  function showError(text) {
    const box =
      $("errorMessage");

    if (box) {
      box.textContent =
        text;
    }

    showScreen(
      "errorScreen"
    );
  }

  /* ========================================================
     CONTINUE BUTTON
  ======================================================== */

  function updateContinueButton() {
    const button =
      $("continueBtn");

    if (!button) {
      return;
    }

    const saved =
      readJSON(
        STORAGE.progress,
        null
      );

    const hasProgress =
      saved &&
      Array.isArray(
        saved.questionIds
      ) &&
      saved.questionIds.length > 0;

    /*
      Do not change the button text.
      Only preserve existing visibility.
    */

    button.style.display =
      hasProgress
        ? ""
        : "none";
  }

  /* ========================================================
     ROUNDS
  ======================================================== */

  function renderRounds() {
    const grid =
      $("roundGrid");

    if (!grid) {
      return;
    }

    const unlocked =
      getUnlockedRounds();

    const completed =
      getCompletedRounds();

    const stars =
      getRoundStars();

    /*
      Keep the existing round grid
      container. Only its round
      buttons are generated here.
    */

    grid.innerHTML = "";

    for (
      let i = 1;
      i <= TOTAL_ROUNDS;
      i++
    ) {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      const isUnlocked =
        unlocked.includes(i);

      const isCompleted =
        completed.includes(i);

      const roundStars =
        Number(
          stars[String(i)] || 0
        );

      button.disabled =
        !isUnlocked;

      button.innerHTML = `
        <span style="font-weight:800;">
          ${
            isUnlocked
              ? "🎮"
              : "🔒"
          }
          Round ${i}
        </span>

        ${
          isCompleted &&
          roundStars > 0
            ? `<small>
                ${"⭐".repeat(
                  Math.min(
                    3,
                    roundStars
                  )
                )}
              </small>`
            : ""
        }
      `;

      if (isUnlocked) {
        button.addEventListener(
          "click",
          () =>
            startNewQuiz(i)
        );
      }

      grid.appendChild(
        button
      );
    }
  }

  /* ========================================================
     SETTINGS
  ======================================================== */

  function loadSettings() {
    const musicEnabled =
      localStorage.getItem(
        STORAGE.music
      ) !== "off";

    const soundEnabled =
      localStorage.getItem(
        STORAGE.sound
      ) !== "off";

    const musicSwitch =
      $("musicSwitch");

    const soundSwitch =
      $("soundSwitch");

    if (musicSwitch) {
      musicSwitch.checked =
        musicEnabled;
    }

    if (soundSwitch) {
      soundSwitch.checked =
        soundEnabled;
    }
  }

  function playCorrectSound() {
    if (
      localStorage.getItem(
        STORAGE.sound
      ) === "off"
    ) {
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const ctx =
        new AudioContext();

      const osc =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      osc.type =
        "sine";

      osc.frequency.value =
        720;

      gain.gain.setValueAtTime(
        0.08,
        ctx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.15
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      osc.stop(
        ctx.currentTime + 0.15
      );

      setTimeout(
        () => {
          try {
            ctx.close();
          } catch (error) {}
        },
        300
      );

    } catch (error) {}
  }

  function playWrongSound() {
    if (
      localStorage.getItem(
        STORAGE.sound
      ) === "off"
    ) {
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const ctx =
        new AudioContext();

      const osc =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      osc.type =
        "sine";

      osc.frequency.value =
        180;

      gain.gain.setValueAtTime(
        0.06,
        ctx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.18
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      osc.stop(
        ctx.currentTime + 0.18
      );

      setTimeout(
        () => {
          try {
            ctx.close();
          } catch (error) {}
        },
        300
      );

    } catch (error) {}
  }

  function setupSettings() {
    const musicSwitch =
      $("musicSwitch");

    const soundSwitch =
      $("soundSwitch");

    if (musicSwitch) {
      musicSwitch.addEventListener(
        "change",
        () => {
          localStorage.setItem(
            STORAGE.music,
            musicSwitch.checked
              ? "on"
              : "off"
          );
        }
      );
    }

    if (soundSwitch) {
      soundSwitch.addEventListener(
        "change",
        () => {
          localStorage.setItem(
            STORAGE.sound,
            soundSwitch.checked
              ? "on"
              : "off"
          );
        }
      );
    }

    loadSettings();
  }

  /* ========================================================
     SHARE
  ======================================================== */

  function setupShare() {
    const shareButton =
      Array.from(
        document.querySelectorAll(
          "button"
        )
      ).find(
        (button) =>
          /Share Quiz Master/i.test(
            button.textContent || ""
          )
      );

    if (!shareButton) {
      return;
    }

    /*
      Prevent duplicate listener setup.
    */

    if (
      shareButton.dataset
        .quizMasterShareReady ===
      "true"
    ) {
      return;
    }

    shareButton.dataset
      .quizMasterShareReady =
      "true";

    shareButton.addEventListener(
      "click",
      async () => {
        const shareUrl =
          window.location.href;

        const shareData = {
          title:
            "Quiz Master 🇷🇼",

          text:
            "Test your knowledge with Quiz Master!",

          url:
            shareUrl
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

          throw new Error(
            "Native share unavailable"
          );

        } catch (error) {
          if (
            error &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          try {
            if (
              navigator.clipboard &&
              navigator.clipboard.writeText
            ) {
              await navigator.clipboard.writeText(
                shareUrl
              );

              const oldText =
                shareButton.textContent;

              shareButton.textContent =
                "✅ Link Copied!";

              setTimeout(
                () => {
                  shareButton.textContent =
                    oldText;
                },
                1800
              );
            }
          } catch (
            clipboardError
          ) {
            console.warn(
              "Share fallback failed:",
              clipboardError
            );
          }
        }
      }
    );
  }

  /* ========================================================
     ADS
  ======================================================== */

  function loadAds() {
    try {
      if (
        !window.adsbygoogle
      ) {
        return;
      }

      document
        .querySelectorAll(
          ".adsbygoogle"
        )
        .forEach(
          (ad) => {
            /*
              Prevent duplicate AdSense
              initialization.
            */

            if (
              ad.dataset
                .quizMasterLoaded ===
              "true"
            ) {
              return;
            }

            try {
              (
                window.adsbygoogle =
                  window.adsbygoogle ||
                  []
              ).push({});

              ad.dataset
                .quizMasterLoaded =
                "true";

            } catch (error) {}
          }
        );

    } catch (error) {}
  }

  /* ========================================================
     EVENTS
  ======================================================== */

  function setupEvents() {
    $("startBtn")
      ?.addEventListener(
        "click",
        () => {
          startNewQuiz(1);
        }
      );

    $("continueBtn")
      ?.addEventListener(
        "click",
        continueQuiz
      );

    $("nextBtn")
      ?.addEventListener(
        "click",
        nextQuestion
      );

    $("nextRoundBtn")
      ?.addEventListener(
        "click",
        startNextRound
      );

    $("restartBtn")
      ?.addEventListener(
        "click",
        retryCurrentRound
      );

    $("reviewBtn")
      ?.addEventListener(
        "click",
        showReview
      );

    $("reviewRetryBtn")
      ?.addEventListener(
        "click",
        retryCurrentRound
      );

    $("reviewBackBtn")
      ?.addEventListener(
        "click",
        () => {
          showScreen(
            "resultScreen"
          );
        }
      );

    /*
      Save progress BEFORE
      quizStarted becomes false.
    */

    $("quizHomeBtn")
      ?.addEventListener(
        "click",
        () => {
          stopTimer();

          saveQuizProgress();

          quizStarted = false;

          showScreen(
            "homeScreen"
          );

          updateContinueButton();
        }
      );

    $("resultHomeBtn")
      ?.addEventListener(
        "click",
        () => {
          stopTimer();

          quizStarted = false;

          showScreen(
            "homeScreen"
          );

          updateContinueButton();
        }
      );

    $("errorRestartBtn")
      ?.addEventListener(
        "click",
        async () => {
          const loaded =
            await loadQuestions();

          if (loaded) {
            startNewQuiz(1);
          }
        }
      );

    $("errorHomeBtn")
      ?.addEventListener(
        "click",
        () => {
          showScreen(
            "homeScreen"
          );
        }
      );

    setupSettings();

    setupShare();
  }

  /* ========================================================
     INITIALIZE
  ======================================================== */

  async function initialize() {
    /*
      Prevent accidental double
      initialization.
    */

    if (
      window.quizMasterInitialized
    ) {
      return;
    }

    window.quizMasterInitialized =
      true;

    /*
      Round 1 is always unlocked.
    */

    if (
      !localStorage.getItem(
        STORAGE.unlocked
      )
    ) {
      setUnlockedRounds(
        [1]
      );
    }

    renderRounds();

    updateContinueButton();

    setupEvents();

    const loaded =
      await loadQuestions();

    if (!loaded) {
      return;
    }

    renderRounds();

    updateContinueButton();

    loadAds();
  }

  /* ========================================================
     PUBLIC API
  ======================================================== */

  window.startQuiz =
    () =>
      startNewQuiz(1);

  window.startNewQuiz =
    startNewQuiz;

  window.continueQuiz =
    continueQuiz;

  window.startDailyChallenge =
    startDailyChallenge;

  window.showQuizRounds =
    () => {
      renderRounds();

      showScreen(
        "roundsScreen"
      );
    };

  window.quizMasterRetention = {
    getUnlockedRounds,

    getCompletedRounds,

    getRoundStars,

    getAchievements,

    getBestData,

    getUsedQuestions,

    getTotalScore: () =>
      Number(
        localStorage.getItem(
          STORAGE.totalScore
        ) || "0"
      ),

    startDailyChallenge
  };

  /* ========================================================
     DOM READY
  ======================================================== */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
