/* =========================================================
   QUIZ MASTER - PI NETWORK PAYMENT
   File: payment.js

   ⬅️ HANO niho ushobora guhindura amafaranga
   ========================================================= */

(function () {
  "use strict";

  // ⬅️ HANO: amafaranga umukinnyi asabwa kwishyura
  const PAYMENT_AMOUNT = 0.1;

  // ⬅️ HANO: izina rya payment
  const PAYMENT_MEMO = "Quiz Master Premium";

  let paymentButton = null;

  // ---------------------------------------------------------
  // Gutegereza Pi SDK
  // ---------------------------------------------------------
  function waitForPi(callback) {
    if (typeof window.Pi !== "undefined") {
      callback();
      return;
    }

    setTimeout(function () {
      waitForPi(callback);
    }, 500);
  }

  // ---------------------------------------------------------
  // Kwinjiza payment button muri page
  // ---------------------------------------------------------
  function createPaymentButton() {
    if (document.getElementById("piPaymentBtn")) {
      return;
    }

    paymentButton = document.createElement("button");
    paymentButton.id = "piPaymentBtn";
    paymentButton.innerHTML = "💰 Pay with Pi";

    paymentButton.style.width = "100%";
    paymentButton.style.padding = "14px";
    paymentButton.style.marginTop = "12px";
    paymentButton.style.border = "none";
    paymentButton.style.borderRadius = "10px";
    paymentButton.style.cursor = "pointer";
    paymentButton.style.fontSize = "16px";
    paymentButton.style.fontWeight = "bold";
    paymentButton.style.background = "#f59e0b";
    paymentButton.style.color = "white";

    // Tuyishyira kuri start screen
    const startScreen = document.getElementById("startScreen");

    if (startScreen) {
      const startBtn = document.getElementById("startBtn");

      if (startBtn) {
        startBtn.parentNode.insertBefore(
          paymentButton,
          startBtn
        );
      } else {
        startScreen.appendChild(paymentButton);
      }
    }

    paymentButton.addEventListener("click", startPayment);
  }

  // ---------------------------------------------------------
  // Gutangiza Pi
  // ---------------------------------------------------------
  function initializePi() {
    if (typeof window.Pi === "undefined") {
      console.log("Pi SDK ntiraboneka.");
      return;
    }

    try {
      window.Pi.init({
        version: "2.0",
        sandbox: false
      });

      console.log("Pi SDK yatangiye neza.");

      createPaymentButton();

    } catch (error) {
      console.error("Pi initialization error:", error);
    }
  }

  // ---------------------------------------------------------
  // Gutangiza payment
  // ---------------------------------------------------------
  function startPayment() {
    if (typeof window.Pi === "undefined") {
      alert("Pi Network ntabwo iboneka. Fungura app muri Pi Browser.");
      return;
    }

    if (paymentButton) {
      paymentButton.disabled = true;
      paymentButton.innerHTML = "⏳ Payment iri gutangira...";
    }

    const paymentData = {
      amount: PAYMENT_AMOUNT,

      memo: PAYMENT_MEMO,

      metadata: {
        app: "Quiz Master",
        type: "quiz_payment"
      }
    };

    window.Pi.createPayment(
      paymentData,
      {
        onReadyForServerApproval: function (paymentId) {
          console.log(
            "Payment yiteguye approval:",
            paymentId
          );

          /*
           ⬅️ HANO niho production app ikenera BACKEND.
           Payment igomba kubanza kwemezwa na server yawe.
          */
        },

        onReadyForServerCompletion: function (
          paymentId,
          txid
        ) {
          console.log(
            "Payment transaction:",
            paymentId,
            txid
          );

          /*
           ⬅️ HANO server yawe igomba gukora completion.
          */
        },

        onCancel: function (paymentId) {
          console.log(
            "Payment yahagaritswe:",
            paymentId
          );

          resetPaymentButton();

          alert("Payment yahagaritswe.");
        },

        onError: function (error, payment) {
          console.error(
            "Payment error:",
            error,
            payment
          );

          resetPaymentButton();

          alert(
            "Payment yanze. Ongera ugerageze."
          );
        }
      }
    );
  }

  // ---------------------------------------------------------
  // Gusubizaho button
  // ---------------------------------------------------------
  function resetPaymentButton() {
    if (paymentButton) {
      paymentButton.disabled = false;
      paymentButton.innerHTML = "💰 Pay with Pi";
    }
  }

  // ---------------------------------------------------------
  // Gutangira byose page imaze gufunguka
  // ---------------------------------------------------------
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      waitForPi(initializePi);
    }
  );

})();
