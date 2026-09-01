export default async function handler(req, res) {
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
        error: "paymentId irakenewe"
      });
    }

    const apiKey = process.env.PI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "PI_API_KEY ntabwo yashyizwe muri Vercel Environment Variables"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Pi Cancel Error:", data);

      return res.status(response.status).json({
        success: false,
        error: "Pi payment cancel yanze",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      payment: data
    });

  } catch (error) {
    console.error("Cancel payment error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
