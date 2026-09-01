export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const { paymentId, txid } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "paymentId irakenewe"
      });
    }

    if (!txid) {
      return res.status(400).json({
        success: false,
        error: "txid irakenewe"
      });
    }

    const apiKey = process.env.PI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "PI_API_KEY ntabwo yashyizwe muri Vercel Environment Variables"
      });
    }

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${encodeURIComponent(
        paymentId
      )}/complete`,
      {
        method: "POST",

        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          txid: txid
        })
      }
    );

    const data = await response.json();

    console.log("Pi Complete Response:", data);

    if (!response.ok) {
      console.error(
        "Pi Complete Error:",
        data
      );

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
    console.error(
      "Complete error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
