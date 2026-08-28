export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { paymentId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({
        error: "paymentId is required"
      });
    }

    const apiKey = process.env.PI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "PI_API_KEY is not configured"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
