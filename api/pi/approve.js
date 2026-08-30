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

    const apiKey = process.env.PI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "PI_API_KEY ntabwo yashyizwe muri Vercel Environment Variables"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/approve`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
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
      error: "Server error",
      message: error.message
    });
  }
}
