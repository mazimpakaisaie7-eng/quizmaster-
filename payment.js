/* =========================================================
   QUIZ MASTER - PI NETWORK PAYMENT
   File: payment.js
========================================================= */

(function () {
  "use strict";

  const PAYMENT_AMOUNT = 0.1;
  const PAYMENT_MEMO = "Quiz Master Premium";

  let paymentButton = null;

  /* ---------------------------------------------------------
     WAIT FOR PI SDK
  --------------------------------------------------------- */

  function waitForPi(callback) {
    if (typeof window.Pi !== "undefined") {
      callback();
      return;
    }

    setTimeout(function () {
      waitForPi(callback);
    }, 500);
  }

  /* ---------------------------------------------------------
     RESET BUTTON
  --------------------------------------------------------- */

  function resetPaymentButton() {
    if (paymentButton) {
      paymentButton.disabled = false;
      paymentButton.innerHTML = "💰 Pay with Pi";
    }
  }

  /* ---------------------------------------------------------
     PAYMENT SUCCESS
  --------------------------------------------------------- */

  function showSuccess() {
    localStorage.setItem("quizmasterPremium", "true");

    if (paymentButton) {
      paymentButton.disabled = true;
      paymentButton.innerHTML = "✅ Premium Activated";
    }

    alert(
      "🎉 Payment yemejwe! Quiz Master Premium irafunguye."
    );

    if (
      typeof window.activatePremiumSuccess === "function"
    ) {
      window.activatePremiumSuccess();
    }
  }

  /* ---------------------------------------------------------
     APPROVE PAYMENT
     API: /api/approve
  --------------------------------------------------------- */

  async function approvePayment(paymentId) {
    const response = await fetch("/api/approve", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        paymentId: paymentId
      })
    });

    const data = await response.json();

    console.log("Approve response:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error
          ? JSON.stringify(data.error)
          : "Payment approval yanze."
      );
    }

    return data;
  }

  /* ---------------------------------------------------------
     COMPLETE PAYMENT
     API: /api/complete
  --------------------------------------------------------- */

  async function completePayment(paymentId, txid) {
    const response = await fetch("/api/complete", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        paymentId: paymentId,
        txid: txid
      })
    });

    const data = await response.json();

    console.log("Complete response:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error
          ? JSON.stringify(data.error)
          : "Payment completion yanze."
      );
    }

    return data;
  }

  /* ---------------------------------------------------------
     CANCEL PAYMENT
     API: /api/cancel
  --------------------------------------------------------- */

  async function cancelPayment(paymentId) {
    try {
      const response = await fetch("/api/cancel", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          paymentId: paymentId
        })
      });

      const data = await response.json();

      console.log("Cancel response:", data);

      return data;

    } catch (error) {
      console.error(
        "Cancel request error:",
        error
      );
    }
  }

  /* ---------------------------------------------------------
     START PAYMENT
  --------------------------------------------------------- */

  function startPayment() {
    if (typeof window.Pi === "undefined") {
      alert(
        "Pi Network ntabwo iboneka. Fungura Quiz Master muri Pi Browser."
      );

      return;
    }

    if (paymentButton) {
      paymentButton.disabled = true;

      paymentButton.innerHTML =
        "⏳ Payment iri gutangira...";
    }

    const paymentData = {
      amount: PAYMENT_AMOUNT,

      memo: PAYMENT_MEMO,

      metadata: {
        app: "Quiz Master",
        type: "premium",
        version: "1.0"
      }
    };

    window.Pi.createPayment(
      paymentData,

      /* -----------------------------------------------------
         SERVER APPROVAL
      ----------------------------------------------------- */

      {
        onReadyForServerApproval: async function (paymentId) {
          console.log(
            "Payment ID:",
            paymentId
          );

          try {
            if (paymentButton) {
              paymentButton.innerHTML =
                "⏳ Payment irimo kwemezwa...";
            }

            await approvePayment(paymentId);

            console.log(
              "✅ Payment approved:",
              paymentId
            );

          } catch (error) {
            console.error(
              "Approval error:",
              error
            );

            resetPaymentButton();

            alert(
              "Payment ntiyemejwe na server. Ongera ugerageze."
            );
          }
        },

        /* ---------------------------------------------------
           SERVER COMPLETION
        --------------------------------------------------- */

        onReadyForServerCompletion: async function (
          paymentId,
          txid
        ) {
          console.log(
            "Payment completion:",
            paymentId,
            txid
          );

          try {
            if (paymentButton) {
              paymentButton.innerHTML =
                "⏳ Payment irimo kurangizwa...";
            }

            const result =
              await completePayment(
                paymentId,
                txid
              );

            console.log(
              "✅ Payment completed:",
              result
            );

            /*
              Premium ifunguka gusa nyuma yo
              kubona confirmation iva kuri server.
            */

            showSuccess();

          } catch (error) {
            console.error(
              "Completion error:",
              error
            );

            resetPaymentButton();

            alert(
              "Payment yarakozwe ariko server yanze kuyemeza. Ntukongere kwishyura ako kanya; banza ugenzure payment."
            );
          }
        },

        /* ---------------------------------------------------
           PAYMENT CANCEL
        --------------------------------------------------- */

        onCancel: async function (paymentId) {
          console.log(
            "Payment cancelled:",
            paymentId
          );

          await cancelPayment(paymentId);

          resetPaymentButton();

          alert(
            "Payment yahagaritswe."
          );
        },

        /* ---------------------------------------------------
           PAYMENT ERROR
        --------------------------------------------------- */

        onError: function (
          error,
          payment
        ) {
          console.error(
            "Pi payment error:",
            error,
            payment
          );

          resetPaymentButton();

          alert(
            "Payment yanze cyangwa habaye ikibazo. Ongera ugerageze."
          );
        }
      }
    );
  }

  /* ---------------------------------------------------------
     CREATE PAYMENT BUTTON
  --------------------------------------------------------- */

  function createPaymentButton() {
    if (
      document.getElementById(
        "piPaymentBtn"
      )
    ) {
      return;
    }

    paymentButton =
      document.createElement(
        "button"
      );

    paymentButton.id =
      "piPaymentBtn";

    paymentButton.innerHTML =
      "💰 Pay with Pi";

    paymentButton.style.width =
      "100%";

    paymentButton.style.padding =
      "14px";

    paymentButton.style.marginTop =
      "12px";

    paymentButton.style.border =
      "none";

    paymentButton.style.borderRadius =
      "10px";

    paymentButton.style.cursor =
      "pointer";

    paymentButton.style.fontSize =
      "16px";

    paymentButton.style.fontWeight =
      "bold";

    paymentButton.style.background =
      "#f59e0b";

    paymentButton.style.color =
      "white";

    const startScreen =
      document.getElementById(
        "startScreen"
      );

    if (startScreen) {
      const startBtn =
        document.getElementById(
          "startBtn"
        );

      if (startBtn) {
        startBtn.parentNode.insertBefore(
          paymentButton,
          startBtn
        );
      } else {
        startScreen.appendChild(
          paymentButton
        );
      }

    } else {
      document.body.appendChild(
        paymentButton
      );
    }

    paymentButton.addEventListener(
      "click",
      startPayment
    );
  }

  /* ---------------------------------------------------------
     INITIALIZE PI
  --------------------------------------------------------- */

  function initializePi() {
    if (
      typeof window.Pi ===
      "undefined"
    ) {
      console.log(
        "Pi SDK ntiraboneka. Tegereza Pi Browser."
      );

      return;
    }

    try {
      window.Pi.init({
        version: "2.0",
        sandbox: false
      });

      console.log(
        "✅ Pi SDK yatangiye neza."
      );

      createPaymentButton();

    } catch (error) {
      console.error(
        "Pi initialization error:",
        error
      );
    }
  }

  /* ---------------------------------------------------------
     PAGE READY
  --------------------------------------------------------- */

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      waitForPi(
        initializePi
      );
    }
  );

})();
