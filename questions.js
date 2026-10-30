
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
    musicOn: false
  };

  const used = readStorage(CONFIG.STORAGE.used, {
    traffic: [],
    general: []
  });

  const completed = readStorage(CONFIG.STORAGE.completed, {
    traffic: [],
    general: []
  });

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function shuffle(items) {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  function text(question, field) {
    if (state.language === "rw") {
      return question[field + "_rw"] || question[field] || "";
    }

    return question[field] || question[field + "_rw"] || "";
  }

  function answerValue(question) {
    if (state.language === "rw") {
      return question.answer_rw ?? question.answer;
    }

    return question.answer ?? question.answer_rw;
  }

  function getCorrectOption(question) {
    const answer = answerValue(question);

    if (typeof answer === "number") {
      return question.options[answer];
    }

    return answer;
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
      $(id).classList.toggle("hidden", id !== screenId);
    });
  }

  function setMessage(elementId, message) {
    const element = $(elementId);
    if (element) element.textContent = message;
  }

  function validQuestion(question) {
    if (!question || !Array.isArray(question.options)) return false;
    if (!question.category || !["traffic", "general"].includes(question.category)) return false;
    if (!question.options.length) return false;

    const answer = getCorrectOption(question);
    return question.options.includes(answer);
  }

  async function loadQuestions() {
    try {
      const response = await fetch(CONFIG.QUESTIONS_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load questions.json");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("questions.json must contain an array");
      }

      state.questions = data.filter(validQuestion);

      if (!state.questions.length) {
        throw new Error("No valid questions were found");
      }

      updateHome();
      setMessage("homeMessage", "Questions loaded successfully.");

    } catch (error) {
      console.error(error);
      setMessage("homeMessage", "Error loading questions: " + error.message);
    }
  }

  function categoryQuestions() {
    return state.questions.filter(q => q.category === state.mode);
  }

  function getUnusedQuestions() {
    const all = categoryQuestions();
    const alreadyUsed = new Set(used[state.mode] || []);

    let available = all.filter(q => !alreadyUsed.has(String(q.id)));

    // A new cycle starts only after every question in this category has been used.
    if (available.length === 0) {
      used[state.mode] = [];
      save(CONFIG.STORAGE.used, used);
      available = [...all];
    }

    return shuffle(available);
  }

  function prepareRound() {
    const available = getUnusedQuestions();

    if (!available.length) {
      setMessage("homeMessage", "No questions are available in this category.");
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

    // Mark questions as used immediately so they cannot repeat in another round.
    const ids = state.roundQuestions.map(q => String(q.id));
    used[state.mode] = [...new Set([...(used[state.mode] || []), ...ids])];
    save(CONFIG.STORAGE.used, used);

    return true;
  }

  function startQuiz() {
    if (!state.questions.length) {
      setMessage("homeMessage", "Questions are still loading. Try again.");
      return;
    }

    if (!prepareRound()) return;

    showScreen("quizScreen");
    displayQuestion();
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

    $("currentRound").textContent = state.round;
    $("currentQuestionNumber").textContent =
      `${state.currentIndex + 1}/${state.roundQuestions.length}`;

    $("categoryIndicator").textContent =
      state.mode === "traffic" ? "Road Safety" : "General Knowledge";

    $("questionText").textContent = text(question, "question");

    // Show a picture only when the question has an image.
    const image = $("questionImage");
    const imageSource = question.image || question.image_url;

    if (imageSource) {
      image.src = imageSource;
      image.alt = text(question, "question") || "Question image";
      image.classList.remove("hidden");

      image.onerror = () => {
        image.removeAttribute("src");
        image.classList.add("hidden");
      };
    } else {
      image.removeAttribute("src");
      image.classList.add("hidden");
    }

    const options = textOptions(question);

    $("optionsContainer").innerHTML = "";

    options.forEach(option => {
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
        $("submitAnswerBtn").disabled = false;
      });

      $("optionsContainer").appendChild(button);
    });

    $("submitAnswerBtn").disabled = true;
    $("submitAnswerBtn").classList.remove("hidden");
    $("nextQuestionBtn").classList.add("hidden");
    $("answerFeedback").classList.add("hidden");

    $("progressFill").style.width =
      `${(state.currentIndex / state.roundQuestions.length) * 100}%`;

    state.seconds =
      state.mode === "traffic"
        ? CONFIG.TRAFFIC_TIME
        : CONFIG.GENERAL_TIME;

    $("timer").textContent = state.seconds;
    startTimer();
  }

  function textOptions(question) {
    const options = state.language === "rw"
      ? (question.options_rw || question.options)
      : (question.options || question.options_rw);

    return options || [];
  }

  function startTimer() {
    stopTimer();

    state.timer = setInterval(() => {
      if (state.paused || state.answered) return;

      state.seconds--;
      $("timer").textContent = state.seconds;

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

    if (!state.selectedAnswer && !timeExpired) return;

    state.answered = true;
    stopTimer();

    const correctAnswer = getCorrectOption(question);
    const selected = state.selectedAnswer;
    const isCorrect = selected === correctAnswer;

    if (isCorrect) {
      state.correct++;
      state.score += CONFIG.POINTS_PER_CORRECT;
    }

    const feedback = $("answerFeedback");
    feedback.classList.remove("hidden", "good", "bad");
    feedback.classList.add(isCorrect ? "good" : "bad");

    if (timeExpired && !selected) {
      feedback.textContent =
        state.language === "rw"
          ? "Igihe kirangiye. Igisubizo nyacyo: " + correctAnswer
          : "Time is up. Correct answer: " + correctAnswer;
    } else {
      feedback.textContent = isCorrect
        ? (state.language === "rw" ? "Ni byo! Igisubizo ni cyo." : "Correct answer!")
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
      question: text(question, "question"),
      options: textOptions(question),
      selected: selected || "No answer",
      correct: correctAnswer,
      explanation: text(question, "explanation"),
      image: question.image || question.image_url || ""
    });

    $("submitAnswerBtn").classList.add("hidden");
    $("nextQuestionBtn").classList.remove("hidden");

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
    const percent = total ? Math.round((state.correct / total) * 100) : 0;
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 50 ? 1 : 0;

    $("resultScore").textContent = `${state.correct}/${total}`;
    $("resultPercent").textContent = `${percent}%`;
    $("resultStars").textContent = stars;

    $("resultTitle").textContent =
      state.language === "rw" ? "Round irarangiye!" : "Round Complete";

    $("resultMessage").textContent =
      percent >= CONFIG.UNLOCK_PERCENT
        ? (state.language === "rw"
          ? "Watsinze! Round ikurikira irafungutse."
          : "Well done! The next round is unlocked.")
        : (state.language === "rw"
          ? "Ongera witoze kugira ngo ufungure round ikurikira."
          : "Keep practising to unlock the next round.");

    const roundKey = `${state.mode}-${state.round}`;

    if (!completed[state.mode].includes(roundKey)) {
      completed[state.mode].push(roundKey);
    }

    save(CONFIG.STORAGE.completed, completed);

    const best = Number(localStorage.getItem(CONFIG.STORAGE.best) || 0);
    if (state.score > best) {
      localStorage.setItem(CONFIG.STORAGE.best, String(state.score));
    }

    const totalScore = Number(localStorage.getItem(CONFIG.STORAGE.total) || 0);
    localStorage.setItem(CONFIG.STORAGE.total, String(totalScore + state.score));

    $("resultNextBtn").classList.toggle(
      "hidden",
      percent < CONFIG.UNLOCK_PERCENT
    );

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
      correct: state.correct
    });
  }

  function updateHome() {
    $("homeScore").textContent =
      localStorage.getItem(CONFIG.STORAGE.best) || "0";

    $("homeRound").textContent = state.round;

    const totalStars = Object.values(completed)
      .reduce((sum, list) => sum + list.length, 0);

    $("homeStars").textContent = totalStars;

    const saved = readStorage(CONFIG.STORAGE.progress, null);
    $("continueBtn").classList.toggle("hidden", !saved);
  }

  function showReview() {
    const container = $("reviewContainer");
    container.innerHTML = "";

    const reviews = state.review.length
      ? state.review
      : readStorage(CONFIG.STORAGE.review, []);

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
      heading.textContent = `${index + 1}. ${item.question}`;
      card.appendChild(heading);

      if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = "Question image";
        img.className = "question-image";
        img.onerror = () => img.remove();
        card.appendChild(img);
      }

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

  function showRounds() {
    const list = $("roundList");
    list.innerHTML = "";

    const rounds = completed[state.mode] || [];

    $("roundsDescription").textContent =
      `${rounds.length} completed rounds in this category.`;

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

  function continueQuiz() {
    const saved = readStorage(CONFIG.STORAGE.progress, null);

    if (!saved) {
      startQuiz();
      return;
    }

    state.mode = saved.mode || state.mode;
    state.language = saved.language || state.language;
    state.round = saved.round || 1;

    startQuiz();
  }

  function selectLanguage(button) {
    document.querySelectorAll("[data-language]").forEach(item => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    state.language = button.dataset.language;

    updateSelectionSummary();
  }

  function selectMode(button) {
    document.querySelectorAll("[data-mode]").forEach(item => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    state.mode = button.dataset.mode;

    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    $("selectionSummary").textContent =
      `${state.language === "rw" ? "Ikinyarwanda" : "English"} · ` +
      `${state.mode === "traffic" ? "Road Safety" : "General Knowledge"}`;
  }

  function saveSettings() {
    state.language = $("settingsLanguage").value;
    state.mode = $("settingsMode").value;

    localStorage.setItem(CONFIG.STORAGE.language, state.language);
    localStorage.setItem(CONFIG.STORAGE.mode, state.mode);

    updateSelectionSummary();
    setMessage("settingsMessage", "Settings saved successfully.");
    showScreen("homeScreen");
  }

  function resetProgress() {
    const confirmed = confirm(
      "Are you sure you want to reset all quiz progress?"
    );

    if (!confirmed) return;

    Object.values(CONFIG.STORAGE).forEach(key => {
      if (key !== CONFIG.STORAGE.language &&
          key !== CONFIG.STORAGE.mode) {
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
    state.review = [];

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

  function bindEvents() {
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => selectLanguage(button));
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => selectMode(button));
    });

    $("confirmSetupBtn").addEventListener("click", () => {
      localStorage.setItem(CONFIG.STORAGE.language, state.language);
      localStorage.setItem(CONFIG.STORAGE.mode, state.mode);
      setMessage("homeMessage", "Selection saved. You can start the quiz.");
    });

    $("startBtn").addEventListener("click", startQuiz);
    $("continueBtn").addEventListener("click", continueQuiz);

    $("submitAnswerBtn").addEventListener("click", () => submitAnswer(false));
    $("nextQuestionBtn").addEventListener("click", nextQuestion);

    $("quizReviewBtn").addEventListener("click", showReview);
    $("resultReviewBtn").addEventListener("click", showReview);
    $("reviewAnswersBtn").addEventListener("click", showReview);

    $("quizHomeBtn").addEventListener("click", () => {
      stopTimer();
      showScreen("homeScreen");
    });

    $("resultHomeBtn").addEventListener("click", () => {
      showScreen("homeScreen");
    });

    $("reviewHomeBtn").addEventListener("click", () => {
      showScreen("homeScreen");
    });

    $("roundsBtn").addEventListener("click", showRounds);
    $("roundsHomeBtn").addEventListener("click", () => showScreen("homeScreen"));

    $("settingsBtn").addEventListener("click", () => {
      $("settingsLanguage").value = state.language;
      $("settingsMode").value = state.mode;
      showScreen("settingsScreen");
    });

    $("saveSettingsBtn").addEventListener("click", saveSettings);
    $("settingsHomeBtn").addEventListener("click", () => showScreen("homeScreen"));
    $("resetProgressBtn").addEventListener("click", resetProgress);
    $("shareBtn").addEventListener("click", shareQuiz);

    $("resultNextBtn").addEventListener("click", () => {
      state.round++;
      startQuiz();
    });

    $("retryBtn")?.addEventListener("click", startQuiz);
  }

  function initialize() {
    bindEvents();

    document.querySelectorAll("[data-language]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.language === state.language
      );
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.mode === state.mode
      );
    });

    updateSelectionSummary();
    updateHome();
    loadQuestions();
  }

  initialize();
})();
