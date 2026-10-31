
/* =====================================================
   QUIZ MASTER - SAFE PREMIUM PAYMENT STATUS
   File: payment.js

   Real payments are disabled until a secure,
   adult-managed server verification system is ready.
===================================================== */

(function () {
  "use strict";

  function initializePremiumPage() {
    const paymentArea = document.getElementById("paymentArea");
    const paymentStatus = document.getElementById("paymentStatus");

    if (paymentArea) {
      paymentArea.innerHTML = `
        <button
          type="button"
          id="piPaymentBtn"
          disabled
          aria-disabled="true"
        >
          Payment ntiraboneka ubu
        </button>
      `;
    }

    if (paymentStatus) {
      paymentStatus.textContent =
        "Premium payment irategurwa. Nta bwishyu bwemezwa muri iki gihe.";

      paymentStatus.style.display = "block";
    }

    console.info(
      "Quiz Master: Premium payment is currently disabled."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializePremiumPage
    );
  } else {
    initializePremiumPage();
  }
})();
