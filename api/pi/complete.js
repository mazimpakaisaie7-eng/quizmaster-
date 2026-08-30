export default async function handler(req, res) {
  // Allow POST requests only
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const { paymentId } = req.body || {};

    // Check payment ID
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "paymentId is required"
      });
    }

    // Get Pi API Key from Vercel Environment Variables
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!PI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "PI_API_KEY is missing"
      });
    }

    // Complete the payment on Pi Network
    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    // Pi API returned an error
    if (!response.ok) {
      console.error("Pi Complete Error:", data);

      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    // Payment completed successfully
    return res.status(200).json({
      success: true,
      payment: data
    });

  } catch (error) {
    console.error("Complete API Error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}
