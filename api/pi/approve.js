export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const { paymentId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "paymentId is required"
      });
    }

    const API_KEY = process.env.PI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "PI_API_KEY is missing"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    return res.status(200).json({
      success: true,
      payment: data
    });

  } catch (error) {
    console.error("Approve error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}
