/* =========================================================
   QUIZ MASTER - REFERRAL SYSTEM
   File: referral.js
   Ihuye na referral.html
   ========================================================= */

(function () {

  "use strict";

  // ==========================================
  // STORAGE KEYS
  // ==========================================

  const REFERRAL_STORAGE_KEY =
    "quizMasterReferralCode";

  const REFERRAL_COUNT_KEY =
    "quizMasterReferralCount";

  const REWARD_COUNT_KEY =
    "quizMasterRewardCount";

  const INCOMING_REFERRAL_KEY =
    "quizMasterIncomingReferral";


  // ==========================================
  // GET ELEMENT
  // ==========================================

  function getElement(id) {
    return document.getElementById(id);
  }


  // ==========================================
  // GENERATE REFERRAL CODE
  // ==========================================

  function generateReferralCode() {

    const randomPart =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    return "QM-" + randomPart;
  }


  // ==========================================
  // GET OR CREATE REFERRAL CODE
  // ==========================================

  function getReferralCode() {

    let code =
      localStorage.getItem(
        REFERRAL_STORAGE_KEY
      );

    if (!code) {

      code =
        generateReferralCode();

      localStorage.setItem(
        REFERRAL_STORAGE_KEY,
        code
      );
    }

    return code;
  }


  // ==========================================
  // GET APP URL
  // ==========================================

  function getAppUrl() {

    return (
      window.location.origin + "/"
    );
  }


  // ==========================================
  // CREATE REFERRAL LINK
  // ==========================================

  function createReferralLink(code) {

    return (
      getAppUrl() +
      "?ref=" +
      encodeURIComponent(code)
    );
  }


  // ==========================================
  // LOAD REFERRAL STATS
  // ==========================================

  function loadStats() {

    let referralCount =
      parseInt(
        localStorage.getItem(
          REFERRAL_COUNT_KEY
        ) || "0",
        10
      );

    let rewardCount =
      parseInt(
        localStorage.getItem(
          REWARD_COUNT_KEY
        ) || "0",
        10
      );

    if (isNaN(referralCount)) {
      referralCount = 0;
    }

    if (isNaN(rewardCount)) {
      rewardCount = 0;
    }

    const referralCountElement =
      getElement("referralCount");

    const rewardCountElement =
      getElement("rewardCount");

    if (referralCountElement) {

      referralCountElement.textContent =
        referralCount;
    }

    if (rewardCountElement) {

      rewardCountElement.textContent =
        rewardCount;
    }
  }


  // ==========================================
  // LOAD REFERRAL INFORMATION
  // ==========================================

  function loadReferralInformation() {

    const code =
      getReferralCode();

    const link =
      createReferralLink(code);

    const codeElement =
      getElement("referralCode");

    const linkElement =
      getElement("referralLink");

    if (codeElement) {

      codeElement.textContent =
        code;
    }

    if (linkElement) {

      linkElement.value =
        link;
    }
  }


  // ==========================================
  // SUCCESS MESSAGE
  // ==========================================

  function showSuccessMessage(message) {

    const element =
      getElement("successMessage");

    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.style.display =
      "block";

    setTimeout(function () {

      element.style.display =
        "none";

    }, 3000);
  }


  // ==========================================
  // COPY REFERRAL LINK
  // ==========================================

  async function copyReferralLink() {

    const linkElement =
      getElement("referralLink");

    if (!linkElement) {
      return;
    }

    const link =
      linkElement.value;

    if (!link) {
      return;
    }

    try {

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {

        await navigator.clipboard.writeText(
          link
        );

      } else {

        linkElement.focus();

        linkElement.select();

        document.execCommand("copy");
      }

      showSuccessMessage(
        "✅ Referral link yakoporowe!"
      );

    } catch (error) {

      console.error(
        "Copy error:",
        error
      );

      showSuccessMessage(
        "⚠️ Copy yanze. Ongera ugerageze."
      );
    }
  }


  // ==========================================
  // SHARE REFERRAL LINK
  // ==========================================

  async function shareReferralLink() {

    const code =
      getReferralCode();

    const link =
      createReferralLink(code);

    const shareText =
      "🎯 Injira muri Quiz Master! " +
      "Koresha referral link yanjye: " +
      link;

    if (
      typeof navigator.share ===
      "function"
    ) {

      try {

        await navigator.share({

          title:
            "Quiz Master",

          text:
            shareText,

          url:
            link

        });

      } catch (error) {

        console.log(
          "Share cancelled."
        );
      }

      return;
    }


    // Fallback: copy link

    try {

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {

        await navigator.clipboard.writeText(
          link
        );

        showSuccessMessage(
          "📋 Link yakoporowe! Ushobora kuyisangiza abandi."
        );

      } else {

        const linkElement =
          getElement("referralLink");

        if (linkElement) {

          linkElement.focus();
          linkElement.select();

          document.execCommand("copy");

          showSuccessMessage(
            "📋 Referral link yakoporowe!"
          );
        }
      }

    } catch (error) {

      console.error(
        "Share fallback error:",
        error
      );

      showSuccessMessage(
        "⚠️ Ntibyashobotse gusangiza link."
      );
    }
  }


  // ==========================================
  // CHECK INCOMING REFERRAL
  // ==========================================

  function checkIncomingReferral() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const incomingRef =
      params.get("ref");

    if (!incomingRef) {
      return;
    }

    const cleanedRef =
      incomingRef.trim();

    if (!cleanedRef) {
      return;
    }

    sessionStorage.setItem(
      INCOMING_REFERRAL_KEY,
      cleanedRef
    );

    console.log(
      "✅ Incoming referral:",
      cleanedRef
    );
  }


  // ==========================================
  // BUTTON EVENTS
  // ==========================================

  function setupEvents() {

    const copyButton =
      getElement("copyButton");

    const shareButton =
      getElement("shareButton");

    if (copyButton) {

      copyButton.addEventListener(
        "click",
        copyReferralLink
      );
    }

    if (shareButton) {

      shareButton.addEventListener(
        "click",
        shareReferralLink
      );
    }
  }


  // ==========================================
  // INITIALIZE
  // ==========================================

  function initializeReferral() {

    console.log(
      "✅ Quiz Master Referral yatangiye neza."
    );

    loadReferralInformation();

    loadStats();

    checkIncomingReferral();

    setupEvents();
  }


  // ==========================================
  // START
  // ==========================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeReferral
    );

  } else {

    initializeReferral();
  }


})();
