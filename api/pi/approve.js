// api/pi/approve.js

const PI_API_KEY = process.env.PI_API_KEY;

function json(res, status, data) {
  return res.status(status).json(data);
}

function getToken(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.substring(7).trim();
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed"
    });
  }

  if (!PI_API_KEY) {
    return json(res, 500, {
      error: "Missing PI_API_KEY environment variable"
    });
  }

  try {
    const { paymentId, accessToken } = req.body || {};

    const token =
      accessToken ||
      getToken(req);

    if (!paymentId) {
      return json(res, 400, {
        error: "paymentId is required"
      });
    }

    if (!token) {
      return json(res, 401, {
        error: "Pi access token is required"
      });
    }

    // Verify the user's access token with Pi.
    const userResponse = await fetch(
      "https://api.minepi.com/v2/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!userResponse.ok) {
      return json(res, 401, {
        error: "Invalid Pi access token"
      });
    }

    const user = await userResponse.json();

    // Approve the payment server-side.
    const response = await fetch(
      `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(res, response.status, {
        error:
          data.error ||
          data.message ||
          "Pi payment approval failed",
        details: data
      });
    }

    return json(res, 200, {
      success: true,
      paymentId,
      username: user.username || null,
      payment: data
    });

  } catch (error) {
    console.error("APPROVE ERROR:", error);

    return json(res, 500, {
      error: "Internal server error",
      message: error.message
    });
  }
};
