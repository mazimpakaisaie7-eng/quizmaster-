export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    const { paymentId, accessToken } = req.body || {};

    if (!paymentId || !accessToken) {
      return res.status(400).json({
        error: "paymentId na accessToken birakenewe"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
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
      error: "Server error",
      details: error.message
    });
  }
}
