/* Quiz Master Rwanda — Pi Network Authentication
 * Release 4.5.0
 * Access tokens are used in memory and sent to the same-origin verifier.
 * They are never written to localStorage, sessionStorage, cookies or logs.
 */
(() => {
  "use strict";

  const button = document.getElementById("piLoginBtn");
  const status = document.getElementById("piAuthStatus");
  const account = document.getElementById("piAccountName");

  if (!button || !status) return;

  let initialized = false;
  let busy = false;

  function setStatus(message, kind) {
    status.textContent = message;
    status.dataset.state = kind || "info";
  }

  function setBusy(value) {
    busy = value;
    button.disabled = value;
    button.textContent = value ? "Connecting to Pi…" : "Sign in with Pi";
  }

  function initPi() {
    if (initialized) return true;

    if (!window.Pi || typeof window.Pi.init !== "function") {
      setStatus("Pi sign-in is available inside Pi Browser. You can still use the quiz in this browser.", "notice");
      return false;
    }

    try {
      window.Pi.init({ version: "2.0", sandbox: false });
      initialized = true;
      return true;
    } catch (error) {
      console.warn("[Quiz Master] Pi SDK initialization failed.");
      setStatus("Pi sign-in could not start. Open this app in Pi Browser and try again.", "error");
      return false;
    }
  }

  async function verifyWithServer(accessToken) {
    const response = await fetch("/api/pi/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({})
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.verified) {
      throw new Error(result.message || "Pi could not verify this account.");
    }
    return result.user;
  }

  button.addEventListener("click", async () => {
    if (busy) return;
    if (!initPi()) return;

    setBusy(true);
    setStatus("Requesting secure Pi authentication…", "info");

    try {
      const auth = await window.Pi.authenticate(
        ["username"],
        (incompletePayment) => {
          // Quiz Master does not currently sell paid features or initiate Pi payments.
          // If a prior integration ever left a payment incomplete, do not silently fulfil it.
          console.warn("[Quiz Master] An incomplete Pi payment was reported. No automatic fulfilment was performed.");
          setStatus("Pi reported an incomplete payment from an earlier session. Please contact support before retrying any related purchase.", "notice");
        }
      );

      if (!auth || !auth.accessToken) {
        throw new Error("Pi authentication did not return an access token.");
      }

      const verifiedUser = await verifyWithServer(auth.accessToken);

      if (account) {
        account.textContent = verifiedUser.username ? `Signed in as ${verifiedUser.username}` : "Pi account verified";
      }
      setStatus("Pi account successfully verified. You can continue learning.", "success");
      button.textContent = "Pi account verified";
      button.disabled = true;

      // Do not persist the access token or user identifier in browser storage.
      auth.accessToken = null;
    } catch (error) {
      console.warn("[Quiz Master] Pi sign-in was not completed:", error && error.message ? error.message : "unknown error");
      setStatus(error && error.message ? error.message : "Pi sign-in was not completed. Please try again in Pi Browser.", "error");
      setBusy(false);
    }
  });

  // Initialize only when the Pi SDK is available; non-Pi browsers remain usable.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPi, { once: true });
  } else {
    initPi();
  }
})();
