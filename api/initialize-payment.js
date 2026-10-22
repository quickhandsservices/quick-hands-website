const ALLOWED_ORIGINS = [
  "https://quickhandsservicesmarketplace.com",
  "https://www.quickhandsservicesmarketplace.com",
  "https://quick-hands-marketplace-new.vercel.app",
  "https://quick-hands-website.vercel.app",
  "https://quick-hands-marketplace-dkb3fb4nt.vercel.app"
];
module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("PAYSTACK_SECRET_KEY is missing.");
    return res.status(500).json({
      error: "Payment setup is incomplete."
    });
  }
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim()
        : "";
    const amountNaira = Number(req.body?.amount);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address."
      });
    }
    if (
      !Number.isFinite(amountNaira) ||
      amountNaira <= 0 ||
      !Number.isSafeInteger(Math.round(amountNaira * 100))
    ) {
      return res.status(400).json({
        error: "Please provide a valid payment amount."
      });
    }
    // This endpoint is for testing only.
    // Do not use it for real customer payments until the server
    // calculates the order total from trusted product/order records.
    if (!secretKey.startsWith("sk_test_")) {
      return res.status(403).json({
        error: "Test checkout requires a Paystack test secret key."
      });
    }
    const amountKobo = Math.round(amountNaira * 100);
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          callback_url:
            "https://quickhandsservicesmarketplace.com/payment-callback.html"
        })
      }
    );
    const result = await response.json();
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      console.error("Paystack initialization failed:", response.status);
      return res.status(502).json({
        error: "Could not start payment. Please try again."
      });
    }
    return res.status(200).json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference
    });
  } catch (error) {
    console.error(
      "Payment initialization error:",
      error?.message || "Unknown error"
    );
    return res.status(500).json({
      error: "Something went wrong while starting payment."
    });
  }
};
