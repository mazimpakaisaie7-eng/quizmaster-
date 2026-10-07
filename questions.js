(() => {
  "use strict";
/* =========================
   PWA INSTALL SUPPORT
   ========================= */

const manifestLink = document.createElement("link");
manifestLink.rel = "manifest";
manifestLink.href = "./manifest.webmanifest";
document.head.appendChild(manifestLink);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Service Worker registration failed:", error));
  });
}
  /* =========================================================
     QUIZ MASTER 🇷🇼
     QUESTIONS ENGINE
     FULL STABLE VERSION
     Compatible with supplied index.html
     ========================================================= */

  /* =========================
     CONFIGURATION
     ========================= */

  const QUESTIONS_FILE = "./questions.json";
  const MUSIC_FILE = "./mythica.mp3";

  const QUESTIONS_PER_ROUND = 10;
  const TIME_PER_QUESTION = 20;
  const POINTS_PER_CORRECT = 10;
  const UNLOCK_PERCENT = 60;

  const DIFFICULTIES = [
    "easy",
    "medium",
    "hard"
  ];

  const DIFFICULTY_INFO = {
    easy: {
      label: "Easy",
      icon: "🟢",
      description: "Good for beginners"
    },

    medium: {
      label: "Medium",
      icon: "🟡",
      description: "Test your general knowledge"
    },

    hard: {
      label: "Hard",
      icon: "🔴",
      description: "Challenge yourself"
    }
  };

  /* =========================
     STORAGE KEYS
     ========================= */

  const KEYS = {
    progress: "quizmasterProgress",
    unlockedRounds: "quizmasterUnlockedRounds",
    currentRound: "quizmasterCurrentRound",
    difficulty: "quizmasterDifficulty",

    music: "quizmasterMusic",
    sound: "quizmasterSound",
    musicPosition: "quizmasterMusicPosition",

    completedRounds: "quizmasterCompletedRounds",
    roundStars: "quizmasterRoundStars",
    achievements: "quizmasterAchievements",
    personalBest: "quizmasterPersonalBest",
    totalScore: "quizmasterTotalScore",
    totalCorrect: "quizmasterTotalCorrect",
    dailyChallenge: "quizmasterDailyChallenge",
    usedQuestions: "quizmasterUsedQuestions"
  };

  /* =========================
     STATE
     ========================= */

  let allQuestions = [];

  let rounds = {
    easy: [],
    medium: [],
    hard: []
  };

  let selectedDifficulty = "medium";

  let currentRound = 1;
  let currentQuestionIndex = 0;

  let currentRoundQuestions = [];

  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  let selectedAnswer = null;
  let answered = false;

  let timer = null;
  let timeLeft = TIME_PER_QUESTION;

  let reviewQuestions = [];

  let lastResult = null;

  let musicEnabled = false;
  let soundEnabled = true;

  let audio = null;

  let initialized = false;

  /*
    Prevents finishRound() from being executed twice.
  */
  let quizFinished = false;

  /*
    Prevents total correct / score from being counted twice.
  */
  let resultSaved = false;

  /* =========================
     DOM
     ========================= */

  const elements = {};

  function cacheElements() {
    const ids = [
      "homeScreen",
      "roundsScreen",
      "quizScreen",
      "resultScreen",
      "reviewScreen",
      "settingsScreen",
      "errorScreen",

      "startBtn",
      "continueBtn",
      "roundsBtn",
      "settingsBtn",
      "shareBtn",

      "roundGrid",
      "roundsBackBtn",

      "questionNumber",
      "roundDisplay",
      "score",
      "timer",
      "progressBar",
      "category",
      "question",
      "options",
      "message",
      "nextBtn",
      "quizHomeBtn",

      "finalScore",
      "resultPercent",
      "resultMessage",
      "finishedRound",
      "correctCount",
      "wrongCount",

      "nextRoundBtn",
      "restartBtn",
      "reviewBtn",
      "resultHomeBtn",

      "reviewSummary",
      "reviewList",
      "reviewRetryBtn",
      "reviewBackBtn",

      "musicSwitch",
      "soundSwitch",
      "settingsBackBtn",

      "errorMessage",
      "errorRestartBtn",
      "errorHomeBtn"
    ];

    ids.forEach((id) => {
      elements[id] =
        document.getElementById(id);
    });
  }

  /* =========================
     SAFE STORAGE
     ========================= */

  function readJSON(key, fallback) {
    try {
      const value =
        localStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      console.warn(
        "Storage read error:",
        key,
        error
      );

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
        "Storage write error:",
        key,
        error
      );
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(
        "Storage remove error:",
        key,
        error
      );
    }
  }

  /* =========================
     HELPERS
     ========================= */

  function normalizeDifficulty(value) {
    const difficulty =
      String(value || "")
        .trim()
        .toLowerCase();

    if (
      DIFFICULTIES.includes(
        difficulty
      )
    ) {
      return difficulty;
    }

    return "medium";
  }

  function safeText(value) {
    return value == null
      ? ""
      : String(value);
  }

  function getQuestionText(question) {
    if (!question) {
      return "";
    }

    return safeText(
      question.question
    );
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function shuffle(array) {
    const copy =
      Array.isArray(array)
        ? [...array]
        : [];

    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
            (i + 1)
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

  /* =========================
     QUESTION VALIDATION
     ========================= */

  function validateQuestion(
    item,
    index
  ) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return (
        `Question ${index + 1} ` +
        `is not a valid object.`
      );
    }

    if (
      typeof item.question !==
        "string" ||
      !item.question.trim()
    ) {
      return (
        `Question ${index + 1} ` +
        `has no valid question text.`
      );
    }

    if (
      !Array.isArray(
        item.options
      ) ||
      item.options.length < 2
    ) {
      return (
        `Question ${index + 1} ` +
        `must have at least 2 options.`
      );
    }

    const options =
      item.options.map(
        (option) =>
          safeText(option).trim()
      );

    if (
      options.some(
        (option) => !option
      )
    ) {
      return (
        `Question ${index + 1} ` +
        `contains an empty option.`
      );
    }

    if (
      typeof item.answer !==
        "string" ||
      !item.answer.trim()
    ) {
      return (
        `Question ${index + 1} ` +
        `has no valid answer.`
      );
    }

    if (
      !options.includes(
        item.answer.trim()
      )
    ) {
      return (
        `Question ${index + 1}: ` +
        `answer "${item.answer}" ` +
        `does not exactly match any option.`
      );
    }

    return null;
  }

  /* =========================
     BUILD ROUNDS
     ========================= */

  function buildRounds() {
    rounds = {
      easy: [],
      medium: [],
      hard: []
    };

    const grouped = {
      easy: [],
      medium: [],
      hard: []
    };

    allQuestions.forEach(
      (question) => {
        const difficulty =
          normalizeDifficulty(
            question.difficulty
          );

        grouped[difficulty].push(
          question
        );
      }
    );

    DIFFICULTIES.forEach(
      (difficulty) => {
        const questions =
          shuffle(
            grouped[difficulty]
          );

        for (
          let i = 0;
          i < questions.length;
          i += QUESTIONS_PER_ROUND
        ) {
          const roundQuestions =
            questions.slice(
              i,
              i +
                QUESTIONS_PER_ROUND
            );

          /*
            Only complete rounds are created.
            100 questions = 10 complete rounds.
          */
          if (
            roundQuestions.length ===
            QUESTIONS_PER_ROUND
          ) {
            rounds[difficulty].push(
              roundQuestions
            );
          }
        }
      }
    );

    console.log(
      "Quiz Master rounds:",
      {
        easy:
          rounds.easy.length,
        medium:
          rounds.medium.length,
        hard:
          rounds.hard.length
      }
    );
  }

  /* =========================
     UNLOCKED ROUNDS
     ========================= */

  function getUnlockedRounds(
    difficulty
  ) {
    difficulty =
      normalizeDifficulty(
        difficulty
      );

    const maxRounds =
      Math.max(
        1,
        rounds[difficulty]
          ? rounds[difficulty].length
          : 1
      );

    const stored =
      readJSON(
        KEYS.unlockedRounds,
        null
      );

    if (
      stored &&
      typeof stored ===
        "object" &&
      !Array.isArray(stored)
    ) {
      const value =
        Number(
          stored[difficulty]
        );

      if (
        Number.isFinite(value) &&
        value >= 1
      ) {
        return clamp(
          Math.floor(value),
          1,
          maxRounds
        );
      }
    }

    /*
      Old storage format migration.
    */
    const oldValue =
      Number(
        localStorage.getItem(
          KEYS.unlockedRounds
        )
      );

    if (
      Number.isFinite(oldValue) &&
      oldValue >= 1 &&
      difficulty === "medium"
    ) {
      return clamp(
        Math.floor(oldValue),
        1,
        maxRounds
      );
    }

    return 1;
  }

  function saveUnlockedRounds(
    difficulty,
    value
  ) {
    difficulty =
      normalizeDifficulty(
        difficulty
      );

    let data =
      readJSON(
        KEYS.unlockedRounds,
        {}
      );

    /*
      FIX:
      Do not recursively call the same function.
    */
    if (
      !data ||
      typeof data !==
        "object" ||
      Array.isArray(data)
    ) {
      data = {};
    }

    const maxRounds =
      Math.max(
        1,
        rounds[difficulty]
          ? rounds[difficulty].length
          : 1
      );

    data[difficulty] =
      clamp(
        Math.floor(
          Number(value) || 1
        ),
        1,
        maxRounds
      );

    writeJSON(
      KEYS.unlockedRounds,
      data
    );
  }

  function initializeUnlocks() {
    DIFFICULTIES.forEach(
      (difficulty) => {
        if (
          rounds[difficulty] &&
          rounds[difficulty]
            .length > 0
        ) {
          const unlocked =
            getUnlockedRounds(
              difficulty
            );

          saveUnlockedRounds(
            difficulty,
            unlocked
          );
        }
      }
    );
  }

  /* =========================
     COMPLETED ROUNDS
     ========================= */

  function getCompletedRounds() {
    const data =
      readJSON(
        KEYS.completedRounds,
        {}
      );

    if (
      !data ||
      typeof data !==
        "object" ||
      Array.isArray(data)
    ) {
      return {
        easy: [],
        medium: [],
        hard: []
      };
    }

    return {
      easy:
        Array.isArray(
          data.easy
        )
          ? data.easy
          : [],

      medium:
        Array.isArray(
          data.medium
        )
          ? data.medium
          : [],

      hard:
        Array.isArray(
          data.hard
        )
          ? data.hard
          : []
    };
  }

  function saveCompletedRound(
    difficulty,
    roundNumber
  ) {
    const data =
      getCompletedRounds();

    difficulty =
      normalizeDifficulty(
        difficulty
      );

    if (
      !data[difficulty].includes(
        roundNumber
      )
    ) {
      data[difficulty].push(
        roundNumber
      );
    }

    writeJSON(
      KEYS.completedRounds,
      data
    );
  }

  /* =========================
     STARS
     ========================= */

  function getRoundStars() {
    const data =
      readJSON(
        KEYS.roundStars,
        {}
      );

    if (
      !data ||
      typeof data !==
        "object" ||
      Array.isArray(data)
    ) {
      return {};
    }

    return data;
  }

  function saveRoundStars(
    difficulty,
    roundNumber,
    stars
  ) {
    const data =
      getRoundStars();

    if (
      !data[difficulty]
    ) {
      data[difficulty] =
        {};
    }

    data[difficulty][
      roundNumber
    ] = stars;

    writeJSON(
      KEYS.roundStars,
      data
    );
  }

  /* =========================
     SCREEN CONTROL
     ========================= */

  function showScreen(
    screenId
  ) {
    const screens =
      document.querySelectorAll(
        ".screen"
      );

    screens.forEach(
      (screen) => {
        screen.classList.remove(
          "active"
        );
      }
    );

    const target =
      document.getElementById(
        screenId
      );

    if (target) {
      target.classList.add(
        "active"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }

  /* =========================
     DIFFICULTY SCREEN
     ========================= */

  function createDifficultyScreen() {
    let screen =
      document.getElementById(
        "difficultyScreen"
      );

    if (screen) {
      return screen;
    }

    screen =
      document.createElement(
        "section"
      );

    screen.id =
      "difficultyScreen";

    screen.className =
      "screen";

    screen.innerHTML = `
      <div class="container">

        <div class="screen-header">
          <h2>🎯 Choose Difficulty</h2>
          <p>Select the difficulty level for your quiz.</p>
        </div>

        <div
          id="difficultyGrid"
          style="
            display:grid;
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(220px,1fr)
              );
            gap:14px;
            max-width:760px;
            margin:20px auto;
          ">
        </div>

        <div class="button-group">

          <button
            id="difficultyBackBtn"
            type="button"
            class="secondary-btn">
            ← Back Home
          </button>

        </div>

      </div>
    `;

    const roundsScreen =
      document.getElementById(
        "roundsScreen"
      );

    if (roundsScreen) {
      roundsScreen.parentNode.insertBefore(
        screen,
        roundsScreen
      );
    } else {
      document.body.appendChild(
        screen
      );
    }

    const grid =
      document.getElementById(
        "difficultyGrid"
      );

    if (!grid) {
      return screen;
    }

    DIFFICULTIES.forEach(
      (difficulty) => {
        const info =
          DIFFICULTY_INFO[
            difficulty
          ];

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.style.cssText = `
          min-height:130px;
          border:1px solid #e5e7eb;
          border-radius:20px;
          background:#fff;
          cursor:pointer;
          padding:20px;
          font-family:inherit;
          box-shadow:
            0 8px 20px
            rgba(0,0,0,.06);
          transition:
            transform .15s ease,
            box-shadow .15s ease;
        `;

        button.innerHTML = `
          <div style="font-size:32px;">
            ${info.icon}
          </div>

          <div style="
            font-size:21px;
            font-weight:900;
            color:#172554;
            margin-top:5px;">
            ${info.label}
          </div>

          <div style="
            color:#6b7280;
            font-size:13px;
            margin-top:4px;">
            ${info.description}
          </div>
        `;

        button.addEventListener(
          "click",
          () => {
            chooseDifficulty(
              difficulty
            );
          }
        );

        grid.appendChild(
          button
        );
      }
    );

    const back =
      document.getElementById(
        "difficultyBackBtn"
      );

    if (back) {
      back.addEventListener(
        "click",
        goHome
      );
    }

    return screen;
  }

  function showDifficultySelection() {
    createDifficultyScreen();

    showScreen(
      "difficultyScreen"
    );
  }

  function chooseDifficulty(
    difficulty,
    roundNumber = 1
  ) {
    difficulty =
      normalizeDifficulty(
        difficulty
      );

    selectedDifficulty =
      difficulty;

    localStorage.setItem(
      KEYS.difficulty,
      difficulty
    );

    /*
      Rebuild once so questions are
      freshly organized for the selected
      difficulty.
    */
    buildRounds();

    initializeUnlocks();

    renderRounds();

    startQuiz(
      roundNumber,
      difficulty
    );
  }

  /* =========================
     ROUNDS UI
     ========================= */

  function renderRounds() {
    const grid =
      elements.roundGrid;

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    const difficulty =
      normalizeDifficulty(
        selectedDifficulty
      );

    const availableRounds =
      rounds[difficulty] || [];

    const unlocked =
      getUnlockedRounds(
        difficulty
      );

    const completed =
      getCompletedRounds();

    const stars =
      getRoundStars();

    const info =
      DIFFICULTY_INFO[
        difficulty
      ];

    const header =
      document.createElement(
        "div"
      );

    header.style.cssText = `
      grid-column:1/-1;
      text-align:center;
      font-weight:900;
      color:#172554;
      font-size:18px;
      margin-bottom:2px;
    `;

    header.textContent =
      `${info.icon} ${info.label} Difficulty`;

    grid.appendChild(
      header
    );

    if (
      availableRounds.length ===
      0
    ) {
      const empty =
        document.createElement(
          "p"
        );

      empty.style.cssText =
        "grid-column:1/-1;text-align:center;color:#6b7280;";

      empty.textContent =
        `No complete ${info.label} rounds are available yet.`;

      grid.appendChild(
        empty
      );

      return;
    }

    availableRounds.forEach(
      (questions, index) => {
        const roundNumber =
          index + 1;

        const isUnlocked =
          roundNumber <=
          unlocked;

        const isCompleted =
          completed[difficulty] &&
          completed[difficulty].includes(
            roundNumber
          );

        const starCount =
          stars[difficulty] &&
          stars[difficulty][
            roundNumber
          ]
            ? Number(
                stars[difficulty][
                  roundNumber
                ]
              )
            : 0;

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "round-btn " +
          (
            isUnlocked
              ? "unlocked"
              : "locked"
          );

        if (isUnlocked) {
          let starText =
            "";

          if (
            starCount > 0
          ) {
            starText =
              " " +
              "⭐".repeat(
                clamp(
                  starCount,
                  0,
                  3
                )
              );
          }

          button.innerHTML =
            `${
              isCompleted
                ? "✅ "
                : "🎯 "
            }Round ${roundNumber}${starText}`;
        } else {
          button.innerHTML =
            `🔒 Round ${roundNumber}`;
        }

        button.addEventListener(
          "click",
          () => {
            if (!isUnlocked) {
              alert(
                `Complete the previous round with at least ${UNLOCK_PERCENT}% to unlock this round.`
              );

              return;
            }

            startQuiz(
              roundNumber,
              difficulty
            );
          }
        );

        grid.appendChild(
          button
        );
      }
    );
  }

  function showRounds() {
    renderRounds();

    showScreen(
      "roundsScreen"
    );
  }

  /* =========================
     LOAD QUESTIONS
     ========================= */

  async function loadQuestions() {
    try {
      const response =
        await fetch(
          `${QUESTIONS_FILE}?v=${Date.now()}`,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `questions.json could not be loaded. HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !Array.isArray(data)
      ) {
        throw new Error(
          "questions.json must contain a JSON array."
        );
      }

      if (
        data.length === 0
      ) {
        throw new Error(
          "questions.json contains no questions."
        );
      }

      const validQuestions =
        [];

      for (
        let i = 0;
        i < data.length;
        i++
      ) {
        const error =
          validateQuestion(
            data[i],
            i
          );

        if (error) {
          throw new Error(
            error
          );
        }

        const question = {
          ...data[i],

          id:
            data[i].id ||
            `question-${i + 1}`,

          question:
            data[i].question.trim(),

          options:
            data[i].options.map(
              (option) =>
                safeText(
                  option
                ).trim()
            ),

          answer:
            data[i].answer.trim(),

          category:
            safeText(
              data[i].category ||
              "General Knowledge"
            ).trim(),

          difficulty:
            normalizeDifficulty(
              data[i].difficulty
            )
        };

        validQuestions.push(
          question
        );
      }

      allQuestions =
        validQuestions;

      buildRounds();

      initializeUnlocks();

      const savedDifficulty =
        normalizeDifficulty(
          localStorage.getItem(
            KEYS.difficulty
          )
        );

      if (
        rounds[savedDifficulty] &&
        rounds[savedDifficulty]
          .length > 0
      ) {
        selectedDifficulty =
          savedDifficulty;
      } else if (
        rounds.medium.length >
        0
      ) {
        selectedDifficulty =
          "medium";
      } else if (
        rounds.easy.length >
        0
      ) {
        selectedDifficulty =
          "easy";
      } else {
        selectedDifficulty =
          "hard";
      }

      renderRounds();

      updateContinueButton();

      showScreen(
        "homeScreen"
      );

      console.log(
        `Quiz Master loaded ${allQuestions.length} questions.`
      );

      console.log(
        "Available rounds:",
        {
          easy:
            rounds.easy.length,
          medium:
            rounds.medium.length,
          hard:
            rounds.hard.length
        }
      );

    } catch (error) {
      console.error(
        "Quiz loading error:",
        error
      );

      showError(
        error.message ||
        "Unable to load quiz questions."
      );
    }
  }

  /* =========================
     START QUIZ
     ========================= */

  function startQuiz(
    roundNumber = 1,
    difficulty =
      selectedDifficulty
  ) {
    difficulty =
      normalizeDifficulty(
        difficulty
      );

    const number =
      Math.max(
        1,
        Math.floor(
          Number(
            roundNumber
          ) || 1
        )
      );

    if (
      !rounds[difficulty] ||
      !rounds[difficulty]
        .length
    ) {
      alert(
        `There are no complete ${DIFFICULTY_INFO[difficulty].label} rounds available.`
      );

      return;
    }

    const unlocked =
      getUnlockedRounds(
        difficulty
      );

    if (
      number > unlocked
    ) {
      alert(
        `Round ${number} is locked. Score at least ${UNLOCK_PERCENT}% in the previous round.`
      );

      return;
    }

    if (
      !rounds[difficulty][
        number - 1
      ]
    ) {
      alert(
        "This round is not available yet."
      );

      return;
    }

    selectedDifficulty =
      difficulty;

    currentRound =
      number;

    currentQuestionIndex =
      0;

    currentRoundQuestions =
      shuffle(
        rounds[difficulty][
          number - 1
        ]
      );

    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;

    selectedAnswer = null;
    answered = false;

    reviewQuestions = [];

    lastResult = null;

    quizFinished = false;

    resultSaved = false;

    localStorage.setItem(
      KEYS.difficulty,
      selectedDifficulty
    );

    localStorage.setItem(
      KEYS.currentRound,
      String(
        currentRound
      )
    );

    saveCurrentProgress();

    showScreen(
      "quizScreen"
    );

    renderQuestion();

    startMusic();
  }

  /* =========================
     CONTINUE
     ========================= */

  function hasSavedProgress() {
    const progress =
      readJSON(
        KEYS.progress,
        null
      );

    return (
      progress &&
      Array.isArray(
        progress.questions
      ) &&
      progress.questions.length >
        0
    );
      }
function updateContinueButton() {
  const button = elements.continueBtn;

  if (!button) {
    return;
  }

  button.type = "button";

  button.style.display =
    hasSavedProgress()
      ? "block"
      : "none";
}

  function continueQuiz() {
    const progress =
      readJSON(
        KEYS.progress,
        null
      );

    if (
      !progress ||
      !Array.isArray(
        progress.questions
      ) ||
      progress.questions.length ===
        0
    ) {
      startQuiz(
        1,
        selectedDifficulty
      );

      return;
    }

    selectedDifficulty =
      normalizeDifficulty(
        progress.difficulty ||
        localStorage.getItem(
          KEYS.difficulty
        )
      );

    currentRound =
      Math.max(
        1,
        Number(
          progress.round
        ) || 1
      );

    currentQuestionIndex =
      Math.max(
        0,
        Number(
          progress.questionIndex
        ) || 0
      );

    currentRoundQuestions =
      progress.questions;

    score =
      Number(
        progress.score
      ) || 0;

    correctAnswers =
      Number(
        progress.correctAnswers
      ) || 0;

    wrongAnswers =
      Number(
        progress.wrongAnswers
      ) || 0;

    reviewQuestions =
      Array.isArray(
        progress.reviewQuestions
      )
        ? progress.reviewQuestions
        : [];

    answered = false;

    selectedAnswer = null;

    quizFinished = false;

    resultSaved = false;

    if (
      currentQuestionIndex >=
      currentRoundQuestions.length
    ) {
      currentQuestionIndex =
        currentRoundQuestions.length -
        1;
    }

    if (
      currentQuestionIndex < 0
    ) {
      currentQuestionIndex = 0;
    }

    showScreen(
      "quizScreen"
    );

    renderQuestion();

    startMusic();
  }

  /* =========================
     SAVE PROGRESS
     ========================= */

  function saveCurrentProgress() {
    if (
      !currentRoundQuestions ||
      !currentRoundQuestions.length
    ) {
      return;
    }

    const progress = {
      difficulty:
        selectedDifficulty,

      round:
        currentRound,

      questionIndex:
        currentQuestionIndex,

      questions:
        currentRoundQuestions,

      score:
        score,

      correctAnswers:
        correctAnswers,

      wrongAnswers:
        wrongAnswers,

      reviewQuestions:
        reviewQuestions,

      savedAt:
        Date.now()
    };

    writeJSON(
      KEYS.progress,
      progress
    );

    updateContinueButton();
  }

  /* =========================
     RENDER QUESTION
     ========================= */

  function renderQuestion() {
    stopTimer();

    if (
      !currentRoundQuestions ||
      !currentRoundQuestions.length
    ) {
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      finishRound();

      return;
    }

    answered = false;

    selectedAnswer = null;

    if (
      elements.questionNumber
    ) {
      elements.questionNumber.textContent =
        `Question ${
          currentQuestionIndex + 1
        } / ${
          currentRoundQuestions.length
        }`;
    }

    if (
      elements.roundDisplay
    ) {
      const info =
        DIFFICULTY_INFO[
          selectedDifficulty
        ];

      elements.roundDisplay.textContent =
        `${info.icon} ${info.label} • Round ${currentRound}`;
    }

    if (
      elements.score
    ) {
      elements.score.textContent =
        `Score: ${score}`;
    }

    if (
      elements.category
    ) {
      elements.category.textContent =
        question.category ||
        "General Knowledge";
    }

    if (
      elements.question
    ) {
      elements.question.textContent =
        getQuestionText(
          question
        );
    }

    if (
      elements.progressBar
    ) {
      const percent =
        (
          (currentQuestionIndex +
            1) /
          currentRoundQuestions.length
        ) *
        100;

      elements.progressBar.style.width =
        `${percent}%`;
    }

    hideMessage();

    renderOptions(
      question
    );

    hideNextButton();

    startTimer();

    saveCurrentProgress();
  }

  /* =========================
     OPTIONS
     ========================= */

  function renderOptions(
    question
  ) {
    const container =
      elements.options;

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    const options =
      shuffle(
        question.options
      );

    options.forEach(
      (option) => {
        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "option-btn";

        button.textContent =
          option;

        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            selectAnswer(
              option
            );
          }
        );

        container.appendChild(
          button
        );
      }
    );
  }

  /* =========================
     ANSWER
     ========================= */

  function selectAnswer(
    option
  ) {
    if (answered) {
      return;
    }

    if (quizFinished) {
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    answered = true;

    selectedAnswer =
      option;

    stopTimer();

    const isCorrect =
      option ===
      question.answer;

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            ".option-btn"
          )
        : [];

    optionButtons.forEach(
      (button) => {
        button.disabled =
          true;

        if (
          button.textContent ===
          question.answer
        ) {
          button.classList.add(
            "correct"
          );
        }

        if (
          button.textContent ===
            option &&
          !isCorrect
        ) {
          button.classList.add(
            "wrong"
          );
        }
      }
    );

    if (isCorrect) {
      correctAnswers++;

      score +=
        POINTS_PER_CORRECT;

      showMessage(
        `✅ Correct! +${POINTS_PER_CORRECT} points`,
        "correct"
      );

      playAnswerSound(
        true
      );

    } else {
      wrongAnswers++;

      showMessage(
        `❌ Wrong! Correct answer: ${question.answer}`,
        "wrong"
      );

      playAnswerSound(
        false
      );
    }

    addReviewItem(
      question,
      option,
      isCorrect
    );

    if (
      elements.score
    ) {
      elements.score.textContent =
        `Score: ${score}`;
    }

    showNextButton();

    saveCurrentProgress();
  }

  /* =========================
     REVIEW DATA
     ========================= */

  function addReviewItem(
    question,
    userAnswer,
    isCorrect
  ) {
    reviewQuestions.push({
      question:
        question.question,

      question_rw:
        question.question_rw ||
        "",

      userAnswer:
        userAnswer,

      correctAnswer:
        question.answer,

      category:
        question.category ||
        "General Knowledge",

      isCorrect:
        isCorrect
    });
  }

  /* =========================
     NEXT BUTTON
     ========================= */

  function showNextButton() {
    const button =
      elements.nextBtn;

    if (!button) {
      console.error(
        "Quiz Master: nextBtn was not found."
      );

      return;
    }

    /*
      Important:
      Force button to never submit a form.
    */
    button.type =
      "button";

    button.style.display =
      "block";

    button.disabled =
      false;

    button.textContent =
      currentQuestionIndex <
      currentRoundQuestions.length -
        1
        ? "➡️ Next Question"
        : "🏆 Finish Round";
  }

  function hideNextButton() {
    const button =
      elements.nextBtn;

    if (!button) {
      return;
    }

    button.type =
      "button";

    button.disabled =
      true;

    button.style.display =
      "none";
  }

  function nextQuestion(
    event
  ) {
    /*
      This is the important Next fix.
    */
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (quizFinished) {
      return false;
    }

    if (!answered) {
      return false;
    }

    if (
      !currentRoundQuestions ||
      !currentRoundQuestions.length
    ) {
      return false;
    }

    if (
      currentQuestionIndex <
      currentRoundQuestions.length -
        1
    ) {
      currentQuestionIndex++;

      answered = false;

      selectedAnswer = null;

      saveCurrentProgress();

      renderQuestion();

      return false;
    }

    finishRound();

    return false;
  }

  /* =========================
     TIMER
     ========================= */

  function startTimer() {
    stopTimer();

    timeLeft =
      TIME_PER_QUESTION;

    updateTimerDisplay();

    timer =
      setInterval(
        () => {
          if (quizFinished) {
            stopTimer();
            return;
          }

          timeLeft--;

          updateTimerDisplay();

          if (
            timeLeft <= 0
          ) {
            stopTimer();

            timeExpired();
          }
        },
        1000
      );
  }

  function stopTimer() {
    if (
      timer !== null
    ) {
      clearInterval(
        timer
      );

      timer = null;
    }
  }

  function updateTimerDisplay() {
    if (!elements.timer) {
      return;
    }

    elements.timer.textContent =
      `⏱️ ${Math.max(
        0,
        timeLeft
      )}`;
  }

  function timeExpired() {
    if (answered) {
      return;
    }

    if (quizFinished) {
      return;
    }

    const question =
      currentRoundQuestions[
        currentQuestionIndex
      ];

    if (!question) {
      return;
    }

    answered = true;

    wrongAnswers++;

    selectedAnswer =
      null;

    const optionButtons =
      elements.options
        ? elements.options.querySelectorAll(
            ".option-btn"
          )
        : [];

    optionButtons.forEach(
      (button) => {
        button.disabled =
          true;

        if (
          button.textContent ===
          question.answer
        ) {
          button.classList.add(
            "correct"
          );
        }
      }
    );

    showMessage(
      `⏰ Time's up! Correct answer: ${question.answer}`,
      "wrong"
    );

    addReviewItem(
      question,
      "No answer",
      false
    );

    playAnswerSound(
      false
    );

    showNextButton();

    saveCurrentProgress();
  }

  /* =========================
     FINISH ROUND
     ========================= */

  function finishRound() {
    if (quizFinished) {
      return;
    }

    quizFinished = true;

    stopTimer();

    if (
      !currentRoundQuestions ||
      !currentRoundQuestions.length
    ) {
      return;
    }

    const total =
      currentRoundQuestions.length;

    const percent =
      Math.round(
        (
          correctAnswers /
          total
        ) *
        100
      );

    let stars = 1;

    if (
      percent >= 80
    ) {
      stars = 3;

    } else if (
      percent >= 60
    ) {
      stars = 2;
    }

    const unlockedBefore =
      getUnlockedRounds(
        selectedDifficulty
      );

    let unlockedAfter =
      unlockedBefore;

    if (
      percent >=
      UNLOCK_PERCENT
    ) {
      unlockedAfter =
        Math.max(
          unlockedBefore,
          currentRound + 1
        );

      if (
        rounds[
          selectedDifficulty
        ] &&
        unlockedAfter >
          rounds[
            selectedDifficulty
          ].length
      ) {
        unlockedAfter =
          rounds[
            selectedDifficulty
          ].length;
      }

      saveUnlockedRounds(
        selectedDifficulty,
        unlockedAfter
      );
    }

    saveCompletedRound(
      selectedDifficulty,
      currentRound
    );

    saveRoundStars(
      selectedDifficulty,
      currentRound,
      stars
    );

    /*
      Save global counters only once.
    */
    if (!resultSaved) {
      resultSaved = true;

      updateTotalScore();

      updatePersonalBest(
        score
      );

      updateCorrectCounter();

      checkAchievements();
    }

    lastResult = {
      difficulty:
        selectedDifficulty,

      round:
        currentRound,

      score:
        score,

      correct:
        correctAnswers,

      wrong:
        wrongAnswers,

      total:
        total,

      percent:
        percent,

      stars:
        stars,

      unlockedNext:
        percent >=
        UNLOCK_PERCENT
    };

    removeStorage(
      KEYS.progress
    );

    updateContinueButton();

    renderResult();

    showScreen(
      "resultScreen"
    );
  }

  /* =========================
     RESULT
     ========================= */

  function renderResult() {
    if (!lastResult) {
      return;
    }

    const result =
      lastResult;

    if (
      elements.finalScore
    ) {
      elements.finalScore.textContent =
        `Score: ${result.score}`;
    }

    if (
      elements.resultPercent
    ) {
      elements.resultPercent.textContent =
        `${result.percent}%`;
    }

    if (
      elements.correctCount
    ) {
      elements.correctCount.textContent =
        result.correct;
    }

    if (
      elements.wrongCount
    ) {
      elements.wrongCount.textContent =
        result.wrong;
    }

    if (
      elements.finishedRound
    ) {
      const info =
        DIFFICULTY_INFO[
          result.difficulty
        ];

      elements.finishedRound.textContent =
        `${info.icon} ${info.label} • Round ${result.round}`;
    }

    if (
      elements.resultMessage
    ) {
      if (
        result.percent >=
        80
      ) {
        elements.resultMessage.textContent =
          `Excellent! You earned ${result.stars} stars. 🌟`;

      } else if (
        result.percent >=
        60
      ) {
        elements.resultMessage.textContent =
          `Great job! You unlocked the next round. ⭐⭐`;

      } else {
        elements.resultMessage.textContent =
          `Keep practicing! Score at least ${UNLOCK_PERCENT}% to unlock the next round.`;
      }
    }

    if (
      elements.nextRoundBtn
    ) {
      const canNext =
        result.unlockedNext &&
        result.round <
          (
            rounds[
              result.difficulty
            ] || []
          ).length;

      elements.nextRoundBtn.style.display =
        canNext
          ? "block"
          : "none";

      elements.nextRoundBtn.textContent =
        canNext
          ? `🔓 Round ${
              result.round + 1
            }`
          : "🔓 Next Round";
    }

    if (
      elements.restartBtn
    ) {
      elements.restartBtn.style.display =
        "block";
    }

    if (
      elements.reviewBtn
    ) {
      elements.reviewBtn.style.display =
        reviewQuestions.length
          ? "block"
          : "none";
    }
  }

  /* =========================
     NEXT ROUND
     ========================= */

  function nextRound() {
    if (!lastResult) {
      return;
    }

    const next =
      lastResult.round + 1;

    const difficulty =
      lastResult.difficulty;

    if (
      next >
      getUnlockedRounds(
        difficulty
      )
    ) {
      return;
    }

    if (
      !rounds[difficulty] ||
      !rounds[difficulty][
        next - 1
      ]
    ) {
      return;
    }

    startQuiz(
      next,
      difficulty
    );
  }

  /* =========================
     RETRY
     ========================= */

  function retryRound() {
    const difficulty =
      lastResult
        ? lastResult.difficulty
        : selectedDifficulty;

    const round =
      lastResult
        ? lastResult.round
        : currentRound;

    startQuiz(
      round,
      difficulty
    );
  }

  /* =========================
     REVIEW SCREEN
     ========================= */

  function showReview() {
    if (
      !elements.reviewList
    ) {
      return;
    }

    elements.reviewList.innerHTML =
      "";

    if (
      elements.reviewSummary
    ) {
      elements.reviewSummary.textContent =
        `${correctAnswers} correct • ${wrongAnswers} wrong`;
    }

    reviewQuestions.forEach(
      (item, index) => {
        const div =
          document.createElement(
            "div"
          );

        div.className =
          "review-item " +
          (
            item.isCorrect
              ? "review-correct"
              : "review-wrong"
          );

        const questionTitle =
          document.createElement(
            "strong"
          );

        questionTitle.textContent =
          `${index + 1}. ${item.question}`;

        const category =
          document.createElement(
            "p"
          );

        category.textContent =
          `Category: ${item.category}`;

        const yourAnswer =
          document.createElement(
            "p"
          );

        yourAnswer.textContent =
          `Your answer: ${item.userAnswer}`;

        const correctAnswer =
          document.createElement(
            "p"
          );

        correctAnswer.textContent =
          `Correct answer: ${item.correctAnswer}`;

        div.appendChild(
          questionTitle
        );

        div.appendChild(
          category
        );

        div.appendChild(
          yourAnswer
        );

        div.appendChild(
          correctAnswer
        );

        elements.reviewList.appendChild(
          div
        );
      }
    );

    showScreen(
      "reviewScreen"
    );
  }

  /* =========================
     MESSAGES
     ========================= */

  function showMessage(
    text,
    type
  ) {
    if (!elements.message) {
      return;
    }

    elements.message.textContent =
      text;

    elements.message.className =
      `message ${
        type || ""
      }`;
  }

  function hideMessage() {
    if (!elements.message) {
      return;
    }

    elements.message.textContent =
      "";

    elements.message.className =
      "message hidden";
  }

  /* =========================
     SCORE
     ========================= */

  function updateTotalScore() {
    const oldScore =
      Number(
        localStorage.getItem(
          KEYS.totalScore
        )
      ) || 0;

    const newScore =
      oldScore + score;

    localStorage.setItem(
      KEYS.totalScore,
      String(newScore)
    );
  }

  function updatePersonalBest(
    roundScore
  ) {
    const oldBest =
      Number(
        localStorage.getItem(
          KEYS.personalBest
        )
      ) || 0;

    if (
      roundScore >
      oldBest
    ) {
      localStorage.setItem(
        KEYS.personalBest,
        String(
          roundScore
        )
      );
    }
  }

  function updateCorrectCounter() {
    const old =
      Number(
        localStorage.getItem(
          KEYS.totalCorrect
        )
      ) || 0;

    localStorage.setItem(
      KEYS.totalCorrect,
      String(
        old + correctAnswers
      )
    );
  }

  /* =========================
     ACHIEVEMENTS
     ========================= */

  function checkAchievements() {
    const data =
      readJSON(
        KEYS.achievements,
        []
      );

    const achievements =
      Array.isArray(data)
        ? data
        : [];

    const completed =
      getCompletedRounds();

    const totalCompleted =
      completed.easy.length +
      completed.medium.length +
      completed.hard.length;

    const totalCorrect =
      Number(
        localStorage.getItem(
          KEYS.totalCorrect
        )
      ) || 0;

    if (
      currentRound === 1 &&
      !achievements.includes(
        "first_round"
      )
    ) {
      achievements.push(
        "first_round"
      );
    }

    if (
      totalCompleted >= 5 &&
      !achievements.includes(
        "five_rounds"
      )
    ) {
      achievements.push(
        "five_rounds"
      );
    }

    if (
      totalCorrect >= 50 &&
      !achievements.includes(
        "fifty_correct"
      )
    ) {
      achievements.push(
        "fifty_correct"
      );
    }

    if (
      totalCompleted >= 10 &&
      !achievements.includes(
        "ten_rounds"
      )
    ) {
      achievements.push(
        "ten_rounds"
      );
    }

    writeJSON(
      KEYS.achievements,
      achievements
    );
  }

  /* =========================
     DAILY CHALLENGE
     ========================= */

  function updateDailyChallenge() {
    /*
      Use local calendar date rather than
      changing the user's date because of UTC.
    */
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    const today =
      `${year}-${month}-${day}`;

    const data =
      readJSON(
        KEYS.dailyChallenge,
        {}
      );

    if (
      !data ||
      data.date !== today
    ) {
      writeJSON(
        KEYS.dailyChallenge,
        {
          date:
            today,

          completed:
            false
        }
      );
    }
  }

  /* =========================
     MUSIC
     ========================= */

  function initializeMusic() {
    musicEnabled =
      localStorage.getItem(
        KEYS.music
      ) === "true";

    const savedSound =
      localStorage.getItem(
        KEYS.sound
      );

    soundEnabled =
      savedSound === null
        ? true
        : savedSound === "true";

    audio =
      new Audio(
        MUSIC_FILE
      );

    audio.loop =
      true;

    audio.preload =
      "auto";

    const position =
      Number(
        localStorage.getItem(
          KEYS.musicPosition
        )
      );

    if (
      Number.isFinite(
        position
      ) &&
      position >= 0
    ) {
      try {
        audio.currentTime =
          position;
      } catch (error) {}
    }

    updateMusicSwitch();

    updateSoundSwitch();

    audio.addEventListener(
      "timeupdate",
      () => {
        try {
          localStorage.setItem(
            KEYS.musicPosition,
            String(
              audio.currentTime
            )
          );
        } catch (error) {}
      }
    );

    audio.addEventListener(
      "error",
      () => {
        console.warn(
          `Music file could not be loaded: ${MUSIC_FILE}`
        );
      }
    );
  }

  function startMusic() {
    if (
      !musicEnabled ||
      !audio
    ) {
      return;
    }

    audio.play().catch(
      () => {
        /*
          Browser autoplay policy may
          block music until the user interacts.
        */
      }
    );
  }

  function stopMusic() {
    if (!audio) {
      return;
    }

    audio.pause();
  }

  function toggleMusic() {
    musicEnabled =
      !musicEnabled;

    localStorage.setItem(
      KEYS.music,
      String(
        musicEnabled
      )
    );

    updateMusicSwitch();

    if (
      musicEnabled
    ) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  function toggleSound() {
    soundEnabled =
      !soundEnabled;

    localStorage.setItem(
      KEYS.sound,
      String(
        soundEnabled
      )
    );

    updateSoundSwitch();
  }

  function updateMusicSwitch() {
    if (
      !elements.musicSwitch
    ) {
      return;
    }

    elements.musicSwitch.classList.toggle(
      "on",
      musicEnabled
    );

    elements.musicSwitch.setAttribute(
      "aria-pressed",
      String(
        musicEnabled
      )
    );
  }

  function updateSoundSwitch() {
    if (
      !elements.soundSwitch
    ) {
      return;
    }

    elements.soundSwitch.classList.toggle(
      "on",
      soundEnabled
    );

    elements.soundSwitch.setAttribute(
      "aria-pressed",
      String(
        soundEnabled
      )
    );
  }

  function playAnswerSound(
    correct
  ) {
    if (!soundEnabled) {
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const context =
        new AudioContext();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      oscillator.frequency.value =
        correct
          ? 660
          : 220;

      oscillator.type =
        "sine";

      gain.gain.setValueAtTime(
        0.08,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime +
          0.18
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          0.18
      );

      /*
        Close context after sound.
      */
      setTimeout(
        () => {
          try {
            context.close();
          } catch (error) {}
        },
        300
      );

    } catch (error) {
      console.warn(
        "Sound unavailable:",
        error
      );
    }
  }

  /* =========================
     SETTINGS
     ========================= */

  function showSettings() {
    updateMusicSwitch();

    updateSoundSwitch();

    showScreen(
      "settingsScreen"
    );
  }

  /* =========================
     HOME
     ========================= */

  function goHome() {
    stopTimer();

    showScreen(
      "homeScreen"
    );

    updateContinueButton();
  }

  /* =========================
     SHARE
     ========================= */

  async function shareQuiz() {
    const shareUrl =
      window.location.href;

    const shareText =
      "Test your knowledge with Quiz Master!";

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

        showCopiedMessage();

        return;
      }

    } catch (error) {
      console.warn(
        "Clipboard unavailable:",
        error
      );
    }

    try {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        shareUrl;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();

      showCopiedMessage();

    } catch (error) {
      alert(
        "Copy this link to share Quiz Master:\n\n" +
        shareUrl
      );
    }
  }

  function showCopiedMessage() {
    if (
      !elements.shareBtn
    ) {
      return;
    }

    const oldText =
      elements.shareBtn.textContent;

    elements.shareBtn.textContent =
      "✅ Link Copied!";

    setTimeout(
      () => {
        if (
          elements.shareBtn
        ) {
          elements.shareBtn.textContent =
            oldText;
        }
      },
      1800
    );
  }

  /* =========================
     ERROR
     ========================= */

  function showError(
    message
  ) {
    if (
      elements.errorMessage
    ) {
      elements.errorMessage.textContent =
        message;
    }

    showScreen(
      "errorScreen"
    );
  }

  /* =========================
     EVENT LISTENERS
     ========================= */

  function setupEventListeners() {
    if (
      elements.startBtn
    ) {
      elements.startBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          showDifficultySelection();
        }
      );
    }

    if (
      elements.continueBtn
    ) {
      elements.continueBtn.type =
        "button";

      elements.continueBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          continueQuiz();
        }
      );
    }

    if (
      elements.roundsBtn
    ) {
      elements.roundsBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          showRounds();
        }
      );
    }

    if (
      elements.settingsBtn
    ) {
      elements.settingsBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          showSettings();
        }
      );
    }

    if (
      elements.shareBtn
    ) {
      elements.shareBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          shareQuiz();
        }
      );
    }

    if (
      elements.roundsBackBtn
    ) {
      elements.roundsBackBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          goHome();
        }
      );
    }

    /*
      =======================================================
      NEXT BUTTON — IMPORTANT FIX
      =======================================================
    */

    if (
      elements.nextBtn
    ) {
      elements.nextBtn.type =
        "button";

      /*
        Make sure the browser does not
        treat this button as a form submit.
      */
      elements.nextBtn.setAttribute(
        "type",
        "button"
      );

      elements.nextBtn.addEventListener(
        "click",
        nextQuestion
      );
    } else {
      console.error(
        "Quiz Master: #nextBtn not found in index.html"
      );
    }

    if (
      elements.quizHomeBtn
    ) {
      elements.quizHomeBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          goHome();
        }
      );
    }

    if (
      elements.nextRoundBtn
    ) {
      elements.nextRoundBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          nextRound();
        }
      );
    }

    if (
      elements.restartBtn
    ) {
      elements.restartBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          retryRound();
        }
      );
    }

    if (
      elements.reviewBtn
    ) {
      elements.reviewBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          showReview();
        }
      );
    }

    if (
      elements.resultHomeBtn
    ) {
      elements.resultHomeBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          goHome();
        }
      );
    }

    if (
      elements.reviewRetryBtn
    ) {
      elements.reviewRetryBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          retryRound();
        }
      );
    }

    if (
      elements.reviewBackBtn
    ) {
      elements.reviewBackBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          renderResult();

          showScreen(
            "resultScreen"
          );
        }
      );
    }

    if (
      elements.musicSwitch
    ) {
      elements.musicSwitch.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          toggleMusic();
        }
      );
    }

    if (
      elements.soundSwitch
    ) {
      elements.soundSwitch.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          toggleSound();
        }
      );
    }

    if (
      elements.settingsBackBtn
    ) {
      elements.settingsBackBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          goHome();
        }
      );
    }

    if (
      elements.errorRestartBtn
    ) {
      elements.errorRestartBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          loadQuestions();
        }
      );
    }

    if (
      elements.errorHomeBtn
    ) {
      elements.errorHomeBtn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          goHome();
        }
      );
    }
  }

  /* =========================
     INITIALIZATION
     ========================= */

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    cacheElements();

    createDifficultyScreen();

    initializeMusic();

    updateDailyChallenge();

    setupEventListeners();

    updateContinueButton();

    showScreen(
      "homeScreen"
    );

    loadQuestions();
  }

  /* =========================
     PUBLIC API
     ========================= */

  window.startQuiz =
    startQuiz;

  window.continueQuiz =
    continueQuiz;

  window.nextQuestion =
    nextQuestion;

  window.showRounds =
    showRounds;

  window.showSettings =
    showSettings;

  window.showReview =
    showReview;

  window.retryRound =
    retryRound;

  window.nextRound =
    nextRound;

  window.goHome =
    goHome;

  window.shareQuiz =
    shareQuiz;

  window.startMusic =
    startMusic;

  window.stopMusic =
    stopMusic;

  window.toggleMusic =
    toggleMusic;

  window.toggleSound =
    toggleSound;

  window.loadQuestions =
    loadQuestions;

  window.showDifficultySelection =
    showDifficultySelection;

  /* =========================
     START
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
