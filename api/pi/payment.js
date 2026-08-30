// payment.js

class PiPaymentSystem {
  constructor() {
    this.payment = null;
    this.isReady = false;
  }

  // Initialize Pi SDK
  async init() {
    try {
      if (typeof Pi === "undefined") {
        throw new Error("Pi SDK ntiyabonetse.");
      }

      await Pi.init({
        version: "2.0",
        sandbox: false
      });

      this.isReady = true;
      console.log("Pi SDK initialized.");

      return true;
    } catch (error) {
      console.error("Pi initialization error:", error);
      return false;
    }
  }

  // Login user
  async authenticate() {
    if (!this.isReady) {
      await this.init();
    }

    try {
      const scopes = ["username", "payments"];

      const authResult = await Pi.authenticate(
        scopes,
        this.onIncompletePaymentFound.bind(this)
      );

      console.log("Pi user:", authResult.user);

      return authResult;
    } catch (error) {
      console.error("Pi authentication error:", error);
      throw error;
    }
  }

  // Handle incomplete payment
  async onIncompletePaymentFound(payment) {
    console.log("Incomplete payment found:", payment);

    try {
      if (!payment || !payment.identifier) {
        return;
      }

      // Tell backend to complete/cancel the incomplete payment
      const response = await fetch("/api/pi/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid || null
        })
      });

      const result = await response.json();

      console.log("Incomplete payment response:", result);
    } catch (error) {
      console.error("Incomplete payment error:", error);
    }
  }

  // Create Pi payment
  async createPayment({
    amount,
    memo = "Quiz Master Reward",
    metadata = {}
  }) {
    if (!this.isReady) {
      await this.init();
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error("Payment amount ntabwo ari yo.");
    }

    try {
      const paymentData = {
        amount: Number(amount),
        memo,
        metadata
      };

      this.payment = await Pi.createPayment(
        paymentData,
        {
          onReadyForServerApproval: async (paymentId) => {
            console.log(
              "Payment ready for server approval:",
              paymentId
            );

            await this.approvePayment(paymentId);
          },

          onReadyForServerCompletion: async (
            paymentId,
            txid
          ) => {
            console.log(
              "Payment ready for completion:",
              paymentId,
              txid
            );

            await this.completePayment(paymentId, txid);
          },

          onCancel: async (paymentId) => {
            console.log("Payment cancelled:", paymentId);

            await this.cancelPayment(paymentId);
          },

          onError: (error, payment) => {
            console.error(
              "Pi payment error:",
              error,
              payment
            );
          }
        }
      );

      return this.payment;
    } catch (error) {
      console.error("Create payment error:", error);
      throw error;
    }
  }

  // Ask backend to approve payment
  async approvePayment(paymentId) {
    try {
      const response = await fetch("/api/pi/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Payment approval failed."
        );
      }

      console.log("Payment approved:", result);

      return result;
    } catch (error) {
      console.error("Approve payment error:", error);
      throw error;
    }
  }

  // Ask backend to complete payment
  async completePayment(paymentId, txid) {
    try {
      const response = await fetch("/api/pi/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentId,
          txid
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Payment completion failed."
        );
      }

      console.log("Payment completed:", result);

      return result;
    } catch (error) {
      console.error("Complete payment error:", error);
      throw error;
    }
  }

  // Ask backend to cancel payment
  async cancelPayment(paymentId) {
    try {
      const response = await fetch("/api/pi/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentId
        })
      });

      const result = await response.json();

      console.log("Payment cancelled:", result);

      return result;
    } catch (error) {
      console.error("Cancel payment error:", error);
      throw error;
    }
  }
}

// Global payment system
const piPayment = new PiPaymentSystem();

window.piPayment = piPayment;
